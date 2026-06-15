import Joi from 'joi';
import { WICKET_TYPE, BALL_RESULT } from '../../constants/matchStatus.js';
import { ROLES } from '../../constants/roles.js';

const validateBallData = Joi.object({
  overNumber: Joi.number().integer().min(1).max(50).required(),
  ballNumber: Joi.number().integer().min(1).max(7).required(), // 7 for extras
  batsmanId: Joi.string().required(),
  bowlerId: Joi.string().required(),
  runs: Joi.number().integer().min(0).max(999).default(0),
  isWicket: Joi.boolean().default(false),
  wicketType: Joi.when('isWicket', {
    is: true,
    then: Joi.string().valid(...Object.values(WICKET_TYPE)).required(),
    otherwise: Joi.string().allow(null, '')
  }),
  fielderId: Joi.string().when('isWicket', {
    is: true,
    then: Joi.string().allow(null, ''),
    otherwise: Joi.string().allow(null, '')
  }),
  dismissedBatsmanId: Joi.string().allow(null, ''),
  isFreeHit: Joi.boolean().default(false),
  isWide: Joi.boolean().default(false),
  isNoBall: Joi.boolean().default(false),
  isBye: Joi.boolean().default(false),
  isLegBye: Joi.boolean().default(false),
  isPenalty: Joi.boolean().default(false),
  forceStrikeChange: Joi.boolean().optional(),
  continueAfterTarget: Joi.boolean().optional(),
  allowAllOutContinue: Joi.boolean().optional(),
  wagonZone: Joi.number().integer().min(0).max(16).optional(),
  wagonLabel: Joi.string().max(80).allow('', null),
  comment: Joi.string().max(200).allow(''),
  expectedVersion: Joi.number().optional() // For optimistic concurrency
});

const validateInitializeMatch = Joi.object({
  battingOrder: Joi.array().items(
    Joi.object({
      team: Joi.string().required(),
      players: Joi.array().items(Joi.string()).min(11).max(15).required()
    })
  ).length(2).required()
});

const validateInningsStart = Joi.object({
  inningsNumber: Joi.number().integer().min(1).max(2).required()
});

const validateSetPlayer = Joi.object({
  batsmanId: Joi.string().required(),
  expectedVersion: Joi.number().optional()
});

const validateResultUpdate = Joi.object({
  winner: Joi.string().required(),
  margin: Joi.string().max(100).required(),
  method: Joi.string().max(50).required(),
  playerOfMatch: Joi.string().allow(null, ''),
  target: Joi.number().integer().allow(null),
  requiredRuns: Joi.number().integer().allow(null),
  expectedVersion: Joi.number().optional()
});

export default {
  validateBallData,
  validateInitializeMatch,
  validateInningsStart,
  validateSetPlayer,
  validateResultUpdate
};
