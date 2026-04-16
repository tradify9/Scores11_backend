#!/usr/bin/env node

/**
 * Avatar URL Fix Migration Script
 * Run: cd backend && node fix_avatar_urls.js
 */

import mongoose from 'mongoose';
import User from './src/modules/user/user.model.js';
import { config } from './src/config/env.js';

const MONGODB_URI = config.mongoose.url;
const DEFAULT_AVATAR = 'https://via.placeholder.com/400x400/6B7280/FFFFFF?text=👤';
const CLOUDINARY_DOMAIN = 'res.cloudinary.com';

// Fix patterns - invalid URLs to replace
const INVALID_PATTERNS = [
  /http:\/\/68\.178\.171\.95:3000\/api\/v1\/users\/avatar/g,
  /users\/avatar/g,
  /^default-avatar-url$/g
];

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

async function fixAvatars() {
  try {
    console.log('🔍 Scanning users with invalid avatar URLs...\n');
    
    const users = await User.find({
      'avatar.url': {
        $nin: [null, undefined, DEFAULT_AVATAR],
        $regex: '^(?!.*res\\.cloudinary\\.com).*users/avatar|68\\.178\\.171\\.95',
        $options: 'i'
      }
    }).select('_id username email avatar.url');

    console.log(`📊 Found ${users.length} users with invalid avatar URLs`);

    let fixedCount = 0;
    const results = [];

    for (const user of users) {
      const oldUrl = user.avatar.url;
      let newUrl = oldUrl;

      // Check if it's a valid Cloudinary URL
      if (oldUrl.includes(CLOUDINARY_DOMAIN)) {
        results.push({ userId: user._id, status: 'VALID_CLOUDINARY', oldUrl });
        continue;
      }

      // Fix invalid URLs
      for (const pattern of INVALID_PATTERNS) {
        newUrl = newUrl.replace(pattern, DEFAULT_AVATAR);
      }

      if (newUrl !== oldUrl) {
        user.avatar.url = newUrl;
        user.avatar.publicId = null; // Reset publicId if using default
        await user.save();
        fixedCount++;
        results.push({ 
          userId: user._id, 
          username: user.username, 
          email: user.email,
          oldUrl,
          newUrl,
          status: 'FIXED'
        });
        console.log(`✅ Fixed: ${user.username} (${user.email})`);
      } else {
        results.push({ userId: user._id, status: 'UNCHANGED', oldUrl });
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   Fixed: ${fixedCount}`);
    console.log(`   Valid Cloudinary: ${results.filter(r => r.status === 'VALID_CLOUDINARY').length}`);
    console.log(`   Unchanged: ${results.filter(r => r.status === 'UNCHANGED').length}`);
    console.log(`   Total processed: ${results.length}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 MongoDB disconnected');
  }
}

async function main() {
  await connectDB();
  await fixAvatars();
}

main().catch(console.error);
