// src/lib/admin-audit.js — who did what in the admin panel
import { query } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";
import { getAuthPayload } from "@/lib/auth";

/** Record an admin action. Never throws. */
export async function logAdmin(action, targetUserId = null, details = null, adminId = null) {
  try {
    await ensureSchema();
    const who = adminId || (await getAuthPayload())?.id || null;
    await query(
      `INSERT INTO admin_audit (admin_id, action, target_user_id, details) VALUES ($1, $2, $3, $4)`,
      [who, String(action).slice(0, 60), targetUserId || null, details ? JSON.stringify(details) : null]
    );
  } catch (e) {
    console.error("[admin-audit]", e.message);
  }
}
