import Joi from 'joi';

export const updatePointsSchema = Joi.object({
  tournament: Joi.string(),
  points: Joi.number().min(0).required(),
  type: Joi.string().valid('win', 'loss', 'draw')
});

export default {
  updatePointsSchema
};
