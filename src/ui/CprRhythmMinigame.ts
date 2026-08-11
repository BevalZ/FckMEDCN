import Phaser from 'phaser';
import type { MinigameResult } from './minigameTypes';
import { sound } from '../audio/sound';

// 心肺复苏节奏按键（M4）。
// 目标：在 110 BPM 附近按空格/E，连续 N 次。每次按键相对理想节拍的偏差决定得分。
// AHA 指南成人 CPR 按压频率 100–120 / 分，这里取中位 110。

const BPM = 110;
const BEAT_MS = 60000 / BPM;
const TOTAL_BEATS = 8;
// 偏差阈值（毫秒）
const PERFECT_MS = 70;
const GOOD_MS = 140;

export class CprRhythmMinigame {
  private scene: Phaser.Scene;
  private root!: Phaser.GameObjects.Container;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private closed = false;
  private startedAt = 0;
  private hits: Array<'perfect' | 'good' | 'miss'> = [];
  private nextBeat = 0;
  private beatMarks: Phaser.GameObjects.Arc[] = [];
  private pulse!: Phaser.GameObjects.Arc;
  private status!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private lastKeyAt = -9999;

  constructor(scene: Phaser.Scene, opts?: { title?: string }) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setDepth(200);

    const g = scene.add.graphics();
    g.fillStyle(0x000000, 0.72);
    g.fillRect(0, 0, 960, 540);
    g.fillStyle(0x1a1520, 0.96);
    g.fillRoundedRect(160, 120, 640, 280, 8);
    g.lineStyle(2, 0xff5252, 0.9);
    g.strokeRoundedRect(160, 120, 640, 280, 8);
    this.root.add(g);

    const title = scene.add.text(480, 140, opts?.title ?? '心肺复苏 · 跟着节拍按压', {
      fontFamily: '"Courier New", monospace', fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    const touch = scene.sys.game.device.input.touch;
    const hint = scene.add.text(480, 172, touch
      ? `目标 ${BPM} 次/分（AHA 100–120）· 点击“按压” · 共 ${TOTAL_BEATS} 次`
      : `目标 ${BPM} 次/分（AHA 100–120）· 空格 / E 按压 · 共 ${TOTAL_BEATS} 次`, {
      fontFamily: '"Courier New", monospace', fontSize: '12px', color: '#9aa0b5',
    }).setOrigin(0.5, 0);
    this.root.add([title, hint]);

    // 节拍点
    const baseY = 260;
    const span = 480;
    const startX = 480 - span / 2;
    for (let i = 0; i < TOTAL_BEATS; i++) {
      const x = startX + (span * i) / (TOTAL_BEATS - 1);
      const mark = scene.add.circle(x, baseY, 10, 0x37474f).setStrokeStyle(2, 0x90a4ae);
      this.beatMarks.push(mark);
      this.root.add(mark);
    }

    this.pulse = scene.add.circle(480, baseY, 28, 0xff5252, 0.25).setStrokeStyle(3, 0xff8a80);
    this.root.add(this.pulse);

    this.status = scene.add.text(480, 310, '预备……', {
      fontFamily: '"Courier New", monospace', fontSize: '14px', color: '#ffccbc',
    }).setOrigin(0.5, 0);
    this.scoreText = scene.add.text(480, 340, `0 / ${TOTAL_BEATS}`, {
      fontFamily: '"Courier New", monospace', fontSize: '13px', color: '#cfd8e8',
    }).setOrigin(0.5, 0);
    this.root.add([this.status, this.scoreText]);

    if (touch) {
      const touchButton = scene.add.text(480, 376, '按压', {
        fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '16px', color: '#ffffff',
        backgroundColor: '#c62828', padding: { x: 30, y: 8 },
      }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });
      touchButton.on('pointerdown', () => this.onPress());
      this.root.add(touchButton);
    }

    this.keyHandler = (e: KeyboardEvent) => {
      if (this.closed) return;
      if (e.code === 'Space' || e.code === 'KeyE') {
        e.preventDefault();
        this.onPress();
      }
    };
    scene.input.keyboard?.on('keydown', this.keyHandler);
    this.startedAt = performance.now() + 600; // 给 0.6s 预备
  }

  update(_time: number, _delta: number) {
    if (this.closed) return;
    const now = performance.now();
    const t = now - this.startedAt;
    if (t < 0) {
      this.status.setText('预备……');
      return;
    }
    // 节拍脉冲：按理想节拍缩放
    const phase = (t % BEAT_MS) / BEAT_MS;
    const scale = 1 + 0.35 * Math.sin(phase * Math.PI * 2);
    this.pulse.setScale(scale);

    // 漏拍：若玩家在理想节拍后 GOOD_MS 仍未按，记 miss 并推进
    const ideal = this.nextBeat * BEAT_MS;
    if (this.nextBeat < TOTAL_BEATS && t > ideal + GOOD_MS && now - this.lastKeyAt > GOOD_MS) {
      this.register('miss', this.nextBeat);
      this.nextBeat++;
      if (this.nextBeat >= TOTAL_BEATS) this.finish();
    }
  }

  private onPress() {
    const now = performance.now();
    const t = now - this.startedAt;
    if (t < 0 || this.nextBeat >= TOTAL_BEATS) return;
    // 防连按
    if (now - this.lastKeyAt < 120) return;
    this.lastKeyAt = now;

    const ideal = this.nextBeat * BEAT_MS;
    const err = Math.abs(t - ideal);
    let grade: 'perfect' | 'good' | 'miss';
    if (err <= PERFECT_MS) grade = 'perfect';
    else if (err <= GOOD_MS) grade = 'good';
    else grade = 'miss';

    this.register(grade, this.nextBeat);
    this.nextBeat++;
    if (grade === 'perfect') sound.good();
    else if (grade === 'good') sound.click();
    else sound.bad();

    if (this.nextBeat >= TOTAL_BEATS) this.finish();
  }

  private register(grade: 'perfect' | 'good' | 'miss', idx: number) {
    this.hits.push(grade);
    const mark = this.beatMarks[idx];
    if (mark) {
      const color = grade === 'perfect' ? 0x69f0ae : grade === 'good' ? 0xffd54f : 0xff5252;
      mark.setFillStyle(color);
      mark.setStrokeStyle(2, color);
    }
    const label = grade === 'perfect' ? '正中！' : grade === 'good' ? '还行' : '偏了';
    this.status.setText(label).setColor(grade === 'miss' ? '#ff8a80' : '#c8e6c9');
    this.scoreText.setText(`${this.hits.length} / ${TOTAL_BEATS}`);
  }

  private finish() {
    if (this.closed) return;
    this.closed = true;
    const perfects = this.hits.filter(h => h === 'perfect').length;
    const goods = this.hits.filter(h => h === 'good').length;
    const misses = this.hits.filter(h => h === 'miss').length;
    const score = perfects * 2 + goods;

    let result: MinigameResult;
    if (score >= TOTAL_BEATS * 1.5 && misses <= 1) {
      result = {
        grade: 'perfect',
        delta: { clinical: 8, reputation: 4, knowledge: 2, stamina: -10, sanity: -2 },
        flagSet: 'cpr_saved',
        consequence: '按压深度与频率都到位。监护仪上重新跳出了波形。',
      };
    } else if (score >= TOTAL_BEATS * 0.8) {
      result = {
        grade: 'good',
        delta: { clinical: 5, reputation: 2, knowledge: 1, stamina: -12, sanity: -3 },
        flagSet: 'cpr_done',
        consequence: '你按完了两分钟。换人时手在抖，但病人还在。',
      };
    } else {
      result = {
        grade: 'miss',
        delta: { clinical: 1, reputation: -2, stamina: -14, sanity: -8 },
        flagSet: 'cpr_failed',
        consequence: '节奏乱了。老师把你拉开："我来。"你退到一边，满头是汗。',
      };
    }
    this.onDone?.(result);
    this.destroy();
  }

  private onDone: ((r: MinigameResult) => void) | null = null;

  play(): Promise<MinigameResult> {
    return new Promise(resolve => { this.onDone = resolve; });
  }

  destroy() {
    if (this.keyHandler) {
      this.scene.input.keyboard?.off('keydown', this.keyHandler);
      this.keyHandler = null;
    }
    this.root.destroy(true);
  }
}
