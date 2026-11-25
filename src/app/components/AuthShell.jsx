'use client';

import Link from 'next/link';
import Scene3D from '@/app/components/three/Scene3D';
import { Reveal } from '@/app/components/motion';
import { useSiteContent, isCustomImage } from '@/lib/site-content-client';

/**
 * Two-panel luxury layout for login / forgot / reset pages:
 * royal artwork panel on the left, form on the right, drifting 3D hearts behind.
 */
export default function AuthShell({ children, artTitle, artText }) {
  const { media } = useSiteContent();
  const custom = isCustomImage(media.auth_art);
  return (
    <div className="auth-3d d-flex align-items-center justify-content-center py-5" style={{ minHeight: 'calc(100vh - 86px)' }}>
      <Scene3D variant="ambient" />
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-11 col-lg-10 col-xl-9">
            <Reveal y={50}>
              <div className="card glass-card hub-card border-0 overflow-hidden">
                <div className="row g-0">
                  <div className="col-md-6 d-none d-md-flex auth-art-panel flex-column justify-content-between p-5">
                    <div className="mandala-deco light" style={{ width: 520, height: 520, left: -160, top: -160 }} aria-hidden="true" />
                    <Link href="/" className="brand-logo position-relative">
                      <span className="brand-mark" aria-hidden="true" />
                      <span>
                        <span className="brand-word">
                          <span className="text-white">Matri</span>
                          <span className="gold-text">Money</span>
                        </span>
                        <span className="brand-tagline" style={{ color: 'var(--gold-light)' }}>Sacred Unions</span>
                      </span>
                    </Link>

                    <div className="position-relative text-center my-4">
                      {custom ? (
                        <div className="hero-photo-arch mx-auto" style={{ width: '72%', maxWidth: 280 }}>
                          <img src={media.auth_art} alt="" />
                        </div>
                      ) : (
                        <img
                          src={media.auth_art}
                          alt=""
                          className="animate-float"
                          style={{ width: '78%', maxWidth: 300, filter: 'drop-shadow(0 30px 40px rgba(0,0,0,.5))' }}
                        />
                      )}
                    </div>

                    <div className="position-relative">
                      <span className="eyebrow light mb-2">Verified · Private · Trusted</span>
                      <h3 className="text-white mb-2" style={{ fontSize: '2rem' }}>{artTitle}</h3>
                      <p className="text-white-50 small mb-0">{artText}</p>
                    </div>
                  </div>

                  <div className="col-md-6 p-4 p-lg-5 d-flex flex-column justify-content-center" style={{ background: '#fffdf9' }}>
                    {children}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </div>
  );
}
