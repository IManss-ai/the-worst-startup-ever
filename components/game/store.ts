import { create } from 'zustand';

export type GamePhase = 'select' | 'intro' | 'fight' | 'roundEnd' | 'fatality' | 'matchEnd';
export type GameMode = 'pvp' | 'cpu' | 'auto' | 'online';
export type NetStatus = 'idle' | 'hosting' | 'joining' | 'connected' | 'error';

interface HudState {
  phase: GamePhase;
  mode: GameMode;
  netRole: 'host' | 'guest' | null;
  netCode: string;
  netStatus: NetStatus;
  netError: string;
  netTransport: '' | 'p2p' | 'relay';
  p1Id: string | null;
  p2Id: string | null;
  hp1: number;
  hp2: number;
  round: number;
  wins1: number;
  wins2: number;
  timer: number;
  announcement: string;
  subtitle: string; // трешток внизу экрана
  finishHimShown: boolean;
  set: (patch: Partial<Omit<HudState, 'set'>>) => void;
}

export const useHud = create<HudState>((set) => ({
  phase: 'select',
  mode: 'pvp',
  netRole: null,
  netCode: '',
  netStatus: 'idle',
  netError: '',
  netTransport: '',
  p1Id: null,
  p2Id: null,
  hp1: 100,
  hp2: 100,
  round: 1,
  wins1: 0,
  wins2: 0,
  timer: 60,
  announcement: '',
  subtitle: '',
  finishHimShown: false,
  set: (patch) => set(patch),
}));

// Локальный пул трештока: мгновенно и без сети (API — вишенка сверху).
export const LOCAL_TRASH_POOL = [
  'Твой ретеншн — как твоя стойка. Нулевой.',
  'Это был не апперкот. Это был down round.',
  'Пивот в челюсть. Классика.',
  'Твой runway кончился на втором раунде.',
  'CAC растёт, LTV падает, ты — тоже.',
  'Совет отклонён. Юридически.',
  'Ты не в product-market fit. Ты в нокауте.',
  'Growth hacking не спасёт твою защиту.',
];

export function localTrashLine(): string {
  return LOCAL_TRASH_POOL[Math.floor(Math.random() * LOCAL_TRASH_POOL.length)];
}

export async function fetchTrashTalk(winner: string, loser: string, event: string): Promise<string> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3500);
    const res = await fetch('/api/trashtalk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ winner, loser, event }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) throw new Error('bad status');
    const data = (await res.json()) as { line?: string };
    return data.line || localTrashLine();
  } catch {
    return localTrashLine();
  }
}
