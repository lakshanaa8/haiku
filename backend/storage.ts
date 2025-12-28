import { db } from "./db";
import { patients, calls, type InsertPatient, type InsertCall } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  createPatient(patient: InsertPatient): Promise<typeof patients.$inferSelect>;
  getPatients(): Promise<typeof patients.$inferSelect[]>;
  createCall(call: InsertCall): Promise<typeof calls.$inferSelect>;
  updateCall(id: number, updates: Partial<InsertCall>): Promise<typeof calls.$inferSelect>;
  getCalls(): Promise<typeof calls.$inferSelect[]>;
  getDashboardStats(): Promise<{ totalPatients: number; hotLeads: number; completedCalls: number }>;
}

export class DatabaseStorage implements IStorage {
  async createPatient(patient: InsertPatient): Promise<typeof patients.$inferSelect> {
    const [newPatient] = await db.insert(patients).values(patient).returning();
    return newPatient;
  }

  async getPatients(): Promise<typeof patients.$inferSelect[]> {
    return await db.select().from(patients).orderBy(desc(patients.createdAt));
  }

  async createCall(call: InsertCall): Promise<typeof calls.$inferSelect> {
    const [newCall] = await db.insert(calls).values(call).returning();
    return newCall;
  }

  async updateCall(id: number, updates: Partial<InsertCall>): Promise<typeof calls.$inferSelect> {
    const [updatedCall] = await db
      .update(calls)
      .set(updates)
      .where(eq(calls.id, id))
      .returning();
    return updatedCall;
  }

  async getCalls(): Promise<typeof calls.$inferSelect[]> {
    return await db.select().from(calls).orderBy(desc(calls.createdAt));
  }

  async getDashboardStats() {
    const allPatients = await db.select().from(patients);
    const allCalls = await db.select().from(calls);
    const hotLeads = allCalls.filter(c => c.sentimentLabel === "Hot").length;
    const completedCalls = allCalls.filter(c => c.status === "completed").length;
    const notAvailableCalls = allCalls.filter(c => c.status === "not_available").length;
    const inProgressCalls = allCalls.filter(c => c.status === "in_progress").length;
    
    return {
      totalPatients: allPatients.length,
      hotLeads,
      completedCalls,
      notAvailableCalls,
      inProgressCalls,
      totalCalls: allCalls.length
    };
  }
}

export const storage = new DatabaseStorage();
