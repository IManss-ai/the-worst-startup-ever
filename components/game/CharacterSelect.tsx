'use client';

import { MENTORS } from '@/lib/mentors';
import { useHud, type GameMode } from './store';

const MODES: { id: GameMode; label: string; hint: string }[] = [
  { id: 'pvp', label: '2 ИГРОКА', hint: 'WASD+FGH против ←→+KL;' },
  { id: 'cpu', label: 'ПРОТИВ CPU', hint: 'вы против алгоритма менторства' },
  { id: 'auto', label: 'АВТО-БОЙ', hint: 'менторы решают сами (режим демо)' },
];

export default function CharacterSelect({
  modelMap,
  onStart,
}: {
  modelMap: Record<string, boolean>;
  onStart: () => void;
}) {
  const { p1Id, p2Id, mode, set } = useHud();

  function pick(id: string) {
    if (!p1Id) {
      set({ p1Id: id });
    } else if (!p2Id && id !== p1Id) {
      set({ p2Id: id });
    } else if (id === p1Id) {
      set({ p1Id: p2Id, p2Id: null });
    } else {
      set({ p2Id: id });
    }
  }

  function randomPick() {
    const shuffled = [...MENTORS].sort(() => Math.random() - 0.5);
    set({ p1Id: shuffled[0].id, p2Id: shuffled[1].id });
  }

  const ready = p1Id && p2Id;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0b0910] px-4 py-10 text-white">
      <p className="text-xs uppercase tracking-[0.4em] text-red-500">MESH · Разрешение конфликта</p>
      <h1 className="text-center font-black uppercase leading-none" style={{ fontSize: 'clamp(2rem, 6vw, 4.5rem)' }}>
        Выберите менторов
      </h1>
      <p className="max-w-xl text-center text-sm text-white/50">
        Два ментора дали вам противоположные советы. Выберите обоих — платформа определит, чей совет
        становится <span className="text-red-400">юридически обязательным</span>.
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

      <div className="grid w-full max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3">
        {MENTORS.map((m) => {
          const isP1 = p1Id === m.id;
          const isP2 = p2Id === m.id;
          return (
            <button
              key={m.id}
              onClick={() => pick(m.id)}
              className={`group relative rounded-lg border p-4 text-left transition ${
                isP1
                  ? 'border-blue-400 bg-blue-500/10'
                  : isP2
                    ? 'border-red-400 bg-red-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/40'
              }`}
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
              <div
                className="mb-3 h-2 w-10 rounded-full"
                style={{ backgroundColor: m.color }}
              />
              <p className="font-black uppercase">{m.name}</p>
              <p className="text-xs text-white/50">{m.title}</p>
              <p className="mt-2 text-xs italic text-white/40">«{m.quote}»</p>
              <p className="mt-2 text-[10px] uppercase tracking-wider text-white/30">
                Спешл: {m.special} · {modelMap[m.id] ? '3D-модель ✓' : 'аватар-заглушка'}
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
          Случайный конфликт
        </button>
        <button
          onClick={onStart}
          disabled={!ready}
          className={`rounded-md px-8 py-3 text-lg font-black uppercase tracking-widest transition ${
            ready
              ? 'bg-red-600 text-white shadow-[0_0_30px_rgba(255,45,85,0.5)] hover:bg-red-500'
              : 'cursor-not-allowed bg-white/10 text-white/30'
          }`}
        >
          В бой →
        </button>
      </div>
      <p className="text-[11px] text-white/25">
        P1: A/D — движение, F — удар, G — пинок, H — спешл · P2: ←/→, K, L, ; — спешл
      </p>
    </div>
  );
}
