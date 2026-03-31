import mongoose from 'mongoose';
import User from '../modules/user/user.model.js';
import bcrypt from 'bcryptjs';

async function createSeedUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crick11');
    
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    const seedUser = await User.create({
      email: 'seed@crick11.com',
      password: hashedPassword,
      username: 'seed_admin',
      fullName: 'Seed Admin',
      phone: '+919999999999',
      role: 'admin',
      cricketProfile: {
        playerType: 'all-rounder'
      },
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true
    });
    
    console.log('✅ Created seed user:', seedUser.username);
    console.log('📧 Email:', seedUser.email);
    console.log('🔑 Password: password123');
    console.log('🆔 ID:', seedUser._id.toString());
    
  } catch (error) {
    console.error('❌ Seed user failed:', error.message);
  } finally {
    mongoose.disconnect();
  }
}

createSeedUser();
