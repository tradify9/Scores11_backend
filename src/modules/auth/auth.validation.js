import Joi from 'joi';

export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().min(2).max(100).required(),
  phone: Joi.string().pattern(/^[0-9]{10,15}$/),
  role: Joi.string().valid('user', 'player', 'umpire')
});

export const loginSchema = Joi.object({
  identifier: Joi.string().allow(''),
  email: Joi.string().email().allow(''),
  password: Joi.string().required()
}).or('identifier', 'email');

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required()
});

export default {
  registerSchema,
  loginSchema,
  changePasswordSchema
};
