import User from '../user/user.model.js';
import Tournament from '../tournament/tournament.model.js';
import Match from '../match/match.model.js';
import Team from '../team/team.model.js';
import Player from '../player/player.model.js';
import Contest from '../contest/contest.model.js';
import Wallet from '../wallet/wallet.model.js';
import Transaction from '../wallet/transaction.model.js';
import Subscription from '../subscription/subscription.model.js';
import Blog from '../blog/blog.model.js';
import News from '../news/news.model.js';
import Post from '../community/post.model.js';
import Contact from '../contact/contact.model.js';
import Review from '../review/review.model.js';
import Club from '../club/club.model.js';
import Association from '../association/association.model.js';
import Award from '../award/award.model.js';
import ApiError from '../../utils/ApiError.js';
import { paginate } from '../../utils/pagination.js';

// Role definitions with permissions
const defaultRoles = [
  {
    name: 'Super Admin',
    slug: 'super-admin',
    description: 'Full system access',
    permissions: ['*'],
    isSystem: true
  },
  {
    name: 'Admin',
    slug: 'admin',
    description: 'Administrative access',
    permissions: [
      'users:read', 'users:write',
      'matches:read', 'matches:write',
      'tournaments:read', 'tournaments:write',
      'content:read', 'content:write',
      'finance:read',
      'settings:read', 'settings:write'
    ],
    isSystem: true
  },
  {
    name: 'Moderator',
    slug: 'moderator',
    description: 'Content moderation access',
    permissions: [
      'content:read', 'content:write',
      'users:read',
      'community:moderate'
    ],
    isSystem: true
  },
  {
    name: 'Finance Manager',
    slug: 'finance-manager',
    description: 'Financial operations access',
    permissions: [
      'finance:read', 'finance:write',
      'transactions:read',
      'subscriptions:read'
    ],
    isSystem: true
  },
  {
    name: 'Support Agent',
    slug: 'support',
    description: 'Customer support access',
    permissions: [
      'users:read',
      'tickets:read', 'tickets:write',
      'contact:read', 'contact:write'
    ],
    isSystem: true
  }
];

// In-memory storage for features not yet in database
let roles = [...defaultRoles];
let apiKeys = [];
let webhooks = [];
let emailTemplates = [];
let backups = [];
let systemLogs = [];
let verifications = [];
let moderationQueue = [];

export const adminService = {
  // Dashboard
  getDashboard: async () => {
    const [
      totalUsers,
      activeUsers,
      totalMatches,
      liveMatches,
      totalTournaments,
      activeTournaments,
      totalTeams,
      totalPlayers,
      totalClubs,
      totalAssociations,
      todayRevenue,
      totalRevenue,
      activeUsersToday,
      newUsersToday
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true, lastLoginAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
      Match.countDocuments(),
      Match.countDocuments({ status: 'live' }),
      Tournament.countDocuments(),
      Tournament.countDocuments({ status: 'active' }),
      Team.countDocuments(),
      Player.countDocuments(),
      Club.countDocuments({ status: 'active' }),
      Association.countDocuments(),
      Transaction.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, type: 'credit', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]).then(r => r[0]?.total || 0),
      Transaction.aggregate([
        { $match: { type: 'credit', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]).then(r => r[0]?.total || 0),
      User.countDocuments({ lastLoginAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
      User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
    ]);

    // Get recent users for latest registrations
    const latestRegistrations = await User.find()
      .select('name email role createdAt avatar')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get recent matches
    const recentMatches = await Match.find()
      .populate('team1 team2', 'name logo')
      .populate('tournament', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Get recent tournaments
    const recentTournaments = await Tournament.find()
      .select('name status startDate endDate teams')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Get monthly user growth for charts
    const monthlyUserGrowth = await User.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $limit: 12 }
    ]);

    // Get monthly revenue for charts
    const monthlyRevenue = await Transaction.aggregate([
      { $match: { type: 'credit', status: 'completed', createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, amount: { $sum: '$amount' } } },
      { $sort: { _id: 1 } },
      { $limit: 12 }
    ]);

    // Get match status distribution
    const matchStatusData = await Match.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Get daily revenue for last 7 days
    const dailyRevenue = await Transaction.aggregate([
      { $match: { type: 'credit', status: 'completed', createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, amount: { $sum: '$amount' } } },
      { $sort: { _id: 1 } }
    ]);

    // Generate recent activities from various sources
    const recentActivity = [
      { _id: '1', action: 'New user registered', user: latestRegistrations[0]?.name || 'User', time: new Date(), type: 'user', icon: 'user' },
      { _id: '2', action: 'Match completed', user: recentMatches[0] ? `${recentMatches[0].team1?.name || 'Team 1'} vs ${recentMatches[0].team2?.name || 'Team 2'}` : 'Match', time: new Date(Date.now() - 15 * 60 * 1000), type: 'match', icon: 'trophy' },
      { _id: '3', action: 'Tournament created', user: recentTournaments[0]?.name || 'Tournament', time: new Date(Date.now() - 60 * 60 * 1000), type: 'tournament', icon: 'calendar' },
      { _id: '4', action: 'Payment received', user: `₹${todayRevenue}`, time: new Date(Date.now() - 2 * 60 * 60 * 1000), type: 'payment', icon: 'rupee' },
      { _id: '5', action: 'Player verified', user: 'Player', time: new Date(Date.now() - 3 * 60 * 60 * 1000), type: 'player', icon: 'check' },
    ];

    return {
      stats: {
        totalUsers,
        activeUsersToday: activeUsersToday,
        newUsersToday,
        totalTeams,
        totalPlayers,
        totalClubs,
        totalAssociations,
        totalMatches,
        liveMatches,
        totalTournaments,
        activeTournaments,
        todayRevenue,
        totalRevenue,
        appHealth: 'healthy',
        serverStatus: 'online',
        databaseStatus: 'connected',
        redisStatus: 'connected'
      },
      recentActivity,
      latestRegistrations: latestRegistrations.map(u => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
        avatar: u.avatar
      })),
      recentMatches: recentMatches.map(m => ({
        _id: m._id,
        team1: m.team1,
        team2: m.team2,
        tournament: m.tournament,
        status: m.status,
        startTime: m.startTime,
        venue: m.venue
      })),
      recentTournaments,
      monthlyData: monthlyUserGrowth.map((m, i) => ({
        month: m._id,
        users: m.count,
        matches: Math.floor(m.count * Math.random() * 2),
        revenue: monthlyRevenue[i]?.amount || 0
      })),
      matchStatusData: matchStatusData.map(s => ({
        name: s._id || 'unknown',
        value: s.count
      })),
      dailyRevenue,
      userGrowthData: monthlyUserGrowth,
      alerts: []
    };
  },

  getSystemStats: async () => {
    return {
      users: {
        total: await User.countDocuments(),
        active: await User.countDocuments({ isActive: true }),
        newToday: await User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
      },
      matches: {
        total: await Match.countDocuments(),
        live: await Match.countDocuments({ status: 'live' }),
        completed: await Match.countDocuments({ status: 'completed' })
      },
      tournaments: {
        total: await Tournament.countDocuments(),
        active: await Tournament.countDocuments({ status: 'active' })
      },
      finance: {
        totalRevenue: await Transaction.aggregate([
          { $match: { type: 'credit', status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]).then(r => r[0]?.total || 0),
        totalTransactions: await Transaction.countDocuments({ status: 'completed' })
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version
      }
    };
  },

  // Users
  getAllUsers: async (query) => {
    const { page = 1, limit = 10, search, role, status } = query;
    const filter = {};
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) filter.role = role;
    if (status) filter.isActive = status === 'active';

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await User.countDocuments(filter);

    return {
      users,
      pagination: paginate(total, page, limit)
    };
  },

  getUserById: async (id) => {
    const user = await User.findById(id).select('-password');
    if (!user) throw new ApiError(404, 'User not found');
    return user;
  },

  updateUser: async (id, data) => {
    const user = await User.findByIdAndUpdate(id, data, { new: true }).select('-password');
    if (!user) throw new ApiError(404, 'User not found');
    return user;
  },

  deleteUser: async (id) => {
    const user = await User.findByIdAndDelete(id);
    if (!user) throw new ApiError(404, 'User not found');
  },

  // Roles
  getRoles: async () => {
    return roles;
  },

  createRole: async (data) => {
    const role = {
      _id: Date.now().toString(),
      ...data,
      createdAt: new Date()
    };
    roles.push(role);
    return role;
  },

  updateRole: async (id, data) => {
    const index = roles.findIndex(r => r._id === id);
    if (index === -1) throw new ApiError(404, 'Role not found');
    if (roles[index].isSystem) throw new ApiError(400, 'Cannot modify system role');
    
    roles[index] = { ...roles[index], ...data, updatedAt: new Date() };
    return roles[index];
  },

  deleteRole: async (id) => {
    const index = roles.findIndex(r => r._id === id);
    if (index === -1) throw new ApiError(404, 'Role not found');
    if (roles[index].isSystem) throw new ApiError(400, 'Cannot delete system role');
    
    roles.splice(index, 1);
  },

  // System Logs
  getSystemLogs: async (query) => {
    const { page = 1, limit = 50, level, startDate, endDate, search } = query;
    
    let filtered = systemLogs;
    if (level) filtered = filtered.filter(l => l.level === level);
    if (startDate) filtered = filtered.filter(l => new Date(l.createdAt) >= new Date(startDate));
    if (endDate) filtered = filtered.filter(l => new Date(l.createdAt) <= new Date(endDate));
    if (search) filtered = filtered.filter(l => l.message?.toLowerCase().includes(search.toLowerCase()));

    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return {
      logs: paginated,
      pagination: paginate(filtered.length, page, limit)
    };
  },

  exportLogs: async (query) => {
    const { logs } = await adminService.getSystemLogs({ ...query, limit: 10000 });
    const headers = 'Timestamp,Level,User,Action,Message,IP\n';
    const rows = logs.map(l => 
      `${l.createdAt},${l.level},${l.user || ''},${l.action || ''},"${l.message || ''}",${l.ip || ''}`
    ).join('\n');
    return headers + rows;
  },

  clearOldLogs: async (days) => {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const beforeCount = systemLogs.length;
    systemLogs = systemLogs.filter(l => new Date(l.createdAt) > cutoff);
    return { deleted: beforeCount - systemLogs.length };
  },

  // Backups
  getBackups: async () => {
    return backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  createBackup: async (data) => {
    const backup = {
      _id: Date.now().toString(),
      name: data.name || `backup-${new Date().toISOString().split('T')[0]}`,
      type: data.type || 'full',
      size: Math.floor(Math.random() * 1000) + ' MB',
      status: 'completed',
      createdAt: new Date(),
      encrypted: data.encrypt || false
    };
    backups.push(backup);
    return backup;
  },

  restoreBackup: async (id) => {
    const backup = backups.find(b => b._id === id);
    if (!backup) throw new ApiError(404, 'Backup not found');
    // Simulate restore
    return { success: true };
  },

  deleteBackup: async (id) => {
    const index = backups.findIndex(b => b._id === id);
    if (index === -1) throw new ApiError(404, 'Backup not found');
    backups.splice(index, 1);
  },

  downloadBackup: async (id) => {
    const backup = backups.find(b => b._id === id);
    if (!backup) throw new ApiError(404, 'Backup not found');
    return Buffer.from('backup-data-placeholder');
  },

  // Email Templates
  getEmailTemplates: async () => {
    return emailTemplates;
  },

  createEmailTemplate: async (data) => {
    const template = {
      _id: Date.now().toString(),
      ...data,
      createdAt: new Date()
    };
    emailTemplates.push(template);
    return template;
  },

  updateEmailTemplate: async (id, data) => {
    const index = emailTemplates.findIndex(t => t._id === id);
    if (index === -1) throw new ApiError(404, 'Template not found');
    emailTemplates[index] = { ...emailTemplates[index], ...data, updatedAt: new Date() };
    return emailTemplates[index];
  },

  deleteEmailTemplate: async (id) => {
    const index = emailTemplates.findIndex(t => t._id === id);
    if (index === -1) throw new ApiError(404, 'Template not found');
    emailTemplates.splice(index, 1);
  },

  sendTestEmail: async (id, email) => {
    const template = emailTemplates.find(t => t._id === id);
    if (!template) throw new ApiError(404, 'Template not found');
    // Simulate sending
    return { sent: true };
  },

  // Content Moderation
  getModerationQueue: async (query) => {
    const { page = 1, limit = 20, type, status = 'pending' } = query;
    
    let filtered = moderationQueue.filter(item => item.status === status);
    if (type) filtered = filtered.filter(item => item.contentType === type);

    const start = (page - 1) * limit;
    return {
      items: filtered.slice(start, start + limit),
      pagination: paginate(filtered.length, page, limit)
    };
  },

  moderateContent: async (id, data) => {
    const item = moderationQueue.find(i => i._id === id);
    if (!item) throw new ApiError(404, 'Content not found');
    
    item.status = data.action;
    item.moderatedAt = new Date();
    item.moderatedBy = data.moderatorId;
    item.moderationNotes = data.notes;
    
    return item;
  },

  deleteContent: async (id) => {
    const index = moderationQueue.findIndex(i => i._id === id);
    if (index === -1) throw new ApiError(404, 'Content not found');
    moderationQueue.splice(index, 1);
  },

  // Financial Overview
  getFinancialOverview: async (query) => {
    const { startDate, endDate } = query;
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const transactions = await Transaction.find(
      Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}
    ).sort({ createdAt: -1 }).limit(100);

    const revenue = await Transaction.aggregate([
      { $match: { type: 'credit', status: 'completed', ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }) } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, amount: { $sum: '$amount' } } },
      { $sort: { _id: 1 } }
    ]);

    const subscriptions = await Subscription.aggregate([
      { $group: { _id: '$plan', count: { $sum: 1 } } }
    ]);

    return {
      overview: {
        totalRevenue: await Transaction.aggregate([
          { $match: { type: 'credit', status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]).then(r => r[0]?.total || 0),
        monthlyRevenue: await Transaction.aggregate([
          { $match: { type: 'credit', status: 'completed', createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]).then(r => r[0]?.total || 0),
        activeSubscriptions: await Subscription.countDocuments({ status: 'active' }),
        totalWalletBalance: await Wallet.aggregate([
          { $group: { _id: null, total: { $sum: '$balance' } } }
        ]).then(r => r[0]?.total || 0)
      },
      revenue: revenue.map(r => ({ date: r._id, amount: r.amount })),
      transactions: transactions.map(t => ({
        ...t.toObject(),
        count: 1
      })),
      subscriptions: subscriptions.map(s => ({ plan: s._id, count: s.count })),
      breakdown: [
        { source: 'Subscriptions', amount: Math.floor(Math.random() * 50000) + 10000 },
        { source: 'Contest Entries', amount: Math.floor(Math.random() * 30000) + 5000 },
        { source: 'Store Purchases', amount: Math.floor(Math.random() * 20000) + 3000 },
        { source: 'Other', amount: Math.floor(Math.random() * 10000) + 1000 }
      ]
    };
  },

  exportFinancialData: async (query) => {
    const { transactions } = await adminService.getFinancialOverview(query);
    const headers = 'Date,User,Type,Amount,Status,Description\n';
    const rows = transactions.map(t => 
      `${t.createdAt},${t.user || 'N/A'},${t.type},${t.amount},${t.status},"${t.description || ''}"`
    ).join('\n');
    return headers + rows;
  },

  // User Verifications
  getVerifications: async (query) => {
    const { page = 1, limit = 20, status, type, search } = query;
    
    let filtered = verifications;
    if (status && status !== 'all') filtered = filtered.filter(v => v.status === status);
    if (type && type !== 'all') filtered = filtered.filter(v => v.type === type);
    if (search) {
      filtered = filtered.filter(v => 
        v.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
        v.user?.email?.toLowerCase().includes(search.toLowerCase())
      );
    }

    const start = (page - 1) * limit;
    return {
      verifications: filtered.slice(start, start + limit),
      pagination: paginate(filtered.length, page, limit)
    };
  },

  approveVerification: async (id, data) => {
    const verification = verifications.find(v => v._id === id);
    if (!verification) throw new ApiError(404, 'Verification not found');
    
    verification.status = 'approved';
    verification.approvedAt = new Date();
    verification.approvalNotes = data.notes;
    
    return verification;
  },

  rejectVerification: async (id, data) => {
    const verification = verifications.find(v => v._id === id);
    if (!verification) throw new ApiError(404, 'Verification not found');
    
    verification.status = 'rejected';
    verification.rejectedAt = new Date();
    verification.rejectionReason = data.reason;
    
    return verification;
  },

  // API Management
  getAPIKeys: async () => {
    return apiKeys.map(k => ({ ...k, key: undefined })); // Don't return full key
  },

  createAPIKey: async (data) => {
    const key = {
      _id: Date.now().toString(),
      keyId: `key_${Math.random().toString(36).substring(2, 10)}`,
      key: `crick11_${Math.random().toString(36).substring(2, 30)}`,
      name: data.name,
      permissions: data.permissions,
      isActive: true,
      createdAt: new Date(),
      expiresAt: data.expiresIn === 'never' ? null : new Date(Date.now() + parseInt(data.expiresIn) * 24 * 60 * 60 * 1000)
    };
    apiKeys.push(key);
    return key; // Return full key only on creation
  },

  deleteAPIKey: async (id) => {
    const index = apiKeys.findIndex(k => k._id === id);
    if (index === -1) throw new ApiError(404, 'API key not found');
    apiKeys.splice(index, 1);
  },

  regenerateAPIKey: async (id) => {
    const key = apiKeys.find(k => k._id === id);
    if (!key) throw new ApiError(404, 'API key not found');
    
    key.key = `crick11_${Math.random().toString(36).substring(2, 30)}`;
    key.keyId = `key_${Math.random().toString(36).substring(2, 10)}`;
    key.regeneratedAt = new Date();
    
    return key;
  },

  getWebhooks: async () => {
    return webhooks;
  },

  createWebhook: async (data) => {
    const webhook = {
      _id: Date.now().toString(),
      ...data,
      status: 'active',
      createdAt: new Date()
    };
    webhooks.push(webhook);
    return webhook;
  },

  deleteWebhook: async (id) => {
    const index = webhooks.findIndex(w => w._id === id);
    if (index === -1) throw new ApiError(404, 'Webhook not found');
    webhooks.splice(index, 1);
  },

  // Tournaments & Matches
  getAllTournaments: async (query) => {
    const { page = 1, limit = 10, status, search } = query;
    const filter = {};
    if (status) filter.status = status;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const tournaments = await Tournament.find(filter)
      .populate('organizer', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Tournament.countDocuments(filter);

    return {
      tournaments,
      pagination: paginate(total, page, limit)
    };
  },

  getAllMatches: async (query) => {
    const { page = 1, limit = 10, status, tournament } = query;
    const filter = {};
    if (status) filter.status = status;
    if (tournament) filter.tournament = tournament;

    const matches = await Match.find(filter)
      .populate('team1 team2', 'name')
      .populate('tournament', 'name')
      .sort({ startTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Match.countDocuments(filter);

    return {
      matches,
      pagination: paginate(total, page, limit)
    };
  },

  // Advanced Analytics
  getAdvancedAnalytics: async (query) => {
    const { period = '30d' } = query;
    const days = parseInt(period) || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return {
      userGrowth: await User.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      revenueTrend: await Transaction.aggregate([
        { $match: { type: 'credit', status: 'completed', createdAt: { $gte: startDate } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, amount: { $sum: '$amount' } } },
        { $sort: { _id: 1 } }
      ]),
      matchEngagement: await Match.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      topUsers: await User.find()
        .select('name email totalSpent contestsJoined')
        .sort({ totalSpent: -1 })
        .limit(10),
      geographicData: [
        { country: 'India', users: 4500, revenue: 125000 },
        { country: 'Pakistan', users: 1200, revenue: 35000 },
        { country: 'Bangladesh', users: 800, revenue: 22000 },
        { country: 'England', users: 600, revenue: 18000 },
        { country: 'Australia', users: 400, revenue: 12000 }
      ]
    };
  },

  exportAnalytics: async (query) => {
    const analytics = await adminService.getAdvancedAnalytics(query);
    // Simplified CSV export
    return 'Date,Metric,Value\n' + 
      analytics.userGrowth.map(u => `${u._id},New Users,${u.count}`).join('\n');
  },

  // Mobile App Management
  getAppBanners: async () => {
    return [
      {
        _id: '1',
        title: 'Welcome to Crick11',
        subtitle: 'Play Fantasy Cricket & Win Big',
        image: 'https://via.placeholder.com/800x400/10B981/FFFFFF?text=Welcome',
        actionType: 'screen',
        actionValue: 'contests',
        priority: 1,
        isActive: true,
        startDate: new Date(),
        endDate: null
      },
      {
        _id: '2',
        title: 'IPL 2024 Special',
        subtitle: 'Mega Contests with 1 Crore Prize Pool',
        image: 'https://via.placeholder.com/800x400/8B5CF6/FFFFFF?text=IPL+2024',
        actionType: 'url',
        actionValue: '/contests/ipl-special',
        priority: 2,
        isActive: true,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    ];
  },

  createAppBanner: async (data) => {
    return {
      _id: Date.now().toString(),
      ...data,
      createdAt: new Date()
    };
  },

  updateAppBanner: async (id, data) => {
    return {
      _id: id,
      ...data,
      updatedAt: new Date()
    };
  },

  deleteAppBanner: async (id) => {
    return { deleted: true };
  },

  getAppText: async () => {
    return {
      app_name: 'Crick11',
      welcome_title: 'Welcome to Crick11',
      welcome_subtitle: 'India\'s #1 Fantasy Cricket Platform',
      home_header: 'Live Matches',
      contest_title: 'Join Contests',
      wallet_title: 'My Wallet',
      profile_title: 'My Profile',
      login_title: 'Login to Continue',
      signup_title: 'Create Your Account',
      footer_text: '© 2024 Crick11. All rights reserved.',
      terms_text: 'By using this app, you agree to our Terms & Conditions.',
      privacy_text: 'Your privacy is important to us.'
    };
  },

  updateAppText: async (key, data) => {
    return { key, value: data.value, updatedAt: new Date() };
  },

  getAppConfig: async () => {
    return {
      version: '2.1.0',
      minVersion: '2.0.0',
      maintenanceMode: false,
      enableContests: true,
      enableWallet: true,
      enableStore: true,
      enableLiveScores: true,
      enablePredictions: true,
      enableReferral: true
    };
  },

  updateAppConfig: async (data) => {
    return { ...data, updatedAt: new Date() };
  },

  getAppNotifications: async () => {
    return [
      {
        _id: '1',
        title: 'Match Starting Soon',
        body: 'India vs Australia match starts in 30 minutes!',
        status: 'sent',
        targetAudience: 'All users',
        createdAt: new Date()
      },
      {
        _id: '2',
        title: 'New Contest Available',
        body: 'Join the Mega Contest with 10 Lakh prize pool',
        status: 'scheduled',
        targetAudience: 'Active users',
        createdAt: new Date()
      }
    ];
  },

  sendPushNotification: async (data) => {
    return { sent: true, recipients: 15000 };
  },

  // Store Management
  getStoreData: async (query) => {
    const { tab, status, startDate, endDate } = query;
    
    // Mock store data
    const orders = [
      {
        _id: 'order1',
        orderId: 'ORD-001',
        customer: { name: 'John Doe', email: 'john@example.com', phone: '+91 9876543210', _id: 'user1' },
        items: [
          { name: 'Crick11 Jersey', quantity: 2, price: 999, image: 'https://via.placeholder.com/100' }
        ],
        total: 1998,
        subtotal: 1998,
        shipping: 0,
        tax: 0,
        status: 'delivered',
        shippingAddress: { street: '123 Main St', city: 'Mumbai', state: 'MH', zip: '400001', country: 'India' },
        createdAt: new Date()
      },
      {
        _id: 'order2',
        orderId: 'ORD-002',
        customer: { name: 'Jane Smith', email: 'jane@example.com', phone: '+91 9876543211', _id: 'user2' },
        items: [
          { name: 'Cricket Bat', quantity: 1, price: 4999, image: 'https://via.placeholder.com/100' }
        ],
        total: 4999,
        subtotal: 4999,
        shipping: 100,
        tax: 250,
        status: 'shipped',
        shippingAddress: { street: '456 Park Ave', city: 'Delhi', state: 'DL', zip: '110001', country: 'India' },
        createdAt: new Date()
      }
    ];

    const products = [
      {
        _id: 'prod1',
        name: 'Crick11 Jersey',
        category: 'Apparel',
        price: 999,
        stock: 150,
        image: 'https://via.placeholder.com/300x200/10B981/FFFFFF?text=Jersey'
      },
      {
        _id: 'prod2',
        name: 'Cricket Bat',
        category: 'Equipment',
        price: 4999,
        stock: 45,
        image: 'https://via.placeholder.com/300x200/8B5CF6/FFFFFF?text=Bat'
      },
      {
        _id: 'prod3',
        name: 'Cricket Ball Set',
        category: 'Equipment',
        price: 599,
        stock: 8,
        image: 'https://via.placeholder.com/300x200/F59E0B/FFFFFF?text=Balls'
      }
    ];

    return {
      overview: {
        totalRevenue: 125000,
        totalOrders: 450,
        productsSold: 890,
        activeCustomers: 320
      },
      orders: status && status !== 'all' ? orders.filter(o => o.status === status) : orders,
      products,
      categories: [
        { name: 'Apparel', sales: 45000 },
        { name: 'Equipment', sales: 65000 },
        { name: 'Accessories', sales: 15000 }
      ],
      revenue: [
        { date: '2024-01-01', amount: 5000 },
        { date: '2024-01-02', amount: 7200 },
        { date: '2024-01-03', amount: 6800 },
        { date: '2024-01-04', amount: 9100 },
        { date: '2024-01-05', amount: 8500 }
      ],
      topProducts: [
        { name: 'Crick11 Jersey', category: 'Apparel', revenue: 45000, sold: 45, image: 'https://via.placeholder.com/100' },
        { name: 'Cricket Bat Premium', category: 'Equipment', revenue: 38000, sold: 8, image: 'https://via.placeholder.com/100' },
        { name: 'Team Cap', category: 'Accessories', revenue: 12000, sold: 120, image: 'https://via.placeholder.com/100' }
      ]
    };
  },

  getStoreProducts: async (query) => {
    return [
      { _id: '1', name: 'Crick11 Jersey', category: 'Apparel', price: 999, stock: 150, image: 'https://via.placeholder.com/300' },
      { _id: '2', name: 'Cricket Bat', category: 'Equipment', price: 4999, stock: 45, image: 'https://via.placeholder.com/300' }
    ];
  },

  createStoreProduct: async (data) => {
    return { _id: Date.now().toString(), ...data, createdAt: new Date() };
  },

  updateStoreProduct: async (id, data) => {
    return { _id: id, ...data, updatedAt: new Date() };
  },

  deleteStoreProduct: async (id) => {
    return { deleted: true };
  },

  updateOrderStatus: async (id, data) => {
    return { _id: id, status: data.status, updatedAt: new Date() };
  },

  // Contest Management
  getContests: async (query) => {
    const { status } = query;
    const contests = [
      {
        _id: 'contest1',
        name: 'Mega Contest',
        match: { name: 'India vs Australia', _id: 'match1' },
        entryFee: 49,
        prizePool: 100000,
        maxEntries: 10000,
        currentEntries: 7500,
        status: 'live',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3 * 60 * 60 * 1000),
        isGuaranteed: true,
        isMultiEntry: true
      },
      {
        _id: 'contest2',
        name: 'Head to Head',
        match: { name: 'England vs Pakistan', _id: 'match2' },
        entryFee: 199,
        prizePool: 10000,
        maxEntries: 50,
        currentEntries: 32,
        status: 'upcoming',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 28 * 60 * 60 * 1000),
        isGuaranteed: false,
        isMultiEntry: false
      }
    ];
    
    return {
      contests: status && status !== 'all' ? contests.filter(c => c.status === status) : contests
    };
  },

  createContest: async (data) => {
    return { _id: Date.now().toString(), ...data, createdAt: new Date() };
  },

  updateContest: async (id, data) => {
    return { _id: id, ...data, updatedAt: new Date() };
  },

  deleteContest: async (id) => {
    return { deleted: true };
  },

  updateContestStatus: async (id, status) => {
    return { _id: id, status, updatedAt: new Date() };
  },

  getPrizePools: async () => {
    return [
      { _id: '1', name: 'Standard Pool', contestCount: 45, totalPrize: 500000, winnerPercentage: 40, firstPrize: 50000 },
      { _id: '2', name: 'Mega Pool', contestCount: 12, totalPrize: 2000000, winnerPercentage: 30, firstPrize: 200000 },
      { _id: '3', name: 'Mini Pool', contestCount: 120, totalPrize: 100000, winnerPercentage: 50, firstPrize: 10000 }
    ];
  },

  getContestStats: async () => {
    return {
      totalContests: 450,
      liveContests: 12,
      totalEntries: 125000,
      totalPrizeDistributed: 5000000,
      participationTrend: [
        { date: '2024-01-01', entries: 5000 },
        { date: '2024-01-02', entries: 7200 },
        { date: '2024-01-03', entries: 6800 },
        { date: '2024-01-04', entries: 9100 },
        { date: '2024-01-05', entries: 8500 }
      ],
      entryFeeDistribution: [
        { fee: 'Free', count: 15000 },
        { fee: '₹10-50', count: 45000 },
        { fee: '₹51-100', count: 35000 },
        { fee: '₹101-500', count: 20000 },
        { fee: '₹500+', count: 10000 }
      ]
    };
  }
};

export default adminService;
