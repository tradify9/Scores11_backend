
import { sendEmail } from './emailSender.js';

export const sendVerificationEmail = async (email, token) => {
  const verificationUrl = `http://localhost:3000/auth/verify-email/${token}`;
  const subject = 'Verify your Crick11 email address';
  const html = `
    <h1>Verify your Crick11 Account</h1>
    <p>Hi,</p>
    <p>Please verify your email address by clicking the link below:</p>
    <a href="${verificationUrl}" style="background: #1E88E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Verify Email</a>
    <p>Or copy this link:</p>
    <p>${verificationUrl}</p>
    <p>This link expires in 24 hours.</p>
    <p>Best,</p>
    <p>Crick11 Team</p>
  `;
  
  return await sendEmail(email, subject, html);
};

