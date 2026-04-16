import { userService } from './user.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';
import ApiError from '../../utils/ApiError.js';

const userController = {

  /* ---------- AUTH ---------- */

  register: catchAsync(async (req, res) => {
    const user = await userService.createUser(req.body);
    res.status(201).json(new ApiResponse(201, "User registered", user));
  }),

  verifyEmail: catchAsync(async (req, res) => {
    res.json(new ApiResponse(200, "Email verified"));
  }),

  resendEmailVerification: catchAsync(async (req, res) => {
    res.json(new ApiResponse(200, "Verification email sent"));
  }),

  /* ---------- PROFILE ---------- */

  getProfile: catchAsync(async (req, res) => {
    const user = await userService.getUserById(req.user.userId);
    res.json(new ApiResponse(200, "Profile fetched", user));
  }),

  getProfileByUsername: catchAsync(async (req, res) => {
    const user = await userService.getUserByUsername(req.params.username);
    res.json(new ApiResponse(200, "Profile fetched", user));
  }),

  updateProfile: catchAsync(async (req, res) => {
    const user = await userService.updateProfile(req.user.userId, req.body);
    res.json(new ApiResponse(200, "Profile updated", user));
  }),

  uploadAvatar: catchAsync(async (req, res) => {
    res.json(new ApiResponse(200, "Avatar uploaded"));
  }),

  uploadCoverPhoto: catchAsync(async (req, res) => {
    res.json(new ApiResponse(200, "Cover photo uploaded"));
  }),

  verifyPhone: catchAsync(async (req, res) => {
    res.json(new ApiResponse(200, "Phone verified"));
  }),

  updateLocation: catchAsync(async (req, res) => {
    res.json(new ApiResponse(200, "Location updated"));
  }),

  getQRCode: catchAsync(async (req, res) => {
    res.json(new ApiResponse(200, "QR code generated"));
  }),

  getProfileViews: catchAsync(async (req, res) => {
    res.json(new ApiResponse(200, "Profile views"));
  }),

  /* ---------- FOLLOW ---------- */

  followUser: catchAsync(async (req, res) => {
    res.json(new ApiResponse(200, "User followed"));
  }),

  unfollowUser: catchAsync(async (req, res) => {
    res.json(new ApiResponse(200, "User unfollowed"));
  }),

  getFollowers: catchAsync(async (req, res) => {
    res.json(new ApiResponse(200, "Followers list"));
  }),

  getFollowing: catchAsync(async (req, res) => {
    res.json(new ApiResponse(200, "Following list"));
  }),

  /* ---------- USER DATA ---------- */

  getUserStats: catchAsync(async (req, res) => {
    res.json(new ApiResponse(200, "User stats"));
  }),

  getCricketStats: catchAsync(async (req, res) => {
    res.json(new ApiResponse(200, "Cricket stats"));
  }),

  getAchievements: catchAsync(async (req, res) => {
    res.json(new ApiResponse(200, "Achievements"));
  }),

  getEquipment: catchAsync(async (req, res) => {
    res.json(new ApiResponse(200, "Equipment"));
  }),

  updateEquipment: catchAsync(async (req, res) => {
    res.json(new ApiResponse(200, "Equipment updated"));
  }),

  updatePlayingStyle: catchAsync(async (req, res) => {
    res.json(new ApiResponse(200, "Playing style updated"));
  }),

  updateNotificationPreferences: catchAsync(async (req, res) => {
    res.json(new ApiResponse(200, "Notification preferences updated"));
  }),

  updateLanguage: catchAsync(async (req, res) => {
    res.json(new ApiResponse(200, "Language updated"));
  }),

  getPurchaseHistory: catchAsync(async (req, res) => {
    res.json(new ApiResponse(200, "Purchase history"));
  }),

  clearUserData: catchAsync(async (req, res) => {
    res.json(new ApiResponse(200, "User data cleared"));
  }),

  deleteAccount: catchAsync(async (req, res) => {
    res.json(new ApiResponse(200, "Account deleted"));
  }),

  /* ---------- DEVICE ---------- */

  addFCMToken: catchAsync(async (req, res) => {
    res.json(new ApiResponse(200, "FCM token added"));
  }),

  removeFCMToken: catchAsync(async (req, res) => {
    res.json(new ApiResponse(200, "FCM token removed"));
  }),

  /* ---------- LEADERBOARD ---------- */

  getLeaderboard: catchAsync(async (req, res) => {
    res.json(new ApiResponse(200, "Leaderboard"));
  }),

  /* ---------- ADMIN ---------- */

  getAllUsers: catchAsync(async (req, res) => {
    const users = await userService.getAllUsers(req.query);
    res.json(new ApiResponse(200, "Users list", users));
  }),

  getUserById: catchAsync(async (req, res) => {
    const user = await userService.getUserById(req.params.id);
    res.json(new ApiResponse(200, "User fetched", user));
  }),

  updateUser: catchAsync(async (req, res) => {
    res.json(new ApiResponse(200, "User updated"));
  }),

  deleteUser: catchAsync(async (req, res) => {
    res.json(new ApiResponse(200, "User deleted"));
  }),

  getUserReports: catchAsync(async (req, res) => {
    res.json(new ApiResponse(200, "User reports"));
  }),

  actionOnReport: catchAsync(async (req, res) => {
    res.json(new ApiResponse(200, "Report action completed"));
  }),

  getLoginHistory: catchAsync(async (req, res) => {
    res.json(new ApiResponse(200, "Login history"));
  }),

  banUser: catchAsync(async (req, res) => {
    res.json(new ApiResponse(200, "User banned"));
  }),

  unbanUser: catchAsync(async (req, res) => {
    res.json(new ApiResponse(200, "User unbanned"));
  }),

  adminResetPassword: catchAsync(async (req, res) => {
    res.json(new ApiResponse(200, "Password reset"));
  }),

  verifyUserAccount: catchAsync(async (req, res) => {
    res.json(new ApiResponse(200, "User verified"));
  }),

<<<<<<< HEAD
  changeUserRole: catchAsync(async (req, res) => {
    res.json(new ApiResponse(200, "Role updated"));
=======
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
>>>>>>> f92d10cd7fdb1170e84082534229e18b6b3a7575
  })

};

export default userController;