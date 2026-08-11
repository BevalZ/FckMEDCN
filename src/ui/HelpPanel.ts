import Phaser from 'phaser';

// 操作帮助面板：H 键切换。给"第一次玩"的高中生一个按键/玩法速查。
// 不占用额外存档字段，纯展示层。
export class HelpPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private lines: string[];
  private isBusy: () => boolean;

  constructor(scene: Phaser.Scene, lines: string[], isBusy?: () => boolean) {
    this.scene = scene;
    this.lines = lines;
    this.isBusy = isBusy ?? (() => false);
    scene.input.keyboard?.on('keydown-H', () => this.toggle());
  }

  /** 有面板展示中（供菜单/重开等全局快捷键守卫） */
  get busy(): boolean { return this.container !== null; }

  toggle() {
    if (this.container) {
      this.container.destroy();
      this.container = null;
      return;
    }
    if (this.isBusy()) return;
    const W = 500;
    const rowH = 22;
    const H = Math.min(560, 56 + this.lines.length * rowH + 16);
    const c = this.scene.add.container(480, 300).setDepth(200);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.92);
    bg.fillRoundedRect(-W / 2, -H / 2, W, H, 10);
    bg.lineStyle(1, 0x4fc3f7, 0.7);
    bg.strokeRoundedRect(-W / 2, -H / 2, W, H, 10);
    c.add(bg);

    const title = this.scene.add.text(0, -H / 2 + 20, '操作帮助  [点击 / H 关闭]', {
      fontFamily: '"Courier New", monospace', fontSize: '15px', color: '#4fc3f7', fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ cursor: 'pointer' });
    title.on('pointerdown', () => this.toggle());
    c.add(title);

    let y = -H / 2 + 50;
    for (const line of this.lines) {
      const t = this.scene.add.text(-W / 2 + 24, y, line, {
        fontFamily: '"Courier New", monospace', fontSize: '13px', color: '#dddddd',
      });
      c.add(t);
      y += rowH;
    }

    const tip = this.scene.add.text(0, y + 8, '—— 医疗是长跑，崩溃不是终点 ——', {
      fontFamily: '"Courier New", monospace', fontSize: '11px', color: '#777777',
    }).setOrigin(0.5);
    c.add(tip);

    this.container = c;
  }

  destroy() {
    if (this.container) { this.container.destroy(); this.container = null; }
  }
}
