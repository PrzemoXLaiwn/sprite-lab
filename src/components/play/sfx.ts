// =============================================================================
// Tower SFX — tiny chiptune sounds synthesized with WebAudio (no audio files)
// =============================================================================
// The AudioContext is created on the first user gesture (browsers require
// it). Mute is remembered in localStorage (wrapped: private mode just won't
// remember). Rapid hits are throttled so long fights don't turn into noise.
// =============================================================================

export type Sfx = "hit" | "crit" | "weak" | "ko" | "climb" | "chest" | "record" | "boss" | "fall" | "pick";

const KEY = "sl-tower-muted";
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let lastHit = 0;

export function loadMuted(): boolean {
  try { muted = localStorage.getItem(KEY) === "1"; } catch { muted = false; }
  return muted;
}

export function setMuted(m: boolean): void {
  muted = m;
  try { localStorage.setItem(KEY, m ? "1" : "0"); } catch { /* not remembered */ }
  if (master) master.gain.value = m ? 0 : 0.18;
}

/** Call from a click / tap handler. */
export function unlockAudio(): void {
  if (typeof window === "undefined") return;
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.18;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
  } catch { ctx = null; }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType, vol = 1, slideTo?: number) {
  if (!ctx || !master) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(master);
  o.start(start);
  o.stop(start + dur + 0.02);
}

function noise(start: number, dur: number, vol = 0.6) {
  if (!ctx || !master) return;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let seed = 12345;
  for (let i = 0; i < len; i++) { seed = (seed * 16807) % 2147483647; d[i] = (seed / 2147483647) * 2 - 1; }
  const src = ctx.createBufferSource();
  const g = ctx.createGain();
  src.buffer = buf;
  g.gain.setValueAtTime(vol, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(g).connect(master);
  src.start(start);
}

export function play(s: Sfx): void {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  if (s === "hit" || s === "weak") {
    if (t - lastHit < 0.06) return;
    lastHit = t;
  }
  switch (s) {
    case "hit": tone(220, t, 0.07, "square", 0.5, 110); noise(t, 0.04, 0.25); break;
    case "weak": tone(330, t, 0.06, "square", 0.5, 160); tone(495, t + 0.05, 0.06, "square", 0.4); break;
    case "crit": tone(660, t, 0.06, "square", 0.6); tone(990, t + 0.06, 0.1, "square", 0.6, 1320); noise(t, 0.08, 0.35); break;
    case "ko": tone(400, t, 0.18, "triangle", 0.7, 80); noise(t + 0.02, 0.12, 0.3); break;
    case "climb": [262, 330, 392].forEach((f, i) => tone(f, t + i * 0.07, 0.08, "triangle", 0.5)); break;
    case "chest": [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.08, 0.12, "square", 0.35)); break;
    case "record": [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.11, i === 4 ? 0.4 : 0.12, "square", 0.45)); break;
    case "boss": tone(70, t, 0.6, "sawtooth", 0.5, 45); noise(t, 0.5, 0.2); break;
    case "fall": [392, 330, 262, 196].forEach((f, i) => tone(f, t + i * 0.14, 0.16, "triangle", 0.5)); break;
    case "pick": tone(784, t, 0.05, "square", 0.4); tone(1175, t + 0.05, 0.08, "square", 0.4); break;
  }
}
