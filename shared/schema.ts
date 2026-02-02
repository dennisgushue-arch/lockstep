import { sql } from "drizzle-orm";
import { pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  creditBalance: text("credit_balance").notNull().default("0"), // Stored as text to avoid floating point issues
  created_at: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Credit Transactions: Purchase and usage history
export const creditTransactions = pgTable("credit_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // "purchase", "spend", "refund"
  amount: text("amount").notNull(), // Credits added or subtracted (stored as text)
  balanceAfter: text("balance_after").notNull(), // Balance after transaction
  description: text("description"), // Human-readable description
  stripePaymentIntentId: text("stripe_payment_intent_id"), // For purchases
  relatedCommitmentId: varchar("related_commitment_id"), // For spend/refund
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertCreditTransactionSchema = createInsertSchema(creditTransactions).pick({
  userId: true,
  type: true,
  amount: true,
  balanceAfter: true,
  description: true,
  stripePaymentIntentId: true,
  relatedCommitmentId: true,
});

export type InsertCreditTransaction = z.infer<typeof insertCreditTransactionSchema>;
export type CreditTransaction = typeof creditTransactions.$inferSelect;

// Passive Detection: Intent Signals
export const intentSignals = pgTable("intent_signals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  sourceType: text("source_type").notNull(), // "voice_note", "message", "calendar", "journal", "manual"
  sourceId: text("source_id"), // External ID if applicable (e.g., message thread ID)
  rawText: text("raw_text").notNull(),
  detectedAt: text("detected_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  normalizedIntent: text("normalized_intent"), // Cleaned/normalized version
  category: text("category"), // "fitness", "work", "growth", "social", etc.
  confidence: text("confidence"), // 0-1 score stored as text
  processed: text("processed").notNull().default("false"), // "true" or "false"
});

export const insertIntentSignalSchema = createInsertSchema(intentSignals).pick({
  userId: true,
  sourceType: true,
  sourceId: true,
  rawText: true,
  detectedAt: true,
  normalizedIntent: true,
  category: true,
  confidence: true,
  processed: true,
});

export type InsertIntentSignal = z.infer<typeof insertIntentSignalSchema>;
export type IntentSignal = typeof intentSignals.$inferSelect;

// Pattern Detection: Repeated Intent Clusters
export const intentPatterns = pgTable("intent_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  normalizedIntent: text("normalized_intent").notNull(), // The core intent phrase
  category: text("category").notNull(),
  firstDetectedAt: text("first_detected_at").notNull(),
  lastDetectedAt: text("last_detected_at").notNull(),
  occurrenceCount: text("occurrence_count").notNull().default("1"), // Stored as text
  daySpan: text("day_span").notNull().default("1"), // Days between first and last
  status: text("status").notNull().default("active"), // "active", "locked", "dismissed"
  suggestedStake: text("suggested_stake"), // Calculated based on frequency
  relatedSignalIds: text("related_signal_ids"), // JSON array of signal IDs
});

export const insertIntentPatternSchema = createInsertSchema(intentPatterns).pick({
  userId: true,
  normalizedIntent: true,
  category: true,
  firstDetectedAt: true,
  lastDetectedAt: true,
  occurrenceCount: true,
  daySpan: true,
  status: true,
  suggestedStake: true,
  relatedSignalIds: true,
});

export type InsertIntentPattern = z.infer<typeof insertIntentPatternSchema>;
export type IntentPattern = typeof intentPatterns.$inferSelect;

// Input Source Connections
export const inputSources = pgTable("input_sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  sourceType: text("source_type").notNull(), // "voice_notes", "sms", "whatsapp", "calendar", "journal"
  connected: text("connected").notNull().default("false"),
  authToken: text("auth_token"), // Encrypted OAuth token or API key
  lastSyncAt: text("last_sync_at"),
  settings: text("settings"), // JSON config (e.g., which calendar, filter rules)
});

export const insertInputSourceSchema = createInsertSchema(inputSources).pick({
  userId: true,
  sourceType: true,
  connected: true,
  authToken: true,
  lastSyncAt: true,
  settings: true,
});

export type InsertInputSource = z.infer<typeof insertInputSourceSchema>;
export type InputSource = typeof inputSources.$inferSelect;
