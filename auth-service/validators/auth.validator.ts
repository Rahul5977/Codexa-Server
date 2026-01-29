import { z } from "zod";

const emailSchema = z
  .string()
  .email("Invalid email format")
  .toLowerCase()
  .trim();
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password must be less than 100 characters")

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(20, "Name must be less than 20 characters")
    .trim(),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(["USER", "STUDENT", "TEACHER"]).optional().default("USER"),
});

export type RegisterInput = z.infer<typeof registerSchema>;

// Login Schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Request OTP Schema
export const requestOtpSchema = z.object({
  email: emailSchema,
  type: z.enum(["VERIFY_EMAIL", "RESET_PASSWORD"]).default("VERIFY_EMAIL"),
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;

// Verify OTP Schema
export const verifyOtpSchema = z.object({
  email: emailSchema,
  otp: z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(/^\d+$/, "OTP must contain only numbers"),
});

export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

// Send Verification OTP Schema (for registration)
export const sendVerificationOtpSchema = z.object({
  email: emailSchema,
});

export type SendVerificationOtpInput = z.infer<typeof sendVerificationOtpSchema>;

// Complete Registration Schema (after OTP verification)
export const completeRegistrationSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(20, "Name must be less than 20 characters")
    .trim(),
  email: emailSchema,
  password: passwordSchema,
  otp: z
    .string()
    .length(6, "OTP must be 6 digits")
    .regex(/^\d+$/, "OTP must contain only numbers"),
  role: z.enum(["USER", "STUDENT", "TEACHER"]).optional().default("USER"),
});

export type CompleteRegistrationInput = z.infer<typeof completeRegistrationSchema>;

// Forgot Password Schema
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// Reset Password Schema
export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// Refresh Token Schema
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

// Validate function helper
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}
