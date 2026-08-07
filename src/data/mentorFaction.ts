export type FactionType = 'academic' | 'clinical' | 'administrative' | 'none';
export type FactionLevel = 'fringe' | 'member' | 'core' | 'leader';

export interface MentorFactionState {
  mentorBond: number;
  factionLoyalty: number;
  reputation: number;
  rivalry: number;
  mentor: { name: string; type: FactionType; tier: 'junior' | 'mid' | 'senior' | 'top'; relationship: number; favors: number } | null;
  faction: { name: string; type: FactionType; level: FactionLevel; resources: { research: number; clinical: number; administrative: number } };
  benefactors: { id: string; name: string; type: Exclude<FactionType, 'none'> | 'industry'; supportLevel: number; favorsOwed: number }[];
  rivals: { id: string; name: string; reason: string; hostility: number }[];
  alignmentHistory: { event: string; choice: string; consequence: string }[];
}

export const DEFAULT_MENTOR_FACTION_STATE: MentorFactionState = {
  mentorBond: 30, factionLoyalty: 0, reputation: 0, rivalry: 0, mentor: null,
  faction: { name: '未入派系', type: 'none', level: 'fringe', resources: { research: 0, clinical: 0, administrative: 0 } },
  benefactors: [], rivals: [], alignmentHistory: [],
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function normalizeMentorFaction(raw?: Partial<MentorFactionState>, legacyReputation = 0, legacyMentorBond = 30): MentorFactionState {
  const r = raw ?? {};
  const faction = (r.faction ?? {}) as Partial<MentorFactionState['faction']>;
  const resources = (faction.resources ?? {}) as Partial<MentorFactionState['faction']['resources']>;
  const mentor = r.mentor ? { ...r.mentor, relationship: clamp(r.mentor.relationship ?? legacyMentorBond), favors: Math.max(0, r.mentor.favors ?? 0) } : null;
  return {
    ...DEFAULT_MENTOR_FACTION_STATE, ...r,
    mentorBond: clamp(r.mentorBond ?? mentor?.relationship ?? legacyMentorBond),
    factionLoyalty: clamp(r.factionLoyalty ?? 0), reputation: clamp(r.reputation ?? legacyReputation), rivalry: clamp(r.rivalry ?? 0), mentor,
    faction: { ...DEFAULT_MENTOR_FACTION_STATE.faction, ...faction, resources: { ...DEFAULT_MENTOR_FACTION_STATE.faction.resources, ...resources } },
    benefactors: [...(r.benefactors ?? [])], rivals: [...(r.rivals ?? [])], alignmentHistory: [...(r.alignmentHistory ?? [])],
  };
}

export function changeMentorFaction(current: MentorFactionState, changes: Partial<Pick<MentorFactionState, 'mentorBond' | 'factionLoyalty' | 'reputation' | 'rivalry'>>): MentorFactionState {
  const s = normalizeMentorFaction(current);
  const next = { ...s };
  for (const key of Object.keys(changes) as Array<keyof typeof changes>) next[key] = clamp(s[key] + (changes[key] ?? 0));
  if (next.mentor) next.mentor = { ...next.mentor, relationship: next.mentorBond };
  return next;
}

export function factionBonus(s: MentorFactionState): number {
  const level = { fringe: 0, member: 6, core: 14, leader: 22 }[s.faction.level];
  return Math.round(level + s.factionLoyalty * 0.12 + s.mentorBond * 0.08 - s.rivalry * 0.08);
}

export function tickMentorFaction(current: MentorFactionState, reputation: number): MentorFactionState {
  const s = normalizeMentorFaction(current, reputation);
  const level: FactionLevel = s.factionLoyalty >= 85 && s.reputation >= 75 ? 'leader'
    : s.factionLoyalty >= 65 && s.mentorBond >= 60 ? 'core' : s.factionLoyalty >= 30 ? 'member' : 'fringe';
  return { ...s, reputation: clamp(Math.max(s.reputation, reputation)), faction: { ...s.faction, level } };
}
