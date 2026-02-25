import Joi from 'joi';

export const createTeamSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  shortName: Joi.string().max(10),
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
  playerId: Joi.string().required()
});

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
