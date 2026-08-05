import type { PaletteName } from '../ui/pixelArt';

// 纯 Web Audio 生成的音效与 BGM（不依赖任何外部音频文件）
// 浏览器自动播放策略要求 AudioContext 在用户手势后才能发声，故 ensure() 在首个手势调用。

type Osc = OscillatorType;

class SoundManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;
  // 文件化 BGM（两首 MP3，按阶段切换，循环播放）
  private bgmAudio: HTMLAudioElement | null = null;
  private currentBgmUrl: string | null = null;
  private bgmVolume = 0.5;
  // 按键 / 点击采样（下载的 CC0 音效，失败回退合成）
  private clickAudio: HTMLAudioElement | null = null;
  private keytickAudio: HTMLAudioElement | null = null;
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
    if (this.bgmAudio) this.bgmAudio.volume = this.muted ? 0 : this.bgmVolume;
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
  /** 优先播放真实采样（UI 点击音），不可用时回退合成 blip */
  click() {
    const a = this.lazySample('click');
    if (a) {
      a.volume = this.muted ? 0 : 0.5;
      a.currentTime = 0;
      void a.play().catch(() => this.synthClick());
      return;
    }
    this.synthClick();
  }

  private synthClick() { this.blip(620, 0, 0.06, 'square', 0.16); }

  /** 按键 tick：更轻、略高音，节流避免长按连发 */
  keytick() {
    const now = Date.now();
    if (now - this.lastKeytick < 55) return;
    this.lastKeytick = now;
    const a = this.lazySample('keytick');
    if (a) {
      a.volume = this.muted ? 0 : 0.32;
      a.currentTime = 0;
      void a.play().catch(() => { /* 忽略 */ });
    }
  }

  /** 懒加载一个采样音轨；首次访问时创建 HTMLAudioElement */
  private lazySample(kind: 'click' | 'keytick'): HTMLAudioElement | null {
    if (kind === 'click') {
      if (!this.clickAudio) {
        try { this.clickAudio = new Audio('/audio/sfx/click.mp3'); this.clickAudio.preload = 'auto'; }
        catch { this.clickAudio = null; }
      }
      return this.clickAudio;
    }
    if (!this.keytickAudio) {
      try {
        this.keytickAudio = new Audio('/audio/sfx/click2.mp3');
        this.keytickAudio.preload = 'auto';
        this.keytickAudio.playbackRate = 1.15; // 略高音，做出 tick 区别
      } catch { this.keytickAudio = null; }
    }
    return this.keytickAudio;
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

  // —— 环境 BGM：两首 MP3 文件，按阶段切换、循环播放 ——
  private readonly BGM_TRACKS: Record<string, string> = {
    gaokao: '/audio/bgm_absolutesound.mp3',
    undergrad: '/audio/bgm_absolutesound.mp3',
    internship: '/audio/bgm_absolutesound.mp3',
    jobhunt: '/audio/bgm_absolutesound.mp3',
    guipei: '/audio/bgm_alexmorgan.mp3',
    master: '/audio/bgm_alexmorgan.mp3',
    phd: '/audio/bgm_alexmorgan.mp3',
    career: '/audio/bgm_alexmorgan.mp3',
    default: '/audio/bgm_absolutesound.mp3',
  };

  private getBgm(): HTMLAudioElement | null {
    if (!this.bgmAudio) {
      try {
        const a = new Audio();
        a.loop = true;
        a.preload = 'auto';
        a.volume = this.muted ? 0 : this.bgmVolume;
        this.bgmAudio = a;
      } catch {
        return null;
      }
    }
    return this.bgmAudio;
  }

  /** 标题屏等无明确阶段处启动默认 BGM */
  startBgm() { this.setBgmMood('default'); }

  setBgmMood(stage: string | PaletteName) {
    const a = this.getBgm();
    if (!a) return;
    const url = this.BGM_TRACKS[stage as string] ?? this.BGM_TRACKS.default;
    if (this.currentBgmUrl !== url) {
      a.src = url;
      this.currentBgmUrl = url;
      a.load();
    }
    if (!this.muted) {
      a.volume = this.bgmVolume;
      void a.play().catch(() => { /* 自动播放被拦截时静默，等用户手势 unlockAudio */ });
    }
  }

  /** 用户手势后调用：恢复 AudioContext 并在已选曲情况下启动 BGM */
  unlockAudio() {
    this.ensure();
    if (this.bgmAudio && this.currentBgmUrl && !this.muted) {
      this.bgmAudio.volume = this.bgmVolume;
      void this.bgmAudio.play().catch(() => { /* 忽略 */ });
    }
  }

  stopBgm() {
    this.bgmAudio?.pause();
  }
}

export const sound = new SoundManager();
