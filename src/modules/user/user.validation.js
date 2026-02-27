import Joi from 'joi';

export const registerSchema = Joi.object({
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    username: Joi.string().alphanum().min(3).max(30).required(),
    fullName: Joi.string().min(2).max(100).required(),
    phone: Joi.string().pattern(/^[0-9]{10,15}$/).required(),
    referralCode: Joi.string().optional()
  })
});

export const updateProfileSchema = Joi.object({
  body: Joi.object({
    fullName: Joi.string().min(2).max(100),
    phone: Joi.string().pattern(/^[0-9]{10,15}$/),
    dateOfBirth: Joi.date().iso().max('now'),
    gender: Joi.string().valid('male', 'female', 'other', 'prefer-not-to-say'),
    bio: Joi.string().max(500),
    location: Joi.object({
      city: Joi.string(),
      state: Joi.string(),
      country: Joi.string(),
      coordinates: Joi.array().items(Joi.number()).length(2)
    }),
    cricketProfile: Joi.object({
      playerType: Joi.string().valid('batsman', 'bowler', 'all-rounder', 'wicket-keeper'),
      battingStyle: Joi.string().valid('right-hand', 'left-hand'),
      bowlingStyle: Joi.string().valid('right-arm-fast', 'right-arm-medium', 'left-arm-fast', 'left-arm-medium', 'spin', 'none'),
      preferredRole: Joi.array().items(Joi.string())
    }),
    preferences: Joi.object({
      notifications: Joi.object({
        email: Joi.boolean(),
        push: Joi.boolean(),
        sms: Joi.boolean()
      }),
      privacy: Joi.object({
        showProfile: Joi.boolean(),
        showStats: Joi.boolean(),
        showLocation: Joi.boolean()
      }),
      language: Joi.string().valid('en', 'hi', 'bn', 'te', 'ta', 'kn', 'ml'),
      theme: Joi.string().valid('light', 'dark', 'system')
    })
  })
});

export const followSchema = Joi.object({
  params: Joi.object({
    userId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
  })
});

export const getUserSchema = Joi.object({
  params: Joi.object({
    id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
  })
});

export const queryUsersSchema = Joi.object({
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
    sortBy: Joi.string().valid('createdAt', 'fullName', 'experiencePoints', 'level'),
    sortOrder: Joi.string().valid('asc', 'desc'),
    search: Joi.string(),
    role: Joi.string(),
    level: Joi.number().integer().min(1).max(5),
    playerType: Joi.string().valid('batsman', 'bowler', 'all-rounder', 'wicket-keeper'),
    latitude: Joi.number().min(-90).max(90),
    longitude: Joi.number().min(-180).max(180),
    radius: Joi.number().integer().min(1).max(100)
  })
});