import User from '../user/user.model.js';
import Team from '../team/team.model.js';
import Player from '../player/player.model.js';
import Match from '../match/match.model.js';
import Tournament from '../tournament/tournament.model.js';

/**
 * Global search service - searches across all entities
 */
export const searchService = {
  /**
   * Search across all entities
   * @param {string} query - Search query
   * @param {number} limit - Results per category
   * @returns {Object} Combined search results
   */
  globalSearch: async (query, limit = 5) => {
    if (!query || query.trim().length < 2) {
      return {
        users: [],
        teams: [],
        players: [],
        matches: [],
        tournaments: [],
        total: 0
      };
    }

    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = { $regex: escapedQuery, $options: 'i' };
    const phoneDigits = query.replace(/\D/g, '');

    // Search users
    const users = await User.find(
      { $or: [
        { fullName: searchRegex },
        { username: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        ...(phoneDigits.length >= 4 ? [{ phone: { $regex: phoneDigits, $options: 'i' } }] : [])
      ]}
    )
      .select('fullName username email phone avatar role cricketProfile')
      .limit(limit)
      .lean();

    // Search teams
    const teams = await Team.find(
      { $or: [
        { name: searchRegex },
        { shortName: searchRegex },
        { city: searchRegex }
      ], isActive: true }
    )
      .select('name shortName logo city')
      .limit(limit)
      .lean();

    // Search players
    const playerDocs = await Player.find(
      { $or: [
        { playerName: searchRegex },
        { teamName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        ...(phoneDigits.length >= 4 ? [{ phone: { $regex: phoneDigits, $options: 'i' } }] : [])
      ]}
    )
      .select('playerName jerseyNumber role teamName avatar email phone')
      .populate('user', 'fullName name email phone')
      .limit(limit)
      .lean();

    const playerUserIds = new Set(
      playerDocs
        .filter(player => player.user?._id)
        .map(player => player.user._id.toString())
    );

    const players = [
      ...playerDocs,
      ...users
        .filter(user => !playerUserIds.has(user._id.toString()))
        .map(user => ({
          _id: user.cricketProfile?.playerId || user._id,
          user: {
            _id: user._id,
            fullName: user.fullName,
            name: user.fullName,
            email: user.email,
            avatar: user.avatar
          },
          playerName: user.fullName,
          role: user.cricketProfile?.playerType || 'batsman',
          avatar: user.avatar,
          email: user.email,
          phone: user.phone,
          source: 'user'
        }))
    ].slice(0, limit);

    // Search matches by populated team/tournament/venue fields used by this app.
    const matchingTeams = await Team.find(
      { $or: [{ name: searchRegex }, { shortName: searchRegex }, { city: searchRegex }], isActive: true }
    ).select('_id').lean();
    const matchingTournamentIds = await Tournament.find(
      { $or: [{ name: searchRegex }, { venue: searchRegex }, { description: searchRegex }], isActive: true }
    ).select('_id').lean();
    const teamIds = matchingTeams.map(team => team._id);
    const tournamentIds = matchingTournamentIds.map(tournament => tournament._id);

    const matches = await Match.find(
      { isActive: true, $or: [
        { matchId: searchRegex },
        { 'venue.name': searchRegex },
        { 'venue.city': searchRegex },
        ...(teamIds.length ? [{ team1: { $in: teamIds } }, { team2: { $in: teamIds } }] : []),
        ...(tournamentIds.length ? [{ tournament: { $in: tournamentIds } }] : [])
      ]}
    )
      .select('matchId team1 team2 venue status scheduledDate score')
      .populate('team1', 'name shortName logo')
      .populate('team2', 'name shortName logo')
      .populate('tournament', 'name')
      .limit(limit)
      .lean();

    // Search tournaments
    const tournaments = await Tournament.find(
      { $or: [
        { name: searchRegex },
        { venue: searchRegex },
        { description: searchRegex }
      ], isActive: true }
    )
      .select('name venue startDate endDate status')
      .limit(limit)
      .lean();

    const categories = [
      { key: 'players', label: 'Players', count: players.length },
      { key: 'matches', label: 'Matches', count: matches.length },
      { key: 'teams', label: 'Teams', count: teams.length },
      { key: 'tournaments', label: 'Tournaments', count: tournaments.length },
      { key: 'users', label: 'Users', count: users.length }
    ];

    return {
      users,
      teams,
      players,
      matches,
      tournaments,
      categories,
      total: users.length + teams.length + players.length + matches.length + tournaments.length
    };
  }
};

export default searchService;
