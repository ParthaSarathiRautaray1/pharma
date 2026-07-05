import path from 'node:path';
import winston from 'winston';
import { env, isProd } from './env';

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

const consoleFormat = combine(
  colorize(),
  timestamp({ format: 'HH:mm:ss' }),
  printf(({ level, message, timestamp: ts, ...meta }) => {
    const rest = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${ts} ${level}: ${message}${rest}`;
  }),
);

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: combine(errors({ stack: true }), timestamp(), json()),
  transports: [
    new winston.transports.Console({ format: isProd ? undefined : consoleFormat }),
    // File transports only where the disk persists (VPS). On Render's
    // ephemeral filesystem stdout is the source of truth.
    ...(isProd
      ? []
      : [
          new winston.transports.File({
            filename: path.join('logs', 'error.log'),
            level: 'error',
          }),
          new winston.transports.File({ filename: path.join('logs', 'combined.log') }),
        ]),
  ],
});
