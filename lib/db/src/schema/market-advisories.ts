import { createInsertSchema } from "drizzle-zod";
import { jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { z } from "zod/v4";

export const marketAdvisoriesTable = pgTable("market_advisories", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  cropType: varchar("crop_type", { length: 100 }).notNull(),
  location: varchar("location", { length: 255 }).notNull(),
  advisoryContent: jsonb("advisory_content").$type<{
    weatherRisks: string[];
    harvestRecommendation: string;
    marketSellingStrategy: string;
  }>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMarketAdvisorySchema = createInsertSchema(marketAdvisoriesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertMarketAdvisory = z.infer<typeof insertMarketAdvisorySchema>;
export type MarketAdvisory = typeof marketAdvisoriesTable.$inferSelect;