import type { GameState } from './gameState';

// 结局页"你的数据 vs 模拟参照"逐项对比（原 M4 规划曾实现后被移除，本文件为完善版恢复）。
// 每个结局给出 3 个可比指标：年龄 / 存款 / 论文。
// range 为游戏模拟参照区间（与玩家数值同量纲），用于"偏低/在区间内/偏高"判定；无 range 则只展示文本。
// 这些参照值是游戏平衡用的匿名模拟基准，不作为现实事实或权威来源展示。

export interface CompareRow {
  label: string;
  unit: string;          // 值后缀：'岁' / '¥' / '篇'
  yours: (s: GameState) => number;
  real: string;          // 模拟参照展示文本
  range?: [number, number];
}

export type Verdict = 'low' | 'mid' | 'high' | 'none';

const age = (s: GameState) => s.stats.age;
const money = (s: GameState) => s.stats.money;
const papers = (s: GameState) => s.stats.papers;

export const ENDING_COMPARISONS: Record<string, CompareRow[]> = {
  quit_guipei: [
    { label: '年龄', unit: '岁', yours: age, real: '规培退培常见 24-27 岁', range: [24, 27] },
    { label: '存款', unit: '¥', yours: money, real: '退培转行起步存款 ¥1万-5万', range: [10000, 50000] },
    { label: '论文', unit: '篇', yours: papers, real: '退培者多无发文' },
  ],
  exhausted_attending: [
    { label: '年龄', unit: '岁', yours: age, real: '主治医师平均 30-38 岁', range: [30, 38] },
    { label: '存款', unit: '¥', yours: money, real: '编外主治同龄存款 ¥5万-30万', range: [50000, 300000] },
    { label: '论文', unit: '篇', yours: papers, real: '三甲主治年均 2-6 篇', range: [2, 6] },
  ],
  stable_at_45: [
    { label: '年龄', unit: '岁', yours: age, real: '副主任平均晋升 39.7 岁，常见 40-48 岁', range: [40, 48] },
    { label: '存款', unit: '¥', yours: money, real: '三甲副主任同龄存款 ¥30万-80万', range: [300000, 800000] },
    { label: '论文', unit: '篇', yours: papers, real: '副主任医师年均 3-8 篇', range: [3, 8] },
  ],
  chief_at_45: [
    { label: '年龄', unit: '岁', yours: age, real: '主任医师平均晋升 43-50 岁', range: [43, 50] },
    { label: '存款', unit: '¥', yours: money, real: '三甲主任医师同龄存款 ¥50万-120万', range: [500000, 1200000] },
    { label: '论文', unit: '篇', yours: papers, real: '主任医师年均 5-12 篇', range: [5, 12] },
  ],
  top_surgeon: [
    { label: '年龄', unit: '岁', yours: age, real: '外科主任常见 40-50 岁', range: [40, 50] },
    { label: '存款', unit: '¥', yours: money, real: '头部外科主任 ¥60万-150万', range: [600000, 1500000] },
    { label: '论文', unit: '篇', yours: papers, real: '顶尖外科医生累计 10-40 篇', range: [10, 40] },
  ],
  community_doctor: [
    { label: '年龄', unit: '岁', yours: age, real: '基层全科常见 30-45 岁', range: [30, 45] },
    { label: '存款', unit: '¥', yours: money, real: '基层医生存款 ¥10万-25万', range: [100000, 250000] },
    { label: '论文', unit: '篇', yours: papers, real: '基层医生少发文' },
  ],
  medical_affairs: [
    { label: '年龄', unit: '岁', yours: age, real: '转行医药常见 30-40 岁', range: [30, 40] },
    { label: '存款', unit: '¥', yours: money, real: '药企医学联络 ¥20万-50万', range: [200000, 500000] },
    { label: '论文', unit: '篇', yours: papers, real: '转行者发文普遍少' },
  ],
  overseas_doctor: [
    { label: '年龄', unit: '岁', yours: age, real: '海外执业常见 35-45 岁', range: [35, 45] },
    { label: '存款', unit: '¥', yours: money, real: '海外主治年薪折合 ¥50万-150万', range: [500000, 1500000] },
    { label: '论文', unit: '篇', yours: papers, real: '海外执业论文 5-15 篇', range: [5, 15] },
  ],
  burnout_early: [
    { label: '年龄', unit: '岁', yours: age, real: '职业倦怠高发 30-40 岁', range: [30, 40] },
    { label: '存款', unit: '¥', yours: money, real: '高强度执业同龄存款 ¥5万-20万', range: [50000, 200000] },
    { label: '论文', unit: '篇', yours: papers, real: '倦怠明显者累计 0-4 篇', range: [0, 4] },
  ],
  academic_star: [
    { label: '年龄', unit: '岁', yours: age, real: '高被引学者常见 35-50 岁', range: [35, 50] },
    { label: '存款', unit: '¥', yours: money, real: '科研骨干 ¥40万-100万', range: [400000, 1000000] },
    { label: '论文', unit: '篇', yours: papers, real: '临床头部年均发文 5-15 篇', range: [5, 15] },
  ],
  grassroots_hero: [
    { label: '年龄', unit: '岁', yours: age, real: '县域骨干常见 35-50 岁', range: [35, 50] },
    { label: '存款', unit: '¥', yours: money, real: '县域骨干医生 ¥10万-30万', range: [100000, 300000] },
    { label: '论文', unit: '篇', yours: papers, real: '基层医生少发文' },
  ],
  left_undergrad: [
    { label: '年龄', unit: '岁', yours: age, real: '本科退学常见 19-22 岁', range: [19, 22] },
    { label: '存款', unit: '¥', yours: money, real: '退学转轨起步 ¥0.5万-2万', range: [5000, 20000] },
    { label: '论文', unit: '篇', yours: papers, real: '——' },
  ],
  era0_unchosen_road: [
    { label: '年龄', unit: '岁', yours: age, real: '高考志愿选择通常发生在 17-19 岁', range: [17, 19] },
    { label: '存款', unit: '¥', yours: money, real: '高中毕业阶段通常无独立积蓄', range: [0, 20000] },
    { label: '论文', unit: '篇', yours: papers, real: '——' },
  ],
  era0_fell_short: [
    { label: '年龄', unit: '岁', yours: age, real: '高考落榜/改道常见 17-20 岁', range: [17, 20] },
    { label: '存款', unit: '¥', yours: money, real: '高中毕业阶段通常无独立积蓄', range: [0, 20000] },
    { label: '论文', unit: '篇', yours: papers, real: '——' },
  ],
  era0_escape_white_tower: [
    { label: '年龄', unit: '岁', yours: age, real: '高考后重新选择通常发生在 17-20 岁', range: [17, 20] },
    { label: '存款', unit: '¥', yours: money, real: '高中毕业阶段通常无独立积蓄', range: [0, 20000] },
    { label: '论文', unit: '篇', yours: papers, real: '——' },
  ],
  disgraced: [
    { label: '年龄', unit: '岁', yours: age, real: '被撤稿者多为 35-50 岁', range: [35, 50] },
    { label: '存款', unit: '¥', yours: money, real: '处分后收入受挫 ¥0-20万', range: [0, 200000] },
    { label: '论文', unit: '篇', yours: papers, real: '涉事论文 1-10 篇', range: [1, 10] },
  ],
  lucky_fraud: [
    { label: '年龄', unit: '岁', yours: age, real: '靠论文晋升人群常见 40-50 岁', range: [40, 50] },
    { label: '存款', unit: '¥', yours: money, real: '已晋升人群 ¥30万-80万', range: [300000, 800000] },
    { label: '论文', unit: '篇', yours: papers, real: '含水分者 5-20 篇', range: [5, 20] },
  ],
  master_clinician: [
    { label: '年龄', unit: '岁', yours: age, real: '临床型专家常见 40-50 岁', range: [40, 50] },
    { label: '存款', unit: '¥', yours: money, real: '临床强、论文少 ¥20万-60万', range: [200000, 600000] },
    { label: '论文', unit: '篇', yours: papers, real: '临床型专家累计 0-3 篇', range: [0, 3] },
  ],
  // —— 不上大学直接工作（轻量捷径 D）的非医生结局 ——
  worker_steady: [
    { label: '年龄', unit: '岁', yours: age, real: '早就业者常见 18-40 岁', range: [18, 40] },
    { label: '存款', unit: '¥', yours: money, real: '蓝领技工积蓄 ¥2万-10万', range: [20000, 100000] },
    { label: '论文', unit: '篇', yours: papers, real: '——' },
  ],
  worker_struggle: [
    { label: '年龄', unit: '岁', yours: age, real: '早就业者常见 18-40 岁', range: [18, 40] },
    { label: '存款', unit: '¥', yours: money, real: '低收入零工常负债 ¥-5万-2万', range: [-50000, 20000] },
    { label: '论文', unit: '篇', yours: papers, real: '——' },
  ],
  great_healer: [
    { label: '年龄', unit: '岁', yours: age, real: '完整职业生涯常见 70-85 岁', range: [70, 85] },
    { label: '存款', unit: '¥', yours: money, real: '退休后现金结余差异很大，以家庭与健康支出为主', range: [-50000, 500000] },
    { label: '论文', unit: '篇', yours: papers, real: '资深临床教师累计发文 5-30 篇', range: [5, 30] },
  ],
  inheritor: [
    { label: '年龄', unit: '岁', yours: age, real: '退休返聘/带教常见 65-80 岁', range: [65, 80] },
    { label: '存款', unit: '¥', yours: money, real: '传承型医生收入回落，重心转向带教与制度交接', range: [-50000, 400000] },
    { label: '论文', unit: '篇', yours: papers, real: '教学型骨干累计发文 3-20 篇', range: [3, 20] },
  ],
  ordinary_road: [
    { label: '年龄', unit: '岁', yours: age, real: '普通医生退休后常见 65-80 岁', range: [65, 80] },
    { label: '存款', unit: '¥', yours: money, real: '普通退休家庭现金结余通常受住房、子女与医疗支出影响', range: [-100000, 300000] },
    { label: '论文', unit: '篇', yours: papers, real: '普通临床医生发文跨度 0-10 篇', range: [0, 10] },
  ],
  unfinished_life: [
    { label: '年龄', unit: '岁', yours: age, real: '带遗憾收束的职业生涯多在 70 岁后回望', range: [70, 85] },
    { label: '存款', unit: '¥', yours: money, real: '长期压力与家庭/健康支出可显著侵蚀退休储蓄', range: [-150000, 250000] },
    { label: '论文', unit: '篇', yours: papers, real: '未竟路径不由论文数量单独定义', range: [0, 20] },
  ],
  final_rest: [
    { label: '年龄', unit: '岁', yours: age, real: '长期高劳损后的退休收束常见 65-80 岁', range: [65, 80] },
    { label: '存款', unit: '¥', yours: money, real: '健康支出上升后现金结余可能偏低', range: [-150000, 200000] },
    { label: '论文', unit: '篇', yours: papers, real: '劳损型职业生涯发文不是核心指标', range: [0, 15] },
  ],
  meteor_life: [
    { label: '年龄', unit: '岁', yours: age, real: '严重健康事件会缩短可工作年限，常见 60-75 岁收束', range: [60, 75] },
    { label: '存款', unit: '¥', yours: money, real: '重大健康事件后现金流承压', range: [-200000, 150000] },
    { label: '论文', unit: '篇', yours: papers, real: '短促但高亮的职业生涯发文跨度很大', range: [0, 20] },
  ],
};

export interface CompareResultRow {
  label: string;
  yoursText: string;   // 如 '¥300,000'
  real: string;
  verdict: Verdict;
}

export function compareEnding(endingId: string, state: GameState): CompareResultRow[] {
  const rows = ENDING_COMPARISONS[endingId] ?? ENDING_COMPARISONS['exhausted_attending'] ?? [];
  return rows.map(r => {
    const v = r.yours(state);
    const yoursText = r.unit === '¥' ? `¥${v.toLocaleString()}` : `${v}${r.unit}`;
    let verdict: Verdict = 'none';
    if (r.range) {
      const [lo, hi] = r.range;
      verdict = v < lo ? 'low' : v > hi ? 'high' : 'mid';
    }
    return { label: r.label, yoursText, real: r.real, verdict };
  });
}
