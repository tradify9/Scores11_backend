import User from './user.model.js';
import { uploadImage, deleteImage } from '../../config/cloudinary.js';
import ApiError from '../../utils/ApiError.js';
import { getPagination } from '../../utils/pagination.js';
import { EXPERIENCE_POINTS } from '../../constants/userLevels.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export const userService = {
  // Basic CRUD Operations
  getUserByEmail: async (email) => {
    return await User.findOne({ email }).select('+password +refreshTokens');
  },

  getUserByUsername: async (username) => {
    return await User.findOne({ username });
  },

  getUserByPhone: async (phone) => {
    return await User.findOne({ phone });
  },

  getUserById: async (userId, includeSensitive = false) => {
    let query = User.findById(userId);
    if (includeSensitive) {
      query = query.select('+password +refreshTokens +emailVerificationToken +phoneVerificationCode');
    }
    
    const user = await query;
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    return user;
  },

  // Registration & Authentication
  createUser: async (userData) => {
    const { email, password, username, fullName, phone } = userData;
    
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
    
    const user = await User.create({
      email,
      password: hashedPassword,
      username,
      fullName,
      phone,
      referralCode,
      role: 'user',
      isActive: true
    });
    
    // Handle referral if provided
    if (userData.referralCode) {
      await this.handleReferral(userData.referralCode, user._id);
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
    const allowedUpdates = [
      'fullName', 'phone', 'dateOfBirth', 'gender', 'bio',
      'location', 'cricketProfile', 'preferences'
    ];
    
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

    // Add experience points for completing profile
    if (user.isProfileComplete) {
      await this.addExperiencePoints(userId, EXPERIENCE_POINTS.PROFILE_COMPLETE);
    }

    return user;
  },

  // Avatar & Media Management
  uploadAvatar: async (userId, file) => {
    if (!file) {
      throw new ApiError(400, 'No file uploaded');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Delete old avatar if exists
    if (user.avatar?.publicId && !user.avatar.url.includes('default-avatar')) {
      await deleteImage(user.avatar.publicId);
    }

    const uploadResult = await uploadImage(file.path, 'crickhero/avatars', {
      width: 400,
      height: 400,
      crop: 'fill'
    });
    
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
    
    // Apply filters
    if (query.role) filter.role = query.role;
    if (query.level) filter.level = query.level;
    if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';
    if (query.playerType) filter['cricketProfile.playerType'] = query.playerType;
    
    // Search functionality
    if (query.search) {
      filter.$or = [
        { fullName: { $regex: query.search, $options: 'i' } },
        { username: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } }
      ];
    }
    
    // Location based search
    if (query.latitude && query.longitude && query.radius) {
      filter['location.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(query.longitude), parseFloat(query.latitude)]
          },
          $maxDistance: parseInt(query.radius) * 1000 // Convert to meters
        }
      };
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-refreshTokens -loginHistory -fcmTokens')
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
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

  // Admin Operations
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
    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: false },
      { new: true }
    );

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    return user;
  },

  // Statistics
  getUserStats: async (userId) => {
    const user = await User.findById(userId)
      .select('stats experiencePoints level title cricketProfile achievements');
    
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const rank = await User.countDocuments({
      experiencePoints: { $gt: user.experiencePoints }
    }) + 1;

    return {
      ...user.toObject(),
      rank,
      nextLevelExp: this.getNextLevelExperience(user.level, user.experiencePoints)
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

    // Generate QR code data - this could be a URL to the user's profile
    const qrCodeData = {
      userId: user._id,
      username: user.username,
      referralCode: user.referralCode,
      url: `https://scores11.com/profile/${user.username}`
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

  updatePlayingStyle: async (userId, playingStyleData) => {
    const user = await User.findByIdAndUpdate(
      userId,
      {
        cricketProfile: {
          ...playingStyleData
        }
      },
      { new: true, runValidators: true }
    );

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

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

    // In production, send email here
    // await sendVerificationEmail(user.email, verificationToken);

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
  }
};

export default userService;
