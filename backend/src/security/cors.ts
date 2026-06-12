import cors from 'cors';
import type { CorsOptions } from 'cors';
import { env } from '../config/env';

export function createCorsMiddleware() {
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((s) => s.trim());

  const options: CorsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, etc.)
      if (!origin || allowedOrigins.includes(origin) || env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 86400,
  };

  return cors(options);
}
