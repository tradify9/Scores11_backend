import Match from '../match/match.model.js';
import Player from './player.model.js';
import ApiError from '../../utils/ApiError.js';
import mongoose from 'mongoose';
import { MATCH_STATUS } from '../../constants/matchStatus.js';

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

    const { type = 'all', limit = 10, page = 1 } = query;
    const skip = (page - 1) * limit;

    // Build match filter: player in lineup
    const lineupFilter = {
      isActive: true,
      $or: [
        { team1Lineup: playerId },
        { team2Lineup: playerId }
      ]
    };

    let pipeline = [
      { $match: lineupFilter },
      { $sort: { scheduledDate: -1, updatedAt: -1 } },
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
          team1: { $arrayElemAt: ['$team1', 0] },
          team2: { $arrayElemAt: ['$team2', 0] },
          tournament: { $arrayElemAt: ['$tournament', 0] },
          team1Lineup: 1, team2Lineup: 1
        }
      }
    ];

    // Filter by type
    if (type === 'recent') {
      pipeline.unshift({ 
        $match: { status: 'completed' } 
      });
    } else if (type === 'scheduled') {
      pipeline.unshift({ 
        $match: { status: 'scheduled' } 
      });
    } else if (type === 'live') {
      pipeline.unshift({ 
        $match: { status: 'live' } 
      });
    } else if (type === 'lineup') {
      pipeline.unshift({ 
        $match: { 
          $in: ['ready', 'team-selecting'] 
        } 
      });
    }

    // Pagination
    pipeline.push(
      { $skip: skip },
      { $limit: parseInt(limit) }
    );

    const matches = await Match.aggregate(pipeline);
    const total = await Match.countDocuments(lineupFilter);

    return {
      matches,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      player: {
        id: player._id,
        name: player.playerName,
        role: player.role
      }
    };
  }
};

export default playerMatchesService;

