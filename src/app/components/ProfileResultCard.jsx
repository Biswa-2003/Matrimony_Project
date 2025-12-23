"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ProfileResultCard({ p }) {
    const router = useRouter();
    const [hover, setHover] = useState(false);

    // Avatar fallback if no photo is present (similar to ShortlistPage logic)
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        p.name || 'User'
    )}&background=random&color=fff&size=128`;

    const photoSrc = p.photo || p.photo_url || avatarUrl;

    // Extract critical minimal info for the compact card
    const ageVal = p.details?.Age !== '—' ? `${p.details.Age} yrs` : 'Age N/A';
    // Attempt to find city or state from Location string "City, State, Country"
    const locParts = (p.details?.Location || '').split(',');
    const cityOrState = locParts[0]?.trim() || 'Location N/A';

    return (
        <div
            className="card bg-white border rounded-4 position-relative d-flex flex-column"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                transform: hover ? 'translateY(-4px)' : 'none',
                boxShadow: hover
                    ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                    : '0 4px 6px -1px rgba(0, 0, 0, 0.01), 0 2px 4px -1px rgba(0, 0, 0, 0.01)',
                borderColor: hover ? '#cbd5e0' : '#edf2f7',
                overflow: 'hidden',
                height: '100%' // fill grid cell
            }}
        >
            <div className="card-body d-flex flex-column gap-3 p-4">
                <div className="d-flex align-items-start gap-3">
                    {/* Circular Avatar */}
                    <div
                        className="flex-shrink-0 position-relative"
                        style={{ width: 80, height: 80 }}
                    >
                        <img
                            src={photoSrc}
                            alt={p.name}
                            className="rounded-circle border border-3 border-white shadow-sm"
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                backgroundColor: '#f8fafc'
                            }}
                            onError={(e) => { e.currentTarget.src = avatarUrl; }}
                        />
                    </div>

                    {/* Info Side */}
                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                        <div className="d-flex justify-content-between align-items-center mb-1">
                            <h5 className="mb-0 fw-bold text-dark text-truncate" style={{ fontSize: '1.1rem' }}>
                                {p.name}
                            </h5>
                            {p.status && (
                                <span className={`badge rounded-pill px-2 py-1 ms-2 flex-shrink-0 ${p.status === 'Accepted' || p.status === 'Connected'
                                        ? 'bg-success text-white'
                                        : 'bg-danger-subtle text-danger'
                                    }`} style={{ fontSize: '0.7rem' }}>
                                    {p.status}
                                </span>
                            )}
                        </div>

                        <span className="d-block text-secondary small mb-2">{p.matriId}</span>

                        {/* Chips */}
                        <div className="d-flex flex-wrap gap-2">
                            <span className="badge bg-light text-secondary border fw-normal">
                                {ageVal}
                            </span>
                            {/* Only show location if it's not empty or placeholder */}
                            {cityOrState !== '—' && cityOrState !== 'Location N/A' && (
                                <span className="badge bg-light text-secondary border fw-normal">
                                    {cityOrState}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Action */}
            <div className="mt-auto border-top p-3 bg-light bg-opacity-10">
                <Link
                    href={p.profileUrl}
                    className="btn btn-primary w-100 rounded-3 fw-semibold text-white border-0 shadow-sm"
                >
                    View Full Profile
                </Link>
            </div>
        </div>
    );
}
