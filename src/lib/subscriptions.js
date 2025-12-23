// src/lib/subscriptions.js
import { query } from "@/lib/db";

/**
 * Get latest active subscription for a user.
 * Active = ends_at >= NOW().
 */
export async function getActiveSubscriptionForUser(userId) {
  if (!userId) return null;

  const { rows } = await query(
    `
    SELECT s.id,
           s.user_id,
           s.plan_id,
           s.starts_at,
           s.ends_at,
           s.remaining_contacts,
           p.code
    FROM public.subscriptions s
    JOIN public.plans p
      ON p.id = s.plan_id
    WHERE s.user_id = $1
      AND s.ends_at >= NOW()
    ORDER BY s.ends_at DESC
    LIMIT 1
    `,
    [userId]
  );

  return rows[0] || null; // either a row or null
}

/**
 * Simple boolean: is this user premium right now?
 */
export async function userIsPremium(userId) {
  const sub = await getActiveSubscriptionForUser(userId);
  return !!sub; // true if sub exists
}
