import type { TileMapSpec } from '../ui/tilemap';
import type { EventCategory } from './events';
import type { StatDelta } from './stats';

// 职业阶段的可行走医院。单屏 30x14 格 @32px = 960x448。
// 网格复用规培教学医院布局（I 内科 / S 外科 / L 实验室 / E 急诊 / C 食堂 / O 行政 / R 值班室 / N 护士站 / U 电梯）。
// 职业期没有 study 类事件，故地点分类改为 clinical/career/mental/social/financial。
export const CAREER_SPEC: TileMapSpec = {
  tile: 32, cols: 30, rows: 14,
  solid: '#ISELONCR',
  grid: [
    '##############################',
    '#,,IIIIIIII,,,,,,,,,,,,,,,,,,#',
    '#,,IIIIIIII,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,U,#',
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

export const CAREER_SPOTS: readonly Spot[] = [
  {
    id: 'ward', label: '内科', door: [3, 2],
    categories: ['clinical', 'career'],
    daily: { label: '查房', delta: { clinical: 4, knowledge: 2, stamina: -10, sanity: -3 }, consequence: '跟着主任查了一圈，记了满满一页。' },
  },
  {
    id: 'surgery', label: '外科', door: [3, 5],
    categories: ['clinical'],
    daily: { label: '跟台', delta: { clinical: 6, stamina: -16, sanity: -3 }, consequence: '拉钩拉到肩胛骨酸，但学到不少。' },
  },
  {
    id: 'lab', label: '实验室', door: [17, 7],
    categories: ['clinical', 'career'],
    daily: { label: '读文献', delta: { knowledge: 3, reputation: 1, stamina: -8 }, consequence: '你翻了几篇最新的指南，心里有底了。' },
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
    id: 'admin', label: '行政楼', door: [12, 12],
    categories: ['career', 'financial', 'system'],
    daily: { label: '写病历', delta: { knowledge: 3, stamina: -8 }, consequence: '你补完了堆成山的出院记录。' },
  },
  {
    id: 'nurse', label: '护士站', door: [25, 6],
    categories: ['social', 'clinical'],
    daily: { label: '沟通', delta: { relations: 5, clinical: 2, stamina: -8 }, consequence: '护士长说"辛苦了"，你觉得值了。' },
  },
  {
    id: 'rest', label: '值班室', door: [25, 11],
    categories: ['mental'],
    daily: { label: '睡觉（结束本季）', delta: {}, consequence: '抓紧时间合一会儿眼。' },
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
export const CAREER_SLEEP_RECOVER: StatDelta = { stamina: 10 };
/** 出生点：走廊 */
export const CAREER_SPAWN: readonly [number, number] = [14, 9];
/** 地图绘制原点 */
export const CAREER_ORIGIN_Y = 56;
/** 每季度行动点 */
export const CAREER_ACTIONS_PER_QUARTER = 3;
