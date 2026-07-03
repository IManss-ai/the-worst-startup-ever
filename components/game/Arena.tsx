'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Арена: пол «переговорки», неоновая подсветка, толпа из безликих фаундеров.
export default function Arena() {
  return (
    <group>
      {/* пол */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 14]} />
        <meshStandardMaterial color="#141018" roughness={0.85} metalness={0.2} />
      </mesh>
      {/* «ковёр» боевой зоны */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[11, 5]} />
        <meshStandardMaterial color="#1e1520" roughness={0.9} />
      </mesh>
      {/* неоновые линии границ арены */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 2.5]}>
        <planeGeometry args={[11, 0.08]} />
        <meshBasicMaterial color="#ff2d55" toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -2.5]}>
        <planeGeometry args={[11, 0.08]} />
        <meshBasicMaterial color="#ff2d55" toneMapped={false} />
      </mesh>

      {/* задник: стена офиса с «окнами» */}
      <mesh position={[0, 3.5, -6]}>
        <planeGeometry args={[30, 8]} />
        <meshStandardMaterial color="#0b0910" roughness={1} />
      </mesh>
      {Array.from({ length: 7 }).map((_, i) => (
        <mesh key={i} position={[(i - 3) * 3.4, 3.6, -5.95]}>
          <planeGeometry args={[1.8, 2.6]} />
          <meshBasicMaterial color="#2a1f3d" toneMapped={false} />
        </mesh>
      ))}

      {/* толпа безликих фаундеров */}
      <Crowd />

      {/* свет */}
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[4, 8, 5]}
        intensity={1.6}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-5, 3, 2]} intensity={12} color="#ff2d55" />
      <pointLight position={[5, 3, 2]} intensity={12} color="#0a84ff" />
      <fog attach="fog" args={['#0b0910', 14, 30]} />
    </group>
  );
}

function Crowd() {
  const group = useRef<THREE.Group>(null);
  const seats = useRef(
    Array.from({ length: 14 }).map((_, i) => ({
      x: (i - 6.5) * 1.1 + (i % 3) * 0.2,
      z: -3.8 - (i % 2) * 0.9,
      phase: (i * 137.5) % (Math.PI * 2),
      hue: (i * 47) % 360,
    })),
  );

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    g.children.forEach((child, i) => {
      const seat = seats.current[i];
      if (seat) child.position.y = 0.55 + Math.abs(Math.sin(clock.elapsedTime * 4 + seat.phase)) * 0.12;
    });
  });

  return (
    <group ref={group}>
      {seats.current.map((s, i) => (
        <group key={i} position={[s.x, 0.55, s.z]}>
          <mesh castShadow>
            <capsuleGeometry args={[0.2, 0.5, 4, 8]} />
            <meshStandardMaterial color={`hsl(${s.hue}, 25%, 30%)`} roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.55, 0]}>
            <sphereGeometry args={[0.16, 12, 12]} />
            <meshStandardMaterial color="#8f7a66" roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
