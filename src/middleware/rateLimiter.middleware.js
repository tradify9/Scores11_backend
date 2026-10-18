import rateLimit from 'express-rate-limit';
import config from '../config/env.js';

const isFirebasePhoneAuthRoute = (req) => {
  const path = req.originalUrl || req.url || '';
  return [
    '/api/v1/auth/phone/firebase',
    '/api/v1/auth/firebase/phone',
    '/api/v1/auth/phone-login'
  ].some(route => path.startsWith(route));
};

const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  skip: isFirebasePhoneAuthRoute,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many requests. Please try again after a moment.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many login attempts. Please try again after a moment.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const firebasePhoneAuthLimiter = (req, res, next) => next();

// Per-IP caps for mobile OTP; per-number caps live in auth.service.
// (Each SMS costs money, so the send side is the strict one.)
export const phoneOtpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many OTP requests from this network. Please try again in a few minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const phoneOtpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many attempts. Please try again in a few minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

export default rateLimiter;
