import Phaser from 'phaser';
import type { MinigameResult } from './minigameTypes';
import { sound } from '../audio/sound';

// 硕博实验操作：按正确顺序完成无菌、移液、记录三步。
// 错一步仍可继续，最终按正确数结算，避免卡死在单次误触上。
const STEPS = [
  { label: '1  无菌准备', detail: '消毒台面、戴手套，确认耗材在有效期内', key: 'KeyA' },
  { label: '2  精准移液', detail: '预润洗枪头，沿管壁缓慢打液，避免气泡', key: 'KeyS' },
  { label: '3  如实记录', detail: '记录批次、时间与偏差，保留原始数据', key: 'KeyD' },
] as const;

export class ExperimentalProcedureMinigame {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container;
  private closed = false;
  private stepIndex = 0;
  private correct = 0;
  private mistakes = 0;
  private buttons: Phaser.GameObjects.Text[] = [];
  private status!: Phaser.GameObjects.Text;
  private progress!: Phaser.GameObjects.Text;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private onDone: ((r: MinigameResult) => void) | null = null;

  constructor(scene: Phaser.Scene, opts?: { title?: string }) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setDepth(200);
    const g = scene.add.graphics();
    g.fillStyle(0x000000, 0.75);
    g.fillRect(0, 0, 960, 540);
    g.fillStyle(0x13232a, 0.98);
    g.fillRoundedRect(120, 82, 720, 376, 8);
    g.lineStyle(2, 0x69f0ae, 0.9);
    g.strokeRoundedRect(120, 82, 720, 376, 8);
    this.root.add(g);

    const title = scene.add.text(480, 104, opts?.title ?? '实验操作 · Bench protocol', {
      fontFamily: '"Courier New", monospace', fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    const hint = scene.add.text(480, 138, '按 A / S / D 或点击步骤，按规范完成当前操作', {
      fontFamily: '"Courier New", monospace', fontSize: '12px', color: '#9aa0b5',
    }).setOrigin(0.5, 0);
    this.progress = scene.add.text(480, 166, '', {
      fontFamily: '"Courier New", monospace', fontSize: '13px', color: '#cfd8e8',
    }).setOrigin(0.5, 0);
    this.root.add([title, hint, this.progress]);

    STEPS.forEach((step, i) => {
      const y = 218 + i * 58;
      const text = scene.add.text(170, y, step.label, {
        fontFamily: '"Courier New", monospace', fontSize: '15px', color: '#f0f0f0',
        backgroundColor: '#20343a', padding: { x: 12, y: 7 },
      }).setInteractive({ useHandCursor: true });
      text.setData('index', i);
      text.on('pointerover', () => { if (!this.closed) text.setColor('#69f0ae'); });
      text.on('pointerout', () => { if (!this.closed) text.setColor('#f0f0f0'); });
      text.on('pointerdown', () => this.choose(i));
      this.buttons.push(text);
      this.root.add(text);

      const detail = scene.add.text(360, y + 4, step.detail, {
        fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '12px', color: '#aab7bd',
        wordWrap: { width: 410 },
      });
      this.root.add(detail);
    });

    this.status = scene.add.text(480, 408, '准备开始……', {
      fontFamily: '"Courier New", monospace', fontSize: '14px', color: '#ffccbc',
    }).setOrigin(0.5, 0);
    this.root.add(this.status);

    this.keyHandler = (e: KeyboardEvent) => {
      if (this.closed) return;
      const map: Record<string, number> = { KeyA: 0, KeyS: 1, KeyD: 2, Digit1: 0, Digit2: 1, Digit3: 2 };
      if (e.code in map) { e.preventDefault(); this.choose(map[e.code]); }
    };
    scene.input.keyboard?.on('keydown', this.keyHandler);
    this.refresh();
  }

  private refresh() {
    if (this.closed) return;
    this.progress.setText(`步骤 ${this.stepIndex + 1} / ${STEPS.length} · 操作偏差 ${this.mistakes} / 3`);
    this.status.setText(`当前：${STEPS[this.stepIndex].label}。先做对，再做快。`).setColor('#ffccbc');
    this.buttons.forEach((b, i) => b.setColor(i === this.stepIndex ? '#69f0ae' : '#f0f0f0'));
  }

  private choose(index: number) {
    if (this.closed) return;
    if (index === this.stepIndex) {
      this.correct++;
      sound.good();
      this.buttons[index].setColor('#69f0ae');
      this.stepIndex++;
      if (this.stepIndex >= STEPS.length) this.finish();
      else this.refresh();
    } else {
      this.mistakes++;
      sound.bad();
      if (this.mistakes >= 3) this.finish();
      else {
        this.progress.setText(`步骤 ${this.stepIndex + 1} / ${STEPS.length} · 操作偏差 ${this.mistakes} / 3`);
        this.status.setText('顺序不对：先按高亮步骤操作。').setColor('#ff8a80');
      }
    }
  }

  update(_time: number, _delta: number) { /* 操作型小游戏无需逐帧逻辑 */ }

  private finish() {
    if (this.closed) return;
    this.closed = true;
    const result: MinigameResult = this.correct === STEPS.length && this.mistakes === 0
      ? {
          grade: 'perfect',
          delta: { research: 8, knowledge: 4, reputation: 3, stamina: -5, sanity: 2 },
          flagSet: 'experiment_protocol_mastered',
          consequence: '三步操作一气呵成，原始记录也留得清清楚楚。导师把样本交给你继续做。',
        }
      : this.correct === STEPS.length
        ? {
            grade: 'good',
            delta: { research: 5, knowledge: 2, stamina: -7 },
            flagSet: 'experiment_protocol_pass',
            consequence: `完成全部步骤，出现 ${this.mistakes} 次操作偏差。样本还能用，你把偏差补记进了实验记录。`,
          }
        : {
            grade: 'miss',
            delta: { research: 1, knowledge: 1, stamina: -8, sanity: -4, reputation: -1 },
            flagSet: 'experiment_protocol_miss',
            consequence: '操作顺序乱了，样本报废。你把废液处理完，重新读了一遍 SOP。',
          };
    this.onDone?.(result);
    this.destroy();
  }

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
