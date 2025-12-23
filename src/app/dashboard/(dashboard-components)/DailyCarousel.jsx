'use client';

import React, { useEffect, useId, useRef, useState } from 'react';

export default function DailyRecommendationsCarousel({ recommendations = [], currentGender }) {
  // Local state for DB data
  const [dbRecs, setDbRecs] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ Fallback data (only used if API has no data / fails)
  const defaultRecommendations = [
    { id: 1, name: 'KABITA NAYAK', img: '/image/1.jpeg', photosCount: 2 },
    { id: 2, name: 'ADITI RANI SAHOO', img: '/image/2.jpeg', photosCount: 0 },
    { id: 3, name: 'SMRUTIPRAVA TRIPATHY', img: '/image/3.jpeg', photosCount: 1 },
  ];

  // 1) priority: prop
  // 2) then DB data
  // 3) fallback static
  const recs =
    recommendations.length > 0
      ? recommendations
      : dbRecs.length > 0
        ? dbRecs
        : defaultRecommendations;

  // ✅ Hydration-safe unique id
  const reactId = useId();
  const domId = `dailyRecsCarousel-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const elRef = useRef(null);
  const instanceRef = useRef(null);

  // 🔹 Fetch recommendations from /api/recent-users and filter by opposite gender
  useEffect(() => {
    let alive = true;

    async function loadRecs() {
      try {
        setLoading(true);

        // same endpoint you already use for "Latest Updates"
        const res = await fetch('/api/recent-users?limit=20&months=12', {
          credentials: 'include',
          cache: 'no-store',
        });

        const data = await res.json().catch(() => ({}));
        if (!alive) return;

        if (!res.ok || !Array.isArray(data.users)) {
          setDbRecs([]);
          return;
        }

        let rows = data.users;

        // determine target gender (opposite of currentGender)
        const g = String(currentGender || '').toUpperCase();
        let target = null;
        if (g.startsWith('M')) target = 'F';
        else if (g.startsWith('F')) target = 'M';

        if (target) {
          rows = rows.filter((u) =>
            String(u.gender || '').toUpperCase().startsWith(target)
          );
        }

        // map to carousel fields
        const mapped = rows.map((u, i) => ({
          id: u.user_id ?? u.id ?? u.matri_id ?? i,
          name: u.first_name || u.name || u.matri_id,
          matri_id: u.matri_id,
          img: u.photo || '/uploads/default.jpg',
          photosCount: 0,
          connection_status: u.connection_status, // Pass connection status
        }));

        setDbRecs(mapped);
      } catch (e) {
        if (!alive) return;
        console.error('Failed to load daily recommendations', e);
        setDbRecs([]);
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadRecs();
    return () => {
      alive = false;
    };
  }, [currentGender]);

  // ✅ Init Bootstrap carousel - FIXED
  useEffect(() => {
    let instance = null;
    let t = null;
    let mounted = true;

    async function initCarousel() {
      try {
        if (!mounted) return;
        if (typeof window === 'undefined') return;

        const el = elRef.current;
        if (!el) return;

        // Check if carousel items exist
        const items = el.querySelectorAll('.carousel-item');
        if (items.length === 0) return;

        const bootstrap = await import('bootstrap/dist/js/bootstrap.bundle.min.js');
        if (!mounted || !bootstrap?.Carousel) return;

        // Cleanup existing instance (prevent illegal invocation)
        try {
          const existing = bootstrap.Carousel.getInstance(el);
          if (existing) {
            existing.dispose();
          }
        } catch (cleanupErr) {
          // Ignore cleanup errors
        }

        if (!mounted) return;

        // Create new instance with error handling
        try {
          instance = new bootstrap.Carousel(el, {
            interval: 4000,
            ride: 'carousel',
            touch: true,
            pause: 'hover',
            wrap: true,
            keyboard: true,
          });

          instanceRef.current = instance;
        } catch (createErr) {
          console.warn('Carousel creation error:', createErr);
        }
      } catch (err) {
        // Silently handle errors
        if (mounted) {
          console.warn('Carousel init warning:', err);
        }
      }
    }

    // Only init if we have items
    if (recs.length > 0) {
      t = setTimeout(initCarousel, 200);
    }

    return () => {
      mounted = false;
      clearTimeout(t);

      // Cleanup instance safely
      try {
        if (instance) {
          instance.dispose();
        }
      } catch (err) {
        // Ignore cleanup errors
      }

      instanceRef.current = null;
    };
  }, [recs.length]); // Only re-init when count changes, not data

  const handleSendInterest = async (user) => {
    try {
      const res = await fetch('/api/interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ matri_id: user.matri_id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error || 'Failed to send interest');
        return;
      }
      alert('Interest sent!');
    } catch (e) {
      console.error('send interest failed', e);
      alert('Something went wrong while sending interest');
    }
  };

  return (
    <div className="position-relative w-100">
      <div
        id={domId}
        ref={elRef}
        className="carousel slide rounded-4 overflow-hidden shadow-sm border-0"
        style={{ minHeight: '320px' }}
      >
        <div className="carousel-inner h-100">
          {recs.map((user, index) => (
            <div
              key={user.id ?? index}
              className={`carousel-item h-100 ${index === 0 ? 'active' : ''}`}
            >
              <div
                className="position-relative h-100 w-100"
                style={{ height: '320px' }}
              >
                {/* Full Card Image */}
                <img
                  src={user.img}
                  alt={user.name}
                  className="d-block w-100 h-100"
                  style={{ objectFit: 'cover' }}
                  onError={(e) => { e.currentTarget.src = '/uploads/default.jpg'; }}
                />

                {/* Gradient Overlay */}
                <div
                  className="position-absolute bottom-0 start-0 end-0 p-4 d-flex flex-column justify-content-end"
                  style={{
                    background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)',
                    height: '60%',
                  }}
                >
                  <a
                    href={user.matri_id ? `/matrimoney/profile-details/${encodeURIComponent(user.matri_id)}` : '#'}
                    className="text-decoration-none"
                  >
                    <h5 className="text-white fw-bold mb-1 d-flex align-items-center gap-2">
                      {user.name}
                      {user.photosCount > 0 && (
                        <span className="badge bg-white text-dark small py-1 px-2 rounded-pill" style={{ fontSize: '0.65rem' }}>
                          <i className="bi bi-images me-1"></i> {user.photosCount}
                        </span>
                      )}
                    </h5>
                    <p className="text-white small mb-3 opacity-75">{user.matri_id}</p>
                  </a>

                  <div className="d-flex gap-2">
                    {user.connection_status === 'accepted' ? (
                      <button
                        className="btn btn-sm btn-success border-0 fw-bold px-3 rounded-pill shadow-lg d-flex align-items-center gap-2"
                        style={{ backgroundColor: '#4CAF50', cursor: 'default' }}
                      >
                        <i className="bi bi-people-fill small"></i> Friend
                      </button>
                    ) : (
                      <button
                        className="btn btn-sm btn-primary border-0 fw-bold px-3 rounded-pill shadow-lg d-flex align-items-center gap-2"
                        style={{ background: 'var(--brand-primary)' }}
                        onClick={() => handleSendInterest(user)}
                      >
                        <i className="bi bi-heart-fill small"></i> Connect
                      </button>
                    )}
                    <a
                      href={user.matri_id ? `/matrimoney/profile-details/${encodeURIComponent(user.matri_id)}` : '#'}
                      className="btn btn-sm btn-outline-light fw-bold px-3 rounded-pill"
                    >
                      View
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Custom Nav Controls (React-driven) */}
        <button
          className="carousel-control-prev"
          type="button"
          onClick={() => instanceRef.current?.prev()}
          style={{ opacity: 1, width: '40px', left: '10px' }}
        >
          <span className="bg-dark bg-opacity-50 p-2 rounded-circle d-flex align-items-center justify-content-center hover-scale">
            <span className="carousel-control-prev-icon" aria-hidden="true" style={{ width: '1rem', height: '1rem' }}></span>
          </span>
        </button>
        <button
          className="carousel-control-next"
          type="button"
          onClick={() => instanceRef.current?.next()}
          style={{ opacity: 1, width: '40px', right: '10px' }}
        >
          <span className="bg-dark bg-opacity-50 p-2 rounded-circle d-flex align-items-center justify-content-center hover-scale">
            <span className="carousel-control-next-icon" aria-hidden="true" style={{ width: '1rem', height: '1rem' }}></span>
          </span>
        </button>

        <style jsx>{`
          .hover-scale { transition: transform 0.2s; }
          .hover-scale:hover { transform: scale(1.1); background-color: rgba(0,0,0,0.7) !important; }
        `}</style>
      </div>
    </div>
  );
}
