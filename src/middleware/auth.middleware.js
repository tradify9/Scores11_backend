import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import User from '../modules/user/user.model.js';
import ApiError from '../utils/ApiError.js';

// Named export for auth (used in routes)
export const auth = async (req, res, next) => {
  console.log(`[${new Date().toISOString()}] [AUTH] ${req.method} ${req.originalUrl}`);
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);

    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      throw new ApiError(401, 'User not found');
    }

    if (!user.isActive) {
      throw new ApiError(401, 'User account is deactivated');
    }

    req.user = decoded;
    req.user.userId = decoded.userId;
    console.log(`[${new Date().toISOString()}] [AUTH] SUCCESS userId: ${decoded.userId}`);
    next();
  } catch (error) {
    console.log(`[${new Date().toISOString()}] [AUTH] ERROR: ${error.message}`);

    if (error.name === 'JsonWebTokenError') {
      next(new ApiError(401, 'Invalid token'));
    } else if (error.name === 'TokenExpiredError') {
      next(new ApiError(401, 'Token expired'));
    } else {
      next(error);
    }
  }
};

// Also keep authenticate for backward compatibility
export const authenticate = auth;

export default auth;
