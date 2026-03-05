import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// SMS Service configuration
// You can configure any SMS provider here (Twilio, Nexmo, Fast2SMS, etc.)
// For now, we'll use a generic approach that can work with multiple providers

const SMS_CONFIG = {
  // Configure your SMS provider here
  // For Fast2SMS (India)
  provider: process.env.SMS_PROVIDER || 'fast2sms',
  
  // Fast2SMS Configuration
  fast2sms: {
    url: 'https://www.fast2sms.com/dev/bulkV2',
    apiKey: process.env.FAST2SMS_API_KEY,
  },
  
  // Twilio Configuration
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },
  
  // Default sender ID
  senderId: process.env.SMS_SENDER_ID || 'CRICK11',
};

/**
 * Send SMS using configured provider
 * @param {string} phoneNumber - Recipient phone number (with country code)
 * @param {string} message - Message to send
 */
export const sendSMS = async (phoneNumber, message) => {
  try {
    // Format phone number (add country code if not present)
    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    if (!formattedPhone) {
      throw new Error('Invalid phone number format');
    }

    // Send based on configured provider
    switch (SMS_CONFIG.provider) {
      case 'fast2sms':
        return await sendViaFast2SMS(formattedPhone, message);
      case 'twilio':
        return await sendViaTwilio(formattedPhone, message);
      default:
        // Development mode - just log
        console.log(`[SMS] To: ${formattedPhone}, Message: ${message}`);
        return { success: true, devMode: true };
    }
  } catch (error) {
    console.error('SMS Send Error:', error.message);
    // In development, don't fail the whole flow
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SMS DEV] To: ${phoneNumber}, Message: ${message}`);
      return { success: true, devMode: true };
    }
    throw error;
  }
};

/**
 * Format phone number to include country code
 */
const formatPhoneNumber = (phone) => {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // If already has country code (10+ digits)
  if (digits.length >= 10) {
    // If starts with 91 and 12 digits (India with country code)
    if (digits.startsWith('91') && digits.length === 12) {
      return digits;
    }
    // If 10 digits, add India country code
    if (digits.length === 10) {
      return '91' + digits;
    }
    // Return as is if has country code
    return digits;
  }
  return null;
};

/**
 * Send SMS via Fast2SMS
 */
const sendViaFast2SMS = async (phone, message) => {
  const { url, apiKey } = SMS_CONFIG.fast2sms;
  
  if (!apiKey) {
    throw new Error('Fast2SMS API key not configured');
  }

  const params = {
    authorization: apiKey,
    message: message,
    language: 'english',
    route: 'otp',
    numbers: phone,
  };

  const response = await axios.get(url, { params });
  
  if (response.data.return === true) {
    return { success: true, messageId: response.data.message_id };
  } else {
    throw new Error(response.data.message || 'Failed to send SMS');
  }
};

/**
 * Send SMS via Twilio
 */
const sendViaTwilio = async (phone, message) => {
  const { accountSid, authToken, phoneNumber } = SMS_CONFIG.twilio;
  
  if (!accountSid || !authToken || !phoneNumber) {
    throw new Error('Twilio configuration incomplete');
  }

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  
  const formData = new URLSearchParams();
  formData.append('To', phone);
  formData.append('From', phoneNumber);
  formData.append('Body', message);

  const response = await axios.post(twilioUrl, formData, {
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (response.data.sid) {
    return { success: true, messageId: response.data.sid };
  } else {
    throw new Error('Failed to send SMS via Twilio');
  }
};

/**
 * Send OTP SMS
 * @param {string} phone - Phone number
 * @param {string} otp - OTP code
 */
export const sendOTP = async (phone, otp) => {
  const message = `Your Crick11 verification code is ${otp}. This code will expire in 10 minutes.`;
  return await sendSMS(phone, message);
};

/**
 * Send welcome SMS
 * @param {string} phone - Phone number
 * @param {string} name - User name
 */
export const sendWelcomeSMS = async (phone, name) => {
  const message = `Welcome to Crick11, ${name}! 🎉 Your account has been successfully created. Start playing cricket and win exciting prizes!`;
  return await sendSMS(phone, message);
};

/**
 * Send registration success SMS
 * @param {string} phone - Phone number
 * @param {string} name - User name
 */
export const sendRegistrationSuccessSMS = async (phone, name) => {
  const message = `Hi ${name}! Welcome to Crick11! Your account has been created successfully. Get ready to play cricket and win prizes!`;
  return await sendSMS(phone, message);
};

export default {
  sendSMS,
  sendOTP,
  sendWelcomeSMS,
  sendRegistrationSuccessSMS,
};
