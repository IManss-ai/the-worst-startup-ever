'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Canvas, useFrame } from '@react-three/fiber';
import { MENTORS, mentorById } from '@/lib/mentors';
import Arena from './Arena';
import Fighter from './Fighter';
import CharacterSelect from './CharacterSelect';
import {
  AIController,
  KeyboardController,
  createFighter,
  tick,
  type Controller,
  type FighterSim,
  type FightEvent,
} from './engine';
import { useHud, fetchTrashTalk, localTrashLine } from './store';
import { announce, sfx, speakTrashTalk, warmupAudio } from './audio';

const ROUND_TIME = 60;
const WINS_TO_TAKE_MATCH = 2;

export default function FightScreen() {
  const hud = useHud();
  const [modelMap, setModelMap] = useState<Record<string, boolean>>({});

  const simA = useRef<FighterSim>(createFighter(0));
  const simB = useRef<FighterSim>(createFighter(1));
  const ctrlA = useRef<Controller>(new AIController());
  const ctrlB = useRef<Controller>(new AIController());
  const roundOver = useRef(false);

  // проверяем, какие GLB реально лежат в public/models
  useEffect(() => {
    let alive = true;
    (async () => {
      const entries = await Promise.all(
        MENTORS.map(async (m) => {
          try {
            const res = await fetch(`/models/${m.id}.glb`, { method: 'HEAD' });
            const type = res.headers.get('content-type') ?? '';
            return [m.id, res.ok && !type.includes('text/html')] as const;
          } catch {
            return [m.id, false] as const;
          }
        }),
      );
      if (alive) setModelMap(Object.fromEntries(entries));
    })();
    return () => {
      alive = false;
    };
  }, []);

  const p1 = mentorById(hud.p1Id ?? MENTORS[0].id);
  const p2 = mentorById(hud.p2Id ?? MENTORS[1].id);

  const setupControllers = useCallback((mode: string) => {
    if (mode === 'pvp') {
      ctrlA.current = new KeyboardController({ left: 'KeyA', right: 'KeyD', punch: 'KeyF', kick: 'KeyG', special: 'KeyH' });
      ctrlB.current = new KeyboardController({ left: 'ArrowLeft', right: 'ArrowRight', punch: 'KeyK', kick: 'KeyL', special: 'Semicolon' });
    } else if (mode === 'cpu') {
      ctrlA.current = new KeyboardController({ left: 'KeyA', right: 'KeyD', punch: 'KeyF', kick: 'KeyG', special: 'KeyH' });
      ctrlB.current = new AIController(0.8);
    } else {
      ctrlA.current = new AIController(0.85);
      ctrlB.current = new AIController(0.75);
    }
  }, []);

  const startRound = useCallback(
    (round: number) => {
      simA.current = createFighter(0);
      simB.current = createFighter(1);
      roundOver.current = false;
      useHud.getState().set({
        phase: 'intro',
        round,
        hp1: 100,
        hp2: 100,
        timer: ROUND_TIME,
        announcement: `РАУНД ${round}`,
        subtitle: '',
        finishHimShown: false,
      });
      announce(`Раунд ${round}`);
      setTimeout(() => {
        useHud.getState().set({ announcement: 'БОЙ!', phase: 'fight' });
        announce('Бой!', { pitch: 0.3, rate: 1.0 });
        setTimeout(() => useHud.getState().set({ announcement: '' }), 900);
      }, 1400);
    },
    [],
  );

  const startMatch = useCallback(() => {
    warmupAudio();
    setupControllers(useHud.getState().mode);
    useHud.getState().set({ wins1: 0, wins2: 0 });
    startRound(1);
  }, [setupControllers, startRound]);

  const endRound = useCallback(
    (winnerSide: 0 | 1) => {
      if (roundOver.current) return;
      roundOver.current = true;
      const s = useHud.getState();
      const winner = winnerSide === 0 ? p1 : p2;
      const loser = winnerSide === 0 ? p2 : p1;
      const wins1 = s.wins1 + (winnerSide === 0 ? 1 : 0);
      const wins2 = s.wins2 + (winnerSide === 1 ? 1 : 0);
      const matchOver = wins1 >= WINS_TO_TAKE_MATCH || wins2 >= WINS_TO_TAKE_MATCH;

      const winSim = winnerSide === 0 ? simA.current : simB.current;
      if (winSim.state !== 'ko') {
        winSim.state = 'win';
        winSim.stateT = 0;
      }

      s.set({
        phase: 'roundEnd',
        wins1,
        wins2,
        announcement: matchOver ? 'ФАТАЛИТИ СОВЕТОМ' : `${winner.name} ПОБЕЖДАЕТ`,
      });
      sfx.boom();
      announce(matchOver ? 'Фаталити. Совет вступает в силу.' : `${winner.name} побеждает раунд`);

      // трешток: локальная фраза мгновенно, живой AI подменяет когда доедет
      s.set({ subtitle: localTrashLine() });
      void fetchTrashTalk(winner.name, loser.name, matchOver ? 'fatality' : 'round_end').then((line) => {
        useHud.getState().set({ subtitle: line });
        speakTrashTalk(line);
      });

      setTimeout(() => {
        if (matchOver) {
          useHud.getState().set({ phase: 'matchEnd', announcement: '' });
        } else {
          startRound(useHud.getState().round + 1);
        }
      }, 3400);
    },
    [p1, p2, startRound],
  );

  // события движка -> звук + логика конца раунда
  const handleEvents = useCallback(
    (events: FightEvent[]) => {
      for (const e of events) {
        if (e.type === 'whoosh') sfx.whoosh();
        if (e.type === 'hit') {
          if (e.kind === 'punch') sfx.punch();
          else if (e.kind === 'kick') sfx.kick();
          else sfx.special();
        }
        if (e.type === 'ko') endRound(e.attacker);
      }
      // FINISH HIM-момент
      const s = useHud.getState();
      if (s.phase === 'fight' && !s.finishHimShown) {
        const lowSide = simA.current.hp <= 20 ? 0 : simB.current.hp <= 20 ? 1 : null;
        if (lowSide !== null) {
          s.set({ finishHimShown: true, announcement: 'ДОБЕЙ ЕГО. СОВЕТОМ.' });
          announce('Добей его. Советом.', { pitch: 0.2, rate: 0.9 });
          setTimeout(() => {
            if (useHud.getState().phase === 'fight') useHud.getState().set({ announcement: '' });
          }, 1600);
        }
      }
    },
    [endRound],
  );

  // клавиатура
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
      [ctrlA.current, ctrlB.current].forEach((c) => {
        if (c instanceof KeyboardController) c.handleKey(e.code, true);
      });
    };
    const up = (e: KeyboardEvent) => {
      [ctrlA.current, ctrlB.current].forEach((c) => {
        if (c instanceof KeyboardController) c.handleKey(e.code, false);
      });
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // таймер раунда
  useEffect(() => {
    if (hud.phase !== 'fight') return;
    const id = setInterval(() => {
      const s = useHud.getState();
      if (s.phase !== 'fight') return;
      const t = s.timer - 1;
      s.set({ timer: Math.max(0, t) });
      if (t <= 0) {
        endRound(simA.current.hp >= simB.current.hp ? 0 : 1);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [hud.phase, endRound]);

  // паник-кнопка: передать бой AI, демо не умирает
  const engageAuto = useCallback(() => {
    ctrlA.current = new AIController(0.85);
    ctrlB.current = new AIController(0.75);
    useHud.getState().set({ mode: 'auto' });
  }, []);

  const backToSelect = useCallback(() => {
    useHud.getState().set({
      phase: 'select',
      p1Id: null,
      p2Id: null,
      wins1: 0,
      wins2: 0,
      announcement: '',
      subtitle: '',
    });
  }, []);

  if (hud.phase === 'select') {
    return <CharacterSelect modelMap={modelMap} onStart={startMatch} />;
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0b0910]">
      <Canvas
        shadows
        camera={{ position: [0, 2.2, 6.6], fov: 45 }}
        onCreated={({ camera }) => camera.lookAt(0, 1.4, 0)}
      >
        <Arena />
        <Fighter mentor={p1} simRef={simA} hasModel={!!modelMap[p1.id]} />
        <Fighter mentor={p2} simRef={simB} hasModel={!!modelMap[p2.id]} />
        <GameLoop simA={simA} simB={simB} ctrlA={ctrlA} ctrlB={ctrlB} onEvents={handleEvents} />
      </Canvas>

      {/* HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 p-4">
        <div className="mx-auto flex max-w-5xl items-start gap-4">
          <HealthBar name={p1.name} hp={hud.hp1} wins={hud.wins1} align="left" color="#0a84ff" />
          <div className="min-w-16 pt-1 text-center">
            <p className="text-3xl font-black text-white tabular-nums">{hud.timer}</p>
            <p className="text-[10px] uppercase tracking-widest text-white/40">раунд {hud.round}</p>
          </div>
          <HealthBar name={p2.name} hp={hud.hp2} wins={hud.wins2} align="right" color="#ff2d55" />
        </div>
      </div>

      {/* центральный баннер */}
      {hud.announcement && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p
            className="animate-pulse text-center font-black uppercase text-red-500 drop-shadow-[0_0_25px_rgba(255,45,85,0.8)]"
            style={{ fontSize: 'clamp(2.5rem, 8vw, 6rem)' }}
          >
            {hud.announcement}
          </p>
        </div>
      )}

      {/* трешток-субтитры */}
      {hud.subtitle && (
        <div className="pointer-events-none absolute inset-x-0 bottom-16 flex justify-center px-4">
          <p className="max-w-2xl rounded-md bg-black/70 px-4 py-2 text-center text-lg font-bold italic text-amber-300">
            «{hud.subtitle}»
          </p>
        </div>
      )}

      {/* экран конца матча */}
      {hud.phase === 'matchEnd' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black/80 px-4 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-red-500">Конфликт разрешён</p>
          <h2 className="font-black uppercase text-white" style={{ fontSize: 'clamp(2rem, 6vw, 4rem)' }}>
            {(hud.wins1 > hud.wins2 ? p1 : p2).name} ПОБЕЖДАЕТ
          </h2>
          <p className="max-w-md text-white/70">
            Совет «{(hud.wins1 > hud.wins2 ? p1 : p2).quote}» вступает в юридическую силу*.
            <br />
            <span className="text-xs text-white/35">*не юридическую</span>
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={startMatch}
              className="rounded-md bg-red-600 px-6 py-3 font-black uppercase tracking-wider text-white hover:bg-red-500"
            >
              Реванш
            </button>
            <button
              onClick={backToSelect}
              className="rounded-md border border-white/20 px-6 py-3 font-bold uppercase tracking-wider text-white/70 hover:border-white/50"
            >
              Другой конфликт
            </button>
            <Link
              href="/"
              className="rounded-md border border-white/20 px-6 py-3 font-bold uppercase tracking-wider text-white/70 hover:border-white/50"
            >
              На главную
            </Link>
          </div>
        </div>
      )}

      {/* нижняя панель управления */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-3 text-[11px] text-white/30">
        <button
          onClick={backToSelect}
          className="pointer-events-auto rounded border border-white/10 px-3 py-1.5 uppercase tracking-wider hover:text-white/70"
        >
          ← выбор
        </button>
        <p className="hidden sm:block">
          {hud.mode === 'pvp'
            ? 'P1: A/D + F/G/H · P2: ←/→ + K/L/;'
            : hud.mode === 'cpu'
              ? 'Вы — P1: A/D + F/G/H'
              : 'Менторы дерутся сами. Вмешательство не требуется.'}
        </p>
        {hud.mode !== 'auto' && hud.phase !== 'matchEnd' && (
          <button
            onClick={engageAuto}
            className="pointer-events-auto rounded border border-amber-500/40 px-3 py-1.5 font-bold uppercase tracking-wider text-amber-400 hover:bg-amber-500/10"
          >
            AUTO
          </button>
        )}
      </div>
    </div>
  );
}

function HealthBar({
  name,
  hp,
  wins,
  align,
  color,
}: {
  name: string;
  hp: number;
  wins: number;
  align: 'left' | 'right';
  color: string;
}) {
  return (
    <div className={`flex-1 ${align === 'right' ? 'text-right' : ''}`}>
      <div className={`mb-1 flex items-center gap-2 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        <p className="truncate text-sm font-black uppercase text-white">{name}</p>
        <div className="flex gap-1">
          {Array.from({ length: 2 }).map((_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full ${i < wins ? 'bg-amber-400' : 'bg-white/20'}`}
            />
          ))}
        </div>
      </div>
      <div className="h-4 overflow-hidden rounded border border-white/20 bg-black/50">
        <div
          className={`h-full transition-all duration-200 ${align === 'right' ? 'ml-auto' : ''}`}
          style={{ width: `${hp}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// Тикает движок внутри цикла R3F с клампом dt — просадка кадров не ломает физику.
function GameLoop({
  simA,
  simB,
  ctrlA,
  ctrlB,
  onEvents,
}: {
  simA: React.RefObject<FighterSim>;
  simB: React.RefObject<FighterSim>;
  ctrlA: React.RefObject<Controller>;
  ctrlB: React.RefObject<Controller>;
  onEvents: (e: FightEvent[]) => void;
}) {
  useFrame((_, delta) => {
    const s = useHud.getState();
    const dt = Math.min(delta, 1 / 30);
    // в intro/roundEnd бойцы «дышат», но не управляются
    if (s.phase !== 'fight') {
      simA.current.stateT += dt;
      simB.current.stateT += dt;
      return;
    }
    const inA = ctrlA.current.read(simA.current, simB.current, dt);
    const inB = ctrlB.current.read(simB.current, simA.current, dt);
    const events = tick(simA.current, simB.current, inA, inB, dt);
    if (simA.current.hp !== s.hp1 || simB.current.hp !== s.hp2) {
      s.set({ hp1: simA.current.hp, hp2: simB.current.hp });
    }
    if (events.length) onEvents(events);
  });
  return null;
}
