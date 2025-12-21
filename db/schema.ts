import {
  pgTable,
  text,
  uuid,
  timestamp,
  decimal,
  primaryKey,
  pgEnum,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const transactionTypeEnum = pgEnum("transaction_type", ["debit", "credit"]);

// ACCOUNTS TABLE
export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  userId: text("user_id").notNull(),
  balanceId: uuid("balance_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

// BALANCES TABLE
export const balances = pgTable("balances", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id")
    .references(() => accounts.id, {
      onDelete: "cascade",
    })
    .notNull(),
  balance: decimal("balance", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBalanceSchema = createInsertSchema(balances, {
  balance: z.coerce.string(),
});

export const insertAccountSchema = createInsertSchema(accounts);

// CATEGORIES TABLE
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => ({
  uniqueNamePerUser: unique().on(table.name, table.userId),
}));

export const insertCategorySchema = createInsertSchema(categories);

// TRANSACTIONS TABLE
export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  type: transactionTypeEnum("type").notNull(),
  description: text("description"),
  date: timestamp("date", { mode: "date" }).notNull(),
  accountId: uuid("account_id")
    .references(() => accounts.id, {
      onDelete: "cascade",
    })
    .notNull(),
  categoryId: uuid("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export const insertTransactionSchema = createInsertSchema(transactions, {
  amount: z.coerce.string(),
});
