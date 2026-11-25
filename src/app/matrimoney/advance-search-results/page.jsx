import { redirect } from "next/navigation";

/** Legacy results page → results now appear live on the unified search page. */
export default function LegacyAdvancedResults() {
  redirect("/matrimoney/preference-search");
}
