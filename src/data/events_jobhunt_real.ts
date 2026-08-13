// 求职写实管线（jobhunt 阶段）。
// 目标：把"投简历→笔试→面试→多offer→签三方→违约"与"本校附属加成 / 导师推荐人情黑箱"做成可玩、可测、
// 尽量贴近玩家体感的机制。所有地区经济都落到 economy.ts currentRegionTier 已消费的 region flag 上
// （offer_sanjia / took_hospital_a / took_public / took_private / offer_grass），由 signUnit 写。
//
// 设计要点：
//  - 概率结算用新增的 rollOutcome effect（见 events.ts / effects.ts），引擎保持单位无关，
//    affiliateBonus / referralBonus 的具体数值由本文件按单位写好。
//  - applyUnit / receiveOffer / signUnit / breachUnit 四个 effect 负责"投简历 / 拿offer / 签三方 / 违约"
//    的状态改写（含本校附属标记、jobOffers 列表、signedUnitId、breachCount）。
//  - 旧 events_jobhunt.ts / m2_jh_* 已拆为纯氛围池（不再写 region/signed），本文件独占 region 与 signed。

import type { GameEvent, EventChoice } from './events';
import { RECRUIT_UNITS, getUnit, type RecruitUnit } from './jobhunt_units';

const DEGREE_TEXT: Record<RecruitUnit['minDegree'], string> = {
  bachelor: '本科可投',
  master_pro: '专硕/临床硕士起',
  master_academic: '学硕起',
  phd: '博士起（科研岗）',
};

// 笔试 / 面试基础通过率（按档位，越顶尖越难）。R15 按游戏平衡校准：
// 热门三甲岗竞争强、基层相对宽松；顶尖档 base 压到 ~0.3 以形成路线差异。
// BASE 是"已满足学历/硬门槛后的合格考生"口径，用于模拟而非现实统计。
const EXAM_BASE: Record<RecruitUnit['tier'], number> = {
  sanjiajia: 0.3, sanjiayi: 0.42, erjia: 0.68, community: 0.85,
};
const IV_BASE: Record<RecruitUnit['tier'], number> = {
  sanjiajia: 0.28, sanjiayi: 0.4, erjia: 0.62, community: 0.8,
};

function applyChoice(u: RecruitUnit): EventChoice {
  const req: Record<string, [number, number]> = {
    reputation: [u.minReputation, 100],
    papers: [u.minPapers, 100],
    clinical: [u.minClinical, 100],
  };
  return {
    text: `投${u.name}（${u.tierLabel}·${u.city}·${DEGREE_TEXT[u.minDegree]}）`,
    delta: { reputation: 1, stamina: -4, sanity: -2 },
    effect: { kind: 'applyUnit', unitId: u.id },
    requireStat: req,
    ...(u.minDegree === 'phd' ? { requireFlag: 'phd_graduated' } : {}),
    // R16/R18：三甲/市级/真·公立岗把"规培合格证"当硬门槛（无规培证不能独立值班/入职）。
    // 本校附属的 xiehe 是 phd 岗，phd_graduated 已隐含规培完成，故这里只对市级三甲与公立三乙加 gp_cert 门槛。
    ...(u.regionFlag === 'took_hospital_a' || u.regionFlag === 'took_public'
      ? { requireFlag: 'has_gp_cert' } : {}),
    consequence: `你把简历投进了${u.name}的招聘系统。`,
  };
}

function examEvent(u: RecruitUnit): GameEvent {
  return {
    id: `jh_real_exam_${u.id}`,
    stage: 'jobhunt',
    title: `${u.name}·笔试`,
    body: `${u.name}的笔试：专业理论 + 临床知识 + 英语文献。题量大、淘汰率高，${u.tierLabel}尤甚。`,
    category: 'career',
    weight: 110,
    once: true,
    minTurn: 1,
    maxTurn: 2,
    requireFlag: `jh_applied_${u.id}`,
    excludeFlag: `jh_iv_pass_${u.id}`,
    choices: [
      {
        text: '认真备考，参加笔试',
        delta: { knowledge: 2, stamina: -8, sanity: -3 },
        effect: {
          kind: 'rollOutcome',
          base: EXAM_BASE[u.tier],
          knowledgeBonus: 0.01,
          clinicalBonus: 0.008,
          successFlag: `jh_exam_pass_${u.id}`,
          failFlag: `jh_exam_fail_${u.id}`,
        },
        consequence: '走出考场，你不知道自己过没过线。',
      },
    ],
  };
}

function interviewEvent(u: RecruitUnit): GameEvent {
  const affilNote = u.affiliatedSchoolId ? '（本校附属医院，面试有隐形加成）' : '';
  return {
    id: `jh_real_iv_${u.id}`,
    stage: 'jobhunt',
    title: `${u.name}·面试`,
    body: `${u.name}结构化面试 + 临床技能考核${affilNote}。导师推荐信（有人情）能加分，但最终看硬实力与缘分。`,
    category: 'career',
    weight: 120,
    once: true,
    minTurn: 1,
    maxTurn: 3,
    requireFlag: `jh_applied_${u.id}`,
    excludeFlag: `jh_iv_pass_${u.id}`,
    choices: [
      {
        text: '准备作品集与自我介绍，参加面试',
        delta: { reputation: 2, relations: 2, stamina: -6, sanity: -2 },
        effect: {
          kind: 'rollOutcome',
          base: IV_BASE[u.tier],
          repPer10: 0.06,
          paperBonus: 0.02,
          knowledgeBonus: 0.006,
          clinicalBonus: 0.01,
          affiliateBonus: u.affiliatedSchoolId ? 0.18 : undefined,
          affiliateFlag: `jh_affil_${u.id}`,
          referralBonus: 0.22,
          referralFlag: 'got_recommend',
          luckBonus: 0.02,
          // R30 海归认可度：有海外联培/留学经历的博士，一线三甲科研岗更吃香
          ...(u.id === 'xiehe_h' ? { overseasFlag: 'abroad', overseasBonus: 0.12 } : {}),
          // R24 博士后过渡：做过博后的博士，科研岗面试再加成
          ...(u.minDegree === 'phd' ? { postdocFlag: 'did_postdoc', postdocBonus: 0.12 } : {}),
          successFlag: `jh_iv_pass_${u.id}`,
          failFlag: `jh_iv_fail_${u.id}`,
        },
        consequence: '你握住面试官的手，掌心全是汗。',
      },
    ],
  };
}

function offerPassEvent(u: RecruitUnit): GameEvent {
  return {
    id: `jh_real_iv_pass_${u.id}`,
    stage: 'jobhunt',
    title: `${u.name}·录用通知`,
    body: `${u.name}发来了录用通知。${u.salaryNote}。`,
    category: 'career',
    weight: 200,
    once: true,
    minTurn: 1,
    maxTurn: 3,
    requireFlag: `jh_iv_pass_${u.id}`,
    choices: [
      {
        text: '收下 offer（进入多 offer 抉择）',
        delta: { reputation: 3, sanity: 3 },
        effect: { kind: 'receiveOffer', unitId: u.id },
        consequence: '你把它截图发给了家人。',
      },
    ],
  };
}

function backdoorChoice(u: RecruitUnit): EventChoice {
  return {
    text: `让导师给${u.name}院长打招呼`,
    delta: { reputation: -1, relations: 3, sanity: -2 },
    effect: {
      kind: 'rollOutcome',
      base: 0.45,
      referralBonus: 0.3,
      referralFlag: 'got_recommend',
      successFlag: `jh_iv_pass_${u.id}`,
      failFlag: `jh_backdoor_fail_${u.id}`,
    },
      flagRequire: `jh_applied_${u.id}`,
      consequence: '导师一个电话，比你自己投十份简历都管用——你希望这不算是作弊。',
  };
}

// 由 RECRUIT_UNITS 批量生成 笔试/面试/录用 事件
const UNIT_EVENTS: GameEvent[] = RECRUIT_UNITS.flatMap((u) => [
  examEvent(u),
  interviewEvent(u),
  offerPassEvent(u),
]);

// ============================================================
// 手写里程碑事件（投简历窗口 / 多offer抉择 / 签三方 / 人情黑箱 / 违约）
// ============================================================

const APPLY_EVENT: GameEvent = {
  id: 'jh_real_apply',
  stage: 'jobhunt',
  title: '投简历·秋招窗口',
  body:
    '招聘季有清晰的时间窗口：秋招（9-11月）岗位最多，春招（3-4月）补录，规培合格当年按应届同等对待是少数窗口期。' +
    '每家单位都写明学历门槛——三甲临床岗硕士起、科研岗博士、县城二甲本科可进。投错了门槛，简历直接石沉大海。',
  category: 'career',
  weight: 200,
  once: true,
  minTurn: 0,
  maxTurn: 2,
  choices: [
    ...RECRUIT_UNITS.map(applyChoice),
    // R24 博士后过渡：博士可先进站做博后（2 年），冲科研平台，期间仍算"求职窗口"的一部分
    {
      text: '先进站做博士后（2 年过渡，冲科研）',
      delta: { knowledge: 6, reputation: 4, stamina: -10, sanity: -2 },
      effect: { kind: 'setFlag', flag: 'did_postdoc' },
      flagRequire: 'phd_graduated',
      consequence: '你把行李暂存在博后公寓，科研继续，求职缓缓。',
    },
    {
      text: '先观望，暂不投',
      delta: { sanity: 1 },
      consequence: '你把招聘APP划掉了，又打开。',
    },
  ],
};

const OFFER_SELECT_EVENT: GameEvent = {
  id: 'jh_real_offer_select',
  stage: 'jobhunt',
  title: '多 offer 抉择',
  body:
    '手里攥着几份录用通知。签字截止日就在眼前——一旦签了三方，再换单位就是违约，要赔钱、背记录。' +
    '平台、编制、城市、薪水，每个维度都扯着你的心。',
  category: 'career',
  weight: 190,
  once: true,
  minTurn: 2,
  requireFlag: 'jh_has_offer',
  choices: [
    ...RECRUIT_UNITS.map((u) => ({
      text: `签${u.name}三方（${u.tierLabel}·${u.city}）`,
      delta: { reputation: 2 },
      effect: { kind: 'signUnit', unitId: u.id } as const,
      flagRequire: `offer_${u.id}`,
      nextEventId: 'jh_real_sanfang',
      consequence: `你决定把青春押在${u.name}。`,
    })),
    {
      text: '都不签，再等等',
      delta: { sanity: -2 },
      consequence: '你把通知都存进文件夹，没敢落笔。',
    },
  ],
};

const SANFANG_EVENT: GameEvent = {
  id: 'jh_real_sanfang',
  stage: 'jobhunt',
  title: '签三方',
  body:
    '笔尖落在三方协议上。一联学校、一联单位、一联自己。你想起八年前的录取通知书，那行"健康所系，性命相托"。' +
    '签了，这页纸就有了分量——毁约要赔钱，还要在单位间留下记录。',
  category: 'personal',
  weight: 80,
  once: true,
  minTurn: 2,
  choices: [
    { text: '"我准备好了"', delta: { sanity: 4, relations: 2 }, consequence: '你拍了拍胸前的工牌位。' },
    { text: '"希望不后悔"', delta: { sanity: -1 }, consequence: '你还是签了字。' },
  ],
};

const BACKDOOR_EVENT: GameEvent = {
  id: 'jh_real_backdoor',
  stage: 'jobhunt',
  title: '导师/老板打招呼',
  body: '你手里有导师的推荐信。有些门，硬投进不去；但导师一个电话，院长给个面子，就可能直接发 offer——越过笔试面试。',
  category: 'social',
  weight: 90,
  once: true,
  minTurn: 1,
  maxTurn: 3,
  requireFlag: 'got_recommend',
  choices: [
    ...RECRUIT_UNITS.filter((u) => u.affiliatedSchoolId || u.tier !== 'community').map(backdoorChoice),
    {
      text: '不欠这个人情，自己考',
      delta: { sanity: 2, reputation: 1 },
      consequence: '你把推荐信收进了抽屉。',
    },
  ],
};

const BETTER_OFFER_EVENT: GameEvent = {
  id: 'jh_real_better_offer',
  stage: 'jobhunt',
  title: '签约后的橄榄枝',
  body: '你已签了三方，另一家更好的三甲却突然抛来橄榄枝。去，要付违约金、在单位间留下"毁约"记录；不去，心里又痒。',
  category: 'career',
  weight: 70,
  once: true,
  minTurn: 3,
  requireFlag: 'signed',
  // 违约金按职级缩放（住院医轻、主任重），整个事件的负向金钱都走 rankScaled
  rankScaled: true,
  choices: (() => {
    const top = RECRUIT_UNITS.filter((u) => u.tier === 'sanjiajia' || u.tier === 'sanjiayi');
    const breachChoices: EventChoice[] = top.map((u) => ({
      text: `毁约去${u.name}`,
      delta: { money: -u.breachPenalty, reputation: -10, sanity: -4 },
      effect: { kind: 'breachUnit', unitId: u.id },
      consequence: `你交了违约金，也交了"毁约"二字——这条记录会进就业诚信档案。`,
    }));
    breachChoices.push({
      text: '遵守已签的三方',
      delta: { sanity: 2, reputation: 1 },
      consequence: '你把那条消息划掉了。',
    });
    return breachChoices;
  })(),
};

// R20 违约后果（档案/信用）：毁约换单位后，记录进就业诚信档案，职业期会被翻出来。
// 由 breachUnit 置的 jh_breached 触发，作为 career 阶段的回响事件。
const BREACH_ECHO: GameEvent = {
  id: 'jh_real_breach_echo',
  stage: 'career',
  title: '毁约的回响',
  body: '你当年违约换单位的事，留在了就业诚信档案里。再有更好的机会，背景核查时会被翻出来；' +
    '但你也确实到了更想去的地方。这一页，迟早要面对。',
  category: 'career',
  weight: 30,
  once: true,
  requireFlag: 'jh_breached',
  choices: [
    { text: '认了，用业绩盖过它', delta: { reputation: 3, stamina: -6 }, consequence: '你比谁都拼。' },
    { text: '心里始终有根刺', delta: { sanity: -2, reputation: -2 }, consequence: '你把那一页翻了过去。' },
  ],
};

export const JOBHUNT_REAL_EVENTS: GameEvent[] = [
  APPLY_EVENT,
  OFFER_SELECT_EVENT,
  SANFANG_EVENT,
  BACKDOOR_EVENT,
  BETTER_OFFER_EVENT,
  BREACH_ECHO,
  ...UNIT_EVENTS,
];

// 供测试/调试按 id 取单位事件
export { getUnit };
