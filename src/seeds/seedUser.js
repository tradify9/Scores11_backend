import mongoose from 'mongoose';
import User from '../modules/user/user.model.js';
import bcrypt from 'bcryptjs';
import { getMongoUri, loadSeedEnv } from './utils/loadSeedEnv.js';

loadSeedEnv();

const SEED_EMAIL = process.env.SEED_USER_EMAIL || 'seed@crick11.com';
const SEED_PASSWORD = process.env.SEED_USER_PASSWORD || 'password123';

async function createSeedUser() {
  try {
    const mongoUri = getMongoUri();

    if (!mongoUri) {
      throw new Error('MONGODB_URI or MONGODB_URI_PROD is not defined in backend .env file');
    }

    await mongoose.connect(mongoUri);

    const hashedPassword = await bcrypt.hash(SEED_PASSWORD, 12);
    const seedUser = await User.findOneAndUpdate(
      { email: SEED_EMAIL.toLowerCase() },
      {
        $set: {
          email: SEED_EMAIL.toLowerCase(),
          password: hashedPassword,
          username: process.env.SEED_USER_USERNAME || 'seed_admin',
          fullName: process.env.SEED_USER_NAME || 'Seed Admin',
          phone: process.env.SEED_USER_PHONE || '+919999999998',
          role: 'admin',
          cricketProfile: {
            playerType: 'all-rounder'
          },
          isEmailVerified: true,
          isPhoneVerified: true,
          isActive: true,
          isBlocked: false
        }
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );

    console.log('Seed user is ready:', seedUser.username);
    console.log('Email:', seedUser.email);
    console.log('Password:', SEED_PASSWORD);
    console.log('ID:', seedUser._id.toString());
  } catch (error) {
    console.error('Seed user failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

createSeedUser();
