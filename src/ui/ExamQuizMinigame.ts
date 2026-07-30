import Phaser from 'phaser';
import type { MinigameResult } from './minigameTypes';
import { sound } from '../audio/sound';

// 限时答题小游戏（M4）：执医 / 考研 / OSCE 理论共用。
// 连续答 N 题，每题限时；正确率决定 grade。题库内置，可按主题过滤。

export interface ExamQuestion {
  q: string;
  choices: string[];
  answer: number; // 0-based
  topic?: string;
}

const BANK: ExamQuestion[] = [
  { q: '成人 CPR 按压频率应为？', choices: ['60–80 次/分', '100–120 次/分', '140–160 次/分', '随意'], answer: 1, topic: 'clinical' },
  { q: '成人胸外按压深度约为？', choices: ['2–3 cm', '5–6 cm', '8–10 cm', '越深越好'], answer: 1, topic: 'clinical' },
  { q: '青霉素皮试阳性时，下一步应？', choices: ['直接注射减半剂量', '换用其它β-内酰胺并评估交叉过敏', '忽略继续用', '口服抗组胺后重试'], answer: 1, topic: 'clinical' },
  { q: '高血压急症首选目标是？', choices: ['1 小时内降到正常', '数小时至 24h 内逐步可控下降', '立即降到 90/60', '只观察不处理'], answer: 1, topic: 'clinical' },
  { q: '知情同意的核心是？', choices: ['让患者签字了事', '充分告知利弊与替代方案', '家属决定即可', '医生决定即可'], answer: 1, topic: 'ethics' },
  { q: 'p 值 < 0.05 通常表示？', choices: ['临床一定有意义', '统计学上拒绝原假设的证据', '样本量一定够', '结果一定可重复'], answer: 1, topic: 'research' },
  { q: '随机对照试验的主要优势？', choices: ['便宜', '减少混杂与选择偏倚', '一定双盲', '一定多中心'], answer: 1, topic: 'research' },
  { q: '医学论文中"一作"通常指？', choices: ['通讯作者', '贡献最大的主要执行者', '导师', '经费负责人'], answer: 1, topic: 'research' },
  { q: '休克早期最敏感的指标之一？', choices: ['皮肤温度与尿量变化', '只看血压', '只看心率', '血红蛋白'], answer: 0, topic: 'clinical' },
  { q: '抗生素使用原则强调？', choices: ['越广越好', '尽早经验性 + 尽快降阶梯', '一律联合用药', '症状一好转即停'], answer: 1, topic: 'clinical' },
  { q: '医患沟通中"共情"是指？', choices: ['替患者做决定', '理解并回应患者情绪与处境', '只讲专业术语', '回避坏消息'], answer: 1, topic: 'ethics' },
  { q: '病历书写最基本要求？', choices: ['越短越好', '真实、及时、完整、规范', '只写阳性体征', '可以事后补全虚构'], answer: 1, topic: 'clinical' },
];

const PER_Q_MS = 12000;
const TOTAL = 5;

export class ExamQuizMinigame {
  private scene: Phaser.Scene;
  private root!: Phaser.GameObjects.Container;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private closed = false;
  private idx = 0;
  private correct = 0;
  private questions: ExamQuestion[];
  private qText!: Phaser.GameObjects.Text;
  private choiceTexts: Phaser.GameObjects.Text[] = [];
  private timerBar!: Phaser.GameObjects.Rectangle;
  private timerBg!: Phaser.GameObjects.Rectangle;
  private meta!: Phaser.GameObjects.Text;
  private deadline = 0;
  private answered = false;

  constructor(scene: Phaser.Scene, opts?: { title?: string; topic?: string }) {
    this.scene = scene;
    // 抽题：可按 topic 过滤，不足则回落全库
    let pool = opts?.topic ? BANK.filter(q => q.topic === opts.topic) : BANK.slice();
    if (pool.length < TOTAL) pool = BANK.slice();
    // 洗牌
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    this.questions = pool.slice(0, TOTAL);

    this.root = scene.add.container(0, 0).setDepth(200);
    const g = scene.add.graphics();
    g.fillStyle(0x000000, 0.72);
    g.fillRect(0, 0, 960, 540);
    g.fillStyle(0x152028, 0.96);
    g.fillRoundedRect(140, 90, 680, 360, 8);
    g.lineStyle(2, 0x4fc3f7, 0.9);
    g.strokeRoundedRect(140, 90, 680, 360, 8);
    this.root.add(g);

    const title = scene.add.text(480, 108, opts?.title ?? '限时答题', {
      fontFamily: '"Courier New", monospace', fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.meta = scene.add.text(480, 136, '', {
      fontFamily: '"Courier New", monospace', fontSize: '12px', color: '#9aa0b5',
    }).setOrigin(0.5, 0);
    this.root.add([title, this.meta]);

    this.qText = scene.add.text(170, 170, '', {
      fontFamily: '"Courier New", monospace', fontSize: '15px', color: '#e8eef8',
      wordWrap: { width: 620 }, lineSpacing: 4,
    });
    this.root.add(this.qText);

    for (let i = 0; i < 4; i++) {
      const t = scene.add.text(190, 250 + i * 36, '', {
        fontFamily: '"Courier New", monospace', fontSize: '14px', color: '#f0f0f0',
        wordWrap: { width: 580 },
      }).setInteractive({ useHandCursor: true });
      t.on('pointerover', () => { if (!this.answered) t.setColor('#4fc3f7'); });
      t.on('pointerout', () => { if (!this.answered) t.setColor('#f0f0f0'); });
      t.on('pointerdown', () => this.answer(i));
      this.choiceTexts.push(t);
      this.root.add(t);
    }

    this.timerBg = scene.add.rectangle(480, 420, 600, 10, 0x2a3550).setOrigin(0.5);
    this.timerBar = scene.add.rectangle(180, 420, 600, 10, 0x69f0ae).setOrigin(0, 0.5);
    this.root.add([this.timerBg, this.timerBar]);

    this.keyHandler = (e: KeyboardEvent) => {
      if (this.closed || this.answered) return;
      const map: Record<string, number> = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, KeyA: 0, KeyB: 1, KeyC: 2, KeyD: 3 };
      if (e.code in map) { e.preventDefault(); this.answer(map[e.code]); }
    };
    scene.input.keyboard?.on('keydown', this.keyHandler);
    this.showQuestion();
  }

  private showQuestion() {
    if (this.idx >= this.questions.length) { this.finish(); return; }
    this.answered = false;
    const q = this.questions[this.idx];
    this.meta.setText(`第 ${this.idx + 1} / ${this.questions.length} 题 · 1–4 / A–D 作答 · 每题 ${PER_Q_MS / 1000}s`);
    this.qText.setText(q.q);
    q.choices.forEach((c, i) => {
      this.choiceTexts[i].setText(`${String.fromCharCode(65 + i)}. ${c}`).setColor('#f0f0f0').setVisible(true);
    });
    for (let i = q.choices.length; i < 4; i++) this.choiceTexts[i].setVisible(false);
    this.deadline = performance.now() + PER_Q_MS;
    this.timerBar.width = 600;
    this.timerBar.setFillStyle(0x69f0ae);
  }

  update(_time: number, _delta: number) {
    if (this.closed || this.answered) return;
    const left = this.deadline - performance.now();
    const ratio = Math.max(0, left / PER_Q_MS);
    this.timerBar.width = 600 * ratio;
    if (ratio < 0.3) this.timerBar.setFillStyle(0xff5252);
    else if (ratio < 0.55) this.timerBar.setFillStyle(0xffd54f);
    if (left <= 0) this.answer(-1); // 超时
  }

  private answer(choice: number) {
    if (this.closed || this.answered) return;
    this.answered = true;
    const q = this.questions[this.idx];
    const ok = choice === q.answer;
    if (ok) {
      this.correct++;
      sound.good();
      if (choice >= 0) this.choiceTexts[choice].setColor('#69f0ae');
    } else {
      sound.bad();
      if (choice >= 0) this.choiceTexts[choice].setColor('#ff5252');
      this.choiceTexts[q.answer].setColor('#69f0ae');
    }
    this.idx++;
    this.scene.time.delayedCall(450, () => this.showQuestion());
  }

  private finish() {
    if (this.closed) return;
    this.closed = true;
    const rate = this.correct / this.questions.length;
    let result: MinigameResult;
    if (rate >= 0.8) {
      result = {
        grade: 'perfect',
        delta: { knowledge: 8, reputation: 3, stamina: -6, sanity: 4 },
        flagSet: 'exam_ace',
        consequence: `对了 ${this.correct}/${this.questions.length}。出考场那一刻腿是软的，却也轻的。`,
      };
    } else if (rate >= 0.5) {
      result = {
        grade: 'good',
        delta: { knowledge: 4, stamina: -8, sanity: -2 },
        flagSet: 'exam_pass',
        consequence: `对了 ${this.correct}/${this.questions.length}。压线飘过，你不敢细想那几道错题。`,
      };
    } else {
      result = {
        grade: 'miss',
        delta: { knowledge: 1, stamina: -8, sanity: -8, reputation: -2 },
        flagSet: 'exam_fail',
        consequence: `只对了 ${this.correct}/${this.questions.length}。你在楼梯间坐了很久，才把准考证撕了。`,
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
