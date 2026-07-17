import express from 'express';
import { authController } from './auth.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import {
  authLimiter,
  firebasePhoneAuthLimiter
} from '../../middleware/rateLimiter.middleware.js';

const router = express.Router();

// Public routes
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/phone/firebase', firebasePhoneAuthLimiter, authController.firebasePhoneLogin);
router.post('/firebase/phone', firebasePhoneAuthLimiter, authController.firebasePhoneLogin);
router.post('/phone-login', firebasePhoneAuthLimiter, authController.firebasePhoneLogin);
router.post('/email/send-otp', authLimiter, authController.sendEmailOtp);
router.post('/email/verify-otp', authLimiter, authController.verifyEmailOtp);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.post('/refresh-token', authController.refreshToken);
router.get('/me', authenticate, authController.getCurrentUser);
router.post('/change-password', authenticate, authController.changePassword);

export default router;
