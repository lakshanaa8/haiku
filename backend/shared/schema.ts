import { pgTable, text, serial, timestamp, date, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  healthIssue: text("health_issue").notNull(),
  severity: text("severity", { enum: ["high", "moderate", "low"] }).notNull(),
  appointmentDate: date("appointment_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const calls = pgTable("calls", {
  id: serial("id").primaryKey(),
  patientId: serial("patient_id").references(() => patients.id),
  audioUrl: text("audio_url"),
  transcription: text("transcription"),
  sentimentLabel: text("sentiment_label", { enum: ["Hot", "Non-hot"] }),
  status: text("status", { enum: ["pending", "processing", "completed", "failed", "not_available", "in_progress"] }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPatientSchema = createInsertSchema(patients).omit({ 
  id: true, 
  createdAt: true 
});

export const insertCallSchema = createInsertSchema(calls).omit({ 
  id: true, 
  createdAt: true 
});

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

export type Call = typeof calls.$inferSelect;
export type InsertCall = z.infer<typeof insertCallSchema>;
