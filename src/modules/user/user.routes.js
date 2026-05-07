import express from 'express';
import userController from './user.controller.js';   // FIXED
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorize } from '../../middleware/role.middleware.js';
import { upload } from '../../middleware/upload.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { ROLES } from '../../constants/roles.js';
import {
  updateProfileSchema,
  registerSchema,
  followSchema
} from './user.validation.js';

const router = express.Router();

/* ---------- PUBLIC ROUTES ---------- */

router.post('/register', validate(registerSchema), userController.register);
router.get('/verify-email/:token', userController.verifyEmail);
router.get('/profile/:username', userController.getProfileByUsername);
router.get('/users/:id/avatar', userController.getUserAvatarPublic);
router.get('/list', userController.getAllUsers);
router.get('/leaderboard', userController.getLeaderboard);

/* ---------- PUBLIC PLAYERS API ---------- */
// Get public players - for captains to search and add players to teams
router.get('/players/public', userController.getPublicPlayers);

/* ---------- AUTHENTICATED ROUTES ---------- */

router.use(authenticate);

router.get('/me', userController.getProfile);
router.put('/me', validate(updateProfileSchema), userController.updateProfile);
router.get('/me/stats', userController.getUserStats);
router.get('/stats', userController.getUserStats);

/* ---------- MEDIA ---------- */

router.post('/avatar', upload.single('avatar'), userController.uploadAvatar);
router.post('/cover', upload.single('cover'), userController.uploadCoverPhoto);

/* ---------- FOLLOW SYSTEM ---------- */

router.post('/follow/:userId', validate(followSchema,'params'), userController.followUser);
router.delete('/follow/:userId', validate(followSchema,'params'), userController.unfollowUser);

router.get('/followers', userController.getFollowers);
router.get('/following', userController.getFollowing);

router.get('/followers/:userId', userController.getFollowers);
router.get('/following/:userId', userController.getFollowing);

/* ---------- DEVICE ---------- */

router.post('/fcm-token', userController.addFCMToken);
router.delete('/fcm-token', userController.removeFCMToken);

/* ---------- PROFILE FEATURES ---------- */

router.post('/verify-phone', userController.verifyPhone);
router.put('/location', userController.updateLocation);
router.get('/qr-code', userController.getQRCode);
router.get('/profile-views', userController.getProfileViews);

router.put('/playing-style', userController.updatePlayingStyle);
router.get('/equipment', userController.getEquipment);
router.put('/equipment', userController.updateEquipment);

router.put('/notifications/preferences', userController.updateNotificationPreferences);
router.put('/language', userController.updateLanguage);

router.get('/purchases', userController.getPurchaseHistory);

router.delete('/clear-data', userController.clearUserData);
router.delete('/account', userController.deleteAccount);

router.post('/verify-email', userController.resendEmailVerification);

router.get('/cricket-stats', userController.getCricketStats);
router.get('/achievements', userController.getAchievements);

/* ---------- ADMIN ---------- */

router.get('/reports', authorize(ROLES.ADMIN), userController.getUserReports);
router.post('/reports/:reportId/action', authorize(ROLES.ADMIN), userController.actionOnReport);

router.get('/', authorize(ROLES.ADMIN), userController.getAllUsers);

router.get('/:id/login-history', authorize(ROLES.ADMIN), userController.getLoginHistory);
router.post('/:id/ban', authorize(ROLES.ADMIN), userController.banUser);
router.post('/:id/unban', authorize(ROLES.ADMIN), userController.unbanUser);
router.post('/:id/reset-password', authorize(ROLES.ADMIN), userController.adminResetPassword);
router.post('/:id/verify', authorize(ROLES.ADMIN), userController.verifyUserAccount);
router.post('/:id/change-role', authorize(ROLES.ADMIN), userController.changeUserRole);

router.get('/:id', authorize(ROLES.ADMIN), userController.getUserById);
router.put('/:id', authorize(ROLES.ADMIN), userController.updateUser);
router.delete('/:id', authorize(ROLES.ADMIN), userController.deleteUser);

export default router;