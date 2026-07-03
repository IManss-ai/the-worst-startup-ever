// Онлайн-режим: два ноутбука, PeerJS (WebRTC DataChannel, публичный брокер —
// без ключей и своего сервера). Хост авторитетен: движок тикает только у него,
// гость шлёт инпуты и рендерит снапшоты. Файтингу на локальном вайфае хватает.

import type { ActionInput, FighterSim, FightEvent } from './engine';
import type { GamePhase } from './store';

export interface NetSnapshot {
  a: Pick<FighterSim, 'x' | 'facing' | 'hp' | 'state' | 'stateT'>;
  b: Pick<FighterSim, 'x' | 'facing' | 'hp' | 'state' | 'stateT'>;
  hud: {
    phase: GamePhase;
    round: number;
    wins1: number;
    wins2: number;
    timer: number;
    announcement: string;
    subtitle: string;
  };
  events: FightEvent[];
}

export type NetMessage =
  | { type: 'hello'; name: string }
  | { type: 'pick'; mentorId: string; who: 'host' | 'guest' }
  | { type: 'start'; p1Id: string; p2Id: string }
  | { type: 'input'; input: ActionInput }
  | { type: 'state'; snap: NetSnapshot }
  | { type: 'bye' };

type Handler = (msg: NetMessage) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PeerConn = any;

export class NetSession {
  role: 'host' | 'guest';
  code: string;
  private peer: PeerConn = null;
  private conn: PeerConn = null;
  private handlers = new Set<Handler>();
  onPeerConnected: (() => void) | null = null;
  onPeerLost: (() => void) | null = null;
  connected = false;

  private constructor(role: 'host' | 'guest', code: string) {
    this.role = role;
    this.code = code;
  }

  static async host(): Promise<NetSession> {
    const code = randomCode();
    const s = new NetSession('host', code);
    const { default: Peer } = await import('peerjs');
    await new Promise<void>((resolve, reject) => {
      s.peer = new Peer(peerId(code), PEER_OPTIONS);
      s.peer.on('open', () => resolve());
      s.peer.on('error', (e: Error) => reject(humanizeError(e)));
    });
    // брокер иногда рвёт соединение — тихо переподключаемся, чтобы код комнаты жил
    s.peer.on('disconnected', () => {
      try {
        s.peer?.reconnect();
      } catch {
        // peer уже уничтожен
      }
    });
    s.peer.on('connection', (conn: PeerConn) => {
      if (s.conn) {
        conn.close();
        return; // третий лишний
      }
      s.attach(conn);
    });
    return s;
  }

  static async join(code: string): Promise<NetSession> {
    const s = new NetSession('guest', code.toUpperCase().trim());
    const { default: Peer } = await import('peerjs');
    await new Promise<void>((resolve, reject) => {
      s.peer = new Peer(PEER_OPTIONS);
      s.peer.on('open', () => resolve());
      s.peer.on('error', (e: Error) => reject(humanizeError(e)));
    });

    const attempt = () =>
      new Promise<PeerConn>((resolve, reject) => {
        // reliable: потеря пакета с ударом = удар не случился; на LAN ретрансмит дешевле
        const conn = s.peer.connect(peerId(s.code), { reliable: true });
        const t = setTimeout(
          () =>
            reject(
              new Error(
                'Соединение не установилось. Подключите ОБА ноутбука к одному Wi-Fi (или раздайте точку доступа с телефона) и попробуйте снова',
              ),
            ),
          12000,
        );
        const onPeerError = (e: Error & { type?: string }) => {
          if (e.type === 'peer-unavailable') {
            clearTimeout(t);
            reject(new Error('Комната не найдена — проверь код (хост должен держать вкладку открытой)'));
          }
        };
        s.peer.on('error', onPeerError);
        conn.on('open', () => {
          clearTimeout(t);
          s.peer.off?.('error', onPeerError);
          resolve(conn);
        });
        conn.on('error', (e: Error) => {
          clearTimeout(t);
          reject(humanizeError(e));
        });
      });

    try {
      s.attach(await attempt());
    } catch (e) {
      // «комната не найдена» — не ретраим (код неверный); сетевые сбои — одна повторная попытка
      if (e instanceof Error && e.message.includes('не найдена')) throw e;
      s.attach(await attempt());
    }
    return s;
  }

  private attach(conn: PeerConn) {
    this.conn = conn;
    this.connected = true;
    conn.on('data', (raw: unknown) => {
      const msg = raw as NetMessage;
      this.handlers.forEach((h) => h(msg));
    });
    conn.on('close', () => {
      this.connected = false;
      this.onPeerLost?.();
    });
    this.onPeerConnected?.();
  }

  onMessage(h: Handler): () => void {
    this.handlers.add(h);
    return () => this.handlers.delete(h);
  }

  send(msg: NetMessage) {
    if (this.conn && this.connected) {
      try {
        this.conn.send(msg);
      } catch {
        // канал закрылся между проверкой и отправкой — переживём
      }
    }
  }

  destroy() {
    try {
      this.send({ type: 'bye' });
      this.conn?.close();
      this.peer?.destroy();
    } catch {
      // уже мертво
    }
    this.connected = false;
    this.handlers.clear();
  }
}

// ВАЖНО: мёртвые TURN-серверы в iceServers отравляют ICE-переговоры таймаутами
// (openrelay.metered.ca закрылся — проверено, хост недостижим). Держим только
// живые STUN (проверены STUN-запросом). TURN можно добавить через env без кода:
// NEXT_PUBLIC_TURN_URL / NEXT_PUBLIC_TURN_USER / NEXT_PUBLIC_TURN_PASS
// (бесплатные 20GB даёт https://www.metered.ca/stun-turn после регистрации).
const iceServers: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
];
if (process.env.NEXT_PUBLIC_TURN_URL && process.env.NEXT_PUBLIC_TURN_USER) {
  iceServers.push({
    urls: process.env.NEXT_PUBLIC_TURN_URL,
    username: process.env.NEXT_PUBLIC_TURN_USER,
    credential: process.env.NEXT_PUBLIC_TURN_PASS ?? '',
  });
}

const PEER_OPTIONS = { config: { iceServers } };

function humanizeError(e: Error & { type?: string }): Error {
  switch (e.type) {
    case 'peer-unavailable':
      return new Error('Комната не найдена — проверь код (хост должен держать вкладку открытой)');
    case 'network':
    case 'server-error':
    case 'socket-error':
    case 'socket-closed':
      return new Error('Нет связи с сервером комнат — проверь интернет и попробуй ещё раз');
    case 'unavailable-id':
      return new Error('Код комнаты занят — создай новую комнату');
    default:
      return e;
  }
}

function peerId(code: string): string {
  return `nfhk-arena-${code.toLowerCase()}`;
}

function randomCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // без похожих символов
  let out = '';
  for (let i = 0; i < 4; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
