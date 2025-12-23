
export default function Loading() {
    return (
        <div className="loading-container">
            <div className="heart-wrapper">
                <div className="heart"></div>
                <div className="heart-pulse"></div>
            </div>
            <h6 className="loading-text">Finding your perfect match...</h6>

            <style>{`
        .loading-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(255, 255, 255, 0.95);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          backdrop-filter: blur(5px);
        }
        
        .heart-wrapper {
          position: relative;
          width: 60px;
          height: 60px;
          margin-bottom: 20px;
        }

        .heart {
          background-color: var(--brand-primary, #E33183);
          display: inline-block;
          height: 30px;
          margin: 0 10px;
          position: relative;
          top: 0;
          transform: rotate(-45deg);
          width: 30px;
          animation: heartbeat 1.2s infinite;
        }

        .heart:before,
        .heart:after {
          content: "";
          background-color: var(--brand-primary, #E33183);
          border-radius: 50%;
          height: 30px;
          position: absolute;
          width: 30px;
        }

        .heart:before {
          top: -15px;
          left: 0;
        }

        .heart:after {
          left: 15px;
          top: 0;
        }

        .heart-pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: 2px solid var(--brand-primary, #E33183);
          opacity: 0;
          animation: ripple 1.2s infinite;
        }

        .loading-text {
          font-family: var(--font-geist-sans), sans-serif;
          color: var(--brand-maroon, #800020);
          font-weight: 500;
          letter-spacing: 0.5px;
          animation: fadeText 1.2s infinite alternate;
        }

        @keyframes heartbeat {
          0% { transform: rotate(-45deg) scale(0.8); }
          5% { transform: rotate(-45deg) scale(0.9); }
          10% { transform: rotate(-45deg) scale(0.8); }
          15% { transform: rotate(-45deg) scale(1.0); }
          50% { transform: rotate(-45deg) scale(0.8); }
          100% { transform: rotate(-45deg) scale(0.8); }
        }

        @keyframes ripple {
          0% { width: 0; height: 0; opacity: 1; }
          100% { width: 100px; height: 100px; opacity: 0; }
        }

        @keyframes fadeText {
          from { opacity: 0.6; }
          to { opacity: 1; }
        }
      `}</style>
        </div>
    );
}
