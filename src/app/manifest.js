export default function manifest() {
  return {
    name: "MatriMoney — Premium Indian Matrimony",
    short_name: "MatriMoney",
    description: "Verified brides and grooms, family-first matchmaking and complete privacy.",
    start_url: "/dashboard/myhome?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fbf7f0",
    theme_color: "#5a0f22",
    lang: "en-IN",
    categories: ["lifestyle", "social"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Messages", url: "/dashboard/messages", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Interests", url: "/matrimoney/interests", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Search", url: "/matrimoney/preference-search", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
