import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../shared/utils/async-handler';
import { authController } from './auth.controller';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  resetPasswordSchema,
} from './auth.validators';

export const authRouter = Router();

// Credential endpoints get a much tighter limit than the global one
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many attempts, try again later' },
  },
});

authRouter.post('/login', credentialLimiter, validate({ body: loginSchema }), asyncHandler(authController.login));
authRouter.post('/refresh', validate({ body: refreshSchema }), asyncHandler(authController.refresh));
authRouter.post('/logout', requireAuth, validate({ body: refreshSchema }), asyncHandler(authController.logout));
authRouter.post('/forgot-password', credentialLimiter, validate({ body: forgotPasswordSchema }), asyncHandler(authController.forgotPassword));
authRouter.post('/reset-password', credentialLimiter, validate({ body: resetPasswordSchema }), asyncHandler(authController.resetPassword));
authRouter.post('/change-password', requireAuth, validate({ body: changePasswordSchema }), asyncHandler(authController.changePassword));
authRouter.get('/me', requireAuth, asyncHandler(authController.me));
