import { createInsertSchema } from "drizzle-zod";
import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  farmLocation: varchar("farm_location", { length: 255 }),
  primaryCrop: varchar("primary_crop", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;