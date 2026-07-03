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
      s.peer = new Peer(peerId(code));
      s.peer.on('open', () => resolve());
      s.peer.on('error', (e: Error) => reject(e));
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
      s.peer = new Peer();
      s.peer.on('open', () => resolve());
      s.peer.on('error', (e: Error) => reject(e));
    });
    const conn = s.peer.connect(peerId(s.code), { reliable: false });
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('Не удалось подключиться — проверь код комнаты')), 10000);
      conn.on('open', () => {
        clearTimeout(t);
        resolve();
      });
      conn.on('error', (e: Error) => {
        clearTimeout(t);
        reject(e);
      });
    });
    s.attach(conn);
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

function peerId(code: string): string {
  return `nfhk-arena-${code.toLowerCase()}`;
}

function randomCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // без похожих символов
  let out = '';
  for (let i = 0; i < 4; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
