'use client';

// 3D-дуэль для hero-секции лендинга: два реальных ментора медленно «дышат»
// друг напротив друга. Лёгкая сцена: без теней, dpr капнут, грузится лениво.
// Использование: const HeroDuel = dynamic(() => import('@/components/game/HeroDuel'), { ssr: false })

import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const LEFT_ID = 'arman';
const RIGHT_ID = 'dauren';
const HEIGHT = 1.75;

function Statue({ id, x, yaw, phase }: { id: string; x: number; yaw: number; phase: number }) {
  const group = useRef<THREE.Group>(null);
  const { scene } = useGLTF(`/models/${id}.glb`);

  const cloned = useMemo(() => {
    const c = scene.clone(true);
    const box = new THREE.Box3().setFromObject(c);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const scale = size.y > 0 ? HEIGHT / size.y : 1;
    c.scale.setScalar(scale);
    c.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
    return c;
  }, [scene]);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime + phase;
    g.position.y = Math.sin(t * 1.8) * 0.03;
    g.rotation.y = yaw + Math.sin(t * 0.7) * 0.06;
    // редкий агрессивный рывок вперёд
    const cycle = t % 6;
    if (cycle < 0.4) {
      g.position.x = x + Math.sin((cycle / 0.4) * Math.PI) * 0.18 * -Math.sign(x);
    } else {
      g.position.x = x;
    }
  });

  return (
    <group ref={group} position={[x, 0, 0]} rotation={[0, yaw, 0]}>
      <primitive object={cloned} />
    </group>
  );
}

function Placeholder({ x, color }: { x: number; color: string }) {
  return (
    <group position={[x, 0, 0]}>
      <mesh position={[0, 0.75, 0]}>
        <capsuleGeometry args={[0.3, 0.85, 8, 16]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.6, 0]}>
        <sphereGeometry args={[0.25, 20, 20]} />
        <meshStandardMaterial color="#e8c39e" roughness={0.6} />
      </mesh>
    </group>
  );
}

export default function HeroDuel({ className }: { className?: string }) {
  return (
    <div className={className} style={{ minHeight: 280 }}>
      <Canvas camera={{ position: [0, 1.5, 4.6], fov: 40 }} dpr={[1, 1.5]} gl={{ alpha: true, antialias: true }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 5, 4]} intensity={1.4} />
        <pointLight position={[-4, 2, 2]} intensity={10} color="#0a84ff" />
        <pointLight position={[4, 2, 2]} intensity={10} color="#ff2d55" />
        <Suspense fallback={<Placeholder x={-1.1} color="#0a84ff" />}>
          <Statue id={LEFT_ID} x={-1.1} yaw={Math.PI / 2.4} phase={0} />
        </Suspense>
        <Suspense fallback={<Placeholder x={1.1} color="#ff2d55" />}>
          <Statue id={RIGHT_ID} x={1.1} yaw={-Math.PI / 2.4} phase={2.4} />
        </Suspense>
        {/* пол-отражение намёком */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <circleGeometry args={[3.4, 40]} />
          <meshBasicMaterial color="#120d16" transparent opacity={0.85} />
        </mesh>
        <PerFrameLookAt />
      </Canvas>
    </div>
  );
}

function PerFrameLookAt() {
  useFrame(({ camera }) => {
    camera.lookAt(0, 1.1, 0);
  });
  return null;
}
