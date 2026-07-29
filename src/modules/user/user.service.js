import User from './user.model.js';
import Player from '../player/player.model.js';
import mongoose from 'mongoose';
import { uploadImage, deleteImage } from '../../config/cloudinary.js';
import ApiError from '../../utils/ApiError.js';
import { getPagination } from '../../utils/pagination.js';
import { EXPERIENCE_POINTS } from '../../constants/userLevels.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { sendVerificationEmail } from '../../utils/sendVerificationEmail.js';
import { notificationService } from '../notification/notification.service.js';

const normalizePlayingStyleToPlayerType = (playingStyle) => {
  const value = playingStyle?.toString().trim().toLowerCase();
  if (!value) return null;
  if (value.includes('wicket')) return 'wicket-keeper';
  if (value.includes('all')) return 'all-rounder';
  if (value.includes('bowl') || value.includes('spin')) return 'bowler';
  if (value.includes('bat')) return 'batsman';
  return null;
};

export const userService = {
  getUserByEmail: async (email) => {
    const user = await User.findOne({ email });
    return user;
  },

  getUserById: async (userId) => {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, 'Invalid user ID format');
    }
    const user = await User.findById(userId).select('-password');
    if (!user) {
      console.error(`User not found for ID: ${userId}`);
      throw new ApiError(404, 'User not found');
    }
    return user;
  },

  getFullProfile: async (userId) => {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, 'Invalid user ID format');
    }

    const user = await User.findById(userId).select('-password -refreshToken').lean();
    if (!user) throw new ApiError(404, 'User not found');

    const player = await Player.findOne({
      $or: [
        { user: user._id },
        ...(user.email ? [{ email: user.email }] : []),
        ...(user.phone ? [{ phone: user.phone }] : [])
      ],
      isActive: { $ne: false }
    })
      .populate('team', 'name shortName logo')
      .lean();

    const playerStats = player?.stats || {};
    const stats = {
      ...(user.stats || {}),
      matches: playerStats.matches || user.stats?.matches || 0,
      runs: playerStats.runs || user.stats?.runs || 0,
      balls: playerStats.balls || user.stats?.balls || 0,
      fours: playerStats.fours || user.stats?.fours || 0,
      sixes: playerStats.sixes || user.stats?.sixes || 0,
      average: playerStats.average || user.stats?.average || 0,
      strikeRate: playerStats.strikeRate || user.stats?.strikeRate || 0,
      highestScore: playerStats.highestScore || user.stats?.highestScore || 0,
      wickets: playerStats.wickets || user.stats?.wickets || 0,
      economy: playerStats.economy || user.stats?.economy || 0,
      profileViews: user.profileViews || user.stats?.profileViews || 0,
      followers: user.followers?.length || 0,
      following: user.following?.length || 0
    };

    return {
      user: {
        ...user,
        cricketProfile: {
          ...(user.cricketProfile || {}),
          playerId: player?._id || user.cricketProfile?.playerId,
          playerType: player?.role || user.cricketProfile?.playerType,
          battingStyle: player?.battingStyle || user.cricketProfile?.battingStyle,
          bowlingStyle: player?.bowlingStyle || user.cricketProfile?.bowlingStyle,
          teamName: player?.team?.name || player?.teamName || user.cricketProfile?.teamName
        }
      },
      player,
      stats,
      social: {
        profileViews: stats.profileViews,
        followers: stats.followers,
        following: stats.following
      },
      equipment: user.equipment || [],
      achievements: user.achievements || []
    };
  },

// Registration & Authentication
  createUser: async (userData) => {
    const { email, password, username, fullName, phone, role } = userData;
    
    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }, { phone }]
    });
    
    if (existingUser) {
      if (existingUser.email === email) throw new ApiError(400, 'Email already registered');
      if (existingUser.username === username) throw new ApiError(400, 'Username already taken');
      if (existingUser.phone === phone) throw new ApiError(400, 'Phone number already registered');
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generate referral code
    const referralCode = `${username}_${crypto.randomBytes(3).toString('hex')}`.toUpperCase();
    
// Accept role from request, default to 'user', but allow 'player', 'umpire', 'scorer'
    const validRoles = ['user', 'player', 'umpire', 'scorer', 'admin', 'captain', 'manager'];
    const userRole = validRoles.includes(role) ? role : 'user';
    
    // Set isPublicPlayer to true if user registers with role = "player"
    const isPublicPlayer = userRole === 'player';
    
    const user = await User.create({
      email,
      password: hashedPassword,
      username,
      fullName,
      phone,
      referralCode,
      role: userRole,
      isActive: true,
      isPublicPlayer: isPublicPlayer
    });
    
    // Handle referral if provided
    if (userData.referralCode) {
      await userService.handleReferral(userData.referralCode, user._id);
    }
    
// AUTO-CREATE PLAYER PROFILE when user registers with 'player' role
    if (userRole === 'player') {
      try {
        const Player = (await import('../player/player.model.js')).default;
        
        // 🔥 FIXED: Create player profile properly linked to this user via user field
        const player = await Player.create({
          user: user._id,  // 🔥 CRITICAL: Link player to user
          playerName: fullName,
          role: userData.playerRole || 'batsman', // Default role
          battingStyle: userData.battingStyle || 'right-hand bat',
          bowlingStyle: userData.bowlingStyle || 'none',
          phone: phone,
          dateOfBirth: userData.dateOfBirth,
          nationality: userData.nationality || 'India',
          isActive: true
        });
        
        // 🔥 Ensure the player reference is stored in user.cricketProfile for easy access
        user.cricketProfile = {
          playerId: player._id,
          playerType: userData.playerRole || 'batsman',
          battingStyle: userData.battingStyle || 'right-hand bat',
          bowlingStyle: userData.bowlingStyle || 'none'
        };
        await user.save();
        
        console.log(`[PLAYER-CREATE] Auto-created player profile for user: ${user.email} (playerId: ${player._id})`);
      } catch (playerError) {
        console.error('[PLAYER-CREATE] Error auto-creating player profile:', playerError.message);
        // Don't fail registration if player creation fails
      }
    }
    
    return user;
  },

  handleReferral: async (referralCode, newUserId) => {
    const referrer = await User.findOne({ referralCode });
    if (referrer) {
      referrer.referredBy = newUserId;
      referrer.referralEarnings += 50; // Add referral bonus
      await referrer.save();
      
      // Add experience points to referrer
      await this.addExperiencePoints(referrer._id, EXPERIENCE_POINTS.REFERRAL);
    }
  },

  // Profile Management
  updateProfile: async (userId, updateData) => {
    const allowedUpdates = ['name', 'phone', 'dateOfBirth', 'address', 'bio'];
    const updates = {};
    
    allowedUpdates.forEach(field => {
      if (updateData[field] !== undefined) {
        updates[field] = updateData[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true }
    );

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return user;
  },

  uploadAvatar: async (userId, file) => { 
    if (!file) {
      throw new ApiError(400, 'No file uploaded');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (user.avatar?.publicId) {
      await deleteImage(user.avatar.publicId);
    }

    const uploadResult = await uploadImage(file.path, 'crick11/avatars');
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        avatar: {
          publicId: uploadResult.publicId,
          url: uploadResult.url
        }
      },
      { new: true }
    );

    return updatedUser;
  },

  uploadCoverPhoto: async (userId, file) => {
    if (!file) {
      throw new ApiError(400, 'No file uploaded');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (user.coverPhoto?.publicId) {
      await deleteImage(user.coverPhoto.publicId);
    }

    const uploadResult = await uploadImage(file.path, 'crickhero/covers', {
      width: 1200,
      height: 400,
      crop: 'fill'
    });
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        coverPhoto: {
          publicId: uploadResult.publicId,
          url: uploadResult.url
        }
      },
      { new: true }
    );

    return updatedUser;
  },

  // Experience & Leveling
  addExperiencePoints: async (userId, points) => {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    user.experiencePoints += points;
    await user.save();
    
    return {
      newLevel: user.level,
      newTitle: user.title,
      experiencePoints: user.experiencePoints
    };
  },

  getNextLevelExperience: (currentLevel, currentExp) => {
    const levelRequirements = {
      1: 100,
      2: 500,
      3: 1000,
      4: 5000,
      5: null
    };
    
    const required = levelRequirements[currentLevel];
    if (!required) return null;
    
    return {
      required,
      remaining: required - currentExp,
      percentage: Math.round((currentExp / required) * 100)
    };
  },

  // Social Features
  followUser: async (userId, targetUserId) => {
    if (userId === targetUserId) {
      throw new ApiError(400, 'You cannot follow yourself');
    }

    const [user, targetUser] = await Promise.all([
      User.findById(userId),
      User.findById(targetUserId)
    ]);

    if (!targetUser) {
      throw new ApiError(404, 'User to follow not found');
    }

    if (!user.following.includes(targetUserId)) {
      user.following.push(targetUserId);
      targetUser.followers.push(userId);
      
      await Promise.all([user.save(), targetUser.save()]);
      try {
        const actorName = user.name || user.fullName || user.username || 'Someone';
        await notificationService.sendNotification({
          userId: targetUserId,
          title: 'New follower',
          message: `${actorName} started following you.`,
          type: 'follow',
          data: {
            userId,
            senderId: userId,
            referenceId: userId,
            actionUrl: `/profile/${userId}`,
            sound: 'scores11'
          },
          skipIfSelfUserId: userId
        });
      } catch (error) {
        console.warn('Follow notification skipped:', error.message);
      }
    }

    return { message: 'User followed successfully' };
  },

  unfollowUser: async (userId, targetUserId) => {
    const [user, targetUser] = await Promise.all([
      User.findById(userId),
      User.findById(targetUserId)
    ]);

    if (user && targetUser) {
      user.following = user.following.filter(id => id.toString() !== targetUserId);
      targetUser.followers = targetUser.followers.filter(id => id.toString() !== userId);
      
      await Promise.all([user.save(), targetUser.save()]);
    }

    return { message: 'User unfollowed successfully' };
  },

  getFollowers: async (userId, query) => {
    const { page, limit, skip } = getPagination(query);
    
    const user = await User.findById(userId)
      .populate({
        path: 'followers',
        select: 'username fullName avatar level title',
        options: {
          skip,
          limit
        }
      });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const total = user.followers.length;

    return {
      followers: user.followers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  },

  getFollowing: async (userId, query) => {
    const { page, limit, skip } = getPagination(query);
    
    const user = await User.findById(userId)
      .populate({
        path: 'following',
        select: 'username fullName avatar level title',
        options: {
          skip,
          limit
        }
      });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const total = user.following.length;

    return {
      following: user.following,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  },

  // Search & Filter
  getAllUsers: async (query) => {
    const { page, limit, skip, sortBy, sortOrder } = getPagination(query);
    
    const filter = {};
    if (query.role) filter.role = query.role;
    if (query.isActive !== undefined) filter.isActive = query.isActive;
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } }
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter)
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  },

  updateUser: async (userId, updateData) => {
    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return user;
  },

  deleteUser: async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Delete associated images
    if (user.avatar?.publicId) {
      await deleteImage(user.avatar.publicId);
    }
    if (user.coverPhoto?.publicId) {
      await deleteImage(user.coverPhoto.publicId);
    }

    // Permanent delete
    await User.findByIdAndDelete(userId);
    
    return { message: 'User permanently deleted' };
  },

  // Admin - Ban User
  banUser: async (userId, reason) => {
    const user = await User.findByIdAndUpdate(
      userId,
      {
        isBlocked: true,
        isActive: false,
        blockedReason: reason,
        blockedAt: new Date()
      },
      { new: true }
    );

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return user;
  },

  // Admin - Unban User
  unbanUser: async (userId) => {
    const user = await User.findByIdAndUpdate(
      userId,
      {
        isBlocked: false,
        isActive: true,
        blockedReason: null,
        blockedAt: null
      },
      { new: true }
    );

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return user;
  },

  // Admin - Reset Password
  adminResetPassword: async (userId, newPassword) => {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    return { message: 'Password reset successfully' };
  },

  // Admin - Verify User Account
  verifyUserAccount: async (userId) => {
    const user = await User.findByIdAndUpdate(
      userId,
      {
        isEmailVerified: true,
        isPhoneVerified: true,
        verifiedAt: new Date()
      },
      { new: true }
    );

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return user;
  },

  // Admin - Change User Role
  changeUserRole: async (userId, newRole) => {
    const validRoles = ['user', 'admin', 'moderator', 'player', 'captain', 'manager', 'scorer', 'umpire'];
    
    if (!validRoles.includes(newRole)) {
      throw new ApiError(400, 'Invalid role');
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role: newRole },
      { new: true }
    );

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return user;
  },

  // Admin - Get Login History
  getLoginHistory: async (userId, query) => {
    const { page, limit, skip } = getPagination(query);
    
    const user = await User.findById(userId).select('loginHistory');
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const total = user.loginHistory.length;
    const history = user.loginHistory.slice(skip, skip + limit);

    return {
      history,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  },

  // User Reports - Create Report
  createUserReport: async (reporterId, reportedUserId, reason, description) => {
    const Report = (await import('../report/report.model.js')).default;
    
    const report = await Report.create({
      reporter: reporterId,
      reportedUser: reportedUserId,
      reason,
      description,
      status: 'pending'
    });

    return report;
  },

  // Admin - Get User Reports
  getUserReports: async (query) => {
    const { page, limit, skip } = getPagination(query);
    const Report = (await import('../report/report.model.js')).default;
    
    const filter = {};
    if (query.status) filter.status = query.status;
    if (query.type) filter.type = query.type;

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .populate('reporter', 'username fullName email')
        .populate('reportedUser', 'username fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Report.countDocuments(filter)
    ]);

    return {
      reports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  },

  // Admin - Action on Report
  actionOnReport: async (reportId, action, adminNote, resolvedBy = null) => {
    const Report = (await import('../report/report.model.js')).default;
    
    const report = await Report.findByIdAndUpdate(
      reportId,
      {
        status: action === 'ban' ? 'approved' : 'rejected',
        actionTaken: action,
        adminNote,
        resolvedAt: new Date(),
        resolvedBy
      },
      { new: true }
    );

    if (!report) {
      throw new ApiError(404, 'Report not found');
    }

    // If action is ban, block the user
    if (action === 'ban') {
      await userService.banUser(report.reportedUser, adminNote);
    }

    return report;
  },

  // Statistics
  getUserStats: async (userId) => {
    const user = await User.findById(userId)
      .select('stats experiencePoints level title cricketProfile achievements');
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const experiencePoints = Number(user.experiencePoints || 0);
    const level = Number(user.level || 1);
    const rank = await User.countDocuments({
      experiencePoints: { $gt: experiencePoints }
    }) + 1;

    return {
      ...user.toObject(),
      stats: user.stats || {},
      cricketProfile: user.cricketProfile || {},
      achievements: user.achievements || [],
      experiencePoints,
      level,
      rank,
      nextLevelExp: userService.getNextLevelExperience(level, experiencePoints)
    };
  },

  getNextLevelExperience: (currentLevel, currentExp) => {
    const levelRequirements = {
      1: 100,
      2: 500,
      3: 1000,
      4: 5000,
      5: null
    };
    
    const required = levelRequirements[currentLevel];
    if (!required) return null;
    
    return {
      required,
      remaining: required - currentExp,
      percentage: Math.round((currentExp / required) * 100)
    };
  },

  // Device Management
  addFCMToken: async (userId, token, deviceType) => {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    user.addFCMToken(token, deviceType);
    await user.save();
    
    return { message: 'FCM token added successfully' };
  },

  removeFCMToken: async (userId, token) => {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    
    user.removeFCMToken(token);
    await user.save();
    
    return { message: 'FCM token removed successfully' };
  },

  // Account Verification
  verifyEmail: async (token) => {
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpire: { $gt: Date.now() }
    });

    if (!user) {
      throw new ApiError(400, 'Invalid or expired token');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();

    return user;
  },

  verifyPhone: async (userId, code) => {
    const user = await User.findById(userId).select('+phoneVerificationCode +phoneVerificationExpire');
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (user.phoneVerificationCode !== code || user.phoneVerificationExpire < Date.now()) {
      throw new ApiError(400, 'Invalid or expired verification code');
    }

    user.isPhoneVerified = true;
    user.phoneVerificationCode = undefined;
    user.phoneVerificationExpire = undefined;
    await user.save();

    return user;
  },

  // Leaderboard
  getLeaderboard: async (query) => {
    const { page, limit, skip } = getPagination(query);
    const filter = { isActive: true };
    
    if (query.playerType) {
      filter['cricketProfile.playerType'] = query.playerType;
    }
    
    const sortField = query.sortBy || 'experiencePoints';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('username fullName avatar level title experiencePoints stats cricketProfile')
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter)
    ]);

    // Add rank to each user
    const usersWithRank = users.map((user, index) => ({
      ...user.toObject(),
      rank: skip + index + 1
    }));

    return {
      users: usersWithRank,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  },

  // Profile Enhancement Features
  updateLocation: async (userId, locationData) => {
    const user = await User.findByIdAndUpdate(
      userId,
      {
        location: {
          city: locationData.city,
          state: locationData.state,
          country: locationData.country,
          coordinates: {
            type: 'Point',
            coordinates: [locationData.longitude, locationData.latitude]
          }
        }
      },
      { new: true }
    );

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return user;
  },

  getQRCode: async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const playerId = user.cricketProfile?.playerId || user._id;
    const profileQr = `scores11://profile/${user._id}?playerId=${playerId}&name=${encodeURIComponent(user.fullName || user.username || 'Player')}&app=scores11`;

    const qrCodeData = {
      userId: user._id,
      playerId,
      username: user.username,
      referralCode: user.referralCode,
      type: 'profile',
      app: 'scores11',
      qrData: profileQr,
      url: profileQr,
      webUrl: `https://scores11.com/profile/${user.username || user._id}`
    };

    return qrCodeData;
  },

  getProfileViews: async (userId) => {
    const user = await User.findById(userId).select('profileViews');
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return {
      totalViews: user.profileViews?.length || 0,
      views: user.profileViews || []
    };
  },

  // Saving a playing style is the app's "complete your Cricket Profile"
  // action. It merges into the existing cricketProfile (rather than
  // replacing it) and, the first time a Fan account does this, promotes
  // them to the 'player' role and creates their linked Player document -
  // players are no longer chosen at registration, they're earned by
  // filling out their cricket profile.
  updatePlayingStyle: async (userId, playingStyleData) => {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const playerType = normalizePlayingStyleToPlayerType(playingStyleData?.playingStyle);
    const existingProfile = user.cricketProfile ? user.cricketProfile.toObject() : {};
    user.cricketProfile = {
      ...existingProfile,
      ...(playerType ? { playerType } : {})
    };

    if (!user.cricketProfile.playerId) {
      user.role = 'player';
      user.isPublicPlayer = true;
      const player = await Player.create({
        user: user._id,
        playerName: user.fullName,
        phone: user.phone || undefined,
        role: playerType || 'batsman',
        battingStyle: 'right-hand bat',
        bowlingStyle: 'none',
        isActive: true
      });
      user.cricketProfile.playerId = player._id;
    }

    await user.save();
    return user;
  },

  getEquipment: async (userId) => {
    const user = await User.findById(userId).select('equipment');
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return user.equipment || [];
  },

  updateEquipment: async (userId, equipmentData) => {
    const user = await User.findByIdAndUpdate(
      userId,
      { equipment: equipmentData },
      { new: true }
    );

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return user.equipment;
  },

  updateNotificationPreferences: async (userId, preferences) => {
    const user = await User.findByIdAndUpdate(
      userId,
      { notificationPreferences: preferences },
      { new: true }
    );

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return user.notificationPreferences;
  },

  updateLanguage: async (userId, language) => {
    const user = await User.findByIdAndUpdate(
      userId,
      { preferredLanguage: language },
      { new: true }
    );

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return user;
  },

  getPurchaseHistory: async (userId, query) => {
    const { page, limit, skip } = getPagination(query);
    
    // This would need to integrate with subscription module
    // For now, return empty array as placeholder
    return {
      purchases: [],
      pagination: {
        page,
        limit,
        total: 0,
        pages: 0
      }
    };
  },

  clearUserData: async (userId) => {
    const user = await User.findByIdAndUpdate(
      userId,
      {
        loginHistory: [],
        fcmTokens: [],
        deviceTokens: [],
        notifications: [],
        activityLog: []
      },
      { new: true }
    );

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return { message: 'User data cleared successfully' };
  },

  deleteAccount: async (userId) => {
    const user = await User.findByIdAndUpdate(
      userId,
      {
        isActive: false,
        email: `deleted_${Date.now()}@deleted.com`,
        phone: null,
        isDeleted: true,
        deletedAt: new Date()
      },
      { new: true }
    );

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return { message: 'Account deleted successfully' };
  },

  resendEmailVerification: async (userId) => {
    const user = await User.findById(userId).select('+emailVerificationToken +emailVerificationExpire');
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (user.isEmailVerified) {
      throw new ApiError(400, 'Email already verified');
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    await user.save();

    try {
      await sendVerificationEmail(user.email, verificationToken);
      console.log(`Verification email sent to: ${user.email}`);
    } catch (error) {
      console.error('Verification email failed:', error.message);
      // Don't fail API if email fails
    }

    return { message: 'Verification email sent' };
  },

  getCricketStats: async (userId) => {
    const user = await User.findById(userId).select('cricketProfile stats');
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Return cricket profile stats - this would need to aggregate from matches
    return {
      cricketProfile: user.cricketProfile,
      stats: user.stats || {
        totalMatches: 0,
        totalRuns: 0,
        totalWickets: 0,
        highestScore: 0,
        bestBowling: '0/0'
      }
    };
  },

  getAchievements: async (userId) => {
    const user = await User.findById(userId).select('achievements');
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Return achievements - this would be populated from various activities
    return user.achievements || [];
  },

// Public avatar - returns Cloudinary URL or null
  getUserAvatarPublic: async (userId) => {
    const user = await User.findById(userId).select('avatar').lean();
    if (!user || !user.avatar?.url || user.avatar.url === 'default-avatar-url') {
      return null;
    }
    // Only return Cloudinary URLs (public)
    if (user.avatar.url.includes('res.cloudinary.com')) {
      return user.avatar.url;
    }
    return null;
  },

  // Get Public Players - combines User(role=player) and Player collection records
  getPublicPlayers: async (query) => {
    const { page, limit, skip, sortBy, sortOrder } = getPagination(query);
    const search = query.search?.toString().trim();
    const playerType = query.playerType?.toString().trim();
    const sortDirection = Number(sortOrder) === 1 || sortOrder === 'asc' ? 1 : -1;

    const userFilter = {
      isActive: true,
      isBlocked: { $ne: true }
    };

    const playerFilter = { isActive: true };

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      userFilter.$and = [
        ...(userFilter.$and || []),
        {
          $or: [
            { fullName: searchRegex },
            { username: searchRegex },
            { email: searchRegex },
            { phone: searchRegex }
          ]
        }
      ];
      playerFilter.$or = [
        { playerName: searchRegex },
        { phone: searchRegex },
        { teamName: searchRegex },
        { nationality: searchRegex }
      ];
    }

    if (playerType) {
      userFilter.$and = [
        ...(userFilter.$and || []),
        {
          $or: [
            { 'cricketProfile.playerType': playerType },
            ...(playerType === 'batsman'
              ? [
                  { 'cricketProfile.playerType': { $exists: false } },
                  { 'cricketProfile.playerType': null }
                ]
              : [])
          ]
        }
      ];
      playerFilter.role = playerType;
    }

    const [playerUsers, playerDocs] = await Promise.all([
      User.find(userFilter)
        .select('-password -refreshTokens -fcmTokens -loginHistory -resetPasswordToken -emailVerificationToken -phoneVerificationCode')
        .lean(),
      Player.find(playerFilter)
        .populate('user', 'fullName username email avatar isActive isBlocked role')
        .populate('team', 'name shortName')
        .lean()
    ]);

    const playerDocByUserId = new Map(
      playerDocs
        .filter(player => player.user?._id)
        .map(player => [player.user._id.toString(), player])
    );

    const normalizedUsers = playerUsers.map(user => {
      const linkedPlayer = playerDocByUserId.get(user._id.toString());
      return {
        ...user,
        role: 'player',
        isPublicPlayer: true,
        cricketProfile: {
          ...(user.cricketProfile || {}),
          playerId: linkedPlayer?._id || user.cricketProfile?.playerId,
          playerType: linkedPlayer?.role || user.cricketProfile?.playerType || 'batsman',
          battingStyle: linkedPlayer?.battingStyle || user.cricketProfile?.battingStyle,
          bowlingStyle: linkedPlayer?.bowlingStyle || user.cricketProfile?.bowlingStyle,
          matchesPlayed: linkedPlayer?.stats?.matches || user.cricketProfile?.matchesPlayed || 0,
          totalRuns: linkedPlayer?.stats?.runs || user.cricketProfile?.totalRuns || 0,
          totalWickets: linkedPlayer?.stats?.wickets || user.cricketProfile?.totalWickets || 0,
          highestScore: linkedPlayer?.stats?.highestScore || user.cricketProfile?.highestScore || 0,
          battingAverage: linkedPlayer?.stats?.average || user.cricketProfile?.battingAverage || 0
        },
        teamName: linkedPlayer?.team?.name || linkedPlayer?.team?.shortName || linkedPlayer?.teamName || user.cricketProfile?.teamName || '',
        source: 'user'
      };
    });

    const normalizedPlayers = playerDocs
      .filter(player => !player.user?._id || !playerUsers.some(user => user._id.toString() === player.user._id.toString()))
      .map(player => ({
        _id: player._id,
        fullName: player.playerName,
        username: player.user?.username || '',
        email: player.user?.email || '',
        phone: player.phone || '',
        role: 'player',
        isPublicPlayer: true,
        isActive: player.isActive !== false,
        isBlocked: false,
        avatar: player.profileImage || player.user?.avatar || undefined,
        cricketProfile: {
          playerId: player._id,
          playerType: player.role || 'batsman',
          battingStyle: player.battingStyle || '',
          bowlingStyle: player.bowlingStyle || '',
          matchesPlayed: player.stats?.matches || 0,
          totalRuns: player.stats?.runs || 0,
          totalWickets: player.stats?.wickets || 0,
          highestScore: player.stats?.highestScore || 0,
          battingAverage: player.stats?.average || 0
        },
        teamName: player.team?.name || player.team?.shortName || player.teamName || '',
        stats: {
          matchesPlayed: player.stats?.matches || 0,
          matchesWon: 0,
          matchesLost: 0
        },
        createdAt: player.createdAt,
        updatedAt: player.updatedAt,
        source: 'player'
      }));

    const combinedPlayers = [...normalizedUsers, ...normalizedPlayers].sort((a, b) => {
      const aValue = new Date(a[sortBy] || a.createdAt || 0).getTime();
      const bValue = new Date(b[sortBy] || b.createdAt || 0).getTime();
      return sortDirection === 1 ? aValue - bValue : bValue - aValue;
    });

    const total = combinedPlayers.length;
    const players = combinedPlayers.slice(skip, skip + limit);

    return {
      players,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
};

export default userService;
