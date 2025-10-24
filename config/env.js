import { z } from "zod";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(import.meta.dirname, "../.env") });

export const envSchema = z
  .object({
    PORT: z.coerce.number().default(4001),
  })
  .parse(process.env);

export const env = z
  .object({
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    GITHUB_CLIENT_ID: z.string().min(1),
    GITHUB_CLIENT_SECRET: z.string().min(1),
    FRONTEND_URL: z.string().url().trim().min(1),
  })
  .parse(process.env);
