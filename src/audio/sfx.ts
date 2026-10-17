/** Efeitos sonoros sintetizados com Web Audio — nenhum arquivo de áudio necessário. */

type Wave = OscillatorType;

class Sfx {
  private ctx: AudioContext | null = null;
  muted = false;

  private ensure(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  /** Deve ser chamado num gesto do usuário para destravar o áudio no celular. */
  unlock() {
    this.ensure();
  }

  private tone(freq: number, endFreq: number, dur: number, wave: Wave = 'sine', vol = 0.15, delay = 0) {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol = 0.12, filterFreq = 1200) {
    const ctx = this.ensure();
    if (!ctx) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
  }

  jump() { this.tone(420, 820, 0.14, 'sine', 0.12); }
  doubleJump() { this.tone(620, 1150, 0.12, 'triangle', 0.1); }
  land() { this.tone(180, 90, 0.07, 'sine', 0.08); }
  dash() { this.noise(0.16, 0.1, 2200); }
  bump(strong: boolean) {
    this.tone(strong ? 240 : 320, strong ? 70 : 140, strong ? 0.2 : 0.1, 'square', strong ? 0.1 : 0.06);
    if (strong) this.noise(0.12, 0.08, 600);
  }
  chest() { [660, 880, 1100, 1320].forEach((f, i) => this.tone(f, f, 0.12, 'triangle', 0.09, i * 0.06)); }
  wind() { this.noise(0.35, 0.14, 900); }
  bubble() { this.tone(300, 900, 0.18, 'sine', 0.12); }
  pop() { this.tone(900, 200, 0.08, 'triangle', 0.12); }
  throwIt() { this.tone(500, 300, 0.12, 'triangle', 0.08); }
  boom() { this.noise(0.4, 0.2, 400); this.tone(160, 50, 0.35, 'sine', 0.15); }
  slip() { this.tone(900, 300, 0.3, 'sawtooth', 0.05); }
  fall() { this.tone(700, 120, 0.7, 'triangle', 0.12); }
  tick() { this.tone(660, 660, 0.08, 'square', 0.05); }
  go() { this.tone(990, 990, 0.25, 'square', 0.06); }
  win() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, f, 0.22, 'triangle', 0.1, i * 0.12)); }
  click() { this.tone(800, 600, 0.05, 'triangle', 0.08); }
}

export const sfx = new Sfx();
