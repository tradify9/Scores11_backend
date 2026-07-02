import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../modules/user/user.model.js';
import { ROLES } from '../constants/roles.js';
import { getMongoUri, loadSeedEnv } from './utils/loadSeedEnv.js';

loadSeedEnv();

const ADMIN_EMAIL = process.env.ADMIN_SEED_EMAIL || process.env.ADMIN_EMAIL || 'admin@crick11.com';
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD || process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_USERNAME = process.env.ADMIN_SEED_USERNAME || 'sumitbawa95';
const ADMIN_NAME = process.env.ADMIN_SEED_NAME || 'Sumit Kumari';
const ADMIN_PHONE = process.env.ADMIN_SEED_PHONE || '+919999999999';

const seedAdmin = async () => {
  try {
    const mongoUri = getMongoUri();

    if (!mongoUri) {
      throw new Error('MONGODB_URI or MONGODB_URI_PROD is not defined in backend .env file');
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const adminUser = await User.findOneAndUpdate(
      { email: ADMIN_EMAIL.toLowerCase() },
      {
        $set: {
          username: ADMIN_USERNAME,
          fullName: ADMIN_NAME,
          email: ADMIN_EMAIL.toLowerCase(),
          password: hashedPassword,
          phone: ADMIN_PHONE,
          role: ROLES.ADMIN,
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

    console.log('Admin user is ready');
    console.log('Email:', ADMIN_EMAIL.toLowerCase());
    console.log('Password:', ADMIN_PASSWORD);
    console.log('Role:', adminUser.role);
    console.log('User ID:', adminUser._id.toString());

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
};

seedAdmin();

