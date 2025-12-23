import { notFound } from "next/navigation";
import MatchesCategoryClient from "../MatchesCategoryClient";
import DashNav from "@/app/components/dashnav";
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
        <div className="header-section text-center text-white mb-5 position-relative">
          {/* Decorative Background */}
          <div className="position-absolute top-0 start-50 translate-middle-x w-100 h-100 overflow-hidden" style={{ opacity: 0.1 }}>
            <div className="position-absolute top-50 start-50 translate-middle rounded-circle bg-white" style={{ width: 600, height: 600, filter: 'blur(80px)' }}></div>
          </div>

          <div className="container py-5 position-relative z-1">
            <div className="d-inline-flex align-items-center justify-content-center p-3 rounded-circle bg-white bg-opacity-10 mb-3 backdrop-blur shadow-sm">
              <span style={{ fontSize: '2.5rem', color: 'white' }}>{cfg.icon}</span>
            </div>
            <h2 className="fw-bold mb-2">{cfg.title}</h2>
            <p className="opacity-75 mb-0" style={{ maxWidth: 600, margin: '0 auto' }}>
              Discover profiles curated just for you. Connect with your matches instantly.
            </p>
          </div>
        </div>

        <div className="container pb-5" style={{ marginTop: '-40px' }}>
          <MatchesCategoryClient endpoint={cfg.api} />
        </div>
      </div>

      {/* Styles moved to MatchesGlobalStyles to fix client-only error */}
    </>
  );
}
