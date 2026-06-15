import Match from '../match/match.model.js';
import Player from './player.model.js';
import ApiError from '../../utils/ApiError.js';
import mongoose from 'mongoose';
import { MATCH_STATUS } from '../../constants/matchStatus.js';
import Team from '../team/team.model.js';

export const playerMatchesService = {
  /**
   * Get matches for a specific player (public endpoint)
   * Filters matches where player is in team1Lineup OR team2Lineup
   * Groups by status: recent(completed), scheduled, live, lineup(ready/team-selecting)
   */
  getPlayerMatches: async (playerId, query = {}) => {
    // Validate player exists
    const player = await Player.findById(playerId).lean();
    if (!player) {
      throw new ApiError(404, 'Player not found');
    }

    const { type = 'feed', limit = 5, page = 1 } = query;
    const parsedLimit = Math.min(parseInt(limit, 10) || 5, 50);
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (parsedPage - 1) * parsedLimit;

    const teams = await Team.find({
      isActive: true,
      $or: [{ players: player._id }, ...(player.team ? [{ _id: player.team }] : [])]
    }).select('_id').lean();
    const teamIds = teams.map(team => team._id);

    const activeFeedStatuses = [
      MATCH_STATUS.LIVE,
      MATCH_STATUS.SCHEDULED,
      MATCH_STATUS.READY,
      MATCH_STATUS.TEAM_SELECTING
    ];
    const optOutStatuses = [
      MATCH_STATUS.SCHEDULED,
      MATCH_STATUS.READY,
      MATCH_STATUS.TEAM_SELECTING
    ];
    const relationFilters = [
      { team1Lineup: player._id },
      { team2Lineup: player._id },
      { 'battingOrder.players': player._id },
      ...(teamIds.length ? [{ team1: { $in: teamIds } }, { team2: { $in: teamIds } }] : [])
    ];

    // Build match filter: only player's own lineup, batting order, or team matches.
    const lineupFilter = {
      isActive: true,
      optedOutPlayers: { $ne: player._id },
      $or: relationFilters
    };
    if (type === 'recent') lineupFilter.status = MATCH_STATUS.COMPLETED;
    if (type === 'scheduled') lineupFilter.status = MATCH_STATUS.SCHEDULED;
    if (type === 'live') lineupFilter.status = MATCH_STATUS.LIVE;
    if (type === 'lineup') lineupFilter.status = { $in: [MATCH_STATUS.READY, MATCH_STATUS.TEAM_SELECTING] };
    if (['all', 'feed', 'upcoming'].includes(type)) lineupFilter.status = { $in: activeFeedStatuses };

    let pipeline = [
      { $match: lineupFilter },
      {
        $addFields: {
          statusRank: {
            $switch: {
              branches: [
                { case: { $eq: ['$status', MATCH_STATUS.LIVE] }, then: 0 },
                { case: { $eq: ['$status', MATCH_STATUS.SCHEDULED] }, then: 1 },
                { case: { $eq: ['$status', MATCH_STATUS.READY] }, then: 2 },
                { case: { $eq: ['$status', MATCH_STATUS.TEAM_SELECTING] }, then: 3 },
                { case: { $eq: ['$status', MATCH_STATUS.COMPLETED] }, then: 4 }
              ],
              default: 5
            }
          }
        }
      },
      { $sort: type === 'recent' ? { scheduledDate: -1, updatedAt: -1 } : { statusRank: 1, scheduledDate: 1, updatedAt: -1 } },
      {
        $lookup: {
          from: 'teams',
          localField: 'team1',
          foreignField: '_id',
          as: 'team1',
          pipeline: [{ $project: { name: 1, shortName: 1, logo: 1 } }]
        }
      },
      {
        $lookup: {
          from: 'teams',
          localField: 'team2',
          foreignField: '_id',
          as: 'team2',
          pipeline: [{ $project: { name: 1, shortName: 1, logo: 1 } }]
        }
      },
      {
        $lookup: {
          from: 'tournaments',
          localField: 'tournament',
          foreignField: '_id',
          as: 'tournament',
          pipeline: [{ $project: { name: 1, format: 1 } }]
        }
      },
      {
        $project: {
          _id: 1, matchId: 1, status: 1, scheduledDate: 1, format: 1,
          overs: 1, score: 1, venue: 1, result: 1, currentInnings: 1, scoringRules: 1,
          team1: { $arrayElemAt: ['$team1', 0] },
          team2: { $arrayElemAt: ['$team2', 0] },
          tournament: { $arrayElemAt: ['$tournament', 0] },
          team1Lineup: 1, team2Lineup: 1, battingOrder: 1,
          playerRelation: {
            inLineup: {
              $or: [
                { $in: [player._id, { $ifNull: ['$team1Lineup', []] }] },
                { $in: [player._id, { $ifNull: ['$team2Lineup', []] }] }
              ]
            },
            inTeam: teamIds.length
              ? {
                  $or: [
                    { $in: ['$team1._id', teamIds] },
                    { $in: ['$team2._id', teamIds] }
                  ]
                }
              : false,
            role: player.role || null
          },
          canOptOut: { $in: ['$status', optOutStatuses] }
        }
      }
    ];

    // Pagination
    pipeline.push(
      { $skip: skip },
      { $limit: parsedLimit }
    );

    const matches = await Match.aggregate(pipeline);
    const total = await Match.countDocuments(lineupFilter);

    return {
      matches,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        pages: Math.ceil(total / parsedLimit)
      },
      player: {
        id: player._id,
        name: player.playerName,
        role: player.role
      }
    };
  },

  optOutFromMatch: async (playerId, matchId) => {
    const player = await Player.findById(playerId).lean();
    if (!player) throw new ApiError(404, 'Player not found');

    const match = await Match.findById(matchId);
    if (!match || !match.isActive) throw new ApiError(404, 'Match not found');
    if (![MATCH_STATUS.SCHEDULED, MATCH_STATUS.READY, MATCH_STATUS.TEAM_SELECTING].includes(match.status)) {
      throw new ApiError(400, 'Player can opt out only before match goes live');
    }

    const teams = await Team.find({
      isActive: true,
      $or: [{ players: player._id }, ...(player.team ? [{ _id: player.team }] : [])]
    }).select('_id').lean();
    const teamIds = teams.map(team => team._id.toString());
    const isRelated =
      (match.team1Lineup || []).some(id => id.toString() === playerId) ||
      (match.team2Lineup || []).some(id => id.toString() === playerId) ||
      (match.battingOrder || []).some(order =>
        Array.isArray(order.players) && order.players.some(id => id.toString() === playerId)
      ) ||
      teamIds.includes(match.team1?.toString()) ||
      teamIds.includes(match.team2?.toString());
    if (!isRelated) throw new ApiError(403, 'Player is not part of this match');

    match.team1Lineup = (match.team1Lineup || []).filter(id => id.toString() !== playerId);
    match.team2Lineup = (match.team2Lineup || []).filter(id => id.toString() !== playerId);
    match.battingOrder = (match.battingOrder || []).map(order => ({
      ...order,
      players: Array.isArray(order.players)
        ? order.players.filter(id => id.toString() !== playerId)
        : []
    }));
    match.optedOutPlayers = [
      ...new Set([...(match.optedOutPlayers || []).map(id => id.toString()), playerId])
    ];

    await match.save();
    return match;
  }
};

export default playerMatchesService;

