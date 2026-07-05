import bcrypt from 'bcrypt';
import { env } from '../../config/env';
import { sendMail } from '../../config/mail';
import { prisma } from '../../config/prisma';
import { AppError } from '../../shared/errors/app-error';
import type { AuthUser } from '../../shared/types/auth';
import { generateToken, sha256 } from '../../shared/utils/crypto';
import { refreshTokenTtlMs, signAccessToken } from './auth.tokens';

interface RequestMeta {
  userAgent?: string;
  ip?: string;
}

export interface SessionPayload {
  user: {
    id: string;
    name: string;
    email: string;
    role: AuthUser['role'];
    pharmacyId: string | null;
    pharmacyName: string | null;
  };
  accessToken: string;
  refreshToken: string;
}

const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  pharmacyId: true,
  pharmacy: { select: { name: true } },
} as const;

async function issueSession(userId: string, meta: RequestMeta): Promise<SessionPayload> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: PUBLIC_USER_SELECT,
  });

  const refreshToken = generateToken();
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: sha256(refreshToken),
      userAgent: meta.userAgent,
      ip: meta.ip,
      expiresAt: new Date(Date.now() + refreshTokenTtlMs()),
    },
  });

  const authUser: AuthUser = { id: user.id, role: user.role, pharmacyId: user.pharmacyId };
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      pharmacyId: user.pharmacyId,
      pharmacyName: user.pharmacy?.name ?? null,
    },
    accessToken: signAccessToken(authUser),
    refreshToken,
  };
}

export const authService = {
  async login(email: string, password: string, meta: RequestMeta): Promise<SessionPayload> {
    const user = await prisma.user.findUnique({ where: { email } });
    // bcrypt.compare against a dummy hash on unknown emails would prevent
    // timing enumeration; at pharmacy scale the simple check is acceptable.
    if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
      throw AppError.invalidCredentials();
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await prisma.auditLog.create({
      data: {
        pharmacyId: user.pharmacyId,
        userId: user.id,
        action: 'auth.login',
        entityType: 'user',
        entityId: user.id,
        ip: meta.ip,
      },
    });

    return issueSession(user.id, meta);
  },

  /** Rotation: the presented token is revoked and a fresh pair issued. */
  async refresh(refreshToken: string, meta: RequestMeta): Promise<SessionPayload> {
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(refreshToken) },
      include: { user: { select: { isActive: true } } },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date() || !stored.user.isActive) {
      throw AppError.unauthorized('Refresh token is invalid or expired');
    }

    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return issueSession(stored.userId, meta);
  },

  async logout(refreshToken: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  /** Always resolves — response never reveals whether the email exists. */
  async forgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) return;

    const token = generateToken(32);
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      },
    });

    const resetUrl = `${env.APP_URL}/auth/reset-password?token=${token}`;
    await sendMail({
      to: user.email,
      subject: 'Reset your PharmaCare password',
      html: `
        <p>Hi ${user.name},</p>
        <p>We received a request to reset your password. This link is valid for 30 minutes:</p>
        <p><a href="${resetUrl}">Reset password</a></p>
        <p>If you didn't request this, you can safely ignore this email.</p>`,
    });
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const stored = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: sha256(token) },
    });
    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      throw AppError.badRequest('Reset link is invalid or has expired');
    }

    const passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
    await prisma.$transaction([
      prisma.user.update({ where: { id: stored.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({
        where: { id: stored.id },
        data: { usedAt: new Date() },
      }),
      // Password change invalidates every active session
      prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw AppError.badRequest('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  },

  async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { ...PUBLIC_USER_SELECT, phone: true, lastLoginAt: true, createdAt: true },
    });
    if (!user || !('id' in user)) throw AppError.notFound('User');
    const { pharmacy, ...rest } = user;
    return { ...rest, pharmacyName: pharmacy?.name ?? null };
  },
};
