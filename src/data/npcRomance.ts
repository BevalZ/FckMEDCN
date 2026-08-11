import type { GameEvent } from './events';
import { NPCS, NPC_ROMANCE_AT, canStartNpcRomance, getNpcName, npcAgeGap } from './npc';

export const NPC_ROMANCE_EVENT_PREFIX = 'npc_romance_start_';

const CANDIDATE_IDS = NPCS
  .filter(n => n.sex !== 'same_as_player' && Math.abs(n.ageOffset) <= 10)
  .map(n => n.id);

export function npcRomanceEventId(npcId: string): string {
  return `${NPC_ROMANCE_EVENT_PREFIX}${npcId}`;
}

export const NPC_ROMANCE_EVENTS: GameEvent[] = CANDIDATE_IDS.map(npcId => ({
  id: npcRomanceEventId(npcId),
  stage: ['undergrad', 'internship', 'guipei', 'master', 'phd', 'career', 'pinnacle'],
  title: `和[[npc:${npcId}]]之间的距离`,
  body: `几次认真交谈之后，你和[[npc:${npcId}]]之间的关系已经越过普通熟人。对方和你年龄相近，性别相异，也知道医学这条路意味着缺席、夜班和长期不稳定。继续往前一步，不只是心动，也是把这个人带进后面人生场景的决定。`,
  category: 'personal',
  weight: 0,
  once: true,
  manualOnly: true,
  choices: [
    {
      text: '认真确认彼此想法，开始交往',
      delta: { sanity: 10, relations: 8, money: -300 },
      effect: { kind: 'startNpcRomance', npcId },
      consequence: `你们没有把话说得太满，只约定先认真走下去。[[npc:${npcId}]]不再只是地图上的 NPC，而会在关系足够稳定后进入后续阶段。`,
    },
    {
      text: '把关系停在可信任的朋友',
      delta: { sanity: 3, relations: 4 },
      effect: { kind: 'changeAffinity', npcId, amount: -4 },
      consequence: `[[npc:${npcId}]]点点头，气氛有一点遗憾，但关系没有破裂。你们仍然是重要的人脉。`,
    },
  ],
}));

export function npcRomanceEventFor(npcId: string, firedEvents: Set<string>): GameEvent | null {
  const id = npcRomanceEventId(npcId);
  if (firedEvents.has(id)) return null;
  if (!canStartNpcRomance(npcId)) return null;
  const ev = NPC_ROMANCE_EVENTS.find(e => e.id === id);
  if (!ev) return null;
  return {
    ...ev,
    title: ev.title.replace(`[[npc:${npcId}]]`, getNpcName(npcId)),
    body: `${ev.body.replaceAll(`[[npc:${npcId}]]`, getNpcName(npcId))}\n\n触发条件：好感 ≥ ${NPC_ROMANCE_AT}，年龄差 ${npcAgeGap(npcId)} 岁，在上下 10 岁以内。`,
    choices: ev.choices.map(choice => ({
      ...choice,
      text: choice.text.replaceAll(`[[npc:${npcId}]]`, getNpcName(npcId)),
      consequence: choice.consequence?.replaceAll(`[[npc:${npcId}]]`, getNpcName(npcId)),
    })),
  };
}

