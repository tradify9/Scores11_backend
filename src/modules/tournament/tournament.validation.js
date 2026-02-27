import Joi from 'joi';

export const createTournamentSchema = Joi.object({
  name: Joi.string().min(2).max(200).required(),
  shortName: Joi.string().max(50),
  description: Joi.string().max(2000),
  type: Joi.string().valid('LEAGUE', 'KNOCKOUT', 'TABLE'),
  format: Joi.string().valid('T20', 'ODI', 'TEST'),
  overs: Joi.number().min(1).max(50),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().required(),
  registrationStartDate: Joi.date().iso(),
  registrationEndDate: Joi.date().iso(),
  venue: Joi.object({
    name: Joi.string(),
    city: Joi.string(),
    state: Joi.string(),
    country: Joi.string()
  }),
  rules: Joi.string(),
  prize: Joi.string(),
  entryFee: Joi.number().min(0),
  maxTeams: Joi.number().min(2).max(32),
  minTeams: Joi.number().min(2)
});

export default {
  createTournamentSchema
};
