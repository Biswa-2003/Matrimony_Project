'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useRouter } from 'next/navigation';
import DailyRecommendationsCarousel from '../(dashboard-components)/DailyCarousel';
import ImageCropper from '@/app/components/ImageCropper';
import ProfilePhotoModal from '../(dashboard-components)/ProfilePhotoModal';
import SuccessModal from '../(dashboard-components)/SuccessModal';
import ProfileCompletionBar from '@/app/dashboard/(dashboard-components)/ProfileCompletionBar';
import { useInterestStats } from '@/app/hooks/useInterestStats';
import { UpdateCard, AccentCard } from './UpdateCard';
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

  // ---------- latest updates list ----------
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');
  // is the logged-in viewer premium?
  const [viewerIsPremium, setViewerIsPremium] = useState(false);

  // ---------- equal height refs ----------
  // ---------- equal height refs ----------
  const leftCardRef = useRef(null);
  const rightCardRef = useRef(null);

  // ---------- interest stats (right sidebar) ----------
  const { stats, loading: statsLoading } = useInterestStats();
  const goToReceived = () => router.push('/matrimoney/interests?filter=received');
  const goToAccepted = () => router.push('/matrimoney/interests?filter=accepted');
  const goToViewed = () => router.push('/matrimoney/matches/who-viewed-myprofile');

  /* safeJson moved to utils */

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/my-home', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });
      if (res.status === 401) {
        router.push('/login');
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
            router.push('/login');
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

  // Load "Latest Updates"
  useEffect(() => {
    let alive = true;

    async function loadUpdates(months) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const r = await fetch(`/api/recent-users?limit=8&months=${months}`, {
          cache: 'no-store',
          credentials: 'include',
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.error || 'Failed to load');

        // read viewerIsPremium from API if present
        if (alive && typeof data.viewerIsPremium === 'boolean') {
          setViewerIsPremium(data.viewerIsPremium);
        }

        return Array.isArray(data.users) ? data.users : [];
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          console.warn('Recent users request timed out after 10 seconds');
        }
        throw error;
      }
    }

    (async () => {
      try {
        setUsersLoading(true);
        setUsersError('');
        let rows = await loadUpdates(3);
        if (!rows.length) rows = await loadUpdates(12);
        if (alive) setUsers(rows);
      } catch (e) {
        if (alive) setUsersError(e.message || 'Something went wrong');
      } finally {
        if (alive) setUsersLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

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
        router.push('/login');
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



  // simple date formatter for ends_at
  const formatDate = (iso) => {
    if (!iso) return '--';
    try {
      return iso.slice(0, 10);
    } catch {
      return String(iso);
    }
  };

  const membershipLabel = activeSub?.code || 'Free';
  const hasActivePlan = !!activeSub;

  return (
    <>
      <div className="myhome-surface">
        <div className="container" style={{ paddingTop: '20px', paddingBottom: '40px' }}>

          {/* Welcome Header */}
          <div className="d-flex align-items-center justify-content-between mb-4 fade-in-up">
            <div>
              <h2 className="fw-bold text-maroon mb-1">
                Welcome back, {profile?.first_name || 'Member'}! 👋
              </h2>
              <p className="text-muted mb-0">Here's what's happening regarding your profile today.</p>
            </div>
            <div className="d-none d-md-block">
              <span className="badge bg-white text-maroon shadow-sm border px-3 py-2 fw-normal rounded-pill">
                Program ID: <span className="fw-bold">{profile?.matri_id || 'Waiting...'}</span>
              </span>
            </div>
          </div>

          <div className="row align-items-stretch">
            {/* Left Sidebar: Profile Card */}
            <div className="col-lg-3 col-md-3 mb-3">
              <AccentCard ref={leftCardRef}>
                <div className="text-center">
                  <div
                    className="d-flex align-items-center justify-content-center bg-light mx-auto mb-3 position-relative"
                    style={{
                      width: 140,
                      height: 160,
                      borderRadius: 16,
                      overflow: 'hidden',
                      border: '1px solid rgba(0,0,0,0.08)',
                    }}
                  >
                    <Image
                      src={profilePhotoPath}
                      alt="User"
                      className="img-fluid zoomable-img"
                      width={140}
                      height={160}
                      unoptimized
                      onError={(e) => { e.currentTarget.src = '/uploads/default.jpg'; }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>

                  <h5 className="card-title mb-2 text-maroon fw-bold">
                    {profile?.first_name || (loading ? 'Loading…' : 'Your Name')}
                  </h5>

                  <div className="d-flex justify-content-center gap-2 mb-4">
                    <span className="badge bg-light text-secondary border fw-normal">{profile?.matri_id || 'DUXXXX'}</span>
                    <span className={`badge border fw-bold ${hasActivePlan ? 'bg-success-subtle text-success border-success' : 'bg-secondary-subtle text-secondary border-secondary'}`}>
                      {membershipLabel}
                    </span>
                  </div>

                  <button
                    className="btn btn-primary btn-sm w-100 mb-3 shadow-sm text-uppercase fw-bold letter-spacing-1"
                    onClick={() => router.push('/matrimoney/package')}
                    style={{ fontSize: '0.8rem', padding: '10px' }}
                  >
                    {hasActivePlan ? 'Manage Plan' : 'Upgrade Premium'}
                  </button>

                  <div className="text-start mt-4">
                    <p className="small text-uppercase text-muted fw-bold mb-3 ls-1">Quick Links</p>
                    <ul className="list-unstyled d-flex flex-column gap-2 mb-0">
                      <li>
                        <button className="btn btn-link p-0 text-decoration-none text-dark fw-semibold d-flex align-items-center gap-2 hover-text-primary" onClick={() => fileRef.current?.click()} disabled={uploading}>
                          <i className="bi bi-camera text-secondary"></i> {uploading ? 'Uploading...' : 'Change Photo'}
                        </button>
                        <input type="file" accept="image/*" ref={fileRef} onChange={handleFileChange} style={{ display: 'none' }} />
                      </li>
                      <li>
                        <Link href="/dashboard/profile-edit" className="text-decoration-none text-dark fw-semibold d-flex align-items-center gap-2 hover-text-primary">
                          <i className="bi bi-pencil text-secondary"></i> Edit Profile
                        </Link>
                      </li>
                      <li>
                        <Link href="/matrimoney/shortlist" className="text-decoration-none text-dark fw-semibold d-flex align-items-center gap-2 hover-text-primary">
                          <i className="bi bi-heart text-secondary"></i> My Shortlist
                        </Link>
                      </li>
                      <li>
                        <Link href="/matrimoney/preference-search" className="text-decoration-none text-dark fw-semibold d-flex align-items-center gap-2 hover-text-primary">
                          <i className="bi bi-sliders text-secondary"></i> Partner Preferences
                        </Link>
                      </li>
                    </ul>
                  </div>

                  {hasActivePlan && (
                    <div className="mt-4 p-3 bg-light rounded-3 border">
                      <small className="d-block text-muted text-uppercase fw-bold mb-1" style={{ fontSize: '0.65rem' }}>Plan Expires On</small>
                      <span className="fw-bold text-dark">{formatDate(activeSub.ends_at)}</span>
                      <div className="mt-2 d-flex justify-content-between align-items-center">
                        <span className="small text-muted">Contacts Left</span>
                        <span className="badge bg-white text-dark border">{activeSub.remaining_contacts}</span>
                      </div>
                    </div>
                  )}

                  {/* New: Fill the gap with Support & Saftey widgets */}
                  <hr className="my-4 text-secondary opacity-25" />

                  <div className="text-start">
                    <p className="small text-uppercase text-muted fw-bold mb-3 ls-1">Need Help?</p>
                    <div className="p-3 bg-pink-subtle rounded-3 border-pink">
                      <p className="small text-dark mb-2">Our support team is available 24/7 to assist you.</p>
                      <Link href="/matrimoney/contactus" className="btn btn-sm btn-outline-danger w-100 fw-bold bg-white text-maroon border-maroon">Contact Support</Link>
                    </div>
                  </div>

                  <div className="text-start mt-4">
                    <p className="small text-uppercase text-muted fw-bold mb-3 ls-1">Safety Tip</p>
                    <div className="d-flex gap-3 align-items-start">
                      <i className="bi bi-shield-check text-success fs-4"></i>
                      <p className="small text-muted mb-0">Never share your OTP, bank details, or passwords with anyone.</p>
                    </div>
                  </div>
                </div>
              </AccentCard>
            </div>

            {/* Middle Content: Updates Feed */}
            <div className="col-lg-6 col-md-8 mb-4">
              {/* Feed Header */}
              <div className="d-flex align-items-center justify-content-between mb-3 px-2">
                <h5 className="fw-bold text-dark mb-0">Latest Matches & Updates</h5>
                <span className="badge bg-white text-secondary border shadow-sm rounded-pill px-3">Real-time</span>
              </div>

              {/* Updates List - Chunk Style */}
              <div className="d-flex flex-column gap-3">
                {usersLoading && (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div>
                  </div>
                )}

                {!usersLoading && usersError && (
                  <div className="alert alert-danger">{usersError}</div>
                )}

                {!usersLoading && !usersError && users.length === 0 && (
                  <div className="text-center py-5 bg-white rounded-4 shadow-sm p-5 border-dashed">
                    <Image src="/leaf_left.png" width={60} height={60} alt="" className="opacity-25 mb-3" />
                    <p className="text-muted">No updates yet. Check back soon!</p>
                  </div>
                )}

                {!usersLoading && !usersError && users.length > 0 && users.map((u, i) => (
                  <div key={u?.matri_id ?? i} className="fade-in-up" style={{ animationDelay: `${i * 0.1}s` }}>
                    <UpdateCard u={u} timeAgo={timeAgo} viewerIsPremium={viewerIsPremium} />
                  </div>
                ))}
              </div>
            </div>

            {/* Right Sidebar: Stats & Carousel */}
            <div className="col-lg-3 col-md-12 mb-4">
              <AccentCard ref={rightCardRef}>
                <h6 className="text-uppercase text-secondary fw-bold small mb-3 ls-1">Activity Overview</h6>

                <div className="d-flex flex-column gap-3 mb-4">
                  {/* Received */}
                  <div className="stat-card p-3 rounded-3 bg-white border shadow-sm pointer-hover d-flex align-items-center justify-content-between" onClick={goToReceived}>
                    <div className="d-flex align-items-center gap-3">
                      <div className="icon-box bg-danger-subtle text-danger rounded-circle d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}>
                        <i className="bi bi-arrow-down-left-circle-fill fs-5"></i>
                      </div>
                      <span className="fw-semibold text-dark">Received</span>
                    </div>
                    <span className="h5 fw-bold text-dark mb-0">{statsLoading ? '-' : stats.received}</span>
                  </div>

                  {/* Accepted */}
                  <div className="stat-card p-3 rounded-3 bg-white border shadow-sm pointer-hover d-flex align-items-center justify-content-between" onClick={goToAccepted}>
                    <div className="d-flex align-items-center gap-3">
                      <div className="icon-box bg-success-subtle text-success rounded-circle d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}>
                        <i className="bi bi-check-circle-fill fs-5"></i>
                      </div>
                      <span className="fw-semibold text-dark">Accepted</span>
                    </div>
                    <span className="h5 fw-bold text-dark mb-0">{statsLoading ? '-' : stats.accepted}</span>
                  </div>

                  {/* Viewed */}
                  <div className="stat-card p-3 rounded-3 bg-white border shadow-sm pointer-hover d-flex align-items-center justify-content-between" onClick={goToViewed}>
                    <div className="d-flex align-items-center gap-3">
                      <div className="icon-box bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}>
                        <i className="bi bi-eye-fill fs-5"></i>
                      </div>
                      <span className="fw-semibold text-dark">Profile Views</span>
                    </div>
                    <span className="h5 fw-bold text-dark mb-0">{statsLoading ? '-' : stats.viewed}</span>
                  </div>
                </div>

                <hr className="bg-secondary opacity-10 my-4" />

                <h6 className="text-uppercase text-secondary fw-bold small mb-3 ls-1">Recommended for You</h6>
                <div className="recommendation-container" style={{ minHeight: 200 }}>
                  <DailyRecommendationsCarousel />
                </div>

                <div className="mt-4">
                  <ProfileCompletionBar profile={profile} loading={loading} />
                </div>
              </AccentCard>
            </div>
          </div>
        </div>
      </div>

      {showCropper && (
        <ImageCropper
          image={imageSrc}
          show={showCropper}
          onClose={() => setShowCropper(false)}
          onCropDone={handleCropDone}
        />
      )}

      <ProfilePhotoModal
        show={showPhotoModal}
        onHide={() => setShowPhotoModal(false)}
        reload={() => { fetchProfile(); fetchActiveSubscription(); }}
      />
      <SuccessModal
        show={!!successMsg}
        message={successMsg}
        onClose={() => setSuccessMsg('')}
      />


    </>
  );
}


