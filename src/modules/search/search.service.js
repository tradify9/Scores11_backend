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
      .select('fullName username email avatar role')
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
    const players = await Player.find(
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

    // Search matches
    const matches = await Match.find(
      { $or: [
        { title: searchRegex },
        { teamA: searchRegex },
        { teamB: searchRegex },
        { venue: searchRegex }
      ]}
    )
      .select('title teamA teamB venue status date')
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

    return {
      users,
      teams,
      players,
      matches,
      tournaments,
      total: users.length + teams.length + players.length + matches.length + tournaments.length
    };
  }
};

export default searchService;
