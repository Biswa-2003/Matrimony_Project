
import { query } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Basic connectivity check
        const { rows } = await query("SELECT 1 as n");
        return Response.json({ ok: true, n: rows[0].n });
    } catch (err) {
        return Response.json({ error: err.message });
    }
}
