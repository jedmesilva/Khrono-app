import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const skillsCatalogTable = pgTable("skills_catalog", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull(),
  description: text("description"),
  category: text("category"),
  status: text("status").notNull().default("active"),
  verified: boolean("verified").notNull().default(false),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const servicesCatalogTable = pgTable("services_catalog", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull(),
  description: text("description"),
  category: text("category"),
  status: text("status").notNull().default("active"),
  verified: boolean("verified").notNull().default(false),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const userSkillsTable = pgTable("user_skills", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull(),
  skillId: uuid("skill_id").notNull().references(() => skillsCatalogTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const userServicesTable = pgTable("user_services", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull(),
  serviceId: uuid("service_id").notNull().references(() => servicesCatalogTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertSkillsCatalogSchema = createInsertSchema(skillsCatalogTable).omit({
  createdAt: true,
  updatedAt: true,
});
export const insertServicesCatalogSchema = createInsertSchema(servicesCatalogTable).omit({
  createdAt: true,
  updatedAt: true,
});
export const insertUserSkillSchema = createInsertSchema(userSkillsTable).omit({ createdAt: true });
export const insertUserServiceSchema = createInsertSchema(userServicesTable).omit({ createdAt: true });

export type SkillsCatalog = typeof skillsCatalogTable.$inferSelect;
export type ServicesCatalog = typeof servicesCatalogTable.$inferSelect;
export type UserSkill = typeof userSkillsTable.$inferSelect;
export type UserService = typeof userServicesTable.$inferSelect;

export type InsertSkillsCatalog = z.infer<typeof insertSkillsCatalogSchema>;
export type InsertServicesCatalog = z.infer<typeof insertServicesCatalogSchema>;
export type InsertUserSkill = z.infer<typeof insertUserSkillSchema>;
export type InsertUserService = z.infer<typeof insertUserServiceSchema>;
