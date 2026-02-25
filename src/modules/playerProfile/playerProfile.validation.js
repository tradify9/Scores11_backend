import Joi from 'joi';

export const createProfileSchema = Joi.object({
  fullName: Joi.string().min(2).max(100).required(),
  dateOfBirth: Joi.date().iso().required(),
  gender: Joi.string().valid('male', 'female', 'other').required(),
  nationality: Joi.string().default('India'),
  phone: Joi.string().min(10).max(15).required(),
  address: Joi.object({
    street: Joi.string(),
    city: Joi.string(),
    state: Joi.string(),
    pincode: Joi.string(),
    country: Joi.string()
  }),
  battingStyle: Joi.string().valid('right-hand bat', 'left-hand bat', 'right-hand bat (occasional)', 'left-hand bat (occasional)'),
  bowlingStyle: Joi.string().valid('right-arm fast', 'right-arm medium', 'right-arm off-spin', 'right-arm leg-spin', 'left-arm fast', 'left-arm medium', 'left-arm orthodox', 'left-arm wrist-spin', 'none'),
  role: Joi.string().valid('batsman', 'bowler', 'all-rounder', 'wicket-keeper', 'wicket-keeper batsman'),
  jerseyNumber: Joi.number().min(0).max(999),
  experience: Joi.object({
    years: Joi.number().min(0),
    level: Joi.string().valid('district', 'state', 'national', 'international', 'club', 'school', 'local')
  }),
  currentTeam: Joi.string(),
  achievements: Joi.array().items(Joi.object({
    title: Joi.string(),
    description: Joi.string(),
    year: Joi.number(),
    tournament: Joi.string(),
    award: Joi.string()
  })),
  stats: Joi.object({
    totalMatches: Joi.number().min(0),
    totalRuns: Joi.number().min(0),
    totalWickets: Joi.number().min(0),
    highestScore: Joi.number().min(0),
    bestBowling: Joi.object({
      wickets: Joi.number().min(0),
      runs: Joi.number().min(0)
    })
  }),
  socialLinks: Joi.object({
    instagram: Joi.string(),
    twitter: Joi.string(),
    facebook: Joi.string(),
    youtube: Joi.string()
  }),
  bio: Joi.string().max(1000)
});

export const updateProfileSchema = Joi.object({
  fullName: Joi.string().min(2).max(100),
  dateOfBirth: Joi.date().iso(),
  gender: Joi.string().valid('male', 'female', 'other'),
  nationality: Joi.string(),
  phone: Joi.string().min(10).max(15),
  address: Joi.object({
    street: Joi.string(),
    city: Joi.string(),
    state: Joi.string(),
    pincode: Joi.string(),
    country: Joi.string()
  }),
  battingStyle: Joi.string().valid('right-hand bat', 'left-hand bat', 'right-hand bat (occasional)', 'left-hand bat (occasional)'),
  bowlingStyle: Joi.string().valid('right-arm fast', 'right-arm medium', 'right-arm off-spin', 'right-arm leg-spin', 'left-arm fast', 'left-arm medium', 'left-arm orthodox', 'left-arm wrist-spin', 'none'),
  role: Joi.string().valid('batsman', 'bowler', 'all-rounder', 'wicket-keeper', 'wicket-keeper batsman'),
  jerseyNumber: Joi.number().min(0).max(999),
  experience: Joi.object({
    years: Joi.number().min(0),
    level: Joi.string().valid('district', 'state', 'national', 'international', 'club', 'school', 'local')
  }),
  currentTeam: Joi.string(),
  achievements: Joi.array().items(Joi.object({
    title: Joi.string(),
    description: Joi.string(),
    year: Joi.number(),
    tournament: Joi.string(),
    award: Joi.string()
  })),
  socialLinks: Joi.object({
    instagram: Joi.string(),
    twitter: Joi.string(),
    facebook: Joi.string(),
    youtube: Joi.string()
  }),
  bio: Joi.string().max(1000)
});

export const uploadStatsSchema = Joi.object({
  totalMatches: Joi.number().min(0),
  totalRuns: Joi.number().min(0),
  totalWickets: Joi.number().min(0),
  highestScore: Joi.number().min(0),
  bestBowling: Joi.object({
    wickets: Joi.number().min(0),
    runs: Joi.number().min(0)
  }),
  t20: Joi.object({
    matches: Joi.number().min(0),
    runs: Joi.number().min(0),
    wickets: Joi.number().min(0)
  }),
  odi: Joi.object({
    matches: Joi.number().min(0),
    runs: Joi.number().min(0),
    wickets: Joi.number().min(0)
  }),
  test: Joi.object({
    matches: Joi.number().min(0),
    runs: Joi.number().min(0),
    wickets: Joi.number().min(0)
  })
});

export const rejectProfileSchema = Joi.object({
  reason: Joi.string().required()
});

export default {
  createProfileSchema,
  updateProfileSchema,
  uploadStatsSchema,
  rejectProfileSchema
};
