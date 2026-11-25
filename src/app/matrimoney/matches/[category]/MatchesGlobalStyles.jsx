"use client";

export default function MatchesGlobalStyles() {
    return (
        <style jsx global>{`
        .page-surface {
            background-color: var(--ivory);
            min-height: 100vh;
        }
        .header-section {
            background: url('/images/paisley-light.svg') repeat, radial-gradient(120% 120% at 50% 0%, #7a1530 0%, #3b0a16 60%, #1c030b 100%);
            border-bottom-left-radius: 40px;
            border-bottom-right-radius: 40px;
        }
        .backdrop-blur {
            backdrop-filter: blur(8px);
        }
    `}</style>
    );
}
