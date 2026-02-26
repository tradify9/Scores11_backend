import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory (2 levels up from seeds folder)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Import all models
import User from '../modules/user/user.model.js';
import Team from '../modules/team/team.model.js';
import Player from '../modules/player/player.model.js';
import Match from '../modules/match/match.model.js';
import Tournament from '../modules/tournament/tournament.model.js';
import Blog from '../modules/blog/blog.model.js';
import News from '../modules/news/news.model.js';
import Club from '../modules/club/club.model.js';
import Association from '../modules/association/association.model.js';
import Award from '../modules/award/award.model.js';
import Subscription from '../modules/subscription/subscription.model.js';
import Wallet from '../modules/wallet/wallet.model.js';
import Notification from '../modules/notification/notification.model.js';
import Review from '../modules/review/review.model.js';
import Contact from '../modules/contact/contact.model.js';
import Product from '../modules/store/product.model.js';
import Settings from '../modules/settings/settings.model.js';
import Leaderboard from '../modules/leaderboard/leaderboard.model.js';
import Contest from '../modules/contest/contest.model.js';

import { ROLES } from '../constants/roles.js';
import { MATCH_STATUS, TOSS_DECISION } from '../constants/matchStatus.js';
import { TOURNAMENT_STATUS, TOURNAMENT_FORMAT } from '../constants/tournamentStatus.js';

const seedAll = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in .env file');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('🗑️ Clearing existing data...');
    await User.deleteMany({});
    await Team.deleteMany({});
    await Player.deleteMany({});
    await Match.deleteMany({});
    await Tournament.deleteMany({});
    await Blog.deleteMany({});
    await News.deleteMany({});
    await Club.deleteMany({});
    await Association.deleteMany({});
    await Award.deleteMany({});
    await Subscription.deleteMany({});
    await Wallet.deleteMany({});
    await Notification.deleteMany({});
    await Review.deleteMany({});
    await Contact.deleteMany({});
    await Product.deleteMany({});
    await Settings.deleteMany({});
    await Leaderboard.deleteMany({});
    await Contest.deleteMany({});

    console.log('🌱 Starting seed process...\n');

    // 1. Create Users
    console.log('👤 Creating users...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    const adminUser = await User.create({
      email: 'admin@crick11.com',
      password: hashedPassword,
      name: 'Admin User',
      phone: '+919999999999',
      role: ROLES.ADMIN,
      isEmailVerified: true,
      isActive: true,
      gender: 'male',
      address: { city: 'Mumbai', state: 'Maharashtra', country: 'India' }
    });

    const organizerUser = await User.create({
      email: 'organizer@crick11.com',
      password: hashedPassword,
      name: 'John Organizer',
      phone: '+919888888888',
      role: ROLES.ORGANIZER,
      isEmailVerified: true,
      isActive: true,
      gender: 'male',
      address: { city: 'Delhi', state: 'Delhi', country: 'India' }
    });

    const regularUsers = await User.insertMany([
      {
        email: 'rahul.sharma@crick11.com',
        password: hashedPassword,
        name: 'Rahul Sharma',
        phone: '+919977766655',
        role: ROLES.USER,
        isEmailVerified: true,
        isActive: true,
        gender: 'male',
        dateOfBirth: new Date('1995-03-15'),
        address: { city: 'Mumbai', state: 'Maharashtra', country: 'India', pincode: '400001' }
      },
      {
        email: 'priya.patel@crick11.com',
        password: hashedPassword,
        name: 'Priya Patel',
        phone: '+919966655443',
        role: ROLES.USER,
        isEmailVerified: true,
        isActive: true,
        gender: 'female',
        dateOfBirth: new Date('1998-07-22'),
        address: { city: 'Ahmedabad', state: 'Gujarat', country: 'India', pincode: '380001' }
      },
      {
        email: 'vikram.singh@crick11.com',
        password: hashedPassword,
        name: 'Vikram Singh',
        phone: '+919955544332',
        role: ROLES.USER,
        isEmailVerified: true,
        isActive: true,
        gender: 'male',
        dateOfBirth: new Date('1992-11-08'),
        address: { city: 'Jaipur', state: 'Rajasthan', country: 'India', pincode: '302001' }
      },
      {
        email: 'sneha.kumar@crick11.com',
        password: hashedPassword,
        name: 'Sneha Kumar',
        phone: '+919944433221',
        role: ROLES.USER,
        isEmailVerified: true,
        isActive: true,
        gender: 'female',
        dateOfBirth: new Date('1996-05-30'),
        address: { city: 'Bangalore', state: 'Karnataka', country: 'India', pincode: '560001' }
      },
      {
        email: 'amit.yadav@crick11.com',
        password: hashedPassword,
        name: 'Amit Yadav',
        phone: '+919933322110',
        role: ROLES.USER,
        isEmailVerified: true,
        isActive: true,
        gender: 'male',
        dateOfBirth: new Date('1994-09-12'),
        address: { city: 'Lucknow', state: 'Uttar Pradesh', country: 'India', pincode: '226001' }
      }
    ]);

    const allUsers = [adminUser, organizerUser, ...regularUsers];
    console.log(`   ✅ Created ${allUsers.length} users`);

    // 2. Create Teams
    console.log('🏏 Creating teams...');
    const teams = await Team.insertMany([
      {
        name: 'Mumbai Indians',
        shortName: 'MI',
        owner: organizerUser._id,
        coach: 'Mahela Jayawardene',
        homeGround: 'Wankhede Stadium',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        description: 'Five-time IPL champions and one of the most successful cricket teams in India.',
        isActive: true,
        isVerified: true,
        stats: { matchesPlayed: 250, matchesWon: 160, matchesLost: 85, matchesTied: 5, totalRuns: 45000, totalWickets: 800 }
      },
      {
        name: 'Chennai Super Kings',
        shortName: 'CSK',
        owner: allUsers[2]._id,
        coach: 'Stephen Fleming',
        homeGround: 'MA Chidambaram Stadium',
        city: 'Chennai',
        state: 'Tamil Nadu',
        country: 'India',
        description: 'Consistent performers in IPL with three championship titles.',
        isActive: true,
        isVerified: true,
        stats: { matchesPlayed: 220, matchesWon: 140, matchesLost: 75, matchesTied: 5, totalRuns: 38000, totalWickets: 720 }
      },
      {
        name: 'Royal Challengers Bangalore',
        shortName: 'RCB',
        owner: allUsers[3]._id,
        coach: 'Andy Flower',
        homeGround: 'M. Chinnaswamy Stadium',
        city: 'Bangalore',
        state: 'Karnataka',
        country: 'India',
        description: 'One of the most popular teams with passionate fan following.',
        isActive: true,
        isVerified: true,
        stats: { matchesPlayed: 230, matchesWon: 130, matchesLost: 95, matchesTied: 5, totalRuns: 41000, totalWickets: 680 }
      },
      {
        name: 'Kolkata Knight Riders',
        shortName: 'KKR',
        owner: allUsers[4]._id,
        coach: 'Shah Rukh Khan',
        homeGround: 'Eden Gardens',
        city: 'Kolkata',
        state: 'West Bengal',
        country: 'India',
        description: 'Two-time IPL champions known for their aggressive brand of cricket.',
        isActive: true,
        isVerified: true,
        stats: { matchesPlayed: 210, matchesWon: 115, matchesLost: 90, matchesTied: 5, totalRuns: 35000, totalWickets: 650 }
      },
      {
        name: 'Delhi Capitals',
        shortName: 'DC',
        owner: organizerUser._id,
        coach: 'Ricky Ponting',
        homeGround: 'Arun Jaitley Stadium',
        city: 'Delhi',
        state: 'Delhi',
        country: 'India',
        description: 'Young and dynamic team with rising stars.',
        isActive: true,
        isVerified: true,
        stats: { matchesPlayed: 180, matchesWon: 95, matchesLost: 80, matchesTied: 5, totalRuns: 30000, totalWickets: 550 }
      },
      {
        name: 'Sunrisers Hyderabad',
        shortName: 'SRH',
        owner: allUsers[2]._id,
        coach: 'Tom Moody',
        homeGround: 'Rajiv Gandhi International Cricket Stadium',
        city: 'Hyderabad',
        state: 'Telangana',
        country: 'India',
        description: 'One-time IPL champions with strong bowling attack.',
        isActive: true,
        isVerified: true,
        stats: { matchesPlayed: 190, matchesWon: 100, matchesLost: 85, matchesTied: 5, totalRuns: 32000, totalWickets: 620 }
      }
    ]);
    console.log(`   ✅ Created ${teams.length} teams`);

    // 3. Create Players
    console.log('🎾 Creating players...');
    const players = await Player.insertMany([
      {
        user: allUsers[2]._id,
        team: teams[0]._id,
        playerName: 'Rohit Sharma',
        jerseyNumber: 45,
        role: 'batsman',
        battingStyle: 'right-hand bat',
        bowlingStyle: 'right-arm medium',
        dateOfBirth: new Date('1987-04-30'),
        placeOfBirth: 'Nagpur',
        height: '5.8',
        weight: '75',
        bio: 'Indian international cricketer and captain of Mumbai Indians. One of the most successful captains in IPL history.',
        isActive: true,
        isVerified: true,
        battingStats: { matches: 250, innings: 240, runs: 8500, highestScore: 264, average: 42.5, strikeRate: 145.2, fifties: 60, centuries: 2, fours: 850, sixes: 450 },
        bowlingStats: { matches: 50, innings: 30, wickets: 15, runsConceded: 450, overs: 40, economy: 11.25, bestFigures: { wickets: 3, runs: 25 }, fiveWickets: 0 }
      },
      {
        user: allUsers[3]._id,
        team: teams[0]._id,
        playerName: 'Jasprit Bumrah',
        jerseyNumber: 93,
        role: 'bowler',
        battingStyle: 'right-hand bat',
        bowlingStyle: 'right-arm fast',
        dateOfBirth: new Date('1993-03-06'),
        placeOfBirth: 'Ahmedabad',
        height: '6.0',
        weight: '80',
        bio: 'One of the best fast bowlers in world cricket currently.',
        isActive: true,
        isVerified: true,
        battingStats: { matches: 120, innings: 60, runs: 450, highestScore: 35, average: 12.5, strikeRate: 120.5, fifties: 0, centuries: 0, fours: 40, sixes: 25 },
        bowlingStats: { matches: 120, innings: 120, wickets: 180, runsConceded: 4200, overs: 450, economy: 9.33, bestFigures: { wickets: 5, runs: 12 }, fiveWickets: 2 }
      },
      {
        user: allUsers[4]._id,
        team: teams[1]._id,
        playerName: 'MS Dhoni',
        jerseyNumber: 7,
        role: 'wicket-keeper',
        battingStyle: 'right-hand bat',
        bowlingStyle: 'none',
        dateOfBirth: new Date('1981-07-07'),
        placeOfBirth: 'Ranchi',
        height: '6.0',
        weight: '78',
        bio: 'Legendary Indian captain with three ICC trophies.',
        isActive: true,
        isVerified: true,
        battingStats: { matches: 350, innings: 320, runs: 12000, highestScore: 224, average: 50.5, strikeRate: 137.5, fifties: 80, centuries: 10, fours: 1100, sixes: 650 },
        bowlingStats: { matches: 0, innings: 0, wickets: 0, runsConceded: 0, overs: 0, economy: 0, bestFigures: { wickets: 0, runs: 0 }, fiveWickets: 0 },
        fieldingStats: { catches: 120, stumpings: 45, runOuts: 30 }
      },
      {
        user: allUsers[2]._id,
        team: teams[1]._id,
        playerName: 'Ravindra Jadeja',
        jerseyNumber: 8,
        role: 'all-rounder',
        battingStyle: 'left-hand bat',
        bowlingStyle: 'left-arm medium',
        dateOfBirth: new Date('1988-12-06'),
        placeOfBirth: 'Jamnavar',
        height: '5.10',
        weight: '72',
        bio: 'Indian all-rounder known for his explosive batting and tight bowling.',
        isActive: true,
        isVerified: true,
        battingStats: { matches: 300, innings: 250, runs: 6500, highestScore: 92, average: 32.5, strikeRate: 135.5, fifties: 40, centuries: 0, fours: 600, sixes: 350 },
        bowlingStats: { matches: 300, innings: 280, wickets: 350, runsConceded: 8500, overs: 1200, economy: 7.08, bestFigures: { wickets: 5, runs: 16 }, fiveWickets: 8 }
      },
      {
        user: allUsers[3]._id,
        team: teams[2]._id,
        playerName: 'Virat Kohli',
        jerseyNumber: 18,
        role: 'batsman',
        battingStyle: 'right-hand bat',
        bowlingStyle: 'right-arm medium',
        dateOfBirth: new Date('1988-11-05'),
        placeOfBirth: 'Delhi',
        height: '5.9',
        weight: '75',
        bio: 'One of the greatest batsmen of all time.',
        isActive: true,
        isVerified: true,
        battingStats: { matches: 400, innings: 380, runs: 15000, highestScore: 254, average: 58.5, strikeRate: 142.5, fifties: 100, centuries: 70, fours: 1400, sixes: 550 }
      },
      {
        user: allUsers[4]._id,
        team: teams[2]._id,
        playerName: 'AB de Villiers',
        jerseyNumber: 17,
        role: 'batsman',
        battingStyle: 'right-hand bat',
        bowlingStyle: 'none',
        dateOfBirth: new Date('1984-02-17'),
        placeOfBirth: 'Pretoria',
        height: '6.0',
        weight: '80',
        bio: 'Mr. 360 - known for his revolutionary batting.',
        isActive: true,
        isVerified: true,
        battingStats: { matches: 250, innings: 240, runs: 9500, highestScore: 176, average: 45.2, strikeRate: 165.5, fifties: 55, centuries: 20, fours: 900, sixes: 600 }
      },
      {
        user: allUsers[2]._id,
        team: teams[3]._id,
        playerName: 'Shubman Gill',
        jerseyNumber: 77,
        role: 'batsman',
        battingStyle: 'right-hand bat',
        bowlingStyle: 'none',
        dateOfBirth: new Date('1999-09-08'),
        placeOfBirth: 'Ferozepur',
        height: '6.0',
        weight: '70',
        bio: 'Young talent with huge potential.',
        isActive: true,
        isVerified: true,
        battingStats: { matches: 80, innings: 75, runs: 2800, highestScore: 128, average: 42.5, strikeRate: 145.5, twenties: 25, centuries: 5, fours: 280, sixes: 120 }
      },
      {
        user: allUsers[3]._id,
        team: teams[4]._id,
        playerName: 'Rishabh Pant',
        jerseyNumber: 17,
        role: 'wicket-keeper',
        battingStyle: 'left-hand bat',
        bowlingStyle: 'none',
        dateOfBirth: new Date('1997-10-04'),
        placeOfBirth: 'Rohtak',
        height: '6.0',
        weight: '72',
        bio: 'Explosive wicket-keeper batsman.',
        isActive: true,
        isVerified: true,
        battingStats: { matches: 100, innings: 95, runs: 3500, highestScore: 208, average: 40.5, strikeRate: 155.5, fifties: 20, centuries: 5, fours: 350, sixes: 200 }
      },
      {
        user: allUsers[4]._id,
        team: teams[5]._id,
        playerName: 'Pat Cummins',
        jerseyNumber: 30,
        role: 'bowler',
        battingStyle: 'right-hand bat',
        bowlingStyle: 'right-arm fast',
        dateOfBirth: new Date('1993-05-08'),
        placeOfBirth: 'Sydney',
        height: '6.4',
        weight: '85',
        bio: 'World-class fast bowler and Australian captain.',
        isActive: true,
        isVerified: true,
        battingStats: { matches: 80, innings: 50, runs: 1200, highestScore: 75, average: 28.5, strikeRate: 135.5, fifties: 5, centuries: 0, fours: 120, sixes: 60 },
        bowlingStats: { matches: 80, innings: 80, wickets: 150, runsConceded: 2800, overs: 320, economy: 8.75, bestFigures: { wickets: 6, runs: 23 }, fiveWickets: 5 }
      },
      {
        user: allUsers[2]._id,
        team: teams[5]._id,
        playerName: 'Kane Williamson',
        jerseyNumber: 22,
        role: 'batsman',
        battingStyle: 'right-hand bat',
        bowlingStyle: 'off-spin',
        dateOfBirth: new Date('1990-08-08'),
        placeOfBirth: 'Auckland',
        height: '5.10',
        weight: '72',
        bio: 'Technical batsman and former New Zealand captain.',
        isActive: true,
        isVerified: true,
        battingStats: { matches: 200, innings: 195, runs: 8500, highestScore: 251, average: 52.5, strikeRate: 135.5, fifties: 55, centuries: 25, fours: 850, sixes: 250 }
      }
    ]);
    console.log(`   ✅ Created ${players.length} players`);

    // Update teams with players
    teams[0].players = [players[0]._id, players[1]._id];
    teams[1].players = [players[2]._id, players[3]._id];
    teams[2].players = [players[4]._id, players[5]._id];
    teams[3].players = [players[6]._id];
    teams[4].players = [players[7]._id];
    teams[5].players = [players[8]._id, players[9]._id];
    await Team.bulkSave(teams);

    // 4. Create Tournaments
    console.log('🏆 Creating tournaments...');
    const tournaments = await Tournament.insertMany([
      {
        name: 'Indian Premier League 2024',
        description: 'The biggest T20 cricket league in the world featuring top international players.',
        organizer: organizerUser._id,
        startDate: new Date('2024-03-22'),
        endDate: new Date('2024-05-26'),
        venue: { name: 'Multiple Venues', city: 'India', country: 'India' },
        format: TOURNAMENT_FORMAT.T20,
        status: TOURNAMENT_STATUS.COMPLETED,
        teams: teams.slice(0, 6).map(t => t._id),
        totalMatches: 74,
        prizeMoney: 20000000,
        isActive: true
      },
      {
        name: 'Champions Trophy 2024',
        description: 'ICC Champions Trophy featuring top 8 ODI teams.',
        organizer: organizerUser._id,
        startDate: new Date('2024-06-15'),
        endDate: new Date('2024-07-15'),
        venue: { name: 'Multiple Venues', city: 'USA/West Indies', country: 'USA' },
        format: TOURNAMENT_FORMAT.ODI,
        status: TOURNAMENT_STATUS.ONGOING,
        teams: teams.slice(0, 4).map(t => t._id),
        totalMatches: 15,
        prizeMoney: 5000000,
        isActive: true
      },
      {
        name: 'World Cup 2025',
        description: 'ICC Cricket World Cup 2025 - The biggest cricketing event.',
        organizer: adminUser._id,
        startDate: new Date('2025-10-15'),
        endDate: new Date('2025-11-30'),
        venue: { name: 'Multiple Venues', city: 'India', country: 'India' },
        format: TOURNAMENT_FORMAT.ODI,
        status: TOURNAMENT_STATUS.UPCOMING,
        teams: [],
        totalMatches: 48,
        prizeMoney: 10000000,
        isActive: true
      },
      {
        name: 'Asia Cup 2024',
        description: 'ACC Asia Cup T20 tournament.',
        organizer: organizerUser._id,
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-09-15'),
        venue: { name: 'R. Premadasa Stadium', city: 'Colombo', country: 'Sri Lanka' },
        format: TOURNAMENT_FORMAT.T20,
        status: TOURNAMENT_STATUS.UPCOMING,
        teams: teams.slice(0, 4).map(t => t._id),
        totalMatches: 13,
        prizeMoney: 1000000,
        isActive: true
      }
    ]);
    console.log(`   ✅ Created ${tournaments.length} tournaments`);

    // 5. Create Matches
    console.log('🎯 Creating matches...');
    const matches = await Match.insertMany([
      {
        team1: teams[0]._id,
        team2: teams[1]._id,
        tournament: tournaments[0]._id,
        venue: { name: 'Wankhede Stadium', city: 'Mumbai', country: 'India' },
        scheduledDate: new Date('2024-04-02'),
        status: MATCH_STATUS.COMPLETED,
        toss: { winner: teams[0]._id, decision: TOSS_DECISION.BAT },
        result: { winner: teams[0]._id, margin: '5 wickets', playerOfMatch: players[0]._id },
        score: { team1: { runs: 185, wickets: 5, overs: '20.0' }, team2: { runs: 180, wickets: 10, overs: '19.5' } },
        isActive: true
      },
      {
        team1: teams[2]._id,
        team2: teams[3]._id,
        tournament: tournaments[0]._id,
        venue: { name: 'M. Chinnaswamy Stadium', city: 'Bangalore', country: 'India' },
        scheduledDate: new Date('2024-04-03'),
        status: MATCH_STATUS.COMPLETED,
        toss: { winner: teams[2]._id, decision: TOSS_DECISION.BOWL },
        result: { winner: teams[2]._id, margin: '8 wickets', playerOfMatch: players[4]._id },
        score: { team1: { runs: 210, wickets: 2, overs: '18.4' }, team2: { runs: 205, wickets: 8, overs: '20.0' } },
        isActive: true
      },
      {
        team1: teams[4]._id,
        team2: teams[5]._id,
        tournament: tournaments[0]._id,
        venue: { name: 'Arun Jaitley Stadium', city: 'Delhi', country: 'India' },
        scheduledDate: new Date('2024-04-04'),
        status: MATCH_STATUS.COMPLETED,
        toss: { winner: teams[4]._id, decision: TOSS_DECISION.BAT },
        result: { winner: teams[5]._id, margin: '10 runs', playerOfMatch: players[8]._id },
        score: { team1: { runs: 165, wickets: 10, overs: '19.2' }, team2: { runs: 175, wickets: 4, overs: '19.1' } },
        isActive: true
      },
      {
        team1: teams[0]._id,
        team2: teams[2]._id,
        tournament: tournaments[1]._id,
        venue: { name: 'Nassau County Stadium', city: 'New York', country: 'USA' },
        scheduledDate: new Date('2024-06-20'),
        status: MATCH_STATUS.LIVE,
        toss: { winner: teams[0]._id, decision: TOSS_DECISION.BOWL },
        score: { team1: { runs: 120, wickets: 2, overs: '14.0' }, team2: { runs: 0, wickets: 0, overs: '0.0' } },
        isActive: true
      },
      {
        team1: teams[1]._id,
        team2: teams[3]._id,
        tournament: tournaments[2]._id,
        venue: { name: 'Wankhede Stadium', city: 'Mumbai', country: 'India' },
        scheduledDate: new Date('2025-10-20'),
        status: MATCH_STATUS.SCHEDULED,
        isActive: true
      },
      {
        team1: teams[4]._id,
        team2: teams[5]._id,
        tournament: tournaments[2]._id,
        venue: { name: 'Eden Gardens', city: 'Kolkata', country: 'India' },
        scheduledDate: new Date('2025-10-22'),
        status: MATCH_STATUS.SCHEDULED,
        isActive: true
      },
      {
        team1: teams[0]._id,
        team2: teams[4]._id,
        tournament: tournaments[0]._id,
        venue: { name: 'Wankhede Stadium', city: 'Mumbai', country: 'India' },
        scheduledDate: new Date('2024-04-05'),
        status: MATCH_STATUS.CANCELLED,
        isActive: true
      }
    ]);
    console.log(`   ✅ Created ${matches.length} matches`);

    // 6. Create Blogs
    console.log('📝 Creating blogs...');
    const blogs = await Blog.insertMany([
      {
        title: 'IPL 2024: Top 5 Players to Watch',
        slug: 'ipl-2024-top-5-players-to-watch',
        content: 'The IPL 2024 season promises to be exciting with many young talents making their mark. Here are our top 5 players to watch this season...',
        author: adminUser._id,
        category: 'cricket',
        status: 'published',
        image: { publicId: 'blog1', url: 'https://example.com/blog1.jpg' },
        tags: ['IPL', 'Cricket', '2024'],
        views: 15000,
        isActive: true
      },
      {
        title: 'Understanding T20 Cricket Strategy',
        slug: 'understanding-t20-cricket-strategy',
        content: 'T20 cricket has revolutionized the way the game is played. In this article, we explore the key strategies that teams use to win matches...',
        author: organizerUser._id,
        category: 'analysis',
        status: 'published',
        image: { publicId: 'blog2', url: 'https://example.com/blog2.jpg' },
        tags: ['Strategy', 'T20', 'Cricket'],
        views: 8500,
        isActive: true
      },
      {
        title: 'The Rise of Indian Cricket',
        slug: 'the-rise-of-indian-cricket',
        content: 'Indian cricket has seen tremendous growth over the years. From humble beginnings to dominating world cricket, journey has been remarkable...',
        author: adminUser._id,
        category: 'cricket',
        status: 'published',
        image: { publicId: 'blog3', url: 'https://example.com/blog3.jpg' },
        tags: ['India', 'Cricket', 'History'],
        views: 12000,
        isActive: true
      },
      {
        title: 'Fantasy Cricket Tips for Beginners',
        slug: 'fantasy-cricket-tips-for-beginners',
        content: 'Fantasy cricket is becoming increasingly popular. Here are some tips to help beginners create winning teams...',
        author: regularUsers[0]._id,
        category: 'analysis',
        status: 'published',
        tags: ['Fantasy', 'Tips', 'Beginners'],
        views: 20000,
        isActive: true
      },
      {
        title: 'Upcoming Young Talents in Indian Cricket',
        slug: 'upcoming-young-talents-in-indian-cricket',
        content: 'India has produced several young talents in recent years. Let\'s look at some of the most promising young cricketers...',
        author: organizerUser._id,
        category: 'player',
        status: 'draft',
        tags: ['Talents', 'Young', 'Future'],
        views: 5000,
        isActive: true
      }
    ]);
    console.log(`   ✅ Created ${blogs.length} blogs`);

    // 7. Create News
    console.log('📰 Creating news...');
    const news = await News.insertMany([
      {
        title: 'Rohit Sharma scores 50th IPL fifty',
        slug: 'rohit-sharma-scores-50th-ipl-fifty',
        content: 'Mumbai Indians captain Rohit Sharma achieved a major milestone by scoring his 50th IPL fifty in the match against Chennai Super Kings...',
        author: adminUser._id,
        category: 'match-report',
        status: 'published',
        image: { publicId: 'news1', url: 'https://example.com/news1.jpg' },
        tags: ['rohit sharma', 'ipl', 'mumbai indians'],
        views: 25000,
        isActive: true
      },
      {
        title: 'Injury Update: Jasprit Bumrah returns to bowling',
        slug: 'injury-update-jasprit-bumrah-returns-to-bowling',
        content: 'Good news for Indian cricket fans as Jasprit Bumrah has resumed bowling in nets after his injury layoff...',
        author: organizerUser._id,
        category: 'player-news',
        status: 'published',
        image: { publicId: 'news2', url: 'https://example.com/news2.jpg' },
        tags: ['injury', 'bumrah', 'team india'],
        views: 18000,
        isActive: true
      },
      {
        title: 'IPL 2024 Auction: Biggest Trades',
        slug: 'ipl-2024-auction-biggest-trades',
        content: 'The IPL 2024 auction saw some major trades. Here\'s a complete breakdown of all the significant player movements...',
        author: adminUser._id,
        category: 'tournament-update',
        status: 'published',
        tags: ['auction', 'ipl', '2024'],
        views: 35000,
        isActive: true
      },
      {
        title: 'World Cup 2025: Schedule Announced',
        slug: 'world-cup-2025-schedule-announced',
        content: 'ICC has announced the complete schedule for the 2025 Cricket World Cup to be held in India...',
        author: organizerUser._id,
        category: 'tournament-update',
        status: 'published',
        tags: ['world cup', 'schedule', 'icc'],
        views: 45000,
        isActive: true
      },
      {
        title: 'New Cricket Stadium inaugurated in Mumbai',
        slug: 'new-cricket-stadium-inaugurated-in-mumbai',
        content: 'A new state-of-the-art cricket stadium was inaugurated in Mumbai today with a grand ceremony...',
        author: regularUsers[1]._id,
        category: 'other',
        status: 'published',
        tags: ['stadium', 'mumbai', 'cricket'],
        views: 12000,
        isActive: true
      }
    ]);
    console.log(`   ✅ Created ${news.length} news articles`);

    // 8. Create Clubs
    console.log('🏟️ Creating clubs...');
    const clubs = await Club.insertMany([
      {
        name: 'Mumbai Cricket Club',
        owner: adminUser._id,
        description: 'One of the oldest and most prestigious cricket clubs in India.',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        foundedYear: 1930,
        contactEmail: 'info@mumbaicricketclub.com',
        contactPhone: '+912212345678',
        isVerified: true,
        isActive: true
      },
      {
        name: 'Delhi Cricket Club',
        owner: organizerUser._id,
        description: 'Leading cricket club in Delhi with excellent facilities.',
        city: 'Delhi',
        state: 'Delhi',
        country: 'India',
        foundedYear: 1945,
        contactEmail: 'info@delhicricketclub.com',
        contactPhone: '+911123456789',
        isVerified: true,
        isActive: true
      },
      {
        name: 'Bangalore Cricket Club',
        owner: regularUsers[3]._id,
        description: 'Modern cricket club with state-of-the-art facilities.',
        city: 'Bangalore',
        state: 'Karnataka',
        country: 'India',
        foundedYear: 2000,
        contactEmail: 'info@bangalorecricketclub.com',
        contactPhone: '+918012345678',
        isVerified: true,
        isActive: true
      }
    ]);
    console.log(`   ✅ Created ${clubs.length} clubs`);

    // 9. Create Associations
    console.log('🏛️ Creating associations...');
    const associations = await Association.insertMany([
      {
        name: 'Board of Control for Cricket in India',
        shortName: 'BCCI',
        president: adminUser._id,
        headquarters: 'Mumbai',
        description: 'National governing body for cricket in India.',
        website: 'www.bcci.org',
        foundedYear: 1928,
        isActive: true
      },
      {
        name: 'Maharashtra Cricket Association',
        shortName: 'MCA',
        president: organizerUser._id,
        headquarters: 'Mumbai',
        description: 'State cricket association for Maharashtra.',
        website: 'www.maharashtracricket.com',
        foundedYear: 1930,
        isActive: true
      },
      {
        name: 'Karnataka State Cricket Association',
        shortName: 'KSCA',
        president: regularUsers[3]._id,
        headquarters: 'Bangalore',
        description: 'State cricket association for Karnataka.',
        website: 'www.karnatakacricket.com',
        foundedYear: 1930,
        isActive: true
      }
    ]);
    console.log(`   ✅ Created ${associations.length} associations`);

    // 10. Create Awards - Fixed with correct enum values and winners array
    console.log('🏅 Creating awards...');
    const awards = await Award.insertMany([
      {
        name: 'Player of the Tournament',
        description: 'Award for the best player of the tournament',
        tournament: tournaments[0]._id,
        awardType: 'PLAYER_OF_TOURNAMENT',
        year: 2024,
        winners: [{ rank: 1, player: players[0]._id, team: teams[0]._id, points: 2500 }],
        prizeMoney: 1000000,
        isActive: true
      },
      {
        name: 'Orange Cap',
        description: 'Highest run scorer award',
        tournament: tournaments[0]._id,
        awardType: 'BEST_BATSMAN',
        year: 2024,
        winners: [{ rank: 1, player: players[4]._id, team: teams[2]._id, points: 850 }],
        prizeMoney: 500000,
        isActive: true
      },
      {
        name: 'Purple Cap',
        description: 'Highest wicket taker award',
        tournament: tournaments[0]._id,
        awardType: 'BEST_BOWLER',
        year: 2024,
        winners: [{ rank: 1, player: players[1]._id, team: teams[0]._id, points: 45 }],
        prizeMoney: 500000,
        isActive: true
      },
      {
        name: 'Best Young Player Award',
        description: 'Best young player of the tournament',
        tournament: tournaments[0]._id,
        awardType: 'PLAYER_OF_TOURNAMENT',
        year: 2024,
        winners: [{ rank: 1, player: players[6]._id, team: teams[3]._id, points: 320 }],
        prizeMoney: 250000,
        isActive: true
      }
    ]);
    console.log(`   ✅ Created ${awards.length} awards`);

    // 11. Create Subscriptions - Fixed with required fields
    console.log('💳 Creating subscriptions...');
    const subscriptions = await Subscription.insertMany([
      {
        user: adminUser._id,
        plan: 'PRO',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2025-01-01'),
        isActive: true,
        autoRenew: true,
        amount: 6999,
        currency: 'INR',
        features: {
          createTournaments: 10,
          createTeams: 10,
          joinTournaments: true,
          adFree: true,
          prioritySupport: true,
          analytics: true,
          customBranding: true
        }
      },
      {
        user: organizerUser._id,
        plan: 'PREMIUM',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2025-03-01'),
        isActive: true,
        autoRenew: false,
        amount: 799,
        currency: 'INR',
        features: {
          createTournaments: 5,
          createTeams: 5,
          joinTournaments: true,
          adFree: true,
          prioritySupport: false,
          analytics: true,
          customBranding: false
        }
      },
      {
        user: regularUsers[0]._id,
        plan: 'BASIC',
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-07-01'),
        isActive: true,
        autoRenew: false,
        amount: 299,
        currency: 'INR',
        features: {
          createTournaments: 1,
          createTeams: 1,
          joinTournaments: true,
          adFree: false,
          prioritySupport: false,
          analytics: false,
          customBranding: false
        }
      }
    ]);
    console.log(`   ✅ Created ${subscriptions.length} subscriptions`);

    // 12. Create Wallets
    console.log('💰 Creating wallets...');
    const wallets = await Wallet.insertMany([
      { user: adminUser._id, balance: 50000, currency: 'INR', isActive: true },
      { user: organizerUser._id, balance: 25000, currency: 'INR', isActive: true },
      { user: regularUsers[0]._id, balance: 15000, currency: 'INR', isActive: true },
      { user: regularUsers[1]._id, balance: 8000, currency: 'INR', isActive: true },
      { user: regularUsers[2]._id, balance: 12000, currency: 'INR', isActive: true }
    ]);
    console.log(`   ✅ Created ${wallets.length} wallets`);

    // 13. Create Notifications
    console.log('🔔 Creating notifications...');
    const notifications = await Notification.insertMany([
      {
        user: regularUsers[0]._id,
        title: 'Match Starting Soon',
        message: 'Mumbai Indians vs Chennai Super Kings starts in 1 hour',
        type: 'match',
        isRead: false,
        isActive: true
      },
      {
        user: regularUsers[1]._id,
        title: 'New Blog Posted',
        message: 'Check out our latest article on IPL 2024',
        type: 'blog',
        isRead: true,
        isActive: true
      },
      {
        user: regularUsers[2]._id,
        title: 'Points Updated',
        message: 'Your fantasy team points have been updated',
        type: 'fantasy',
        isRead: false,
        isActive: true
      },
      {
        user: regularUsers[3]._id,
        title: 'Contest Winner',
        message: 'Congratulations! You won the contest',
        type: 'contest',
        isRead: false,
        isActive: true
      }
    ]);
    console.log(`   ✅ Created ${notifications.length} notifications`);

    // 14. Create Reviews
    console.log('⭐ Creating reviews...');
    const reviews = await Review.insertMany([
      {
        user: regularUsers[0]._id,
        rating: 5,
        comment: 'Great platform for cricket fans!',
        entityType: 'platform',
        entityId: 'platform1',
        isApproved: true,
        isActive: true
      },
      {
        user: regularUsers[1]._id,
        rating: 4,
        comment: 'Good fantasy league experience',
        entityType: 'fantasy',
        entityId: 'fantasy1',
        isApproved: true,
        isActive: true
      },
      {
        user: regularUsers[2]._id,
        rating: 5,
        comment: 'Excellent match updates and news',
        entityType: 'news',
        entityId: news[0]._id,
        isApproved: true,
        isActive: true
      }
    ]);
    console.log(`   ✅ Created ${reviews.length} reviews`);

    // 15. Create Contact Messages
    console.log('📧 Creating contact messages...');
    const contacts = await Contact.insertMany([
      {
        name: 'Rahul Sharma',
        email: 'rahul@example.com',
        phone: '+919999999999',
        subject: 'billing',
        message: 'I want to know more about the premium subscription plan.',
        status: 'open',
        priority: 'high',
        isActive: true
      },
      {
        name: 'Priya Patel',
        email: 'priya@example.com',
        subject: 'feedback',
        message: 'Great app! Love the match updates.',
        status: 'resolved',
        priority: 'low',
        reply: 'Thank you for your feedback!',
        isActive: true
      }
    ]);
    console.log(`   ✅ Created ${contacts.length} contact messages`);

    // 16. Create Products
    console.log('🛒 Creating products...');
    const products = await Product.insertMany([
      {
        name: 'Official IPL Jersey - Mumbai Indians',
        description: 'Authentic Mumbai Indians jersey with player patch',
        price: 2999,
        category: 'jersey',
        stock: 100,
        images: [{ publicId: 'prod1', url: 'https://example.com/mi-jersey.jpg' }],
        isActive: true
      },
      {
        name: 'Cricket Bat - SG',
        description: 'Professional grade cricket bat',
        price: 4500,
        category: 'bat',
        stock: 50,
        images: [{ publicId: 'prod2', url: 'https://example.com/sg-bat.jpg' }],
        isActive: true
      },
      {
        name: 'Cricket Ball Pack',
        description: 'Box of 6 premium leather cricket balls',
        price: 1200,
        category: 'ball',
        stock: 200,
        images: [{ publicId: 'prod3', url: 'https://example.com/ball.jpg' }],
        isActive: true
      },
      {
        name: 'Cricket Helmet',
        description: 'Professional cricket helmet with grill',
        price: 3500,
        category: 'gear',
        stock: 75,
        images: [{ publicId: 'prod4', url: 'https://example.com/helmet.jpg' }],
        isActive: true
      },
      {
        name: 'Crick11 T-Shirt',
        description: 'Official Crick11 merchandise t-shirt',
        price: 999,
        category: 'accessories',
        stock: 300,
        images: [{ publicId: 'prod5', url: 'https://example.com/tshirt.jpg' }],
        isActive: true
      }
    ]);
    console.log(`   ✅ Created ${products.length} products`);

    // 17. Create Settings
    console.log('⚙️ Creating settings...');
    const settings = await Settings.create({
      user: adminUser._id,
      notifications: {
        email: true,
        push: true,
        matchUpdates: true,
        tournamentUpdates: true,
        teamUpdates: true,
        promotions: true
      },
      privacy: {
        profileVisibility: 'public',
        showStats: true,
        showActivity: true
      },
      preferences: {
        language: 'en',
        timezone: 'Asia/Kolkata',
        theme: 'system',
        defaultFormat: 'T20'
      },
      twoFactorEnabled: false
    });
    console.log('   ✅ Created settings');

    // 18. Create Leaderboard
    console.log('📊 Creating leaderboard...');
    const leaderboard = await Leaderboard.create({
      user: adminUser._id,
      tournament: tournaments[0]._id,
      entries: [
        { user: regularUsers[0]._id, rank: 1, points: 2500, teamName: 'Mumbai Champs' },
        { user: regularUsers[1]._id, rank: 2, points: 2350, teamName: 'Super Kings Fan' },
        { user: regularUsers[2]._id, rank: 3, points: 2200, teamName: 'Royal Challengers' },
        { user: regularUsers[3]._id, rank: 4, points: 2100, teamName: 'Kolkata Knight' },
        { user: regularUsers[4]._id, rank: 5, points: 1950, teamName: 'Delhi Capitals' }
      ],
      isActive: true
    });
    console.log('   ✅ Created leaderboard');

    // 19. Create Contests
    console.log('🎮 Creating contests...');
    const contests = await Contest.insertMany([
      {
        name: 'Mega Contest - IPL 2024',
        description: 'Biggest contest with huge prize pool',
        match: matches[0]._id,
        createdBy: organizerUser._id,
        entryFee: 500,
        totalSpots: 10000,
        filledSpots: 10000,
        prizePool: 5000000,
        winnerPercentage: 20,
        status: 'COMPLETED',
        category: 'PAID',
        isMega: true,
        isActive: true
      },
      {
        name: 'Practice Contest',
        description: 'Practice contest with no entry fee',
        match: matches[3]._id,
        createdBy: organizerUser._id,
        entryFee: 0,
        totalSpots: 50000,
        filledSpots: 0,
        prizePool: 0,
        status: 'OPEN',
        category: 'PRACTICE',
        isActive: true
      },
      {
        name: 'Grand League',
        description: 'Premium contest for serious players',
        match: matches[4]._id,
        createdBy: adminUser._id,
        entryFee: 100,
        totalSpots: 25000,
        filledSpots: 0,
        prizePool: 2500000,
        winnerPercentage: 15,
        status: 'OPEN',
        category: 'PAID',
        isMega: true,
        isActive: true
      }
    ]);
    console.log(`   ✅ Created ${contests.length} contests`);

    console.log('\n🎉 Seed completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Users: ${allUsers.length} (including admin)`);
    console.log(`   - Teams: ${teams.length}`);
    console.log(`   - Players: ${players.length}`);
    console.log(`   - Tournaments: ${tournaments.length}`);
    console.log(`   - Matches: ${matches.length}`);
    console.log(`   - Blogs: ${blogs.length}`);
    console.log(`   - News: ${news.length}`);
    console.log(`   - Clubs: ${clubs.length}`);
    console.log(`   - Associations: ${associations.length}`);
    console.log(`   - Awards: ${awards.length}`);
    console.log(`   - Subscriptions: ${subscriptions.length}`);
    console.log(`   - Wallets: ${wallets.length}`);
    console.log(`   - Notifications: ${notifications.length}`);
    console.log(`   - Reviews: ${reviews.length}`);
    console.log(`   - Contact Messages: ${contacts.length}`);
    console.log(`   - Products: ${products.length}`);
    console.log(`   - Settings: 1`);
    console.log(`   - Leaderboard: 1`);
    console.log(`   - Contests: ${contests.length}`);

    console.log('\n🔑 Login Credentials:');
    console.log(`   Admin: admin@crick11.com / password123`);
    console.log(`   Organizer: organizer@crick11.com / password123`);
    console.log(`   User: rahul.sharma@crick11.com / password123`);

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding data:', error.message);
    process.exit(1);
  }
};

seedAll();
