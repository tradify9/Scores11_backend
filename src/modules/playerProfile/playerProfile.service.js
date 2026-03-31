import PlayerProfile from './playerProfile.model.js';
import Player from '../player/player.model.js';
import User from '../user/user.model.js';
import ApiError from '../../utils/ApiError.js';
import { getPagination } from '../../utils/pagination.js';

export const playerProfileService = {
  // Create player profile (Self Registration)
  createProfile: async (profileData, userId) => {
  // Duplicate check removed - handle MongoDB unique gracefully
  // const existingProfile = await PlayerProfile.findOne({ user: userId });
  // if (existingProfile) {
  //   throw new ApiError(400, 'Player profile already exists');
  // }

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    try {
      const profile = await PlayerProfile.create({
        ...profileData,
        user: userId
      });

      // Link with Player model if exists
      if (profileData.player) {
        await Player.findByIdAndUpdate(profileData.player, {
          user: userId,
          playerName: profileData.fullName,
          dateOfBirth: profileData.dateOfBirth
        });
      }

      return profile;
    } catch (error) {
      if (error.code === 11000) {
        // Duplicate user - return existing profile as success
        return await PlayerProfile.findOne({ user: userId })
          .populate('user', 'name email phone avatar')
          .populate('player', 'playerName jerseyNumber role')
          .populate('currentTeam', 'name shortName logo')
          .populate('verifiedBy', 'name');
      }
      throw error;
    }
  },

  // Get profile by ID
  getProfileById: async (profileId) => {
    const profile = await PlayerProfile.findById(profileId)
      .populate('user', 'name email phone avatar')
      .populate('player', 'playerName jerseyNumber role')
      .populate('currentTeam', 'name shortName logo')
      .populate('verifiedBy', 'name');
    
    if (!profile) {
      throw new ApiError(404, 'Player profile not found');
    }
    return profile;
  },

  // Get current user's profile
  getMyProfile: async (userId) => {
    const profile = await PlayerProfile.findOne({ user: userId })
      .populate('user', 'name email phone avatar')
      .populate('player', 'playerName jerseyNumber role stats')
      .populate('currentTeam', 'name shortName logo');
    
    if (!profile) {
      throw new ApiError(404, 'Player profile not found');
    }
    return profile;
  },

  // Update profile
  updateProfile: async (profileId, updateData, userId) => {
    const profile = await PlayerProfile.findById(profileId);
    if (!profile) {
      throw new ApiError(404, 'Player profile not found');
    }

    // Check ownership (only owner or admin can update)
    if (profile.user.toString() !== userId) {
      throw new ApiError(403, 'Not authorized to update this profile');
    }

    // Prevent updating verified fields
    if (profile.isVerified) {
      delete updateData.isVerified;
      delete updateData.verificationStatus;
      delete updateData.verificationBadge;
    }

    const updatedProfile = await PlayerProfile.findByIdAndUpdate(
      profileId,
      updateData,
      { new: true, runValidators: true }
    ).populate('user', 'name email');

    return updatedProfile;
  },

  // Upload stats manually
  uploadStats: async (profileId, statsData, userId) => {
    const profile = await PlayerProfile.findById(profileId);
    if (!profile) {
      throw new ApiError(404, 'Player profile not found');
    }

    if (profile.user.toString() !== userId) {
      throw new ApiError(403, 'Not authorized');
    }

    // Update stats
    profile.stats = {
      ...profile.stats,
      ...statsData
    };

    await profile.save();

    // Also update Player model if linked
    if (profile.player) {
      await Player.findByIdAndUpdate(profile.player, {
        battingStats: {
          runs: statsData.totalRuns,
          matches: statsData.totalMatches
        },
        bowlingStats: {
          wickets: statsData.totalWickets
        }
      });
    }

    return profile;
  },

  // Update performance data
  updatePerformance: async (profileId, performanceData, userId) => {
    const profile = await PlayerProfile.findById(profileId);
    if (!profile) {
      throw new ApiError(404, 'Player profile not found');
    }

    if (profile.user.toString() !== userId) {
      throw new ApiError(403, 'Not authorized');
    }

    // Update or add performance record
    const performanceIndex = profile.stats.performanceRecords?.findIndex(
      p => p.year === performanceData.year && p.tournament === performanceData.tournament
    );

    if (performanceIndex >= 0) {
      profile.stats.performanceRecords[performanceIndex] = performanceData;
    } else {
      if (!profile.stats.performanceRecords) {
        profile.stats.performanceRecords = [];
      }
      profile.stats.performanceRecords.push(performanceData);
    }

    await profile.save();
    return profile;
  },

  // Link with Player model
  linkWithPlayer: async (profileId, playerId, userId) => {
    const profile = await PlayerProfile.findById(profileId);
    if (!profile) {
      throw new ApiError(404, 'Player profile not found');
    }

    if (profile.user.toString() !== userId) {
      throw new ApiError(403, 'Not authorized');
    }

    const player = await Player.findById(playerId);
    if (!player) {
      throw new ApiError(404, 'Player not found');
    }

    profile.player = playerId;
    await profile.save();

    // Update player with profile data
    await Player.findByIdAndUpdate(playerId, {
      user: userId,
      playerName: profile.fullName,
      dateOfBirth: profile.dateOfBirth,
      battingStyle: profile.battingStyle,
      bowlingStyle: profile.bowlingStyle,
      role: profile.role
    });

    return profile;
  },

  // Verify profile (Admin)
  verifyProfile: async (profileId, adminId) => {
    const profile = await PlayerProfile.findById(profileId);
    if (!profile) {
      throw new ApiError(404, 'Player profile not found');
    }

    profile.isVerified = true;
    profile.verificationStatus = 'verified';
    profile.verificationBadge = true;
    profile.verifiedAt = new Date();
    profile.verifiedBy = adminId;

    await profile.save();

    return profile;
  },

  // Reject profile (Admin)
  rejectProfile: async (profileId, reason) => {
    const profile = await PlayerProfile.findById(profileId);
    if (!profile) {
      throw new ApiError(404, 'Player profile not found');
    }

    profile.verificationStatus = 'rejected';
    profile.rejectionReason = reason;

    await profile.save();

    return profile;
  },

  // Get all profiles (Admin)
  getAllProfiles: async (query) => {
    const { page, limit, skip, sortBy, sortOrder } = getPagination(query);
    
    const filter = {};
    if (query.isVerified !== undefined) filter.isVerified = query.isVerified;
    if (query.verificationStatus) filter.verificationStatus = query.verificationStatus;
    if (query.role) filter.role = query.role;
    if (query.search) {
      filter.$or = [
        { fullName: { $regex: query.search, $options: 'i' } },
        { phone: { $regex: query.search, $options: 'i' } }
      ];
    }

    const [profiles, total] = await Promise.all([
      PlayerProfile.find(filter)
        .populate('user', 'name email phone')
        .populate('currentTeam', 'name shortName')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit),
      PlayerProfile.countDocuments(filter)
    ]);

    return {
      profiles,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  },

  // Get verified profiles
  getVerifiedProfiles: async (query) => {
    const { page, limit, skip } = getPagination(query);
    
    const [profiles, total] = await Promise.all([
      PlayerProfile.find({ isVerified: true, verificationBadge: true })
        .populate('user', 'name email')
        .populate('currentTeam', 'name shortName')
        .skip(skip)
        .limit(limit),
      PlayerProfile.countDocuments({ isVerified: true, verificationBadge: true })
    ]);

    return {
      profiles,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  },

  // Delete profile
  deleteProfile: async (profileId, userId) => {
    const profile = await PlayerProfile.findById(profileId);
    if (!profile) {
      throw new ApiError(404, 'Player profile not found');
    }

    if (profile.user.toString() !== userId) {
      throw new ApiError(403, 'Not authorized');
    }

    profile.isActive = false;
    await profile.save();

    return { message: 'Profile deleted successfully' };
  }
};

export default playerProfileService;
