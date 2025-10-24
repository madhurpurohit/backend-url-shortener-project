import { Router } from "express";
import multer from "multer";
import path from "path";
import * as authController from "../controllers/auth.controller.js";

const router = Router();

router
  .route("/register")
  .get(authController.getRegisterPage)
  .post(authController.postRegister);

router
  .route("/login")
  .get(authController.getLoginPage)
  .post(authController.postLogin);

router.route("/profile").get(authController.getProfilePage);

router.route("/verify-email").get(authController.getVerifyEmailPage);

router
  .route("/resend-verification-link")
  .post(authController.resendVerificationLink);

router.route("/verify-email-token").get(authController.verifyEmailToken);

const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/avatars");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}_${Math.random()}.${ext}`);
  },
});

const avatarFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only images are allowed"), false);
  }
};

const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: avatarFileFilter,
  limits: { fileSize: 1024 * 1024 * 5 },
});

router
  .route("/edit-profile")
  .get(authController.getEditProfilePage)
  .post(avatarUpload.single("avatar"), authController.postEditProfile);

router
  .route("/change-password")
  .get(authController.getChangePasswordPage)
  .post(authController.postChangePassword);

router
  .route("/reset-password")
  .get(authController.getForgotPasswordPage)
  .post(authController.postForgotPassword);

router
  .route("/reset-password/:token")
  .get(authController.getResetPasswordPage)
  .post(authController.postResetPassword);

router
  .route("/set-password")
  .get(authController.getSetPasswordPage)
  .post(authController.postSetPassword);

router.route("/google").get(authController.getGoogleLoginPage);
router.route("/google/callback").get(authController.getGoogleLoginCallback);

router.route("/github").get(authController.getGithubLoginPage);
router.route("/github/callback").get(authController.getGithubLoginCallback);

router.route("/logout").get(authController.logoutUser);

export const authRoutes = router;
