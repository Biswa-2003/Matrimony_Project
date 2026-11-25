import { redirect } from "next/navigation";

/** Legacy name search → unified search with the name pre-filled. */
export default async function LegacyNameResults({ searchParams }) {
  const sp = await searchParams;
  const name = String(sp?.name || "").trim();
  redirect(`/matrimoney/preference-search${name ? `?q=${encodeURIComponent(name)}` : ""}`);
}
