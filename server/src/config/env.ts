import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/roomonrent?replicaSet=rs0'),
  REDIS_URL: z.string().url().optional(),
  JWT_ACCESS_SECRET: z.string().min(32).default('local-development-only-secret-change-before-deploy'),
});

export const env = envSchema.parse(process.env);

if (env.NODE_ENV === 'production' && env.JWT_ACCESS_SECRET === 'local-development-only-secret-change-before-deploy') {
  throw new Error('JWT_ACCESS_SECRET must be set to a unique secret in production.');
}
