
import Joi from 'joi';

export const createMatchSchema = Joi.object({
  team1: Joi.string().required().messages({
    'string.empty': 'Team 1 is required',
    'any.required': 'Team 1 is required'
  }),
  team2: Joi.string().required().messages({
    'string.empty': 'Team 2 is required',
    'any.required': 'Team 2 is required'
  }),
  tournament: Joi.string().optional().allow(''),
  venue: Joi.object({
    name: Joi.string().required().trim().min(2).max(100).messages({
      'string.empty': 'Venue name is required',
      'string.min': 'Venue name must be at least 2 characters',
      'string.max': 'Venue name cannot exceed 100 characters'
    }),
    city: Joi.string().optional().allow('').max(50)
  }).required().messages({
    'object.required': 'Venue information is required'
  }),
  scheduledDate: Joi.date().iso().greater('now').required().messages({
    'date.format': 'Scheduled date must be valid ISO date',
    'date.greater': 'Scheduled date must be in the future',
    'any.required': 'Scheduled date is required'
  }),
  startTime: Joi.string().optional().allow('').pattern(/^(?:[01]\d|2[0-3]):[0-5]\d$/).messages({
    'string.pattern.base': 'Start time must be HH:MM format'
  }),
format: Joi.string().valid('t20', 'odi', 'test', 't10', 'custom', 'T20', 'ODI').lowercase().default('t20').messages({    'any.only': 'Invalid format. Must be one of: t20, odi, test, t10, custom, T20, ODI (case-insensitive)'  }),
  matchType: Joi.any().valid('league', 'knockout', 'quarter_final', 'semi_final', 'final', 'practice', 'friendly').default('league').messages({
    'any.only': 'Invalid match type. Must be one of: league, knockout, quarter_final, semi_final, final, practice, friendly'
  }),
  overs: Joi.number().integer().min(1).max(100).optional().messages({
    'number.min': 'Overs must be at least 1',
    'number.max': 'Overs cannot exceed 100'
  })
});

export default {
  createMatchSchema
};



