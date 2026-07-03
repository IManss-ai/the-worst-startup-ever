'use client';

import { useState } from 'react';
import { MENTORS, mentorById } from '@/lib/mentors';
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
  const { p1Id, p2Id, mode, netRole, netCode, netStatus, netError, set } = useHud();
  const [joinCode, setJoinCode] = useState('');

  const isOnline = mode === 'online';
  const onlineReady = netStatus === 'connected';

  function pick(id: string) {
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
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#0b0910] px-4 py-8 text-white">
      <p className="text-xs uppercase tracking-[0.5em] text-red-500">nFactorial</p>
      <h1
        className="text-center font-black uppercase leading-none tracking-tight"
        style={{
          fontSize: 'clamp(2.4rem, 7vw, 5rem)',
          textShadow: '0 0 40px rgba(255,45,85,0.45)',
        }}
      >
        HELL KOMBAT
      </h1>
      <p className="max-w-xl text-center text-sm text-white/50">
        Два ментора дали вам противоположные советы. Платформа определит, чей совет становится{' '}
        <span className="text-red-400">юридически обязательным</span>.
      </p>

      <div className="flex flex-wrap justify-center gap-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => set({ mode: m.id })}
            className={`rounded-md border px-4 py-2 text-sm font-bold uppercase tracking-wider transition ${
              mode === m.id
                ? 'border-red-500 bg-red-500/20 text-red-300'
                : 'border-white/15 bg-white/5 text-white/60 hover:border-white/40'
            }`}
            title={m.hint}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* онлайн-панель */}
      {isOnline && (
        <div className="w-full max-w-xl rounded-lg border border-white/10 bg-white/5 p-4 text-center">
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
                  className="w-24 rounded-md border border-white/20 bg-black/40 px-3 py-2 text-center font-black uppercase tracking-[0.3em] outline-none focus:border-red-500"
                />
                <button
                  onClick={() => joinCode.length === 4 && onJoin(joinCode)}
                  disabled={joinCode.length !== 4}
                  className="rounded-md border border-white/20 px-4 py-2 font-bold uppercase tracking-wider text-white/70 hover:border-white/50 disabled:opacity-30"
                >
                  Войти
                </button>
              </div>
            </div>
          )}
          {netStatus === 'hosting' && (
            <div>
              <p className="text-xs uppercase tracking-widest text-white/40">Код комнаты — продиктуй сопернику</p>
              <p className="my-2 font-black tracking-[0.4em] text-red-400" style={{ fontSize: '3rem' }}>
                {netCode}
              </p>
              <p className="animate-pulse text-sm text-white/40">Ждём соперника…</p>
            </div>
          )}
          {netStatus === 'joining' && <p className="animate-pulse text-sm text-white/50">Подключаемся к комнате {netCode}…</p>}
          {netStatus === 'connected' && (
            <div>
              <p className="text-sm font-bold text-green-400">✓ Соединение установлено · комната {netCode}</p>
              <p className="mt-1 text-xs text-white/50">
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
                className="mt-2 rounded-md border border-white/20 px-4 py-1.5 text-xs uppercase tracking-wider text-white/60 hover:border-white/50"
              >
                Попробовать снова
              </button>
            </div>
          )}
        </div>
      )}

      {/* VS-строка выбора */}
      <div className="flex items-center gap-4 text-center">
        <SlotBadge label="P1" mentor={p1Id ? mentorById(p1Id) : null} color="#0a84ff" />
        <span className="font-black text-red-500" style={{ fontSize: '1.6rem' }}>
          VS
        </span>
        <SlotBadge label="P2" mentor={p2Id ? mentorById(p2Id) : null} color="#ff2d55" />
      </div>

      <div className="grid w-full max-w-5xl grid-cols-2 gap-3 sm:grid-cols-3">
        {MENTORS.map((m) => {
          const isP1 = p1Id === m.id;
          const isP2 = p2Id === m.id;
          const dimmed = isOnline && onlineReady && myOnlineSlot !== m.id && (isP1 || isP2);
          return (
            <button
              key={m.id}
              onClick={() => pick(m.id)}
              className={`group relative rounded-lg border p-4 text-left transition hover:-translate-y-0.5 ${
                isP1
                  ? 'border-blue-400 bg-blue-500/10 shadow-[0_0_20px_rgba(10,132,255,0.25)]'
                  : isP2
                    ? 'border-red-400 bg-red-500/10 shadow-[0_0_20px_rgba(255,45,85,0.25)]'
                    : 'border-white/10 bg-white/5 hover:border-white/40'
              } ${dimmed ? 'opacity-80' : ''}`}
            >
              {(isP1 || isP2) && (
                <span
                  className={`absolute right-2 top-2 rounded px-2 py-0.5 text-[10px] font-black ${
                    isP1 ? 'bg-blue-500' : 'bg-red-500'
                  }`}
                >
                  {isP1 ? 'P1' : 'P2'}
                </span>
              )}
              <div className="mb-3 h-2 w-10 rounded-full" style={{ backgroundColor: m.color }} />
              <p className="font-black uppercase">{m.name}</p>
              <p className="text-xs text-white/50">{m.title}</p>
              <p className="mt-2 text-xs italic text-white/40">«{m.quote}»</p>
              <p className="mt-2 text-[10px] uppercase tracking-wider text-white/30">
                Спешл: {m.special} {modelMap[m.id] ? '· 3D ✓' : ''}
              </p>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={randomPick}
          className="rounded-md border border-white/15 px-5 py-3 text-sm font-bold uppercase tracking-wider text-white/60 hover:border-white/40"
        >
          {isOnline ? 'Случайный боец' : 'Случайный конфликт'}
        </button>
        <button
          onClick={onStart}
          disabled={!canStart}
          className={`rounded-md px-8 py-3 text-lg font-black uppercase tracking-widest transition ${
            canStart
              ? 'bg-red-600 text-white shadow-[0_0_30px_rgba(255,45,85,0.5)] hover:bg-red-500'
              : 'cursor-not-allowed bg-white/10 text-white/30'
          }`}
        >
          {isOnline && netRole === 'guest' ? 'Ждём хоста' : 'В бой →'}
        </button>
      </div>
      <p className="text-[11px] text-white/25">
        {isOnline
          ? 'Каждый на своём ноутбуке: A/D или ←/→ — движение · F — удар · G — пинок · H или пробел — спешл'
          : 'P1: A/D + F/G/H · P2: ←/→ + K/L/; · Спешл — с кулдауном 4с'}
      </p>
    </div>
  );
}

function SlotBadge({ label, mentor, color }: { label: string; mentor: ReturnType<typeof mentorById> | null; color: string }) {
  return (
    <div className="min-w-36 rounded-md border border-white/10 bg-white/5 px-4 py-2">
      <p className="text-[10px] font-black uppercase tracking-widest" style={{ color }}>
        {label}
      </p>
      <p className="font-black uppercase">{mentor ? mentor.name : '—'}</p>
    </div>
  );
}
