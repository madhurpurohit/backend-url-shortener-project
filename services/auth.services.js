import { and, eq, gte, lt, sql, isNull } from "drizzle-orm";
import { db } from "../config/db.js";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import "dotenv/config";
import ejs from "ejs";
import fs from "fs/promises";
import path from "path";
import mjml2html from "mjml";

import {
  oauthAccountsTable,
  passwordResetTokensTable,
  sessionTable,
  shortLinksTable,
  userTable,
  verifyEmailTokensTable,
} from "../drizzle/schema.js";
import {
  ACCESS_TOKEN_EXPIRY,
  MILLISECONDS_PER_SECOND,
  REFRESH_TOKEN_EXPIRY,
} from "../config/constants.js";
import { sendMail } from "../lib/nodemailer.js";

export const getUserByEmail = async (email) => {
  try {
    const [user] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, email));

    return user;
  } catch (error) {
    console.error("Error in getUserByEmail:", error);
    throw error;
  }
};

export const createUser = async ({ name, email, password }) => {
  try {
    const [user] = await db
      .insert(userTable)
      .values({ name, email, password })
      .$returningId();

    return user;
  } catch (error) {
    console.error("Error in createUser:", error);
    throw error;
  }
};

export const getHashedPassword = async (password) => {
  try {
    return await argon2.hash(password);
  } catch (error) {
    console.error("Error in getHashedPassword:", error);
    throw error;
  }
};

export const comparePassword = async (password, hash) => {
  try {
    return await argon2.verify(hash, password);
  } catch (error) {
    console.error("Error in comparePassword:", error);
    throw error;
  }
};

export const createSession = async (userId, { ip, userAgent }) => {
  try {
    const [result] = await db
      .insert(sessionTable)
      .values({ userId, ip, userAgent })
      .$returningId();

    return result;
  } catch (error) {
    console.error("Error in createSession:", error);
    throw error;
  }
};

export const createAccessToken = ({ id, name, email, sessionId }) => {
  return jwt.sign({ id, name, email, sessionId }, process.env.SECRET_KEY, {
    expiresIn: ACCESS_TOKEN_EXPIRY / MILLISECONDS_PER_SECOND,
  });
};

export const createRefreshToken = ({ sessionId }) => {
  return jwt.sign({ sessionId }, process.env.SECRET_KEY, {
    expiresIn: REFRESH_TOKEN_EXPIRY / MILLISECONDS_PER_SECOND,
  });
};

export const verifyJWTToken = (token) => {
  return jwt.verify(token, process.env.SECRET_KEY);
};

export const findSessionById = async (sessionId) => {
  try {
    const [session] = await db
      .select()
      .from(sessionTable)
      .where(eq(sessionTable.id, sessionId));

    return session;
  } catch (error) {
    console.error("Error in findSessionById:", error);
    throw error;
  }
};

export const findUserById = async (userId) => {
  try {
    const [user] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, userId));

    return user;
  } catch (error) {
    console.error("Error in findUserById:", error);
    throw error;
  }
};

export const refreshTokens = async (refreshToken) => {
  try {
    const decodedToken = verifyJWTToken(refreshToken);
    const currentSession = await findSessionById(decodedToken.sessionId);

    if (!currentSession || !currentSession.valid) {
      throw new Error("Invalid Session");
    }

    const user = await findUserById(currentSession.userId);

    if (!user) {
      throw new Error("Invalid User");
    }

    const userInfo = {
      id: user.id,
      name: user.name,
      email: user.email,
      isEmailValid: user.isEmailValid,
      sessionId: createSession.id,
    };

    const newAccessToken = createAccessToken(userInfo);

    const newRefreshToken = createRefreshToken({
      sessionId: currentSession.id,
    });

    return {
      newAccessToken,
      newRefreshToken,
      user: userInfo,
    };
  } catch (error) {
    console.error(
      "\nRefresh Token Generate Error in refreshTokens: ",
      error.message
    );
    throw error;
  }
};

export const clearUserSession = async (sessionId) => {
  try {
    return db.delete(sessionTable).where(eq(sessionTable.id, sessionId));
  } catch (error) {
    console.error("Error in clearUserSession:", error);
    throw error;
  }
};

export const authenticateUser = async ({ req, res, user, name, email }) => {
  try {
    const session = await createSession(user.id, {
      ip: req.clientIp,
      userAgent: req.headers["user-agent"],
    });

    const accessToken = createAccessToken({
      id: user.id,
      name: user.name || name,
      email: user.email || email,
      isEmailValid: user.isEmailValid,
      sessionId: session.id,
    });

    const refreshToken = createRefreshToken({ sessionId: session.id });

    const baseConfig = { httpOnly: true, secure: true };

    res.cookie("access_token", accessToken, {
      ...baseConfig,
      maxAge: ACCESS_TOKEN_EXPIRY,
    });

    res.cookie("refresh_token", refreshToken, {
      ...baseConfig,
      maxAge: REFRESH_TOKEN_EXPIRY,
    });
  } catch (error) {
    console.error("Error in authenticateUser:", error);
    throw error;
  }
};

export const getAllShortLinks = async (userId) => {
  try {
    return db
      .select()
      .from(shortLinksTable)
      .where(eq(shortLinksTable.userId, userId));
  } catch (error) {
    console.error("Error in getAllShortLinks:", error);
    throw error;
  }
};

export const generateRandomToken = (digit = 8) => {
  const min = 10 ** (digit - 1);
  const max = 10 ** digit;

  return crypto.randomInt(min, max).toString();
};

export const insertVerifyEmailToken = async ({ userId, token }) => {
  return db.transaction(async (tx) => {
    try {
      await tx
        .delete(verifyEmailTokensTable)
        .where(lt(verifyEmailTokensTable.expiresAt, sql`CURRENT_TIMESTAMP`));

      await tx
        .delete(verifyEmailTokensTable)
        .where(eq(verifyEmailTokensTable.userId, userId));

      return await tx.insert(verifyEmailTokensTable).values({ userId, token });
    } catch (error) {
      console.error(
        "Failed to insert verify email token in insertVerifyEmailToken:",
        error
      );
      throw new Error("Unable to create verification token");
    }
  });
};

export const createVerifyEmailLink = async ({ email, token }) => {
  try {
    const url = new URL(`${process.env.FRONTEND_URL}/verify-email-token`);

    url.searchParams.append("token", token);
    url.searchParams.append("email", email);

    return url.toString();
  } catch (error) {
    console.error("Error in createVerifyEmailLink:", error);
    throw error;
  }
};

export const findVerificationEmailToken = async ({ token, email }) => {
  try {
    return db
      .select({
        userId: userTable.id,
        email: userTable.email,
        token: verifyEmailTokensTable.token,
        expiresAt: verifyEmailTokensTable.expiresAt,
      })
      .from(verifyEmailTokensTable)
      .where(
        and(
          eq(verifyEmailTokensTable.token, token),
          eq(userTable.email, email),
          gte(verifyEmailTokensTable.expiresAt, sql`CURRENT_TIMESTAMP`)
        )
      )
      .innerJoin(userTable, eq(verifyEmailTokensTable.userId, userTable.id));
  } catch (error) {
    console.error("Error in findVerificationEmailToken:", error);
    throw error;
  }
};

export const verifyUserEmailAndUpdate = async (email) => {
  try {
    return db
      .update(userTable)
      .set({ isEmailValid: true })
      .where(eq(userTable.email, email));
  } catch (error) {
    console.error("Error in verifyUserEmailAndUpdate:", error);
    throw error;
  }
};

export const clearVerifyEmailTokens = async (userId) => {
  try {
    return db
      .delete(verifyEmailTokensTable)
      .where(eq(verifyEmailTokensTable.userId, userId));
  } catch (error) {
    console.error("Error in clearVerifyEmailTokens:", error);
    throw error;
  }
};

export const sendNewVerifyEmailLink = async ({ email, userId }) => {
  try {
    const randomToken = generateRandomToken();

    await insertVerifyEmailToken({ userId, token: randomToken });

    const verifyEmailLink = await createVerifyEmailLink({
      email,
      token: randomToken,
    });

    const mjmlTemplate = await fs.readFile(
      path.join(import.meta.dirname, "..", "emails", "verify-email.mjml"),
      "utf-8"
    );

    const filledTemplate = ejs.render(mjmlTemplate, {
      code: randomToken,
      link: verifyEmailLink,
    });

    //todo 3. To convert the MJML to HTML
    const htmlOutput = mjml2html(filledTemplate).html;

    await sendMail({
      to: email,
      subject: "Verify your email",
      html: htmlOutput,
    });
  } catch (error) {
    console.error("Error in sendNewVerifyEmailLink:", error);
    throw error;
  }
};

export const updateUserByName = async ({ userId, name, avatarUrl }) => {
  try {
    return db
      .update(userTable)
      .set({ name, avatarUrl })
      .where(eq(userTable.id, userId));
  } catch (error) {
    console.error("Error in updateUserByName:", error);
    throw error;
  }
};

export const updateUserPassword = async ({ userId, password }) => {
  try {
    const hashPassword = await getHashedPassword(password);

    return await db
      .update(userTable)
      .set({ password: hashPassword })
      .where(eq(userTable.id, userId));
  } catch (error) {
    console.error("Error in updateUserPassword:", error);
    throw error;
  }
};

export const findUserByEmail = async (email) => {
  try {
    const [user] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, email));

    return user;
  } catch (error) {
    console.error("Error in findUserByEmail:", error);
    throw error;
  }
};

export const createResetPasswordLink = async ({ userId }) => {
  try {
    const randomToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(randomToken)
      .digest("hex");

    await db
      .delete(passwordResetTokensTable)
      .where(eq(passwordResetTokensTable.userId, userId));

    await db.insert(passwordResetTokensTable).values({ userId, tokenHash });

    return `${process.env.FRONTEND_URL}/reset-password/${randomToken}`;
  } catch (error) {
    console.error("Error in createResetPasswordLink:", error);
    throw error;
  }
};

export const getResetPasswordToken = async (token) => {
  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const [data] = await db
      .select()
      .from(passwordResetTokensTable)
      .where(
        and(
          eq(passwordResetTokensTable.tokenHash, tokenHash),
          gte(passwordResetTokensTable.expiresAt, sql`CURRENT_TIMESTAMP`)
        )
      );

    return data;
  } catch (error) {
    console.error("Error in getResetPasswordToken:", error);
    throw error;
  }
};

export const clearResetPasswordToken = async (userId) => {
  try {
    return db
      .delete(passwordResetTokensTable)
      .where(eq(passwordResetTokensTable.userId, userId));
  } catch (error) {
    console.error("Error in clearResetPasswordToken:", error);
    throw error;
  }
};

export async function getUserWithOauthId({ email, provider }) {
  try {
    const [user] = await db
      .select({
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
        isEmailValid: userTable.isEmailValid,
        providerAccountId: oauthAccountsTable.providerAccountId,
        provider: oauthAccountsTable.provider,
      })
      .from(userTable)
      .where(eq(userTable.email, email))
      .leftJoin(
        oauthAccountsTable,
        and(
          eq(oauthAccountsTable.provider, provider),
          eq(oauthAccountsTable.userId, userTable.id)
        )
      );

    return user;
  } catch (error) {
    console.error("Error in getUserWithOauthId:", error);
    throw error;
  }
}

export async function linkUserWithOauth({
  userId,
  provider,
  providerAccountId,
  avatarUrl,
}) {
  try {
    await db.insert(oauthAccountsTable).values({
      userId,
      provider,
      providerAccountId,
    });

    if (avatarUrl) {
      await db
        .update(userTable)
        .set({ avatarUrl })
        .where(and(eq(userTable.id, userId), isNull(userTable.avatarUrl)));
    }
  } catch (error) {
    console.error("Error in linkUserWithOauth:", error);
    throw error;
  }
}

export async function createUserWithOauth({
  name,
  email,
  provider,
  providerAccountId,
  avatarUrl,
}) {
  try {
    const user = await db.transaction(async (trx) => {
      const [user] = await trx
        .insert(userTable)
        .values({
          email,
          name,
          avatarUrl,
          isEmailValid: true,
        })
        .$returningId();

      await trx.insert(oauthAccountsTable).values({
        provider,
        providerAccountId,
        userId: user.id,
      });

      return {
        id: user.id,
        name,
        email,
        isEmailValid: true,
        provider,
        providerAccountId,
      };
    });

    return user;
  } catch (error) {
    console.error("Error in createUserWithOauth:", error);
    throw error;
  }
}
