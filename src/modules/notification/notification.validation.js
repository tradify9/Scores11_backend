import Joi from 'joi';

export const sendNotificationSchema = Joi.object({
  userId: Joi.string(),
  userIds: Joi.array().items(Joi.string()),
  title: Joi.string().required(),
  body: Joi.string().required(),
  type: Joi.string().valid('MATCH', 'TOURNAMENT', 'WALLET', 'SYSTEM', 'TEAM'),
  data: Joi.object(),
  sendPush: Joi.boolean().default(false)
});

export default {
  sendNotificationSchema
};
