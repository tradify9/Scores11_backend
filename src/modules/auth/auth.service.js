import User from '../user/user.model.js';
import Wallet from '../wallet/wallet.model.js';
import { hashPassword, comparePassword } from '../../utils/passwordHasher.js';
import { generateTokenPair, verifyRefreshToken } from '../../utils/generateToken.js';
import { sendWelcomeEmail, sendPasswordResetEmail, sendLoginOtpEmail } from '../../utils/emailSender.js';
import ApiError from '../../utils/ApiError.js';
import crypto from 'crypto';
import { verifyFirebaseIdToken } from '../../config/firebase.js';

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // Ensure it's always 6 digits
};

// OTP expiry time (10 minutes)
const OTP_EXPIRY = 10 * 60 * 1000;

const normalizePhone = (value = '') => {
  let digits = value.toString().replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length < 10 || digits.length > 15) {
    throw new ApiError(400, 'Enter a valid mobile number');
  }
  return digits;
};

const buildUniqueUsername = async (name, phone) => {
  const base = (name || `player_${phone.slice(-4)}`)
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20) || `player_${phone.slice(-4)}`;
  let username = base;
  let suffix = 1;
  while (await User.exists({ username })) username = `${base}_${suffix++}`;
  return username;
};

const issueAuthSession = async (user) => {
  if (!user.isActive) {
    throw new ApiError(403, 'Your account has been blocked. Please contact support.');
  }
  const { accessToken, refreshToken } = generateTokenPair(user._id, user.role);
  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  await user.save();
  const userResponse = user.toJSON();
  userResponse.name = user.fullName;
  return { user: userResponse, accessToken, refreshToken };
};

const normalizePlayerRole = (value) => {
  const role = value?.toString().toLowerCase();
  if (['batsman', 'bowler', 'all-rounder', 'wicket-keeper'].includes(role)) {
    return role;
  }
  if (role === 'allrounder' || role === 'all rounder') return 'all-rounder';
  if (role === 'wicket keeper' || role === 'wk') return 'wicket-keeper';
  return 'batsman';
};

const normalizeUserBattingStyle = (value) => {
  const style = value?.toString().toLowerCase();
  if (style === 'left-hand bat' || style === 'left-hand' || style === 'lhb') return 'left-hand';
  return 'right-hand';
};

const normalizePlayerBattingStyle = (value) => {
  const style = value?.toString().toLowerCase();
  if (style === 'left-hand bat' || style === 'left-hand' || style === 'lhb') return 'left-hand bat';
  return 'right-hand bat';
};

const normalizeUserBowlingStyle = (value) => {
  const style = value?.toString().toLowerCase();
  if (style === 'right-arm fast' || style === 'right-arm-fast') return 'right-arm-fast';
  if (style === 'right-arm medium' || style === 'right-arm-medium') return 'right-arm-medium';
  if (style === 'left-arm fast' || style === 'left-arm-fast') return 'left-arm-fast';
  if (style === 'left-arm medium' || style === 'left-arm-medium') return 'left-arm-medium';
  if (style === 'off-spin' || style === 'off spin' || style === 'leg-spin' || style === 'leg spin' || style === 'spin') {
    return 'spin';
  }
  return 'none';
};

const normalizePlayerBowlingStyle = (value) => {
  const style = value?.toString().toLowerCase();
  if (style === 'right-arm-fast') return 'right-arm fast';
  if (style === 'right-arm-medium') return 'right-arm medium';
  if (style === 'left-arm-fast') return 'left-arm fast';
  if (style === 'left-arm-medium') return 'left-arm medium';
  if (style === 'off spin') return 'off-spin';
  if (style === 'leg spin') return 'leg-spin';
  if (['right-arm fast', 'right-arm medium', 'left-arm fast', 'left-arm medium', 'off-spin', 'leg-spin'].includes(style)) {
    return style;
  }
  return 'none';
};

export const authService = {
  firebasePhoneLogin: async ({
    idToken,
    name,
    email
  }) => {
    let decoded;
    try {
      decoded = await verifyFirebaseIdToken(idToken);
    } catch (error) {
      throw new ApiError(401, `Firebase phone verification failed: ${error.message}`);
    }
    if (!decoded.phone_number) {
      throw new ApiError(400, 'Firebase token does not contain a verified phone number');
    }

    const phone = normalizePhone(decoded.phone_number);
    const existingUser = await User.findOne({ phone });
    let user = existingUser;
    if (!user) {
      const fullName = name?.toString().trim();
      if (!fullName || fullName.length < 2) {
        throw new ApiError(409, 'Create your Scores11 account to continue', [{
          code: 'PROFILE_REQUIRED',
          field: 'name',
          message: 'Full name is required for a new mobile account'
        }]);
      }
      const emailValue = email?.toString().trim().toLowerCase();
      if (emailValue && await User.exists({ email: emailValue })) {
        throw new ApiError(400, 'Email is already registered with another account');
      }
      // Everyone registers as a plain 'user' (Fan). Player status and the
      // linked Player document are granted later when the account
      // completes its Cricket Profile (see userService.promoteToPlayer),
      // not chosen/created at sign-up.
      const username = await buildUniqueUsername(fullName, phone);
      const generatedPassword = crypto.randomBytes(24).toString('hex');
      user = await User.create({
        email: emailValue || `${phone}@mobile.crick11.app`,
        password: await hashPassword(generatedPassword),
        username,
        fullName,
        phone,
        role: 'user',
        isPhoneVerified: true
      });
      await Wallet.create({ user: user._id, balance: 0 });
    } else if (!user.isPhoneVerified) {
      user.isPhoneVerified = true;
    }

    return issueAuthSession(user);
  },

  // Register new user
  register: async (userData) => {
      const { email, password, name, phone, role } = userData;
      const userRole = role || 'user';
      const isPlayer = userRole === 'player';
      const playerType = normalizePlayerRole(userData.playerRole || userData.playerType);
      const userBattingStyle = normalizeUserBattingStyle(userData.battingStyle);
      const userBowlingStyle = normalizeUserBowlingStyle(userData.bowlingStyle);

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
        role: userRole,
        isPublicPlayer: isPlayer,
        cricketProfile: isPlayer
          ? {
              playerType,
              battingStyle: userBattingStyle,
              bowlingStyle: userBowlingStyle,
              preferredRole: [playerType]
            }
          : undefined
      });

      if (isPlayer) {
        try {
          const Player = (await import('../player/player.model.js')).default;
          const player = await Player.create({
            user: user._id,
            playerName: name,
            role: playerType,
            battingStyle: normalizePlayerBattingStyle(userData.battingStyle),
            bowlingStyle: normalizePlayerBowlingStyle(userData.bowlingStyle),
            phone: phone || undefined,
            dateOfBirth: userData.dateOfBirth || undefined,
            nationality: userData.nationality || 'India',
            isActive: true
          });

          user.cricketProfile.playerId = player._id;
          await user.save();
        } catch (playerError) {
          console.error('Player profile creation failed (non-fatal):', playerError.message);
        }
      }

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

  // Send (or resend) a login/registration OTP to an email address.
  // Existing verified accounts just get a fresh OTP; unknown emails require
  // a name and are created on the spot (mirrors firebasePhoneLogin's
  // auto-provisioning), matching the app's OTP-only auth flow.
  requestEmailOtp: async ({ email, name }) => {
    const normalizedEmail = email?.toString().trim().toLowerCase();
    if (!normalizedEmail) {
      throw new ApiError(400, 'Email is required');
    }

    let user = await User.findOne({ email: normalizedEmail });
    let isNewUser = false;

    if (!user) {
      const fullName = name?.toString().trim();
      if (!fullName || fullName.length < 2) {
        throw new ApiError(409, 'Enter your name to create your Scores11 account', [{
          code: 'PROFILE_REQUIRED',
          field: 'name',
          message: 'Full name is required for a new email account'
        }]);
      }
      const username = await buildUniqueUsername(fullName, normalizedEmail.split('@')[0]);
      const generatedPassword = crypto.randomBytes(24).toString('hex');
      user = await User.create({
        email: normalizedEmail,
        password: await hashPassword(generatedPassword),
        username,
        fullName,
        role: 'user',
        isEmailVerified: false
      });
      try {
        await Wallet.create({ user: user._id, balance: 0 });
      } catch (walletError) {
        console.error('Wallet creation failed (non-fatal):', walletError.message);
      }
      isNewUser = true;
    }

    const otp = generateOTP();
    user.phoneVerificationCode = otp;
    user.phoneVerificationExpire = new Date(Date.now() + OTP_EXPIRY);
    await user.save();

    try {
      await sendLoginOtpEmail(normalizedEmail, otp);
    } catch (emailError) {
      console.error('Login OTP email failed:', emailError.message);
    }
    console.log(`Email OTP for ${normalizedEmail}: ${otp}`);

    return { isNewUser, message: 'OTP sent to your email' };
  },

  // Verify an email OTP and log the user in (creates the session the same
  // way login()/firebasePhoneLogin() do).
  verifyEmailOtp: async ({ email, otp }) => {
    const normalizedEmail = email?.toString().trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      throw new ApiError(404, 'Account not found. Please request a new OTP.');
    }
    if (!user.phoneVerificationCode || user.phoneVerificationCode !== otp) {
      throw new ApiError(400, 'Invalid OTP');
    }
    if (user.phoneVerificationExpire && new Date() > user.phoneVerificationExpire) {
      throw new ApiError(400, 'OTP has expired');
    }

    user.phoneVerificationCode = null;
    user.phoneVerificationExpire = null;
    user.isEmailVerified = true;
    await user.save();

    return issueAuthSession(user);
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
