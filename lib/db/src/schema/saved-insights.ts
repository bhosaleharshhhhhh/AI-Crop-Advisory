import { createInsertSchema } from "drizzle-zod";
import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { z } from "zod/v4";

export const savedInsightType = pgEnum("saved_insight_type", ["scan", "advisory"]);

export const savedInsightsTable = pgTable("saved_insights", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  sourceType: savedInsightType("source_type").notNull(),
  sourceId: uuid("source_id").notNull(),
  label: text("label").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSavedInsightSchema = createInsertSchema(savedInsightsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertSavedInsight = z.infer<typeof insertSavedInsightSchema>;
export type SavedInsight = typeof savedInsightsTable.$inferSelect;