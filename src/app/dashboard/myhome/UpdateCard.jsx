'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { resolvePhoto } from './myhome.utils';

export const AccentCard = React.forwardRef(({ children, containerStyle }, ref) => {
    return (
        <div
            ref={ref}
            className="card border-0 bg-white h-100"
            style={{
                borderRadius: 20,
                boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
                border: '1px solid rgba(0,0,0,0.04)',
                ...containerStyle,
            }}
        >
            <div className="card-body p-4 d-flex flex-column h-100">{children}</div>
        </div>
    );
});

export function UpdateCard({ u, timeAgo, viewerIsPremium }) {
    const router = useRouter();
    const [hover, setHover] = useState(false);

    // ✅ correct way to handle fallback image with next/image
    const [photoSrc, setPhotoSrc] = useState(() => resolvePhoto(u?.photo));

    const ago = timeAgo ? timeAgo(u?.created_at) : '';
    let pron = 'their';
    if (u?.gender === 'Female') pron = 'her';
    else if (u?.gender === 'Male') pron = 'his';

    const profileHref = u?.matri_id
        ? `/matrimoney/profile-details/${encodeURIComponent(u.matri_id)}`
        : null;

    const isPremiumTarget = !!u?.is_premium;
    const isConnected = u?.connection_status === 'accepted';
    const blur = !viewerIsPremium && isPremiumTarget && !isConnected;

    const goProfile = () => {
        if (profileHref) router.push(profileHref);
    };

    return (
        <AccentCard
            containerStyle={{
                cursor: profileHref ? 'pointer' : 'default',
                transform: hover ? 'translateY(-3px)' : 'none',
                transition: 'transform 0.2s',
                borderColor: hover ? 'var(--brand-primary)' : 'rgba(0,0,0,0.04)',
            }}
        >
            <div
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
                onClick={goProfile}
                className="d-flex align-items-start gap-3"
                role="button"
            >
                <div className="position-relative flex-shrink-0">
                    <Image
                        src={photoSrc}
                        alt="User"
                        width={56}
                        height={56}
                        className="rounded-circle border border-2 border-light shadow-sm"
                        style={{ objectFit: 'cover', filter: blur ? 'blur(4px)' : 'none' }}
                        onError={() => setPhotoSrc('/uploads/default.jpg')}
                    />

                    {isPremiumTarget && (
                        <span
                            className="position-absolute border border-white bg-primary text-white rounded-circle d-flex align-items-center justify-content-center"
                            style={{ width: 20, height: 20, top: 0, right: -4, fontSize: 10 }}
                        >
                            <i className="bi bi-star-fill"></i>
                        </span>
                    )}
                </div>

                <div className="flex-grow-1">
                    <div className="d-flex justify-content-between mb-1">
                        <h6 className="mb-0 fw-bold text-maroon">
                            {u?.first_name || 'Member'}{' '}
                            <span className="text-secondary fw-normal small">[{u?.matri_id}]</span>
                        </h6>
                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                            {ago}
                        </span>
                    </div>

                    <p className="mb-2 small text-dark opacity-75 line-clamp-2">
                        New match for your preferences! {u?.first_name} has recently updated {pron} profile photo.
                    </p>

                    {/* ✅ stop navigation when clicking buttons */}
                    <div className="d-flex gap-2" onClick={(e) => e.stopPropagation()}>
                        {!blur ? (
                            <>
                                {isConnected ? (
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-success py-1 px-3 rounded-pill fw-bold"
                                        style={{ fontSize: '0.75rem', backgroundColor: '#4CAF50', borderColor: '#4CAF50' }}
                                    >
                                        <i className="bi bi-people-fill me-1"></i> Friend
                                    </button>
                                ) : (
                                    <button type="button" className="btn btn-sm btn-primary py-1 px-3 rounded-pill fw-bold" style={{ fontSize: '0.75rem' }}>
                                        Connect
                                    </button>
                                )}

                                <button type="button" className="btn btn-sm btn-outline-secondary py-1 px-3 rounded-pill fw-bold bg-light border-0 text-dark" style={{ fontSize: '0.75rem' }}>
                                    View Profile
                                </button>
                            </>
                        ) : (
                            <Link href="/matrimoney/package" className="btn btn-sm btn-warning text-white py-1 px-3 rounded-pill fw-bold shadow-sm" style={{ fontSize: '0.75rem' }}>
                                Upgrade to View
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </AccentCard>
    );
}

UpdateCard.displayName = 'UpdateCard';
AccentCard.displayName = 'AccentCard';
