import mongoose from 'mongoose';
import User from '../../modules/user/user.model.js';
import bcrypt from 'bcryptjs';

export async function createSeedUser() {
  try {
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    const seedUser = await User.create({
      email: 'seed@crick11.com',
      password: hashedPassword,
      username: 'seed_admin',
      fullName: 'Seed Admin',
      phone: '+919999999999',
      role: 'admin',
      cricketProfile: { playerType: 'all-rounder' },
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true
    });
    
    console.log('✅ Seed user created:', seedUser._id);
    return seedUser._id;
  } catch (error) {
    if (error.code === 11000) {
      const existingUser = await User.findOne({ email: 'seed@crick11.com' });
      console.log('✅ Using existing seed user:', existingUser._id);
      return existingUser._id;
    }
    throw error;
  }
}

