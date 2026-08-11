import { getAffinity } from './npc';
import { getState } from './gameState';
import type { GameEvent } from './events';
import type { LifeStage } from './gameState';
import type { Stats } from './stats';
import { NPC_HIDDEN_EVENTS, NPC_HIDDEN_RULES } from './events_npc_hidden';
import { npcRomanceEventFor } from './npcRomance';
import { renderNpcText } from './npc';

export { NPC_HIDDEN_EVENTS, NPC_HIDDEN_RULES } from './events_npc_hidden';

export interface NpcHiddenContext {
  npcId: string;
  stage: LifeStage;
  spotId?: string | null;
  firedEvents: Set<string>;
}

function statsPass(requireStats: Partial<Record<keyof Stats, [number, number]>> | undefined): boolean {
  if (!requireStats) return true;
  const stats = getState().stats as unknown as Record<string, number>;
  for (const key of Object.keys(requireStats) as Array<keyof Stats>) {
    const [lo, hi] = requireStats[key]!;
    const value = stats[key] ?? 0;
    if (value < lo || value > hi) return false;
  }
  return true;
}

function eventStagePass(ev: GameEvent, stage: LifeStage): boolean {
  const stages = Array.isArray(ev.stage) ? ev.stage : [ev.stage];
  return stages.includes(stage);
}

export function npcHiddenEventFor(ctx: NpcHiddenContext): GameEvent | null {
  const state = getState();
  const romance = npcRomanceEventFor(ctx.npcId, ctx.firedEvents);
  if (romance) return romance;

  const aff = getAffinity(ctx.npcId);
  const rules = NPC_HIDDEN_RULES
    .filter(rule => rule.npcId === ctx.npcId)
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  for (const rule of rules) {
    if (!rule.stages.includes(ctx.stage)) continue;
    if (rule.spotIds && ctx.spotId !== null && (!ctx.spotId || !rule.spotIds.includes(ctx.spotId))) continue;
    if (rule.minTurn !== undefined && state.turnsInStage < rule.minTurn) continue;
    if (rule.maxTurn !== undefined && state.turnsInStage > rule.maxTurn) continue;
    if (rule.minAffinity !== undefined && aff < rule.minAffinity) continue;
    if (rule.maxAffinity !== undefined && aff > rule.maxAffinity) continue;
    if (rule.requireFlags?.some(flag => !state.flags.has(flag))) continue;
    if (rule.requireAnyFlags && !rule.requireAnyFlags.some(flag => state.flags.has(flag))) continue;
    if (rule.excludeFlags?.some(flag => state.flags.has(flag))) continue;
    if (!statsPass(rule.requireStats)) continue;

    const ev = NPC_HIDDEN_EVENTS.find(e => e.id === rule.eventId);
    if (!ev) continue;
    if (!eventStagePass(ev, ctx.stage)) continue;
    if (ev.once && ctx.firedEvents.has(ev.id)) continue;
    return {
      ...ev,
      title: renderNpcText(ev.title),
      body: renderNpcText(ev.body),
      choices: ev.choices.map(choice => ({
        ...choice,
        text: renderNpcText(choice.text),
        consequence: choice.consequence ? renderNpcText(choice.consequence) : undefined,
      })),
    };
  }
  return null;
}
