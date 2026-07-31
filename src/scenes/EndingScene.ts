import Phaser from 'phaser';
import { ENDINGS_BY_ID } from '../data/endings';
import { resetGame, getState } from '../data/gameState';
import { REAL_EVENTS_AS_CARDS } from '../data/realEvents';
import { sound } from '../audio/sound';
import { clearSave } from '../data/save';
import { recordEnding } from '../data/collection';
import { compareEnding } from '../data/comparison';

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
    const rec = recordEnding(ending.id);
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

    this.add.text(480, 184, '—— 你的数据  vs  真实数据 ——', {
      fontFamily: '"Courier New", monospace', fontSize: '14px', color: '#ffc107', fontStyle: 'bold',
    }).setOrigin(0.5);

    // 逐项对比表：你的值 ｜ vs ｜ 真实值 ｜ 判定
    const state = getState();
    const maritalLabel: Record<string, string> = { single: '单身', dating: '恋爱中', married: '已婚' };
    const verdictText: Record<string, string> = { low: '低于参考', mid: '在参考区间内', high: '高于参考' };
    const verdictColor: Record<string, number> = { low: 0xff8a95, mid: 0x4fc3f7, high: 0xffc107 };

    const compareRows = compareEnding(ending.id, state);
    const infoRows: [string, string][] = [
      ['感情', maritalLabel[state.marital]],
      ['家人/子女', `${state.familyAlive}/4 在世 · ${state.hasChild ? '有娃' : '无娃'}`],
      ['状态', state.flags.has('grieving') ? '丧亲之痛' : '——'],
    ];

    this.add.text(60, 210, '你的数据', { fontFamily: '"Courier New", monospace', fontSize: '13px', color: '#ffc107', fontStyle: 'bold' });
    this.add.text(480, 210, '真实数据', { fontFamily: '"Courier New", monospace', fontSize: '13px', color: '#4fc3f7', fontStyle: 'bold' });

    const rowY = (i: number) => 236 + i * 28;
    compareRows.forEach((r, i) => {
      const y = rowY(i);
      this.add.text(60, y, `${r.label}：`, { fontFamily: '"Courier New", monospace', fontSize: '13px', color: '#999999' });
      this.add.text(150, y, r.yoursText, { fontFamily: '"Courier New", monospace', fontSize: '13px', color: '#ffffff', fontStyle: 'bold' });
      this.add.text(330, y, 'vs', { fontFamily: '"Courier New", monospace', fontSize: '13px', color: '#555555' });
      this.add.text(420, y, r.real, {
        fontFamily: '"Courier New", monospace', fontSize: '12px', color: '#bbbbbb', wordWrap: { width: 420 },
      });
      if (r.verdict !== 'none') {
        this.add.text(820, y, verdictText[r.verdict], {
          fontFamily: '"Courier New", monospace', fontSize: '12px', color: '#ffffff',
        }).setColor(`#${verdictColor[r.verdict].toString(16).padStart(6, '0')}`);
      }
    });

    infoRows.forEach((r, i) => {
      const y = rowY(compareRows.length + i);
      this.add.text(60, y, `${r[0]}：`, { fontFamily: '"Courier New", monospace', fontSize: '13px', color: '#999999' });
      this.add.text(150, y, r[1], { fontFamily: '"Courier New", monospace', fontSize: '13px', color: '#ffffff', fontStyle: 'bold' });
      this.add.text(420, y, '——', { fontFamily: '"Courier New", monospace', fontSize: '13px', color: '#555555' });
    });

    // 真实数据参照卡（来源注脚）
    let cardY = rowY(compareRows.length + infoRows.length) + 8;
    ending.realDataCard.forEach((c) => {
      this.add.text(60, cardY, `◆ ${c.label}：${c.value}（来源：${c.source}）`, {
        fontFamily: '"Courier New", monospace', fontSize: '11px', color: '#777777',
        wordWrap: { width: 860 },
      });
      cardY += 18;
    });

    // 真实事件注脚
    const reTitles = REAL_EVENTS_AS_CARDS
      .filter(c => c.relatedStages.includes('career') || c.relatedStages.includes('guipei'))
      .slice(0, 3)
      .map(c => c.title);
    this.add.text(480, cardY + 6, '真实世界里也发生过：' + reTitles.join('  ·  '), {
      fontFamily: '"Courier New", monospace', fontSize: '11px', color: '#bbbbbb',
      wordWrap: { width: 840 }, align: 'center',
    }).setOrigin(0.5, 0);

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

    this.add.text(480, 280, '全国心理援助热线：400-161-9995', {
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
