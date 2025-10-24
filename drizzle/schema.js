import { relations, sql } from "drizzle-orm";
import {
  int,
  varchar,
  mysqlTable,
  timestamp,
  boolean,
  text,
  mysqlEnum,
} from "drizzle-orm/mysql-core";

export const shortLinksTable = mysqlTable("shortLinks", {
  id: int("id").primaryKey().autoincrement(),
  shortCode: varchar("shortCode", { length: 30 }).notNull().unique(),
  url: varchar("url", { length: 2555 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  userId: int("user_id")
    .notNull()
    .references(() => userTable.id),
});

export const sessionTable = mysqlTable("sessions", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id")
    .notNull()
    .references(() => userTable.id, { onDelete: "cascade" }),
  valid: boolean("valid").default(true).notNull(),
  userAgent: text("user_agent"),
  ip: varchar("ip", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const verifyEmailTokensTable = mysqlTable("verifyEmailToken", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id")
    .notNull()
    .references(() => userTable.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }),
  expiresAt: timestamp("expires_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP + INTERVAL 1 DAY)`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const passwordResetTokensTable = mysqlTable("password_reset_token", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id")
    .notNull()
    .references(() => userTable.id, { onDelete: "cascade" })
    .unique(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP + INTERVAL 1 HOUR)`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const oauthAccountsTable = mysqlTable("oauth_accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id")
    .notNull()
    .references(() => userTable.id, { onDelete: "cascade" })
    .unique(),
  provider: mysqlEnum("provider", ["google", "github"]).notNull(),
  providerAccountId: varchar("provider_account_id", { length: 255 })
    .notNull()
    .unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userTable = mysqlTable("users", {
  id: int().primaryKey().autoincrement(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  password: varchar({ length: 255 }),
  isEmailValid: boolean("is_email_valid").default(false).notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const userRelation = relations(userTable, ({ many }) => ({
  shortLinks: many(shortLinksTable),
  sessions: many(sessionTable),
}));

export const shortLinkRelation = relations(shortLinksTable, ({ one }) => ({
  users: one(userTable, {
    fields: [shortLinksTable.userId],
    references: [userTable.id],
  }),
}));

export const sessionRelation = relations(sessionTable, ({ one }) => ({
  users: one(userTable, {
    fields: [sessionTable.userId],
    references: [userTable.id],
  }),
}));
