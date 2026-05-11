import User from '../user/user.model.js';
import Wallet from '../wallet/wallet.model.js';
import { hashPassword, comparePassword } from '../../utils/passwordHasher.js';
import { generateTokenPair, verifyRefreshToken } from '../../utils/generateToken.js';
import { sendOTP, sendRegistrationSuccessSMS } from '../../utils/smsSender.js';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../../utils/emailSender.js';
import ApiError from '../../utils/ApiError.js';

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // Ensure it's always 6 digits
};

// OTP expiry time (10 minutes)
const OTP_EXPIRY = 10 * 60 * 1000;

export const authService = {
  // Register new user
  register: async (userData) => {
    const { email, password, name, phone, role } = userData;

    try {
      // Validate required fields
      if (!email || !password || !name) {
        throw new ApiError(400, 'Email, password, and name are required');
      }

      // Check if user exists with email or phone
      const existingUser = await User.findOne({
        $or: [
          { email: email?.toLowerCase() },
          phone ? { phone } : null
        ].filter(Boolean)
      });
      
      if (existingUser) {
        if (existingUser.email === email?.toLowerCase()) {
          throw new ApiError(400, 'User already exists with this email');
        }
        if (existingUser.phone === phone && phone) {
          throw new ApiError(400, 'User already exists with this phone number');
        }
      }

      const hashedPassword = await hashPassword(password);
      
      // Generate username from name - ensure uniqueness
      let username = name.toLowerCase().replace(/\s+/g, '_').substring(0, 20);
      let counter = 1;
      let finalUsername = username;
      
      while (await User.findOne({ username: finalUsername })) {
        finalUsername = `${username}_${counter}`;
        counter++;
      }
      
      // Create user
      const user = await User.create({
        email: email?.toLowerCase(),
        password: hashedPassword,
        fullName: name,
        username: finalUsername,
        phone: phone || null,
        role: role || 'user'
      });

      // Create wallet - wrap in try-catch to not fail registration
      try {
        await Wallet.create({
          user: user._id,
          balance: 0
        });
      } catch (walletError) {
        console.error('Wallet creation failed (non-fatal):', walletError.message);
        // Continue with registration even if wallet creation fails
      }

      // Generate tokens
      let accessToken, refreshToken;
      try {
        const tokenPair = generateTokenPair(user._id, user.role);
        accessToken = tokenPair.accessToken;
        refreshToken = tokenPair.refreshToken;

        // Save refresh token to user
        await User.findByIdAndUpdate(user._id, { refreshToken });
      } catch (tokenError) {
        console.error('Token generation error:', tokenError.message);
        throw new ApiError(500, 'Failed to generate authentication tokens');
      }

      // Send welcome notifications asynchronously (don't block registration)
      if (phone) {
        try {
          await sendRegistrationSuccessSMS(phone, name);
        } catch (smsError) {
          console.error('Welcome SMS failed (non-fatal):', smsError.message);
        }
      }

      if (email) {
        try {
          await sendWelcomeEmail(email, name);
          console.log(`Welcome email sent to: ${email}`);
        } catch (emailError) {
          console.error('Welcome email failed (non-fatal):', emailError.message);
        }
      }

      const userResponse = user.toJSON();
      
      // Add 'name' field to response for Flutter compatibility
      userResponse.name = user.fullName;
      
      return {
        user: userResponse,
        accessToken,
        refreshToken
      };
    } catch (error) {
      console.error('Registration error:', error);
      if (error.name === 'MongoServerError' && error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        throw new ApiError(400, `${field} already exists`);
      }
      throw error;
    }
  },

  // Login with email or phone
  login: async (loginData) => {
    // Accept both 'identifier' and 'email' fields for flexibility
    const { identifier, email, password } = loginData;
    
    // Use identifier if provided, otherwise use email
    const loginValue = identifier || email;

    if (!loginValue) {
      throw new ApiError(400, 'Email or identifier is required');
    }

    // Find user by email or phone
    const user = await User.findOne({
      $or: [
        { email: loginValue?.toLowerCase() },
        { phone: loginValue }
      ]
    }).select('+password');

    if (!user) {
      throw new ApiError(401, 'Invalid credentials');
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid credentials');
    }

    if (!user.isActive) {
      throw new ApiError(403, 'Your account has been blocked. Please contact support.');
    }

    const { accessToken, refreshToken } = generateTokenPair(user._id, user.role);

    await User.findByIdAndUpdate(user._id, { 
      refreshToken,
      lastLogin: new Date()
    });

    const userResponse = user.toJSON();
    
    // Add 'name' field to response for Flutter compatibility
    userResponse.name = user.fullName;
    
    return {
      user: userResponse,
      accessToken,
      refreshToken
    };
  },

  // Send OTP for phone verification
  sendOTP: async (identifier) => {
    const user = await User.findOne({
      $or: [
        { email: identifier?.toLowerCase() },
        { phone: identifier }
      ]
    });

    if (!user) {
      throw new ApiError(404, 'User not found with this identifier');
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + OTP_EXPIRY);

    await User.findByIdAndUpdate(user._id, {
      phoneVerificationCode: otp,
      phoneVerificationExpire: otpExpiry
    });

    // Send OTP via SMS
    if (user.phone) {
      try {
        await sendOTP(user.phone, otp);
      } catch (smsError) {
        // Don't fail the flow if SMS fails - log for development
        console.error('OTP SMS failed:', smsError.message);
      }
    }

    // In production, send OTP via SMS
    // For development, log the OTP
    console.log(`OTP for ${identifier}: ${otp}`);

    return {
      message: 'OTP sent successfully',
      // Remove this in production
      otp: otp
    };
  },

  // Verify OTP
  verifyOTP: async (identifier, otp) => {
    const user = await User.findOne({
      $or: [
        { email: identifier?.toLowerCase() },
        { phone: identifier }
      ]
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (!user.phoneVerificationCode || user.phoneVerificationCode !== otp) {
      throw new ApiError(400, 'Invalid OTP');
    }

    if (user.phoneVerificationExpire && new Date() > user.phoneVerificationExpire) {
      throw new ApiError(400, 'OTP has expired');
    }

    // Mark phone as verified
    await User.findByIdAndUpdate(user._id, {
      isPhoneVerified: true,
      phoneVerificationCode: null,
      phoneVerificationExpire: null
    });

    return {
      message: 'Phone verified successfully'
    };
  },

  // Forgot password - send OTP via email
  forgotPassword: async (identifier) => {
    const user = await User.findOne({
      $or: [
        { email: identifier?.toLowerCase() },
        { phone: identifier }
      ]
    });

    if (!user) {
      // Don't reveal if user exists
      return { message: 'If the account exists, an OTP will be sent to your email' };
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + OTP_EXPIRY);

    await User.findByIdAndUpdate(user._id, {
      phoneVerificationCode: otp,
      phoneVerificationExpire: otpExpiry
    });

    // Send OTP via email for password reset
    if (user.email) {
      try {
        await sendPasswordResetEmail(user.email, otp);
        console.log(`Password reset email sent to: ${user.email}`);
      } catch (emailError) {
        console.error('Password reset email failed:', emailError.message);
      }
    }

    // Also try SMS if phone exists
    if (user.phone) {
      try {
        await sendOTP(user.phone, otp);
      } catch (smsError) {
        console.error('Password reset OTP SMS failed:', smsError.message);
      }
    }

    // Log OTP for development
    console.log(`Reset OTP for ${identifier}: ${otp}`);

    return {
      message: 'If the account exists, an OTP will be sent to your email',
      // Remove this in production
      otp: otp
    };
  },

  // Reset password with OTP
  resetPassword: async (identifier, otp, newPassword) => {
    const user = await User.findOne({
      $or: [
        { email: identifier?.toLowerCase() },
        { phone: identifier }
      ]
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (!user.phoneVerificationCode || user.phoneVerificationCode !== otp) {
      throw new ApiError(400, 'Invalid OTP');
    }

    if (user.phoneVerificationExpire && new Date() > user.phoneVerificationExpire) {
      throw new ApiError(400, 'OTP has expired');
    }

    const hashedPassword = await hashPassword(newPassword);

    await User.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      phoneVerificationCode: null,
      phoneVerificationExpire: null
    });

    return { message: 'Password reset successfully' };
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
