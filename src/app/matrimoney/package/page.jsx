'use client';

import React, { useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import DashNav from '@/app/components/dashnav';
import { BsCheckCircleFill, BsStars, BsShieldFillCheck, BsLightningFill } from 'react-icons/bs';

// Updated package data with features for display
const packages = [
  {
    code: 'GOLD',
    title: 'Gold',
    price: 1500,
    days: 180,
    contactViews: 30,
    features: ['Send Unlimited Interests', 'Chat with Matched Users', 'Priority Support'],
    color: '#FFD700', // Gold
    icon: <BsShieldFillCheck />
  },
  {
    code: 'PLATINUM',
    title: 'Platinum',
    price: 2500,
    days: 120,
    contactViews: 60,
    features: ['All Gold Features', 'Highlighted Profile', 'Top Search Results'],
    color: '#E5E4E2', // Platinum
    isRecommended: true,
    icon: <BsStars />
  },
  {
    code: 'DIAMOND',
    title: 'Diamond',
    price: 5000,
    days: 180,
    contactViews: 120,
    features: ['All Platinum Features', 'Dedicated Relationship Manager', 'Profile Verification'],
    color: '#b9f2ff', // Diamond
    icon: <BsLightningFill />
  },
  {
    code: 'DIAMOND_PLUS',
    title: 'Diamond Plus',
    price: 10000,
    days: 180,
    contactViews: 240,
    features: ['Ultimate Visibility', 'Personalized Matchmaking', 'Guaranteed Introductions'],
    color: '#E33183', // Brand Pink
    icon: <BsStars /> // Reuse icon or find appropriate one
  },
];

export default function MatrimonyPackagePage() {
  const [loadingCode, setLoadingCode] = useState(null);
  const [active, setActive] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(''); // ✅ New State

  useEffect(() => { refreshActive(); }, []);

  async function refreshActive() {
    try {
      const r = await fetch('/api/me/active-subscription', { cache: 'no-store' });
      if (!r.ok) return;
      const { active } = await r.json();
      setActive(active);
    } catch { }
  }

  function isActivePlan(code) {
    return active?.code?.toUpperCase() === code.toUpperCase();
  }

  async function ensureRazorpayScript() {
    if (window.Razorpay) return;
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload = resolve;
      s.onerror = reject;
      document.body.appendChild(s);
    });
  }

  async function handlePay(pkg) {
    try {
      setLoadingCode(pkg.code);

      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_code: pkg.code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create order');

      if (data.test) {
        // Simulate payment for test mode
        const sim = await fetch('/api/payments/simulate-capture', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-test-secret': process.env.NEXT_PUBLIC_TEST_HEADER || ''
          },
          body: JSON.stringify({ plan_code: pkg.code })
        });
        const j = await sim.json().catch(() => ({}));
        if (!sim.ok) throw new Error(j.error || 'Simulation failed');

        // ✅ Success Popup
        setPaymentSuccess('Test payment successful. Plan activated! 💎');

        await refreshActive();
        return;
      }

      await ensureRazorpayScript();
      const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        name: 'MatriMoney',
        description: `Upgrade to ${pkg.title}`,
        order_id: data.orderId,
        handler: async function () {
          // Give server a moment to process webhook or optimistic update
          setTimeout(refreshActive, 3000);
          setPaymentSuccess('Payment received. Activating your plan…');
        }
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e) {
      alert(e.message);
    } finally {
      setLoadingCode(null);
    }
  }

  return (
    <>
      {/* Spacer removed (layout handles it) */}

      <div className="page-surface">
        {/* Header Section */}
        <div className="header-section text-center text-white mb-5 position-relative overflow-hidden">
          {/* Decorative Circles */}
          <div className="position-absolute top-0 start-0 translate-middle rounded-circle bg-white opacity-10" style={{ width: 300, height: 300 }}></div>
          <div className="position-absolute bottom-0 end-0 translate-middle rounded-circle bg-white opacity-10" style={{ width: 400, height: 400 }}></div>

          <div className="container py-5 position-relative z-1">
            <span className="badge bg-white text-maroon rounded-pill px-3 py-2 mb-3 shadow-sm fw-bold tracking-wide">
              PREMIUM MEMBERSHIP
            </span>
            <h1 className="fw-bold mb-3 display-5">Invest in Your Forever</h1>
            <p className="lead mb-0 opacity-90 mx-auto" style={{ maxWidth: 600 }}>
              Unlock exclusive features, contact more matches, and find your perfect partner faster with our premium plans.
            </p>
          </div>
        </div>

        <div className="container pb-5" style={{ marginTop: '-80px' }}>

          {/* Active Plan Widget */}
          {active && (
            <div className="row justify-content-center mb-5 fade-in-up">
              <div className="col-lg-8">
                <div className="bg-white rounded-4 shadow p-4 d-md-flex justify-content-between align-items-center position-relative overflow-hidden">
                  <div className="position-absolute start-0 top-0 bottom-0 bg-success" style={{ width: 6 }}></div>
                  <div>
                    <h6 className="text-muted text-uppercase small fw-bold mb-1">Current Active Plan</h6>
                    <h3 className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                      {active.code} <BsCheckCircleFill className="text-success h5 mb-0" />
                    </h3>
                    <p className="mb-0 text-secondary">
                      Valid until <strong>{active.ends_at?.slice(0, 10)}</strong> • <span className="text-primary fw-bold">{active.remaining_contacts} contacts left</span>
                    </p>
                  </div>
                  <div className="mt-3 mt-md-0">
                    <button className="btn btn-outline-primary rounded-pill px-4 fw-bold" onClick={refreshActive}>
                      Refresh Status
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Packages Grid */}
          <div className="row justify-content-center g-4">
            {packages.map((pkg, idx) => (
              <div className="col-md-6 col-xl-3" key={pkg.code}>
                <div
                  className={`card h-100 border-0 shadow-lg rounded-4 overflow-hidden position-relative hover-lift d-flex flex-column ${isActivePlan(pkg.code) ? 'ring-active' : ''}`}
                >
                  {/* Recommended Ribbon */}
                  {pkg.isRecommended && (
                    <div className="position-absolute top-0 end-0 bg-warning text-dark fw-bold px-3 py-1 small rounded-bottom-start shadow-sm" style={{ borderBottomLeftRadius: 12 }}>
                      Recommended
                    </div>
                  )}

                  {/* Card Header */}
                  <div className="card-header bg-white border-0 pt-4 pb-0 text-center">
                    <div className="d-inline-flex align-items-center justify-content-center rounded-circle bg-light mb-3" style={{ width: 60, height: 60, color: 'var(--brand-primary)' }}>
                      <span className="h4 mb-0">{pkg.icon}</span>
                    </div>
                    <h5 className="fw-bold text-uppercase letter-spacing-1 mb-1" style={{ color: 'var(--brand-maroon)' }}>{pkg.title}</h5>
                    {isActivePlan(pkg.code) && <span className="badge bg-success-subtle text-success rounded-pill px-2 py-1 small">Currently Active</span>}
                  </div>

                  <div className="card-body px-4 text-center d-flex flex-column">
                    {/* Price */}
                    <div className="my-3">
                      <h2 className="display-5 fw-bold text-dark mb-0">₹{pkg.price.toLocaleString()}</h2>
                      <span className="text-muted small fw-semibold">+ 18% GST</span>
                    </div>

                    {/* Duration & Views */}
                    <div className="bg-light rounded-3 p-3 mb-4">
                      <div className="d-flex justify-content-between mb-2 pb-2 border-bottom">
                        <span className="text-muted small fw-bold">VALIDITY</span>
                        <span className="text-dark fw-bold">{pkg.days} Days</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted small fw-bold">CONTACTS</span>
                        <span className="text-dark fw-bold">{pkg.contactViews} Nos.</span>
                      </div>
                    </div>

                    {/* Features List */}
                    <ul className="list-unstyled text-start mb-4 small flex-grow-1">
                      {pkg.features.map((feat, i) => (
                        <li key={i} className="mb-2 d-flex align-items-start gap-2">
                          <BsCheckCircleFill className="text-success flex-shrink-0 mt-1" />
                          <span className="text-secondary">{feat}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Action Button */}
                    <button
                      className={`btn w-100 py-3 rounded-pill fw-bold shadow-sm mt-auto ${pkg.isRecommended ? 'btn-primary' : 'btn-outline-primary'}`}
                      disabled={loadingCode === pkg.code}
                      onClick={() => handlePay(pkg)}
                    >
                      {loadingCode === pkg.code ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" /> Processing...
                        </>
                      ) : 'Select Plan'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SUCCESS MODAL ANIMATION */}
      {paymentSuccess && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center fade-in-overlay" style={{ zIndex: 9999, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
          <div className="bg-white rounded-4 p-5 shadow-lg text-center scale-in-center position-relative overflow-hidden" style={{ minWidth: 350, maxWidth: '90%' }}>
            {/* Confetti or decoration */}
            <div className="position-absolute top-0 start-0 w-100 bg-success-subtle" style={{ height: 6 }}></div>

            <div className="mb-4 icon-pop">
              <div className="d-inline-flex align-items-center justify-content-center bg-success text-white rounded-circle shadow-lg" style={{ width: 80, height: 80 }}>
                <BsShieldFillCheck className="display-4" />
              </div>
            </div>

            <h3 className="fw-bold text-dark mb-2">Payment Successful!</h3>
            <p className="text-muted mb-4 fs-6">{paymentSuccess}</p>

            <button className="btn btn-dark w-100 rounded-pill fw-bold py-3 shadow-sm hover-scale" onClick={() => setPaymentSuccess('')}>
              Enjoy Premium Benefits
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .scale-in-center { animation: scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        @keyframes scaleIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .icon-pop { animation: pop 0.5s ease; }
        @keyframes pop { 0% { transform: scale(0); } 70% { transform: scale(1.2); } 100% { transform: scale(1); } }
        .fade-in-overlay { animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        
        .page-surface {
            background-color: #f4f7fa;
            min-height: 100vh;
        }

        .header-section {
            background: linear-gradient(135deg, var(--brand-maroon) 0%, #a01040 100%);
            border-bottom-left-radius: 50px;
            border-bottom-right-radius: 50px;
            padding-bottom: 6rem !important; /* Extra padding for overlap */
        }
        .text-maroon { color: var(--brand-maroon, #800020) !important; }
        .letter-spacing-1 { letter-spacing: 1px; }
        
        .hover-lift {
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .hover-lift:hover {
            transform: translateY(-10px);
            box-shadow: 0 15px 30px rgba(0,0,0,0.1) !important;
        }
        
        .ring-active {
            box-shadow: 0 0 0 4px var(--brand-primary) !important;
        }

        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .fade-in-up {
            animation: fadeInUp 0.6s ease-out forwards;
        }
      `}</style>
    </>
  );
}