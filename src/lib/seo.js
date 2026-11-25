// src/lib/seo.js — shared SEO helpers and community landing-page content
export const SITE_URL = (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

/** Community landing pages (/matrimony/[slug]). Content only — never member data. */
export const COMMUNITIES = {
  "odia-matrimony": {
    name: "Odia",
    title: "Odia Matrimony — Odia Brides & Grooms",
    intro: "Find Odia brides and grooms from respected families across Odisha and around the world. Filter by community, gothra, education and location, and involve your family at every step.",
    points: ["Search by Odia mother tongue, community and district", "Horoscope (guna milan) match shown on every profile", "Share a profile with your family on WhatsApp in one tap"],
    search: "/matrimoney/preference-search",
  },
  "bhubaneswar-matrimony": {
    name: "Bhubaneswar",
    title: "Bhubaneswar Matrimony — Brides & Grooms in Bhubaneswar",
    intro: "Meet verified brides and grooms living and working in Bhubaneswar — from Infocity professionals to families settled in Old Town. Browse by profession, community and age.",
    points: ["Members from Bhubaneswar and nearby Cuttack, Puri and Khurda", "Private chat once both families are interested", "Photo privacy: show photos only to members you accept"],
    search: "/matrimoney/preference-search",
  },
  "cuttack-matrimony": {
    name: "Cuttack",
    title: "Cuttack Matrimony — Brides & Grooms in Cuttack",
    intro: "Looking for a life partner from Cuttack, the Silver City? Discover brides and grooms from Cuttack families, with filters for education, profession and community.",
    points: ["Profiles from Cuttack and the twin city Bhubaneswar", "Interests, shortlists and safe in-app messaging", "Family share links that show only basic details"],
    search: "/matrimoney/preference-search",
  },
  "hindu-matrimony": {
    name: "Hindu",
    title: "Hindu Matrimony — Hindu Brides & Grooms",
    intro: "A family-first platform for Hindu brides and grooms. Compare horoscopes with an automatic 36-point guna milan score, and connect with families who share your values.",
    points: ["Search by caste, gothra, rashi and nakshatra", "Manglik compatibility shown alongside guna milan", "Contact details shared only with your consent and plan"],
    search: "/matrimoney/preference-search",
  },
  "christian-matrimony": {
    name: "Christian",
    title: "Christian Matrimony — Christian Brides & Grooms",
    intro: "Find Christian brides and grooms who share your faith and values. Search by denomination, education and location, and connect respectfully.",
    points: ["Search by community, education and city", "Private messaging after a mutual interest", "Safety team reviews every report within 24 hours"],
    search: "/matrimoney/preference-search",
  },
  "muslim-matrimony": {
    name: "Muslim",
    title: "Muslim Matrimony — Muslim Brides & Grooms",
    intro: "Meet Muslim brides and grooms from families who value tradition and education. Filter by community, profession and location, with full photo privacy controls.",
    points: ["Photos visible only to members you accept, if you prefer", "Family-friendly profiles with education and career details", "Respectful, moderated messaging"],
    search: "/matrimoney/preference-search",
  },
  "sikh-matrimony": {
    name: "Sikh",
    title: "Sikh Matrimony — Sikh Brides & Grooms",
    intro: "Discover Sikh brides and grooms from respected families in India and abroad. Search by community, education and city, and take the next step with your family.",
    points: ["Search across India and NRI members", "Interests and shortlists to keep track of favourites", "Private chat once you're connected"],
    search: "/matrimoney/preference-search",
  },
  "buddhist-matrimony": {
    name: "Buddhist",
    title: "Buddhist Matrimony — Buddhist Brides & Grooms",
    intro: "Find Buddhist brides and grooms who share your outlook on life. Browse thoughtfully written profiles and connect with families at your own pace.",
    points: ["Detailed profiles with family background", "Safe, private messaging after a mutual interest", "You control who sees your photos and contact details"],
    search: "/matrimoney/preference-search",
  },
};

export const COMMUNITY_FAQ = (name) => [
  { q: `Is registration free for ${name} matrimony?`, a: "Yes. Creating a profile, searching, sending interests and receiving interests are free. Premium plans add contact details and more visibility." },
  { q: "Who can see my photos and contact details?", a: "You decide. Photos can be visible to all members or only to members you accept, and contact details are only shown to premium members you haven't hidden them from." },
  { q: "How does horoscope matching work?", a: "If both of you add your nakshatra (star) and rashi, every profile shows an indicative 36-point guna milan score. We always recommend confirming with your family astrologer." },
  { q: "How do I stay safe?", a: "Chat on MatriMoney until you're comfortable, involve your families before meeting, and never send money or share OTPs. Report anything suspicious — our team reviews reports within 24 hours." },
];
