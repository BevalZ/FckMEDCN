import Phaser from 'phaser';

// —— 全局文字补丁：修正中文字形顶部被裁的问题 ——
//
// 背景：config.pixelArt=false 时，Phaser 把每个 Text 渲染成一张 canvas 贴图，
// 贴图高度按 fontSize 估算的 ascent/descent 推算。中文（及不少 CJK 字形）的实际
// 上沿常超出该估算，导致文字顶部约 1/3 被裁掉。
//
// 通用修法：给所有文字加一点纵向 padding，把画布撑高，字形就不再触顶。
// 这里统一包装 GameObjectFactory.text 工厂，对全项目 93 处 add.text 一次性生效，
// 无需逐处改。padding 让 Text 变高，而各处基于实测 height 的布局会自适应，不会裁剪。
//
// 注意：
//  - 必须 clone style，避免污染被多处复用的同一 style 字面量对象。
//  - 已显式写了 padding 的调用予以尊重，只在其缺省时补默认值。
//  - 幂等：重复 install 不叠加（HMR / 多次导入安全）。

const PATCHED = Symbol.for('fckmedcn.textPatch.installed');

/** 按字号估算需要的顶部留白：约 20%，最少 3px。 */
function topPadFor(fontSize: number): number {
  return Math.max(3, Math.round(fontSize * 0.2));
}

/** 从 style.fontSize（可能是 '18px' 或 number）解析出像素数，失败回退 16。 */
function parseFontPx(style: Phaser.Types.GameObjects.Text.TextStyle | undefined): number {
  const fs = style?.fontSize;
  if (typeof fs === 'number') return fs;
  if (typeof fs === 'string') {
    const m = fs.match(/([\d.]+)/);
    if (m) return parseFloat(m[1]);
  }
  return 16;
}

export function installTextPatch(): void {
  const factory = Phaser.GameObjects.GameObjectFactory.prototype as unknown as Record<string, unknown>;
  if (factory[PATCHED as unknown as string]) return;

  const orig = Phaser.GameObjects.GameObjectFactory.prototype.text;

  Phaser.GameObjects.GameObjectFactory.prototype.text = function (
    this: Phaser.GameObjects.GameObjectFactory,
    x: number, y: number,
    text: string | string[],
    style?: Phaser.Types.GameObjects.Text.TextStyle,
  ): Phaser.GameObjects.Text {
    const px = parseFontPx(style);
    const topPad = topPadFor(px);

    // clone，避免改到调用方复用的 style 对象
    const next: Phaser.Types.GameObjects.Text.TextStyle = { ...(style ?? {}) };
    const p = next.padding;

    if (p == null) {
      next.padding = { top: topPad, bottom: Math.max(1, Math.round(topPad / 2)) };
    } else if (typeof p === 'number') {
      // 数字型 padding：四边统一，已够顶部留白则保留，否则抬到 topPad
      if (p < topPad) next.padding = { left: p, right: p, top: topPad, bottom: p };
    } else {
      // 对象型 padding：仅在未指定 top 时补
      const hasTop = typeof (p as { top?: number }).top === 'number' && (p as { top?: number }).top! > 0;
      const hasY = typeof (p as { y?: number }).y === 'number' && (p as { y?: number }).y! > 0;
      if (!hasTop && !hasY) {
        next.padding = { ...(p as object), top: topPad };
      }
    }

    return orig.call(this, x, y, text, next);
  } as typeof orig;

  factory[PATCHED as unknown as string] = true;
}
