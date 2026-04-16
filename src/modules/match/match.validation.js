
import Joi from 'joi';

export const createMatchSchema = Joi.object({
  team1: Joi.string().required(),
  team2: Joi.string().required(),
  tournament: Joi.string(),
  venue: Joi.object({
    name: Joi.string().required(),
    city: Joi.string(),
  }),
  scheduledDate: Joi.date().iso().required(),
  startTime: Joi.string(),
  format: Joi.string(),
  matchType: Joi.string(),
  overs: Joi.number().integer().min(1)
});

export default {
  createMatchSchema
};


