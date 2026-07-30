import type { TileMapSpec } from '../ui/tilemap';
import type { EventCategory } from './events';
import type { StatDelta } from './stats';

// 实习阶段的可行走医院。单屏 30x14 格 @32px = 960x448。
// 图例：',' 走廊  '.' 地砖  '#' 围墙  'E' 急诊  'W' 病房  'O' 手术室
//       'D' 医生办公室  'C' 食堂  'R' 值班室  'N' 护士站  'U' 电梯/楼梯
// （'U' 而非 'T'：'T' 在校园图是树，tilemap 的 switch 每个字符只能有一个 case）
// 走廊与地砖均可通行，其余字符为实心。
export const HOSPITAL_SPEC: TileMapSpec = {
  tile: 32, cols: 30, rows: 14,
  solid: '#EWODN',
  grid: [
    '##############################',
    '#,,,,EEEE,,,,,,,,,,,,,,,,,,,,#',
    '#,,,,EEEE,,,,,,,,,,,,,,,,,U,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,,,,WWWWWWWW,,,,,,,,,,,#',
    '#,,,NNN,,,,WWWWWWWW,,,,,,,,,,#',
    '#,,,NNN,,,,,,,,,,,,,,,,O,,O,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,,,,,,,,O,,O,,,.#',
    '#,,DDDDDD,,,,,,,,,,,,,,,,,,,,#',
    '#,,DDDDDD,,,,,,CCCCCC,,,RRRR,#',
    '#,,,,,,,,,,,,,,CCCCCC,,,RRRR,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
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

export const HOSPITAL_SPOTS: readonly Spot[] = [
  {
    id: 'er', label: '急诊', door: [5, 2],
    categories: ['clinical'],
    daily: { label: '接诊', delta: { clinical: 4, stamina: -12, sanity: -4 }, consequence: '你看了几个病人，补了补药。' },
  },
  {
    id: 'ward', label: '病房', door: [14, 5],
    categories: ['clinical', 'study'],
    daily: { label: '查房', delta: { clinical: 3, knowledge: 2, stamina: -10, sanity: -2 }, consequence: '你跟在带教后面，记了一页笔记。' },
  },
  {
    id: 'or', label: '手术室', door: [22, 7],
    categories: ['clinical', 'career'],
    daily: { label: '跟台', delta: { clinical: 5, reputation: 2, stamina: -14, sanity: -3 }, consequence: '一台手术站下来，腿已经不是自己的了。' },
  },
  {
    id: 'canteen', label: '食堂', door: [18, 11],
    categories: ['social', 'mental'],
    daily: { label: '吃饭', delta: { stamina: 6, relations: 2, money: -150 }, consequence: '热饭下肚，你觉得自己能再撑一会儿。' },
  },
  {
    id: 'office', label: '办公室', door: [3, 9],
    categories: ['career', 'study', 'system'],
    daily: { label: '写病历', delta: { knowledge: 3, stamina: -8, sanity: -2 }, consequence: '你补完了剩下的病程记录。' },
  },
  {
    id: 'nurse', label: '护士站', door: [3, 5],
    categories: ['social', 'clinical'],
    daily: { label: '帮忙跑腿', delta: { relations: 5, clinical: 2, stamina: -8 }, consequence: '护士长说"好孩子"，你心里热了一下。' },
  },
  {
    id: 'callroom', label: '值班室', door: [25, 11],
    categories: ['mental'],
    daily: { label: '睡觉（结束本季）', delta: {}, consequence: '你终于能躺下了。' },
    sleep: true,
  },
];

/** 实习期没有学业焦虑，只有体力透支 */
export function internshipExhaustion(stamina: number): number {
  if (stamina > 30) return 0;
  return -Math.max(2, Math.round((30 - stamina) / 4));
}

/** 出生点：办公室门口 */
export const HOSPITAL_SPAWN: readonly [number, number] = [4, 8];
export const HOSPITAL_ORIGIN_Y = 56;