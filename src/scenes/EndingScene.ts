import Phaser from 'phaser';
import { ENDINGS_BY_ID } from '../data/endings';
import { resetGame, getState } from '../data/gameState';
import { REAL_EVENTS_AS_CARDS } from '../data/realEvents';
import { sound } from '../audio/sound';
import { clearSave } from '../data/save';

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

    // 左列：玩家实际现状
    const st = getState().stats;
    const state = getState();
    const maritalLabel: Record<string, string> = { single: '单身', dating: '恋爱中', married: '已婚' };
    const playerRows: [string, string][] = [
      ['年龄', `${st.age}岁`],
      ['存款', `¥${st.money.toLocaleString()}`],
      ['声望', `${st.reputation}`],
      ['论文', `${st.papers}篇`],
      ['心理', `${st.sanity}`],
      ['感情', maritalLabel[state.marital]],
      ['家人/子女', `${state.familyAlive}/4 在世 · ${state.hasChild ? '有娃' : '无娃'}`],
      ['状态', state.flags.has('grieving') ? '丧亲之痛' : '——'],
    ];
    this.add.text(60, 210, '你的现状', {
      fontFamily: '"Courier New", monospace', fontSize: '13px', color: '#ffc107', fontStyle: 'bold',
    });
    playerRows.forEach((r, i) => {
      const y = 236 + i * 22;
      this.add.text(60, y, r[0], { fontFamily: '"Courier New", monospace', fontSize: '13px', color: '#999999' });
      this.add.text(150, y, r[1], { fontFamily: '"Courier New", monospace', fontSize: '13px', color: '#ffffff', fontStyle: 'bold' });
    });

    // 右列：真实数据参照卡
    this.add.text(480, 210, '真实参照', {
      fontFamily: '"Courier New", monospace', fontSize: '13px', color: '#4fc3f7', fontStyle: 'bold',
    });
    ending.realDataCard.forEach((c, i) => {
      const y = 236 + i * 36;
      this.add.text(480, y, `${c.label}：${c.value}`, {
        fontFamily: '"Courier New", monospace', fontSize: '12px', color: '#ffffff', wordWrap: { width: 440 },
      });
      this.add.text(480, y + 17, `来源：${c.source}`, {
        fontFamily: '"Courier New", monospace', fontSize: '10px', color: '#777777',
      });
    });

    // 真实事件注脚
    const reTitles = REAL_EVENTS_AS_CARDS
      .filter(c => c.relatedStages.includes('career') || c.relatedStages.includes('guipei'))
      .slice(0, 3)
      .map(c => c.title);
    this.add.text(480, 432, '真实世界里也发生过：' + reTitles.join('  ·  '), {
      fontFamily: '"Courier New", monospace', fontSize: '11px', color: '#bbbbbb',
      wordWrap: { width: 840 }, align: 'center',
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
