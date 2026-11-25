// src/lib/photos.js
// Member photos: stored in media_files (survives serverless deploys), served through
// /api/member-photo/[photoId] which enforces "photo lock" (visible only to connections).
import { query } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";
import { MAX_IMAGE_BYTES, sniffImageType } from "@/lib/media";

export const MAX_PHOTOS = 8;
export const memberPhotoUrl = (photoId) => `/api/member-photo/${photoId}`;

/** Owner's profile row (creates nothing). */
export async function profileOfUser(userId) {
  const { rows } = await query(
    `SELECT id, user_id, matri_id, COALESCE(photo_locked, false) AS photo_locked FROM matrimony_profiles WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

/** Validate + store an image upload, add it to the member's gallery. Throws Error(user-facing message). */
export async function addMemberPhoto(userId, file) {
  await ensureSchema();
  if (!file || typeof file.arrayBuffer !== "function" || !file.size) throw new Error("Please choose a photo.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Photo is too large — please keep it under 4 MB.");
  const buf = Buffer.from(await file.arrayBuffer());
  const type = sniffImageType(buf);
  if (!type || type === "image/gif") throw new Error("Please upload a JPG, PNG or WebP photo.");

  const prof = await profileOfUser(userId);
  if (!prof) throw new Error("Please complete your profile before adding photos.");

  const { rows: cnt } = await query(`SELECT COUNT(*)::int AS n FROM photos WHERE profile_id = $1`, [prof.id]);
  if ((cnt[0]?.n || 0) >= MAX_PHOTOS) throw new Error(`You can have up to ${MAX_PHOTOS} photos. Delete one to add another.`);

  const media = await query(
    `INSERT INTO media_files (content_type, data, size_bytes, original_name) VALUES ($1, $2, $3, $4) RETURNING id`,
    [type, buf, buf.length, `member-photo-${userId}`]
  );
  const isFirst = (cnt[0]?.n || 0) === 0;
  const { rows } = await query(
    `INSERT INTO photos (id, profile_id, path, is_primary, created_at, media_id)
     VALUES (gen_random_uuid(), $1, '', $2, NOW(), $3) RETURNING id`,
    [prof.id, isFirst, media.rows[0].id]
  );
  const photoId = rows[0].id;
  await query(`UPDATE photos SET path = $1 WHERE id = $2`, [memberPhotoUrl(photoId), photoId]);

  // anyone who asked for a photo gets their request marked as fulfilled
  await query(
    `UPDATE photo_requests SET status = 'fulfilled', answered_at = NOW() WHERE owner_id = $1 AND status = 'pending'`,
    [userId]
  ).catch(() => {});

  return { id: photoId, url: memberPhotoUrl(photoId), is_primary: isFirst };
}

/** Is `viewerId` allowed to see `ownerUserId`'s photos given their lock setting? */
export async function canSeePhotos(viewerId, ownerUserId, locked) {
  if (!locked) return true;
  if (!viewerId) return false;
  if (String(viewerId) === String(ownerUserId)) return true;
  const { rows } = await query(
    `SELECT
       EXISTS (SELECT 1 FROM interests WHERE status = 'accepted'
                AND ((from_profile = $1 AND to_profile = $2) OR (from_profile = $2 AND to_profile = $1))) AS connected,
       EXISTS (SELECT 1 FROM users WHERE id = $1 AND role = 'admin') AS admin`,
    [viewerId, ownerUserId]
  );
  return Boolean(rows[0]?.connected || rows[0]?.admin);
}
