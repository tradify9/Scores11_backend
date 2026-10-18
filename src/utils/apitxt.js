// APITxT OTP delivery (https://apitxt.com -> Developer -> OTP API).
// APITxT only delivers the code; we generate it and verify it ourselves.
import axios from 'axios';
import config from '../config/env.js';
import ApiError from './ApiError.js';

// 5xx with a message the app should show as-is (see toFriendlyError).
const serviceError = (status, message) => Object.assign(new ApiError(status, message), { expose: true });

export const isApitxtConfigured = () => Boolean(config.apitxt.authKey);

/** "9876543210" / "+91 98765 43210" -> "919876543210"; other countries kept as given. */
export const toApitxtMobile = (phone) => {
  const digits = (phone || '').toString().replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
};

/**
 * Send [otp] to [phone]. Resolves with APITxT's request id; throws an
 * ApiError with a message the app can show when delivery is not possible.
 */
export const sendOtpViaApitxt = async ({ phone, otp }) => {
  if (!isApitxtConfigured()) {
    throw serviceError(503, 'Mobile OTP is not set up on the server yet. Please try again later.');
  }
  const mobile = toApitxtMobile(phone);
  const params = new URLSearchParams({
    authkey: config.apitxt.authKey,
    mobile,
    otp,
    channel: config.apitxt.channel
  });
  // The mobile already carries its country code; APITxT defaults country to 91.
  if (mobile.length === 12 && mobile.startsWith('91')) params.set('country', '91');
  if (config.apitxt.templateId) params.set('template_id', config.apitxt.templateId);
  if (config.apitxt.channel === 'whatsapp') {
    if (config.apitxt.templateName) params.set('template_name', config.apitxt.templateName);
    if (config.apitxt.projectRefId) params.set('project_ref_id', config.apitxt.projectRefId);
  }

  let response;
  try {
    response = await axios.post(`${config.apitxt.baseUrl}/api/sendOTP`, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000,
      validateStatus: () => true
    });
  } catch (error) {
    console.error('[APITXT] request failed:', error.message);
    throw serviceError(502, 'Could not send the OTP right now. Please try again in a moment.');
  }

  const body = response.data && typeof response.data === 'object' ? response.data : {};
  const status = (body.status ?? body.type ?? '').toString().toLowerCase();
  const succeeded = ['success', 'ok', '200', 'true', 'sent'].includes(status) || body.success === true;
  if (response.status >= 200 && response.status < 300 && succeeded) {
    return body.data?.request_id || body.request_id || null;
  }

  // Never echo provider internals (keys, balances) to the app; log them here.
  console.error('[APITXT] sendOTP rejected:', response.status, JSON.stringify(body).slice(0, 300));
  if (response.status === 401 || status === 'auth_failed') {
    throw serviceError(503, 'Mobile OTP is not set up correctly on the server. Please contact support.');
  }
  if (response.status === 429 || /rate|limit|too many/i.test(body.message || '')) {
    throw new ApiError(429, 'Too many OTP requests for this number. Please wait a minute and try again.');
  }
  if (/balance|credit|wallet|insufficient/i.test(body.message || '')) {
    throw serviceError(503, 'OTP service is temporarily unavailable. Please try again later.');
  }
  if (/mobile|number|invalid/i.test(body.message || '') && response.status === 400) {
    throw new ApiError(400, 'This mobile number could not receive an OTP. Please check the number.');
  }
  throw serviceError(502, 'Could not send the OTP right now. Please try again in a moment.');
};

export default sendOtpViaApitxt;
