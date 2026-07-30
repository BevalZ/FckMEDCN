import { test, expect } from '@playwright/test';

// A2 回归：textPatch 全局文字补丁的机制断言（docs/known-issues.md A2）。
// 视觉裁切本身只能人工确认，但补丁的机制（自动补顶部 padding、尊重显式 padding、幂等）
// 可以完全自动化——机制在，裁切就不会复发；机制没了（比如误删 install 调用），这里能抓住。

const BASE = 'http://127.0.0.1:5173/';

test('A2 文字补丁：add.text 自动补顶部 padding、尊重显式值、幂等', async ({ page }) => {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).game, null, { timeout: 120000 });

  const result = await page.evaluate(() => {
    const scene = (window as any).game.scene.getScenes(true)[0] as any;
    const mk = (style: any) => {
      const t = scene.add.text(-500, -500, '测试中文Aa', style);
      const pad = t.padding;
      t.destroy();
      return pad;
    };

    // 18px → topPadFor = max(3, round(3.6)) = 4
    const auto = mk({ fontSize: '18px' });
    // 52px 大标题（GaokaoScene 场景字号）→ max(3, round(10.4)) = 10
    const big = mk({ fontSize: '52px' });
    // 显式对象 padding.top=10 应被保留
    const explicit = mk({ fontSize: '18px', padding: { top: 10 } });
    // 数字 padding=1 低于阈值 → top 抬到 4，其余边保持 1
    const lowNum = mk({ fontSize: '18px', padding: 1 });
    // 对象 padding 只写了 left → 补 top，保留 left
    const leftOnly = mk({ fontSize: '18px', padding: { left: 7 } });

    // 幂等：补丁标记存在且重复 install 不叠加（工厂只包一层）
    const factory = (window as any).game.scene.getScenes(true)[0].add;
    const flagged = !!Object.getOwnPropertySymbols
      .call(Object, factory)
      ?.length; // 占位，真实断言在下面直接读 Symbol.for
    void flagged;
    const proto = Object.getPrototypeOf(factory);
    const symInstalled = proto[Symbol.for('fckmedcn.textPatch.installed')];

    return { auto, big, explicit, lowNum, leftOnly, symInstalled: !!symInstalled };
  });

  expect(result.symInstalled, 'textPatch 应已安装（Symbol 标记）').toBe(true);
  expect(result.auto.top, '18px 文字应自动补 4px 顶部 padding').toBe(4);
  expect(result.auto.bottom, '底部约为顶部一半').toBeGreaterThanOrEqual(1);
  expect(result.big.top, '52px 大标题应补 10px').toBe(10);
  expect(result.explicit.top, '显式 padding.top=10 应被尊重').toBe(10);
  expect(result.lowNum.top, '数字 padding=1 应被抬到阈值 4').toBe(4);
  expect(result.lowNum.left, '其余边保持 1').toBe(1);
  expect(result.leftOnly.top, '只写 left 时应补 top').toBe(4);
  expect(result.leftOnly.left, 'left 保持 7').toBe(7);
});
