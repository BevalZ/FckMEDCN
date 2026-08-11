// NPC 站位：在地点门口附近找一个「可行走且不挡门」的格子。
//
// 背景（docs/known-issues.md B2）：原先三个可行走场景各自硬编码偏移
// `c.x + 40 + n * 30, c.y + 34`。一旦某地点门口贴着墙或贴着地图下边，
// NPC 就会被放进实心格里，玩家永远走不过去、无法对话。
// 实测三张地图共有 3 处这样的坑（hospital 的 or / canteen 等）。
//
// 这里改成围绕门口按优先级搜索候选格：
//   1. 只取「非实心」且在网格范围内的格
//   2. 跳过门口本格（NPC 不该站在交互点上，否则永远遮挡进门）
//   3. 同一地点的第 n 个 NPC 取第 n 个可用候选，自然错开、不重叠
//
// 返回 null 表示门口周围找不到落脚点（地图配置极端），调用方应跳过该 NPC，
// 而不是把它放到一个不可达的位置。

function buildCandidateOffsets(): ReadonlyArray<readonly [dc: number, dr: number]> {
  const preferred: Array<readonly [number, number]> = [
  [1, 1], [-1, 1], [1, 0], [-1, 0],
  [0, 1], [2, 1], [-2, 1], [2, 0], [-2, 0],
  [1, 2], [-1, 2], [0, 2],
  [1, -1], [-1, -1], [0, -1],
  ];
  const seen = new Set(preferred.map(([dc, dr]) => `${dc},${dr}`));

  for (let radius = 2; radius <= 6; radius++) {
    const ring: Array<readonly [number, number]> = [];
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (dc === 0 && dr === 0) continue;
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== radius) continue;
        ring.push([dc, dr]);
      }
    }
    ring.sort(([adc, adr], [bdc, bdr]) => {
      const aAbove = adr < 0 ? 1 : 0;
      const bAbove = bdr < 0 ? 1 : 0;
      if (aAbove !== bAbove) return aAbove - bAbove;
      if (Math.abs(adr) !== Math.abs(bdr)) return Math.abs(adr) - Math.abs(bdr);
      if (Math.abs(adc) !== Math.abs(bdc)) return Math.abs(adc) - Math.abs(bdc);
      return adc - bdc;
    });
    for (const [dc, dr] of ring) {
      const key = `${dc},${dr}`;
      if (seen.has(key)) continue;
      seen.add(key);
      preferred.push([dc, dr]);
    }
  }

  return preferred;
}

/** 候选偏移的搜索顺序：先门口附近，再向外扩圈，支撑同地点多 NPC 错开。 */
const CANDIDATE_OFFSETS = buildCandidateOffsets();

export interface PlacementGrid {
  cols: number;
  rows: number;
  /** 该格是否实心（不可通行）。越界应返回 true。 */
  isSolid: (col: number, row: number) => boolean;
}

/**
 * 为门口在 (doorCol, doorRow) 的地点，取第 index 个 NPC 的落脚格。
 * index 从 0 起；同一地点多个 NPC 会落在不同候选格上。
 */
export function npcTileNear(
  grid: PlacementGrid,
  doorCol: number,
  doorRow: number,
  index: number,
): { col: number; row: number } | null {
  const usable: Array<{ col: number; row: number }> = [];
  for (const [dc, dr] of CANDIDATE_OFFSETS) {
    const col = doorCol + dc;
    const row = doorRow + dr;
    if (col < 0 || col >= grid.cols || row < 0 || row >= grid.rows) continue;
    if (grid.isSolid(col, row)) continue;
    usable.push({ col, row });
    // 只需找到 index+1 个即可停，省掉无用搜索
    if (usable.length > index) break;
  }
  return usable[index] ?? usable[usable.length - 1] ?? null;
}
