import Club from './club.model.js';
import ApiError from '../../utils/ApiError.js';

export const clubService = {
  createClub: async (data, userId) => {
    const club = await Club.create({ ...data, owner: userId, members: [{ user: userId, role: 'owner' }] });
    return club;
  },

  getAllClubs: async (query) => {
    const filter = { isActive: true, isPublic: true };
    if (query.search) filter.name = { $regex: query.search, $options: 'i' };
    return Club.find(filter).populate('owner', 'name').sort({ createdAt: -1 });
  },

  getClubById: async (clubId) => {
    const club = await Club.findById(clubId).populate('owner', 'name').populate('members.user', 'name avatar');
    if (!club) throw new ApiError(404, 'Club not found');
    return club;
  },

  updateClub: async (clubId, userId, data) => {
    const club = await Club.findById(clubId);
    if (!club) throw new ApiError(404, 'Club not found');
    if (club.owner.toString() !== userId) throw new ApiError(403, 'Not authorized');
    Object.assign(club, data);
    await club.save();
    return club;
  },

  addMember: async (clubId, userId) => {
    const club = await Club.findById(clubId);
    if (!club) throw new ApiError(404, 'Club not found');
    const exists = club.members.find(m => m.user.toString() === userId);
    if (exists) throw new ApiError(400, 'Already a member');
    club.members.push({ user: userId, role: 'member' });
    await club.save();
    return club;
  },

  removeMember: async (clubId, memberId, userId) => {
    const club = await Club.findById(clubId);
    if (!club) throw new ApiError(404, 'Club not found');
    if (club.owner.toString() !== userId) throw new ApiError(403, 'Not authorized');
    club.members = club.members.filter(m => m.user.toString() !== memberId);
    await club.save();
    return club;
  },

  addTeam: async (clubId, teamId, userId) => {
    const club = await Club.findById(clubId);
    if (!club) throw new ApiError(404, 'Club not found');
    if (club.owner.toString() !== userId) throw new ApiError(403, 'Not authorized');
    if (!club.teams.includes(teamId)) club.teams.push(teamId);
    await club.save();
    return club;
  },

  getClubRankings: async () => {
    return Club.find({ isActive: true, isVerified: true })
      .sort({ 'stats.wins': -1 })
      .limit(20);
  },

  deleteClub: async (clubId, userId) => {
    const club = await Club.findById(clubId);
    if (!club) throw new ApiError(404, 'Club not found');
    if (club.owner.toString() !== userId) throw new ApiError(403, 'Not authorized');
    club.isActive = false;
    await club.save();
    return { message: 'Club deleted' };
  }
};

export default clubService;
