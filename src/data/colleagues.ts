export interface ColleagueState {
  peerBond: number; nurseAlliance: number; peerEnvy: number; studentLoyalty: number;
  integration: number; teamSupport: number;
  peers: { id: string; name: string; bond: number; envy: number; status: 'ally' | 'neutral' | 'rival' | 'enemy'; keyEvents: string[] }[];
  nurses: { headNurse: { name: string; alliance: number; favors: number }; seniorNurses: { name: string; alliance: number }[] };
  students: { id: string; name: string; loyalty: number; type: 'protege' | 'utilitarian' | 'spy'; status: 'active' | 'graduated' | 'betrayed' | 'estranged'; betrayalRisk: number }[];
  conflicts: { event: string; opponent: string; resolution: 'win' | 'lose' | 'compromise' | 'ongoing' }[];
}

export const DEFAULT_COLLEAGUE_STATE: ColleagueState = {
  peerBond: 40, nurseAlliance: 40, peerEnvy: 10, studentLoyalty: 40, integration: 40, teamSupport: 35,
  peers: [], nurses: { headNurse: { name: '护士长', alliance: 40, favors: 0 }, seniorNurses: [] }, students: [], conflicts: [],
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
export function normalizeColleagues(raw?: Partial<ColleagueState>): ColleagueState {
  const r = raw ?? {};
  const nurses = (r.nurses ?? {}) as Partial<ColleagueState['nurses']>;
  const headNurse = (nurses.headNurse ?? {}) as Partial<ColleagueState['nurses']['headNurse']>;
  const peerBond = clamp(r.peerBond ?? 40), nurseAlliance = clamp(r.nurseAlliance ?? headNurse.alliance ?? 40);
  return { ...DEFAULT_COLLEAGUE_STATE, ...r, peerBond, nurseAlliance, peerEnvy: clamp(r.peerEnvy ?? 10), studentLoyalty: clamp(r.studentLoyalty ?? 40),
    integration: clamp((peerBond + nurseAlliance) / 2), teamSupport: clamp(r.teamSupport ?? (peerBond * 0.35 + nurseAlliance * 0.35 + (100 - (r.peerEnvy ?? 10)) * 0.3)),
    peers: [...(r.peers ?? [])], nurses: { ...DEFAULT_COLLEAGUE_STATE.nurses, ...nurses, headNurse: { ...DEFAULT_COLLEAGUE_STATE.nurses.headNurse, ...headNurse, alliance: nurseAlliance }, seniorNurses: [...(nurses.seniorNurses ?? [])] },
    students: [...(r.students ?? [])], conflicts: [...(r.conflicts ?? [])] };
}

export function changeColleagues(current: ColleagueState, changes: Partial<Pick<ColleagueState, 'peerBond' | 'nurseAlliance' | 'peerEnvy' | 'studentLoyalty'>>): ColleagueState {
  const s = normalizeColleagues(current); const next = { ...s };
  for (const key of Object.keys(changes) as Array<keyof typeof changes>) next[key] = clamp(s[key] + (changes[key] ?? 0));
  if (changes.peerBond !== undefined && next.peers.length === 0) next.peers = [{ id: 'peer_1', name: '同期医生', bond: next.peerBond, envy: next.peerEnvy, status: next.peerBond >= 60 ? 'ally' : 'neutral', keyEvents: [] }];
  else next.peers = next.peers.map((p, i) => i === 0 ? { ...p, bond: next.peerBond, envy: next.peerEnvy, status: next.peerEnvy >= 80 ? 'enemy' : next.peerEnvy >= 50 ? 'rival' : next.peerBond >= 60 ? 'ally' : 'neutral' } : p);
  next.nurses = { ...next.nurses, headNurse: { ...next.nurses.headNurse, alliance: next.nurseAlliance } };
  if (changes.studentLoyalty !== undefined && next.students.length === 0) next.students = [{ id: 'student_1', name: '学生', loyalty: next.studentLoyalty, type: 'protege', status: 'active', betrayalRisk: clamp(100 - next.studentLoyalty) }];
  else next.students = next.students.map((student, i) => i === 0 ? { ...student, loyalty: next.studentLoyalty, betrayalRisk: clamp(100 - next.studentLoyalty) } : student);
  return normalizeColleagues(next);
}

export function tickColleagues(current: ColleagueState, reputation: number, factionRivalry: number): ColleagueState {
  const s = normalizeColleagues(current);
  const envyGain = reputation > 65 ? 1 : 0;
  return normalizeColleagues({ ...s, peerEnvy: clamp(s.peerEnvy + envyGain + (factionRivalry > 60 ? 1 : 0)) });
}
