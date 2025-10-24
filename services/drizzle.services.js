import { count, desc, eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { shortLinksTable } from "../drizzle/schema.js";

export const loadLinks = async ({ userId, limit = 10, offset = 0 }) => {
  const condition = eq(shortLinksTable.userId, userId);

  const links = await db
    .select()
    .from(shortLinksTable)
    .where(condition)
    .orderBy(desc(shortLinksTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ totalCount }] = await db
    .select({ totalCount: count() })
    .from(shortLinksTable)
    .where(condition);

  return {
    shortLinks: links,
    totalCount,
  };
};

export const checkShortCode = async (finalShortCode) => {
  const isPresent = await db
    .select()
    .from(shortLinksTable)
    .where(eq(shortLinksTable.shortCode, finalShortCode));

  return isPresent;
};

export const addShortenerLinks = async ({ shortCode, url, userId }) => {
  const addShortCode = await db.insert(shortLinksTable).values({
    shortCode,
    url,
    userId,
  });

  return addShortCode;
};

export const findShortLinkById = async (id) => {
  const [result] = await db
    .select()
    .from(shortLinksTable)
    .where(eq(shortLinksTable.id, id));

  return result;
};

export const updateShortCode = async ({ id, url, shortCode }) => {
  const [result] = await db
    .update(shortLinksTable)
    .set({ url, shortCode })
    .where(eq(shortLinksTable.id, id));

  return result;
};

export const deleteShortLinkById = async (id) => {
  return db.delete(shortLinksTable).where(eq(shortLinksTable.id, id));
};
