import { GitHub } from "arctic";
import { env } from "../../config/env.js";
import "dotenv/config";

export const github = new GitHub(
  env.GITHUB_CLIENT_ID,
  env.GITHUB_CLIENT_SECRET,
  `${process.env.FRONTEND_URL}/github/callback`
);
