import Joi from 'joi';

export const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  phone: Joi.string().pattern(/^[0-9]{10,15}$/),
  dateOfBirth: Joi.date().iso(),
  address: Joi.object({
    street: Joi.string(),
    city: Joi.string(),
    state: Joi.string(),
    country: Joi.string(),
    pincode: Joi.string()
  }),
  bio: Joi.string().max(500)
});

export default {
  updateProfileSchema
};
