import Contest from './contest.model.js';
import ContestTeam from './contestTeam.model.js';
import Match from '../match/match.model.js';
import User from '../user/user.model.js';
import Team from '../team/team.model.js';
import Player from '../player/player.model.js';
import Wallet from '../wallet/wallet.model.js';
import Transaction from '../wallet/transaction.model.js';
import ApiError from '../../utils/ApiError.js';
import { getPagination } from '../../utils/pagination.js';

// Player points calculation constants
const POINTS = {
  RUN: 1,
  FOUR_BONUS: 1,
  SIX_BONUS: 2,
  WICKET: 25,
  MAIDEN: 8,
  CATCH: 8,
  STUMPING: 12,
  RUN_OUT: 12,
  CAPTAIN_MULTIPLIER: 2,
  VICE_CAPTAIN_MULTIPLIER: 1.5
};

export const contestService = {
  // Create a new contest
  createContest: async (contestData, userId) => {
    const { match, name, entryFee, totalSpots, prizePool } = contestData;

    // Validate match exists
    const matchExists = await Match.findById(match);
    if (!matchExists) throw new ApiError(404, 'Match not found');

    // Check if contest already exists for this match
    const existingContest = await Contest.findOne({ 
      match, 
      name,
      isActive: true 
    });
    if (existingContest) {
      throw new ApiError(400, 'Contest with this name already exists for this match');
    }

    // Generate prize distribution if prize pool is set
    let prizeDistribution = [];
    if (prizePool > 0) {
      prizeDistribution = generatePrizeDistribution(prizePool, totalSpots);
    }

    const contest = await Contest.create({
      ...contestData,
      createdBy: userId,
      prizeDistribution,
      status: 'OPEN'
    });

    return await Contest.findById(contest._id)
      .populate('match', 'team1 team2 scheduledDate')
      .populate('createdBy', 'name email');
  },

  // Get contest by ID
  getContestById: async (contestId) => {
    const contest = await Contest.findById(contestId)
      .populate('match', 'team1 team2 scheduledDate status')
      .populate('tournament', 'name')
      .populate('createdBy', 'name email');
    
    if (!contest) throw new ApiError(404, 'Contest not found');
    return contest;
  },

  // Get contests for a match
  getMatchContests: async (matchId, query) => {
    const { page, limit, skip } = getPagination(query);
    
    const filter = { 
      match: matchId, 
      isActive: true,
      status: { $in: ['OPEN', 'FILLED', 'IN_PROGRESS'] }
    };
    
    if (query.category) filter.category = query.category;
    if (query.contestType) filter.contestType = query.contestType;
    if (query.entryFee) filter.entryFee = query.entryFee;

    const [contests, total] = await Promise.all([
      Contest.find(filter)
        .populate('match', 'team1 team2')
        .sort({ entryFee: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Contest.countDocuments(filter)
    ]);

    return {
      contests,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  },

  // Get all contests with filters
  getAllContests: async (query) => {
    const { page, limit, skip, sortBy, sortOrder } = getPagination(query);
    
    const filter = { isActive: true };
    if (query.status) filter.status = query.status;
    if (query.category) filter.category = query.category;
    if (query.contestType) filter.contestType = query.contestType;

    const [contests, total] = await Promise.all([
      Contest.find(filter)
        .populate('match', 'team1 team2 scheduledDate')
        .populate('createdBy', 'name')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit),
      Contest.countDocuments(filter)
    ]);

    return {
      contests,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  },

  // Get featured contests
  getFeaturedContests: async (query) => {
    const { page, limit, skip } = getPagination(query);
    
    const [contests, total] = await Promise.all([
      Contest.find({ 
        isFeatured: true, 
        isActive: true,
        status: { $in: ['OPEN', 'FILLED'] }
      })
        .populate('match', 'team1 team2 scheduledDate')
        .sort({ prizePool: -1 })
        .skip(skip)
        .limit(limit),
      Contest.countDocuments({ 
        isFeatured: true, 
        isActive: true,
        status: { $in: ['OPEN', 'FILLED'] }
      })
    ]);

    return {
      contests,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  },

  // Join contest with team
  joinContest: async (contestId, teamData, userId) => {
    const contest = await Contest.findById(contestId);
    if (!contest) throw new ApiError(404, 'Contest not found');

    // Check contest status
    if (contest.status !== 'OPEN') {
      throw new ApiError(400, 'Contest is not open for joining');
    }

    // Check if contest is full
    if (contest.filledSpots >= contest.totalSpots) {
      throw new ApiError(400, 'Contest is full');
    }

    // Check user's existing entries
    const userEntries = await ContestTeam.countDocuments({ 
      contest: contestId, 
      user: userId 
    });
    if (userEntries >= contest.maxEntriesPerUser) {
      throw new ApiError(400, 'You have reached maximum entries for this contest');
    }

    // Validate team
    const team = await Team.findById(teamData.team);
    if (!team) throw new ApiError(404, 'Team not found');

    // Validate players
    if (!teamData.players || teamData.players.length < contest.minTeamSize) {
      throw new ApiError(400, `Minimum ${contest.minTeamSize} players required`);
    }

    // Check total credits
    const totalCredits = teamData.players.reduce((sum, p) => sum + (p.credits || 0), 0);
    if (totalCredits > 100) {
      throw new ApiError(400, 'Total credits cannot exceed 100');
    }

    // Deduct entry fee if not free
    if (contest.entryFee > 0) {
      const wallet = await Wallet.findOne({ user: userId });
      if (!wallet || wallet.balance < contest.entryFee) {
        throw new ApiError(400, 'Insufficient balance');
      }

      // Deduct from wallet
      wallet.balance -= contest.entryFee;
      await wallet.save();

      // Create transaction
      await Transaction.create({
        user: userId,
        type: 'DEBIT',
        amount: contest.entryFee,
        status: 'COMPLETED',
        reference: `CONTEST-${contestId}-${Date.now()}`,
        description: `Contest entry: ${contest.name}`,
        relatedContest: contestId
      });
    }

    // Create contest team
    const contestTeam = await ContestTeam.create({
      contest: contestId,
      user: userId,
      team: teamData.team,
      players: teamData.players,
      creditsUsed: totalCredits,
      teamName: teamData.teamName || `Team ${userEntries + 1}`,
      match: contest.match
    });

    // Update contest filled spots
    contest.filledSpots += 1;
    if (contest.filledSpots >= contest.totalSpots) {
      contest.status = 'FILLED';
    }
    await contest.save();

    return await ContestTeam.findById(contestTeam._id)
      .populate('players.player', 'playerName jerseyNumber role')
      .populate('team', 'name');
  },

  // Get user's contest teams
  getUserContestTeams: async (contestId, userId) => {
    const teams = await ContestTeam.find({ 
      contest: contestId, 
      user: userId 
    })
      .populate('players.player', 'playerName jerseyNumber role')
      .populate('team', 'name');
    
    return teams;
  },

  // Get contest leaderboard
  getContestLeaderboard: async (contestId, query) => {
    const { page, limit, skip } = getPagination(query);
    
    const [teams, total] = await Promise.all([
      ContestTeam.find({ contest: contestId, status: 'ACTIVE' })
        .populate('user', 'name email avatar')
        .populate('team', 'name')
        .sort({ totalPoints: -1, rank: 1 })
        .skip(skip)
        .limit(limit),
      ContestTeam.countDocuments({ contest: contestId, status: 'ACTIVE' })
    ]);

    // Add rank to each team
    const leaderboard = teams.map((team, index) => ({
      ...team.toObject(),
      rank: skip + index + 1
    }));

    return {
      leaderboard,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  },

  // Get user's rank in contest
  getUserRank: async (contestId, userId) => {
    const userTeams = await ContestTeam.find({ 
      contest: contestId, 
      user: userId,
      status: 'ACTIVE'
    }).sort({ totalPoints: -1 });

    if (userTeams.length === 0) {
      throw new ApiError(404, 'User has not joined this contest');
    }

    // Find rank by counting teams with higher points
    const higherRankedTeams = await ContestTeam.countDocuments({
      contest: contestId,
      status: 'ACTIVE',
      totalPoints: { $gt: userTeams[0].totalPoints }
    });

    return {
      user: userId,
      teams: userTeams,
      rank: higherRankedTeams + 1,
      points: userTeams[0].totalPoints
    };
  },

  // Update points for all teams in a contest
  updatePoints: async (contestId, matchId) => {
    const contestTeams = await ContestTeam.find({ 
      contest: contestId,
      match: matchId,
      status: 'ACTIVE'
    });

    // Get player performances from match
    const match = await Match.findById(matchId);
    if (!match) throw new ApiError(404, 'Match not found');

    // Calculate points for each team
    for (const team of contestTeams) {
      let totalPoints = 0;
      const breakdown = { batting: 0, bowling: 0, fielding: 0, bonus: 0 };

      for (const playerSelection of team.players) {
        let playerPoints = 0;
        const playerId = playerSelection.player.toString();
        
        // Get player stats from match
        // This would integrate with the scoring system
        // For now, we'll calculate based on innings data
        
        const inningsData = match.innings.find(inn => 
          inn.battingScorecard?.some(b => b.batsman?.toString() === playerId)
        );
        
        const battingCard = inningsData?.battingScorecard?.find(
          b => b.batsman?.toString() === playerId
        );
        
        const bowlingCard = inningsData?.bowlingScorecard?.find(
          b => b.bowler?.toString() === playerId
        );

        // Batting points
        if (battingCard) {
          playerPoints += battingCard.runs || 0;
          playerPoints += ((battingCard.fours || 0) * POINTS.FOUR_BONUS);
          playerPoints += ((battingCard.sixes || 0) * POINTS.SIX_BONUS);
          breakdown.batting += playerPoints;
        }

        // Bowling points
        if (bowlingCard) {
          playerPoints += (bowlingCard.wickets || 0) * POINTS.WICKET;
          // Add maiden overs bonus
          breakdown.bowling += (bowlingCard.wickets || 0) * POINTS.WICKET;
        }

        // Captain/Vice-captain multiplier
        if (playerSelection.isCaptain) {
          playerPoints = Math.floor(playerPoints * POINTS.CAPTAIN_MULTIPLIER);
          breakdown.bonus += playerPoints;
        } else if (playerSelection.isViceCaptain) {
          playerPoints = Math.floor(playerPoints * POINTS.VICE_CAPTAIN_MULTIPLIER);
          breakdown.bonus += playerPoints;
        }

        totalPoints += playerPoints;
      }

      team.totalPoints = totalPoints;
      team.pointsBreakdown = breakdown;
      await team.save();
    }

    // Update rankings
    const rankedTeams = await ContestTeam.find({ contest: contestId, status: 'ACTIVE' })
      .sort({ totalPoints: -1 });

    for (let i = 0; i < rankedTeams.length; i++) {
      rankedTeams[i].previousRank = rankedTeams[i].rank;
      rankedTeams[i].rank = i + 1;
      await rankedTeams[i].save();
    }

    return { updated: true, teamsCount: contestTeams.length };
  },

  // Distribute prizes
  distributePrizes: async (contestId) => {
    const contest = await Contest.findById(contestId);
    if (!contest) throw new ApiError(404, 'Contest not found');

    if (contest.status !== 'COMPLETED') {
      throw new ApiError(400, 'Contest must be completed to distribute prizes');
    }

    const winners = await ContestTeam.find({ 
      contest: contestId, 
      status: 'ACTIVE' 
    })
      .sort({ rank: 1 })
      .limit(contest.prizeDistribution.length);

    // Credit prizes to winners
    for (let i = 0; i < winners.length; i++) {
      const prize = contest.prizeDistribution.find(
        p => winners[i].rank >= p.rankStart && winners[i].rank <= p.rankEnd
      );

      if (prize) {
        // Credit to wallet
        await Wallet.findOneAndUpdate(
          { user: winners[i].user },
          { 
            $inc: { 
              balance: prize.prize,
              winningBalance: prize.prize
            }
          }
        );

        // Create transaction
        await Transaction.create({
          user: winners[i].user,
          type: 'CREDIT',
          amount: prize.prize,
          status: 'COMPLETED',
          reference: `PRIZE-${contestId}-${Date.now()}`,
          description: `Contest prize - Rank #${winners[i].rank}`,
          relatedContest: contestId
        });

        // Update contest winners
        contest.winners.push({
          rank: winners[i].rank,
          user: winners[i].user,
          prize: prize.prize
        });
      }
    }

    await contest.save();
    return contest.winners;
  },

  // Cancel contest and refund
  cancelContest: async (contestId, reason, userId) => {
    const contest = await Contest.findById(contestId);
    if (!contest) throw new ApiError(404, 'Contest not found');

    if (contest.status === 'COMPLETED' || contest.status === 'CANCELLED') {
      throw new ApiError(400, 'Cannot cancel this contest');
    }

    // Refund all participants
    if (contest.entryFee > 0) {
      const participants = await ContestTeam.find({ contest: contestId });
      
      for (const participant of participants) {
        // Credit back to wallet
        await Wallet.findOneAndUpdate(
          { user: participant.user },
          { $inc: { balance: contest.entryFee } }
        );

        // Create refund transaction
        await Transaction.create({
          user: participant.user,
          type: 'CREDIT',
          amount: contest.entryFee,
          status: 'COMPLETED',
          reference: `REFUND-${contestId}-${Date.now()}`,
          description: 'Contest cancelled - refund',
          relatedContest: contestId
        });
      }
    }

    contest.status = 'CANCELLED';
    contest.cancelledReason = reason;
    await contest.save();

    return contest;
  },

  // Lock teams (before match starts)
  lockTeams: async (contestId) => {
    const contest = await Contest.findById(contestId);
    if (!contest) throw new ApiError(404, 'Contest not found');

    await ContestTeam.updateMany(
      { contest: contestId, status: 'ACTIVE' },
      { status: 'LOCKED' }
    );

    contest.status = 'IN_PROGRESS';
    await contest.save();

    return { locked: true };
  },

  // Get my contests (contests user has joined)
  getMyContests: async (userId, query) => {
    const { page, limit, skip } = getPagination(query);
    
    const userContestTeams = await ContestTeam.find({ user: userId })
      .distinct('contest');

    const [contests, total] = await Promise.all([
      Contest.find({ 
        _id: { $in: userContestTeams },
        isActive: true 
      })
        .populate('match', 'team1 team2 scheduledDate status')
        .skip(skip)
        .limit(limit),
      Contest.countDocuments({ 
        _id: { $in: userContestTeams },
        isActive: true 
      })
    ]);

    return {
      contests,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  },

  // Get contest by invite code
  getContestByInviteCode: async (code) => {
    const contest = await Contest.findOne({
      'inviteCodes.code': code,
      isActive: true
    })
      .populate('match', 'team1 team2 scheduledDate');
    
    if (!contest) throw new ApiError(404, 'Contest not found');
    return contest;
  }
};

// Helper function to generate prize distribution
function generatePrizeDistribution(prizePool, totalSpots) {
  const distribution = [];
  const topPercent = 0.25; // Top 25% get prizes
  
  const prizeSpots = Math.ceil(totalSpots * topPercent);
  const prizePerSpot = prizePool / prizeSpots;
  
  // Distribute prizes
  for (let i = 1; i <= prizeSpots; i++) {
    distribution.push({
      rankStart: i,
      rankEnd: i,
      prize: Math.floor(prizePerSpot * (1 - (i / prizeSpots) * 0.5))
    });
  }
  
  return distribution;
}

export default contestService;
