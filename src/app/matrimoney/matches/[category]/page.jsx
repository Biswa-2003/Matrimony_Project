import { notFound } from "next/navigation";
import Link from "next/link";
import MatchesCategoryClient from "../MatchesCategoryClient";
import MatchesGlobalStyles from "./MatchesGlobalStyles";
import { BsEyeFill, BsStars, BsPeopleFill, BsClockHistory, BsPersonCheckFill, BsFillPersonLinesFill, BsSearchHeart } from "react-icons/bs";

// keep this the same
export const CATEGORIES = {
  overall: { title: "Over All Matches", api: "/api/matches/overall", icon: <BsPeopleFill /> },
  newmatches: { title: "New Matches", api: "/api/matches/newmatches", icon: <BsStars /> },
  premium_matches: { title: "Premium Matches", api: "/api/matches/premium_matches", icon: <BsFillPersonLinesFill /> },
  mutual_matches: { title: "Mutual Matches", api: "/api/matches/mutual_matches", icon: <BsPersonCheckFill /> },
  "already-viewed": { title: "Profiles I Already Viewed", api: "/api/matches/already-viewed", icon: <BsClockHistory /> },
  "who-viewed-myprofile": { title: "Who Viewed My Profile", api: "/api/matches/who-viewed-myprofile", icon: <BsEyeFill /> },
  "yet-to-viewed-myprofile": { title: "Yet-to Viewed Profile", api: "/api/matches/yet-to-viewed-myprofile", icon: <BsSearchHeart /> },
};

export async function generateStaticParams() {
  return Object.keys(CATEGORIES).map((category) => ({ category }));
}

// 🔧 params is a Promise in Next 15 — await it
export async function generateMetadata({ params }) {
  const p = await params;                 // <-- await
  const cfg = CATEGORIES[p.category];
  return cfg ? { title: `MatriMoney • ${cfg.title}` } : {};
}

// 🔧 params is a Promise in Next 15 — await it
export default async function MatchesCategoryPage({ params }) {
  const p = await params;                 // <-- await
  const cfg = CATEGORIES[p.category];
  if (!cfg) notFound();

  return (
    <>
      {/* Spacer removed (layout handles it) */}
      <MatchesGlobalStyles />

      <div className="page-surface">
        {/* Header Section */}
        <div className="header-section text-center text-white mb-4">
          <div className="container py-5 position-relative">
            <div className="match-header-icon mb-3">{cfg.icon}</div>
            <span className="eyebrow light mb-2">Your Matches</span>
            <h1 className="mb-2" style={{ fontSize: "clamp(2.2rem, 4vw, 3.2rem)" }}>{cfg.title}</h1>
            <p className="mb-0" style={{ maxWidth: 600, margin: "0 auto", color: "rgba(255,255,255,.72)" }}>
              Profiles thoughtfully selected for you. Take your time — the right one is worth it.
            </p>
          </div>
        </div>

        <div className="container mb-4">
          <nav className="match-tabs" aria-label="Match categories">
            {Object.entries(CATEGORIES).map(([key, c]) => (
              <Link key={key} href={`/matrimoney/matches/${key}`} className={`match-tab ${key === p.category ? "active" : ""}`}>
                <span className="me-1">{c.icon}</span> {c.title.replace("Over All", "All")}
              </Link>
            ))}
          </nav>
        </div>

        <div className="container pb-5">
          <MatchesCategoryClient endpoint={cfg.api} />
        </div>
      </div>

      {/* Styles moved to MatchesGlobalStyles to fix client-only error */}
    </>
  );
}
