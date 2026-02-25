import Joi from 'joi';

export const updateUserSchema = Joi.object({
  name: Joi.string(),
  email: Joi.string().email(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
  role: Joi.string().valid('USER', 'PLAYER', 'UMPIRE', 'ADMIN'),
  isActive: Joi.boolean()
});

export default {
  updateUserSchema
};
