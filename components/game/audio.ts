// Весь звук синтезируется на лету (WebAudio + speechSynthesis):
// ноль внешних файлов = нечему упасть на сцене.

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function noiseBuffer(ac: AudioContext, seconds: number): AudioBuffer {
  const buf = ac.createBuffer(1, ac.sampleRate * seconds, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

function thump(freq: number, duration: number, gainV: number) {
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * 0.3), ac.currentTime + duration);
  gain.gain.setValueAtTime(gainV, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + duration);
}

function crunch(duration: number, gainV: number, filterFreq: number) {
  const ac = audio();
  if (!ac) return;
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac, duration);
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(gainV, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
  src.connect(filter).connect(gain).connect(ac.destination);
  src.start();
}

export const sfx = {
  punch() {
    thump(150, 0.12, 0.5);
    crunch(0.08, 0.35, 1200);
  },
  kick() {
    thump(90, 0.18, 0.7);
    crunch(0.12, 0.4, 800);
  },
  special() {
    const ac = audio();
    if (!ac) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900, ac.currentTime + 0.35);
    gain.gain.setValueAtTime(0.25, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.4);
    osc.connect(gain).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + 0.4);
    thump(60, 0.4, 0.8);
  },
  whoosh() {
    crunch(0.1, 0.12, 2500);
  },
  // vine boom, синтезированный честным трудом
  boom() {
    thump(55, 0.9, 1.0);
    crunch(0.5, 0.5, 300);
  },
};

// ---------- Голос ----------

function pickVoice(lang: string): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang.startsWith(lang)) ?? voices[0] ?? null;
}

export function announce(text: string, opts?: { rate?: number; pitch?: number; lang?: string }) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = opts?.lang ?? 'ru-RU';
  u.rate = opts?.rate ?? 0.85;
  u.pitch = opts?.pitch ?? 0.4; // низкий голос MK-аннонсера
  const voice = pickVoice(u.lang);
  if (voice) u.voice = voice;
  window.speechSynthesis.speak(u);
}

export function speakTrashTalk(text: string) {
  // brainrot-режим: случайный питч и скорость
  announce(text, {
    rate: 1.05 + Math.random() * 0.3,
    pitch: 0.5 + Math.random() * 1.2,
  });
}

// прогреваем голоса заранее (в Chrome список пустой до первого запроса)
export function warmupAudio() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.getVoices();
  }
  audio();
}
