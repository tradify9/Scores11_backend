import { authService } from './auth.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import catchAsync from '../../utils/catchAsync.js';

export const authController = {
  // Mobile OTP via APITxT: step 1 - send the code
  sendPhoneOtp: catchAsync(async (req, res) => {
    const result = await authService.sendPhoneOtp(req.body);
    const { message, ...data } = result;
    res.json(new ApiResponse(200, message, data));
  }),

  // Mobile OTP via APITxT: step 2 - verify and sign in
  verifyPhoneOtp: catchAsync(async (req, res) => {
    const { user, accessToken, refreshToken } = await authService.verifyPhoneOtp(req.body);
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    };
    res
      .status(200)
      .cookie('refreshToken', refreshToken, { ...options, maxAge: 90 * 24 * 60 * 60 * 1000 })
      .cookie('accessToken', accessToken, { ...options, maxAge: 24 * 60 * 60 * 1000 })
      .json(new ApiResponse(200, 'Mobile number verified', { user, accessToken, refreshToken }));
  }),

  firebasePhoneLogin: catchAsync(async (req, res) => {
    const { user, accessToken, refreshToken } =
      await authService.firebasePhoneLogin(req.body);
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    };
    res
      .status(200)
      .cookie('refreshToken', refreshToken, {
        ...options,
        maxAge: 90 * 24 * 60 * 60 * 1000
      })
      .cookie('accessToken', accessToken, {
        ...options,
        maxAge: 24 * 60 * 60 * 1000
      })
      .json(new ApiResponse(200, 'Firebase phone authentication successful', {
        user,
        accessToken,
        refreshToken
      }));
  }),

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
      .json(new ApiResponse(201, 'Registration successful', { user, accessToken, refreshToken }));
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
      .json(new ApiResponse(200, 'Login successful', { user, accessToken, refreshToken }));
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
    const token =
      req.cookies?.refreshToken ||
      req.body?.refreshToken ||
      req.headers['x-refresh-token'];
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
      .json(new ApiResponse(200, 'Token refreshed', { user, accessToken, refreshToken }));
  }),

  getCurrentUser: catchAsync(async (req, res) => {
    const user = await authService.getCurrentUser(req.user.userId);
    res.json(new ApiResponse(200, 'User retrieved', user));
  }),

  changePassword: catchAsync(async (req, res) => {
    await authService.changePassword(req.user.userId, req.body);
    res.json(new ApiResponse(200, 'Password changed successfully'));
  }),

  // Send/resend an email OTP for OTP-only login or registration
  sendEmailOtp: catchAsync(async (req, res) => {
    const result = await authService.requestEmailOtp(req.body);
    res.json(new ApiResponse(200, result.message, { isNewUser: result.isNewUser }));
  }),

  // Verify an email OTP and log the user in
  verifyEmailOtp: catchAsync(async (req, res) => {
    const { user, accessToken, refreshToken } = await authService.verifyEmailOtp(req.body);
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    };
    res
      .status(200)
      .cookie('refreshToken', refreshToken, { ...options, maxAge: 90 * 24 * 60 * 60 * 1000 })
      .cookie('accessToken', accessToken, { ...options, maxAge: 24 * 60 * 60 * 1000 })
      .json(new ApiResponse(200, 'Email verified', { user, accessToken, refreshToken }));
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
