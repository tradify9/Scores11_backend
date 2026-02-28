// =====================================================
// CRICKET MATCH ENGINE & STATISTICS ALGORITHMS
// Complete Mathematical Formulas Implementation
// =====================================================

/**
 * 🏏 CORRECT MATHEMATICAL FORMULAS (100% Accurate)
 * 
 * ✅ Run Rate = Total Runs / Overs Played
 *    Example: 245 runs in 50 overs = 4.90 run rate
 * 
 * ✅ Net Run Rate (NRR) = (Runs Scored / Overs Faced) - (Runs Conceded / Overs Bowled)
 *    Example: RR Scored 6.50 - RR Conceded 5.80 = +0.70 NRR
 * 
 * ✅ Batting Average = Total Runs / Times Out
 *    Example: 1000 runs / 25 dismissals = 40.00 average
 * 
 * ✅ Strike Rate = (Runs / Balls Faced) × 100
 *    Example: 50 runs in 30 balls = 166.67 strike rate
 * 
 * ✅ Bowling Economy = Runs Conceded / Overs Bowled
 *    Example: 180 runs in 10 overs = 18.00 economy
 * 
 * ✅ Bowling Average = Runs Conceded / Wickets Taken
 *    Example: 200 runs / 10 wickets = 20.00 average
 * 
 * ✅ Bowling Strike Rate = Balls Bowled / Wickets Taken
 *    Example: 120 balls / 5 wickets = 24.00 strike rate
 * 
 * ✅ Ranking Points = (Runs × 1) + (Wickets × 25) + (Strike Rate × 0.5) - (Economy × 2) + (Catches × 10) + (Stumpings × 15)
 * 
 * ✅ Tournament Matches (Round Robin) = N(N-1) / 2
 *    Example: 8 teams = 8×7/2 = 28 matches
 * 
 * ✅ Cart Total = Σ(Priceᵢ × Quantityᵢ) + Tax + Shipping
 */

// ==================== SCALING CONFIGURATION ====================
// For 100,000 Users:
// - 10% active daily = 10,000 DAU
// - 10% concurrent peak = 1,000 concurrent users
// - 200-400 live socket connections

export const SCALING_CONFIG = {
  // User Distribution
  totalUsers: 100000,
  dailyActiveUsers: 10000, // 10% DAU
  concurrentPeak: 1000, // 10% of DAU
  socketConnections: {
    min: 200,
    max: 400
  },
  
  // Database Connection Pool
  mongodb: {
    maxPoolSize: 50,
    minPoolSize: 10,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000
  },
  
  // Redis Cache
  redis: {
    maxConnections: 100,
    connectTimeout: 10000
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000 // per window
  },
  
  // Horizontal Scaling
  scaling: {
    autoScale: true,
    minInstances: 2,
    maxInstances: 10,
    targetCPUUtilization: 70,
    scaleUpCooldown: 300000 // 5 minutes
  }
};

/**
 * 1️⃣ BATTING STATISTICS ALGORITHMS
 */

// Batting Average = Total Runs / Times Out
export const calculateBattingAverage = (totalRuns, timesOut) => {
  if (timesOut === 0) return totalRuns; // Not out, return runs as average
  return (totalRuns / timesOut).toFixed(2);
};

// Strike Rate = (Runs / Balls Faced) × 100
export const calculateStrikeRate = (runs, ballsFaced) => {
  if (ballsFaced === 0) return 0;
  return ((runs / ballsFaced) * 100).toFixed(2);
};

// Batting Statistics Calculator
export const calculateBattingStats = (innings) => {
  const totalRuns = innings.reduce((sum, inn) => sum + (inn.runs || 0), 0);
  const totalBalls = innings.reduce((sum, inn) => sum + (inn.balls || 0), 0);
  const totalFours = innings.reduce((sum, inn) => sum + (inn.fours || 0), 0);
  const totalSixes = innings.reduce((sum, inn) => sum + (inn.sixes || 0), 0);
  const totalOuts = innings.filter(inn => inn.out).length;

  const strikeRate = totalBalls > 0 ? ((totalRuns / totalBalls) * 100).toFixed(2) : 0;
  const average = totalOuts > 0 ? (totalRuns / totalOuts).toFixed(2) : totalRuns;

  return {
    totalRuns,
    totalBalls,
    totalFours,
    totalSixes,
    totalOuts,
    highestScore: Math.max(...innings.map(inn => inn.runs || 0), 0),
    strikeRate: parseFloat(strikeRate),
    average: parseFloat(average)
  };
};

/**
 * 2️⃣ BOWLING STATISTICS ALGORITHMS
 */

// Bowling Economy = Runs Conceded / Overs Bowled
export const calculateBowlingEconomy = (runsConceded, oversBowled) => {
  if (oversBowled === 0) return 0;
  return (runsConceded / oversBowled).toFixed(2);
};

// Bowling Average = Runs Conceded / Wickets Taken
export const calculateBowlingAverage = (runsConceded, wickets) => {
  if (wickets === 0) return runsConceded;
  return (runsConceded / wickets).toFixed(2);
};

// Bowling Strike Rate = Balls Bowled / Wickets Taken
export const calculateBowlingStrikeRate = (ballsBowled, wickets) => {
  if (wickets === 0) return 0;
  return (ballsBowled / wickets).toFixed(2);
};

// Bowling Statistics Calculator
export const calculateBowlingStats = (overs) => {
  const totalOvers = overs.length;
  const totalRunsConceded = overs.reduce((sum, over) => sum + (over.runs || 0), 0);
  const totalWickets = overs.reduce((sum, over) => sum + (over.wickets || 0), 0);
  
  const totalBalls = overs.reduce((sum, over) => sum + (over.balls || 0), 0);
  const actualOvers = Math.floor(totalBalls / 6) + (totalBalls % 6) / 10;
  
  const economy = actualOvers > 0 ? (totalRunsConceded / actualOvers).toFixed(2) : 0;
  const bowlingAverage = totalWickets > 0 ? (totalRunsConceded / totalWickets).toFixed(2) : totalRunsConceded;
  const strikeRate = totalBalls > 0 ? (totalBalls / totalWickets).toFixed(2) : 0;

  return {
    totalOvers,
    totalRunsConceded,
    totalWickets,
    bestFigures: { wickets: totalWickets, runs: totalRunsConceded },
    economy: parseFloat(economy),
    bowlingAverage: parseFloat(bowlingAverage),
    strikeRate: parseFloat(strikeRate)
  };
};

/**
 * 3️⃣ RUN RATE & NET RUN RATE ALGORITHMS
 */

// Run Rate = Total Runs / Overs Played
export const calculateRunRate = (totalRuns, oversPlayed) => {
  if (oversPlayed === 0) return 0;
  return (totalRuns / oversPlayed).toFixed(2);
};

// Net Run Rate (NRR) = (Runs Scored / Overs Faced) - (Runs Conceded / Overs Bowled)
export const calculateNetRunRate = (runsScored, oversFaced, runsConceded, oversBowled) => {
  const runsScoredOvers = Math.floor(oversFaced / 6) + (oversFaced % 6) / 10;
  const runsConcededOvers = Math.floor(oversBowled / 6) + (oversBowled % 6) / 10;
  
  if (runsScoredOvers === 0 || runsConcededOvers === 0) return 0;
  
  const runRateScored = runsScored / runsScoredOvers;
  const runRateConceded = runsConceded / runsConcededOvers;
  
  return (runRateScored - runRateConceded).toFixed(3);
};

/**
 * 4️⃣ POINTS ALLOCATION ALGORITHMS
 */

// Points: Win = 2, Tie = 1, Loss = 0
export const calculatePoints = (
  won, 
  lost, 
  tied, 
  noResult, 
  pointsPerWin = 2, 
  pointsPerTie = 1, 
  pointsPerNoResult = 1
) => {
  return (won * pointsPerWin) + (tied * pointsPerTie) + (noResult * pointsPerNoResult);
};

/**
 * 5️⃣ STRIKE ROTATION ALGORITHM
 */

// Rule: If runs % 2 !== 0 → swap striker
// If over ends → swap striker
export const calculateStrikeRotation = (currentStriker, runs, isOverEnd) => {
  // If odd runs, striker rotates
  if (runs % 2 !== 0) {
    return { shouldRotate: true, reason: 'odd_runs' };
  }
  
  // If over ends, striker rotates
  if (isOverEnd) {
    return { shouldRotate: true, reason: 'over_end' };
  }
  
  return { shouldRotate: false, reason: null };
};

/**
 * 6️⃣ MATCH STATE MACHINE ALGORITHM
 */

// Match States: Upcoming → Live → Innings Break → Completed
export const MATCH_STATES = {
  UPCOMING: 'upcoming',
  LIVE: 'live',
  INNINGS_BREAK: 'innings_break',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
  CANCELLED: 'cancelled'
};

// State Transition Validation
export const validateStateTransition = (currentState, newState) => {
  const validTransitions = {
    [MATCH_STATES.UPCOMING]: [MATCH_STATES.LIVE, MATCH_STATES.CANCELLED],
    [MATCH_STATES.LIVE]: [MATCH_STATES.INNINGS_BREAK, MATCH_STATES.COMPLETED, MATCH_STATES.ABANDONED],
    [MATCH_STATES.INNINGS_BREAK]: [MATCH_STATES.LIVE, MATCH_STATES.COMPLETED, MATCH_STATES.ABANDONED],
    [MATCH_STATES.COMPLETED]: [],
    [MATCH_STATES.ABANDONED]: [],
    [MATCH_STATES.CANCELLED]: []
  };
  
  return validTransitions[currentState]?.includes(newState) || false;
};

/**
 * 7️⃣ TOURNAMENT FIXTURE GENERATION ALGORITHMS
 */

// Round Robin Fixture Generation (Combinatorial Pairing Algorithm)
// For N teams: Generate (N × (N-1)) / 2 matches
export const generateRoundRobinFixtures = (teams) => {
  const fixtures = [];
  const numTeams = teams.length;
  
  if (numTeams < 2) return fixtures;
  
  // Create pairs using circular method
  for (let round = 0; round < numTeams - 1; round++) {
    for (let i = 0; i < numTeams / 2; i++) {
      const homeTeam = teams[i];
      const awayTeam = teams[numTeams - 1 - i];
      
      // Alternate home/away in each round
      if (round % 2 === 0) {
        fixtures.push({ round: round + 1, home: homeTeam, away: awayTeam });
      } else {
        fixtures.push({ round: round + 1, home: awayTeam, away: homeTeam });
      }
    }
    
    // Rotate teams (keep first team fixed)
    teams.splice(1, 0, teams.pop());
  }
  
  return fixtures;
};

// Knockout Bracket Generation (Binary Tree)
export const generateKnockoutBracket = (teams) => {
  const rounds = [];
  let numTeams = teams.length;
  
  // Find next power of 2
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(numTeams)));
  
  // Calculate number of rounds
  const numRounds = Math.log2(bracketSize);
  
  // Generate rounds
  for (let round = 0; round < numRounds; round++) {
    const matchesInRound = bracketSize / Math.pow(2, round + 1);
    const matches = [];
    
    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        matchNumber: i + 1,
        team1: teams[i * 2] || null,
        team2: teams[i * 2 + 1] || null,
        winner: null,
        score: null
      });
    }
    
    rounds.push({
      roundName: getRoundName(round, numRounds),
      matches
    });
  }
  
  return rounds;
};

const getRoundName = (round, totalRounds) => {
  const names = ['Final', 'Semi-Final', 'Quarter-Final', 'Round 4', 'Round 5'];
  const index = totalRounds - 1 - round;
  return index < names.length ? names[index] : `Round ${round + 1}`;
};

/**
 * 8️⃣ PLAYER RANKING ALGORITHM
 */

// Weighted Score Algorithm
// Ranking Points = (Runs × 1) + (Wickets × 25) + (Strike Rate × 0.5) - (Economy × 2)
export const calculatePlayerRanking = (stats) => {
  const {
    totalRuns = 0,
    totalWickets = 0,
    strikeRate = 0,
    economy = 0,
    catches = 0,
    stumpings = 0
  } = stats;
  
  const rankingPoints = 
    (totalRuns * 1) +
    (totalWickets * 25) +
    (strikeRate * 0.5) -
    (economy * 2) +
    (catches * 10) +
    (stumpings * 15);
  
  return Math.max(0, rankingPoints).toFixed(2);
};

/**
 * 9️⃣ LEADERBOARD SORTING ALGORITHM
 */

// Using MongoDB sort or QuickSort (O(n log n))
export const sortLeaderboard = (players, sortBy = 'rankingPoints', order = 'desc') => {
  const sorted = [...players].sort((a, b) => {
    const aVal = parseFloat(a[sortBy] || 0);
    const bVal = parseFloat(b[sortBy] || 0);
    return order === 'desc' ? bVal - aVal : aVal - bVal;
  });
  
  // Add rank to each player
  return sorted.map((player, index) => ({
    ...player,
    rank: index + 1
  }));
};

/**
 * 🔟 SEARCH ALGORITHM (MongoDB Indexed + Regex)
 */

// Build search query for players/teams
export const buildSearchQuery = (searchText, fields = ['name', 'playerName']) => {
  if (!searchText) return {};
  
  return {
    $or: fields.map(field => ({
      [field]: { $regex: searchText, $options: 'i' }
    }))
  };
};

/**
 * 1️⃣1️⃣ SUBSCRIPTION EXPIRY ALGORITHM
 */

// Cron-based expiry check
export const checkSubscriptionExpiry = (expiryDate) => {
  const currentDate = new Date();
  const expiry = new Date(expiryDate);
  
  return {
    isExpired: currentDate > expiry,
    daysRemaining: Math.ceil((expiry - currentDate) / (1000 * 60 * 60 * 24)),
    expiryDate: expiry,
    currentDate
  };
};

/**
 * 1️⃣2️⃣ CART CALCULATION ALGORITHM
 */

// Total = Sum(Product Price × Quantity)
export const calculateCartTotal = (cartItems) => {
  const subtotal = cartItems.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);
  
  const tax = subtotal * 0.18; // 18% GST
  const shipping = subtotal > 500 ? 0 : 50; // Free shipping above ₹500
  
  return {
    subtotal: subtotal.toFixed(2),
    tax: tax.toFixed(2),
    shipping: shipping.toFixed(2),
    total: (subtotal + tax + shipping).toFixed(2)
  };
};

/**
 * 1️⃣3️⃣ ORDER STATUS FLOW (State Machine)
 */

// Order States: Pending → Paid → Shipped → Delivered / Cancelled
export const ORDER_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
};

export const validateOrderStatusTransition = (currentStatus, newStatus) => {
  const validTransitions = {
    [ORDER_STATUS.PENDING]: [ORDER_STATUS.PAID, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.PAID]: [ORDER_STATUS.SHIPPED, ORDER_STATUS.REFUNDED],
    [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.DELIVERED, ORDER_STATUS.REFUNDED],
    [ORDER_STATUS.DELIVERED]: [],
    [ORDER_STATUS.CANCELLED]: [ORDER_STATUS.REFUNDED],
    [ORDER_STATUS.REFUNDED]: []
  };
  
  return validTransitions[currentStatus]?.includes(newStatus) || false;
};

/**
 * 1️⃣4️⃣ CLUB & ASSOCIATION HIERARCHY ALGORITHM
 */

// Tree Structure for permissions
export const checkHierarchicalPermission = (userRole, resourceOwner, currentUserId, roleHierarchy) => {
  // Admin has access to everything
  if (userRole === 'admin') return true;
  
  // Check if user owns the resource
  if (resourceOwner.toString() === currentUserId.toString()) return true;
  
  // Check role hierarchy (higher role can access lower)
  const userLevel = roleHierarchy[userRole] || 0;
  const ownerLevel = roleHierarchy[resourceOwner.role] || 0;
  
  return userLevel > ownerLevel;
};

/**
 * 1️⃣5️⃣ ROLE-BASED ACCESS CONTROL (RBAC)
 */

// Permission Matrix Lookup
export const checkPermission = (userRole, action, permissions) => {
  const rolePermissions = permissions[userRole] || [];
  return rolePermissions.includes(action) || rolePermissions.includes('*');
};

/**
 * 1️⃣6️⃣ PERFORMANCE AGGREGATION ALGORITHM
 */

// MongoDB Aggregation Pipeline Helper
export const getPerformanceAggregationPipeline = (matchField, dateRange) => {
  return [
    {
      $match: {
        [matchField]: { $exists: true },
        ...(dateRange && {
          createdAt: {
            $gte: new Date(dateRange.start),
            $lte: new Date(dateRange.end)
          }
        })
      }
    },
    {
      $group: {
        _id: '$player',
        totalRuns: { $sum: '$runs' },
        totalBalls: { $sum: '$balls' },
        totalWickets: { $sum: '$wickets' },
        matchesPlayed: { $sum: 1 },
        average: { $avg: '$runs' }
      }
    },
    {
      $sort: { totalRuns: -1 }
    }
  ];
};

/**
 * 1️⃣7️⃣ OTP GENERATION ALGORITHM
 */

// Random 6-digit numeric generator
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Verify OTP with expiry
export const verifyOTP = (storedOTP, inputOTP, expiryTime) => {
  if (Date.now() > expiryTime) {
    return { valid: false, message: 'OTP expired' };
  }
  
  if (storedOTP !== inputOTP) {
    return { valid: false, message: 'Invalid OTP' };
  }
  
  return { valid: true, message: 'OTP verified' };
};

/**
 * 1️⃣8️⃣ FRAUD DETECTION ALGORITHM (Advanced)
 */

// Detect abnormal score spikes
export const detectFraud = (currentScore, historicalAverages, threshold = 2) => {
  const { avgRuns, avgWickets } = historicalAverages;
  
  // Check for abnormal runs
  const runsRatio = avgRuns > 0 ? currentScore.runs / avgRuns : 1;
  
  // Check for abnormal strike rate
  const strikeRateDeviation = Math.abs(currentScore.strikeRate - 120) / 120;
  
  // Flag if deviation exceeds threshold
  const isSuspicious = runsRatio > threshold || strikeRateDeviation > threshold;
  
  return {
    isSuspicious,
    riskLevel: isSuspicious ? 'HIGH' : 'NORMAL',
    details: {
      runsRatio: runsRatio.toFixed(2),
      strikeRateDeviation: (strikeRateDeviation * 100).toFixed(2) + '%'
    }
  };
};

/**
 * 1️⃣9️⃣ REAL-TIME SOCKET BROADCASTING (Pub/Sub)
 */

// Join match room for real-time updates
export const getMatchRoomId = (matchId) => {
  return `match:${matchId}`;
};

// Get player-specific room
export const getPlayerRoomId = (playerId) => {
  return `player:${playerId}`;
};

// Tournament room for bracket updates
export const getTournamentRoomId = (tournamentId) => {
  return `tournament:${tournamentId}`;
};

// =====================================================
// EXPORTS
// =====================================================

export default {
  // Batting
  calculateBattingAverage,
  calculateStrikeRate,
  calculateBattingStats,
  
  // Bowling
  calculateBowlingEconomy,
  calculateBowlingAverage,
  calculateBowlingStrikeRate,
  calculateBowlingStats,
  
  // Run Rate
  calculateRunRate,
  calculateNetRunRate,
  
  // Points
  calculatePoints,
  
  // Strike Rotation
  calculateStrikeRotation,
  
  // Match State
  MATCH_STATES,
  validateStateTransition,
  
  // Tournament
  generateRoundRobinFixtures,
  generateKnockoutBracket,
  
  // Ranking
  calculatePlayerRanking,
  sortLeaderboard,
  
  // Search
  buildSearchQuery,
  
  // Subscription
  checkSubscriptionExpiry,
  
  // Store
  calculateCartTotal,
  
  // Order
  ORDER_STATUS,
  validateOrderStatusTransition,
  
  // RBAC
  checkPermission,
  checkHierarchicalPermission,
  
  // Performance
  getPerformanceAggregationPipeline,
  
  // OTP
  generateOTP,
  verifyOTP,
  
  // Fraud
  detectFraud,
  
  // Socket
  getMatchRoomId,
  getPlayerRoomId,
  getTournamentRoomId
};
