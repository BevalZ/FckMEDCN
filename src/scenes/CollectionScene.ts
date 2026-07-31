import Phaser from 'phaser';
import { ENDINGS, ENDING_HINTS } from '../data/endings';
import { BADGES } from '../data/badges';
import { getCollection } from '../data/collection';

// 人生图鉴：跨周目收集界面。两个页签——结局图鉴 / 生涯里程碑。
// TAB 或点击页签切换；结局页 15 条一屏，里程碑页 22 条分两页（←/→ 翻页）。
// ↑↓/点击 选择，右栏详情；未解锁/未达成只显示提示。ESC 返回标题。
type Mode = 'ending' | 'badge';

const LIST_X = 90, LIST_Y = 128;
const BADGE_PAGE_SIZE = 13;

export class CollectionScene extends Phaser.Scene {
  private mode: Mode = 'ending';
  private selEnding = 0;
  private selBadge = 0;
  private badgePage = 0;
  private rowTexts: Phaser.GameObjects.Text[] = [];
  private cursorText!: Phaser.GameObjects.Text;
  private detailObjs: Phaser.GameObjects.Text[] = [];
  private pageLabel: Phaser.GameObjects.Text | null = null;
  private progressText!: Phaser.GameObjects.Text;
  private tabEnding!: Phaser.GameObjects.Text;
  private tabBadge!: Phaser.GameObjects.Text;

  constructor() { super({ key: 'CollectionScene' }); }

  create() {
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a0f);
    bg.fillRect(0, 0, 960, 540);

    this.add.text(480, 28, '人生图鉴', {
      fontFamily: '"Courier New", monospace', fontSize: '26px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.progressText = this.add.text(480, 64, '', {
      fontFamily: '"Courier New", monospace', fontSize: '13px', color: '#888888',
    }).setOrigin(0.5);

    // 页签
    this.tabEnding = this.add.text(60, 96, '◆ 结局图鉴', {
      fontFamily: '"Courier New", monospace', fontSize: '15px', color: '#ffc107', fontStyle: 'bold',
    }).setInteractive({ cursor: 'pointer' });
    this.tabEnding.on('pointerdown', () => this.setMode('ending'));
    this.tabBadge = this.add.text(200, 96, '◆ 生涯里程碑', {
      fontFamily: '"Courier New", monospace', fontSize: '15px', color: '#555555',
    }).setInteractive({ cursor: 'pointer' });
    this.tabBadge.on('pointerdown', () => this.setMode('badge'));

    // 左列清单（两种模式共用同一批 Text，refresh 时重建内容）
    this.cursorText = this.add.text(LIST_X - 22, LIST_Y, '▶', {
      fontFamily: '"Courier New", monospace', fontSize: '14px', color: '#ffc107',
    });

    // 键盘导航
    this.input.keyboard?.on('keydown-UP', () => this.move(-1));
    this.input.keyboard?.on('keydown-DOWN', () => this.move(1));
    this.input.keyboard?.on('keydown-TAB', () => { this.setMode(this.mode === 'ending' ? 'badge' : 'ending'); });
    this.input.keyboard?.on('keydown-LEFT', () => {
      if (this.mode === 'badge') this.flipPage(-1); else this.setMode('badge');
    });
    this.input.keyboard?.on('keydown-RIGHT', () => {
      if (this.mode === 'badge') this.flipPage(1); else this.setMode('badge');
    });
    this.input.keyboard?.once('keydown-ESC', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('TitleScene'));
    });

    this.refreshList();
    this.refreshDetail();
    this.cameras.main.fadeIn(400);
  }

  private setMode(m: Mode) {
    if (this.mode === m) return;
    this.mode = m;
    this.refreshList();
    this.refreshDetail();
  }

  private flipPage(dir: number) {
    const pages = Math.ceil(BADGES.length / BADGE_PAGE_SIZE);
    this.badgePage = (this.badgePage + dir + pages) % pages;
    this.refreshList();
    this.refreshDetail();
  }

  private move(dir: number) {
    if (this.mode === 'ending') {
      const n = ENDINGS.length;
      this.selEnding = (this.selEnding + dir + n) % n;
    } else {
      const pageStart = this.badgePage * BADGE_PAGE_SIZE;
      const n = Math.min(BADGE_PAGE_SIZE, BADGES.length - pageStart);
      this.selBadge = (this.selBadge + dir + n) % n;
    }
    this.refreshList();
    this.refreshDetail();
  }

  private refreshList() {
    const col = getCollection();
    const startY = LIST_Y;
    const rowH = this.mode === 'ending' ? 28 : 24;

    // 顶部进度行
    const unlockedEndings = ENDINGS.filter(e => col.endings.has(e.id)).length;
    const unlockedBadges = BADGES.filter(b => col.badges.has(b.id)).length;
    this.progressText.setText(
      this.mode === 'ending'
        ? `已解锁 ${unlockedEndings} / ${ENDINGS.length} 种人生 · 累计通关 ${col.runs} 次`
        : `已达成 ${unlockedBadges} / ${BADGES.length} 个里程碑`,
    );

    this.rowTexts.forEach(t => t.destroy());
    this.rowTexts = [];

    if (this.mode === 'ending') {
      ENDINGS.forEach((e, i) => {
        const unlocked = col.endings.has(e.id);
        const y = startY + i * rowH;
        const t = this.add.text(LIST_X, y, unlocked ? e.title : '？？？', {
          fontFamily: '"Courier New", monospace', fontSize: '14px',
          color: unlocked ? '#cccccc' : '#555555',
        }).setInteractive({ cursor: 'pointer' });
        t.on('pointerdown', () => { this.selEnding = i; this.refreshList(); this.refreshDetail(); });
        this.rowTexts.push(t);
      });
      this.cursorText.setY(startY + this.selEnding * rowH);
      this.rowTexts.forEach((t, i) => {
        t.setColor(i === this.selEnding ? '#ffc107' : col.endings.has(ENDINGS[i]!.id) ? '#cccccc' : '#555555');
        t.setFontStyle(i === this.selEnding ? 'bold' : 'normal');
      });
    } else {
      const pageStart = this.badgePage * BADGE_PAGE_SIZE;
      const page = BADGES.slice(pageStart, pageStart + BADGE_PAGE_SIZE);
      page.forEach((b, i) => {
        const unlocked = col.badges.has(b.id);
        const y = startY + i * rowH;
        const t = this.add.text(LIST_X, y, `${unlocked ? '✓' : '○'} ${b.title}`, {
          fontFamily: '"Courier New", monospace', fontSize: '13px',
          color: unlocked ? '#cccccc' : '#555555',
        }).setInteractive({ cursor: 'pointer' });
        t.on('pointerdown', () => { this.selBadge = i; this.refreshList(); this.refreshDetail(); });
        this.rowTexts.push(t);
      });
      this.cursorText.setY(startY + this.selBadge * rowH);
      this.rowTexts.forEach((t, i) => {
        const id = BADGES[pageStart + i]!.id;
        t.setColor(i === this.selBadge ? '#ffc107' : col.badges.has(id) ? '#cccccc' : '#555555');
        t.setFontStyle(i === this.selBadge ? 'bold' : 'normal');
      });
    }

    // 页签高亮
    this.tabEnding.setColor(this.mode === 'ending' ? '#ffc107' : '#555555');
    this.tabEnding.setFontStyle(this.mode === 'ending' ? 'bold' : 'normal');
    this.tabBadge.setColor(this.mode === 'badge' ? '#ffc107' : '#555555');
    this.tabBadge.setFontStyle(this.mode === 'badge' ? 'bold' : 'normal');

    // 页面提示
    this.pageLabel?.destroy();
    const hint = this.mode === 'ending'
      ? `↑↓ 选择 · TAB 切换 · ESC 返回`
      : `↑↓ 选择 · ←/→ 翻页（${this.badgePage + 1}/${Math.ceil(BADGES.length / BADGE_PAGE_SIZE)}）· TAB 切换 · ESC 返回`;
    this.pageLabel = this.add.text(480, 508, hint, {
      fontFamily: '"Courier New", monospace', fontSize: '11px', color: '#555555',
    }).setOrigin(0.5);
  }

  private refreshDetail() {
    this.detailObjs.forEach(o => o.destroy());
    this.detailObjs = [];
    const col = getCollection();
    const x = 430, w = 470;
    const mk = (y: number, text: string, style: Phaser.Types.GameObjects.Text.TextStyle) => {
      const o = this.add.text(x, y, text, { fontFamily: '"Courier New", monospace', ...style });
      this.detailObjs.push(o);
      return o;
    };

    if (this.mode === 'ending') {
      const e = ENDINGS[this.selEnding]!;
      const unlocked = col.endings.has(e.id);
      if (unlocked) {
        mk(128, e.title, { fontSize: '18px', color: '#ffc107', fontStyle: 'bold' });
        mk(156, e.subtitle, { fontSize: '13px', color: '#999999' });
        mk(186, e.desc, { fontSize: '12px', color: '#cccccc', wordWrap: { width: w }, lineSpacing: 5 });
        mk(304, `结局判词：${e.stats.verdict}`, { fontSize: '12px', color: '#4fc3f7', wordWrap: { width: w } });
        mk(344, `（${e.stats.title} · ${e.stats.hospital}）`, { fontSize: '11px', color: '#777777', wordWrap: { width: w } });
      } else {
        mk(128, '？？？', { fontSize: '18px', color: '#666666', fontStyle: 'bold' });
        mk(164, '尚未走过这条人生。', { fontSize: '12px', color: '#777777' });
        mk(194, `提示：${ENDING_HINTS[e.id] ?? '继续你的故事。'}`, {
          fontSize: '12px', color: '#888888', wordWrap: { width: w }, lineSpacing: 5,
        });
      }
      return;
    }

    const b = BADGES[this.badgePage * BADGE_PAGE_SIZE + this.selBadge]!;
    const unlocked = col.badges.has(b.id);
    mk(128, `${unlocked ? '✓' : '○'} ${b.title}`, {
      fontSize: '18px', color: unlocked ? '#ffc107' : '#666666', fontStyle: 'bold',
    });
    mk(158, `所属阶段：${b.group}`, { fontSize: '12px', color: '#777777' });
    mk(184, b.desc, { fontSize: '12px', color: '#cccccc', wordWrap: { width: w }, lineSpacing: 5 });
    mk(230, unlocked ? '已达成' : '未达成', {
      fontSize: '13px', color: unlocked ? '#4fc3f7' : '#888888', fontStyle: 'bold',
    });
  }
}
