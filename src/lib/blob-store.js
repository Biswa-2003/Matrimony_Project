// src/lib/blob-store.js
// Image bytes in Vercel Blob (used when BLOB_READ_WRITE_TOKEN is set; otherwise images stay in Postgres).
// Blobs are PRIVATE by default: they are only ever read here on the server and passed on through
// /api/media/[id] and /api/member-photo/[id], so the photo lock keeps working.
import crypto from "crypto";
import { put, get, del } from "@vercel/blob";

export const blobEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

// must match the store's access setting in Vercel (create the store as Private)
const access = () => (process.env.BLOB_ACCESS === "public" ? "public" : "private");

const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

/** Upload bytes; returns the blob URL. `folder` groups files in the Blob dashboard (members/, site/). */
export async function putBlob(buf, contentType, folder) {
  const pathname = `${folder}/${crypto.randomUUID()}.${EXT[contentType] || "bin"}`;
  const res = await put(pathname, buf, { access: access(), contentType, addRandomSuffix: false });
  return res.url;
}

/** Readable stream of a blob, or null if it is gone. */
export async function getBlobStream(url) {
  const res = await get(url, { access: access() });
  return res?.stream || null;
}

/** Best effort: a leftover file costs a little storage, a failed delete must not break the request. */
export async function deleteBlob(url) {
  if (!url) return;
  try {
    await del(url);
  } catch (e) {
    console.error("[blob] delete failed:", e.message);
  }
}
