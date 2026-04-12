import {
  boolean,
  decimal,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { profilesTable } from "./profiles";

export const walletsTable = pgTable("wallets", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().unique().references(() => profilesTable.id, { onDelete: "cascade" }),
  balance: decimal("balance", { precision: 12, scale: 2 }).notNull().default("0.00"),
  status: text("status").notNull().default("active"),
  currency: text("currency").notNull().default("BRL"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const walletCardsTable = pgTable("wallet_cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profilesTable.id, { onDelete: "cascade" }),
  bandeira: text("bandeira").notNull(),
  lastFour: text("last_four").notNull(),
  titular: text("titular").notNull(),
  validade: text("validade").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const walletTransactionsTable = pgTable("wallet_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  walletId: uuid("wallet_id").notNull().references(() => walletsTable.id, { onDelete: "cascade" }),
  profileId: uuid("profile_id").notNull().references(() => profilesTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  status: text("status").notNull().default("pending"),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  balanceBefore: decimal("balance_before", { precision: 12, scale: 2 }),
  balanceAfter: decimal("balance_after", { precision: 12, scale: 2 }),
  description: text("description"),
  contractId: uuid("contract_id"),
  cardId: uuid("card_id").references(() => walletCardsTable.id, { onDelete: "set null" }),
  pixKey: text("pix_key"),
  pixKeyType: text("pix_key_type"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertWalletSchema = createInsertSchema(walletsTable).omit({ createdAt: true, updatedAt: true });
export const insertWalletCardSchema = createInsertSchema(walletCardsTable).omit({ createdAt: true });
export const insertWalletTransactionSchema = createInsertSchema(walletTransactionsTable).omit({ createdAt: true, updatedAt: true });

export type Wallet = typeof walletsTable.$inferSelect;
export type WalletCard = typeof walletCardsTable.$inferSelect;
export type WalletTransaction = typeof walletTransactionsTable.$inferSelect;
export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type InsertWalletCard = z.infer<typeof insertWalletCardSchema>;
export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;
