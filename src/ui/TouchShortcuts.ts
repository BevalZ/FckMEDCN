import Phaser from 'phaser';

export interface TouchShortcut {
  label: string;
  onPress: () => void;
}

/** 仅在触屏设备显示的紧凑辅助入口；返回对象交由场景或调用方管理生命周期。 */
export function addTouchShortcuts(
  scene: Phaser.Scene,
  actions: TouchShortcut[],
  opts?: { x?: number; startY?: number; gap?: number },
): Phaser.GameObjects.Text[] {
  if (!scene.sys.game.device.input.touch) return [];
  const x = opts?.x ?? 938;
  const startY = opts?.startY ?? 360;
  const gap = opts?.gap ?? 38;
  return actions.map((action, index) => {
    const button = scene.add.text(x, startY + index * gap, action.label, {
      fontFamily: '"Microsoft YaHei", sans-serif', fontSize: '13px', color: '#ffffff',
      backgroundColor: '#101522dd', padding: { x: 9, y: 7 },
    }).setOrigin(1, 0.5).setDepth(130).setInteractive({ cursor: 'pointer' });
    button.on('pointerdown', action.onPress);
    return button;
  });
}
