import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Serves an image stored in media_files. Content is immutable per id, so it is cached for a year. */
export async function GET(_req, { params }) {
  const { id } = await params;
  if (!UUID.test(String(id))) return new Response("Not found", { status: 404 });
  try {
    const { rows } = await query(`SELECT content_type, data FROM media_files WHERE id = $1`, [id]);
    if (!rows[0]) return new Response("Not found", { status: 404 });
    return new Response(rows[0].data, {
      headers: {
        "Content-Type": rows[0].content_type,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
      },
    });
  } catch (e) {
    console.error("[media]", e.message);
    return new Response("Error", { status: 500 });
  }
}
