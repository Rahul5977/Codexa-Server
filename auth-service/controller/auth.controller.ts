import argon2 from "argon2";
import { ZodError } from "zod";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { prisma } from "../libs/prisma.js";
import { kafkaProducer, type NotificationPayload } from "../libs/kafka.js";
import {
  registerSchema,
  loginSchema,
  requestOtpSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
} from "../validators/auth.validator.js";
import {
  generateTokenPair,
  generateAccessToken,
  verifyRefreshToken,
  type TokenPayload,
} from "../utils/jwt.js";
import {
  generateOtp,
  storeOtp,
  verifyOtp as verifyOtpUtil,
  generateResetToken,
  hashResetToken,
} from "../utils/otp.js";

// Helper to format Zod errors
function formatZodErrors(error: ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    errors[path] = issue.message;
  }
  return errors;
}

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
export const registerUser = asyncHandler(async (req, res) => {
  // Validate request body
  const parseResult = registerSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw ApiError.badRequest(
      "Validation failed",
      formatZodErrors(parseResult.error),
    );
  }

  const { name, email, password, role } = parseResult.data;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw ApiError.conflict("User with this email already exists");
  }

  //Argon2(for hashing)
  const hashedPassword = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  // Create user in database
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      createdAt: true,
    },
  });

  // Generate OTP for email verification
  const otp = generateOtp();
  const expiresAt = storeOtp(email, otp, "VERIFY_EMAIL");

  // Send Kafka message for email notification
  try {
    const notificationPayload: NotificationPayload = {
      type: "VERIFY_EMAIL",
      email: user.email,
      data: {
        otp,
        userName: user.name,
        expiresAt: expiresAt.toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    await kafkaProducer.sendNotificationEvent(notificationPayload);
  } catch (error) {
    console.error("Failed to send Kafka message:", error);

  }

  const response = ApiResponse.created(
    { user },
    "User registered successfully. Please verify your email.",
  );

  res.status(response.statusCode).json(response);
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user and issue tokens
 * @access  Public
 */
export const loginUser = asyncHandler(async (req, res) => {
  // Validate request body
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw ApiError.badRequest(
      "Validation failed",
      formatZodErrors(parseResult.error),
    );
  }

  const { email, password } = parseResult.data;

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  // Verify password
  const isPasswordValid = await argon2.verify(user.password, password);
  if (!isPasswordValid) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  // Check if email is verified
  if (!user.emailVerified) {
    throw ApiError.forbidden("Please verify your email before logging in");
  }

  // Generate tokens
  const tokenPayload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const tokens = generateTokenPair(tokenPayload);

  // Store refresh token in database
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: tokens.refreshToken },
  });

  // Send login alert via Kafka (optional)
  try {
    const notificationPayload: NotificationPayload = {
      type: "LOGIN_ALERT",
      email: user.email,
      data: {
        userName: user.name,
        ipAddress: req.ip || "Unknown",
        userAgent: req.get("User-Agent") || "Unknown",
      },
      timestamp: new Date().toISOString(),
    };

    await kafkaProducer.sendNotificationEvent(notificationPayload);
  } catch (error) {
    console.error("Failed to send login alert:", error);
  }

  const response = ApiResponse.success(
    {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        image_url: user.image_url,
        bio: user.bio,
        currentRating: user.currentRating,
      },
      tokens,
    },
    "Login successful",
  );

  res.status(response.statusCode).json(response);
});

/**
 * @route   POST /api/auth/request-otp
 * @desc    Request OTP for email verification or password reset
 * @access  Public
 */
export const requestOTP = asyncHandler(async (req, res) => {
  // Validate request body
  const parseResult = requestOtpSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw ApiError.badRequest(
      "Validation failed",
      formatZodErrors(parseResult.error),
    );
  }

  const { email, type } = parseResult.data;

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, emailVerified: true },
  });

  if (!user) {
    // Return success even if user doesn't exist (security best practice)
    const response = ApiResponse.success(
      null,
      "If an account exists with this email, you will receive an OTP.",
    );
    return res.status(response.statusCode).json(response);
  }

  // For email verification, check if already verified
  if (type === "VERIFY_EMAIL" && user.emailVerified) {
    throw ApiError.badRequest("Email is already verified");
  }

  // Generate and store OTP
  const otp = generateOtp();
  const expiresAt = storeOtp(email, otp, type);

  // Send Kafka message
  try {
    const notificationPayload: NotificationPayload = {
      type,
      email: user.email,
      data: {
        otp,
        userName: user.name,
        expiresAt: expiresAt.toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    await kafkaProducer.sendNotificationEvent(notificationPayload);
  } catch (error) {
    console.error("Failed to send OTP notification:", error);
    throw ApiError.serviceUnavailable(
      "Failed to send OTP. Please try again later.",
    );
  }

  const response = ApiResponse.success(
    { expiresAt },
    "OTP sent successfully to your email",
  );

  res.status(response.statusCode).json(response);
});

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP
 * @access  Public
 */
export const verifyOTP = asyncHandler(async (req, res) => {
  // Validate request body
  const parseResult = verifyOtpSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw ApiError.badRequest(
      "Validation failed",
      formatZodErrors(parseResult.error),
    );
  }

  const { email, otp } = parseResult.data;

  // Verify OTP
  const result = verifyOtpUtil(email, otp);

  if (!result.valid) {
    throw ApiError.badRequest(result.message);
  }

  // If OTP type is VERIFY_EMAIL, update user's emailVerified status
  if (result.type === "VERIFY_EMAIL") {
    const user = await prisma.user.update({
      where: { email },
      data: { emailVerified: true },
      select: { id: true, name: true, email: true },
    });

    // Send welcome email via Kafka
    try {
      const notificationPayload: NotificationPayload = {
        type: "WELCOME_EMAIL",
        email: user.email,
        data: {
          userName: user.name,
        },
        timestamp: new Date().toISOString(),
      };

      await kafkaProducer.sendNotificationEvent(notificationPayload);
    } catch (error) {
      console.error("Failed to send welcome email:", error);
    }
  }

  // If OTP type is RESET_PASSWORD, generate a reset token
  let resetToken: string | undefined;
  if (result.type === "RESET_PASSWORD") {
    resetToken = generateResetToken();
    const hashedToken = hashResetToken(resetToken);

    await prisma.user.update({
      where: { email },
      data: { refreshToken: hashedToken }, // Temporarily store hashed reset token
    });
  }

  const response = ApiResponse.success(
    {
      verified: true,
      type: result.type,
      ...(resetToken && { resetToken }),
    },
    result.message,
  );

  res.status(response.statusCode).json(response);
});

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  // Validate request body
  const parseResult = forgotPasswordSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw ApiError.badRequest(
      "Validation failed",
      formatZodErrors(parseResult.error),
    );
  }

  const { email } = parseResult.data;

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true },
  });

  // Always return success (security best practice)
  if (!user) {
    const response = ApiResponse.success(
      null,
      "If an account exists with this email, you will receive a password reset OTP.",
    );
    return res.status(response.statusCode).json(response);
  }

  // Generate and store OTP
  const otp = generateOtp();
  const expiresAt = storeOtp(email, otp, "RESET_PASSWORD");

  // Send Kafka message
  try {
    const notificationPayload: NotificationPayload = {
      type: "RESET_PASSWORD",
      email: user.email,
      data: {
        otp,
        userName: user.name,
        expiresAt: expiresAt.toISOString(),
      },
      timestamp: new Date().toISOString(),
    };

    await kafkaProducer.sendNotificationEvent(notificationPayload);
  } catch (error) {
    console.error("Failed to send reset password OTP:", error);
    throw ApiError.serviceUnavailable(
      "Failed to send OTP. Please try again later.",
    );
  }

  const response = ApiResponse.success(
    { expiresAt },
    "Password reset OTP sent to your email",
  );

  res.status(response.statusCode).json(response);
});

/**
 * @route   POST /api/auth/reset-password/:token
 * @desc    Reset password with token
 * @access  Public
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;

  if (!token) {
    throw ApiError.badRequest("Reset token is required");
  }

  // Validate request body
  const parseResult = resetPasswordSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw ApiError.badRequest(
      "Validation failed",
      formatZodErrors(parseResult.error),
    );
  }

  const { password } = parseResult.data;

  // Hash the token to compare with stored hash
  const hashedToken = hashResetToken(token);

  // Find user with this reset token
  const user = await prisma.user.findFirst({
    where: { refreshToken: hashedToken },
  });

  if (!user) {
    throw ApiError.badRequest("Invalid or expired reset token");
  }

  // Hash new password
  const hashedPassword = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  // Update user's password and clear reset token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      refreshToken: null,
    },
  });

  const response = ApiResponse.success(
    null,
    "Password reset successfully. Please login with your new password.",
  );

  res.status(response.statusCode).json(response);
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
export const refreshToken = asyncHandler(async (req, res) => {
  // Validate request body
  const parseResult = refreshTokenSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw ApiError.badRequest(
      "Validation failed",
      formatZodErrors(parseResult.error),
    );
  }

  const { refreshToken: token } = parseResult.data;

  // Verify refresh token
  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw ApiError.unauthorized("Invalid or expired refresh token");
  }

  // Find user and verify stored refresh token
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
  });

  if (!user || user.refreshToken !== token) {
    throw ApiError.unauthorized("Invalid refresh token");
  }

  // Generate new access token
  const tokenPayload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const newAccessToken = generateAccessToken(tokenPayload);

  const response = ApiResponse.success(
    { accessToken: newAccessToken },
    "Token refreshed successfully",
  );

  res.status(response.statusCode).json(response);
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and invalidate refresh token
 * @access  Private
 */
export const logout = asyncHandler(async (req, res) => {
  // Get user ID from request (set by auth middleware)
  const userId = (req as any).user?.userId;

  if (userId) {
    // Clear refresh token in database
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  const response = ApiResponse.success(null, "Logged out successfully");
  res.status(response.statusCode).json(response);
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
export const getMe = asyncHandler(async (req, res) => {
  const userId = (req as any).user?.userId;

  if (!userId) {
    throw ApiError.unauthorized("Not authenticated");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      image_url: true,
      bio: true,
      currentRating: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  const response = ApiResponse.success(
    { user },
    "User profile fetched successfully",
  );
  res.status(response.statusCode).json(response);
});
