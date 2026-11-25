'use client';

/**
 * LoveScene — the real-time WebGL scene used behind the hero and auth pages.
 *
 * Variants
 *  - "hero":    interlocked gold wedding rings with a diamond, orbiting glossy hearts, sparkles.
 *  - "ambient": softer field of drifting hearts + sparkles (for backgrounds behind forms).
 *
 * Lighting uses local Lightformers (no HDR download), so it works offline and on Vercel.
 */

import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Float, Lightformer, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

/* ---------- Geometry helpers ---------- */

function useHeartGeometry() {
  return useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(5, 5);
    s.bezierCurveTo(5, 5, 4, 0, 0, 0);
    s.bezierCurveTo(-6, 0, -6, 7, -6, 7);
    s.bezierCurveTo(-6, 11, -3, 15.4, 5, 19);
    s.bezierCurveTo(12, 15.4, 16, 11, 16, 7);
    s.bezierCurveTo(16, 7, 16, 0, 10, 0);
    s.bezierCurveTo(7, 0, 5, 5, 5, 5);

    const g = new THREE.ExtrudeGeometry(s, {
      depth: 4,
      bevelEnabled: true,
      bevelSegments: 8,
      steps: 1,
      bevelSize: 1.6,
      bevelThickness: 1.6,
      curveSegments: 32,
    });
    g.center();
    g.rotateZ(Math.PI); // point downwards
    g.scale(0.045, 0.045, 0.045);
    return g;
  }, []);
}

/* ---------- Meshes ---------- */

function Heart({ geometry, color = '#a3123a', ...props }) {
  const ref = useRef();
  const speed = useMemo(() => 0.3 + Math.random() * 0.5, []);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * speed;
  });
  return (
    <mesh ref={ref} geometry={geometry} {...props}>
      <meshPhysicalMaterial
        color={color}
        roughness={isGold(color) ? 0.22 : 0.12}
        metalness={isGold(color) ? 1 : 0.15}
        clearcoat={1}
        clearcoatRoughness={0.06}
        sheen={isGold(color) ? 0 : 0.6}
        sheenColor="#ffd9a8"
      />
    </mesh>
  );
}

function WeddingRings() {
  const group = useRef();
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (group.current) {
      group.current.rotation.y = t * 0.35;
      group.current.rotation.x = Math.sin(t * 0.5) * 0.15 + 0.25;
    }
  });

  const gold = (
    <meshStandardMaterial color="#f5c76b" metalness={1} roughness={0.18} envMapIntensity={1.4} />
  );
  const roseGold = (
    <meshStandardMaterial color="#f2a7a0" metalness={1} roughness={0.2} envMapIntensity={1.4} />
  );

  return (
    <group ref={group}>
      {/* Ring 1 with diamond */}
      <group position={[-0.42, 0, 0]} rotation={[0, 0.5, 0]}>
        <mesh>
          <torusGeometry args={[0.85, 0.11, 48, 128]} />
          {gold}
        </mesh>
        <mesh position={[0, 0.98, 0]}>
          <octahedronGeometry args={[0.2, 0]} />
          <meshPhysicalMaterial
            color="#ffffff"
            roughness={0}
            metalness={0}
            transmission={1}
            thickness={0.6}
            ior={2.4}
            clearcoat={1}
          />
        </mesh>
      </group>
      {/* Ring 2 interlocked */}
      <group position={[0.42, 0, 0]} rotation={[Math.PI / 2, 0.5, 0]}>
        <mesh>
          <torusGeometry args={[0.85, 0.1, 48, 128]} />
          {roseGold}
        </mesh>
      </group>
    </group>
  );
}

/** Tilts the whole scene gently toward the mouse for a parallax feel. */
function MouseParallax({ children, strength = 0.35 }) {
  const ref = useRef();
  useFrame((state) => {
    if (!ref.current) return;
    const { x, y } = state.pointer;
    ref.current.rotation.y = THREE.MathUtils.lerp(ref.current.rotation.y, x * strength, 0.05);
    ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, -y * strength * 0.6, 0.05);
  });
  return <group ref={ref}>{children}</group>;
}

// Ruby, maroon and antique-gold hearts to match the royal palette
const HEART_COLORS = ['#a3123a', '#c9a24a', '#7a1530', '#c0183f', '#e8cf8e'];
const isGold = (c) => c === '#c9a24a' || c === '#e8cf8e';

function HeartField({ count, spread, geometry, minScale = 0.6, maxScale = 1.3, depth = -0.5, ySpread = 0.9 }) {
  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + 0.4;
        const r = spread * (0.8 + Math.random() * 0.25);
        return {
          position: [Math.cos(angle) * r, Math.sin(angle) * r * ySpread, depth - Math.random() * 1.2],
          rotation: [Math.random() * 0.6, Math.random() * Math.PI, Math.random() * 0.6],
          scale: minScale + Math.random() * (maxScale - minScale),
          color: HEART_COLORS[i % HEART_COLORS.length],
          floatSpeed: 1 + Math.random() * 1.5,
        };
      }),
    [count, spread, minScale, maxScale, depth, ySpread]
  );

  return items.map((h, i) => (
    <Float key={i} speed={h.floatSpeed} rotationIntensity={0.8} floatIntensity={1.2}>
      <Heart geometry={geometry} position={h.position} rotation={h.rotation} scale={h.scale} color={h.color} />
    </Float>
  ));
}

/**
 * Hero composition: orbits the 3D objects around the illustration in the right-hand column
 * (or the centre on narrow screens) so nothing covers the artwork or gets clipped.
 */
function HeroComposition({ heart }) {
  const { viewport } = useThree();
  const wide = viewport.aspect > 1.2;
  const cx = wide ? viewport.width * 0.23 : 0;
  const orbit = wide ? Math.min(viewport.height * 0.42, 2.6) : 2.2;
  return (
    <group position={[cx, 0, 0]}>
      <group position={[orbit * 0.98, orbit * 0.72, -0.2]} scale={0.3}>
        <Float speed={1.4} rotationIntensity={0.4} floatIntensity={0.8}>
          <WeddingRings />
        </Float>
      </group>
      <HeartField count={6} spread={orbit} geometry={heart} minScale={0.32} maxScale={0.55} depth={-0.6} ySpread={0.85} />
      <Sparkles count={90} scale={[orbit * 3, orbit * 2.4, 3]} size={3} speed={0.35} color="#f3dc9b" />
    </group>
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 6, 5]} intensity={2.2} color="#fff4e6" />
      <pointLight position={[-4, -2, 3]} intensity={28} color="#ffb347" />
      <Environment resolution={256}>
        <group rotation={[-Math.PI / 3, 0, 1]}>
          <Lightformer form="circle" intensity={4} position={[0, 5, -9]} scale={2} />
          <Lightformer form="circle" intensity={2} rotation-y={Math.PI / 2} position={[-5, 1, -1]} scale={2} />
          <Lightformer form="ring" color="#ffd27a" intensity={6} rotation-y={Math.PI / 2} position={[-5, -1, -1]} scale={3} />
          <Lightformer form="rect" intensity={2} rotation-y={-Math.PI / 2} position={[10, 1, 0]} scale={[10, 2, 1]} />
        </group>
      </Environment>
    </>
  );
}

export default function LoveScene({ variant = 'hero', paused = false }) {
  const heart = useHeartGeometry();
  const isHero = variant === 'hero';

  return (
    <Canvas
      dpr={[1, 1.75]}
      frameloop={paused ? 'never' : 'always'}
      camera={{ position: [0, 0, isHero ? 5.2 : 7], fov: 45 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ background: 'transparent' }}
    >
      <Lights />
      <MouseParallax strength={isHero ? 0.18 : 0.2}>
        {isHero ? (
          <HeroComposition heart={heart} />
        ) : (
          <>
            <HeartField count={12} spread={5} geometry={heart} minScale={0.5} maxScale={1.2} />
            <Sparkles count={90} scale={[12, 8, 4]} size={2.5} speed={0.3} color="#c9a24a" />
          </>
        )}
      </MouseParallax>
    </Canvas>
  );
}
