import Joi from 'joi';

export const createPlayerSchema = Joi.object({
  playerName: Joi.string().min(2).max(100).required(),
  jerseyNumber: Joi.number().min(0).max(999),
  role: Joi.string().valid('batsman', 'bowler', 'all-rounder', 'wicket-keeper'),
  battingStyle: Joi.string().valid('right-hand bat', 'left-hand bat'),
  bowlingStyle: Joi.string().valid('right-arm fast', 'right-arm medium', 'left-arm fast', 'left-arm medium', 'off-spin', 'leg-spin', 'none'),
  dateOfBirth: Joi.date().iso(),
  placeOfBirth: Joi.string(),
  height: Joi.string(),
  weight: Joi.string(),
  bio: Joi.string().max(1000),
  team: Joi.string()
});

export const updatePlayerSchema = Joi.object({
  playerName: Joi.string().min(2).max(100),
  jerseyNumber: Joi.number().min(0).max(999),
  role: Joi.string().valid('batsman', 'bowler', 'all-rounder', 'wicket-keeper'),
  battingStyle: Joi.string().valid('right-hand bat', 'left-hand bat'),
  bowlingStyle: Joi.string().valid('right-arm fast', 'right-arm medium', 'left-arm fast', 'left-arm medium', 'off-spin', 'leg-spin', 'none'),
  dateOfBirth: Joi.date().iso(),
  placeOfBirth: Joi.string(),
  height: Joi.string(),
  weight: Joi.string(),
  bio: Joi.string().max(1000)
});

export default {
  createPlayerSchema,
  updatePlayerSchema
};
