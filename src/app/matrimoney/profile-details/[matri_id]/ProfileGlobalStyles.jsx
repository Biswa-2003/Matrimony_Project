"use client";

export default function ProfileGlobalStyles() {
  return (
    <style jsx global>{`
      .profile-surface {
        background: url('/images/paisley.svg') repeat, var(--ivory);
        min-height: 100vh;
        padding-bottom: 60px;
      }
      .profile-hero {
        position: relative;
        overflow: hidden;
        height: 230px;
        padding-top: 28px;
        background:
          url('/images/paisley-light.svg') repeat,
          radial-gradient(120% 140% at 30% 0%, #7a1530 0%, #3b0a16 60%, #1c030b 100%);
        border-bottom: 1px solid rgba(232, 207, 142, 0.4);
      }
      .profile-back {
        display: inline-flex;
        align-items: center;
        padding: 6px 14px;
        border-radius: 50px;
        font-size: 0.82rem;
        color: var(--gold-light);
        border: 1px solid rgba(232, 207, 142, 0.4);
        background: rgba(255, 255, 255, 0.05);
        transition: all 0.25s ease;
      }
      .profile-back:hover { background: var(--foil); color: var(--maroon-900); }
      .profile-head { margin-top: -150px; position: relative; z-index: 2; }
      .profile-photo-frame { max-width: 320px; margin: 0 auto; }
      .profile-lock {
        width: 82%;
        background: rgba(255, 253, 249, 0.92);
        border: 1px solid var(--gold);
        border-radius: 16px;
      }
      .profile-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        border-radius: 50px;
        font-size: 0.82rem;
        font-weight: 500;
        color: var(--maroon-800);
        background: var(--gold-pale);
        border: 1px solid rgba(201, 162, 74, 0.45);
      }
      .profile-chip i { color: var(--gold-dark); }

      .pe-card {
        border: 1px solid rgba(201, 162, 74, 0.25) !important;
        border-radius: 20px !important;
        box-shadow: var(--shadow-sm);
        background: #fff;
        overflow: hidden;
        margin-bottom: 24px;
      }
      .pe-card > .card-header {
        position: relative;
        padding: 16px 22px 14px 38px;
        background: linear-gradient(180deg, #fffdf9, #fbf4e8) !important;
        border-bottom: 1px solid rgba(201, 162, 74, 0.25) !important;
        font-family: var(--font-display), serif;
        font-size: 1.35rem;
        font-weight: 700 !important;
        color: var(--maroon-900) !important;
      }
      .pe-card > .card-header::before {
        content: '';
        position: absolute;
        left: 20px;
        top: 50%;
        width: 8px;
        height: 8px;
        transform: translateY(-50%) rotate(45deg);
        background: var(--foil);
      }
      .pe-card .card-body { padding: 20px 22px; }
      .pe-card .small.text-muted.fw-bold {
        font-size: 0.7rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        font-weight: 600 !important;
      }
      .pe-card .fw-semibold.text-dark { color: var(--ink) !important; }
      .pe-card .border-bottom { border-color: #f1e6d4 !important; }
      @media (max-width: 767.98px) {
        .profile-hero { height: 140px; }
        .profile-head { margin-top: -70px; }
      }
    `}</style>
  );
}
