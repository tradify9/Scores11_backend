import Joi from 'joi';

export const createMatchSchema = Joi.object({
  team1: Joi.string().required(),
  team2: Joi.string().required(),
  tournament: Joi.string(),
  format: Joi.string().valid('T20', 'ODI', 'TEST'),
  matchType: Joi.string().valid('LEAGUE', 'KNOCKOUT', 'FINAL'),
  venue: Joi.object({
    name: Joi.string().required(),
    city: Joi.string(),
    state: Joi.string(),
    country: Joi.string()
  }),
  scheduledDate: Joi.date().iso().required(),
  startTime: Joi.string(),
  overs: Joi.number().min(1).max(50)
});

export default {
  createMatchSchema
};
