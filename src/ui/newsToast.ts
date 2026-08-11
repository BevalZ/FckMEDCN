import Phaser from 'phaser';

// 新闻回声横幅：里程碑事件的 newsTickerAfter 触发时，除底部新闻栏外，
// 在屏幕上方弹一条短暂横幅，保证玩家不会错过"过去的选择在新闻里回响"。
export function showNewsToast(scene: Phaser.Scene, headline: string) {
  const t = scene.add.text(480, 116, `新闻 · 游戏内推演 · ${headline}`, {
    fontFamily: '"Courier New", monospace', fontSize: '14px', color: '#ffd54f', fontStyle: 'bold',
    wordWrap: { width: 720 }, align: 'center',
  }).setOrigin(0.5, 0).setDepth(120).setAlpha(0);
  scene.tweens.add({
    targets: t, alpha: 1, duration: 250,
    onComplete: () => scene.tweens.add({
      targets: t, alpha: 0, y: 104, duration: 900, delay: 2000, onComplete: () => t.destroy(),
    }),
  });
}
