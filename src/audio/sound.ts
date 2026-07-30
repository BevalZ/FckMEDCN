import type { PaletteName } from '../ui/pixelArt';

// 纯 Web Audio 生成的音效与 BGM（不依赖任何外部音频文件）
// 浏览器自动播放策略要求 AudioContext 在用户手势后才能发声，故 ensure() 在首个手势调用。

type Osc = OscillatorType;

const MOOD: Record<string, number> = {
  gaokao: 130.81,
  undergrad: 116.54,
  internship: 110.0,
  guipei: 103.83,
  master: 98.0,
  phd: 92.5,
  jobhunt: 123.47,
  career: 110.0,
  default: 110.0,
};

class SoundManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private bgmOscs: OscillatorNode[] = [];
  private bgmLfo: OscillatorNode | null = null;
  private bgmStarted = false;
  private muted = false;

  ensure() {
    try {
      if (!this.ctx) {
        const Ctor: typeof AudioContext =
          window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.9;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      /* 音频不可用时静默降级 */
    }
  }

  get isMuted() { return this.muted; }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.9;
  }

  private blip(freq: number, start: number, dur: number, type: Osc, vol: number, slideTo?: number) {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  private arp(notes: number[], step: number, type: Osc, vol: number) {
    notes.forEach((f, i) => this.blip(f, i * step, step + 0.05, type, vol));
  }

  // —— 交互音效 ——
  click() { this.blip(620, 0, 0.06, 'square', 0.16); }

  /** 行走脚步：短促低频噪声感 blip，左右脚略有音高差 */
  footstep(right = false) {
    this.blip(right ? 95 : 85, 0, 0.04, 'triangle', 0.07);
  }

  good() { this.arp([523.25, 659.25, 783.99], 0.07, 'triangle', 0.18); }

  bad() { this.arp([392.0, 311.13, 246.94], 0.08, 'sawtooth', 0.16); }

  news() { this.blip(880, 0, 0.06, 'square', 0.14); this.blip(1174.66, 0.1, 0.07, 'square', 0.14); }

  transition() { this.blip(520, 0, 0.45, 'sawtooth', 0.12, 120); }

  crisis() {
    this.blip(70, 0, 0.9, 'sine', 0.22);
    this.blip(73.5, 0, 0.9, 'sine', 0.18);
    this.blip(180, 0, 0.7, 'sawtooth', 0.1, 90);
  }

  // —— 结局配乐（按基调短动机）——
  ending(tone: string) {
    const t = tone || 'default';
    if (t === 'hopeful') this.arp([523.25, 659.25, 783.99, 1046.5], 0.16, 'triangle', 0.2);
    else if (t === 'escape') this.arp([659.25, 783.99, 987.77, 1318.5], 0.12, 'square', 0.16);
    else if (t === 'bittersweet') { this.arp([523.25, 659.25], 0.18, 'triangle', 0.18); this.arp([392, 311.13], 0.2, 'sine', 0.16); }
    else if (t === 'resigned') this.arp([392.0, 311.13, 261.63], 0.22, 'sine', 0.16);
    else if (t === 'satirical') this.arp([440, 466.16, 440, 587.33], 0.1, 'square', 0.14);
    else if (t === 'dark') { this.blip(220, 0, 0.8, 'sawtooth', 0.16, 110); this.blip(233, 0, 0.8, 'sine', 0.14); }
    else this.arp([329.63, 311.13, 261.63], 0.2, 'sine', 0.16); // bitter / 默认
  }

  // —— 环境 BGM：低沉小调 pad + 缓慢 tremolo ——
  startBgm() {
    this.ensure();
    if (!this.ctx || !this.master || this.bgmStarted) return;
    const ctx = this.ctx;
    this.bgmGain = ctx.createGain();
    this.bgmGain.gain.value = 0.0001;
    this.bgmGain.connect(this.master);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 620;
    lp.connect(this.bgmGain);

    const root = MOOD.default;
    const ratios = [1, 1.1892, 1.4983]; // 根音 / 小三度 / 纯五度
    this.bgmOscs = ratios.map((r, i) => {
      const o = ctx.createOscillator();
      o.type = i === 0 ? 'sine' : 'triangle';
      o.frequency.value = root * r;
      o.detune.value = (i - 1) * 4;
      o.connect(lp);
      o.start();
      return o;
    });

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.12;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain);
    lfoGain.connect(this.bgmGain.gain);
    lfo.start();
    this.bgmLfo = lfo;

    this.bgmGain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 2.5);
    this.bgmStarted = true;
  }

  setBgmMood(stage: string | PaletteName) {
    if (!this.bgmStarted) this.startBgm();
    if (!this.ctx || this.bgmOscs.length === 0) return;
    const root = MOOD[stage as string] ?? MOOD.default;
    const ratios = [1, 1.1892, 1.4983];
    const t = this.ctx.currentTime;
    this.bgmOscs.forEach((o, i) => o.frequency.exponentialRampToValueAtTime(root * ratios[i], t + 1.6));
  }

  stopBgm() {
    if (!this.bgmStarted || !this.ctx || !this.bgmGain) return;
    const t = this.ctx.currentTime;
    this.bgmGain.gain.cancelScheduledValues(t);
    this.bgmGain.gain.setValueAtTime(Math.max(0.0001, this.bgmGain.gain.value), t);
    this.bgmGain.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
    const oscs = this.bgmOscs;
    const lfo = this.bgmLfo;
    window.setTimeout(() => {
      oscs.forEach((o) => { try { o.stop(); } catch { /* 已停止 */ } });
      try { lfo?.stop(); } catch { /* 已停止 */ }
    }, 1200);
    this.bgmStarted = false;
    this.bgmOscs = [];
    this.bgmLfo = null;
  }
}

export const sound = new SoundManager();
