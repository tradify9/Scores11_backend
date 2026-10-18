import mongoose from 'mongoose';

// One pending mobile OTP per number. The code itself is never stored, only a
// keyed hash, and MongoDB drops the document once it expires.
const phoneOtpSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  otpHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
  // Sends within the current hour window (abuse / cost protection)
  sendCount: { type: Number, default: 0 },
  windowStartedAt: { type: Date, default: Date.now },
  lastSentAt: { type: Date, default: Date.now },
  providerRequestId: String
}, { timestamps: true });

// Keep the record a little past expiry so the hourly send limit still applies
// to someone who lets codes expire and asks again.
phoneOtpSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 });

const PhoneOtp = mongoose.model('PhoneOtp', phoneOtpSchema);
export default PhoneOtp;
