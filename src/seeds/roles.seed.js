import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
import mongoose from 'mongoose';
// config via process.env (dotenv loaded)
import Role from '../modules/role/role.model.js';
import { ROLES } from '../constants/roles.js';

const connectDatabase = async () => { 
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);  

    
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });
    
    return conn;
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

const seedRoles = async () => {
  try {
    // ✅ Ensure MONGODB_URI exists
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in .env file');
    }
    // ✅ Connect using database config
    await connectDatabase();
    console.log('✅ Connected to MongoDB');
    
    // Clear existing roles (non-system)
    await Role.deleteMany({ isSystem: false });
    
    const rolesData = [
      {
        name: 'Super Admin',
        slug: 'super-admin',
        description: 'Full system access with all permissions',
        permissions: ['*'],
        isSystem: true,
        isActive: true
      },
      {
        name: 'Administrator',
        slug: 'admin',
        description: 'Full administrative access to manage users, content, and system settings',
        permissions: [
          'users:read', 'users:write', 'users:delete',
          'matches:read', 'matches:write',
          'tournaments:read', 'tournaments:write',
          'players:read', 'players:write',
          'content:read', 'content:write', 'content:moderate',
          'finance:read', 'finance:write',
          'wallet:read', 'wallet:write',
          'settings:read', 'settings:write'
        ],
        isSystem: true,
        isActive: true
      },
      {
        name: 'Content Moderator',
        slug: 'moderator',
        description: 'Manage user-generated content and moderate community posts',
        permissions: [
          'content:read', 'content:write', 'content:moderate',
          'community:read', 'community:moderate',
          'users:read',
          'reports:read', 'reports:write'
        ],
        isSystem: true,
        isActive: true
      },
      {
        name: 'Match Scorer',
        slug: 'scorer',
        description: 'Enter live scores and manage match data',
        permissions: [
          'matches:read', 'matches:write', 'matches:scoring',
          'players:read', 'players:stats',
          'tournaments:read'
        ],
        isSystem: true,
        isActive: true
      },
      {
        name: 'Finance Manager',
        slug: 'finance-manager',
        description: 'Manage financial transactions, withdrawals, and revenue',
        permissions: [
          'finance:read', 'finance:write',
          'wallet:read', 'wallet:write', 'wallet:withdrawals',
          'transactions:read', 'transactions:write',
          'subscriptions:read', 'subscriptions:write'
        ],
        isSystem: true,
        isActive: true
      },
      {
        name: 'Customer Support',
        slug: 'support',
        description: 'Handle user inquiries and support tickets',
        permissions: [
          'users:read',
          'tickets:read', 'tickets:write',
          'contact:read', 'contact:write',
          'notifications:send'
        ],
        isSystem: true,
        isActive: true
      },
      {
        name: 'Data Analyst',
        slug: 'analyst',
        description: 'View analytics and reports (read-only)',
        permissions: [
          'analytics:read',
          'reports:read',
          'dashboard:read',
          'finance:read'
        ],
        isActive: true
      }
    ];

    for (const roleData of rolesData) {
      const existing = await Role.findOne({ slug: roleData.slug });
      if (!existing) {
        await Role.create(roleData);
        console.log(`✅ Created role: ${roleData.name}`);
      } else {
        console.log(`ℹ️  Role exists: ${roleData.name}`);
      }
    }

    console.log('🎉 Role seeding completed!');
    
    // Graceful disconnect
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedRoles();

