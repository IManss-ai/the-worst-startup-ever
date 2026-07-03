'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MENTORS, mentorById } from '@/lib/mentors';
import Arena from './Arena';
import Fighter from './Fighter';
import CharacterSelect from './CharacterSelect';
import { CameraRig, DamagePopups, Sparks, fxBus, fxHit, fxKO } from './effects';
import {
  AIController,
  KeyboardController,
  NetRemoteController,
  KEYMAP_P1,
  KEYMAP_P2,
  KEYMAP_SOLO,
  createFighter,
  tick,
  type Controller,
  type FighterSim,
  type FightEvent,
} from './engine';
import { NetSession, type NetMessage, type NetSnapshot } from './net';
import { useHud, fetchTrashTalk, localTrashLine } from './store';
import {
  announce,
  playFaaah,
  playMentorVoice,
  playVictory,
  sfx,
  speakTrashTalk,
  warmupAudio,
} from './audio';

const ROUND_TIME = 60;
const WINS_TO_TAKE_MATCH = 2;
const NET_SEND_INTERVAL = 0.033; // ~30Гц

export default function FightScreen() {
  const hud = useHud();
  const [modelMap, setModelMap] = useState<Record<string, boolean>>({});

  const simA = useRef<FighterSim>(createFighter(0));
  const simB = useRef<FighterSim>(createFighter(1));
  const ctrlA = useRef<Controller>(new AIController());
  const ctrlB = useRef<Controller>(new AIController());
  const remoteCtrl = useRef<NetRemoteController>(new NetRemoteController());
  const guestInputCtrl = useRef<KeyboardController>(new KeyboardController(KEYMAP_SOLO));
  const roundOver = useRef(false);
  const net = useRef<NetSession | null>(null);
  const pendingNetEvents = useRef<FightEvent[]>([]);
  const latestSnap = useRef<NetSnapshot | null>(null);
  const lastSnapAt = useRef(0);

  const isOnline = hud.mode === 'online';
  const isAuthority = !isOnline || hud.netRole === 'host';

  // какие GLB реально лежат в public/models
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

  const setupControllers = useCallback(() => {
    const s = useHud.getState();
    if (s.mode === 'pvp') {
      ctrlA.current = new KeyboardController(KEYMAP_P1);
      ctrlB.current = new KeyboardController(KEYMAP_P2);
    } else if (s.mode === 'cpu') {
      ctrlA.current = new KeyboardController(KEYMAP_SOLO);
      ctrlB.current = new AIController(0.8);
    } else if (s.mode === 'online') {
      ctrlA.current = new KeyboardController(KEYMAP_SOLO);
      ctrlB.current = remoteCtrl.current;
    } else {
      ctrlA.current = new AIController(0.85);
      ctrlB.current = new AIController(0.75);
    }
  }, []);

  const startRound = useCallback((round: number) => {
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
    // первый раунд длиннее: на экране висит крупная шпаргалка управления
    const introDelay = round === 1 ? 3600 : 1400;
    setTimeout(() => {
      if (useHud.getState().phase !== 'intro') return;
      useHud.getState().set({ announcement: 'БОЙ!', phase: 'fight' });
      announce('Бой!', { pitch: 0.3, rate: 1.0 });
      setTimeout(() => {
        if (useHud.getState().phase === 'fight') useHud.getState().set({ announcement: '' });
      }, 900);
    }, introDelay);
  }, []);

  const startMatch = useCallback(() => {
    warmupAudio();
    setupControllers();
    useHud.getState().set({ wins1: 0, wins2: 0 });
    if (useHud.getState().mode === 'online' && useHud.getState().netRole === 'host') {
      net.current?.send({
        type: 'start',
        p1Id: useHud.getState().p1Id ?? MENTORS[0].id,
        p2Id: useHud.getState().p2Id ?? MENTORS[1].id,
      });
    }
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
      const loseSim = winnerSide === 0 ? simB.current : simA.current;
      if (winSim.state !== 'ko') {
        winSim.state = 'win';
        winSim.stateT = 0;
      }
      if (matchOver && loseSim.state !== 'ko') {
        // фаталити: проигравший падает, даже если проиграл по таймеру
        loseSim.state = 'ko';
        loseSim.stateT = 0;
      }

      s.set({
        phase: matchOver ? 'fatality' : 'roundEnd',
        wins1,
        wins2,
        announcement: matchOver ? 'FATALITY' : `${winner.name} ПОБЕЖДАЕТ`,
      });
      sfx.boom();
      if (!matchOver) announce(`${winner.name} побеждает раунд`);

      s.set({ subtitle: localTrashLine() });
      void fetchTrashTalk(winner.name, loser.name, matchOver ? 'fatality' : 'round_end').then((line) => {
        useHud.getState().set({ subtitle: line });
        speakTrashTalk(line);
      });

      setTimeout(
        () => {
          if (matchOver) {
            useHud.getState().set({ phase: 'matchEnd', announcement: '' });
          } else {
            startRound(useHud.getState().round + 1);
          }
        },
        matchOver ? 4600 : 3400,
      );
    },
    [p1, p2, startRound],
  );

  // fatality-звук на обеих машинах: у хоста фаза ставится в endRound,
  // у гостя прилетает в снапшоте — эффект срабатывает и там, и там
  useEffect(() => {
    if (hud.phase !== 'fatality') return;
    playVictory();
    const winnerId = (useHud.getState().wins1 > useHud.getState().wins2 ? hud.p1Id : hud.p2Id) ?? '';
    const t = setTimeout(() => {
      if (!playMentorVoice(winnerId)) {
        announce('Совет вступает в юридическую силу', { pitch: 0.2, rate: 0.85 });
      }
    }, 1100);
    return () => clearTimeout(t);
  }, [hud.phase, hud.p1Id, hud.p2Id]);

  // события движка -> звук + партиклы + конец раунда (хост/локально)
  // голос ментора в бою: атакующий «комментирует» удачные удары (с кулдауном, чтобы не спамить)
  const voiceCooldown = useRef<Record<string, number>>({});
  const tryCombatVoice = useCallback((mentorId: string, chance: number) => {
    const now = performance.now();
    if ((voiceCooldown.current[mentorId] ?? 0) > now) return;
    if (Math.random() > chance) return;
    if (playMentorVoice(mentorId)) voiceCooldown.current[mentorId] = now + 3500;
  }, []);

  const playEvents = useCallback(
    (events: FightEvent[]) => {
      for (const e of events) {
        const attackerId = e.attacker === 0 ? p1.id : p2.id;
        if (e.type === 'whoosh') {
          sfx.whoosh();
          if (e.kind === 'special') {
            playFaaah(); // боевой клич на спешле
            tryCombatVoice(attackerId, 1);
          }
        }
        if (e.type === 'hit') {
          if (e.kind === 'punch') sfx.punch();
          else if (e.kind === 'kick') sfx.kick();
          else sfx.special();
          fxHit(e.x ?? 0, e.damage ?? 5, e.kind);
          tryCombatVoice(attackerId, e.kind === 'punch' ? 0.35 : 0.55);
        }
        if (e.type === 'ko') {
          fxKO(e.x ?? 0);
          playFaaah();
        }
      }
    },
    [p1.id, p2.id, tryCombatVoice],
  );

  const handleEvents = useCallback(
    (events: FightEvent[]) => {
      playEvents(events);
      if (isOnline) pendingNetEvents.current.push(...events);
      for (const e of events) {
        if (e.type === 'ko') endRound(e.attacker);
      }
      const s = useHud.getState();
      if (s.phase === 'fight' && !s.finishHimShown) {
        const low = simA.current.hp <= 20 || simB.current.hp <= 20;
        if (low) {
          s.set({ finishHimShown: true, announcement: 'ДОБЕЙ ЕГО. СОВЕТОМ.' });
          announce('Добей его. Советом.', { pitch: 0.2, rate: 0.9 });
          setTimeout(() => {
            if (useHud.getState().phase === 'fight') useHud.getState().set({ announcement: '' });
          }, 1600);
        }
      }
    },
    [endRound, isOnline, playEvents],
  );

  // ---------- Сеть ----------

  const handleNetMessage = useCallback(
    (msg: NetMessage) => {
      const s = useHud.getState();
      switch (msg.type) {
        case 'pick':
          if (msg.who === 'guest') s.set({ p2Id: msg.mentorId });
          else s.set({ p1Id: msg.mentorId });
          break;
        case 'start': // гость: хост начал матч
          warmupAudio();
          s.set({ p1Id: msg.p1Id, p2Id: msg.p2Id, wins1: 0, wins2: 0, phase: 'intro' });
          break;
        case 'input':
          remoteCtrl.current.push(msg.input);
          break;
        case 'state': {
          // гость: применяем снапшот
          lastSnapAt.current = performance.now();
          latestSnap.current = msg.snap;
          const prev = { ann: s.announcement, sub: s.subtitle };
          s.set({
            phase: msg.snap.hud.phase,
            round: msg.snap.hud.round,
            wins1: msg.snap.hud.wins1,
            wins2: msg.snap.hud.wins2,
            timer: msg.snap.hud.timer,
            announcement: msg.snap.hud.announcement,
            subtitle: msg.snap.hud.subtitle,
            hp1: msg.snap.a.hp,
            hp2: msg.snap.b.hp,
          });
          if (msg.snap.hud.announcement && msg.snap.hud.announcement !== prev.ann) {
            announce(msg.snap.hud.announcement.toLowerCase(), { pitch: 0.3 });
          }
          if (msg.snap.hud.subtitle && msg.snap.hud.subtitle !== prev.sub) {
            speakTrashTalk(msg.snap.hud.subtitle);
          }
          playEvents(msg.snap.events);
          break;
        }
        case 'bye':
          s.set({ netStatus: 'error', netError: 'Соперник отключился', phase: 'select' });
          net.current?.destroy();
          net.current = null;
          break;
      }
    },
    [playEvents],
  );

  const hostGame = useCallback(async () => {
    const s = useHud.getState();
    s.set({ mode: 'online', netRole: 'host', netStatus: 'hosting', netError: '' });
    try {
      const session = await NetSession.host();
      net.current = session;
      s.set({ netCode: session.code });
      session.onPeerConnected = () =>
        useHud.getState().set({ netStatus: 'connected', netTransport: session.transport });
      session.onPeerLost = () => {
        useHud.getState().set({ netStatus: 'error', netError: 'Соперник отключился', phase: 'select' });
      };
      session.onMessage(handleNetMessage);
    } catch (e) {
      s.set({ netStatus: 'error', netError: e instanceof Error ? e.message : 'Не удалось создать комнату' });
    }
  }, [handleNetMessage]);

  const joinGame = useCallback(
    async (code: string) => {
      const s = useHud.getState();
      s.set({ mode: 'online', netRole: 'guest', netStatus: 'joining', netError: '', netCode: code.toUpperCase() });
      try {
        const session = await NetSession.join(code);
        net.current = session;
        s.set({ netStatus: 'connected', netTransport: session.transport });
        session.onPeerLost = () => {
          useHud.getState().set({ netStatus: 'error', netError: 'Соединение потеряно', phase: 'select' });
        };
        session.onMessage(handleNetMessage);
      } catch (e) {
        s.set({ netStatus: 'error', netError: e instanceof Error ? e.message : 'Не удалось подключиться' });
      }
    },
    [handleNetMessage],
  );

  const pickOnline = useCallback((id: string) => {
    const s = useHud.getState();
    if (s.netRole === 'host') {
      s.set({ p1Id: id });
      net.current?.send({ type: 'pick', mentorId: id, who: 'host' });
    } else {
      s.set({ p2Id: id });
      net.current?.send({ type: 'pick', mentorId: id, who: 'guest' });
    }
  }, []);

  // гость шлёт инпуты ТОЛЬКО при изменении (+ редкий повтор удержания):
  // публичный MQTT-брокер банит клиентов за флуд 30 сообщений/с,
  // после чего молча дропает всё — «подключилось, но не играет».
  useEffect(() => {
    if (!isOnline || hud.netRole !== 'guest' || hud.netStatus !== 'connected') return;
    let lastMove = '';
    let lastSentAt = 0;
    const id = setInterval(() => {
      const phase = useHud.getState().phase;
      if (phase === 'select' || phase === 'matchEnd') return;
      const input = guestInputCtrl.current.snapshotInput();
      const hasAttack = input.punch || input.kick || input.special;
      const move = `${input.left}|${input.right}`;
      const now = performance.now();
      const holdRefresh = move !== 'false|false' && now - lastSentAt > 400;
      if (!hasAttack && move === lastMove && !holdRefresh) return;
      lastMove = move;
      lastSentAt = now;
      net.current?.send({ type: 'input', input });
    }, 33);
    return () => clearInterval(id);
  }, [isOnline, hud.netRole, hud.netStatus]);

  // watchdog гостя: lwt-bye мы игнорируем (хост мог просто моргнуть сокетом),
  // но если снапшоты реально перестали идти в бою — честно сообщаем об обрыве
  useEffect(() => {
    if (!isOnline || hud.netRole !== 'guest' || hud.netStatus !== 'connected') return;
    lastSnapAt.current = performance.now();
    const id = setInterval(() => {
      const s = useHud.getState();
      if (s.phase === 'select') return;
      if (performance.now() - lastSnapAt.current > 15000) {
        net.current?.destroy();
        net.current = null;
        s.set({ netStatus: 'error', netError: 'Связь с хостом потеряна — пересоздайте комнату', phase: 'select' });
      }
    }, 3000);
    return () => clearInterval(id);
  }, [isOnline, hud.netRole, hud.netStatus]);

  // клавиатура
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
      [ctrlA.current, ctrlB.current, guestInputCtrl.current].forEach((c) => {
        if (c instanceof KeyboardController) c.handleKey(e.code, true);
      });
    };
    const up = (e: KeyboardEvent) => {
      [ctrlA.current, ctrlB.current, guestInputCtrl.current].forEach((c) => {
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

  // таймер раунда (только авторитет)
  useEffect(() => {
    if (hud.phase !== 'fight' || !isAuthority) return;
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
  }, [hud.phase, endRound, isAuthority]);

  // уходя с экрана — рвём сеть
  useEffect(() => {
    return () => {
      net.current?.destroy();
      net.current = null;
    };
  }, []);

  const engageAuto = useCallback(() => {
    ctrlA.current = new AIController(0.85);
    ctrlB.current = new AIController(0.75);
    useHud.getState().set({ mode: 'auto' });
  }, []);

  const backToSelect = useCallback(() => {
    net.current?.destroy();
    net.current = null;
    useHud.getState().set({
      phase: 'select',
      p1Id: null,
      p2Id: null,
      wins1: 0,
      wins2: 0,
      announcement: '',
      subtitle: '',
      netRole: null,
      netStatus: 'idle',
      netCode: '',
      netError: '',
      netTransport: '',
      mode: 'pvp',
    });
  }, []);

  if (hud.phase === 'select') {
    return (
      <CharacterSelect
        modelMap={modelMap}
        onStart={startMatch}
        onHost={hostGame}
        onJoin={joinGame}
        onPickOnline={pickOnline}
      />
    );
  }

  const winner = hud.wins1 > hud.wins2 ? p1 : p2;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0b0910]">
      <Canvas shadows camera={{ position: [0, 2.1, 6.2], fov: 45 }} dpr={[1, 2]}>
        <Arena />
        <Fighter mentor={p1} simRef={simA} hasModel={!!modelMap[p1.id]} />
        <Fighter mentor={p2} simRef={simB} hasModel={!!modelMap[p2.id]} />
        <CameraRig simA={simA} simB={simB} />
        <Sparks />
        <DamagePopups />
        {isAuthority ? (
          <GameLoop
            simA={simA}
            simB={simB}
            ctrlA={ctrlA}
            ctrlB={ctrlB}
            onEvents={handleEvents}
            net={net}
            pendingNetEvents={pendingNetEvents}
          />
        ) : (
          <GuestSync simA={simA} simB={simB} latestSnap={latestSnap} />
        )}
      </Canvas>

      {/* HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 p-4">
        <div className="mx-auto flex max-w-5xl items-start gap-4">
          <HealthBar mentor={p1} hp={hud.hp1} wins={hud.wins1} align="left" color="#0a84ff" />
          <div className="min-w-16 pt-1 text-center">
            <p className="text-3xl font-black text-white tabular-nums">{hud.timer}</p>
            <p className="text-[10px] uppercase tracking-widest text-white/40">раунд {hud.round}</p>
          </div>
          <HealthBar mentor={p2} hp={hud.hp2} wins={hud.wins2} align="right" color="#ff2d55" />
        </div>
      </div>

      {/* fatality: кровавая виньетка */}
      {(hud.phase === 'fatality' || hud.phase === 'matchEnd') && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 35%, rgba(110,0,0,0.6) 100%)',
            animation: 'fatalityPulse 1.4s ease-in-out infinite',
          }}
        />
      )}

      {/* центральный баннер */}
      {hud.announcement && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p
            className={`text-center font-black uppercase drop-shadow-[0_0_25px_rgba(255,45,85,0.8)] ${
              hud.phase === 'fatality' ? 'text-amber-400' : 'animate-pulse text-red-500'
            }`}
            style={{
              fontSize: hud.phase === 'fatality' ? 'clamp(3rem, 11vw, 8.5rem)' : 'clamp(2.5rem, 8vw, 6rem)',
              ...(hud.phase === 'fatality'
                ? { animation: 'fatalityText 0.9s cubic-bezier(0.2, 1.6, 0.4, 1) both', letterSpacing: '0.08em' }
                : {}),
            }}
          >
            {hud.announcement}
          </p>
        </div>
      )}

      <style>{`
        @keyframes fatalityPulse { 0%,100% { opacity: 0.75; } 50% { opacity: 1; } }
        @keyframes fatalityText { 0% { transform: scale(3); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes hpShake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(4px); } }
        @keyframes lowHpPulse { 0%,100% { box-shadow: 0 0 6px rgba(255,45,85,0.4); } 50% { box-shadow: 0 0 22px rgba(255,45,85,0.95); } }
      `}</style>

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
            {winner.name} ПОБЕЖДАЕТ
          </h2>
          <p className="max-w-md text-white/70">
            Совет «{winner.quote}» вступает в юридическую силу*.
            <br />
            <span className="text-xs text-white/35">*не юридическую</span>
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {isAuthority ? (
              <button
                onClick={startMatch}
                className="rounded-md bg-red-600 px-6 py-3 font-black uppercase tracking-wider text-white hover:bg-red-500"
              >
                Реванш
              </button>
            ) : (
              <p className="px-6 py-3 text-sm uppercase tracking-wider text-white/40">Реванш запускает хост…</p>
            )}
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

      {/* шпаргалка управления во время интро */}
      {hud.phase === 'intro' && <ControlsSplash mode={hud.mode} netRole={hud.netRole} p1Name={p1.name} p2Name={p2.name} />}

      {/* нижняя панель управления */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
        <button
          onClick={backToSelect}
          className="pointer-events-auto rounded border border-white/10 px-3 py-1.5 text-[11px] uppercase tracking-wider text-white/30 hover:text-white/70"
        >
          ← выбор
        </button>
        <ControlsBar mode={hud.mode} netRole={hud.netRole} netCode={hud.netCode} />
        {hud.mode !== 'auto' && hud.mode !== 'online' && hud.phase !== 'matchEnd' && (
          <button
            onClick={engageAuto}
            className="pointer-events-auto rounded border border-amber-500/40 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-400 hover:bg-amber-500/10"
          >
            AUTO
          </button>
        )}
      </div>
    </div>
  );
}

// Клавиша-кейкап: крупная, читается с проектора
function Key({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <kbd
      className="inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-white/30 bg-white/10 px-2 font-mono text-sm font-black text-white shadow-[0_3px_0_rgba(255,255,255,0.25)]"
      style={color ? { borderColor: color, boxShadow: `0 3px 0 ${color}66` } : undefined}
    >
      {children}
    </kbd>
  );
}

function KeyRow({ keys, label, color }: { keys: string[]; label: string; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {keys.map((k) => (
          <Key key={k} color={color}>
            {k}
          </Key>
        ))}
      </div>
      <span className="text-sm font-bold uppercase tracking-wide text-white/80">{label}</span>
    </div>
  );
}

// Большая шпаргалка на интро первого раунда — «какие кнопки жать»
function ControlsSplash({
  mode,
  netRole,
  p1Name,
  p2Name,
}: {
  mode: string;
  netRole: 'host' | 'guest' | null;
  p1Name: string;
  p2Name: string;
}) {
  const soloCard = (title: string, color: string) => (
    <div className="rounded-xl border-2 bg-black/80 p-5 backdrop-blur" style={{ borderColor: color }}>
      <p className="mb-3 text-center text-sm font-black uppercase tracking-widest" style={{ color }}>
        {title}
      </p>
      <div className="flex flex-col gap-2.5">
        <KeyRow keys={['A', 'D']} label="движение (или ← →)" color={color} />
        <KeyRow keys={['F']} label="удар" color={color} />
        <KeyRow keys={['G']} label="пинок" color={color} />
        <KeyRow keys={['H']} label="спешл (или пробел)" color={color} />
      </div>
    </div>
  );

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-20 flex justify-center px-4">
      <div className="flex flex-wrap justify-center gap-4">
        {mode === 'pvp' && (
          <>
            <div className="rounded-xl border-2 border-blue-400 bg-black/80 p-5 backdrop-blur">
              <p className="mb-3 text-center text-sm font-black uppercase tracking-widest text-blue-300">{p1Name} — игрок 1</p>
              <div className="flex flex-col gap-2.5">
                <KeyRow keys={['A', 'D']} label="движение" color="#0a84ff" />
                <KeyRow keys={['F']} label="удар" color="#0a84ff" />
                <KeyRow keys={['G']} label="пинок" color="#0a84ff" />
                <KeyRow keys={['H']} label="спешл" color="#0a84ff" />
              </div>
            </div>
            <div className="rounded-xl border-2 border-red-400 bg-black/80 p-5 backdrop-blur">
              <p className="mb-3 text-center text-sm font-black uppercase tracking-widest text-red-300">{p2Name} — игрок 2</p>
              <div className="flex flex-col gap-2.5">
                <KeyRow keys={['←', '→']} label="движение" color="#ff2d55" />
                <KeyRow keys={['K']} label="удар" color="#ff2d55" />
                <KeyRow keys={['L']} label="пинок" color="#ff2d55" />
                <KeyRow keys={[';']} label="спешл" color="#ff2d55" />
              </div>
            </div>
          </>
        )}
        {mode === 'cpu' && soloCard(`Вы — ${p1Name}`, '#0a84ff')}
        {mode === 'online' &&
          (netRole === 'guest' ? soloCard(`Вы — ${p2Name}`, '#ff2d55') : soloCard(`Вы — ${p1Name}`, '#0a84ff'))}
        {mode === 'auto' && (
          <div className="rounded-xl border-2 border-amber-500/60 bg-black/80 px-6 py-4 backdrop-blur">
            <p className="text-sm font-black uppercase tracking-widest text-amber-300">
              Менторы дерутся сами. Вмешательство не требуется.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Постоянная панель управления внизу — кейкапы вместо мелкого текста
function ControlsBar({ mode, netRole, netCode }: { mode: string; netRole: 'host' | 'guest' | null; netCode: string }) {
  if (mode === 'auto') {
    return (
      <p className="pointer-events-none hidden text-[11px] uppercase tracking-wider text-white/35 sm:block">
        Авто-режим · менторы разбираются сами
      </p>
    );
  }
  return (
    <div className="pointer-events-none hidden items-center gap-4 rounded-lg bg-black/55 px-4 py-2 backdrop-blur sm:flex">
      {mode === 'pvp' ? (
        <>
          <span className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase text-blue-300">P1</span>
            <Key color="#0a84ff">A</Key>
            <Key color="#0a84ff">D</Key>
            <Key color="#0a84ff">F</Key>
            <Key color="#0a84ff">G</Key>
            <Key color="#0a84ff">H</Key>
          </span>
          <span className="text-white/25">·</span>
          <span className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase text-red-300">P2</span>
            <Key color="#ff2d55">←</Key>
            <Key color="#ff2d55">→</Key>
            <Key color="#ff2d55">K</Key>
            <Key color="#ff2d55">L</Key>
            <Key color="#ff2d55">;</Key>
          </span>
        </>
      ) : (
        <span className="flex items-center gap-1.5">
          <span className="text-[10px] font-black uppercase text-white/50">
            {mode === 'online' ? `комната ${netCode} · вы ${netRole === 'guest' ? 'P2' : 'P1'}` : 'вы'}
          </span>
          <Key>A</Key>
          <Key>D</Key>
          <span className="text-[10px] uppercase text-white/40">ход</span>
          <Key>F</Key>
          <span className="text-[10px] uppercase text-white/40">удар</span>
          <Key>G</Key>
          <span className="text-[10px] uppercase text-white/40">пинок</span>
          <Key>H</Key>
          <span className="text-[10px] uppercase text-white/40">спешл</span>
        </span>
      )}
    </div>
  );
}

function HealthBar({
  mentor,
  hp,
  wins,
  align,
  color,
}: {
  mentor: ReturnType<typeof mentorById>;
  hp: number;
  wins: number;
  align: 'left' | 'right';
  color: string;
}) {
  const name = mentor.name;
  // «призрачный» след: белая полоса догоняет основную с задержкой — виден размер урона
  const [ghost, setGhost] = useState(hp);
  const [shakeKey, setShakeKey] = useState(0);
  const prevHp = useRef(hp);

  useEffect(() => {
    if (hp < prevHp.current) setShakeKey((k) => k + 1);
    if (hp > prevHp.current) setGhost(hp); // новый раунд — мгновенный сброс
    prevHp.current = hp;
    const t = setTimeout(() => setGhost(hp), 260);
    return () => clearTimeout(t);
  }, [hp]);

  const low = hp <= 25;

  return (
    <div className={`flex-1 ${align === 'right' ? 'text-right' : ''}`}>
      <div className={`mb-1 flex items-center gap-2 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        {/* аватар бойца рядом с ником */}
        {mentor.hasPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/avatars/${mentor.id}.webp`}
            alt={name}
            width={44}
            height={44}
            className="h-11 w-11 rounded border-2 object-cover shadow-lg"
            style={{ borderColor: color }}
          />
        ) : (
          <div
            className="flex h-11 w-11 items-center justify-center rounded border-2 text-lg font-black text-white"
            style={{ borderColor: color, backgroundColor: mentor.color }}
          >
            {name.charAt(0)}
          </div>
        )}
        <p className="truncate text-sm font-black uppercase text-white">{name}</p>
        <div className="flex gap-1">
          {Array.from({ length: 2 }).map((_, i) => (
            <span key={i} className={`h-2 w-2 rounded-full ${i < wins ? 'bg-amber-400' : 'bg-white/20'}`} />
          ))}
        </div>
      </div>
      <div
        key={shakeKey}
        className="relative h-4 overflow-hidden rounded border border-white/25 bg-black/60"
        style={{
          transform: 'skewX(-12deg)', // MK-стиль: скошенные полосы
          animation: `${shakeKey ? 'hpShake 0.3s' : 'none'}${low ? ', lowHpPulse 0.8s ease-in-out infinite' : ''}`,
        }}
      >
        {/* след урона */}
        <div
          className={`absolute inset-y-0 bg-amber-200/80 ${align === 'right' ? 'right-0' : 'left-0'}`}
          style={{ width: `${ghost}%`, transition: 'width 0.55s cubic-bezier(0.2, 0, 0.2, 1)' }}
        />
        {/* основная полоса */}
        <div
          className={`absolute inset-y-0 ${align === 'right' ? 'right-0' : 'left-0'}`}
          style={{
            width: `${hp}%`,
            transition: 'width 0.12s ease-out',
            background:
              align === 'right'
                ? `linear-gradient(270deg, ${color}, ${low ? '#ff8800' : color}cc)`
                : `linear-gradient(90deg, ${color}, ${low ? '#ff8800' : color}cc)`,
          }}
        />
        {/* блик сверху */}
        <div className="absolute inset-x-0 top-0 h-1/3 bg-white/15" />
      </div>
    </div>
  );
}

// Авторитетный цикл: тикает движок, шлёт снапшоты гостю. Хитстоп — заморозка кадра.
function GameLoop({
  simA,
  simB,
  ctrlA,
  ctrlB,
  onEvents,
  net,
  pendingNetEvents,
}: {
  simA: React.RefObject<FighterSim>;
  simB: React.RefObject<FighterSim>;
  ctrlA: React.RefObject<Controller>;
  ctrlB: React.RefObject<Controller>;
  onEvents: (e: FightEvent[]) => void;
  net: React.RefObject<NetSession | null>;
  pendingNetEvents: React.RefObject<FightEvent[]>;
}) {
  const sendAccum = useRef(0);

  useFrame((_, delta) => {
    const s = useHud.getState();
    const dt = Math.min(delta, 1 / 30);

    if (fxBus.hitStop > 0) {
      fxBus.hitStop = Math.max(0, fxBus.hitStop - delta);
    } else if (s.phase === 'fight') {
      const inA = ctrlA.current.read(simA.current, simB.current, dt);
      const inB = ctrlB.current.read(simB.current, simA.current, dt);
      const events = tick(simA.current, simB.current, inA, inB, dt);
      if (simA.current.hp !== s.hp1 || simB.current.hp !== s.hp2) {
        s.set({ hp1: simA.current.hp, hp2: simB.current.hp });
      }
      if (events.length) onEvents(events);
    } else {
      simA.current.stateT += dt;
      simB.current.stateT += dt;
    }

    // трансляция снапшотов гостю (в любой фазе — чтобы синхронились интро/итоги).
    // через релей — 8Гц (публичный брокер банит за флуд), напрямую — 30Гц
    if (net.current?.connected && s.mode === 'online') {
      const sendInterval = net.current.transport === 'relay' ? 0.2 : NET_SEND_INTERVAL;
      sendAccum.current += delta;
      if (sendAccum.current >= sendInterval) {
        sendAccum.current = 0;
        const events = pendingNetEvents.current.splice(0, pendingNetEvents.current.length);
        const pick = (f: FighterSim) => ({ x: f.x, facing: f.facing, hp: f.hp, state: f.state, stateT: f.stateT });
        net.current.send({
          type: 'state',
          snap: {
            a: pick(simA.current),
            b: pick(simB.current),
            hud: {
              phase: s.phase,
              round: s.round,
              wins1: s.wins1,
              wins2: s.wins2,
              timer: s.timer,
              announcement: s.announcement,
              subtitle: s.subtitle,
            },
            events,
          },
        });
      }
    }
  });
  return null;
}

// Гость: не тикает движок, а плавно применяет снапшоты хоста.
function GuestSync({
  simA,
  simB,
  latestSnap,
}: {
  simA: React.RefObject<FighterSim>;
  simB: React.RefObject<FighterSim>;
  latestSnap: React.RefObject<NetSnapshot | null>;
}) {
  useFrame((_, delta) => {
    const snap = latestSnap.current;
    const dt = Math.min(delta, 1 / 30);
    if (!snap) return;
    const apply = (sim: FighterSim, s: NetSnapshot['a']) => {
      sim.x = THREE.MathUtils.lerp(sim.x, s.x, Math.min(1, dt * 18));
      sim.facing = s.facing;
      sim.hp = s.hp;
      if (sim.state !== s.state) {
        sim.state = s.state;
        sim.stateT = s.stateT;
      } else {
        sim.stateT += dt;
      }
    };
    apply(simA.current, snap.a);
    apply(simB.current, snap.b);
  });
  return null;
}
