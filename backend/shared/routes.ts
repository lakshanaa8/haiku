import { z } from "zod";
import { insertPatientSchema, patients, calls } from "./schema";

export const api = {
  patients: {
    create: {
      method: "POST" as const,
      path: "/api/patients",
      input: insertPatientSchema,
      responses: {
        201: z.custom<typeof patients.$inferSelect>(),
        400: z.object({ message: z.string() }),
      },
    },
    list: {
      method: "GET" as const,
      path: "/api/patients",
      responses: {
        200: z.array(z.custom<typeof patients.$inferSelect>()),
      },
    },
  },
  calls: {
    list: {
      method: "GET" as const,
      path: "/api/calls",
      responses: {
        200: z.array(z.custom<typeof calls.$inferSelect>()),
      },
    },
  },
  dashboard: {
    stats: {
      method: "GET" as const,
      path: "/api/dashboard/stats",
      responses: {
        200: z.object({
          totalPatients: z.number(),
          hotLeads: z.number(),
          completedCalls: z.number(),
        }),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
