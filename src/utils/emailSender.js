import nodemailer from 'nodemailer';
import config from '../config/env.js';

nodemailer.createTransport({
  host: config.email.smtp.host,
  port: config.email.smtp.port,
  secure: false,
  auth: {
    user: config.email.smtp.user,
    pass: config.email.smtp.pass
  }
});

export const sendEmail = async (to, subject, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Crick11" <${config.email.from}>`,
      to,
      subject,
      html
    });
    console.log(`Email sent: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
};

export const sendWelcomeEmail = async (email, name) => {
  const subject = 'Welcome to Crick11!';
  const html = `
    <h1>Welcome to Crick11, ${name}!</h1>
    <p>Thank you for joining Crick11 - Your cricket scoring and tournament management platform.</p>
    <p>Get started by exploring tournaments and matches!</p>
    <p>If you have any questions, feel free to reach out to our support team.</p>
    <br/>
    <p>Best regards,</p>
    <p>The Crick11 Team</p>
  `;
  return sendEmail(email, subject, html);
};

export const sendPasswordResetEmail = async (email, otp) => {
  const subject = 'Password Reset - Crick11';
  const html = `
    <h1>Password Reset Request</h1>
    <p>You requested to reset your password for your Crick11 account.</p>
    <p>Your OTP code is: <strong style="font-size: 24px; color: #1E88E5;">${otp}</strong></p>
    <p>This code will expire in 10 minutes.</p>
    <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
    <br/>
    <p>Best regards,</p>
    <p>The Crick11 Team</p>
  `;
  return sendEmail(email, subject, html);
};

export const sendMatchReminderEmail = async (email, matchDetails) => {
  const subject = `Match Reminder: ${matchDetails.team1} vs ${matchDetails.team2}`;
  const html = `
    <h1>Match Reminder</h1>
    <p>Your match is coming up!</p>
    <p><strong>${matchDetails.team1}</strong> vs <strong>${matchDetails.team2}</strong></p>
    <p>Date: ${matchDetails.date}</p>
    <p>Venue: ${matchDetails.venue}</p>
  `;
  return sendEmail(email, subject, html);
};
