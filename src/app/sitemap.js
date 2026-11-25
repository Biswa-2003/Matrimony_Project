import { COMMUNITIES, SITE_URL } from "@/lib/seo";

export default function sitemap() {
  const now = new Date();
  const pages = [
    ["", 1.0, "weekly"],
    ["/matrimoney/aboutus", 0.6, "monthly"],
    ["/matrimoney/package", 0.8, "monthly"],
    ["/matrimoney/contactus", 0.5, "yearly"],
    ["/matrimoney/safety", 0.6, "yearly"],
    ["/matrimoney/privacy", 0.3, "yearly"],
    ["/matrimoney/terms", 0.3, "yearly"],
    ["/matrimoney/login", 0.4, "yearly"],
  ];
  return [
    ...pages.map(([path, priority, changeFrequency]) => ({ url: `${SITE_URL}${path}`, lastModified: now, changeFrequency, priority })),
    ...Object.keys(COMMUNITIES).map((slug) => ({ url: `${SITE_URL}/matrimony/${slug}`, lastModified: now, changeFrequency: "monthly", priority: 0.7 })),
  ];
}
