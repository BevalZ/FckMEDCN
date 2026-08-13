import type { GameEvent } from './events';

// 职业期薄轮转（OPTIMIZATION R6）：
// 非急诊亚专科：第 6 季起强制急诊轮转一季（er_rotation_done + er_rotation_active）
// 急诊亚专科：第 6 季起强制病房支援轮转一季（ward_rotation_done + ward_rotation_active）
// CareerScene forcedEventId 驱动；flag 守护，ESC 跳过也会补上。

export const CAREER_ROTATION_EVENTS: GameEvent[] = [
  {
    id: 'career_er_rotation',
    stage: 'career',
    title: '急诊科轮转',
    body: '医务科排班下来了：你要去急诊科轮转一季。分诊台、抢救室、红区绿区——铃一响就得跑。科主任说："去见识真正的不确定。"',
    category: 'clinical',
    weight: 1,
    once: true,
    manualOnly: true,
    minTurn: 6,
    maxTurn: 10,
    excludeFlag: 'er_rotation_done',
    choices: [
      {
        text: '沉下去，抢救室跟到底',
        delta: { clinical: 4, stamina: -10, sanity: -5, reputation: 2 },
        flagSet: 'er_rotation_done',
        effect: { kind: 'setFlag', flag: 'er_rotation_active' },
        consequence: '那一季你几乎没睡整觉。绿区变红区的瞬间，手比脑子快。',
      },
      {
        text: '按流程走，尽量保全体力',
        delta: { clinical: 2, stamina: -6, sanity: -2 },
        flagSet: 'er_rotation_done',
        effect: { kind: 'setFlag', flag: 'er_rotation_active' },
        consequence: '你学会了分诊优先级，也学会了什么时候该喊二线。',
      },
    ],
  },
  {
    id: 'career_ward_rotation',
    stage: 'career',
    title: '病房支援轮转',
    body: '急诊科主任把你叫去："你在红区太久了。去内科病房支援一季，把慢性病和出院计划重新摸熟——急诊也需要慢下来的脑子。"',
    category: 'clinical',
    weight: 1,
    once: true,
    manualOnly: true,
    minTurn: 6,
    maxTurn: 10,
    requireFlag: 'sub_emergency',
    excludeFlag: 'ward_rotation_done',
    choices: [
      {
        text: '认真管床，把慢病线理顺',
        delta: { knowledge: 3, clinical: 2, sanity: 3, stamina: -4 },
        flagSet: 'ward_rotation_done',
        effect: { kind: 'setFlag', flag: 'ward_rotation_active' },
        consequence: '病房的节奏让你想起规培：查房、病程、随访——急诊之外的另一套肌肉。',
      },
      {
        text: '完成指标就回急诊心态',
        delta: { clinical: 1, sanity: 1, relations: -1 },
        flagSet: 'ward_rotation_done',
        effect: { kind: 'setFlag', flag: 'ward_rotation_active' },
        consequence: '你交了出院小结，心里仍惦记抢救室的铃。',
      },
    ],
  },
];
