import Phaser from 'phaser';
import { resetGame, patchState, getState } from '../data/gameState';
import { clearSave } from '../data/save';
import { applyLegacyPerks } from '../data/legacy';
import type { ConsequencePopup } from './ConsequencePopup';

// 游戏内菜单（R 键）：继续游戏 / 返回标题 / 重新开档。
// ↑↓ 或 数字键 选择，空格/回车 确认，ESC 关闭。
// 返回标题不清档（自动存档仍在，标题页可"继续游戏"恢复）；
// 重新开档先弹确认（ESC 可反悔）再放弃本局。
export function bindGameMenu(
  scene: Phaser.Scene,
  consequence: ConsequencePopup,
  isBusy?: () => boolean,
) {
  const ITEMS = ['继续游戏', '返回标题', '重新开档'] as const;
  type Item = typeof ITEMS[number];

  let container: Phaser.GameObjects.Container | null = null;
  let selected = 0;
  let kbHandler: ((e: KeyboardEvent) => void) | null = null;
  const rowTexts: Phaser.GameObjects.Text[] = [];

  const redraw = () => {
    rowTexts.forEach((t, i) => {
      t.setColor(i === selected ? '#ffc107' : '#cccccc');
      t.setFontStyle(i === selected ? 'bold' : 'normal');
      t.setText(i === selected ? `▶ ${ITEMS[i]}` : `  ${ITEMS[i]}`);
    });
  };

  const close = () => {
    container?.destroy();
    container = null;
    if (kbHandler) { scene.input.keyboard?.off('keydown', kbHandler); kbHandler = null; }
    rowTexts.length = 0;
  };

  const doAction = (item: Item) => {
    close();
    if (item === '继续游戏') return;
    if (item === '返回标题') {
      // 不清档：自动存档仍在，标题页可"继续游戏"恢复本局
      scene.scene.start('TitleScene');
      return;
    }
    // 重新开档：先确认，ESC 可反悔
    consequence.show(
      '【重新开档】\n确定放弃本局，直接开新档吗？\n当前进度将被覆盖。\n\n（空格/回车 确认，ESC 取消）',
      {},
      () => {
        resetGame();
        clearSave();
        patchState({ stats: applyLegacyPerks(getState().stats) });
        scene.scene.start('GaokaoScene');
      },
      { escape: 'cancel' },
    );
  };

  const open = () => {
    if (container || isBusy?.()) return;
    const W = 340, H = 200;
    const c = scene.add.container(480, 300).setDepth(190);
    container = c;
    const bg = scene.add.graphics();
    bg.fillStyle(0x000000, 0.92);
    bg.fillRoundedRect(-W / 2, -H / 2, W, H, 10);
    bg.lineStyle(1, 0xffc107, 0.7);
    bg.strokeRoundedRect(-W / 2, -H / 2, W, H, 10);
    c.add(bg);

    const title = scene.add.text(0, -H / 2 + 22, '游戏菜单  [R] 关闭', {
      fontFamily: '"Courier New", monospace', fontSize: '15px', color: '#ffc107', fontStyle: 'bold',
    }).setOrigin(0.5);
    c.add(title);

    rowTexts.length = 0;
    ITEMS.forEach((_item, i) => {
      const t = scene.add.text(-W / 2 + 40, -H / 2 + 62 + i * 34, '', {
        fontFamily: '"Courier New", monospace', fontSize: '15px',
      });
      rowTexts.push(t);
      c.add(t);
    });
    const foot = scene.add.text(0, H / 2 - 20, '↑↓ 选择 · 空格 确认 · ESC 关闭', {
      fontFamily: '"Courier New", monospace', fontSize: '11px', color: '#888888',
    }).setOrigin(0.5);
    c.add(foot);

    selected = 0;
    redraw();

    kbHandler = (e: KeyboardEvent) => {
      const n = ITEMS.length;
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); selected = (selected + n - 1) % n; redraw(); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); selected = (selected + 1) % n; redraw(); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); doAction(ITEMS[selected]); }
      else if (e.key === 'Escape') { close(); }
      else {
        const num = parseInt(e.key, 10);
        if (!Number.isNaN(num) && num >= 1 && num <= n) doAction(ITEMS[num - 1]);
      }
    };
    scene.input.keyboard?.on('keydown', kbHandler);
  };

  scene.input.keyboard?.on('keydown-R', open);
}
