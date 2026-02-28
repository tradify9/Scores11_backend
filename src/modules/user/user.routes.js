import express from 'express';
import { userController } from './user.controller.js';
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

// Public routes
router.post('/register', validate(registerSchema), userController.register);
router.get('/verify-email/:token', userController.verifyEmail);
router.get('/profile/:username', userController.getProfileByUsername);
router.get('/list', userController.getAllUsers);
router.get('/leaderboard', userController.getLeaderboard);

// Protected routes (require authentication)
router.use(authenticate);

// Profile management
router.get('/me', userController.getProfile);
router.put('/me', validate(updateProfileSchema), userController.updateProfile);
router.get('/me/stats', userController.getUserStats);

// Media upload
router.post('/avatar', upload.single('avatar'), userController.uploadAvatar);
router.post('/cover', upload.single('cover'), userController.uploadCoverPhoto);

// Social features
router.post('/follow/:userId', validate(followSchema, 'params'), userController.followUser);
router.delete('/follow/:userId', validate(followSchema, 'params'), userController.unfollowUser);
router.get('/followers', userController.getFollowers);
router.get('/following', userController.getFollowing);
router.get('/followers/:userId', userController.getFollowers);
router.get('/following/:userId', userController.getFollowing);

// Device management
router.post('/fcm-token', userController.addFCMToken);
router.delete('/fcm-token', userController.removeFCMToken);

// Verification
router.post('/verify-phone', userController.verifyPhone);

// Profile enhancement features
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

// Admin routes
router.get('/', authorize(ROLES.ADMIN), userController.getAllUsers);
router.get('/:id', authorize(ROLES.ADMIN), userController.getUserById);
router.put('/:id', authorize(ROLES.ADMIN), userController.updateUser);
router.delete('/:id', authorize(ROLES.ADMIN), userController.deleteUser);

export default router;