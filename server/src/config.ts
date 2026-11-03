import "dotenv/config";
import { z } from "zod";

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGO_URI: z.string().default("mongodb://127.0.0.1:27017/roomonrent"),
  REDIS_URL: z.string().optional(),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
  JWT_ACCESS_SECRET: z.string().min(32).optional(),
  JWT_REFRESH_SECRET: z.string().min(32).optional(),
  DEMO_PAYMENT_MODE: z.enum(["true", "false"]).default("true"),
});

const environment = configSchema.parse(process.env);
if (environment.NODE_ENV === "production" && (!environment.JWT_ACCESS_SECRET || !environment.JWT_REFRESH_SECRET)) {
  throw new Error("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set in production.");
}

export const config = {
  ...environment,
  JWT_ACCESS_SECRET: environment.JWT_ACCESS_SECRET ?? "development-access-secret-change-before-deploy",
  JWT_REFRESH_SECRET: environment.JWT_REFRESH_SECRET ?? "development-refresh-secret-change-before-deploy",
};
export const isProduction = environment.NODE_ENV === "production";
