import Discovery from './discovery.model.js';
import ApiError from '../../utils/ApiError.js';
import Player from '../player/player.model.js';
import Team from '../team/team.model.js';
import Tournament from '../tournament/tournament.model.js';
import Match from '../match/match.model.js';

const normalizeText = (value) => value?.toString().trim() || '';

const matchesSearch = (item, search) => {
  if (!search) return true;
  const needle = search.toString().toLowerCase();
  return [
    item.name,
    item.location,
    item.type,
    item.details?.role,
    item.details?.team,
    item.details?.coach,
    item.details?.captain,
    item.details?.bio,
  ].some((value) => normalizeText(value).toLowerCase().includes(needle));
};

const matchesLocation = (item, location) => {
  if (!location || location === 'All Locations') return true;
  return normalizeText(item.location).toLowerCase().includes(location.toString().toLowerCase());
};

const matchesType = (item, type) => {
  if (!type || type === 'all') return true;
  if (type === 'opponentTeam') return item.type === 'opponentTeam';
  if (type === 'tournamentTeam') return item.type === 'tournamentTeam';
  return item.type === type;
};

const compact = (values) => values.map(normalizeText).filter(Boolean).join(', ');

const toPlainDiscovery = (item) => ({
  id: item._id?.toString(),
  _id: item._id?.toString(),
  type: item.type,
  name: item.name,
  location: item.location,
  latitude: item.latitude,
  longitude: item.longitude,
  image: item.image,
  rating: item.rating || 0,
  isPro: !!item.isPro,
  isVerified: !!item.isVerified,
  details: item.details || {},
  contact: item.contact || {},
  socialLinks: item.socialLinks || {},
  availability: item.availability || 'available',
  hourlyRate: item.hourlyRate,
  views: item.views || 0,
  createdAt: item.createdAt,
});

export const discoveryService = {
  /**
   * Get all discovery items with filters
   */
  async getAllDiscoveryItems(filters = {}, options = {}) {
    const { type, location, search, isPro, latitude, longitude, radius } = filters;
    const page = Math.max(parseInt(options.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(options.limit, 10) || 20, 1), 100);
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder === 'asc' ? 1 : -1;

    const query = { isActive: true };

    if (type && type !== 'all') {
      query.type = type;
    }

    if (location && location !== 'All Locations') {
      query.location = { $regex: location, $options: 'i' };
    }

    if (isPro !== undefined) {
      query.isPro = isPro === 'true';
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { 'details.bio': { $regex: search, $options: 'i' } },
        { 'details.role': { $regex: search, $options: 'i' } },
      ];
    }

    const discoveryItems = await Discovery.find(query)
      .sort({ [sortBy]: sortOrder })
      .limit(limit)
      .lean();

    const shouldAdd = (item) =>
      matchesType(item, type) &&
      matchesLocation(item, location) &&
      matchesSearch(item, search) &&
      (isPro === undefined || item.isPro === (isPro === 'true'));

    const derivedItems = await discoveryService.getDerivedDiscoveryItems({ type, search, location, limit });
    const merged = [
      ...discoveryItems.map(toPlainDiscovery),
      ...derivedItems.filter(shouldAdd),
    ];

    const unique = Array.from(
      new Map(merged.map((item) => [`${item.type}:${item.id || item._id || item.name}`, item])).values()
    );

    unique.sort((a, b) => {
      if (sortBy === 'rating') return ((b.rating || 0) - (a.rating || 0)) * sortOrder;
      if (sortBy === 'views') return ((b.views || 0) - (a.views || 0)) * sortOrder;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    const totalDocs = unique.length;
    const start = (page - 1) * limit;
    const docs = unique.slice(start, start + limit);

    return {
      docs,
      totalDocs,
      limit,
      page,
      totalPages: Math.max(Math.ceil(totalDocs / limit), 1),
      hasNextPage: start + limit < totalDocs,
      hasPrevPage: page > 1,
    };
  },

  async getDerivedDiscoveryItems({ type, search, location, limit = 20 } = {}) {
    const queryText = search ? { $regex: search, $options: 'i' } : null;
    const locationText = location && location !== 'All Locations' ? { $regex: location, $options: 'i' } : null;
    const max = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const tasks = [];

    if (!type || type === 'all' || type === 'player') {
      const playerQuery = { isActive: true };
      if (queryText) {
        playerQuery.$or = [
          { playerName: queryText },
          { role: queryText },
          { teamName: queryText },
        ];
      }
      tasks.push(
        Player.find(playerQuery)
          .populate('team', 'name shortName city homeGround')
          .sort({ updatedAt: -1 })
          .limit(max)
          .lean()
          .then((players) => players.map((player) => ({
            id: `player-${player._id}`,
            _id: `player-${player._id}`,
            sourceId: player._id?.toString(),
            type: 'player',
            name: player.playerName || 'Player',
            location: compact([player.team?.city, player.team?.homeGround, player.nationality]) || 'Location not added',
            image: player.profileImage?.url,
            rating: 4.4,
            isPro: false,
            isVerified: true,
            availability: 'available',
            contact: { phone: player.phone, email: player.email },
            details: {
              role: player.role,
              team: player.team?.name || player.teamName,
              battingStyle: player.battingStyle,
              bowlingStyle: player.bowlingStyle,
              stats: player.stats || {},
              bio: 'Available player profile from Scores11 live data.',
            },
            views: player.stats?.matches || 0,
            createdAt: player.updatedAt || player.createdAt,
          })))
      );
    }

    if (!type || type === 'all' || type === 'opponentTeam' || type === 'tournamentTeam') {
      const teamQuery = { isActive: true };
      if (queryText) {
        teamQuery.$or = [{ name: queryText }, { shortName: queryText }, { city: queryText }, { homeGround: queryText }];
      }
      if (locationText) {
        teamQuery.$or = [...(teamQuery.$or || []), { city: locationText }, { state: locationText }, { homeGround: locationText }];
      }
      tasks.push(
        Team.find(teamQuery)
          .populate('captain', 'playerName')
          .sort({ updatedAt: -1 })
          .limit(max)
          .lean()
          .then((teams) => teams.flatMap((team) => {
            const base = {
              sourceId: team._id?.toString(),
              name: team.name || 'Team',
              location: compact([team.homeGround, team.city, team.state]) || 'Home ground not added',
              image: team.logo?.url,
              rating: team.isVerified ? 4.6 : 4.1,
              isPro: false,
              isVerified: !!team.isVerified,
              availability: 'available',
              contact: {},
              details: {
                coach: team.coach,
                captain: team.captain?.playerName,
                trophies: team.stats?.matchesWon,
                matches: team.stats?.matchesPlayed,
                bio: team.description || 'Team profile from Scores11 live teams.',
              },
              views: team.stats?.matchesPlayed || 0,
              createdAt: team.updatedAt || team.createdAt,
            };
            const items = [];
            if (!type || type === 'all' || type === 'opponentTeam') {
              items.push({ ...base, id: `opponentTeam-${team._id}`, _id: `opponentTeam-${team._id}`, type: 'opponentTeam' });
            }
            if (!type || type === 'all' || type === 'tournamentTeam') {
              items.push({ ...base, id: `tournamentTeam-${team._id}`, _id: `tournamentTeam-${team._id}`, type: 'tournamentTeam' });
            }
            return items;
          }))
      );
    }

    if (!type || type === 'all' || type === 'tournament') {
      const tournamentQuery = { isActive: true };
      if (queryText) tournamentQuery.$or = [{ name: queryText }, { shortName: queryText }, { description: queryText }];
      if (locationText) {
        tournamentQuery.$or = [
          ...(tournamentQuery.$or || []),
          { 'venue.name': locationText },
          { 'venue.city': locationText },
          { 'venue.state': locationText },
        ];
      }
      tasks.push(
        Tournament.find(tournamentQuery)
          .sort({ startDate: -1 })
          .limit(max)
          .lean()
          .then((tournaments) => tournaments.map((tournament) => ({
            id: `tournament-${tournament._id}`,
            _id: `tournament-${tournament._id}`,
            sourceId: tournament._id?.toString(),
            type: 'tournament',
            name: tournament.name || 'Tournament',
            location: compact([tournament.venue?.name, tournament.venue?.city, tournament.venue?.state]) || 'Venue not added',
            image: tournament.banner?.url || tournament.logo?.url,
            rating: 4.5,
            isPro: tournament.entryFee > 0,
            isVerified: true,
            availability: tournament.status,
            hourlyRate: tournament.entryFee,
            contact: {},
            details: {
              role: tournament.format,
              matches: tournament.matches?.length || 0,
              trophies: tournament.maxTeams,
              bio: tournament.description || `${tournament.format || 'Cricket'} tournament on Scores11.`,
            },
            views: tournament.teams?.length || 0,
            createdAt: tournament.startDate || tournament.createdAt,
          })))
      );
    }

    if (!type || type === 'all' || type === 'ground') {
      const matchQuery = { isActive: true, 'venue.name': { $exists: true, $ne: '' } };
      if (queryText) matchQuery.$or = [{ 'venue.name': queryText }, { 'venue.city': queryText }, { 'venue.country': queryText }];
      if (locationText) matchQuery.$or = [...(matchQuery.$or || []), { 'venue.city': locationText }, { 'venue.name': locationText }];
      tasks.push(
        Match.find(matchQuery)
          .select('venue scheduledDate updatedAt createdAt')
          .sort({ scheduledDate: -1 })
          .limit(max * 2)
          .lean()
          .then((matches) => {
            const grounds = new Map();
            for (const match of matches) {
              const venueName = normalizeText(match.venue?.name);
              if (!venueName || grounds.has(venueName.toLowerCase())) continue;
              grounds.set(venueName.toLowerCase(), {
                id: `ground-${venueName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
                _id: `ground-${venueName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
                type: 'ground',
                name: venueName,
                location: compact([match.venue?.city, match.venue?.country]) || 'Ground location not added',
                rating: 4.2,
                isPro: false,
                isVerified: true,
                availability: 'available',
                contact: {},
                details: {
                  capacity: match.venue?.capacity,
                  bio: 'Ground listed from scheduled and live Scores11 matches.',
                },
                views: 0,
                createdAt: match.updatedAt || match.createdAt,
              });
            }
            return Array.from(grounds.values()).slice(0, max);
          })
      );
    }

    const groups = await Promise.all(tasks);
    return groups.flat().filter((item) => matchesLocation(item, location) && matchesSearch(item, search));
  },

  /**
   * Get discovery item by ID
   */
  async getDiscoveryItemById(id) {
    const item = await Discovery.findById(id);
    if (!item) {
      throw new ApiError(404, 'Discovery item not found');
    }

    // Increment views
    await Discovery.findByIdAndUpdate(id, { $inc: { views: 1 } });

    return item;
  },

  /**
   * Create discovery item
   */
  async createDiscoveryItem(data) {
    const item = await Discovery.create(data);
    return item;
  },

  /**
   * Update discovery item
   */
  async updateDiscoveryItem(id, data) {
    const item = await Discovery.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!item) {
      throw new ApiError(404, 'Discovery item not found');
    }
    return item;
  },

  /**
   * Delete discovery item
   */
  async deleteDiscoveryItem(id) {
    const item = await Discovery.findByIdAndDelete(id);
    if (!item) {
      throw new ApiError(404, 'Discovery item not found');
    }
    return item;
  },

  /**
   * Get discovery items by user ID
   */
  async getItemsByUserId(userId) {
    return await Discovery.find({ userId, isActive: true }).sort({ createdAt: -1 });
  },

  /**
   * Get nearby discovery items
   */
  async getNearbyItems(latitude, longitude, radius = 10, type = null) {
    const query = { isActive: true };

    if (type && type !== 'all') {
      query.type = type;
    }

    return await Discovery.find(query)
      .sort({ isPro: -1, rating: -1, views: -1 })
      .limit(20);
  },

  /**
   * Get popular discovery items
   */
  async getPopularItems(limit = 10, type = null) {
    const query = { isActive: true };
    if (type && type !== 'all') {
      query.type = type;
    }

    return await Discovery.find(query)
      .sort({ views: -1, rating: -1 })
      .limit(limit);
  },

  /**
   * Get featured PRO items
   */
  async getFeaturedProItems(limit = 10) {
    return await Discovery.find({ isActive: true, isPro: true })
      .sort({ rating: -1 })
      .limit(limit);
  },

  /**
   * Get unique locations
   */
  async getUniqueLocations() {
    const [discoveryLocations, teamCities, teamGrounds, tournamentCities, tournamentVenues, matchCities, matchVenues] = await Promise.all([
      Discovery.distinct('location', { isActive: true }),
      Team.distinct('city', { isActive: true, city: { $exists: true, $ne: '' } }),
      Team.distinct('homeGround', { isActive: true, homeGround: { $exists: true, $ne: '' } }),
      Tournament.distinct('venue.city', { isActive: true, 'venue.city': { $exists: true, $ne: '' } }),
      Tournament.distinct('venue.name', { isActive: true, 'venue.name': { $exists: true, $ne: '' } }),
      Match.distinct('venue.city', { isActive: true, 'venue.city': { $exists: true, $ne: '' } }),
      Match.distinct('venue.name', { isActive: true, 'venue.name': { $exists: true, $ne: '' } }),
    ]);
    return Array.from(
      new Set([
        ...discoveryLocations,
        ...teamCities,
        ...teamGrounds,
        ...tournamentCities,
        ...tournamentVenues,
        ...matchCities,
        ...matchVenues,
      ].map(normalizeText).filter(Boolean))
    ).sort();
  },

  /**
   * Toggle discovery item status
   */
  async toggleStatus(id) {
    const item = await Discovery.findById(id);
    if (!item) {
      throw new ApiError(404, 'Discovery item not found');
    }

    item.isActive = !item.isActive;
    await item.save();

    return item;
  },

  /**
   * Upgrade to PRO
   */
  async upgradeToPro(id) {
    const item = await Discovery.findByIdAndUpdate(
      id,
      { $set: { isPro: true } },
      { new: true }
    );
    if (!item) {
      throw new ApiError(404, 'Discovery item not found');
    }
    return item;
  },
};

export default discoveryService;
