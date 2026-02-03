import express from "express";
import {
  registerUser,
  loginUser,
  requestOTP,
  verifyOTP,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout,
  getMe,
  sendVerificationOTP,
  completeRegistration,
  updateProfile,
  updateProfilePicture,
} from "../controller/auth.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import uploadFile from "../middleware/multer.js"

const authRoutes = express.Router();

// Two-step registration flow
authRoutes.post("/send-verification-otp", sendVerificationOTP);
authRoutes.post("/complete-registration", completeRegistration);

// Legacy single-step registration (kept for backward compatibility)
authRoutes.post("/register", registerUser);

authRoutes.post("/login", loginUser);
authRoutes.post("/request-otp", requestOTP);
authRoutes.post("/verify-otp", verifyOTP);
authRoutes.post("/forgot-password", forgotPassword);
authRoutes.post("/reset-password/:token", resetPassword);
authRoutes.post("/refresh", refreshToken);

authRoutes.post("/logout", authenticate, logout); 
authRoutes.get("/me", authenticate, getMe);
authRoutes.put("/profile", authenticate, updateProfile);
authRoutes.put("/profile-picture", authenticate, uploadFile, updateProfilePicture);

export default authRoutes;
