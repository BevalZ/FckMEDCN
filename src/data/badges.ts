import { getState } from './gameState';
import { getCollection, recordBadge, grantPoint } from './collection';

// 生涯里程碑（徽章）：一组跨阶段、可判定的"人生节点"。
// 与结局图鉴互补——结局记录"你怎么结束"，徽章记录"你经历过什么"。
// 判定全部基于 GameState（flag / 属性 / 婚姻子女），不引入额外运行时状态。

export type BadgeGroup = '本科' | '实习' | '规培' | '硕博' | '职业' | '人生';

export interface Badge {
  id: string;
  group: BadgeGroup;
  title: string;
  desc: string; // 同时充当图鉴里的"达成条件"说明
  check: () => boolean;
}

const st = () => getState();
const has = (flag: string) => st().flags.has(flag);

export const BADGES: Badge[] = [
  // —— 本科 ——
  {
    id: 'b_baoyan', group: '本科', title: '保研上岸', desc: '拿到保研资格，免去考研的苦。',
    check: () => has('baoyan'),
  },
  {
    id: 'b_kaoyan', group: '本科', title: '考研上岸', desc: '备战考研，走过那条最长的自习室走廊。',
    check: () => has('kaoyan'),
  },
  {
    id: 'b_dropout_urge', group: '本科', title: '撑过了退学的念头', desc: '有过"不想读了"的夜晚，但留了下来。',
    check: () => has('dropout_urge'),
  },
  {
    id: 'b_undergrad_suture', group: '本科', title: '第一次缝合', desc: '在练习课上认真缝了一针。不漂亮，但结实。',
    check: () => has('suture_done'),
  },
  // —— 实习 ——
  {
    id: 'b_saw_death', group: '实习', title: '第一次面对死亡', desc: '实习时亲眼送走一位病人，有些东西从此不一样了。',
    check: () => has('saw_death'),
  },
  {
    id: 'b_er_rotation', group: '实习', title: '急诊历练', desc: '在急诊轮转，练出一身"应变本能"。',
    check: () => has('rotation_er'),
  },
  // —— 规培 ——
  {
    id: 'b_licensed', group: '规培', title: '执业医师证', desc: '拿下执业医师资格，独立值班的底气。',
    check: () => has('licensed'),
  },
  {
    id: 'b_base_top', group: '规培', title: '顶尖基地', desc: '拼进顶尖规培基地，赌上青春与平台。',
    check: () => has('base_top'),
  },
  {
    id: 'b_no_phd_path', group: '规培', title: '不读博也有路', desc: '想通"未必非要挤独木桥"，走自己的路。',
    check: () => has('no_phd'),
  },
  // —— 硕博 ——
  {
    id: 'b_phd_graduate', group: '硕博', title: '博士毕业', desc: '熬过延毕与返修，拿到学位。',
    check: () => has('phd_graduated'),
  },
  {
    id: 'b_abroad', group: '硕博', title: '出海联培', desc: '申请公派联培，去看另一片学术天地。',
    check: () => has('abroad'),
  },
  // —— 职业 ——
  {
    id: 'b_zhuzhi', group: '职业', title: '主治在手', desc: '评上主治医师，开始独立管组。',
    check: () => has('passed_zhuzhi'),
  },
  {
    id: 'b_fugao', group: '职业', title: '副高上岸', desc: '评上副主任医师，拿到大多数人的终点。',
    check: () => has('passed_fugao'),
  },
  {
    id: 'b_zhenggao', group: '职业', title: '主任医师', desc: '冲刺正高成功，成为科里的"老师"。',
    check: () => has('passed_zhenggao'),
  },
  {
    id: 'b_mentor', group: '职业', title: '桃李满门', desc: '像当年恩师那样，带出了自己的学生。',
    check: () => has('mentored'),
  },
  {
    id: 'b_admin', group: '职业', title: '科室掌舵', desc: '接下行政担子，从"医生"变成"管理者"。',
    check: () => has('took_admin'),
  },
  // —— 人生 · 结局 ——
  {
    id: 'b_marriage', group: '人生', title: '步入婚姻', desc: '牵起一个人的手，把余生也算进去。',
    check: () => st().marital === 'married',
  },
  {
    id: 'b_parent', group: '人生', title: '为人父母', desc: '家里多了一个需要你的人。',
    check: () => st().hasChild,
  },
  {
    id: 'b_grassroots', group: '人生', title: '扎根基层', desc: '选择基层/回家乡，成为"县城里的主心骨"。',
    check: () => has('offer_grass') || has('base_home') || has('city_home') || has('chose_grassroots'),
  },
  {
    id: 'b_fraud_exposed', group: '人生', title: '通报上的名字', desc: '学术不端被查实，代价是一整个职业生涯。',
    check: () => has('exposed_ruin'),
  },
  {
    id: 'b_lucky_fraud', group: '人生', title: '侥幸的赌徒', desc: '造过假、没被抓，还评上了职称。',
    check: () => has('has_faked') && !has('exposed_retraction') && !has('exposed_ruin')
      && (has('passed_fugao') || st().stats.papers >= 5),
  },
  {
    id: 'b_quit_med', group: '人生', title: '勇敢离开', desc: '退学或退培。这不是逃跑，是一个艰难的决定。',
    check: () => has('left_undergrad') || has('left_med'),
  },
  {
    id: 'b_turn_industry', group: '人生', title: '换一种方式留下', desc: '转行医药产业，用另一种语言和疾病打交道。',
    check: () => has('industry_intern') || has('took_private'),
  },
];

// 待展示的"新达成"徽章标题（由 commitChoice 填充，ConsequencePopup 消费展示）。
let pending: string[] = [];

// 评估全部徽章条件，将新达成的写入图鉴并进入待展示队列。返回新达成徽章。
// 每达成 5 个徽章奖励 1 传承点（多周目传承经济的一部分）。
export function checkBadges(): Badge[] {
  const unlocked = getCollection().badges;
  const fresh: Badge[] = [];
  for (const b of BADGES) {
    if (!unlocked.has(b.id) && b.check()) {
      recordBadge(b.id);
      pending.push(b.title);
      fresh.push(b);
    }
  }
  if (fresh.length > 0) {
    const count = getCollection().badges.size;
    const before = count - fresh.length;
    if (Math.floor(count / 5) > Math.floor(before / 5)) grantPoint();
  }
  return fresh;
}

// ConsequencePopup 每次展示时调用：取走并清空待展示队列。
export function takePendingBadges(): string[] {
  const out = pending;
  pending = [];
  return out;
}

// 测试用：清空待展示队列。
export function clearPendingBadgesForTest() {
  pending = [];
}
