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

/** 候选偏移的搜索顺序：先门口下方与两侧（视觉上"在门边"），再向外扩一圈。 */
const CANDIDATE_OFFSETS: ReadonlyArray<readonly [dc: number, dr: number]> = [
  [1, 1], [-1, 1], [1, 0], [-1, 0],
  [0, 1], [2, 1], [-2, 1], [2, 0], [-2, 0],
  [1, 2], [-1, 2], [0, 2],
  [1, -1], [-1, -1], [0, -1],
];

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
