import Joi from 'joi';

export const addBallSchema = Joi.object({
  overNumber: Joi.number().min(1).required(),
  ballNumber: Joi.number().min(1).max(6).required(),
  innings: Joi.number().min(1).max(2).required(),
  battingTeam: Joi.string().required(),
  bowlingTeam: Joi.string().required(),
  batsman: Joi.string().required(),
  bowler: Joi.string().required(),
  runs: Joi.number().min(0).max(6).required(),
  extras: Joi.number().min(0).default(0),
  wicket: Joi.boolean().default(false),
  wicketType: Joi.string().valid('bowled', 'caught', 'stumped', 'run_out', 'lbw', 'hit_wicket'),
  wicketFielder: Joi.string(),
  isWide: Joi.boolean().default(false),
  isNoBall: Joi.boolean().default(false),
  isBye: Joi.boolean().default(false),
  isLegBye: Joi.boolean().default(false),
  comment: Joi.string()
});

export default {
  addBallSchema
};
