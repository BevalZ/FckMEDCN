import type { GameEvent } from './events';

// 诚实/普通局也可触达负向结局的薄路径（REVIEW-PLAYABILITY R13）：
// 1) 职称论文压力：一次灰色选择即可写入 has_faked（不必早开造假流）
// 2) 科室挂名风暴：硬刚核查失败 → exposed_ruin → disgraced
// CareerScene 强制驱动；flag 守护，ESC 跳过也会补上。

const SCANDAL_ROLL = {
  kind: 'rollOutcome' as const,
  base: 0.38,
  luckBonus: 0.05,
  successFlag: 'dept_scandal_cleared',
  failFlag: 'exposed_ruin',
};

export const CAREER_INTEGRITY_EVENTS: GameEvent[] = [
  {
    id: 'career_title_paper_pressure',
    stage: 'career',
    title: '职称材料差一篇',
    body: '人事科提醒：副高差一篇统计源刊。同门把你拉到茶水间："有条捷径——补两组好看的数据，或挂个礼品作者。今年名额就这些。"走廊里打印机还在响。',
    category: 'career',
    weight: 1,
    once: true,
    manualOnly: true,
    minTurn: 7,
    maxTurn: 12,
    requireFlag: 'passed_zhuzhi',
    excludeFlag: 'title_paper_pressure_done',
    choices: [
      {
        text: '补两组"更好看"的数据，先过关',
        delta: { papers: 1, research: 2, sanity: -8, reputation: 2 },
        flagSet: 'title_paper_pressure_done',
        effect: [
          { kind: 'fake', severity: 'minor' },
          { kind: 'setFlag', flag: 'title_paper_padded' },
        ],
        consequence: '材料齐了。你把原始表格另存了一个加密文件夹，告诉自己"只此一次"。',
      },
      {
        text: '接受挂名礼品作者',
        delta: { papers: 1, money: -3000, sanity: -6, reputation: 3 },
        flagSet: 'title_paper_pressure_done',
        effect: [
          { kind: 'fake', severity: 'moderate' },
          { kind: 'setFlag', flag: 'title_paper_gifted' },
        ],
        consequence: '见刊那天通讯作者发来祝贺。你点开 PDF，几乎认不出自己的贡献。',
      },
      {
        text: '拒绝，按真实进度等下一批',
        delta: { sanity: 4, reputation: -2, relations: -2 },
        flagSet: 'title_paper_pressure_done',
        effect: { kind: 'setFlag', flag: 'title_paper_refused' },
        consequence: '名额让给了别人。你睡得着，但评委会多等一年。',
      },
    ],
  },
  {
    id: 'career_dept_authorship_scandal',
    stage: 'career',
    title: '科室挂名被点名',
    body: '院科研处突然开会：某杂志对一批礼品作者发函核查。名单上有你——三年前一台会诊后，通讯作者把你挂成了第五作者。你几乎没改过稿。',
    category: 'system',
    weight: 1,
    once: true,
    manualOnly: true,
    minTurn: 11,
    maxTurn: 16,
    excludeFlag: 'dept_scandal_done',
    choices: [
      {
        text: '主动说明实情，申请撤下署名',
        delta: { reputation: -3, sanity: -4, relations: 2 },
        flagSet: 'dept_scandal_done',
        effect: { kind: 'setFlag', flag: 'dept_scandal_cooperated' },
        consequence: '你的名字从作者栏消失了。调查继续，但通报正文没有写你。',
      },
      {
        text: '强调不知情，但保留文章与职称材料',
        delta: { sanity: -6, reputation: -1 },
        flagSet: 'dept_scandal_done',
        effect: [
          { kind: 'fake', severity: 'minor' },
          { kind: 'setFlag', flag: 'gift_authorship_kept' },
        ],
        consequence: '你赌调查不会深挖到你这一层。那篇东西还在你的晋升材料里。',
      },
      {
        text: '一口咬定自己参与充分，硬刚核查',
        delta: { sanity: -10, reputation: -2 },
        flagSet: 'dept_scandal_done',
        effect: [
          SCANDAL_ROLL,
          { kind: 'setFlag', flag: 'gift_authorship_denied' },
        ],
        consequence: '你提交了补写的贡献说明。调查组对照原始邮件后，给出了结论。',
      },
    ],
  },
  // 灰色选择后的延迟回声：已造假且未身败 → 提醒侥幸仍在（供图鉴/叙事消费）
  {
    id: 'career_fraud_quiet_years',
    stage: 'career',
    title: '没人来敲门的几年',
    body: '职称过了，学生叫你老师。那篇有问题的文章还挂在数据库里。有人在科务会上大谈学术规范，你低头喝水。',
    category: 'mental',
    weight: 55,
    once: true,
    minTurn: 12,
    requireFlag: 'has_faked',
    excludeFlag: 'exposed_ruin',
    choices: [
      {
        text: '装作无事，把日子过下去',
        delta: { sanity: -5, reputation: 2 },
        flagSet: 'fraud_quiet_lived',
        consequence: '侥幸不是清白。你只是还没轮到被点名。',
      },
      {
        text: '悄悄联系期刊，申请勘误或撤稿',
        delta: { sanity: -8, reputation: -4, papers: -1 },
        effect: { kind: 'selfReport' },
        flagSet: 'fraud_self_cleaned',
        consequence: '你主动拆了自己的台阶。风声小了，却再也睡不回从前。',
      },
    ],
  },
];
