import { ENDINGS, ENDING_HINTS } from './endings';
import { getCollection } from './collection';

// 结局图鉴线索渐进揭示（REVIEW-PLAYABILITY R13）：
// 未通关：只提示「通关后出现线索」
// 通关≥1 且解锁结局 <5：雾面线索（方向级，轻微剧透）
// 通关≥3 或已解锁≥5：完整 ENDING_HINTS
// 已解锁结局：不走本函数（详情页直接展示正文）

export type HintClarity = 'none' | 'fog' | 'clear';

/** 负向/稀有结局优先给方向感，降低诚实局盲猜成本。 */
export const ENDING_HINT_FOG: Record<string, string> = {
  quit_guipei: '规培路上，有人认真考虑过离开。',
  exhausted_attending: '走完全程，却未必被看见。',
  stable_at_45: '稳住职称与声望，是一条常见的中年着陆。',
  chief_at_45: '副高之后，还有更高的那一格。',
  top_surgeon: '顶流外科，靠论文堆与声望堆。',
  community_doctor: '求职时把目光投向基层/家乡。',
  medical_affairs: '白大褂之外，还有产业与行政岔路。',
  overseas_doctor: '护照与学历一起过硬时，海平面会出现。',
  burnout_early: '心理长期低迷，会提前改写结局。',
  academic_star: '科研轴拉满，名字会出现在别处。',
  grassroots_hero: '基层不只是地点，也是关系网。',
  left_undergrad: '本科阶段，退学也是一种选择。',
  era0_unchosen_road: '填志愿前，医学未必是唯一答案。',
  era0_fell_short: '分数线会挡住一些门。',
  era0_escape_white_tower: '放榜之后，也可以拒绝继续谈学医。',
  disgraced: '学术诚信一旦崩裂，成功叙事会整体改写。',
  lucky_fraud: '造假未必当场翻车——有人带着红利评上了职称。',
  master_clinician: '临床很强、论文很少，病人仍认你。',
  worker_steady: '不升学，也能把日子过成一条稳线。',
  worker_struggle: '没有学历兜底时，起伏会更大。',
  great_healer: '晚年完成度与传承都很高时……',
  inheritor: '时代 6–8，真正把棒交出去。',
  ordinary_road: '归途里，接受普通也是一种完成。',
  unfinished_life: '走到终点，仍有未竟之事。',
  final_rest: '劳损太深时，最后一句可能是「休息」。',
  meteor_life: '多次重大身体事件后，仍留下清晰回声。',
};

export function hintClarity(runs: number, unlockedCount: number): HintClarity {
  if (runs < 1) return 'none';
  if (runs >= 3 || unlockedCount >= 5) return 'clear';
  return 'fog';
}

export function endingHintForGallery(endingId: string): {
  clarity: HintClarity;
  text: string;
  label: string;
} {
  const col = getCollection();
  const unlockedCount = ENDINGS.filter(e => col.endings.has(e.id)).length;
  const clarity = hintClarity(col.runs, unlockedCount);
  if (clarity === 'none') {
    return {
      clarity,
      text: '通关一次后，这里会出现模糊线索；再多走几局会逐渐清晰。',
      label: '线索：未解锁',
    };
  }
  if (clarity === 'fog') {
    return {
      clarity,
      text: ENDING_HINT_FOG[endingId] ?? '方向尚不清晰，再走一局。',
      label: '线索：模糊',
    };
  }
  return {
    clarity,
    text: ENDING_HINTS[endingId] ?? '继续你的故事。',
    label: '线索：清晰',
  };
}
