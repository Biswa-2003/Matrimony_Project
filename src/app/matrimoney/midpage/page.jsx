'use client';

import React, { useEffect, useState } from "react";
import "bootstrap-icons/font/bootstrap-icons.css";
import { FaStar } from "react-icons/fa";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Reveal, TiltCard, AnimatedCounter } from "@/app/components/motion";
import { useSiteContent, isCustomImage } from "@/lib/site-content-client";

const PLACEHOLDER_IMG = "/images/couple-mandap.svg";

// Shown only when the database has no success stories yet. Deliberately generic —
// no invented names or testimonials.
const FALLBACK_STORIES = [
  {
    id: "f1",
    couple_name: "Your Story Could Be Next",
    story: "Every week, families across India find their perfect match here. Create your free profile and start your own journey.",
    image_url: "/images/couple-mandap.svg",
  },
  {
    id: "f2",
    couple_name: "Verified, Private, Trusted",
    story: "Verified profiles, strict privacy controls and family-first matching help you connect with confidence.",
    image_url: "/images/logo-mark.svg",
  },
];

const TrustedCouplesSection = () => {
  const [stories, setStories] = useState([]);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();
  const { media } = useSiteContent();
  const placeholder = media.story_placeholder || PLACEHOLDER_IMG;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/success-stories")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (cancelled) return;
        setStories(Array.isArray(data) && data.length > 0 ? data : FALLBACK_STORIES);
      })
      .catch(() => !cancelled && setStories(FALLBACK_STORIES));
    return () => {
      cancelled = true;
    };
  }, []);

  const count = stories.length;
  const go = (dir) => {
    if (count < 2) return;
    setDirection(dir);
    setIndex((i) => (i + dir + count) % count);
  };

  // Auto-advance every 6s unless hovered / reduced motion
  useEffect(() => {
    if (count < 2 || paused || reduce) return;
    const t = setInterval(() => {
      setDirection(1);
      setIndex((i) => (i + 1) % count);
    }, 6000);
    return () => clearInterval(t);
  }, [count, paused, reduce]);

  const person = stories[index];

  return (
    <section id="stories" className="py-5 position-relative overflow-hidden stories-section" style={{ scrollMarginTop: "100px" }}>
      <div className="mandala-deco" style={{ width: 460, height: 460, right: -160, top: -120 }} aria-hidden="true" />

      <div className="container text-center position-relative" style={{ zIndex: 1 }}>
        <Reveal>
          <span className="eyebrow mb-2">Love Stories</span>
          <h2 className="mb-0" style={{ fontSize: "2.8rem" }}>
            Trusted by <span className="gradient-text">{(1600 + count).toLocaleString("en-IN")}+</span> Couples
          </h2>
          <span className="ornament mb-5" />
        </Reveal>

        <div className="row justify-content-center align-items-center">
          <div className="col-2 col-md-1 text-end">
            <button className="carousel-orb-btn" onClick={() => go(-1)} disabled={count < 2} aria-label="Previous story">
              <i className="bi bi-chevron-left" />
            </button>
          </div>

          <div
            className="col-8 col-lg-6"
            style={{ perspective: 1400 }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <div className="position-relative mx-auto" style={{ maxWidth: 520, marginTop: 70, minHeight: 360 }}>
              <div className="story-under-glow" aria-hidden="true" />
              <AnimatePresence mode="wait" custom={direction}>
                {person && (
                  <motion.div
                    key={person.id ?? index}
                    custom={direction}
                    initial={reduce ? false : { opacity: 0, rotateY: direction * 70, x: direction * 80, scale: 0.9 }}
                    animate={{ opacity: 1, rotateY: 0, x: 0, scale: 1 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, rotateY: direction * -70, x: direction * -80, scale: 0.9 }}
                    transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                    className="story-card"
                  >
                    <div className="story-quote" aria-hidden="true">
                      <i className="bi bi-quote" />
                    </div>

                    <div className="story-avatar">
                      <img
                        src={person.image_url || person.img || placeholder}
                        alt={person.couple_name}
                        className="rounded-circle w-100 h-100 object-fit-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = placeholder;
                        }}
                      />
                    </div>

                    <div className="mt-5 pt-4">
                      <div className="mb-3 text-warning">
                        {[...Array(5)].map((_, i) => (
                          <FaStar key={i} size={18} className="mx-1" />
                        ))}
                      </div>
                      <p className="text-secondary fst-italic mb-4 lh-lg" style={{ fontSize: "1.08rem" }}>
                        &ldquo;{person.story}&rdquo;
                      </p>
                      <div className="border-top pt-4 w-75 mx-auto">
                        <h5 className="fw-bold text-dark text-uppercase mb-1" style={{ letterSpacing: 1 }}>
                          {person.couple_name}
                        </h5>
                        {person.marriage_date && (
                          <small className="text-muted text-uppercase fw-bold" style={{ fontSize: "0.75rem" }}>
                            {new Date(person.marriage_date).toLocaleDateString(undefined, { year: "numeric", month: "long" })}
                          </small>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="col-2 col-md-1 text-start">
            <button className="carousel-orb-btn" onClick={() => go(1)} disabled={count < 2} aria-label="Next story">
              <i className="bi bi-chevron-right" />
            </button>
          </div>
        </div>

        {count > 1 && (
          <div className="d-flex justify-content-center gap-2 mt-5">
            {stories.map((s, i) => (
              <button
                key={s.id ?? i}
                onClick={() => {
                  setDirection(i > index ? 1 : -1);
                  setIndex(i);
                }}
                className={`story-dot ${i === index ? "active" : ""}`}
                aria-label={`Show story ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

const HOW_STEPS = [
  { art: "/images/ritual-kalash.svg", title: "Create Your Biodata", text: "A graceful profile that presents you and your family beautifully." },
  { art: "/images/ritual-rings.svg", title: "Discover Matches", text: "Search by community, profession, location and values." },
  { art: "/images/ritual-mehendi.svg", title: "Connect Families", text: "Send interests and exchange contacts with mutual consent." },
  { art: "/images/ritual-diya.svg", title: "Celebrate Forever", text: "Begin a new chapter blessed by both families." },
];

const WHY = [
  { icon: "bi-shield-lock-fill", title: "Complete Privacy", text: "Control who sees your photos and contact details with fine-grained privacy settings." },
  { icon: "bi-patch-check-fill", title: "Verified Profiles", text: "Profiles are screened by our team so you meet genuine people from genuine families." },
  { icon: "bi-chat-heart-fill", title: "Secure Conversations", text: "Talk through our protected messaging before you choose to share your number." },
];

const WELCOME_STATS = [
  { to: 5185, label: "Total Profiles" },
  { to: 2184, label: "Happy Couples" },
  { to: 5165, label: "Verified Users" },
  { to: 1800, suffix: "+", label: "Weddings" },
];

const TRADITIONS = [
  { art: "/images/ritual-rings.svg", title: "Roka & Engagement", text: "The first promise between two families." },
  { art: "/images/ritual-mehendi.svg", title: "Mehendi & Haldi", text: "Colour, laughter and blessings before the big day." },
  { art: "/images/ritual-diya.svg", title: "Pheras & Vows", text: "Seven sacred steps around the holy fire." },
  { art: "/images/ritual-kalash.svg", title: "Griha Pravesh", text: "A new home filled with love and prosperity." },
];

const MatrimonyMidPage = () => {
  const { media } = useSiteContent();
  const traditionArt = (i, fallback) => media[`tradition_${i + 1}`] || fallback;
  return (
    <>
      {/* How it works — royal maroon */}
      <section className="py-5 section-maroon toran-top overflow-hidden">
        <div className="mandala-deco light" style={{ width: 640, height: 640, left: -240, bottom: -300 }} aria-hidden="true" />
        <div className="container text-center position-relative pt-5 pb-3">
          <Reveal>
            <span className="eyebrow light mb-2">How It Works</span>
            <h2 className="text-white mb-0" style={{ fontSize: "2.8rem" }}>From First Hello to Saat Phere</h2>
            <span className="ornament mb-5" />
          </Reveal>

          <div className="row justify-content-center g-4">
            {HOW_STEPS.map((step, i) => (
              <div key={step.title} className="col-md-6 col-lg-3">
                <Reveal delay={i * 0.1} className="h-100">
                  <TiltCard className="glass-dark-card h-100 p-4">
                    <div className="step-number" aria-hidden="true">{String(i + 1).padStart(2, "0")}</div>
                    <div className="glass-icon mb-3 mx-auto" style={{ transform: "translateZ(50px)" }}>
                      <img src={step.art} alt="" />
                    </div>
                    <h5 className="text-white mb-2">{step.title}</h5>
                    <p className="small mb-0 text-white-50">{step.text}</p>
                  </TiltCard>
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Success stories carousel */}
      <TrustedCouplesSection />

      {/* Why choose us */}
      <section className="py-5 section-maroon overflow-hidden">
        <div className="mandala-deco light" style={{ width: 560, height: 560, right: -200, top: -200 }} aria-hidden="true" />
        <div className="container text-center position-relative py-4">
          <Reveal>
            <span className="eyebrow light mb-2">The MatriMoney Promise</span>
            <h2 className="text-white mb-0" style={{ fontSize: "2.8rem" }}>Why Families Choose Us</h2>
            <span className="ornament" />
            <p className="mt-3 mb-5 text-white-50 mx-auto" style={{ maxWidth: 600 }}>
              Your privacy and dignity come first. We create a safe, respectful space for you to find your partner.
            </p>
          </Reveal>

          <div className="row justify-content-center g-4">
            {WHY.map((w, i) => (
              <div key={w.title} className="col-md-4">
                <Reveal delay={i * 0.12} className="h-100">
                  <TiltCard className="why-card h-100 p-4 p-lg-5">
                    <div className="why-icon" style={{ transform: "translateZ(50px)" }}>
                      <i className={`bi ${w.icon}`} />
                    </div>
                    <h4 style={{ fontSize: "1.6rem" }}>{w.title}</h4>
                    <p className="small text-muted mb-0">{w.text}</p>
                  </TiltCard>
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Welcome + stats */}
      <section className="py-5 section-ivory">
        <div className="container py-4">
          <div className="row align-items-center g-5">
            <div className="col-lg-5">
              <Reveal>
                <TiltCard className="gold-frame" max={8}>
                  <div style={{ background: "#f6d9b8" }}>
                    <img
                      src={media.home_welcome}
                      alt="A bride and groom at their wedding"
                      className="w-100 d-block"
                      style={isCustomImage(media.home_welcome) ? { aspectRatio: "1 / 1", objectFit: "cover" } : undefined}
                    />
                  </div>
                  <div className="welcome-badge" style={{ transform: "translateZ(60px)" }}>
                    <div className="stat-num" style={{ fontSize: "2.2rem" }}>10+</div>
                    <small className="text-muted fw-semibold">Years of Trust</small>
                  </div>
                </TiltCard>
              </Reveal>
            </div>
            <div className="col-lg-7 ps-lg-5">
              <Reveal delay={0.1}>
                <span className="eyebrow mb-3">Welcome to MatriMoney</span>
                <h2 className="mb-3" style={{ fontSize: "2.9rem" }}>Two Hearts, Two Families, One Beautiful Beginning</h2>
                <span className="ornament start mb-4" />
                <p className="text-muted mb-4" style={{ lineHeight: 1.8 }}>
                  In India, a marriage is not only the union of two people but the coming together of two families.
                  Our platform is designed around that belief — helping you find a partner who shares your values,
                  traditions and dreams.
                </p>
              </Reveal>

              <div className="row g-3 text-center mt-2">
                {WELCOME_STATS.map((s, i) => (
                  <div key={s.label} className="col-6 col-sm-3">
                    <Reveal delay={0.15 + i * 0.08}>
                      <div className="mini-stat">
                        <h3 className="mb-0 gradient-text">
                          <AnimatedCounter to={s.to} suffix={s.suffix || ""} />
                        </h3>
                        <small className="text-muted">{s.label}</small>
                      </div>
                    </Reveal>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Traditions */}
      <section className="py-5 section-cream">
        <div className="container py-4">
          <Reveal className="text-center mb-5">
            <span className="eyebrow mb-2">Celebrating Every Tradition</span>
            <h2 className="mb-0" style={{ fontSize: "2.8rem" }}>Moments We Help Create</h2>
            <span className="ornament" />
          </Reveal>

          <div className="row g-4">
            {TRADITIONS.map((t, i) => (
              <div key={t.title} className="col-sm-6 col-lg-3">
                <Reveal delay={i * 0.1} className="h-100">
                  <TiltCard className="tradition-card h-100" max={10}>
                    <img
                      src={traditionArt(i, t.art)}
                      alt=""
                      className={isCustomImage(traditionArt(i, t.art)) ? "tradition-photo" : undefined}
                    />
                    <h5 className="mb-2">{t.title}</h5>
                    <p className="small text-white-50 mb-0">{t.text}</p>
                  </TiltCard>
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default MatrimonyMidPage;
