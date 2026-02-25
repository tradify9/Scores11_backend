import Joi from 'joi';
import config from '../../config/env.js';

export const depositSchema = Joi.object({
  amount: Joi.number().min(config.wallet.minDeposit).max(config.wallet.maxDeposit).required(),
  paymentMethod: Joi.string().valid('UPI', 'BANK_TRANSFER', 'CARD', 'WALLET').required(),
  transactionId: Joi.string()
});

export const withdrawSchema = Joi.object({
  amount: Joi.number().min(config.wallet.minWithdrawal).required(),
  accountDetails: Joi.object({
    accountNumber: Joi.string().required(),
    ifscCode: Joi.string().required(),
    bankName: Joi.string(),
    accountHolderName: Joi.string()
  }).required()
});

export default {
  depositSchema,
  withdrawSchema
};
