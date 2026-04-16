import User from './user.model.js';
import { uploadImage, deleteImage } from '../../config/cloudinary.js';
import ApiError from '../../utils/ApiError.js';
import { getPagination } from '../../utils/pagination.js';
import { EXPERIENCE_POINTS } from '../../constants/userLevels.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { sendVerificationEmail } from '../../utils/sendVerificationEmail.js';

export const userService = {
  getUserByEmail: async (email) => {
    const user = await User.findOne({ email });
    return user;
  },

  createUser: async (userData) => {
  const { name, email, password, phone } = userData;

  try {

    // Validation
    if (!name || !email || !password) {
      return {
        success: false,
        message: "Name, email and password are required"
      };
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return {
        success: false,
        message: "User already exists with this email"
      };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      role: "user",
      isActive: true
    });

    // Convert mongoose document to object
    const userObj = user.toObject();

    // Remove password from response
    delete userObj.password;

    return {
      success: true,
      data: userObj
    };

  } catch (error) {
    return {
      success: false,
      message: error.message || "Failed to create user"
    };
  }


  // Convert object and remove password
  const userObj = user.toObject();
  delete userObj.password;

  return {
    success: true,
    data: userObj
  };
},

  getUserById: async (userId) => {
    const user = await User.findById(userId);
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
      await userService.handleReferral(userData.referralCode, user._id);
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
  }
};

export default userService;
