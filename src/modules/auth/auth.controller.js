import { authService } from './auth.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';

export const authController = {
  register: catchAsync(async (req, res) => {
    const { user, accessToken, refreshToken } = await authService.register(req.body);
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    };
    
    res
      .status(201)
      .cookie('refreshToken', refreshToken, { ...options, maxAge: 90 * 24 * 60 * 60 * 1000 })
      .cookie('accessToken', accessToken, { ...options, maxAge: 24 * 60 * 60 * 1000 })
      .json(new ApiResponse(201, 'Registration successful', { user, accessToken }));
  }),

  login: catchAsync(async (req, res) => {
    const { user, accessToken, refreshToken } = await authService.login(req.body);
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    };
    
    res
      .status(200)
      .cookie('refreshToken', refreshToken, { ...options, maxAge: 90 * 24 * 60 * 60 * 1000 })
      .cookie('accessToken', accessToken, { ...options, maxAge: 24 * 60 * 60 * 1000 })
      .json(new ApiResponse(200, 'Login successful', { user, accessToken }));
  }),

  logout: catchAsync(async (req, res) => {
    await authService.logout(req.user.userId);
    res
      .status(200)
      .clearCookie('refreshToken')
      .clearCookie('accessToken')
      .json(new ApiResponse(200, 'Logout successful'));
  }),

  refreshToken: catchAsync(async (req, res) => {
    const { refreshToken: token } = req.cookies;
    const { user, accessToken, refreshToken } = await authService.refreshToken(token);
    
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    };
    
    res
      .status(200)
      .cookie('refreshToken', refreshToken, { ...options, maxAge: 90 * 24 * 60 * 60 * 1000 })
      .cookie('accessToken', accessToken, { ...options, maxAge: 24 * 60 * 60 * 1000 })
      .json(new ApiResponse(200, 'Token refreshed', { user, accessToken }));
  }),

  getCurrentUser: catchAsync(async (req, res) => {
    const user = await authService.getCurrentUser(req.user.userId);
    res.json(new ApiResponse(200, 'User retrieved', user));
  }),

  changePassword: catchAsync(async (req, res) => {
    await authService.changePassword(req.user.userId, req.body);
    res.json(new ApiResponse(200, 'Password changed successfully'));
  }),

  // Send OTP to phone/email
  sendOTP: catchAsync(async (req, res) => {
    const { identifier } = req.body;
    const result = await authService.sendOTP(identifier);
    res.json(new ApiResponse(200, result.message, { otp: result.otp }));
  }),

  // Verify OTP
  verifyOTP: catchAsync(async (req, res) => {
    const { identifier, otp } = req.body;
    const result = await authService.verifyOTP(identifier, otp);
    res.json(new ApiResponse(200, result.message));
  }),

  // Forgot password - send OTP
  forgotPassword: catchAsync(async (req, res) => {
    const { identifier } = req.body;
    const result = await authService.forgotPassword(identifier);
    res.json(new ApiResponse(200, result.message, { otp: result.otp }));
  }),

  // Reset password with OTP
  resetPassword: catchAsync(async (req, res) => {
    const { identifier, otp, newPassword } = req.body;
    const result = await authService.resetPassword(identifier, otp, newPassword);
    res.json(new ApiResponse(200, result.message));
  })
};

export default authController;
