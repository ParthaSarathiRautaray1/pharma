import nodemailer, { type Transporter } from 'nodemailer';
import { env } from './env';
import { logger } from './logger';

let transporter: Transporter | null = null;

if (env.SMTP_HOST && env.SMTP_USER) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
}

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
}

/**
 * Sends via SMTP when configured; otherwise logs the message so flows
 * like forgot-password remain fully testable without an SMTP account.
 */
export async function sendMail(options: MailOptions): Promise<void> {
  if (!transporter) {
    logger.info('📧 [mail:dev] SMTP not configured — email logged instead', {
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    return;
  }
  await transporter.sendMail({ from: env.MAIL_FROM, ...options });
}
