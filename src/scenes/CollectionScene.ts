import Phaser from 'phaser';
import { ENDINGS, ENDING_HINTS } from '../data/endings';
import { getCollection } from '../data/collection';

// 人生图鉴：跨周目收集界面。左列结局清单（↑↓/点击选择），右栏详情；
// 未解锁的结局只显示"？？？"与一条提示，引导多周目尝试。ESC 返回标题。
export class CollectionScene extends Phaser.Scene {
  private selected = 0;
  private rowTexts: Phaser.GameObjects.Text[] = [];
  private cursorText!: Phaser.GameObjects.Text;
  private detailObjs: Phaser.GameObjects.Text[] = [];

  constructor() { super({ key: 'CollectionScene' }); }

  create() {
    const { endings, runs, total } = getCollection();
    const unlockedCount = ENDINGS.filter(e => endings.has(e.id)).length;

    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a0f);
    bg.fillRect(0, 0, 960, 540);

    this.add.text(480, 28, '人生图鉴', {
      fontFamily: '"Courier New", monospace', fontSize: '26px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(480, 62, `已解锁 ${unlockedCount} / ${total} 种人生 · 累计通关 ${runs} 次`, {
      fontFamily: '"Courier New", monospace', fontSize: '13px', color: '#888888',
    }).setOrigin(0.5);

    this.add.text(480, 86, '↑↓ / 点击 选择 · ESC 返回', {
      fontFamily: '"Courier New", monospace', fontSize: '11px', color: '#555555',
    }).setOrigin(0.5);

    // 左列清单
    const listX = 90, startY = 124, rowH = 28;
    this.cursorText = this.add.text(listX - 22, startY, '▶', {
      fontFamily: '"Courier New", monospace', fontSize: '14px', color: '#ffc107',
    });
    ENDINGS.forEach((e, i) => {
      const y = startY + i * rowH;
      const unlocked = endings.has(e.id);
      const t = this.add.text(listX, y, unlocked ? e.title : '？？？', {
        fontFamily: '"Courier New", monospace', fontSize: '14px',
        color: unlocked ? '#cccccc' : '#555555',
      }).setInteractive({ cursor: 'pointer' });
      t.on('pointerdown', () => { this.selected = i; this.refresh(); });
      this.rowTexts.push(t);
    });

    // 键盘导航
    this.input.keyboard?.on('keydown-UP', () => this.move(-1));
    this.input.keyboard?.on('keydown-DOWN', () => this.move(1));
    this.input.keyboard?.once('keydown-ESC', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('TitleScene'));
    });

    this.refresh();
    this.cameras.main.fadeIn(400);
  }

  private move(dir: number) {
    const n = ENDINGS.length;
    this.selected = (this.selected + dir + n) % n;
    this.refresh();
  }

  private refresh() {
    const { endings } = getCollection();
    const startY = 124, rowH = 28;
    this.cursorText.setY(startY + this.selected * rowH);
    this.rowTexts.forEach((t, i) => {
      const unlocked = endings.has(ENDINGS[i]!.id);
      t.setColor(i === this.selected ? '#ffc107' : unlocked ? '#cccccc' : '#555555');
      t.setFontStyle(i === this.selected ? 'bold' : 'normal');
    });

    // 右栏详情：先清后画
    this.detailObjs.forEach(o => o.destroy());
    this.detailObjs = [];
    const e = ENDINGS[this.selected]!;
    const unlocked = endings.has(e.id);
    const x = 430, w = 470;
    const mk = (y: number, text: string, style: Phaser.Types.GameObjects.Text.TextStyle) => {
      const o = this.add.text(x, y, text, {
        fontFamily: '"Courier New", monospace', ...style,
      });
      this.detailObjs.push(o);
      return o;
    };
    if (unlocked) {
      mk(124, e.title, { fontSize: '18px', color: '#ffc107', fontStyle: 'bold' });
      mk(152, e.subtitle, { fontSize: '13px', color: '#999999' });
      mk(182, e.desc, { fontSize: '12px', color: '#cccccc', wordWrap: { width: w }, lineSpacing: 5 });
      mk(300, `结局判词：${e.stats.verdict}`, { fontSize: '12px', color: '#4fc3f7', wordWrap: { width: w } });
      mk(340, `（${e.stats.title} · ${e.stats.hospital}）`, { fontSize: '11px', color: '#777777', wordWrap: { width: w } });
    } else {
      mk(124, '？？？', { fontSize: '18px', color: '#666666', fontStyle: 'bold' });
      mk(160, '尚未走过这条人生。', { fontSize: '12px', color: '#777777' });
      mk(190, `提示：${ENDING_HINTS[e.id] ?? '继续你的故事。'}`, {
        fontSize: '12px', color: '#888888', wordWrap: { width: w }, lineSpacing: 5,
      });
    }
  }
}
