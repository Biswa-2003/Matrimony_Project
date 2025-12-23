"use client";

export default function MatchesGlobalStyles() {
    return (
        <style jsx global>{`
        .page-surface {
            background-color: #f4f7fa;
            min-height: 100vh;
        }
        .header-section {
            background: linear-gradient(135deg, var(--brand-maroon) 0%, #a01040 100%);
            border-bottom-left-radius: 40px;
            border-bottom-right-radius: 40px;
        }
        .backdrop-blur {
            backdrop-filter: blur(8px);
        }
    `}</style>
    );
}
