import type { GameEvent } from './events';

// 住院总医师一年期固定剧情（OPTIMIZATION R3）：
// 第 5 季起任命；任期内每季额外体力/心理双压；满 4 季结业发奖。
// 由 CareerScene forcedEventId 驱动，ESC 跳过不会漏（flag 守护）。

export const CAREER_CHIEF_EVENTS: GameEvent[] = [
  {
    id: 'career_chief_offer',
    stage: 'career',
    title: '住院总医师任命',
    body: '科主任把排班表拍在桌上："今年住院总轮到你。全科急诊、会诊、吵架、顶班——先找你。干满一年，科室有结业津贴，评职称也算实绩。"窗外天还没亮，夜班铃已经响了。',
    category: 'career',
    weight: 1,
    once: true,
    manualOnly: true,
    minTurn: 5,
    maxTurn: 8,
    requireFlag: 'passed_zhuzhi',
    excludeFlag: 'chief_offer_resolved',
    choices: [
      {
        text: '接下这副担子',
        delta: { reputation: 4, clinical: 2, stamina: -6, sanity: -3 },
        flagSet: 'chief_resident_year',
        effect: { kind: 'setFlag', flag: 'chief_offer_resolved' },
        consequence: '你在排班表上签了名。手机里立刻多了三个急诊群。',
      },
      {
        text: '以家庭/身体为由婉拒',
        delta: { sanity: 4, relations: -2, reputation: -2 },
        flagSet: 'chief_declined',
        effect: { kind: 'setFlag', flag: 'chief_offer_resolved' },
        consequence: '主任点点头："那换别人。"你松了口气，也知道少了一截硬履历。',
      },
    ],
  },
  {
    id: 'career_chief_mid_crush',
    stage: 'career',
    title: '住院总半年考',
    body: '半年过去。你盯着排班表：两台急诊、一台外院会诊、一位家属堵在护士站。住院总的手机从不真正静音——它只是换一种方式震动。',
    category: 'clinical',
    weight: 1,
    once: true,
    manualOnly: true,
    minTurn: 6,
    maxTurn: 8,
    requireFlag: 'chief_resident_year',
    excludeFlag: 'chief_mid_done',
    choices: [
      {
        text: '自己顶上，把火灭掉',
        delta: { clinical: 5, reputation: 4, stamina: -14, sanity: -8 },
        flagSet: 'chief_mid_done',
        consequence: '凌晨四点你才坐下。群里有人发了句"总牛"。你回了个句号。',
      },
      {
        text: '拆任务给高年资住院医，自己盯结果',
        delta: { relations: 3, clinical: 2, stamina: -8, sanity: -4, reputation: 2 },
        flagSet: 'chief_mid_done',
        consequence: '你学会了"不全自己扛"。火灭了，人也没散架。',
      },
      {
        text: '硬撑着，情绪压进肚子里',
        delta: { stamina: -10, sanity: -12, clinical: 3 },
        flagSet: 'chief_mid_done',
        consequence: '事情办完了。你对着洗手池站了很久，水一直开着。',
      },
    ],
  },
  {
    id: 'career_chief_graduate',
    stage: 'career',
    title: '住院总结业',
    body: '一年到了。新任住院总来交接钥匙和三个群。主任把一份结业证明和津贴清单推过来："你挺住了。这行里，挺住本身就是成绩。"',
    category: 'career',
    weight: 1,
    once: true,
    manualOnly: true,
    minTurn: 8,
    maxTurn: 12,
    requireFlag: 'chief_resident_year',
    excludeFlag: 'chief_graduated',
    choices: [
      {
        text: '收下津贴，把经验写进带教笔记',
        delta: { money: 8000, reputation: 8, clinical: 6, knowledge: 3, sanity: 6, stamina: 4 },
        flagSet: 'chief_graduated',
        effect: { kind: 'clearFlag', flag: 'chief_resident_year' },
        consequence: '结业津贴到账。你把"如何排班不挨骂"写进了给下一届的备忘录。',
      },
      {
        text: '津贴捐一部分给科室基金，轻装交接',
        delta: { money: 5000, reputation: 10, relations: 5, clinical: 5, sanity: 8 },
        flagSet: 'chief_graduated',
        effect: { kind: 'clearFlag', flag: 'chief_resident_year' },
        consequence: '你少拿一点钱，换来一句"这届住院总像样"。交接那天，群里安静得反常。',
      },
    ],
  },
];
