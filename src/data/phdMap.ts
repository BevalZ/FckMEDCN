import type { TileMapSpec } from '../ui/tilemap';
import type { EventCategory } from './events';
import type { StatDelta } from './stats';

// 博士阶段的可行走实验室 / 组会室。单屏 30x14 格 @32px = 960x448。
// 网格复用本科校园布局（L 实验室 / C 组会室 / D 宿舍 / F 食堂 / P 操场 / B 公告栏 / K 工位）。
export const PHD_SPEC: TileMapSpec = {
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
  door: readonly [col: number, row: number];
  categories: readonly EventCategory[];
  daily: { label: string; delta: StatDelta; consequence: string };
  sleep?: true;
}

export const PHD_SPOTS: readonly Spot[] = [
  {
    id: 'lab', label: '实验室', door: [6, 3],
    categories: ['study', 'clinical'],
    daily: { label: '做实验', delta: { research: 6, knowledge: 3, stamina: -12, sanity: -4 }, consequence: '养的株又传了一代，数据在长。' },
  },
  {
    id: 'meeting', label: '组会室', door: [19, 3],
    categories: ['study', 'career'],
    daily: { label: '做汇报', delta: { knowledge: 3, reputation: 2, stamina: -8, sanity: -2 }, consequence: '你把进展讲完了，导师点了点头。' },
  },
  {
    id: 'bench', label: '工位', door: [24, 11],
    categories: ['study', 'clinical'],
    daily: { label: '写论文', delta: { research: 5, knowledge: 2, stamina: -10 }, consequence: '你又憋出了半节正文。' },
  },
  {
    id: 'canteen', label: '食堂', door: [18, 8],
    categories: ['social', 'personal'],
    daily: { label: '吃饭', delta: { stamina: 5, relations: 1, money: -150 }, consequence: '和同门边吃边吐槽，这大概就是续命的方式。' },
  },
  {
    id: 'field', label: '操场', door: [21, 7],
    categories: ['mental'],
    daily: { label: '跑步', delta: { stamina: 3, sanity: 5 }, consequence: '跑到第三圈，脑子里那些声音终于安静了。' },
  },
  {
    id: 'board', label: '公告栏', door: [25, 4],
    categories: ['study', 'career', 'mental', 'social', 'financial', 'news', 'system'],
    daily: { label: '找兼职', delta: { money: 900, stamina: -13, sanity: -3 }, consequence: '你接了个审稿活儿，周末又没了。' },
  },
  {
    id: 'dorm', label: '宿舍', door: [6, 8],
    categories: ['mental', 'personal'],
    daily: { label: '睡觉（结束本季）', delta: {}, consequence: '一觉睡到自然醒。' },
    sleep: true,
  },
  {
    // 秘密地点：无分类（不显示 '!'），由 trySpecialEvent 拦截触发论文黑市。
    id: 'secret_lab', label: '墙角', door: [1, 12],
    categories: [],
    daily: { label: '查看', delta: {}, consequence: '你凑近看了看。' },
  },
];

/** 每季度睡觉时的基础恢复。 */
export const PHD_SLEEP_RECOVER: StatDelta = { stamina: 10 };
/** 出生点：宿舍门口 */
export const PHD_SPAWN: readonly [number, number] = [6, 8];
/** 地图绘制原点 */
export const PHD_ORIGIN_Y = 56;
/** 每季度行动点 */
export const PHD_ACTIONS_PER_QUARTER = 3;
