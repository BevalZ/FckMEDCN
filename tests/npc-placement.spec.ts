import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// NPC 站位回归（docs/known-issues.md B2）。
//
// 旧实现在三个可行走场景里各自硬编码偏移 `c.x + 40 + n * 30, c.y + 34`，
// 只要地点门口贴着墙或贴着地图边缘，NPC 就会被放进实心格：玩家走不过去，
// 按 E 也够不着，对话内容成为死内容。现改为 `npcTileNear` 在门口周围搜可行走格。
//
// 这条测试把 placeNpcs 的选格逻辑按同样顺序重跑一遍（同一地点第 n 个 NPC 取第 n 个候选），
// 覆盖三张地图 × 全部季度 × 全部 NPC。之所以在浏览器里跑而不是扫源码文本：
// B5 的教训是正则静态校验容易假阳性，这里直接调用真实模块（经 window.__mod，
// 避免 import() 拿到另一个模块实例，见 src/main.ts 的注释）。

const BASE = 'http://127.0.0.1:5173/';

/** 覆盖到各 schedule 长度的最小公倍数以上；现有 schedule 均为 4，取 24 足够绕多圈 */
const TURNS = 24;

async function bootModules(page: Page) {
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => !!(window as any).__mod, null, { timeout: 120000 });
}

interface Problem {
  map: string; turn: number; npc: string; spot: string; kind: string; detail: string;
}

test('NPC 站位：三张地图上每个 NPC 每季都落在可行走格', async ({ page }) => {
  await bootModules(page);

  const { problems, placed } = await page.evaluate((turns) => {
    const { npc, cm, hm, gm, np, tm } = (window as any).__mod;

    const MAPS = [
      { map: 'campus', stage: 'undergrad', spec: cm.CAMPUS_SPEC, spots: cm.CAMPUS_SPOTS },
      { map: 'hospital', stage: 'internship', spec: hm.HOSPITAL_SPEC, spots: hm.HOSPITAL_SPOTS },
      { map: 'guipei', stage: 'guipei', spec: gm.GUIPEI_SPEC, spots: gm.GUIPEI_SPOTS },
    ];

    const problems: Problem[] = [];
    const placed: Record<string, number> = {};

    for (const { map, stage, spec, spots } of MAPS) {
      const isSolid = tm.makeIsSolid(spec);
      const roster = npc.npcsForStage(stage);
      placed[map] = roster.length;

      for (let turn = 0; turn < turns; turn++) {
        // 与 placeNpcs 一致：同一地点内按出现顺序递增序号，取不同候选格
        const usedAt: Record<string, number> = {};
        const takenTiles: Record<string, string> = {};

        for (const def of roster) {
          const spotId = npc.npcSpotAt(def, turn);
          if (!spotId) continue;
          const spot = spots.find((s: any) => s.id === spotId);
          if (!spot) {
            // schedule 写了这张图上不存在的地点 id → placeNpcs 会静默跳过，NPC 整季消失
            problems.push({
              map, turn, npc: def.id, spot: spotId, kind: 'unknown-spot',
              detail: `该地图没有 id=${spotId} 的地点`,
            });
            continue;
          }

          const n = usedAt[spotId] ?? 0;
          usedAt[spotId] = n + 1;
          const tile = np.npcTileNear(
            { cols: spec.cols, rows: spec.rows, isSolid },
            spot.door[0], spot.door[1], n,
          );

          if (!tile) {
            problems.push({
              map, turn, npc: def.id, spot: spotId, kind: 'no-tile',
              detail: `门口(${spot.door[0]},${spot.door[1]}) 周围找不到落脚格`,
            });
            continue;
          }
          if (isSolid(tile.col, tile.row)) {
            problems.push({
              map, turn, npc: def.id, spot: spotId, kind: 'solid',
              detail: `落在实心格(${tile.col},${tile.row})，玩家无法靠近`,
            });
          }
          if (tile.col === spot.door[0] && tile.row === spot.door[1]) {
            problems.push({
              map, turn, npc: def.id, spot: spotId, kind: 'on-door',
              detail: `站在门口本格(${tile.col},${tile.row})，会挡住地点交互`,
            });
          }
          const key = `${tile.col},${tile.row}`;
          if (takenTiles[key]) {
            // npcTileNear 候选耗尽时会退回最后一个候选，两个 NPC 会叠在一起。
            // 说明该地点门口的可行走格不够用，需要调 schedule 或扩 CANDIDATE_OFFSETS。
            problems.push({
              map, turn, npc: def.id, spot: spotId, kind: 'overlap',
              detail: `与 ${takenTiles[key]} 重叠于(${key})`,
            });
          }
          takenTiles[key] = def.id;
        }
      }
    }
    return { problems, placed };
  }, TURNS);

  console.log('各地图上场 NPC 数:', JSON.stringify(placed));
  if (problems.length) {
    console.log('站位问题:');
    for (const p of problems.slice(0, 40)) {
      console.log(`  [${p.kind}] ${p.map} turn=${p.turn} ${p.npc}@${p.spot} — ${p.detail}`);
    }
  }

  // 三张可行走地图都应当有 NPC。曾经医院/规培两图的 NpcDef 缺失，
  // 对话池写好了却没人上场，B2 的修复在这两张图上根本没被执行到。
  expect(placed.campus, '本科校园没有任何 NPC 上场').toBeGreaterThan(0);
  expect(placed.hospital, '实习医院没有任何 NPC 上场').toBeGreaterThan(0);
  expect(placed.guipei, '规培医院没有任何 NPC 上场').toBeGreaterThan(0);

  expect(problems, `共 ${problems.length} 处站位问题（详见上方日志）`).toEqual([]);
});

test('NPC 数据：对话池与 NpcDef 双向对齐', async ({ page }) => {
  await bootModules(page);

  const { noTalk, noDef } = await page.evaluate(() => {
    const { npc } = (window as any).__mod;
    const ids: string[] = npc.NPCS.map((n: any) => n.id);
    const talkIds: string[] = [...npc.TALK_IDS];

    return {
      // 会上场却没写对话：玩家走过去按 E 毫无反应
      noTalk: npc.NPCS.filter((n: any) => n.schedule && !talkIds.includes(n.id)).map((n: any) => n.id),
      // 写了对话却没有 NpcDef：这段内容永远不会被任何玩家看到
      noDef: talkIds.filter(id => !ids.includes(id)),
    };
  });

  expect(noTalk, `这些 NPC 会出现在地图上但没有对话池：${noTalk.join(', ')}`).toEqual([]);
  expect(noDef, `这些对话写好了却没有对应 NpcDef，永远触发不到：${noDef.join(', ')}`).toEqual([]);
});
