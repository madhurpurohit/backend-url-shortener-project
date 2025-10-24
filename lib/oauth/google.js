import { Google } from "arctic";
import { env } from "../../config/env.js";
import "dotenv/config";

export const google = new Google(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  `${process.env.FRONTEND_URL}/google/callback`
);
