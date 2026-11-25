import { redirect } from "next/navigation";

/** Legacy quick-search results → unified search (filters are forwarded). */
export default async function LegacyResults({ searchParams }) {
  const sp = new URLSearchParams(await searchParams);
  sp.delete("gender"); // search always shows the opposite gender of the member
  redirect(`/matrimoney/preference-search${sp.toString() ? `?${sp}` : ""}`);
}
