import { createInsertSchema } from "drizzle-zod";
import { decimal, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { z } from "zod/v4";

export const diseaseScansTable = pgTable("disease_scans", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  cropType: varchar("crop_type", { length: 100 }).notNull(),
  diseaseName: varchar("disease_name", { length: 255 }).notNull(),
  confidenceScore: decimal("confidence_score", { precision: 5, scale: 2 }).notNull(),
  symptoms: text("symptoms").array().notNull(),
  organicRemedy: text("organic_remedy").notNull(),
  chemicalRemedy: text("chemical_remedy").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDiseaseScanSchema = createInsertSchema(diseaseScansTable).omit({
  id: true,
  createdAt: true,
});
export type InsertDiseaseScan = z.infer<typeof insertDiseaseScanSchema>;
export type DiseaseScan = typeof diseaseScansTable.$inferSelect;