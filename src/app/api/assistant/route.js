import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getUserIdFromCookie } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { POST as advancedSearch } from "../advanced-search/route";
import { GET as insightsGET } from "../dashboard/insights/route";

export const dynamic = "force-dynamic";

/* =====================================================================
   MatriMoney Assistant
   Works without any AI key: intent detection + real data (plans, search, the member's own
   activity). If OPENROUTER_API_KEY is set, open-ended questions are answered by an LLM that is
   grounded in the same facts.
   ===================================================================== */

const LINKS = {
  register: { label: "Create free profile", href: "/#join" },
  login: { label: "Log in", href: "/matrimoney/login" },
  search: { label: "Open Search", href: "/matrimoney/preference-search" },
  plans: { label: "View plans", href: "/matrimoney/package" },
  editProfile: { label: "Edit profile", href: "/dashboard/profile-edit" },
  photos: { label: "Manage photos", href: "/dashboard/upload-photo" },
  prefs: { label: "Partner preferences", href: "/dashboard/profile-edit#sec-partnerPref" },
  settings: { label: "Privacy settings", href: "/dashboard/profile-setting" },
  interests: { label: "My interests", href: "/matrimoney/interests?filter=received" },
  sent: { label: "Interests I sent", href: "/matrimoney/interests?filter=sent" },
  visitors: { label: "Who viewed me", href: "/matrimoney/matches/who-viewed-myprofile" },
  matches: { label: "My matches", href: "/matrimoney/matches/overall" },
  shortlist: { label: "My shortlist", href: "/matrimoney/shortlist" },
  safety: { label: "Safety Centre", href: "/matrimoney/safety" },
  contact: { label: "Contact support", href: "/matrimoney/contactus" },
  privacy: { label: "Privacy Policy", href: "/matrimoney/privacy" },
  dashboard: { label: "My Home", href: "/dashboard/myhome" },
  forgot: { label: "Reset password", href: "/matrimoney/forgot" },
  story: { label: "Share your story", href: "/matrimoney/feedback" },
};

const has = (text, words) => words.some((w) => new RegExp(`\\b${w}\\b`, "i").test(text));

/* ---------- lookups for the match-finder (cached 10 min) ---------- */
let lookupCache = null;
let lookupAt = 0;
async function lookups() {
  if (lookupCache && Date.now() - lookupAt < 10 * 60 * 1000) return lookupCache;
  const get = (t) => query(`SELECT id, name FROM ${t}`).then((r) => r.rows).catch(() => []);
  const [religions, castes, cities, states, languages, educations, professions] = await Promise.all(
    ["religions", "castes", "cities", "states", "languages", "educations", "professions"].map(get)
  );
  lookupCache = { religions, castes, cities, states, languages, educations, professions };
  lookupAt = Date.now();
  return lookupCache;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const findIn = (text, rows) =>
  rows
    .filter((r) => r.name && r.name.length >= 3 && new RegExp(`\\b${escapeRe(r.name)}\\b`, "i").test(text))
    .sort((a, b) => b.name.length - a.name.length);

/** Turn "hindu brahmin girls in bhubaneswar 24 to 29 never married odia" into search filters. */
const titleCase = (s) => String(s || "").replace(/\b([a-z])/g, (c) => c.toUpperCase());

async function parseMatchQuery(text) {
  const L = await lookups();
  const f = {};
  const understood = [];

  const range = text.match(/\b(\d{2})\s*(?:-|to|and|–)\s*(\d{2})\b/i);
  const above = text.match(/\b(?:above|over|older than|at least|min(?:imum)?)\s*(\d{2})\b/i);
  const below = text.match(/\b(?:below|under|younger than|at most|max(?:imum)?)\s*(\d{2})\b/i);
  if (range) {
    const [a, b] = [Number(range[1]), Number(range[2])].sort((x, y) => x - y);
    if (a >= 18 && b <= 80) { f.ageMin = a; f.ageMax = b; understood.push(`${a}–${b} yrs`); }
  } else {
    if (above && Number(above[1]) >= 18) { f.ageMin = Number(above[1]); understood.push(`${f.ageMin}+ yrs`); }
    if (below && Number(below[1]) <= 80) { f.ageMax = Number(below[1]); understood.push(`under ${f.ageMax}`); }
  }

  const pick = (key, rows, label) => {
    const hits = findIn(text, rows).slice(0, 3);
    if (hits.length) { f[key] = hits.map((h) => h.id); understood.push(...hits.map((h) => titleCase(h.name))); }
    return hits;
  };
  pick("religionIds", L.religions);
  pick("casteIds", L.castes);
  pick("motherTongueIds", L.languages);
  pick("educationIds", L.educations);
  pick("professionIds", L.professions);
  const cityHits = pick("cityIds", L.cities);
  if (!cityHits.length) {
    const st = findIn(text, L.states).slice(0, 3);
    if (st.length) { f.stateIds = st.map((s) => s.id); understood.push(...st.map((s) => titleCase(s.name))); }
  }

  if (has(text, ["never married", "unmarried", "single", "first marriage"])) { f.maritalStatuses = ["Never Married"]; understood.push("never married"); }
  else if (has(text, ["divorced", "divorcee"])) { f.maritalStatuses = ["Divorced"]; understood.push("divorced"); }
  else if (has(text, ["widow", "widowed", "widower"])) { f.maritalStatuses = ["Widowed"]; understood.push("widowed"); }
  if (has(text, ["veg", "vegetarian"]) && !has(text, ["non veg", "non-veg", "nonveg"])) { f.diets = ["Vegetarian"]; understood.push("vegetarian"); }
  if (has(text, ["with photo", "photo", "photos"])) { f.withPhoto = true; understood.push("with photo"); }
  if (has(text, ["verified"])) { f.verifiedOnly = true; understood.push("verified"); }
  if (has(text, ["new", "recent", "recently joined", "latest"])) { f.sort = "newest"; }

  return { filters: f, understood };
}

const toSearchUrl = (f) => {
  const p = new URLSearchParams();
  if (f.ageMin) p.set("ageMin", f.ageMin);
  if (f.ageMax) p.set("ageMax", f.ageMax);
  if (f.casteIds?.length) p.set("casteId", f.casteIds[0]);
  if (f.religionIds?.length) p.set("religionId", f.religionIds[0]);
  return `/matrimoney/preference-search${p.toString() ? `?${p}` : ""}`;
};

/* ---------- intents ---------- */
const FIND_WORDS = ["find", "search", "show", "looking for", "look for", "want", "need", "suggest", "recommend", "bride", "brides", "groom", "grooms", "girl", "girls", "boy", "boys", "match", "matches", "profiles", "partner"];

async function plansAnswer() {
  const { rows } = await query(`SELECT code, name, price_inr, duration_days, contact_limit FROM plans ORDER BY price_inr`).catch(() => ({ rows: [] }));
  if (!rows.length) return { reply: "You can see all membership options on the Plans page.", actions: [LINKS.plans] };
  const lines = rows.map((p) => `• **${p.name}** — ₹${Number(p.price_inr).toLocaleString("en-IN")} + GST · ${p.duration_days} days · ${p.contact_limit} contacts`);
  return {
    reply: `Here are our membership plans:\n${lines.join("\n")}\n\nAll plans let you view contact details of matches and stand out in searches. Registration and browsing are free.`,
    actions: [LINKS.plans],
  };
}

const FAQ = [
  { k: ["mutual match", "mutual matches", "premium match", "premium matches", "new matches", "match types", "kinds of matches", "types of matches", "yet to view"],
    r: "Your matches are grouped to make browsing easy:\n• **All Matches** — everyone suited to you\n• **New Matches** — recently joined\n• **Premium Matches** — members on a paid plan\n• **Mutual Matches** — you fit *their* preferences and they fit *yours*\n• **Who Viewed Me / Viewed by Me / Yet to View** — your browsing activity\n\nOpen the **Matches** menu at the top to switch between them.",
    a: ["matches"] },
  { k: ["register", "sign up", "signup", "join", "create account", "create profile", "registration"],
    r: "Registering is **free** and takes about 2 minutes:\n1. Tap **Create free profile** on the home page\n2. Enter your basic details and verify your email with the code we send\n3. Choose a strong password\n\nThen add a photo and your partner preferences to start getting matches.",
    a: ["register"] },
  { k: ["login", "log in", "sign in", "cant login", "can't login"],
    r: "You can log in with your **email or mobile number** and password. Forgot it? Use **Reset password** and we'll email you a secure link.",
    a: ["login", "forgot"] },
  { k: ["forgot", "reset password", "change password", "password"],
    r: "To reset your password, use **Forgot password** on the login page — we'll email you a secure link. If you're logged in, you can change it under **Settings → Change Password**.",
    a: ["forgot", "settings"] },
  { k: ["interest", "interests", "send interest", "accept", "decline", "withdraw"],
    r: "**How interests work:**\n1. Open a profile you like and tap **Send Interest** (or swipe right on Match Spotlight)\n2. They can **Accept** or **Decline** it from their inbox\n3. Once accepted you're **connected** and can see each other's details\n\nYou can **withdraw** an interest that hasn't been answered yet from *Interests → Sent*.",
    a: ["interests", "sent"] },
  { k: ["shortlist", "save profile", "bookmark", "favourite", "favorite"],
    r: "Tap the **bookmark heart** on any profile card or profile page to save it to your **Shortlist**. You can review or remove saved profiles any time.",
    a: ["shortlist"] },
  { k: ["photo", "photos", "picture", "upload", "dp"],
    r: "A clear, recent photo makes a big difference. Upload or change it from **My Home → camera icon** or **Manage Photos**. You can also **lock your photos** so only connections see them (Settings → Privacy).",
    a: ["photos", "settings"] },
  { k: ["privacy", "hide", "visible", "visibility", "who can see", "lock"],
    r: "You're in control:\n• **Profile visibility** — choose who can find you\n• **Photo lock** — show photos only to connections\n• **Block** anyone from their profile's ⋯ menu\n\nAll of this is under **Settings & Privacy**.",
    a: ["settings", "privacy"] },
  { k: ["block", "report", "fake", "scam", "harass", "abuse", "money", "fraud", "unsafe", "safety"],
    r: "Your safety comes first. On any profile, open the **⋯ menu** to **Report** or **Block** — our team reviews every report within 24 hours. Never send money or share OTPs, bank details or passwords. In an emergency call **112**.",
    a: ["safety"] },
  { k: ["verify", "verified", "verification", "badge"],
    r: "Verified profiles carry a **gold Verified badge**. Our team reviews photos and details before verifying. Keep your profile complete with a clear photo and a valid mobile number to help us verify you faster.",
    a: ["editProfile"] },
  { k: ["edit", "update profile", "change profile", "profile details", "complete profile", "biodata"],
    r: "Edit any section from **My Profile → Edit Profile** — basic details, religion & horoscope, education & career, family and partner preferences. Your *profile strength* meter shows what to add next.",
    a: ["editProfile", "prefs"] },
  { k: ["preference", "preferences", "partner preference", "expectation", "expectations"],
    r: "Set your partner preferences (age, height, community, location, education…) under **Edit Profile → Partner Preferences**. They power your daily recommendations and the compatibility score on every profile.",
    a: ["prefs"] },
  { k: ["delete", "deactivate", "remove account", "close account"],
    r: "You can **temporarily deactivate** (hide) your profile or **permanently delete** it from **Settings → Danger Zone**. Deactivation can be undone any time.",
    a: ["settings"] },
  { k: ["contact", "support", "help desk", "customer care", "phone number", "call"],
    r: "Our team is happy to help — write to us via the **Contact** page or call **+91 6370103299**. We usually reply within 24 hours.",
    a: ["contact"] },
  { k: ["success story", "success stories", "got married", "share story", "testimonial"],
    r: "Congratulations! 💛 Share your story on the **Feedback** page — once our team reviews it, it can appear on our home page to inspire other families.",
    a: ["story"] },
  { k: ["refund", "cancel plan", "cancel subscription"],
    r: "Plan benefits start immediately, so payments are generally non-refundable except where required by law or if we couldn't provide the service. Please reach out to support and we'll look into your case.",
    a: ["contact"] },
  { k: ["kundli", "horoscope", "manglik", "gothram", "rashi", "nakshatra"],
    r: "You can add **Rashi, Nakshatra, Gothram and Manglik** status under *Edit Profile → Religion & Horoscope*, and filter partner preferences by Manglik. We don't generate kundli reports ourselves.",
    a: ["editProfile"] },
];

async function personal(intent, userId) {
  const res = await insightsGET();
  const d = await res.json().catch(() => ({}));
  const t = d.totals || {};
  if (intent === "plan") {
    if (!d.plan) return { reply: "You're on the **free** membership. Upgrading lets you view contact details and appear higher in searches.", actions: [LINKS.plans] };
    return {
      reply: `You're a **${d.plan.code}** member 💎\n• **${d.plan.daysLeft}** days left (valid till ${new Date(d.plan.endsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })})\n• **${d.plan.contactsLeft}** contacts left`,
      actions: [LINKS.plans],
    };
  }
  if (intent === "visitors") {
    const names = (d.recentVisitors || []).slice(0, 3).map((v) => v.first_name).filter(Boolean);
    return {
      reply: t.visitors
        ? `**${t.visitors}** members have viewed your profile (${t.visitors_week || 0} this week).${names.length ? ` Most recently: ${names.join(", ")}.` : ""}`
        : "No one has viewed your profile yet. A clear photo and a complete profile help you get noticed.",
      actions: [LINKS.visitors, LINKS.photos],
    };
  }
  if (intent === "interests") {
    return {
      reply: `Here's your interest activity:\n• **${t.pending_received || 0}** waiting for your reply\n• **${t.pending_sent || 0}** you sent, awaiting their reply\n• **${t.connections || 0}** connections\n• **${t.shortlisted_me || 0}** members shortlisted you`,
      actions: [LINKS.interests, LINKS.sent],
    };
  }
  // strength
  const todo = (d.checklist || []).filter((c) => !c.done);
  return {
    reply: `Your profile strength is **${d.strength ?? 0}%**.${todo.length ? `\n\nTo improve it:\n${todo.slice(0, 4).map((c) => `• ${c.label}`).join("\n")}` : " Your profile is complete — wonderful!"}`,
    actions: todo.length ? todo.slice(0, 2).map((c) => ({ label: c.label, href: c.href })) : [LINKS.dashboard],
  };
}

async function findMatches(text, userId) {
  if (!userId) {
    return { reply: "I'd love to help you find matches! Please log in or create a free profile first so I can show members suited to you.", actions: [LINKS.register, LINKS.login] };
  }
  const { filters, understood } = await parseMatchQuery(text);
  const res = await advancedSearch(new Request("http://local/api/advanced-search", { method: "POST", body: JSON.stringify({ ...filters, limit: 6 }) }));
  const j = await res.json().catch(() => ({}));
  if (!res.ok) return { reply: j.error || "I couldn't run that search right now.", actions: [LINKS.search] };
  const cards = (j.results || []).map((r) => ({
    matri_id: r.matri_id, name: r.full_name, age: r.age_years, city: r.city_name, religion: r.religion_name,
    caste: r.caste_name, photo: r.photo_url, gender: r.gender, verified: r.is_verified,
  }));
  const what = understood.length ? ` for **${understood.join(" · ")}**` : "";
  return {
    reply: j.count
      ? `I found **${j.count}** profile${j.count === 1 ? "" : "s"}${what}. ${j.count === 1 ? "Here it is:" : j.count <= 6 ? "Here they are:" : "Here are the top 6:"}`
      : `I couldn't find profiles${what} right now. Try widening the age range or removing a filter.`,
    cards,
    actions: [{ label: j.count > cards.length ? `See all ${j.count} results` : "Refine in Search", href: toSearchUrl(filters) }],
  };
}

/* ---------- optional LLM for open-ended questions ---------- */
async function llmAnswer(message, history) {
  if (!process.env.OPENROUTER_API_KEY) return null;
  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENROUTER_API_KEY, baseURL: "https://openrouter.ai/api/v1" });
    const plans = (await query(`SELECT name, price_inr, duration_days, contact_limit FROM plans ORDER BY price_inr`).catch(() => ({ rows: [] }))).rows
      .map((p) => `${p.name}: ₹${p.price_inr}+GST, ${p.duration_days} days, ${p.contact_limit} contacts`).join("; ");
    const system = `You are the friendly assistant of MatriMoney, a premium Indian matrimony website. Answer briefly (max 120 words), warmly and only about using MatriMoney, marriage-search etiquette and online safety. Facts: registration is free; plans: ${plans}; members send interests which can be accepted or declined; profiles can be shortlisted, blocked or reported via the ⋯ menu; privacy settings allow photo lock and visibility control; support: +91 6370103299. If you don't know something about the site, say so and suggest contacting support. Never invent features, prices or statistics. Never ask for passwords, OTPs or payment details.`;
    const completion = await client.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
      max_tokens: 300,
      messages: [{ role: "system", content: system }, ...history.slice(-6), { role: "user", content: message }],
    });
    const reply = completion.choices?.[0]?.message?.content?.trim();
    return reply ? { reply, actions: [] } : null;
  } catch (e) {
    console.error("[assistant] LLM fallback failed:", e.message);
    return null;
  }
}

export async function POST(req) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  if (!rateLimit(`assistant:${ip}`, 40, 10 * 60 * 1000)) {
    return NextResponse.json({ reply: "You're sending messages quickly — please wait a moment and try again." }, { status: 429 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const message = String(body.message || "").trim().slice(0, 500);
    const history = Array.isArray(body.history)
      ? body.history.filter((m) => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string").map((m) => ({ role: m.role, content: m.content.slice(0, 600) }))
      : [];
    if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });

    const userId = await getUserIdFromCookie();
    const text = message.toLowerCase();
    let out = null;

    // 1) personal questions (logged-in)
    const mine = has(text, ["my", "me", "i", "mine"]);
    if (mine && has(text, ["plan", "membership", "subscription", "contacts left", "expire", "expiry"])) out = userId ? await personal("plan", userId) : null;
    else if (has(text, ["who viewed", "who visited", "visitors", "viewed my", "profile views", "views"])) out = userId ? await personal("visitors", userId) : null;
    else if (mine && has(text, ["interest", "interests", "requests", "connections"]) && !has(text, ["how", "what is", "explain"])) out = userId ? await personal("interests", userId) : null;
    else if (has(text, ["profile strength", "complete my profile", "improve my profile", "profile score", "how complete", "how strong", "how good is my profile", "rate my profile"])) out = userId ? await personal("strength", userId) : null;
    if (mine && !out && !userId && has(text, ["plan", "membership", "views", "viewed", "visitors", "interest", "interests", "profile"])) {
      out = { reply: "Please log in to see your personal details — then just ask me again!", actions: [LINKS.login] };
    }

    // 2) plans / pricing
    if (!out && has(text, ["plan", "plans", "price", "prices", "pricing", "cost", "fee", "fees", "membership", "premium", "upgrade", "subscription", "package", "packages"])) out = await plansAnswer();

    // 3) match finder
    const isQuestion = /^(what|why|when|explain|is|are|does|do|can|should|how)\b/i.test(text) || has(text, ["how do i", "how to", "how can i"]);
    if (!out && has(text, FIND_WORDS) && !isQuestion) out = await findMatches(text, userId);

    // 4) FAQ
    if (!out) {
      const hit = FAQ.find((f) => has(text, f.k));
      if (hit) out = { reply: hit.r, actions: hit.a.map((k) => LINKS[k]) };
    }

    // 5) small talk
    if (!out && /^(hi+|hello|hey|namaste|namaskar|good (morning|afternoon|evening))\b/i.test(text)) {
      out = { reply: "Namaste! 🙏 I'm your MatriMoney assistant. I can find matches for you, explain plans, or help with your profile, interests and privacy. What would you like to do?", actions: [] };
    }
    if (!out && has(text, ["thanks", "thank you", "thank", "dhanyavad", "shukriya"])) {
      out = { reply: "You're most welcome! 💛 Wishing you a beautiful journey ahead.", actions: [] };
    }

    // 6) optional LLM, then a helpful default
    if (!out) out = await llmAnswer(message, history);
    if (!out) {
      out = {
        reply: "I'm not sure I understood that. I can help you with:\n• **Finding matches** — e.g. *“Hindu brides in Bhubaneswar, 24 to 28”*\n• **Plans & prices**\n• **Interests, shortlist & privacy**\n• **Your profile, visitors & membership**\n\nOr talk to our team directly.",
        actions: [LINKS.contact],
      };
    }

    return NextResponse.json({ ...out, loggedIn: Boolean(userId) });
  } catch (e) {
    console.error("[assistant]", e);
    return NextResponse.json({ reply: "Sorry, something went wrong on my side. Please try again in a moment.", actions: [LINKS.contact] }, { status: 500 });
  }
}
