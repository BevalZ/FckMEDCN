import Phaser from 'phaser';
import { resetGame, patchState, getState } from '../data/gameState';
import { clearSave, loadSave, saveGame } from '../data/save';
import { applyLegacyPerks } from '../data/legacy';
import {
  fundChildEducation, prepayMortgage, withdrawAssets, WITHDRAWAL_FEE_RATE,
} from '../data/economy';
import type { ConsequencePopup } from './ConsequencePopup';

// 游戏内菜单（R 键）：继续游戏 / 返回标题 / 修改性别 / 理财策略 / 资产账户 / 重新开档。
// ↑↓ 或 数字键 选择，空格/回车 确认，ESC 关闭。
// 返回标题不清档（自动存档仍在，标题页可"继续游戏"恢复）；
// 修改性别 / 理财策略 / 资产提现即时生效并写回存档（保留已触发事件集合）；
// 重新开档先弹确认（ESC 可反悔）再放弃本局。
export function bindGameMenu(
  scene: Phaser.Scene,
  consequence: ConsequencePopup,
  isBusy?: () => boolean,
) {
  const MAIN_ITEMS = ['继续游戏', '返回标题', '修改性别', '理财策略', '资产账户', '重新开档'] as const;
  const GENDER_ITEMS = ['男生', '女生'] as const;
  const FINANCE_ITEMS = ['节流储蓄', '稳健生活', '适度投资'] as const;
  const ASSET_ITEMS = ['提现 ¥5,000', '提现 ¥10,000', '子女教育基金', '提前还贷', '返回'] as const;
  type MainItem = typeof MAIN_ITEMS[number];
  type Mode = 'main' | 'gender' | 'finance' | 'assets';

  let container: Phaser.GameObjects.Container | null = null;
  let selected = 0;
  let mode: Mode = 'main';
  let kbHandler: ((e: KeyboardEvent) => void) | null = null;
  const rowTexts: Phaser.GameObjects.Text[] = [];
  const items = (): readonly string[] =>
    mode === 'gender' ? GENDER_ITEMS
      : mode === 'finance' ? FINANCE_ITEMS
      : mode === 'assets' ? ASSET_ITEMS : MAIN_ITEMS;

  const redraw = () => {
    const list = items();
    rowTexts.forEach((t, i) => {
      if (i >= list.length) { t.setText(''); return; }
      t.setColor(i === selected ? '#ffc107' : '#cccccc');
      t.setFontStyle(i === selected ? 'bold' : 'normal');
      t.setText(i === selected ? `▶ ${list[i]}` : `  ${list[i]}`);
    });
  };

  const close = () => {
    container?.destroy();
    container = null;
    if (kbHandler) { scene.input.keyboard?.off('keydown', kbHandler); kbHandler = null; }
    rowTexts.length = 0;
    mode = 'main';
  };

  /** 修改性别：即时写入状态并写回存档（保留 firedEvents/firedNews，防止 once 事件丢失） */
  const setGender = (g: 'male' | 'female') => {
    patchState({ gender: g });
    try {
      const blob = loadSave();
      if (blob) saveGame(blob.sceneKey, blob.firedEvents ?? [], blob.firedNews ?? []);
    } catch { /* 存档不可用时静默 */ }
  };

  /** 理财策略：即时写入状态并写回存档 */
  const setFinance = (f: 'thrifty' | 'stable' | 'invest') => {
    patchState({ financeStrategy: f });
    try {
      const blob = loadSave();
      if (blob) saveGame(blob.sceneKey, blob.firedEvents ?? [], blob.firedNews ?? []);
    } catch { /* 静默 */ }
  };

  const persistCurrentState = () => {
    try {
      const blob = loadSave();
      if (blob) saveGame(blob.sceneKey, blob.firedEvents ?? [], blob.firedNews ?? []);
    } catch { /* 静默 */ }
  };

  const withdraw = (requested: number) => {
    const result = withdrawAssets(requested);
    persistCurrentState();
    close();
    const feePct = Math.round(WITHDRAWAL_FEE_RATE * 100);
    const message = result.withdrawn > 0
      ? `【资产账户】\n提现 ¥${result.withdrawn}，手续费 ¥${result.fee}（${feePct}%）。\n现金到账 ¥${result.received}，资产余额 ¥${result.assetsAfter}。`
      : '【资产账户】\n当前没有可提现资产。';
    consequence.show(message, {}, () => {});
  };

  const spendAssets = (kind: 'education' | 'mortgage') => {
    const result = kind === 'education' ? fundChildEducation() : prepayMortgage();
    persistCurrentState();
    close();
    const unavailable = kind === 'education'
      ? '需要已有子女，且每局只能建立一次教育基金。'
      : '需要已购房，且每局只能提前还贷一次。';
    const message = result
      ? `【资产账户】\n${kind === 'education' ? '教育基金已建立' : '提前还贷已完成'}：¥${result.amount}。\n资产抵扣 ¥${result.assetUsed}，现金支付 ¥${result.cashUsed}。`
      : `【资产账户】\n${unavailable}`;
    consequence.show(message, {}, () => {});
  };

  const doMainAction = (item: MainItem) => {
    if (item === '继续游戏') { close(); return; }
    if (item === '返回标题') {
      close();
      scene.scene.start('TitleScene'); // 不清档
      return;
    }
    if (item === '修改性别') {
      selected = getState().gender === 'female' ? 1 : 0;
      mode = 'gender';
      redraw();
      return;
    }
    if (item === '理财策略') {
      const cur = getState().financeStrategy;
      selected = cur === 'thrifty' ? 0 : cur === 'invest' ? 2 : 1;
      mode = 'finance';
      redraw();
      return;
    }
    if (item === '资产账户') {
      selected = 0;
      mode = 'assets';
      redraw();
      return;
    }
    // 重新开档：先确认，ESC 可反悔
    close();
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
    const W = 360, H = 340;
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
    for (let i = 0; i < MAIN_ITEMS.length; i++) {
      const t = scene.add.text(-W / 2 + 40, -H / 2 + 60 + i * 40, '', {
        fontFamily: '"Courier New", monospace', fontSize: '15px',
      });
      rowTexts.push(t);
      c.add(t);
    }
    const foot = scene.add.text(0, H / 2 - 20, '↑↓ 选择 · 空格 确认 · ESC 关闭', {
      fontFamily: '"Courier New", monospace', fontSize: '11px', color: '#888888',
    }).setOrigin(0.5);
    c.add(foot);

    mode = 'main';
    selected = 0;
    redraw();

    kbHandler = (e: KeyboardEvent) => {
      const n = items().length;
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); selected = (selected + n - 1) % n; redraw(); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); selected = (selected + 1) % n; redraw(); }
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const list = items();
        if (mode === 'gender') {
          setGender(selected === 0 ? 'male' : 'female');
          close();
        } else if (mode === 'finance') {
          setFinance(selected === 0 ? 'thrifty' : selected === 2 ? 'invest' : 'stable');
          close();
        } else if (mode === 'assets') {
          if (selected === 4) { mode = 'main'; selected = 0; redraw(); }
          else if (selected <= 1) withdraw(selected === 0 ? 5000 : 10000);
          else spendAssets(selected === 2 ? 'education' : 'mortgage');
        } else {
          doMainAction(list[selected] as MainItem);
        }
      } else if (e.key === 'Escape') {
        if (mode !== 'main') { mode = 'main'; selected = 0; redraw(); } else { close(); }
      } else {
        const num = parseInt(e.key, 10);
        if (!Number.isNaN(num) && num >= 1 && num <= n) {
          const list = items();
          const picked = num - 1;
          if (mode === 'gender') { setGender(picked === 0 ? 'male' : 'female'); close(); }
          else if (mode === 'finance') { setFinance(picked === 0 ? 'thrifty' : picked === 2 ? 'invest' : 'stable'); close(); }
          else if (mode === 'assets') {
            if (picked === 4) { mode = 'main'; selected = 0; redraw(); }
            else if (picked <= 1) withdraw(picked === 0 ? 5000 : 10000);
            else spendAssets(picked === 2 ? 'education' : 'mortgage');
          } else doMainAction(list[picked] as MainItem);
        }
      }
    };
    scene.input.keyboard?.on('keydown', kbHandler);
  };

  scene.input.keyboard?.on('keydown-R', open);
}
