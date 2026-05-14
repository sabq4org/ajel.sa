import { db } from "./db";
import { auditLogs } from "./db/schema";

export async function logAction(params: {
  userId?: string;
  userFullName?: string;
  action: typeof auditLogs.$inferInsert["action"];
  entityType?: string;
  entityId?: string;
  entityTitle?: string;
  details?: Record<string, unknown>;
}) {
  try {
    await db.insert(auditLogs).values(params);
  } catch {
    // non-blocking — never fail the main operation
  }
}
