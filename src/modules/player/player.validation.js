import Joi from 'joi';

export const createPlayerSchema = Joi.object({
  playerName: Joi.string().min(2).max(100).required(),
  jerseyNumber: Joi.number().min(0).max(999),
  role: Joi.string().valid('batsman', 'bowler', 'all-rounder', 'wicket-keeper'),
  battingStyle: Joi.string().valid('right-hand bat', 'left-hand bat', 'right-hand', 'left-hand'),
  // Extended bowling styles to support both UI and legacy formats
  bowlingStyle: Joi.string().valid(
    'right-arm fast', 'right-arm medium', 'left-arm fast', 'left-arm medium',
    'off-spin', 'leg-spin', 'none',
    'right-arm-fast', 'right-arm-medium', 'left-arm-fast', 'left-arm-medium',
    'off spin', 'leg spin'
  ),
  dateOfBirth: Joi.date().iso(),
  placeOfBirth: Joi.string(),
  height: Joi.string(),
  weight: Joi.string(),
  bio: Joi.string().max(1000),
  team: Joi.string(),      
  teamName: Joi.string().optional().allow(''),
  email: Joi.string().email().optional().allow(''),
  phone: Joi.string().optional().allow(''),
  nationality: Joi.string().optional().allow('')
});

export const updatePlayerSchema = Joi.object({
  playerName: Joi.string().min(2).max(100),
  jerseyNumber: Joi.number().min(0).max(999),
  role: Joi.string().valid('batsman', 'bowler', 'all-rounder', 'wicket-keeper'),
  battingStyle: Joi.string().valid('right-hand bat', 'left-hand bat', 'right-hand', 'left-hand'),
  // Extended bowling styles to support both UI and legacy formats
  bowlingStyle: Joi.string().valid(
    'right-arm fast', 'right-arm medium', 'left-arm fast', 'left-arm medium',
    'off-spin', 'leg-spin', 'none',
    'right-arm-fast', 'right-arm-medium', 'left-arm-fast', 'left-arm-medium',
    'off spin', 'leg spin'
  ),
  dateOfBirth: Joi.date().iso(),
  placeOfBirth: Joi.string(),
  height: Joi.string(),
  weight: Joi.string(),
  bio: Joi.string().max(1000),
  email: Joi.string().email().optional().allow(''),
  phone: Joi.string().optional().allow('')
});

export default {
  createPlayerSchema,
  updatePlayerSchema
};
