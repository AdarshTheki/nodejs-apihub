import { Router } from 'express';
import passport from 'passport';
import {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutCurrentUser,
  createRefreshToken,
  changeCurrentPassword,
  forgotPasswordRequest,
  resetForgottenPassword,
  assignRole,
  handleSocialLogin,
  verifyEmail,
  resendEmailVerification,
} from '../controllers/auth.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

// SOS
import '../config/passport.js';

const router = Router();

router.route('/register').post(registerUser);
router.route('/login').post(loginUser);
router.route('/assign-role/:userId').post(verifyJWT(['ADMIN']), assignRole);
router.route('/refresh-token').post(createRefreshToken);

router.route('/forgot-password').post(forgotPasswordRequest);
router.route('/reset-password/:resetToken').post(resetForgottenPassword);
router.route('/verify-email/:verificationToken').get(verifyEmail);

router.route('/current-user').get(verifyJWT(), getCurrentUser);
router.route('/logout').post(verifyJWT(), logoutCurrentUser);
router.route('/change-password').post(verifyJWT(), changeCurrentPassword);
router.route('/resend-verify-email').get(verifyJWT(), resendEmailVerification);

// SOS
router
  .route('/google')
  .get(
    passport.authenticate('google', { scope: ['profile', 'email'] }),
    (req, res) => res.send('redirecting to google...')
  );
router
  .route('/google/callback')
  .get(passport.authenticate('google'), handleSocialLogin);
router
  .route('/github')
  .get(
    passport.authenticate('github', { scope: ['profile', 'email'] }),
    (req, res) => res.send('redirecting to github...')
  );
router
  .route('/github/callback')
  .get(passport.authenticate('github'), handleSocialLogin);

export default router;
