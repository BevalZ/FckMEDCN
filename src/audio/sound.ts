import type { PaletteName } from '../ui/pixelArt';

// 所有音频均由 Web Audio 在运行时合成，不分发来源不明的外部采样或 BGM 文件。
// 浏览器自动播放策略要求 AudioContext 在用户手势后才能发声，故 ensure() 在首个手势调用。

type Osc = OscillatorType;

class SoundManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;
  private bgmNodes: OscillatorNode[] = [];
  private bgmGain: GainNode | null = null;
  private currentBgmMood: string | null = null;
  private lastKeytick = 0;

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
  click() { this.synthClick(); }

  private synthClick() { this.blip(620, 0, 0.06, 'square', 0.16); }

  /** 按键 tick：更轻、略高音，节流避免长按连发 */
  keytick() {
    const now = Date.now();
    if (now - this.lastKeytick < 55) return;
    this.lastKeytick = now;
    this.blip(760, 0, 0.035, 'square', 0.07);
  }

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

  // —— 环境 BGM：低音量合成和弦，按阶段切换 ——
  private readonly BGM_CHORDS: Record<string, readonly number[]> = {
    bright: [130.81, 196.0, 261.63],
    tense: [110.0, 164.81, 220.0],
  };

  private moodForStage(stage: string): string {
    return ['guipei', 'master', 'phd', 'career', 'pinnacle', 'retirement', 'eternity'].includes(stage)
      ? 'tense'
      : 'bright';
  }

  private startSynthBgm(mood: string) {
    if (!this.ctx || !this.master || this.muted) return;
    if (this.currentBgmMood === mood && this.bgmNodes.length > 0) return;
    this.stopBgmNodes();

    const gain = this.ctx.createGain();
    gain.gain.value = 0.028;
    gain.connect(this.master);
    this.bgmGain = gain;
    const frequencies = this.BGM_CHORDS[mood] ?? this.BGM_CHORDS.bright;
    frequencies.forEach((frequency, index) => {
      const oscillator = this.ctx!.createOscillator();
      oscillator.type = index === 0 ? 'sine' : 'triangle';
      oscillator.frequency.value = frequency;
      oscillator.detune.value = index === 1 ? -4 : index === 2 ? 4 : 0;
      oscillator.connect(gain);
      oscillator.start();
      this.bgmNodes.push(oscillator);
    });
    this.currentBgmMood = mood;
  }

  private stopBgmNodes() {
    for (const oscillator of this.bgmNodes) {
      try { oscillator.stop(); } catch { /* 已停止时忽略 */ }
      oscillator.disconnect();
    }
    this.bgmNodes = [];
    this.bgmGain?.disconnect();
    this.bgmGain = null;
  }

  /** 标题屏等无明确阶段处启动默认 BGM */
  startBgm() { this.setBgmMood('default'); }

  setBgmMood(stage: string | PaletteName) {
    const mood = this.moodForStage(stage as string);
    this.currentBgmMood = mood;
    this.startSynthBgm(mood);
  }

  /** 用户手势后调用：恢复 AudioContext 并启动已选定的合成氛围。 */
  unlockAudio() {
    this.ensure();
    if (this.currentBgmMood) this.startSynthBgm(this.currentBgmMood);
  }

  stopBgm() {
    this.stopBgmNodes();
    this.currentBgmMood = null;
  }
}

export const sound = new SoundManager();
