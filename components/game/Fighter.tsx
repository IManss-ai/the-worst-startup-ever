'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import type { Mentor } from '@/lib/mentors';
import type { FighterSim, FighterAnimState } from './engine';

interface FighterProps {
  mentor: Mentor;
  simRef: React.RefObject<FighterSim>;
  hasModel: boolean;
}

// Сопоставляем стейт движка с клипами GLB по эвристике имён
const CLIP_HINTS: Record<FighterAnimState, string[]> = {
  idle: ['idle', 'stand', 'breathing'],
  walk: ['walk', 'run', 'move'],
  punch: ['punch', 'jab', 'attack'],
  kick: ['kick'],
  special: ['special', 'spell', 'cast', 'attack2', 'punch'],
  hit: ['hit', 'impact', 'damage'],
  ko: ['death', 'die', 'defeat', 'ko'],
  win: ['victory', 'win', 'dance', 'idle'],
};

function findClip(names: string[], state: FighterAnimState): string | null {
  const lower = names.map((n) => n.toLowerCase());
  for (const hint of CLIP_HINTS[state]) {
    const i = lower.findIndex((n) => n.includes(hint));
    if (i >= 0) return names[i];
  }
  return null;
}

// Процедурная «игра актёра» поверх любого меша: наклоны, выпады, падение при KO.
// Работает и для риггед-модели (доп. соус), и для плейсхолдера (единственный соус).
function useProceduralPose(
  group: React.RefObject<THREE.Group | null>,
  simRef: React.RefObject<FighterSim>,
) {
  useFrame((frameState) => {
    const g = group.current;
    const sim = simRef.current;
    if (!g || !sim) return;
    const t = frameState.clock.elapsedTime;

    g.position.x = sim.x;
    g.rotation.y = sim.facing === 1 ? Math.PI / 2 : -Math.PI / 2;

    let lean = 0; // наклон в сторону противника (атака) или от него (получил удар)
    let y = 0;
    let fall = 0;

    switch (sim.state) {
      case 'idle':
        y = Math.sin(t * 3) * 0.03;
        break;
      case 'walk':
        y = Math.abs(Math.sin(t * 8)) * 0.06;
        break;
      case 'punch':
        lean = 0.35;
        break;
      case 'kick':
        lean = 0.5;
        break;
      case 'special':
        lean = 0.7;
        y = Math.sin(Math.min(sim.stateT * 6, Math.PI)) * 0.5;
        break;
      case 'hit':
        lean = -0.4;
        break;
      case 'ko':
        fall = Math.min(sim.stateT * 2.5, 1);
        break;
      case 'win':
        y = Math.abs(Math.sin(t * 5)) * 0.25;
        break;
    }

    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, -fall * (Math.PI / 2), 0.25);
    g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, -lean * sim.facing, 0.35);
    g.position.y = THREE.MathUtils.lerp(g.position.y, y - fall * 0.4, 0.3);
  });
}

function RiggedFighter({ mentor, simRef }: { mentor: Mentor; simRef: React.RefObject<FighterSim> }) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(`/models/${mentor.id}.glb`);
  const cloned = useMemo(() => SkeletonUtils.clone(scene) as THREE.Group, [scene]);
  const { actions, names } = useAnimations(animations, group);
  const lastState = useRef<FighterAnimState | null>(null);

  // нормализуем размер модели к ~1.8м
  useMemo(() => {
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    box.getSize(size);
    const scale = size.y > 0 ? 1.8 / size.y : 1;
    cloned.scale.setScalar(scale);
    cloned.position.y = 0;
  }, [cloned]);

  useFrame(() => {
    const sim = simRef.current;
    if (!sim || sim.state === lastState.current) return;
    lastState.current = sim.state;
    const clip = findClip(names, sim.state);
    if (clip && actions[clip]) {
      Object.values(actions).forEach((a) => a?.fadeOut(0.15));
      const action = actions[clip]!;
      action.reset().fadeIn(0.1);
      if (sim.state === 'ko') {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      } else {
        action.setLoop(THREE.LoopRepeat, Infinity);
      }
      action.play();
    }
  });

  useProceduralPose(group, simRef);

  return (
    <group ref={group}>
      <primitive object={cloned} />
    </group>
  );
}

// Плейсхолдер, пока не подложили GLB: капсула + голова в цвете ментора.
function PlaceholderFighter({ mentor, simRef }: { mentor: Mentor; simRef: React.RefObject<FighterSim> }) {
  const group = useRef<THREE.Group>(null);
  useProceduralPose(group, simRef);
  return (
    <group ref={group}>
      <mesh position={[0, 0.75, 0]} castShadow>
        <capsuleGeometry args={[0.32, 0.85, 8, 16]} />
        <meshStandardMaterial color={mentor.color} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.62, 0]} castShadow>
        <sphereGeometry args={[0.26, 24, 24]} />
        <meshStandardMaterial color="#e8c39e" roughness={0.6} />
      </mesh>
      {/* бейдж ментора вместо лица */}
      <mesh position={[0, 0.95, 0.3]}>
        <boxGeometry args={[0.28, 0.18, 0.02]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
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
      <RiggedFighter mentor={mentor} simRef={simRef} />
    </ModelErrorBoundary>
  );
}

// Мини error boundary: битый GLB не должен ронять всю сцену на питче.
import { Component, type ReactNode } from 'react';

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
