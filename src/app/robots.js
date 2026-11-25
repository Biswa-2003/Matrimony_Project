import { SITE_URL } from "@/lib/seo";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // private areas and member data are never indexed
        disallow: ["/api/", "/admin", "/dashboard", "/p/", "/matrimoney/profile-details/", "/matrimoney/interests", "/matrimoney/shortlist", "/matrimoney/matches/", "/matrimoney/reset-password", "/chat"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
