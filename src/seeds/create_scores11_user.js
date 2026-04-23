import mongoose from 'mongoose';
import User from '../../modules/user/user.model.js';
import bcrypt from 'bcryptjs';
import Wallet from '../../modules/wallet/wallet.model.js';

async function createScores11User() {
  try {
    // Connect to PROD MongoDB (same as server)
    await mongoose.connect(process.env.MONGODB_URI_PROD || process.env.MONGODB_URI);
    
    const email = 'scores11@scores11.com';
    const password = 'Scores11@123'; // Strong password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Check if exists
    const existing = await User.findOne({ email });
    if (existing) {
      console.log('✅ scores11 user already exists:', existing.username);
      console.log('🔑 Password:', password);
      return;
    }
    
    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      username: 'scores11',
      fullName: 'Scores11 Admin',
      phone: '+919876543210',
      role: 'admin',
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true,
      cricketProfile: {
        playerType: 'admin'
      }
    });
    
    // Create wallet
    await Wallet.create({
      user: user._id,
      balance: 1000 // Admin bonus
    });
    
    console.log('✅ 🎉 Scores11 Admin Created Successfully!');
    console.log('📧 Email:', user.email);
    console.log('🔑 Password:', password);
    console.log('👤 Username:', user.username);
    console.log('🆔 ID:', user._id);
    console.log('');
    console.log('🧪 Test Login:');
    console.log('curl -X POST http://68.178.171.95:3000/api/v1/auth/login \\');
    console.log('-H "Content-Type: application/json" \\');
    console.log('-d \'{"email":"' + user.email + '","password":"' + password + '"}\'');
    
  } catch (error) {
    console.error('❌ Create failed:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

createScores11User();
