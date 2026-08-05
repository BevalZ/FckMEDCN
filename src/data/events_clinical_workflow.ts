import type { GameEvent } from './events';

// M10 临床工作流链：只呈现排班交接、分级查房、病程记录与会诊申请的过程，
// 不替代医院制度、带教要求或现实医疗建议。医学事实审计见 docs/MEDICAL-FACT-AUDIT.md。
export const CLINICAL_WORKFLOW_EVENTS: GameEvent[] = [
  {
    id: 'clinical_schedule_handoff', stage: 'internship', title: '轮转交接不能只看排班表',
    body: '轮转交接时，排班表只写了床号和你的名字。带教让你再核对当班层级、护士联系人、未完成事项和需要及时上报的风险点。',
    category: 'clinical', weight: 55, once: true, minTurn: 2,
    choices: [
      { text: '按分工逐项确认优先级、联系人和未完成事项', delta: { clinical: 4, knowledge: 3, relations: 2, stamina: -5 }, flagSet: 'workflow_schedule_clarified', consequence: '你知道谁负责决定、谁负责执行，也把交接中的不确定项记了下来。' },
      { text: '只看自己负责的床号，先按经验处理', delta: { clinical: 0, knowledge: -1, relations: -2, sanity: -2 }, flagSet: 'workflow_schedule_unclear', consequence: '忙起来后你才发现，有些任务和复核责任并没有真正交到你手上。' },
    ],
  },
  {
    id: 'clinical_rounds_hierarchy', stage: 'guipei', title: '分级查房：先汇报，再确认谁来决定',
    body: '晨间查房轮到你汇报。你需要区分自己观察到的变化、需要团队讨论的问题，以及必须由上级确认的决定。',
    category: 'clinical', weight: 50, once: true, minTurn: 1, requireFlag: 'workflow_schedule_clarified',
    requireStat: { knowledge: [40, 100], clinical: [20, 100] },
    choices: [
      { text: '按问题清单汇报变化和风险，请上级确认下一步分工', delta: { clinical: 5, knowledge: 4, relations: 3, stamina: -6, reputation: 2 }, flagSet: 'workflow_rounds_completed', consequence: '查房不再是把所有责任都揽到自己身上，而是让信息和决策层级清楚可追踪。' },
      { text: '把所有问题先说成自己能处理，等主任追问', delta: { clinical: 1, knowledge: -1, sanity: -2, reputation: -2 }, flagSet: 'workflow_rounds_rushed', consequence: '主任提醒你：分级查房的重点是及时暴露需要支持的问题，不是把不确定性藏起来。' },
    ],
  },
  {
    id: 'clinical_rounds_assisted', stage: 'guipei', title: '带教带你练习分级汇报',
    body: '你还不熟悉如何在查房时抓住重点。带教让你先写下患者的变化、风险和待决定问题，再逐项确认哪些内容需要上级介入。',
    category: 'clinical', weight: 45, once: true, minTurn: 1, requireFlag: 'workflow_schedule_clarified',
    requireStat: { knowledge: [0, 39] },
    choices: [
      { text: '把疑问逐项列出，跟着带教完成汇报和分工确认', delta: { clinical: 4, knowledge: 6, relations: 3, stamina: -5 }, flagSet: 'workflow_rounds_completed', consequence: '你学会了把“我还不确定”说出来，并把问题交给合适的层级处理。' },
      { text: '照着上一份汇报模板念完，不再追问', delta: { clinical: 1, knowledge: 1, sanity: -2, reputation: -1 }, flagSet: 'workflow_rounds_rushed', consequence: '模板让你顺利开口，却没有替你完成真正的风险和责任确认。' },
    ],
  },
  {
    id: 'clinical_progress_note', stage: 'guipei', title: '病程记录要留下临床推理',
    body: '查房后你需要完成病程记录。带教要求你写清这次变化、当前判断、已经采取的措施、患者反应和下一次复评点，不能只复制上一段文字。',
    category: 'clinical', weight: 50, once: true, minTurn: 2, requireFlag: 'workflow_rounds_completed',
    choices: [
      { text: '按变化、判断、措施、反应和计划组织记录', delta: { clinical: 4, knowledge: 4, stamina: -5, reputation: 2 }, flagSet: 'workflow_note_structured', consequence: '下一位接班人能看懂事情如何变化，也知道还需要确认什么。' },
      { text: '复制上一段记录，只改日期和几个数字', delta: { clinical: -1, knowledge: -1, stamina: -2, reputation: -2, sanity: -2 }, flagSet: 'workflow_note_copied', consequence: '质控时有人指出：记录看起来很长，却没有反映本次实际变化。' },
    ],
  },
  {
    id: 'clinical_consult_request', stage: 'guipei', title: '会诊单先写清楚要请教什么',
    body: '你准备申请专科会诊。会诊团队需要知道具体问题、关键资料、紧急程度和希望得到的帮助，模糊地写一句“请会诊”并不能完成闭环。',
    category: 'clinical', weight: 45, once: true, minTurn: 3, requireFlag: 'workflow_note_structured',
    choices: [
      { text: '写明具体问题、关键资料和希望会诊解决的事项', delta: { clinical: 4, knowledge: 3, relations: 3, stamina: -4, reputation: 2 }, flagSet: 'workflow_consult_clear', consequence: '会诊医生能快速定位问题，双方也确认了后续由谁反馈结果。' },
      { text: '只填“请相关科室协助”，把问题留给对方猜', delta: { clinical: 0, knowledge: -1, relations: -2, reputation: -2, sanity: -1 }, flagSet: 'workflow_consult_vague', consequence: '对方回电话追问了几轮，你意识到会诊申请本身就是交接的一部分。' },
    ],
  },
  {
    id: 'clinical_schedule_echo', stage: 'guipei', title: '没有写清责任，交班就会漏项',
    body: '轮转后的第一次复盘里，大家把排班表、护士交接和未完成事项放在一起。你发现“我以为他会处理”从来不是可靠的责任分配。',
    category: 'clinical', weight: 40, once: true, minTurn: 1, requireFlag: 'workflow_schedule_unclear',
    choices: [{ text: '补写联系人、优先级和复核责任，再请带教确认', delta: { knowledge: 4, clinical: 3, relations: 1 }, consequence: '你把交接清单从一张排班表扩成了真正能执行的工作安排。' }],
  },
  {
    id: 'clinical_rounds_echo', stage: 'career', title: '分级查房不是把风险藏起来',
    body: '你带新人查房时想起那次被主任追问的经历：及时说明需要支持的问题，才能让团队在合适的层级做决定。',
    category: 'clinical', weight: 35, once: true, minTurn: 2, requireFlag: 'workflow_rounds_rushed',
    choices: [{ text: '示范如何汇报变化、风险和需要上级确认的事项', delta: { clinical: 3, knowledge: 3, relations: 2, reputation: 2 }, consequence: '新人没有被要求假装全会，而是学会了何时寻求上级支持。' }],
  },
  {
    id: 'clinical_note_echo', stage: 'career', title: '复制粘贴留下的空白',
    body: '一次病历质控会上，你重新看见早期那段只改日期的记录。文字很多并不等于记录了真实变化，病程必须让下一班读得懂。',
    category: 'clinical', weight: 35, once: true, minTurn: 2, requireFlag: 'workflow_note_copied',
    choices: [{ text: '把结构化记录和复评计划纳入带教检查', delta: { clinical: 3, knowledge: 3, reputation: 2 }, consequence: '你把“写了什么”改成了“是否支持连续、安全的照护”。' }],
  },
  {
    id: 'clinical_consult_echo', stage: 'career', title: '会诊请求也需要闭环',
    body: '你回看过去的会诊记录，发现写清具体问题只是第一步，还要确认对方是否收到、意见由谁反馈，以及团队如何把结果放回病程记录。',
    category: 'clinical', weight: 35, once: true, minTurn: 2, requireFlag: 'workflow_consult_clear',
    choices: [{ text: '把接收、反馈和记录结果列入会诊流程复盘', delta: { clinical: 3, knowledge: 3, relations: 2, reputation: 2 }, consequence: '会诊不再停在发出一张单，而是有明确的回复和记录责任。' }],
  },
  {
    id: 'clinical_consult_vague_echo', stage: 'career', title: '“请会诊”之后还缺一个问题',
    body: '一次模糊的会诊申请让两个科室来回确认。你在复盘中补上具体问题、关键资料和反馈责任，避免把信息缺口转给患者和下一班。',
    category: 'clinical', weight: 35, once: true, minTurn: 2, requireFlag: 'workflow_consult_vague',
    choices: [{ text: '重写会诊模板，先写问题再写资料和反馈路径', delta: { clinical: 3, knowledge: 3, relations: 2, reputation: 1 }, consequence: '下一次申请会诊时，对方能更快知道你需要什么帮助。' }],
  },
];
