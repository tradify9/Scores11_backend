import Joi from 'joi';

export const createTeamSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  shortName: Joi.string().max(10),
  matchId: Joi.string().allow(''),
  contestId: Joi.string().allow(''),
  captainId: Joi.string().allow(''),
  viceCaptainId: Joi.string().allow(''),
  players: Joi.array().items(Joi.string()).min(2).max(25).optional(),
  description: Joi.string().max(1000),
  homeGround: Joi.string().max(100),
  city: Joi.string().max(50),
  state: Joi.string().max(50),
  country: Joi.string().max(50).default('India'),
  coach: Joi.string().max(100),
  ownerName: Joi.string().max(100),
  foundedYear: Joi.number().min(1800).max(new Date().getFullYear()),
  isPublic: Joi.boolean().default(false)
});

export const updateTeamSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  shortName: Joi.string().max(10),
  description: Joi.string().max(1000),
  homeGround: Joi.string().max(100),
  city: Joi.string().max(50),
  state: Joi.string().max(50),
  country: Joi.string().max(50),
  coach: Joi.string().max(100),
  ownerName: Joi.string().max(100),
  foundedYear: Joi.number().min(1800).max(new Date().getFullYear())
});

export const addPlayerSchema = Joi.object({
  playerId: Joi.string().allow(''),
  identifier: Joi.string().allow(''),
  name: Joi.string().max(100).allow(''),
  playerName: Joi.string().max(100).allow(''),
  fullName: Joi.string().max(100).allow(''),
  email: Joi.string().email().allow(''),
  phone: Joi.string().allow(''),
  mobile: Joi.string().allow(''),
  role: Joi.string().allow(''),
  battingStyle: Joi.string().allow(''),
  bowlingStyle: Joi.string().allow(''),
  jerseyNumber: Joi.number().min(0).max(999),
  matchId: Joi.string().allow('')
}).or('playerId', 'identifier', 'email', 'phone', 'mobile', 'name', 'playerName', 'fullName');

export const removePlayerSchema = Joi.object({
  playerId: Joi.string().required()
});

export const setCaptainSchema = Joi.object({
  playerId: Joi.string().required()
});

export const setViceCaptainSchema = Joi.object({
  playerId: Joi.string().required()
});

export const transferOwnershipSchema = Joi.object({
  newOwnerId: Joi.string().required()
});

export const searchTeamSchema = Joi.object({
  q: Joi.string().min(1).required(),
  limit: Joi.number().min(1).max(50).default(10)
});

export default {
  createTeamSchema,
  updateTeamSchema,
  addPlayerSchema,
  removePlayerSchema,
  setCaptainSchema,
  setViceCaptainSchema,
  transferOwnershipSchema,
  searchTeamSchema
};
