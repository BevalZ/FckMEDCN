import type { TileMapSpec } from '../ui/tilemap';
import type { EventCategory } from './events';
import type { StatDelta } from './stats';
// 本科阶段的可行走校园。单屏 30x14 格 @32px = 960x448，正好铺满 HUD(0..54) 与
// 快讯条(506..540) 之间的可视区，摄像机无需移动。
//
// 图例：',' 草地  '.' 路面  '#' 围墙  'T' 树
//       'L' 图书馆  'C' 教学楼  'D' 宿舍  'F' 食堂  'P' 操场  'B' 公告栏  'K' 技能中心
// 草地与路面均可通行（路面只是视觉引导），其余字符为实心。
export const CAMPUS_SPEC: TileMapSpec = {
  tile: 32, cols: 30, rows: 14,
  solid: '#TLCDFPBK',
  grid: [
    '##############################',
    '#,,,,LLLL,,,,,,,,,CCCC,,,,,,,#',
    '#,,,,LLLL,,,,,,,,,CCCC,,,,,,,#',
    '#,,,,,.,,,,,T,,,,,,.,,,,,,,T,#',
    '#............................#',
    '#,,T,,.,,,,,,,,,,,.,,,,,,B,,,#',
    '#,,,,,.,,,,,,,,,,,.,,,PPPPP,,#',
    '#.....................PPPPP,,#',
    '#,,,,,.,,,,,,,,,,,.,,,PPPPP,,#',
    '#,,,,DDDD,,,,,,,,FFFF,KKKKKK,#',
    '#,,,,DDDD,,,,,,,,FFFF,KKKKKK,#',
    '#,,,,,,,,,,,T,,,,,,,,,,,,,,,,#',
    '#............................#',
    '##############################',
  ],
};

export interface Spot {
  id: string;
  label: string;
  /** 门口所在的可通行格（玩家须走到此处附近才能交互） */
  door: readonly [col: number, row: number];
  /** 该地点可领取的 storylet 分类；空数组表示此处不产出事件 */
  categories: readonly EventCategory[];
  /** 日常活动：消耗 1 行动点，给确定的小幅属性变化 */
  daily: { label: string; delta: StatDelta; consequence: string };
  /** 睡觉点：结束本季度、结算收支 */
  sleep?: true;
}

// 分类分配说明：本科手写事件里 financial 仅 1 条、career 3 条，若一个地点只绑一个
// 冷门分类会常年空转，故公告栏绑定一组"杂项"分类兜底。
export const CAMPUS_SPOTS: readonly Spot[] = [
  {
    id: 'library', label: '图书馆', door: [6, 3],
    categories: ['study'],
    daily: { label: '自习', delta: { knowledge: 4, research: 2, stamina: -12, sanity: -3 }, consequence: '你在角落的老位置坐到了闭馆。' },
  },
  {
    id: 'teaching', label: '教学楼', door: [19, 3],
    categories: ['study', 'clinical'],
    daily: { label: '练操作', delta: { knowledge: 3, clinical: 3, reputation: 1, stamina: -10, sanity: -2 }, consequence: '你在模型上把那套手法练顺了。' },
  },
  {
    // 技能中心：任务清单"技能中心练缝合"的实体落点（此前只有任务文案没有地点，
    // 缝合事件 clinical_skills_lab 又混在教学楼大池里很难抽到——玩家按图索骥找不到地方）。
    // 分类与教学楼同池（study+clinical 保证不空转），日常活动改成缝合手感。
    id: 'skills', label: '技能中心', door: [24, 11],
    categories: ['clinical', 'study'],
    daily: { label: '练缝合', delta: { clinical: 4, knowledge: 1, stamina: -8, sanity: -1 }, consequence: '在模拟臂上又缝了一排，这次的线结匀称多了。' },
  },
  {
    id: 'canteen', label: '食堂', door: [18, 8],
    categories: ['social', 'personal'],
    daily: { label: '吃饭', delta: { stamina: 5, relations: 1, money: -150 }, consequence: '和同学挤在一张桌上，聊了会儿八卦。' },
  },
  {
    id: 'field', label: '操场', door: [21, 7],
    categories: ['mental'],
    daily: { label: '跑步', delta: { stamina: 3, sanity: 5 }, consequence: '跑到第三圈，脑子里那些声音终于安静了。' },
  },
  {
    id: 'board', label: '公告栏', door: [25, 4],
    categories: ['financial', 'career', 'news', 'system'],
    daily: { label: '找兼职', delta: { money: 900, stamina: -13, sanity: -3 }, consequence: '你接了个家教，周末又没了。' },
  },
  {
    id: 'dorm', label: '宿舍', door: [6, 8],
    categories: ['mental', 'personal'],
    // 宿舍的"日常活动"就是睡觉，其数值走 SLEEP_RECOVER（由 sleep() 统一结算），
    // 这里的 delta 留空，避免两处数字各改各的。
    daily: { label: '睡觉（结束本季）', delta: {}, consequence: '一觉睡到自然醒。' },
    sleep: true,
  },
  {
    // 秘密地点：无分类（不显示 '!'），由 CampusScene.trySpecialEvent 拦截触发论文黑市。
    id: 'secret_lab', label: '墙角', door: [1, 12],
    categories: [],
    daily: { label: '查看', delta: {}, consequence: '你凑近看了看。' },
  },
];

// 每季度睡觉时的基础恢复。
export const SLEEP_RECOVER: StatDelta = { stamina: 10 };

// 学业焦虑：每季度结束时按"落后程度"扣心理。
// 医学生的压力不来自忙，而来自跟不上——什么都不学反而更慌。
// 若只给固定小额扣减，跑步(+5)能完全抵消，"摆烂流"心理会一直停在 100（模拟已验证）。
// 故按 期望知识 vs 实际知识 的缺口放大：跟得上几乎不扣，落后越多扣得越狠。
export function academicAnxiety(turnsInStage: number, knowledge: number): number {
  // 期望曲线：20 个季度内从 30 涨到 90（每季 +3）
  const expected = 30 + turnsInStage * 3;
  const gap = expected - knowledge;
  if (gap <= 0) return -1;              // 领先于进度：仅象征性消耗
  return -(1 + Math.round(gap / 6));    // 落后 30 点 → 每季 -6
}

/** 体力透支的阈值：低于此值时身体垮了，心态跟着崩 */
export const EXHAUSTION_THRESHOLD = 25;

// 体力透支惩罚：把"体力"接进已有的心理崩溃机制。
// 否则体力只是个好看的数字——游戏里没有任何地方检查它，熬到 0 也没后果。
export function exhaustionPenalty(stamina: number): number {
  if (stamina >= EXHAUSTION_THRESHOLD) return 0;
  return -Math.max(2, Math.round((EXHAUSTION_THRESHOLD - stamina) / 3));
}

/** 出生点：宿舍门口 */
export const CAMPUS_SPAWN: readonly [col: number, row: number] = [6, 8];

/** 地图绘制原点（HUD 高 54，信息条到 78，地图从 56 起铺到 504） */
export const CAMPUS_ORIGIN_Y = 56;

/** 每季度行动点 */
export const ACTIONS_PER_QUARTER = 3;
