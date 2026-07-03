'use client';

import { Suspense, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

// Адская арена: сгенерированный задник (лава, портал, черепа) + каменный пол
// + тёплый «огненный» свет с командными синими/красными римами.
export default function Arena() {
  return (
    <group>
      <Suspense fallback={<mesh position={[0, 5.2, -6]}><planeGeometry args={[26, 14.6]} /><meshBasicMaterial color="#1a0d08" /></mesh>}>
        <Backdrop />
      </Suspense>

      {/* каменный пол в тон картинке */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 14]} />
        <meshStandardMaterial color="#3a241a" roughness={0.92} metalness={0.05} />
      </mesh>
      {/* боевая зона — тёмный круг как в центре арены */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <circleGeometry args={[5.4, 48]} />
        <meshStandardMaterial color="#221310" roughness={0.9} />
      </mesh>
      {/* огненные границы арены */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 2.5]}>
        <planeGeometry args={[11, 0.08]} />
        <meshBasicMaterial color="#ff6a00" toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -2.5]}>
        <planeGeometry args={[11, 0.08]} />
        <meshBasicMaterial color="#ff6a00" toneMapped={false} />
      </mesh>

      {/* свет: тёплое пламя + командные римы */}
      <ambientLight intensity={0.5} color="#ffb385" />
      <directionalLight
        position={[3, 8, 5]}
        intensity={1.5}
        color="#ffd9b0"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <FlickerLight position={[0, 2.5, -3.5]} color="#ff5a00" base={16} />
      <pointLight position={[-5, 3, 2]} intensity={10} color="#0a84ff" />
      <pointLight position={[5, 3, 2]} intensity={10} color="#ff2d55" />
      <fog attach="fog" args={['#1a0a05', 16, 34]} />
    </group>
  );
}

function Backdrop() {
  const tex = useTexture('/bg.webp');
  tex.colorSpace = THREE.SRGBColorSpace;
  return (
    <mesh position={[0, 4.7, -5.6]}>
      {/* 1920x1080 → соотношение 16:9 */}
      <planeGeometry args={[26, 14.6]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}

// живое пламя: мерцающий тёплый свет
function FlickerLight({ position, color, base }: { position: [number, number, number]; color: string; base: number }) {
  const ref = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      const t = clock.elapsedTime;
      ref.current.intensity = base + Math.sin(t * 9.3) * 2.4 + Math.sin(t * 23.7) * 1.6;
    }
  });
  return <pointLight ref={ref} position={position} color={color} intensity={base} />;
}
