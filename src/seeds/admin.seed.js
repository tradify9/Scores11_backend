import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from '../modules/user/user.model.js';
import { ROLES } from '../constants/roles.js';

dotenv.config();

const seedAdmin = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in .env file');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const existingAdmin = await User.findOne({ email: 'admin@crick11.com' });

    if (existingAdmin) {
      console.log('⚠ Admin user already exists');
      console.log('Email: admin@crick11.com');
      console.log('Password: admin123');
    } else {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);

      const adminUser = await User.create({
        username: 'sumitbawa95',        // ✅ fixed
        fullName: 'Sumit Kumari',       // ✅ fixed
        email: 'admin@crick11.com',
        password: hashedPassword,
        phone: '+919999999999',
        role: ROLES.ADMIN,
        isEmailVerified: true,
        isActive: true
      });

      console.log('🎉 Admin user created successfully!');
      console.log('Email: admin@crick11.com');
      console.log('Password: admin123');
      console.log('Role: admin');
      console.log('User ID:', adminUser._id);
    }

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding admin:', error.message);
    process.exit(1);
  }
};

seedAdmin();