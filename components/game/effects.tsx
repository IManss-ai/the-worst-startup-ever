'use client';

// Джус: тряска камеры, искры при попадании, всплывающий урон, динамическое кадрирование.
// Шина — модульные мутабельные структуры: события пишет FightScreen, читают R3F-компоненты.

import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useRef, useState } from 'react';
import * as THREE from 'three';
import type { FighterSim } from './engine';
import { useHud } from './store';

interface SparkBurst {
  x: number;
  y: number;
  color: string;
  power: number;
}

interface Popup {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  born: number;
}

let popupId = 0;

export const fxBus = {
  shake: 0,
  bursts: [] as SparkBurst[],
  popups: [] as Popup[],
  hitStop: 0, // короткая заморозка кадра при жирном ударе
};

export function fxHit(x: number, damage: number, kind: string) {
  fxBus.shake = Math.min(1, fxBus.shake + damage / 28);
  fxBus.bursts.push({ x, y: 1.2, color: kind === 'special' ? '#ffd60a' : '#ff2d55', power: damage / 10 });
  fxBus.popups.push({
    id: popupId++,
    x,
    y: 2.0,
    text: `-${damage}`,
    color: kind === 'special' ? '#ffd60a' : '#ffffff',
    born: performance.now(),
  });
  if (damage >= 13) fxBus.hitStop = damage >= 20 ? 0.12 : 0.06;
}

export function fxKO(x: number) {
  fxBus.shake = 1.4;
  fxBus.bursts.push({ x, y: 1.0, color: '#ff2d55', power: 3 });
  fxBus.hitStop = 0.25;
}

// ---------- Камера: следит за серединой боя, зумит по дистанции, трясётся ----------

export function CameraRig({
  simA,
  simB,
}: {
  simA: React.RefObject<FighterSim>;
  simB: React.RefObject<FighterSim>;
}) {
  const { camera } = useThree();
  const look = useRef(new THREE.Vector3(0, 1.35, 0));

  useFrame((_, dt) => {
    const a = simA.current;
    const b = simB.current;
    const phase = useHud.getState().phase;

    let targetX: number;
    let targetY = 2.1;
    let targetZ: number;
    let lookY = 1.35;
    let k = Math.min(1, dt * 3.5);

    if (phase === 'fatality' || phase === 'matchEnd') {
      // медленный наезд на победителя (тот, кто не в нокауте)
      const winner = a.state === 'ko' ? b : a;
      targetX = winner.x * 0.9;
      targetY = 1.55;
      targetZ = 2.9;
      lookY = 1.25;
      k = Math.min(1, dt * 1.6); // кинематографично, не рывком
      look.current.x = THREE.MathUtils.lerp(look.current.x, winner.x, k);
    } else {
      const mid = (a.x + b.x) / 2;
      const dist = Math.abs(a.x - b.x);
      targetX = THREE.MathUtils.clamp(mid * 0.6, -2, 2);
      targetZ = 4.1 + Math.min(dist * 0.5, 2.4);
      look.current.x = THREE.MathUtils.lerp(look.current.x, targetX, k);
    }

    fxBus.shake = Math.max(0, fxBus.shake - dt * 3);
    const s = fxBus.shake * 0.12;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, k) + (Math.random() - 0.5) * s;
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, k) + (Math.random() - 0.5) * s;
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, k);
    look.current.y = lookY;
    look.current.z = 0;
    camera.lookAt(look.current);
  });
  return null;
}

// ---------- Искры ----------

const MAX_PARTICLES = 160;

interface Particle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  color: THREE.Color;
}

export function Sparks() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const particles = useRef<Particle[]>([]);
  const dummy = useRef(new THREE.Object3D());

  useFrame((_, dt) => {
    const im = mesh.current;
    if (!im) return;

    // забираем новые вспышки из шины
    while (fxBus.bursts.length) {
      const burst = fxBus.bursts.pop()!;
      const n = Math.min(8 + Math.round(burst.power * 6), 24);
      for (let i = 0; i < n && particles.current.length < MAX_PARTICLES; i++) {
        const angle = Math.random() * Math.PI * 2;
        const up = 1.5 + Math.random() * 2.5 * burst.power;
        particles.current.push({
          pos: new THREE.Vector3(burst.x, burst.y + (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4),
          vel: new THREE.Vector3(Math.cos(angle) * (1 + Math.random() * 2), up, Math.sin(angle) * (1 + Math.random() * 2)),
          life: 0,
          maxLife: 0.35 + Math.random() * 0.3,
          color: new THREE.Color(burst.color),
        });
      }
    }

    // тик частиц
    particles.current = particles.current.filter((p) => {
      p.life += dt;
      if (p.life >= p.maxLife) return false;
      p.vel.y -= 9.8 * dt;
      p.pos.addScaledVector(p.vel, dt);
      return true;
    });

    im.count = particles.current.length;
    particles.current.forEach((p, i) => {
      const k = 1 - p.life / p.maxLife;
      dummy.current.position.copy(p.pos);
      dummy.current.scale.setScalar(0.05 * k + 0.01);
      dummy.current.rotation.set(p.life * 12, p.life * 9, 0);
      dummy.current.updateMatrix();
      im.setMatrixAt(i, dummy.current.matrix);
      im.setColorAt(i, p.color);
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, MAX_PARTICLES]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

// ---------- Всплывающий урон ----------

export function DamagePopups() {
  const [items, setItems] = useState<Popup[]>([]);

  useFrame(() => {
    const now = performance.now();
    let changed = false;
    if (fxBus.popups.length) {
      changed = true;
    }
    const incoming = fxBus.popups.splice(0, fxBus.popups.length);
    const alive = [...items, ...incoming].filter((p) => now - p.born < 800);
    if (changed || alive.length !== items.length) setItems(alive);
  });

  return (
    <>
      {items.map((p) => {
        const age = (performance.now() - p.born) / 800;
        return (
          <Html key={p.id} position={[p.x, p.y + age * 0.8, 0]} center zIndexRange={[10, 0]}>
            <span
              style={{
                color: p.color,
                fontWeight: 900,
                fontSize: `${28 - age * 10}px`,
                opacity: 1 - age,
                textShadow: '0 2px 8px rgba(0,0,0,0.9)',
                fontFamily: 'inherit',
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {p.text}
            </span>
          </Html>
        );
      })}
    </>
  );
}
