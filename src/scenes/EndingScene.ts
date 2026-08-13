import Phaser from 'phaser';
import { ENDINGS_BY_ID } from '../data/endings';
import { resetGame, getState } from '../data/gameState';
import { sound } from '../audio/sound';
import { clearSave } from '../data/save';
import { recordEnding } from '../data/collection';
import { careerFinancialSnapshot, regionDisposableCompare } from '../data/economy';
import { verifiedEvidence } from '../data/evidence';

export class EndingScene extends Phaser.Scene {
  private endingId!: string;
  constructor() { super({ key: 'EndingScene' }); }

  init(data: { endingId?: string }) { this.endingId = data?.endingId ?? 'exhausted_attending'; }

  create() {
    const ending = ENDINGS_BY_ID[this.endingId] ?? ENDINGS_BY_ID['exhausted_attending'];
    sound.ensure();
    sound.stopBgm();
    sound.ending(ending.tone);
    clearSave();
    // 收录进人生图鉴（跨周目累计，不受 clearSave 影响）
    const rec = recordEnding(ending.id, getState().attrs);
    const bg = this.add.graphics();
    bg.fillStyle(ending.bgColor);
    bg.fillRect(0, 0, 960, 540);

    this.add.text(480, 30, ending.title, {
      fontFamily: '"Courier New", monospace', fontSize: '28px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(480, 64, ending.subtitle, {
      fontFamily: '"Courier New", monospace', fontSize: '14px', color: '#888888',
    }).setOrigin(0.5);

    this.add.text(60, 96, ending.desc, {
      fontFamily: '"Courier New", monospace', fontSize: '13px', color: '#cccccc',
      wordWrap: { width: 840 }, lineSpacing: 6,
    });

    this.add.text(480, 184, '—— 本局记录 ——', {
      fontFamily: '"Courier New", monospace', fontSize: '14px', color: '#ffc107', fontStyle: 'bold',
    }).setOrigin(0.5);

    const state = getState();
    const maritalLabel: Record<string, string> = { single: '单身', dating: '恋爱中', married: '已婚' };

    const finance = careerFinancialSnapshot();
    const regionCmp = regionDisposableCompare();
    const fmt = (n: number) => `¥${n.toLocaleString()}`;
    const infoRows: [string, string][] = [
      ['感情', maritalLabel[state.marital]],
      ['家人/子女', `${state.familyAlive}/4 在世 · ${state.hasChild ? '有娃' : '无娃'}`],
      ['现金 / 资产', `现金${fmt(finance.cash)} · 资产${fmt(finance.assets)}`],
      ['养老金', finance.pension > 0
        ? `账户${fmt(finance.pension)} · 季度领取约${fmt(finance.pensionPayout)}`
        : '未建立账户 / 余额为 0'],
      ['职业现金流', `${finance.region} ${finance.title} · 季度收入${fmt(finance.quarterlyIncome)} · 可支配${fmt(finance.disposable)}`],
      ['房贷', finance.mortgageBalance > 0
        ? `余额约${fmt(finance.mortgageBalance)} · 季度还款${fmt(finance.housePayment)}`
        : '未购房 / 无房贷'],
      ['地区对照', `一线三甲可支配 ${fmt(regionCmp.topDisposable)} ｜ 基层/县城 ${fmt(regionCmp.countyDisposable)} ｜ 你（${regionCmp.yoursLabel}）${fmt(regionCmp.yoursDisposable)}`],
    ];

    this.add.text(60, 208, '你的数据', { fontFamily: '"Courier New", monospace', fontSize: '13px', color: '#ffc107', fontStyle: 'bold' });

    const rowY = (i: number) => 230 + i * 24;
    infoRows.forEach((r, i) => {
      const y = rowY(i);
      this.add.text(60, y, `${r[0]}：`, { fontFamily: '"Courier New", monospace', fontSize: '12px', color: '#999999' });
      this.add.text(150, y, r[1], {
        fontFamily: '"Courier New", monospace', fontSize: '12px', color: '#ffffff', fontStyle: 'bold',
        wordWrap: { width: 740 },
      });
    });

    this.add.text(60, rowY(infoRows.length) + 2, regionCmp.blurb, {
      fontFamily: '"Courier New", monospace', fontSize: '11px', color: '#9aa0b5',
      wordWrap: { width: 840 },
    });

    // Only reviewed evidence is rendered. Pending external claims remain in the registry for audit.
    let cardY = rowY(infoRows.length) + 22;
    ending.realDataCard.forEach((c) => {
      const evidence = verifiedEvidence(c.evidenceId);
      if (!evidence) return;
      this.add.text(60, cardY, `◆ ${c.label}：${c.value}（来源：${evidence.organization}）`, {
        fontFamily: '"Courier New", monospace', fontSize: '11px', color: '#777777',
        wordWrap: { width: 860 },
      });
      cardY += 18;
    });

    // 图鉴收录提示：首次解锁高亮，非首次淡显进度
    this.add.text(480, 474,
      rec.isNew
        ? `★ 新结局已收录进人生图鉴（${rec.unlocked}/${rec.total}）`
        : `人生图鉴（${rec.unlocked}/${rec.total}）· 第 ${rec.runs} 次通关`,
      {
        fontFamily: '"Courier New", monospace', fontSize: '12px',
        color: rec.isNew ? '#ffc107' : '#666666',
      }).setOrigin(0.5, 0);

    const replayBtn = this.add.text(480, 506, '[ 再来一次 ]', {
      fontFamily: '"Courier New", monospace', fontSize: '14px', color: '#4fc3f7',
    }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });

    replayBtn.on('pointerdown', () => restart());

    // 键盘：空格 / 回车 也可重开（与 consequence 弹窗一致，方便纯键盘体验）
    this.input.keyboard?.once('keydown-SPACE', () => restart());
    this.input.keyboard?.once('keydown-ENTER', () => restart());
    const restart = () => {
      sound.click();
      resetGame();
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('TitleScene'));
    };
    replayBtn.setText('[ 再来一次 (空格/回车) ]');

    this.cameras.main.fadeIn(800);
  }
}

export class MentalCrisisScene extends Phaser.Scene {
  constructor() { super({ key: 'MentalCrisisScene' }); }

  create() {
    sound.ensure();
    sound.stopBgm();
    sound.crisis();
    clearSave();
    const bg = this.add.graphics();
    bg.fillStyle(0x000000);
    bg.fillRect(0, 0, 960, 540);

    this.add.text(480, 150, '心理健康崩溃', {
      fontFamily: '"Courier New", monospace', fontSize: '20px', color: '#ff5252', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(480, 200, '你已经无法继续了。这不是软弱。这是一个信号。', {
      fontFamily: '"Courier New", monospace', fontSize: '14px', color: '#666666',
    }).setOrigin(0.5);

    this.add.text(480, 280, '如有即时危险，请联系当地急救服务，并尽快告诉可信赖的人。', {
      fontFamily: '"Courier New", monospace', fontSize: '16px', color: '#4fc3f7',
    }).setOrigin(0.5);

    const restartBtn = this.add.text(480, 480, '[ 从头开始 ]', {
      fontFamily: '"Courier New", monospace', fontSize: '16px', color: '#4fc3f7',
    }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });

    const restart = () => {
      sound.click();
      resetGame();
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('TitleScene'));
    };
    restartBtn.on('pointerdown', () => restart());
    this.input.keyboard?.once('keydown-SPACE', () => restart());
    this.input.keyboard?.once('keydown-ENTER', () => restart());
    restartBtn.setText('[ 从头开始 (空格/回车) ]');

    this.cameras.main.fadeIn(1000);
  }
}
