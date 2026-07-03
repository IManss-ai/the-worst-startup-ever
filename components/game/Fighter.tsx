'use client';

import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { Mentor } from '@/lib/mentors';
import type { FighterSim } from './engine';

interface FighterProps {
  mentor: Mentor;
  simRef: React.RefObject<FighterSim>;
  hasModel: boolean;
}

const HEIGHT = 1.75; // метры

// Модели — статичные фотосканы без рига, поэтому вся «игра актёра» процедурная.
// Иерархия: root (позиция по X + разворот к врагу) → body (выпады, наклоны, тряска).
function useProceduralPose(
  root: React.RefObject<THREE.Group | null>,
  body: React.RefObject<THREE.Group | null>,
  simRef: React.RefObject<FighterSim>,
  tintTargets: React.RefObject<THREE.MeshStandardMaterial[]>,
) {
  const hitFlash = useRef(0);
  const prevState = useRef<string>('idle');

  useFrame((frame, dt) => {
    const r = root.current;
    const b = body.current;
    const sim = simRef.current;
    if (!r || !b || !sim) return;
    const t = frame.clock.elapsedTime;

    if (sim.state === 'hit' && prevState.current !== 'hit') hitFlash.current = 1;
    prevState.current = sim.state;

    // корень: позиция и разворот к противнику
    r.position.x = sim.x;
    const targetYaw = sim.facing === 1 ? Math.PI / 2 : -Math.PI / 2;
    r.rotation.y = THREE.MathUtils.lerp(r.rotation.y, targetYaw, Math.min(1, dt * 14));

    // тело: целевые смещения по состоянию
    let lunge = 0; // выпад вперёд (в сторону врага)
    let lean = 0; // наклон корпуса вперёд(+)/назад(-)
    let y = 0;
    let fall = 0;
    let spin = 0;
    let squash = 1;

    switch (sim.state) {
      case 'idle':
        y = Math.sin(t * 2.6) * 0.025;
        lean = Math.sin(t * 2.6 + 1) * 0.03;
        break;
      case 'walk':
        y = Math.abs(Math.sin(t * 9)) * 0.07;
        lean = 0.08;
        b.rotation.y = Math.sin(t * 9) * 0.08;
        break;
      case 'punch': {
        // windup назад → резкий выпад → возврат
        const p = Math.min(sim.stateT / 0.42, 1);
        lunge = p < 0.25 ? -0.12 : Math.sin(Math.min((p - 0.25) / 0.5, 1) * Math.PI) * 0.45;
        lean = p < 0.25 ? -0.1 : 0.32;
        squash = 1 - Math.sin(p * Math.PI) * 0.05;
        break;
      }
      case 'kick': {
        const p = Math.min(sim.stateT / 0.66, 1);
        lunge = p < 0.35 ? -0.18 : Math.sin(Math.min((p - 0.35) / 0.45, 1) * Math.PI) * 0.65;
        lean = p < 0.35 ? -0.22 : 0.45;
        y = p >= 0.35 ? Math.sin(Math.min((p - 0.35) / 0.45, 1) * Math.PI) * 0.18 : 0;
        break;
      }
      case 'special': {
        // прыжок с полным оборотом — «брейнрот-торнадо»
        const p = Math.min(sim.stateT / 1.07, 1);
        y = Math.sin(p * Math.PI) * 0.9;
        spin = p * Math.PI * 2;
        lunge = Math.sin(p * Math.PI) * 0.7;
        squash = 1 + Math.sin(p * Math.PI) * 0.08;
        break;
      }
      case 'hit': {
        lunge = -0.3;
        lean = -0.28;
        // дрожь от удара
        b.position.z = (Math.random() - 0.5) * 0.06;
        break;
      }
      case 'ko': {
        fall = Math.min(sim.stateT * 2.2, 1);
        // отскок при падении
        const bounce = Math.max(0, Math.sin(Math.min(sim.stateT * 2.2, 1) * Math.PI * 2)) * 0.12;
        y = -0.1 * fall + bounce * (1 - fall);
        break;
      }
      case 'win':
        y = Math.abs(Math.sin(t * 6)) * 0.28;
        spin = Math.sin(t * 3) * 0.15;
        break;
    }

    const k = Math.min(1, dt * 16);
    b.position.x = THREE.MathUtils.lerp(b.position.x, lunge, k); // локальный X = «вперёд» после yaw
    b.position.y = THREE.MathUtils.lerp(b.position.y, y, k);
    b.rotation.z = THREE.MathUtils.lerp(b.rotation.z, -lean, k);
    b.rotation.y = sim.state === 'special' ? spin : THREE.MathUtils.lerp(b.rotation.y, spin, k);
    // KO: заваливается назад
    b.rotation.x = THREE.MathUtils.lerp(b.rotation.x, fall * (Math.PI / 2) * 0.96, Math.min(1, dt * 6));
    const s = THREE.MathUtils.lerp(b.scale.y, squash, k);
    b.scale.set(2 - s, s, 2 - s > 1.05 ? 1.05 : 2 - s);

    // красная вспышка при получении удара
    if (hitFlash.current > 0) {
      hitFlash.current = Math.max(0, hitFlash.current - dt * 4);
      const f = hitFlash.current;
      for (const m of tintTargets.current ?? []) {
        m.color.setRGB(1, 1 - f * 0.75, 1 - f * 0.75);
      }
    }
  });
}

function ScanFighter({ mentor, simRef }: { mentor: Mentor; simRef: React.RefObject<FighterSim> }) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const tintTargets = useRef<THREE.MeshStandardMaterial[]>([]);
  const { scene } = useGLTF(`/models/${mentor.id}.glb`);

  // клонируем и нормализуем: рост HEIGHT, ноги на y=0, центр по X/Z
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

    const mats: THREE.MeshStandardMaterial[] = [];
    c.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        const src = o.material as THREE.MeshStandardMaterial;
        const m = src.clone(); // не шарим материал между двумя бойцами одного ментора
        o.material = m;
        if (m instanceof THREE.MeshStandardMaterial) mats.push(m);
      }
    });
    tintTargets.current = mats;
    return c;
  }, [scene]);

  useProceduralPose(root, body, simRef, tintTargets);

  return (
    <group ref={root}>
      <group ref={body}>
        <primitive object={cloned} />
      </group>
    </group>
  );
}

// Плейсхолдер: пока модель грузится или отсутствует.
function PlaceholderFighter({ mentor, simRef }: { mentor: Mentor; simRef: React.RefObject<FighterSim> }) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const empty = useRef<THREE.MeshStandardMaterial[]>([]);
  useProceduralPose(root, body, simRef, empty);
  return (
    <group ref={root}>
      <group ref={body}>
        <mesh position={[0, 0.75, 0]} castShadow>
          <capsuleGeometry args={[0.32, 0.85, 8, 16]} />
          <meshStandardMaterial color={mentor.color} roughness={0.4} />
        </mesh>
        <mesh position={[0, 1.62, 0]} castShadow>
          <sphereGeometry args={[0.26, 24, 24]} />
          <meshStandardMaterial color="#e8c39e" roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
}

export default function Fighter({ mentor, simRef, hasModel }: FighterProps) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [mentor.id]);

  if (!hasModel || failed) {
    return <PlaceholderFighter mentor={mentor} simRef={simRef} />;
  }
  return (
    <ModelErrorBoundary onError={() => setFailed(true)} fallback={<PlaceholderFighter mentor={mentor} simRef={simRef} />}>
      <Suspense fallback={<PlaceholderFighter mentor={mentor} simRef={simRef} />}>
        <ScanFighter mentor={mentor} simRef={simRef} />
      </Suspense>
    </ModelErrorBoundary>
  );
}

// Битый GLB не должен ронять сцену на питче.
class ModelErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; onError: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
