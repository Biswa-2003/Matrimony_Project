import { redirect } from "next/navigation";

/** Old dashboard search form → unified search. */
export default function LegacyDashboardSearch() {
  redirect("/matrimoney/preference-search");
}
