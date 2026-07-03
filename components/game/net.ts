// Онлайн-режим: два транспорта под одним API.
//
// 1) p2p — PeerJS/WebRTC, быстрый путь (низкая задержка на нормальном Wi-Fi).
// 2) relay — MQTT-over-WebSocket через публичный брокер. Ноутбуки НЕ общаются
//    друг с другом напрямую, только наружу в интернет — работает даже на Wi-Fi
//    с изоляцией клиентов (типичная причина «не подключается на одной сети»).
//
// Гость сначала пробует p2p (6с), затем автоматически падает на релей.
// ?relay=1 в URL — принудительно релей. Хост слушает оба пути одновременно.

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
  | { type: 'hello' }
  | { type: 'welcome' }
  | { type: 'pick'; mentorId: string; who: 'host' | 'guest' }
  | { type: 'start'; p1Id: string; p2Id: string }
  | { type: 'input'; input: ActionInput }
  | { type: 'state'; snap: NetSnapshot }
  // reason 'lwt' — брокер сам похоронил клиента (обрыв сокета, авто-реконнект
  // спасёт); 'leave' — человек реально вышел. Гость не должен рвать матч из-за lwt.
  | { type: 'bye'; reason?: 'leave' | 'lwt' };

type Handler = (msg: NetMessage) => void;
export type TransportKind = 'p2p' | 'relay';

/* eslint-disable @typescript-eslint/no-explicit-any */
type PeerConn = any;
type MqttClient = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

const P2P_JOIN_TIMEOUT = 6000;
const RELAY_JOIN_TIMEOUT = 9000;

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

// публичные MQTT-брокеры (проверены на доступность), пробуем по порядку
const BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://test.mosquitto.org:8081',
];

function forceRelay(): boolean {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('relay');
}

export class NetSession {
  role: 'host' | 'guest';
  code: string;
  transport: TransportKind = 'p2p';
  connected = false;
  onPeerConnected: (() => void) | null = null;
  onPeerLost: (() => void) | null = null;

  private peer: PeerConn = null;
  private conn: PeerConn = null;
  private mqtt: MqttClient = null;
  private handlers = new Set<Handler>();

  private constructor(role: 'host' | 'guest', code: string) {
    this.role = role;
    this.code = code;
  }

  private get topicOut(): string {
    return `nfhk/${this.code.toLowerCase()}/${this.role === 'host' ? 'h2c' : 'c2h'}`;
  }
  private get topicIn(): string {
    return `nfhk/${this.code.toLowerCase()}/${this.role === 'host' ? 'c2h' : 'h2c'}`;
  }

  // ---------- ХОСТ: слушаем оба транспорта, побеждает первый подключившийся ----------

  static async host(): Promise<NetSession> {
    const code = randomCode();
    const s = new NetSession('host', code);

    const p2pReady = s.hostP2P().then(
      () => true,
      () => false,
    );
    const relayReady = s.hostRelay().then(
      () => true,
      () => false,
    );
    // комната «создана», как только жив хотя бы один путь
    const [p2pOk, relayOk] = await Promise.all([p2pReady, relayReady]);
    if (!p2pOk && !relayOk) {
      throw new Error('Не удалось создать комнату — проверь интернет');
    }
    return s;
  }

  private async hostP2P(): Promise<void> {
    const { default: Peer } = await import('peerjs');
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('p2p signaling timeout')), 8000);
      this.peer = new Peer(peerId(this.code), PEER_OPTIONS);
      this.peer.on('open', () => {
        clearTimeout(t);
        resolve();
      });
      this.peer.on('error', (e: Error) => {
        clearTimeout(t);
        reject(e);
      });
    });
    this.peer.on('disconnected', () => {
      try {
        this.peer?.reconnect();
      } catch {
        /* peer уничтожен */
      }
    });
    this.peer.on('connection', (conn: PeerConn) => {
      if (this.connected) {
        conn.close();
        return; // соперник уже есть
      }
      conn.on('open', () => this.attachP2P(conn));
      // некоторые версии открывают сразу
      if (conn.open) this.attachP2P(conn);
    });
  }

  private async hostRelay(): Promise<void> {
    const client = await connectAnyBroker(this);
    this.mqtt = client;
    client.subscribe(this.topicIn, { qos: 0 });
    client.on('message', (_topic: string, payload: Uint8Array) => {
      const msg = parseMsg(payload);
      if (!msg) return;
      if (msg.type === 'hello') {
        if (this.connected) return; // место занято (или дубль hello — тоже ок)
        this.transport = 'relay';
        this.connected = true;
        this.sendRelay({ type: 'welcome' });
        this.onPeerConnected?.();
        return;
      }
      if (this.transport === 'relay') this.route(msg);
    });
  }

  // ---------- ГОСТЬ: p2p → фолбэк на релей ----------

  static async join(code: string): Promise<NetSession> {
    const s = new NetSession('guest', code.toUpperCase().trim());

    if (!forceRelay()) {
      try {
        await s.joinP2P();
        return s;
      } catch {
        // прямое соединение не пробилось (изоляция клиентов / NAT) — идём через релей
      }
    }
    try {
      await s.joinRelay();
      return s;
    } catch (e) {
      s.destroy();
      if (e instanceof Error && e.message.includes('не найдена')) throw e;
      throw new Error(
        'Не подключилось ни напрямую, ни через релей. Проверьте интернет на обоих ноутбуках и пересоздайте комнату',
      );
    }
  }

  private async joinP2P(): Promise<void> {
    const { default: Peer } = await import('peerjs');
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('p2p signaling timeout')), 6000);
      this.peer = new Peer(PEER_OPTIONS);
      this.peer.on('open', () => {
        clearTimeout(t);
        resolve();
      });
      this.peer.on('error', (e: Error) => {
        clearTimeout(t);
        reject(e);
      });
    });

    await new Promise<void>((resolve, reject) => {
      const conn = this.peer.connect(peerId(this.code), { reliable: true });
      const t = setTimeout(() => reject(new Error('p2p connect timeout')), P2P_JOIN_TIMEOUT);
      conn.on('open', () => {
        clearTimeout(t);
        this.attachP2P(conn);
        resolve();
      });
      conn.on('error', (e: Error) => {
        clearTimeout(t);
        reject(e);
      });
    });
  }

  private async joinRelay(): Promise<void> {
    const client = await connectAnyBroker(this);
    this.mqtt = client;
    client.subscribe(this.topicIn, { qos: 0 });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Комната не найдена — проверь код (хост должен держать вкладку открытой)')),
        RELAY_JOIN_TIMEOUT,
      );
      // hello шлём несколько раз: хост мог ещё поднимать подписку
      const helloIv = setInterval(() => {
        client.publish(this.topicOut, JSON.stringify({ type: 'hello' }), { qos: 0 });
      }, 1200);
      client.publish(this.topicOut, JSON.stringify({ type: 'hello' }), { qos: 0 });

      client.on('message', (_topic: string, payload: Uint8Array) => {
        const msg = parseMsg(payload);
        if (!msg) return;
        if (msg.type === 'welcome' && !this.connected) {
          clearTimeout(timeout);
          clearInterval(helloIv);
          this.transport = 'relay';
          this.connected = true;
          this.onPeerConnected?.();
          resolve();
          return;
        }
        if (this.connected && this.transport === 'relay') this.route(msg);
      });
    });
  }

  // ---------- Общее ----------

  private attachP2P(conn: PeerConn) {
    if (this.connected) return;
    this.conn = conn;
    this.transport = 'p2p';
    this.connected = true;
    conn.on('data', (raw: unknown) => this.route(raw as NetMessage));
    conn.on('close', () => {
      if (this.transport === 'p2p') {
        this.connected = false;
        this.onPeerLost?.();
      }
    });
    this.onPeerConnected?.();
  }

  private route(msg: NetMessage) {
    if (msg.type === 'bye') {
      // lwt у гостя = у хоста моргнул сокет к брокеру; mqtt.js переподключится,
      // матч продолжится — не рвём. Настоящую смерть хоста ловит watchdog снапшотов.
      if (msg.reason === 'lwt' && this.role === 'guest' && this.transport === 'relay') return;
      this.connected = false;
      this.onPeerLost?.();
      return;
    }
    if (msg.type === 'hello' || msg.type === 'welcome') return;
    this.handlers.forEach((h) => h(msg));
  }

  onMessage(h: Handler): () => void {
    this.handlers.add(h);
    return () => this.handlers.delete(h);
  }

  private sendRelay(msg: NetMessage) {
    try {
      this.mqtt?.publish(this.topicOut, JSON.stringify(msg), { qos: 0 });
    } catch {
      /* брокер переподключается — mqtt.js сам восстановится */
    }
  }

  send(msg: NetMessage) {
    if (!this.connected) return;
    if (this.transport === 'p2p') {
      try {
        this.conn?.send(msg);
      } catch {
        /* канал закрылся между проверкой и отправкой */
      }
    } else {
      this.sendRelay(msg);
    }
  }

  destroy() {
    try {
      if (this.connected) this.send({ type: 'bye', reason: 'leave' });
      this.conn?.close();
      this.peer?.destroy();
      this.mqtt?.end(true);
    } catch {
      /* уже мертво */
    }
    this.connected = false;
    this.handlers.clear();
  }
}

async function connectAnyBroker(s: NetSession): Promise<MqttClient> {
  const { default: mqtt } = await import('mqtt');
  let lastErr: unknown = null;
  for (const url of BROKERS) {
    try {
      const client = await new Promise<MqttClient>((resolve, reject) => {
        const c = mqtt.connect(url, {
          connectTimeout: 5000,
          clientId: `nfhk-${s.role}-${s.code.toLowerCase()}-${Math.random().toString(36).slice(2, 8)}`,
          clean: true,
          // если вкладку закрыли — соперник получит bye автоматически
          will: {
            topic: `nfhk/${s.code.toLowerCase()}/${s.role === 'host' ? 'h2c' : 'c2h'}`,
            payload: JSON.stringify({ type: 'bye', reason: 'lwt' }),
            qos: 0,
            retain: false,
          },
        });
        const t = setTimeout(() => {
          c.end(true);
          reject(new Error('broker timeout'));
        }, 6000);
        c.once('connect', () => {
          clearTimeout(t);
          resolve(c);
        });
        c.once('error', (e: Error) => {
          clearTimeout(t);
          c.end(true);
          reject(e);
        });
      });
      return client;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Все релей-брокеры недоступны');
}

function parseMsg(payload: Uint8Array): NetMessage | null {
  try {
    return JSON.parse(new TextDecoder().decode(payload)) as NetMessage;
  } catch {
    return null;
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
