import type { TileMapSpec } from '../ui/tilemap';
import type { EventCategory } from './events';
import type { StatDelta } from './stats';

// 规培阶段的可行走教学医院。单屏 30x14 格 @32px = 960x448。
// 图例：',' 走廊  '.' 地砖  '#' 围墙  'I' 内科  'S' 外科  'E' 急诊
//       'L' 实验室  'O' 办公室  'C' 食堂  'R' 值班室  'N' 护士站  'T' 电梯
// 走廊与地砖均可通行，其余字符为实心。
export const GUIPEI_SPEC: TileMapSpec = {
  tile: 32, cols: 30, rows: 14,
  solid: '#ISELONCR',
  grid: [
    '##############################',
    '#,,IIIIIIII,,,,,,,,,,,,,,,,,,#',
    '#,,IIIIIIII,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,T,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,SSSSSSSS,,,,,,,,,,,,,,,,,,#',
    '#,,SSSSSSSS,,,,,,,,,,,,,,,,N,#',
    '#,,,,,,,,,,,,LLLL,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,LLLL,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,EEEEEE,,,,,,,,CCCCCC,,,RR,#',
    '#,,EEEEEE,,,,,,,,CCCCCC,,,RR,#',
    '#,,,,,,,,,,,,OOOOOOOO,,,,,,,,#',
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

export const GUIPEI_SPOTS: readonly Spot[] = [
  {
    id: 'internal', label: '内科', door: [3, 2],
    categories: ['clinical', 'study'],
    daily: { label: '查房', delta: { clinical: 4, knowledge: 2, stamina: -10, sanity: -3 }, consequence: '跟着主任查了一圈，记了满满一页。' },
  },
  {
    id: 'surgery', label: '外科', door: [3, 5],
    categories: ['clinical'],
    daily: { label: '跟台', delta: { clinical: 6, stamina: -16, sanity: -3 }, consequence: '拉钩拉到肩胛骨酸，但学到不少。' },
  },
  {
    id: 'lab', label: '实验室', door: [17, 7],
    categories: ['study', 'career'],
    daily: { label: '做实验', delta: { research: 5, knowledge: 2, stamina: -10, sanity: -4 }, consequence: '细胞养得不错，数据也漂亮。' },
  },
  {
    id: 'er', label: '急诊', door: [3, 11],
    categories: ['clinical', 'mental'],
    daily: { label: '坐诊', delta: { clinical: 5, stamina: -14, sanity: -6 }, consequence: '一个下午看了二十多个病人，嘴没停过。' },
  },
  {
    id: 'canteen', label: '食堂', door: [18, 10],
    categories: ['social', 'mental'],
    daily: { label: '吃饭', delta: { stamina: 6, relations: 2, money: -150 }, consequence: '和同事边吃边吐槽，这大概就是续命的方式。' },
  },
  {
    id: 'office', label: '办公室', door: [12, 12],
    categories: ['career', 'system'],
    daily: { label: '写病历', delta: { knowledge: 3, stamina: -8 }, consequence: '你补完了堆成山的出院记录。' },
  },
  {
    id: 'nurse', label: '护士站', door: [25, 6],
    categories: ['social', 'clinical'],
    daily: { label: '帮忙', delta: { relations: 5, clinical: 2, stamina: -8 }, consequence: '护士长说"辛苦了"，你觉得值了。' },
  },
  {
    id: 'callroom', label: '值班室', door: [25, 11],
    categories: ['mental'],
    daily: { label: '睡觉', delta: {}, consequence: '抓紧时间合一会儿眼。' },
    sleep: true,
  },
];

/** 规培期身体透支惩罚 */
export function guipeiExhaustion(stamina: number): number {
  if (stamina > 35) return 0;
  return -Math.max(2, Math.round((35 - stamina) / 4));
}

/** 出生点：办公室门口 */
export const GUIPEI_SPAWN: readonly [number, number] = [13, 13];
export const GUIPEI_ORIGIN_Y = 56;