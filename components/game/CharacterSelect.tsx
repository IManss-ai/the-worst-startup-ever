'use client';

import { useState } from 'react';
import Image from 'next/image';
import { MENTORS, mentorById, type Mentor } from '@/lib/mentors';
import { playMentorVoice } from './audio';
import { useHud, type GameMode } from './store';

const MODES: { id: GameMode; label: string; hint: string }[] = [
  { id: 'pvp', label: '2 ИГРОКА', hint: 'один ноутбук: WASD+FGH против ←→+KL;' },
  { id: 'cpu', label: 'ПРОТИВ CPU', hint: 'вы против алгоритма менторства' },
  { id: 'auto', label: 'АВТО-БОЙ', hint: 'менторы решают сами (режим демо)' },
  { id: 'online', label: 'ОНЛАЙН', hint: 'два ноутбука, каждый за своим' },
];

export default function CharacterSelect({
  modelMap,
  onStart,
  onHost,
  onJoin,
  onPickOnline,
}: {
  modelMap: Record<string, boolean>;
  onStart: () => void;
  onHost: () => void;
  onJoin: (code: string) => void;
  onPickOnline: (id: string) => void;
}) {
  const { p1Id, p2Id, mode, netRole, netCode, netStatus, netError, netTransport, set } = useHud();
  const [joinCode, setJoinCode] = useState('');

  const isOnline = mode === 'online';
  const onlineReady = netStatus === 'connected';
  const p1 = p1Id ? mentorById(p1Id) : null;
  const p2 = p2Id ? mentorById(p2Id) : null;

  function pick(id: string) {
    playMentorVoice(id); // у кого есть записанный голос — представляется сам
    if (isOnline) {
      if (onlineReady) onPickOnline(id);
      return;
    }
    // читаем свежий стейт: два быстрых клика в один тик не должны затирать друг друга
    const s = useHud.getState();
    if (!s.p1Id) {
      set({ p1Id: id });
    } else if (!s.p2Id && id !== s.p1Id) {
      set({ p2Id: id });
    } else if (id === s.p1Id) {
      set({ p1Id: s.p2Id, p2Id: null });
    } else {
      set({ p2Id: id });
    }
  }

  function randomPick() {
    const shuffled = [...MENTORS].sort(() => Math.random() - 0.5);
    if (isOnline) {
      if (onlineReady) onPickOnline(shuffled[0].id);
      return;
    }
    set({ p1Id: shuffled[0].id, p2Id: shuffled[1].id });
  }

  const ready = p1Id && p2Id;
  const canStart = isOnline ? Boolean(ready && netRole === 'host' && onlineReady) : Boolean(ready);
  const myOnlineSlot = netRole === 'guest' ? p2Id : p1Id;

  return (
    <div className="relative flex min-h-screen flex-col items-center gap-4 overflow-hidden px-4 py-6 text-white">
      {/* адский задник во весь экран */}
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: 'url(/bg.webp)' }}
      />
      <div className="absolute inset-0 -z-10 bg-black/72" />

      {/* шапка */}
      <div className="flex items-center gap-3">
        <Image src="/logo.png" alt="nFactorial" width={40} height={40} className="rounded-md" priority />
        <p className="text-[10px] uppercase tracking-[0.5em] text-red-400">nFactorial presents</p>
      </div>
      <h1
        className="text-center font-black uppercase leading-none tracking-tight"
        style={{ fontSize: 'clamp(2rem, 5vw, 3.6rem)', textShadow: '0 0 40px rgba(255,45,85,0.6)' }}
      >
        NFAC KOMBAT
      </h1>
      <p className="text-xs uppercase tracking-[0.3em] text-amber-300/80">Choose your mentor</p>

      <div className="flex flex-wrap justify-center gap-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => set({ mode: m.id })}
            className={`rounded-md border px-4 py-2 text-xs font-bold uppercase tracking-wider transition sm:text-sm ${
              mode === m.id
                ? 'border-red-500 bg-red-500/25 text-red-300'
                : 'border-white/20 bg-black/40 text-white/60 hover:border-white/50'
            }`}
            title={m.hint}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* онлайн-панель */}
      {isOnline && (
        <div className="w-full max-w-xl rounded-lg border border-white/15 bg-black/60 p-4 text-center backdrop-blur">
          {netStatus === 'idle' && (
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={onHost}
                className="rounded-md bg-red-600 px-5 py-2.5 font-black uppercase tracking-wider hover:bg-red-500"
              >
                Создать комнату
              </button>
              <span className="text-white/30">или</span>
              <div className="flex gap-2">
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="КОД"
                  maxLength={4}
                  className="w-24 rounded-md border border-white/25 bg-black/60 px-3 py-2 text-center font-black uppercase tracking-[0.3em] outline-none focus:border-red-500"
                />
                <button
                  onClick={() => joinCode.length === 4 && onJoin(joinCode)}
                  disabled={joinCode.length !== 4}
                  className="rounded-md border border-white/25 px-4 py-2 font-bold uppercase tracking-wider text-white/70 hover:border-white/60 disabled:opacity-30"
                >
                  Войти
                </button>
              </div>
            </div>
          )}
          {netStatus === 'hosting' && (
            <div>
              <p className="text-xs uppercase tracking-widest text-white/50">Код комнаты — продиктуй сопернику</p>
              <p className="my-1 font-black tracking-[0.4em] text-red-400" style={{ fontSize: '2.6rem' }}>
                {netCode}
              </p>
              <p className="animate-pulse text-sm text-white/50">Ждём соперника…</p>
            </div>
          )}
          {netStatus === 'joining' && (
            <p className="animate-pulse text-sm text-white/60">Подключаемся к комнате {netCode}…</p>
          )}
          {netStatus === 'connected' && (
            <div>
              <p className="text-sm font-bold text-green-400">
                ✓ Соединение установлено · комната {netCode} ·{' '}
                {netTransport === 'relay' ? 'через релей (обходим изоляцию Wi-Fi)' : 'напрямую (P2P)'}
              </p>
              <p className="mt-1 text-xs text-white/60">
                Вы — {netRole === 'host' ? 'синий угол (P1)' : 'красный угол (P2)'}. Выберите своего бойца.
                {netRole === 'host' ? ' Бой начинаете вы.' : ' Бой начнёт хост.'}
              </p>
            </div>
          )}
          {netStatus === 'error' && (
            <div>
              <p className="text-sm text-red-400">{netError}</p>
              <button
                onClick={() => set({ netStatus: 'idle', netError: '' })}
                className="mt-2 rounded-md border border-white/25 px-4 py-1.5 text-xs uppercase tracking-wider text-white/60 hover:border-white/60"
              >
                Попробовать снова
              </button>
            </div>
          )}
        </div>
      )}

      {/* MK-раскладка: большой портрет P1 · сетка · большой портрет P2 */}
      <div className="flex w-full max-w-6xl items-stretch justify-center gap-4">
        <BigPortrait mentor={p1} side="P1" color="#0a84ff" />

        <div className="grid w-full max-w-md grid-cols-3 gap-1.5 self-center sm:gap-2">
          {MENTORS.map((m) => {
            const isP1 = p1Id === m.id;
            const isP2 = p2Id === m.id;
            const mine = isOnline && onlineReady && myOnlineSlot === m.id;
            return (
              <button
                key={m.id}
                onClick={() => pick(m.id)}
                title={`${m.name} — ${m.title}${modelMap[m.id] ? '' : ' (модель не загружена)'}`}
                className={`group relative aspect-square overflow-hidden rounded-sm border-2 transition duration-150 hover:z-10 hover:scale-105 ${
                  isP1
                    ? 'border-blue-400 shadow-[0_0_18px_rgba(10,132,255,0.8)]'
                    : isP2
                      ? 'border-red-500 shadow-[0_0_18px_rgba(255,45,85,0.8)]'
                      : 'border-amber-700/60 hover:border-amber-400'
                }`}
              >
                {m.hasPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/avatars/${m.id}.webp`}
                    alt={m.name}
                    className="h-full w-full object-cover transition group-hover:brightness-110"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center text-3xl font-black text-white/90"
                    style={{ background: `linear-gradient(160deg, ${m.color}66, #1a0d08)` }}
                  >
                    {m.name.charAt(0)}
                  </div>
                )}
                {(isP1 || isP2) && (
                  <span
                    className={`absolute left-1 top-1 rounded px-1.5 py-0.5 text-[10px] font-black ${
                      isP1 ? 'bg-blue-500' : 'bg-red-500'
                    } ${mine ? 'ring-1 ring-white' : ''}`}
                  >
                    {isP1 ? 'P1' : 'P2'}
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 to-transparent px-1 pb-0.5 pt-3 text-center text-[9px] font-black uppercase leading-tight tracking-wide sm:text-[10px]">
                  {m.name}
                </span>
              </button>
            );
          })}
        </div>

        <BigPortrait mentor={p2} side="P2" color="#ff2d55" />
      </div>

      {/* нижняя VS-плашка */}
      <div className="flex items-center gap-4 text-center">
        <p className="min-w-28 text-right font-black uppercase" style={{ color: '#6db3ff', fontSize: 'clamp(1rem, 2.4vw, 1.6rem)' }}>
          {p1 ? p1.name : '???'}
        </p>
        <span className="font-black text-red-500 drop-shadow-[0_0_12px_rgba(255,45,85,0.9)]" style={{ fontSize: '2rem' }}>
          VS
        </span>
        <p className="min-w-28 text-left font-black uppercase" style={{ color: '#ff8095', fontSize: 'clamp(1rem, 2.4vw, 1.6rem)' }}>
          {p2 ? p2.name : '???'}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={randomPick}
          className="rounded-md border border-white/25 bg-black/40 px-5 py-3 text-sm font-bold uppercase tracking-wider text-white/70 hover:border-white/60"
        >
          {isOnline ? 'Случайный боец' : 'Случайный конфликт'}
        </button>
        <button
          onClick={onStart}
          disabled={!canStart}
          className={`rounded-md px-8 py-3 text-lg font-black uppercase tracking-widest transition ${
            canStart
              ? 'bg-red-600 text-white shadow-[0_0_30px_rgba(255,45,85,0.6)] hover:bg-red-500'
              : 'cursor-not-allowed bg-white/10 text-white/30'
          }`}
        >
          {isOnline && netRole === 'guest' ? 'Ждём хоста' : 'В бой →'}
        </button>
      </div>
      <p className="text-sm text-white/55">
        Кнопки запоминать не нужно — крупная шпаргалка появится прямо перед боем.
      </p>
    </div>
  );
}

// Большой боковой портрет в духе экрана выбора MK
function BigPortrait({ mentor, side, color }: { mentor: Mentor | null; side: string; color: string }) {
  return (
    <div className="hidden w-56 flex-col lg:flex xl:w-64">
      <div
        className="relative aspect-[3/4] overflow-hidden rounded-md border-2 bg-black/60"
        style={{ borderColor: mentor ? color : 'rgba(255,255,255,0.15)', boxShadow: mentor ? `0 0 35px ${color}55` : 'none' }}
      >
        {mentor ? (
          mentor.hasPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/avatars/${mentor.id}.webp`} alt={mentor.name} className="h-full w-full object-cover" />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-7xl font-black text-white/90"
              style={{ background: `linear-gradient(160deg, ${mentor.color}66, #1a0d08)` }}
            >
              {mentor.name.charAt(0)}
            </div>
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl font-black text-white/15">?</div>
        )}
        <span
          className="absolute left-2 top-2 rounded px-2 py-0.5 text-[11px] font-black"
          style={{ backgroundColor: color }}
        >
          {side}
        </span>
      </div>
      <div className="mt-2 min-h-16">
        {mentor && (
          <>
            <p className="font-black uppercase leading-tight">{mentor.name}</p>
            <p className="text-xs text-white/50">{mentor.title}</p>
            <p className="mt-1 text-xs italic text-amber-200/70">«{mentor.quote}»</p>
          </>
        )}
      </div>
    </div>
  );
}
