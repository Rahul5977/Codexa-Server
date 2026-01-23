import crypto from "crypto";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;

// In-memory OTP store 
interface OtpEntry {
  otp: string;
  expiresAt: Date;
  type: "VERIFY_EMAIL" | "RESET_PASSWORD";
  attempts: number;
}

const otpStore = new Map<string, OtpEntry>();

// Generate a random OTP
export function generateOtp(): string {
  const digits = "0123456789";
  let otp = "";
  for (let i = 0; i < OTP_LENGTH; i++) {
    otp += digits[crypto.randomInt(0, digits.length)];
  }
  return otp;
}

// Store OTP with expiry
export function storeOtp(
  email: string,
  otp: string,
  type: "VERIFY_EMAIL" | "RESET_PASSWORD",
): Date {
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  otpStore.set(email.toLowerCase(), {
    otp,
    expiresAt,
    type,
    attempts: 0,
  });

  return expiresAt;
}

// Verify OTP
export function verifyOtp(
  email: string,
  otp: string,
): {
  valid: boolean;
  message: string;
  type?: "VERIFY_EMAIL" | "RESET_PASSWORD";
} {
  const entry = otpStore.get(email.toLowerCase());

  if (!entry) {
    return {
      valid: false,
      message: "OTP not found. Please request a new one.",
    };
  }

  // Check expiry
  if (new Date() > entry.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return {
      valid: false,
      message: "OTP has expired. Please request a new one.",
    };
  }

  // Check attempts (max 5)
  if (entry.attempts >= 5) {
    otpStore.delete(email.toLowerCase());
    return {
      valid: false,
      message: "Too many failed attempts. Please request a new OTP.",
    };
  }

  // Verify OTP
  if (entry.otp !== otp) {
    entry.attempts++;
    return { valid: false, message: "Invalid OTP. Please try again." };
  }

  // OTP is valid, remove it
  const type = entry.type;
  otpStore.delete(email.toLowerCase());

  return { valid: true, message: "OTP verified successfully.", type };
}

// Check if OTP exists for email
export function hasActiveOtp(email: string): boolean {
  const entry = otpStore.get(email.toLowerCase());
  if (!entry) return false;

  // Check if expired
  if (new Date() > entry.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return false;
  }

  return true;
}

// Clean up expired OTPs (call periodically)
export function cleanupExpiredOtps(): void {
  const now = new Date();
  for (const [email, entry] of otpStore.entries()) {
    if (now > entry.expiresAt) {
      otpStore.delete(email);
    }
  }
}

// Generate reset token for password reset
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Hash reset token for storage
export function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
