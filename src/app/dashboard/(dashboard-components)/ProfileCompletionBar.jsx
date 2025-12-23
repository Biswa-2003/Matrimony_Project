'use client';

import React, { useMemo } from 'react';
import { computeProfileCompletion } from '@/lib/profileCompletion';

export default function ProfileCompletionBar({ profile, loading = false }) {
  const { percent, missing } = useMemo(
    () => computeProfileCompletion(profile || {}),
    [profile]
  );

  const barClass =
    percent < 40 ? 'bg-danger' : percent < 70 ? 'bg-warning' : 'bg-success';

  return (
    <div className="text-start mt-4">
      <p className="mb-1 fw-semibold">
        Profile Completion{' '}
        <span className="text-muted">
          ({loading ? '…' : `${percent}%`})
        </span>
      </p>

      <div
        className="progress"
        style={{ height: '20px' }}
        title={
          loading
            ? 'Loading…'
            : missing.length
            ? `Missing: ${missing.join(', ')}`
            : 'All set!'
        }
      >
        <div
          className={`progress-bar ${barClass}`}
          role="progressbar"
          style={{ width: loading ? '0%' : `${percent}%` }}
          aria-valuenow={loading ? 0 : percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {loading ? '...' : `${percent}%`}
        </div>
      </div>

      {!loading && missing.length > 0 && (
        <small className="text-muted d-block mt-1">
          Missing: {missing.slice(0, 6).join(', ')}
          {missing.length > 6 ? '…' : ''}
        </small>
      )}
    </div>
  );
}
