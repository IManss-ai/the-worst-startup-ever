// Чистый TS-движок боя: без React и Three.js, чтобы его нельзя было сломать рендером.
// FightScreen тикает его с фиксированным шагом и читает состояние для отрисовки.

export type AttackKind = 'punch' | 'kick' | 'special';

export interface ActionInput {
  left: boolean;
  right: boolean;
  punch: boolean;
  kick: boolean;
  special: boolean;
}

export const EMPTY_INPUT: ActionInput = {
  left: false,
  right: false,
  punch: false,
  kick: false,
  special: false,
};

export type FighterAnimState =
  | 'idle'
  | 'walk'
  | 'punch'
  | 'kick'
  | 'special'
  | 'hit'
  | 'ko'
  | 'win';

interface AttackSpec {
  windup: number; // сек до активной фазы
  active: number; // окно попадания
  recover: number; // восстановление после
  range: number;
  damage: number;
  knockback: number;
  cooldown: number;
  step: number; // скорость рывка вперёд во время атаки — удар «вкладывается» корпусом
}

const ATTACKS: Record<AttackKind, AttackSpec> = {
  punch: { windup: 0.08, active: 0.12, recover: 0.16, range: 1.3, damage: 7, knockback: 0.4, cooldown: 0, step: 1.6 },
  kick: { windup: 0.18, active: 0.14, recover: 0.26, range: 1.75, damage: 13, knockback: 0.8, cooldown: 0, step: 2.2 },
  special: { windup: 0.38, active: 0.22, recover: 0.4, range: 2.4, damage: 22, knockback: 1.7, cooldown: 4, step: 3.0 },
};

const ARENA_HALF = 4.2;
const WALK_SPEED = 2.6;
const HITSTUN = 0.38;
const MAX_HP = 100;

export interface FighterSim {
  x: number;
  facing: 1 | -1;
  hp: number;
  state: FighterAnimState;
  stateT: number; // сек в текущем состоянии
  attack: AttackKind | null;
  attackLanded: boolean;
  specialCooldown: number;
}

export interface FightEvent {
  type: 'hit' | 'whoosh' | 'ko';
  attacker: 0 | 1;
  kind: AttackKind;
  damage?: number;
  x?: number; // мировая X-координата события (для партиклов/попапов)
}

export function createFighter(side: 0 | 1): FighterSim {
  return {
    x: side === 0 ? -2.2 : 2.2,
    facing: side === 0 ? 1 : -1,
    hp: MAX_HP,
    state: 'idle',
    stateT: 0,
    attack: null,
    attackLanded: false,
    specialCooldown: 0,
  };
}

function isBusy(f: FighterSim): boolean {
  return f.state === 'punch' || f.state === 'kick' || f.state === 'special' || f.state === 'hit' || f.state === 'ko';
}

function setState(f: FighterSim, s: FighterAnimState) {
  f.state = s;
  f.stateT = 0;
}

function attackPhase(f: FighterSim): 'windup' | 'active' | 'recover' | null {
  if (!f.attack) return null;
  const spec = ATTACKS[f.attack];
  if (f.stateT < spec.windup) return 'windup';
  if (f.stateT < spec.windup + spec.active) return 'active';
  if (f.stateT < spec.windup + spec.active + spec.recover) return 'recover';
  return null;
}

function tickFighter(
  f: FighterSim,
  foe: FighterSim,
  input: ActionInput,
  side: 0 | 1,
  dt: number,
  events: FightEvent[],
) {
  f.stateT += dt;
  f.specialCooldown = Math.max(0, f.specialCooldown - dt);
  if (f.state === 'ko' || f.state === 'win') return;

  // всегда смотрим на противника
  f.facing = foe.x >= f.x ? 1 : -1;

  if (f.state === 'hit') {
    if (f.stateT >= HITSTUN) setState(f, 'idle');
    return;
  }

  if (f.attack) {
    const phase = attackPhase(f);
    // рывок корпусом вперёд: атака двигает бойца к противнику
    if (phase === 'windup' || phase === 'active') {
      const spec = ATTACKS[f.attack];
      f.x += f.facing * spec.step * dt;
      f.x = Math.min(ARENA_HALF, Math.max(-ARENA_HALF, f.x));
    }
    if (phase === 'active' && !f.attackLanded) {
      const spec = ATTACKS[f.attack];
      const dist = Math.abs(foe.x - f.x);
      const inFront = Math.sign(foe.x - f.x) === f.facing || dist < 0.5;
      if (dist <= spec.range && inFront && foe.state !== 'ko') {
        f.attackLanded = true;
        foe.hp = Math.max(0, foe.hp - spec.damage);
        foe.x += f.facing * spec.knockback;
        events.push({ type: 'hit', attacker: side, kind: f.attack, damage: spec.damage, x: foe.x });
        if (foe.hp <= 0) {
          setState(foe, 'ko');
          foe.attack = null;
          events.push({ type: 'ko', attacker: side, kind: f.attack, x: foe.x });
        } else {
          setState(foe, 'hit');
          foe.attack = null;
        }
      }
    }
    if (phase === null) {
      f.attack = null;
      setState(f, 'idle');
    }
    return;
  }

  // старт атаки
  if (input.special && f.specialCooldown <= 0) {
    f.attack = 'special';
    f.attackLanded = false;
    f.specialCooldown = ATTACKS.special.cooldown;
    setState(f, 'special');
    events.push({ type: 'whoosh', attacker: side, kind: 'special', x: f.x });
    return;
  }
  if (input.punch) {
    f.attack = 'punch';
    f.attackLanded = false;
    setState(f, 'punch');
    events.push({ type: 'whoosh', attacker: side, kind: 'punch' });
    return;
  }
  if (input.kick) {
    f.attack = 'kick';
    f.attackLanded = false;
    setState(f, 'kick');
    events.push({ type: 'whoosh', attacker: side, kind: 'kick' });
    return;
  }

  // движение
  let vx = 0;
  if (input.left) vx -= WALK_SPEED;
  if (input.right) vx += WALK_SPEED;
  if (vx !== 0) {
    f.x += vx * dt;
    if (f.state !== 'walk') setState(f, 'walk');
  } else if (f.state !== 'idle') {
    setState(f, 'idle');
  }
  f.x = Math.min(ARENA_HALF, Math.max(-ARENA_HALF, f.x));
}

export function tick(
  a: FighterSim,
  b: FighterSim,
  inputA: ActionInput,
  inputB: ActionInput,
  dt: number,
): FightEvent[] {
  const events: FightEvent[] = [];
  tickFighter(a, b, inputA, 0, dt, events);
  tickFighter(b, a, inputB, 1, dt, events);
  // не даём слипнуться
  const dist = Math.abs(a.x - b.x);
  if (dist < 0.7 && a.state !== 'ko' && b.state !== 'ko') {
    const push = (0.7 - dist) / 2;
    if (a.x <= b.x) {
      a.x -= push;
      b.x += push;
    } else {
      a.x += push;
      b.x -= push;
    }
  }
  return events;
}

// ---------- Контроллеры: клавиатура и CPU реализуют один интерфейс ----------

export interface Controller {
  read(self: FighterSim, foe: FighterSim, dt: number): ActionInput;
}

export type KeyMap = {
  left: string[];
  right: string[];
  punch: string[];
  kick: string[];
  special: string[];
};

// Раскладки: у каждого действия может быть несколько клавиш (WASD и стрелки разом).
export const KEYMAP_P1: KeyMap = { left: ['KeyA'], right: ['KeyD'], punch: ['KeyF'], kick: ['KeyG'], special: ['KeyH'] };
export const KEYMAP_P2: KeyMap = { left: ['ArrowLeft'], right: ['ArrowRight'], punch: ['KeyK'], kick: ['KeyL'], special: ['Semicolon'] };
// Одиночная раскладка (свой ноутбук): и WASD, и стрелки
export const KEYMAP_SOLO: KeyMap = {
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  punch: ['KeyF', 'KeyK'],
  kick: ['KeyG', 'KeyL'],
  special: ['KeyH', 'Semicolon', 'Space'],
};

export class KeyboardController implements Controller {
  private pressed = new Set<string>();
  private edge = new Set<string>(); // кнопки-атаки срабатывают по нажатию, не удержанию

  constructor(private keys: KeyMap) {}

  handleKey(code: string, down: boolean) {
    const all = Object.values(this.keys).flat();
    if (!all.includes(code)) return;
    if (down && !this.pressed.has(code)) this.edge.add(code);
    if (down) this.pressed.add(code);
    else this.pressed.delete(code);
  }

  private has(set: Set<string>, codes: string[]): boolean {
    return codes.some((c) => set.has(c));
  }

  read(): ActionInput {
    const input: ActionInput = {
      left: this.has(this.pressed, this.keys.left),
      right: this.has(this.pressed, this.keys.right),
      punch: this.has(this.edge, this.keys.punch),
      kick: this.has(this.edge, this.keys.kick),
      special: this.has(this.edge, this.keys.special),
    };
    this.edge.clear();
    return input;
  }

  // текущее «сырое» состояние для отправки по сети (атаки — по фронту)
  snapshotInput(): ActionInput {
    return this.read();
  }
}

// Контроллер, который кормится инпутами гостя из сети.
// Атаки аккумулируются (не теряем фронт между кадрами хоста).
export class NetRemoteController implements Controller {
  private move: Pick<ActionInput, 'left' | 'right'> = { left: false, right: false };
  private pendingPunch = false;
  private pendingKick = false;
  private pendingSpecial = false;

  push(input: ActionInput) {
    this.move.left = input.left;
    this.move.right = input.right;
    if (input.punch) this.pendingPunch = true;
    if (input.kick) this.pendingKick = true;
    if (input.special) this.pendingSpecial = true;
  }

  read(): ActionInput {
    const out: ActionInput = {
      left: this.move.left,
      right: this.move.right,
      punch: this.pendingPunch,
      kick: this.pendingKick,
      special: this.pendingSpecial,
    };
    this.pendingPunch = false;
    this.pendingKick = false;
    this.pendingSpecial = false;
    return out;
  }
}

export class AIController implements Controller {
  private decisionT = 0;
  private plan: ActionInput = { ...EMPTY_INPUT };
  constructor(private aggression = 0.75) {}

  read(self: FighterSim, foe: FighterSim, dt: number): ActionInput {
    this.decisionT -= dt;
    if (this.decisionT > 0) {
      // атаки — одноразовые импульсы
      const out = { ...this.plan };
      this.plan.punch = false;
      this.plan.kick = false;
      this.plan.special = false;
      return out;
    }
    this.decisionT = 0.12 + Math.random() * 0.2; // «реакция» CPU
    const dist = Math.abs(foe.x - self.x);
    const towardFoe = foe.x > self.x;
    const plan: ActionInput = { ...EMPTY_INPUT };

    if (foe.state === 'ko') return plan;

    if (dist > 2.2) {
      // сближаемся, иногда кидаем спешл издалека
      if (self.specialCooldown <= 0 && dist < 2.6 && Math.random() < 0.35) plan.special = true;
      else if (towardFoe) plan.right = true;
      else plan.left = true;
    } else if (dist > 1.4) {
      if (Math.random() < 0.5) {
        plan.kick = true;
      } else if (towardFoe) plan.right = true;
      else plan.left = true;
    } else {
      const r = Math.random();
      if (r < this.aggression * 0.6) plan.punch = true;
      else if (r < this.aggression) plan.kick = true;
      else {
        // отступаем
        if (towardFoe) plan.left = true;
        else plan.right = true;
      }
    }
    this.plan = plan;
    return { ...plan };
  }
}
