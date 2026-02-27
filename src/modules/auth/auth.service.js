import User from '../user/user.model.js';
import Wallet from '../wallet/wallet.model.js';
import { hashPassword, comparePassword } from '../../utils/passwordHasher.js';
import { generateTokenPair, verifyRefreshToken } from '../../utils/generateToken.js';
import ApiError from '../../utils/ApiError.js';

export const authService = {
  register: async (userData) => {
    const { email, password, name, phone, role } = userData;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ApiError(400, 'User already exists with this email');
    }

    const hashedPassword = await hashPassword(password);
    
    const user = await User.create({
      email,
      password: hashedPassword,
      name,
      phone,
      role: role || 'user'
    });

    await Wallet.create({
      user: user._id,
      balance: 0
    });

    const { accessToken, refreshToken } = generateTokenPair(user._id, user.role);

    await User.findByIdAndUpdate(user._id, { refreshToken });

    const userResponse = user.toJSON();
    
    return {
      user: userResponse,
      accessToken,
      refreshToken
    };
  },

  login: async (loginData) => {
    const { email, password } = loginData;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new ApiError(401, 'Invalid email or password');
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid email or password');
    }

    if (!user.isActive) {
      throw new ApiError(403, 'Account is deactivated');
    }

    const { accessToken, refreshToken } = generateTokenPair(user._id, user.role);

    await User.findByIdAndUpdate(user._id, { 
      refreshToken,
      lastLogin: new Date()
    });

    const userResponse = user.toJSON();
    
    return {
      user: userResponse,
      accessToken,
      refreshToken
    };
  },

  logout: async (userId) => {
    await User.findByIdAndUpdate(userId, { refreshToken: null });
  },

  refreshToken: async (token) => {
    if (!token) {
      throw new ApiError(401, 'Refresh token is required');
    }

    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.userId);

    if (!user || user.refreshToken !== token) {
      throw new ApiError(401, 'Invalid refresh token');
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(user._id, user.role);

    await User.findByIdAndUpdate(user._id, { refreshToken: newRefreshToken });

    return {
      user: user.toJSON(),
      accessToken,
      refreshToken: newRefreshToken
    };
  },

  getCurrentUser: async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }
    return user;
  },

  changePassword: async (userId, passwordData) => {
    const { currentPassword, newPassword } = passwordData;

    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const isPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new ApiError(400, 'Current password is incorrect');
    }

    const hashedPassword = await hashPassword(newPassword);
    await User.findByIdAndUpdate(userId, { password: hashedPassword });
  }
};

export default authService;
