import type { Request, Response } from 'express';
import { ok } from '../../shared/types/api';
import { authService } from './auth.service';
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RefreshInput,
  ResetPasswordInput,
} from './auth.validators';

function requestMeta(req: Request) {
  return { userAgent: req.headers['user-agent'], ip: req.ip };
}

export const authController = {
  async login(req: Request, res: Response) {
    const { email, password } = req.body as LoginInput;
    const session = await authService.login(email, password, requestMeta(req));
    res.json(ok(session));
  },

  async refresh(req: Request, res: Response) {
    const { refreshToken } = req.body as RefreshInput;
    const session = await authService.refresh(refreshToken, requestMeta(req));
    res.json(ok(session));
  },

  async logout(req: Request, res: Response) {
    const { refreshToken } = req.body as RefreshInput;
    await authService.logout(refreshToken);
    res.json(ok({ loggedOut: true }));
  },

  async forgotPassword(req: Request, res: Response) {
    const { email } = req.body as ForgotPasswordInput;
    await authService.forgotPassword(email);
    res.json(ok({ sent: true }));
  },

  async resetPassword(req: Request, res: Response) {
    const { token, password } = req.body as ResetPasswordInput;
    await authService.resetPassword(token, password);
    res.json(ok({ reset: true }));
  },

  async changePassword(req: Request, res: Response) {
    const { currentPassword, newPassword } = req.body as ChangePasswordInput;
    await authService.changePassword(req.user!.id, currentPassword, newPassword);
    res.json(ok({ changed: true }));
  },

  async me(req: Request, res: Response) {
    res.json(ok(await authService.me(req.user!.id)));
  },
};
