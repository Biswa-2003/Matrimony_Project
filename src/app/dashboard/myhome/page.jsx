'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useRouter } from 'next/navigation';
import ImageCropper from '@/app/components/ImageCropper';
import ProfilePhotoModal from '../(dashboard-components)/ProfilePhotoModal';
import SuccessModal from '../(dashboard-components)/SuccessModal';
import InboxPanel from '../(dashboard-components)/InboxPanel';
import RecommendedStrip from '../(dashboard-components)/RecommendedStrip';
import MatchSpotlight from '../(dashboard-components)/MatchSpotlight';
import { ViewsChart, ProfileChecklist, PlanCard, SafetyTips, SentInterestsCard } from '../(dashboard-components)/DashboardWidgets';
import { Reveal, TiltCard, AnimatedCounter } from '@/app/components/motion';
import { resolvePhoto, timeAgo, safeJson } from './myhome.utils';

export default function MyHome() {
  // ... existing code ...

  // ---------- profile + upload ----------
  const [profile, setProfile] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState(''); // ✅ NEW
  const fileRef = useRef();
  const router = useRouter();

  // active subscription (for label + details)
  const [activeSub, setActiveSub] = useState(null);

  // all dashboard widget data in one request
  const [insights, setInsights] = useState(null);
  useEffect(() => {
    let alive = true;
    fetch('/api/dashboard/insights', { credentials: 'include', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => alive && j && setInsights(j))
      .catch(() => {});
    return () => { alive = false; };
  }, []);


  /* safeJson moved to utils */

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/my-home', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });
      if (res.status === 401) {
        router.push('/matrimoney/login');
        return;
      }
      const data = await safeJson(res);
      if (res.ok) setProfile(data.profile || null);
      else setProfile(null);
    } catch (err) {
      console.error('Failed to load profile', err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  // NEW: fetch active subscription for this user
  const fetchActiveSubscription = async () => {
    try {
      const res = await fetch('/api/me/active-subscription', {
        cache: 'no-store',
        credentials: 'include',
      });
      if (!res.ok) {
        setActiveSub(null);
        return;
      }
      const data = await res.json().catch(() => ({}));
      // support both shapes: {active} or {subscription}
      const active = data.active || data.subscription || null;
      setActiveSub(active);
    } catch (err) {
      console.error('Failed to load active subscription', err);
      setActiveSub(null);
    }
  };

  // Track the current local preview URL for automatic cleanup via effect
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);

  // ⚡ OPTIMIZATION: Fetch all data in parallel with timeout protection
  useEffect(() => {
    let alive = true;

    const fetchWithTimeout = async (url, timeout = 10000) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const res = await fetch(url, {
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        return res;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          console.warn(`Request to ${url} timed out after ${timeout}ms`);
        }
        throw error;
      }
    };

    const fetchAllData = async () => {
      try {
        // 🚀 Fetch all data in PARALLEL
        const [profileRes, subscriptionRes] = await Promise.allSettled([
          fetchWithTimeout('/api/my-home'),
          fetchWithTimeout('/api/me/active-subscription')
        ]);

        if (!alive) return;

        // Handle profile
        if (profileRes.status === 'fulfilled') {
          const data = await safeJson(profileRes.value);
          if (profileRes.value.status === 401) {
            router.push('/matrimoney/login');
            return;
          }
          if (profileRes.value.ok) {
            setProfile(data.profile || null);
          }
        } else {
          console.error('Profile fetch failed:', profileRes.reason);
          setProfile(null);
        }

        // Handle subscription
        if (subscriptionRes.status === 'fulfilled' && subscriptionRes.value.ok) {
          const data = await subscriptionRes.value.json().catch(() => ({}));
          const active = data.active || data.subscription || null;
          setActiveSub(active);
        } else {
          if (subscriptionRes.status === 'rejected') {
            console.error('Subscription fetch failed:', subscriptionRes.reason);
          }
          setActiveSub(null);
        }
      } catch (err) {
        console.error('Failed to load dashboard data', err);
        setProfile(null);
        setActiveSub(null);
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchAllData();

    return () => {
      alive = false;
    };
  }, []); // Run once on mount

  // Cleanup effect: runs when previewBlobUrl changes (revokes old) and on unmount
  useEffect(() => {
    return () => {
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl);
      }
    };
  }, [previewBlobUrl]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropDone = async (croppedFileOrBlob) => {
    try {
      setUploading(true);
      // ... (file prep logic) ...
      const fileToSend =
        croppedFileOrBlob instanceof File
          ? croppedFileOrBlob
          : new File([croppedFileOrBlob], 'crop.jpg', { type: croppedFileOrBlob?.type || 'image/jpeg' });

      const previewUrl = URL.createObjectURL(fileToSend);
      setPreviewBlobUrl(previewUrl); // This will trigger cleanup of the previous one by the effect


      setProfile((p) => (p ? { ...p, photo: previewUrl } : p));

      const formData = new FormData();
      formData.append('photo', fileToSend);

      const res = await fetch('/api/upload-photo', {
        method: 'POST',
        body: formData,
        credentials: 'include',
        cache: 'no-store',
      });

      const data = await safeJson(res);

      if (res.status === 401) {
        alert('Session expired. Please log in again.');
        router.push('/matrimoney/login');
        return;
      }

      if (!res.ok) {
        alert(data?.error || 'Failed to upload photo');
        await fetchProfile();
        await fetchActiveSubscription();
        return;
      }

      if (data?.path) setProfile((p) => (p ? { ...p, photo: data.path } : p));
      else await fetchProfile();

      setShowCropper(false);
      if (fileRef.current) fileRef.current.value = '';

      // ✅ SUCCESS POPUP
      setSuccessMsg(data?.message || 'Photo uploaded successfully!');
      setTimeout(() => setSuccessMsg(''), 3000); // Auto close

    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload photo');
      await fetchProfile();
      await fetchActiveSubscription();
    } finally {
      setUploading(false);
    }
  };







  const profilePhotoPath = resolvePhoto(profile?.photo);
  const firstName = profile?.first_name || (loading ? '' : 'Member');
  const t = insights?.totals || {};
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const headline =
    t.pending_received > 0
      ? `${t.pending_received} ${t.pending_received === 1 ? 'family is' : 'families are'} waiting for your reply.`
      : t.visitors_week > 0
      ? `${t.visitors_week} ${t.visitors_week === 1 ? 'member' : 'members'} visited your profile this week.`
      : 'Here’s what’s happening with your profile today.';

  const nextStep = (insights?.checklist || []).find((c) => !c.done) || null;

  const STATS = [
    { key: 'pending_received', label: 'Interests Received', icon: 'bi-envelope-heart', href: '/matrimoney/interests?filter=received', tone: 'ruby' },
    { key: 'connections', label: 'Connections', icon: 'bi-hearts', href: '/matrimoney/interests?filter=accepted', tone: 'gold' },
    { key: 'visitors', label: 'Profile Visitors', icon: 'bi-eye', href: '/matrimoney/matches/who-viewed-myprofile', tone: 'maroon' },
    { key: 'shortlisted_me', label: 'Shortlisted You', icon: 'bi-bookmark-star', href: '/matrimoney/shortlist', tone: 'gold' },
  ];

  return (
    <>
      <div className="myhome-surface">
        <div className="container" style={{ paddingTop: '20px', paddingBottom: '40px' }}>
          {/* ================= Hero ================= */}
          <section className="dash-hero fade-in-up">
            <div className="mandala-deco light" style={{ width: 520, height: 520, right: -140, top: -220 }} aria-hidden="true" />
            <div className="row g-4 align-items-center position-relative">
              <div className="col-auto">
                <div className="dash-avatar">
                  <img
                    src={profilePhotoPath}
                    alt="Your profile"
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/images/avatar-male.svg'; }}
                  />
                  <button type="button" className="dash-avatar-btn" onClick={() => fileRef.current?.click()} disabled={uploading} title="Change photo" aria-label="Change photo">
                    {uploading ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-camera" />}
                  </button>
                  <input type="file" accept="image/*" ref={fileRef} onChange={handleFileChange} style={{ display: 'none' }} />
                </div>
              </div>
              <div className="col">
                <span className="eyebrow light mb-2">{greeting}</span>
                <h1 className="text-white mb-1" style={{ fontSize: 'clamp(2rem, 3.6vw, 3rem)' }}>
                  Welcome back, <span className="gold-text">{firstName}</span>
                </h1>
                <p className="mb-3" style={{ color: 'rgba(255,255,255,.75)' }}>{headline}</p>
                <div className="d-flex flex-wrap gap-2">
                  <span className="badge badge-gold px-3 py-2 rounded-pill"><i className="bi bi-person-badge me-1" />{profile?.matri_id || 'Generating ID…'}</span>
                  <span className={`badge px-3 py-2 rounded-pill ${activeSub ? 'badge-gold' : 'bg-light text-dark'}`}>
                    <i className="bi bi-gem me-1" />{activeSub ? `${activeSub.code} member` : 'Free member'}
                  </span>
                  {insights?.memberSince && (
                    <span className="badge px-3 py-2 rounded-pill" style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(232,207,142,.4)' }}>
                      <i className="bi bi-calendar-heart me-1" />Member since {new Date(insights.memberSince).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
              <div className="col-12 col-lg-auto d-flex flex-column align-items-lg-end gap-2">
                {nextStep ? (
                  <Link href={nextStep.href} className="next-step">
                    <span className="next-step-icon"><i className={`bi ${nextStep.icon}`} /></span>
                    <span className="text-start">
                      <small>Your next step</small>
                      <span>{nextStep.label}</span>
                    </span>
                    <i className="bi bi-arrow-right ms-1" />
                  </Link>
                ) : (
                  <Link href="/matrimoney/matches/newmatches" className="btn btn-gold px-4"><i className="bi bi-stars me-1" />New Matches</Link>
                )}
                <div className="d-flex gap-2">
                  <Link href="/matrimoney/preference-search" className="btn btn-glass btn-sm px-3"><i className="bi bi-search-heart me-1" />Search</Link>
                  <Link href="/matrimoney/interests?filter=received" className="btn btn-glass btn-sm px-3"><i className="bi bi-envelope-heart me-1" />Interests</Link>
                  {profile?.matri_id && (
                    <Link href={`/matrimoney/profile-details/${profile.matri_id}`} className="btn btn-glass btn-sm px-3" title="Preview my profile"><i className="bi bi-eye" /></Link>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ================= Stat tiles ================= */}
          <div className="row g-3 mb-4">
            {STATS.map((s, i) => (
              <div key={s.key} className="col-6 col-lg-3">
                <Reveal delay={i * 0.06} className="h-100">
                  <TiltCard className="h-100" max={8}>
                    <Link href={s.href} className={`dash-stat tone-${s.tone}`}>
                      <span className="dash-stat-icon"><i className={`bi ${s.icon}`} /></span>
                      <span className="dash-stat-num">
                        {insights ? <AnimatedCounter to={Number(t[s.key]) || 0} duration={1.2} /> : '–'}
                      </span>
                      <span className="dash-stat-label">{s.label}</span>
                      <i className="bi bi-arrow-up-right dash-stat-go" />
                    </Link>
                  </TiltCard>
                </Reveal>
              </div>
            ))}
          </div>

          {/* Row A — discover + profile strength */}
          <div className="row g-4 mb-4 align-items-stretch">
            <div className="col-xl-8">
              <MatchSpotlight />
            </div>
            <div className="col-xl-4">
              <ProfileChecklist items={insights?.checklist || []} strength={insights?.strength || 0} />
            </div>
          </div>

          {/* Row B — recommendations strip */}
          <div className="mb-4">
            <RecommendedStrip />
          </div>

          {/* Row C — inbox + membership & visitors */}
          <div className="row g-4 mb-4 align-items-stretch">
            <div className="col-xl-8">
              <InboxPanel counts={t} visitors={insights?.recentVisitors || []} />
            </div>
            <div className="col-xl-4 d-flex flex-column gap-4">
              <PlanCard plan={insights?.plan || null} />
              <ViewsChart data={insights?.views7d || []} weekTotal={t.visitors_week || 0} visitors={insights?.recentVisitors || []} />
            </div>
          </div>

          {/* Row D — journey, quick actions, safety */}
          <div className="row g-4 align-items-stretch">
            <div className="col-lg-4">
              <SentInterestsCard pending={t.pending_sent || 0} connections={t.connections || 0} shortlist={t.my_shortlist || 0} />
            </div>
            <div className="col-lg-4">
              <div className="luxe-card p-4 h-100">
                <span className="eyebrow" style={{ fontSize: '0.6rem' }}>Shortcuts</span>
                <h5 className="mb-3 mt-1">Manage your profile</h5>
                <div className="row g-2">
                  {[
                    ['/dashboard/profile-edit', 'bi-pencil-square', 'Edit Profile'],
                    ['/dashboard/upload-photo', 'bi-images', 'Photos'],
                    ['/dashboard/profile-edit#sec-partnerPref', 'bi-hearts', 'Preferences'],
                    ['/dashboard/profile-setting', 'bi-shield-lock', 'Privacy'],
                    ['/matrimoney/shortlist', 'bi-bookmark-heart', 'Shortlist'],
                    ['/matrimoney/contactus', 'bi-headset', 'Support'],
                  ].map(([href, icon, label]) => (
                    <div key={href} className="col-4">
                      <Link href={href} className="quick-tile py-3"><i className={`bi ${icon}`} /><span>{label}</span></Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="col-lg-4">
              <SafetyTips />
            </div>
          </div>
        </div>
      </div>

      {showCropper && (
        <ImageCropper image={imageSrc} show={showCropper} onClose={() => setShowCropper(false)} onCropDone={handleCropDone} />
      )}

      <ProfilePhotoModal
        show={showPhotoModal}
        onHide={() => setShowPhotoModal(false)}
        reload={() => { fetchProfile(); fetchActiveSubscription(); }}
      />
      <SuccessModal show={!!successMsg} message={successMsg} onClose={() => setSuccessMsg('')} />
    </>
  );
}
