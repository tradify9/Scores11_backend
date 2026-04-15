import { userService } from './user.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';
import ApiError from '../../utils/ApiError.js';

export const userController = {
  // Registration
  register: catchAsync(async (req, res) => {
    const user = await userService.createUser(req.body);
    
    res.status(201).json(new ApiResponse(201, 'User registered successfully', {
      user,
      message: 'Please verify your email and phone to complete registration'
    }));
  }),

  // Profile
  getProfile: catchAsync(async (req, res) => {
    const user = await userService.getUserById(req.user.userId);
    res.json(new ApiResponse(200, 'User profile retrieved', user));
  }),

  updateProfile: catchAsync(async (req, res) => {
    const user = await userService.updateProfile(req.user.userId, req.body);
    res.json(new ApiResponse(200, 'Profile updated successfully', user));
  }),

  getProfileByUsername: catchAsync(async (req, res) => {
    const user = await userService.getUserByUsername(req.params.username);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    res.json(new ApiResponse(200, 'User profile retrieved', user));
  }),

  // Media Upload
  uploadAvatar: catchAsync(async (req, res) => {
    const user = await userService.uploadAvatar(req.user.userId, req.file);
    res.json(new ApiResponse(200, 'Avatar uploaded successfully', user));
  }),

  uploadCoverPhoto: catchAsync(async (req, res) => {
    const user = await userService.uploadCoverPhoto(req.user.userId, req.file);
    res.json(new ApiResponse(200, 'Cover photo uploaded successfully', user));
  }),

  // Social Features
  followUser: catchAsync(async (req, res) => {
    const result = await userService.followUser(req.user.userId, req.params.userId);
    res.json(new ApiResponse(200, 'User followed successfully', result));
  }),

  unfollowUser: catchAsync(async (req, res) => {
    const result = await userService.unfollowUser(req.user.userId, req.params.userId);
    res.json(new ApiResponse(200, 'User unfollowed successfully', result));
  }),

  getFollowers: catchAsync(async (req, res) => {
    const { followers, pagination } = await userService.getFollowers(
      req.params.userId || req.user.userId,
      req.query
    );
    res.json(new ApiResponse(200, 'Followers retrieved', followers, pagination));
  }),

  getFollowing: catchAsync(async (req, res) => {
    const { following, pagination } = await userService.getFollowing(
      req.params.userId || req.user.userId,
      req.query
    );
    res.json(new ApiResponse(200, 'Following retrieved', following, pagination));
  }),

  // Search & List
  getAllUsers: catchAsync(async (req, res) => {
    const { users, pagination } = await userService.getAllUsers(req.query);
    res.json(new ApiResponse(200, 'Users retrieved', users, pagination));
  }),

  getUserById: catchAsync(async (req, res) => {
    const user = await userService.getUserById(req.params.id);
    res.json(new ApiResponse(200, 'User retrieved', user));
  }),

  // Statistics
  getUserStats: catchAsync(async (req, res) => {
    const stats = await userService.getUserStats(req.params.id || req.user.userId);
    res.json(new ApiResponse(200, 'User statistics retrieved', stats));
  }),

  getLeaderboard: catchAsync(async (req, res) => {
    const { users, pagination } = await userService.getLeaderboard(req.query);
    res.json(new ApiResponse(200, 'Leaderboard retrieved', users, pagination));
  }),

  // Device Management
  addFCMToken: catchAsync(async (req, res) => {
    const { token, deviceType } = req.body;
    const result = await userService.addFCMToken(req.user.userId, token, deviceType);
    res.json(new ApiResponse(200, 'FCM token added', result));
  }),

  removeFCMToken: catchAsync(async (req, res) => {
    const { token } = req.body;
    const result = await userService.removeFCMToken(req.user.userId, token);
    res.json(new ApiResponse(200, 'FCM token removed', result));
  }),

  // Verification
  verifyEmail: catchAsync(async (req, res) => {
    const user = await userService.verifyEmail(req.params.token);
    res.json(new ApiResponse(200, 'Email verified successfully', user));
  }),

  verifyPhone: catchAsync(async (req, res) => {
    const user = await userService.verifyPhone(req.user.userId, req.body.code);
    res.json(new ApiResponse(200, 'Phone verified successfully', user));
  }),

  // Admin Operations
  updateUser: catchAsync(async (req, res) => {
    const user = await userService.updateUser(req.params.id, req.body);
    res.json(new ApiResponse(200, 'User updated successfully', user));
  }),

  deleteUser: catchAsync(async (req, res) => {
    await userService.deleteUser(req.params.id);
    res.json(new ApiResponse(200, 'User deleted successfully'));
  }),

  // Admin - Ban User
  banUser: catchAsync(async (req, res) => {
    const { reason } = req.body;
    const user = await userService.banUser(req.params.id, reason);
    res.json(new ApiResponse(200, 'User banned successfully', user));
  }),

  // Admin - Unban User
  unbanUser: catchAsync(async (req, res) => {
    const user = await userService.unbanUser(req.params.id);
    res.json(new ApiResponse(200, 'User unbanned successfully', user));
  }),

  // Admin - Reset Password
  adminResetPassword: catchAsync(async (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword) {
      throw new ApiError(400, 'New password is required');
    }
    await userService.adminResetPassword(req.params.id, newPassword);
    res.json(new ApiResponse(200, 'Password reset successfully'));
  }),

  // Admin - Verify User Account
  verifyUserAccount: catchAsync(async (req, res) => {
    const user = await userService.verifyUserAccount(req.params.id);
    res.json(new ApiResponse(200, 'User account verified successfully', user));
  }),

  // Admin - Change User Role
  changeUserRole: catchAsync(async (req, res) => {
    const { role } = req.body;
    if (!role) {
      throw new ApiError(400, 'Role is required');
    }
    const user = await userService.changeUserRole(req.params.id, role);
    res.json(new ApiResponse(200, 'User role changed successfully', user));
  }),

  // Admin - Get Login History
  getLoginHistory: catchAsync(async (req, res) => {
    const { history, pagination } = await userService.getLoginHistory(req.params.id, req.query);
    res.json(new ApiResponse(200, 'Login history retrieved', history, pagination));
  }),

  // Admin - Get User Reports
  getUserReports: catchAsync(async (req, res) => {
    const { reports, pagination } = await userService.getUserReports(req.query);
    res.json(new ApiResponse(200, 'User reports retrieved', reports, pagination));
  }),

  // Admin - Action on Report
  actionOnReport: catchAsync(async (req, res) => {
    const { action, adminNote } = req.body;
    if (!action) {
      throw new ApiError(400, 'Action is required');
    }
    const report = await userService.actionOnReport(req.params.reportId, action, adminNote);
    res.json(new ApiResponse(200, 'Report action completed', report));
  }),

  // Profile Enhancement Features
  updateLocation: catchAsync(async (req, res) => {
    const user = await userService.updateLocation(req.user.userId, req.body);
    res.json(new ApiResponse(200, 'Location updated successfully', user));
  }),

  getQRCode: catchAsync(async (req, res) => {
    const qrCode = await userService.getQRCode(req.user.userId);
    res.json(new ApiResponse(200, 'QR Code retrieved', qrCode));
  }),

  getProfileViews: catchAsync(async (req, res) => {
    const views = await userService.getProfileViews(req.user.userId);
    res.json(new ApiResponse(200, 'Profile views retrieved', views));
  }),

  updatePlayingStyle: catchAsync(async (req, res) => {
    const user = await userService.updatePlayingStyle(req.user.userId, req.body);
    res.json(new ApiResponse(200, 'Playing style updated successfully', user));
  }),

  getEquipment: catchAsync(async (req, res) => {
    const equipment = await userService.getEquipment(req.user.userId);
    res.json(new ApiResponse(200, 'Equipment retrieved', equipment));
  }),

  updateEquipment: catchAsync(async (req, res) => {
    const equipment = await userService.updateEquipment(req.user.userId, req.body);
    res.json(new ApiResponse(200, 'Equipment updated successfully', equipment));
  }),

  updateNotificationPreferences: catchAsync(async (req, res) => {
    const user = await userService.updateNotificationPreferences(req.user.userId, req.body);
    res.json(new ApiResponse(200, 'Notification preferences updated', user));
  }),

  updateLanguage: catchAsync(async (req, res) => {
    const user = await userService.updateLanguage(req.user.userId, req.body.language);
    res.json(new ApiResponse(200, 'Language updated successfully', user));
  }),

  getPurchaseHistory: catchAsync(async (req, res) => {
    const purchases = await userService.getPurchaseHistory(req.user.userId, req.query);
    res.json(new ApiResponse(200, 'Purchase history retrieved', purchases));
  }),

  clearUserData: catchAsync(async (req, res) => {
    await userService.clearUserData(req.user.userId);
    res.json(new ApiResponse(200, 'User data cleared successfully'));
  }),

  deleteAccount: catchAsync(async (req, res) => {
    await userService.deleteAccount(req.user.userId);
    res.json(new ApiResponse(200, 'Account deleted successfully'));
  }),

  resendEmailVerification: catchAsync(async (req, res) => {
    await userService.resendEmailVerification(req.user.userId);
    res.json(new ApiResponse(200, 'Verification email sent'));
  }),

  getCricketStats: catchAsync(async (req, res) => {
    const stats = await userService.getCricketStats(req.user.userId);
    res.json(new ApiResponse(200, 'Cricket stats retrieved', stats));
  }),

  getAchievements: catchAsync(async (req, res) => {
    const achievements = await userService.getAchievements(req.user.userId);
    res.json(new ApiResponse(200, 'Achievements retrieved', achievements));
  }),

  // Public avatar endpoint - no auth required for img tags
  getUserAvatarPublic: catchAsync(async (req, res) => {
    const userId = req.params.id;
    const avatar = await userService.getUserAvatarPublic(userId);
    if (avatar) {
      res.redirect(301, avatar);
    } else {
      // Return default avatar
      res.redirect('https://via.placeholder.com/400x400/6B7280/FFFFFF?text=👤');
    }
  })
};

export default userController;
