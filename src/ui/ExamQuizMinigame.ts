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
  // —— 2026-07-30 扩充（原 12 题，复玩重复率高；roadmap「更多题库」）——
  { q: '正常成人静息心率范围是？', choices: ['40–60 次/分', '60–100 次/分', '100–120 次/分', '120 次/分以上'], answer: 1, topic: 'clinical' },
  { q: '铺好的无菌盘有效期为？', choices: ['4 小时', '12 小时', '24 小时', '一周'], answer: 0, topic: 'clinical' },
  { q: '输血前必须完成的关键核对是？', choices: ['患者职业与籍贯', '血型鉴定与交叉配血', '家属签字笔迹', '献血者饮食习惯'], answer: 1, topic: 'clinical' },
  { q: '糖尿病诊断的空腹血糖标准是？', choices: ['≥6.1 mmol/L', '≥7.0 mmol/L', '≥11.1 mmol/L', '≥3.9 mmol/L'], answer: 1, topic: 'clinical' },
  { q: '急性阑尾炎最典型的体征是？', choices: ['麦氏点压痛、反跳痛', 'Murphy 征阳性', '移动性浊音', '杵状指'], answer: 0, topic: 'clinical' },
  { q: '骨折现场急救固定的原则是？', choices: ['只固定骨折处', '固定骨折部位上下两个关节', '先复位再固定', '不需要固定直接搬运'], answer: 1, topic: 'clinical' },
  { q: '新生儿 Apgar 评分不包括以下哪项？', choices: ['心率', '体重', '肌张力', '皮肤颜色'], answer: 1, topic: 'clinical' },
  { q: '正常成人血钾参考范围是？', choices: ['2.0–3.0 mmol/L', '3.5–5.5 mmol/L', '5.5–7.0 mmol/L', '7.0 mmol/L 以上'], answer: 1, topic: 'clinical' },
  { q: 'COPD 患者氧疗宜采用？', choices: ['高流量高浓度吸氧', '低流量持续吸氧', '纯氧面罩吸入', '不需要吸氧'], answer: 1, topic: 'clinical' },
  { q: '择期手术前常规禁食的主要目的是？', choices: ['减轻体重', '防止麻醉中误吸', '让肠胃休息', '节省手术时间'], answer: 1, topic: 'clinical' },
  { q: '「危急值」报告制度要求接报后？', choices: ['下班前统一处理', '立即通知临床医师并记录', '下周查房再说', '只录入系统即可'], answer: 1, topic: 'clinical' },
  { q: '青霉素类药物最需要警惕的严重不良反应是？', choices: ['嗜睡', '过敏性休克', '脱发', '味觉改变'], answer: 1, topic: 'clinical' },
  { q: '患者隐私资料的处理原则是？', choices: ['可与同行随意讨论', '未经授权不得泄露', '可发朋友圈打码', '教学使用无需告知'], answer: 1, topic: 'ethics' },
  { q: '临终患者神志清楚地拒绝有创抢救，医生应？', choices: ['强行抢救', '尊重其知情后的决定并记录', '让家属代签同意书', '转院处理'], answer: 1, topic: 'ethics' },
  { q: '患者送的红包，正确处理是？', choices: ['收下买咖啡', '拒收；无法拒收的按规定上交', '私下分给同事', '留到出院再收'], answer: 1, topic: 'ethics' },
  { q: '涉及人的生物医学研究，首要伦理原则是？', choices: ['科学价值优先', '受试者权益与安全优先', '经费效率优先', '发表优先'], answer: 1, topic: 'ethics' },
  { q: '实习生在带教监督下进行操作前必须？', choices: ['先斩后奏', '获得患者知情同意', '背出操作步骤即可', '交纳材料费'], answer: 1, topic: 'ethics' },
  { q: '病例对照研究的分组依据是？', choices: ['是否暴露某因素', '是否发生结局（患病/未患病）', '年龄大小', '随机数字'], answer: 1, topic: 'research' },
  { q: '样本量估算通常不需要考虑？', choices: ['检验水准 α', '把握度（1−β）', '预期效应量', '研究者的职称'], answer: 3, topic: 'research' },
  { q: '「双盲」设计的主要目的是？', choices: ['让统计分析更简单', '同时减少受试者与研究者两方的偏倚', '加快入组速度', '节省经费'], answer: 1, topic: 'research' },
  { q: '伦理审查委员会（IRB）的核心职责是？', choices: ['审批经费预算', '保护受试者的权益与安全', '修改论文语法', '安排值班表'], answer: 1, topic: 'research' },
  { q: '期刊「影响因子」衡量的是？', choices: ['单篇论文的质量', '期刊整体的平均引用水平', '作者学术水平', '审稿速度'], answer: 1, topic: 'research' },
  { q: '系统综述/Meta 分析规范流程的第一步是？', choices: ['直接下载文献开始统计', '明确研究问题并注册方案', '先写讨论部分', '联系期刊编辑'], answer: 1, topic: 'research' },
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
  private nextQuestionTimer: Phaser.Time.TimerEvent | null = null;
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
    if (this.closed || !this.root?.active) return;
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
    this.nextQuestionTimer = this.scene.time.delayedCall(450, () => {
      this.nextQuestionTimer = null;
      this.showQuestion();
    });
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
    if (this.closed && !this.root?.active) return;
    this.closed = true;
    this.nextQuestionTimer?.remove(false);
    this.nextQuestionTimer = null;
    if (this.keyHandler) {
      this.scene.input.keyboard?.off('keydown', this.keyHandler);
      this.keyHandler = null;
    }
    this.root?.destroy(true);
  }
}
