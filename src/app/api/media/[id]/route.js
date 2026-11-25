import { readMedia } from "@/lib/media";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Serves a site image (from Vercel Blob or the database). Content is immutable per id, so it is cached for a year. */
export async function GET(_req, { params }) {
  const { id } = await params;
  if (!UUID.test(String(id))) return new Response("Not found", { status: 404 });
  try {
    const m = await readMedia(id);
    if (!m) return new Response("Not found", { status: 404 });
    return new Response(m.body, {
      headers: {
        "Content-Type": m.contentType,
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
