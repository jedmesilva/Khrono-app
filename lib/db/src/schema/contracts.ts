import {
  boolean,
  decimal,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  bigint,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { profilesTable } from "./profiles";

export const providerProfilesTable = pgTable("provider_profiles", {
  profileId: uuid("profile_id").primaryKey().references(() => profilesTable.id, { onDelete: "cascade" }),
  valorBase: decimal("valor_base", { precision: 10, scale: 2 }).notNull().default("50.00"),
  nota: decimal("nota", { precision: 3, scale: 2 }).notNull().default("0.00"),
  avaliacoes: integer("avaliacoes").notNull().default(0),
  totalContracts: integer("total_contracts").notNull().default(0),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const providerPinsTable = pgTable("provider_pins", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profilesTable.id, { onDelete: "cascade" }),
  pin: text("pin").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const providerServicesTable = pgTable("provider_services", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => profilesTable.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  multiplicador: decimal("multiplicador", { precision: 5, scale: 3 }).notNull().default("1.000"),
  skill: text("skill"),
  tools: jsonb("tools").notNull().default([]),
  nota: decimal("nota", { precision: 3, scale: 2 }).notNull().default("0.00"),
  avaliacoes: integer("avaliacoes").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contractsTable = pgTable("contracts", {
  id: uuid("id").primaryKey().defaultRandom(),
  hiringUserId: uuid("hiring_user_id").notNull().references(() => profilesTable.id),
  hiredUserId: uuid("hired_user_id").notNull().references(() => profilesTable.id),
  tipo: text("tipo").notNull(),
  status: text("status").notNull().default("active"),
  ratePerHour: decimal("rate_per_hour", { precision: 10, scale: 2 }).notNull(),
  duracaoTotal: bigint("duracao_total", { mode: "number" }),
  serviceId: uuid("service_id"),
  serviceName: text("service_name"),
  paymentMethod: text("payment_method"),
  paymentCardLabel: text("payment_card_label"),
  agendado: boolean("agendado").notNull().default(false),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const providerLocationsTable = pgTable("provider_locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().unique().references(() => profilesTable.id, { onDelete: "cascade" }),
  locationMode: text("location_mode").notNull().default("realtime"),
  serviceRadiusMeters: integer("service_radius_meters").notNull().default(5000),
  fixedAddress: text("fixed_address"),
  fixedLat: decimal("fixed_lat", { precision: 9, scale: 6 }),
  fixedLng: decimal("fixed_lng", { precision: 9, scale: 6 }),
  realtimeLat: decimal("realtime_lat", { precision: 9, scale: 6 }),
  realtimeLng: decimal("realtime_lng", { precision: 9, scale: 6 }),
  realtimeUpdatedAt: timestamp("realtime_updated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertContractSchema = createInsertSchema(contractsTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertContract = z.infer<typeof insertContractSchema>;
export type ContractRow = typeof contractsTable.$inferSelect;
export type ProviderProfileRow = typeof providerProfilesTable.$inferSelect;
export type ProviderPinRow = typeof providerPinsTable.$inferSelect;
export type ProviderServiceRow = typeof providerServicesTable.$inferSelect;
export type ProviderLocationRow = typeof providerLocationsTable.$inferSelect;
