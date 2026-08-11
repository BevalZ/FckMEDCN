export type StudentType = 'protege' | 'utilitarian' | 'spy';
export type StudentStatus = 'active' | 'graduated' | 'betrayed' | 'estranged';

export interface MentoredStudent {
  id: string;
  name: string;
  loyalty: number;
  type: StudentType;
  status: StudentStatus;
  betrayalRisk: number;
  researchSkill: number;
  clinicalSkill: number;
  ethics: number;
  autonomy: number;
}

export interface ColleagueState {
  peerBond: number; nurseAlliance: number; peerEnvy: number; studentLoyalty: number;
  integration: number; teamSupport: number;
  peers: { id: string; name: string; bond: number; envy: number; status: 'ally' | 'neutral' | 'rival' | 'enemy'; keyEvents: string[] }[];
  nurses: { headNurse: { name: string; alliance: number; favors: number }; seniorNurses: { name: string; alliance: number }[] };
  students: MentoredStudent[];
  conflicts: { event: string; opponent: string; resolution: 'win' | 'lose' | 'compromise' | 'ongoing' }[];
}

export const DEFAULT_COLLEAGUE_STATE: ColleagueState = {
  peerBond: 40, nurseAlliance: 40, peerEnvy: 10, studentLoyalty: 40, integration: 40, teamSupport: 35,
  peers: [], nurses: { headNurse: { name: '护士长', alliance: 40, favors: 0 }, seniorNurses: [] }, students: [], conflicts: [],
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function normalizeStudent(raw: Partial<MentoredStudent> & { id?: string; name?: string; type?: StudentType }): MentoredStudent {
  const type = raw.type ?? 'protege';
  return {
    id: raw.id ?? 'student_1',
    name: raw.name ?? '学生',
    type,
    status: raw.status ?? 'active',
    loyalty: clamp(raw.loyalty ?? 40),
    betrayalRisk: clamp(raw.betrayalRisk ?? (type === 'protege' ? 30 : type === 'utilitarian' ? 55 : 70)),
    researchSkill: clamp(raw.researchSkill ?? (type === 'protege' ? 30 : 24)),
    clinicalSkill: clamp(raw.clinicalSkill ?? (type === 'protege' ? 30 : 24)),
    ethics: clamp(raw.ethics ?? (type === 'spy' ? 35 : type === 'utilitarian' ? 42 : 55)),
    autonomy: clamp(raw.autonomy ?? 20),
  };
}

export function normalizeColleagues(raw?: Partial<ColleagueState>): ColleagueState {
  const r = raw ?? {};
  const nurses = (r.nurses ?? {}) as Partial<ColleagueState['nurses']>;
  const headNurse = (nurses.headNurse ?? {}) as Partial<ColleagueState['nurses']['headNurse']>;
  const peerBond = clamp(r.peerBond ?? 40), nurseAlliance = clamp(r.nurseAlliance ?? headNurse.alliance ?? 40);
  return { ...DEFAULT_COLLEAGUE_STATE, ...r, peerBond, nurseAlliance, peerEnvy: clamp(r.peerEnvy ?? 10), studentLoyalty: clamp(r.studentLoyalty ?? 40),
    integration: clamp((peerBond + nurseAlliance) / 2), teamSupport: clamp(r.teamSupport ?? (peerBond * 0.35 + nurseAlliance * 0.35 + (100 - (r.peerEnvy ?? 10)) * 0.3)),
    peers: [...(r.peers ?? [])], nurses: { ...DEFAULT_COLLEAGUE_STATE.nurses, ...nurses, headNurse: { ...DEFAULT_COLLEAGUE_STATE.nurses.headNurse, ...headNurse, alliance: nurseAlliance }, seniorNurses: [...(nurses.seniorNurses ?? [])] },
    students: (r.students ?? []).map(student => normalizeStudent(student)), conflicts: [...(r.conflicts ?? [])] };
}

export function changeColleagues(current: ColleagueState, changes: Partial<Pick<ColleagueState, 'peerBond' | 'nurseAlliance' | 'peerEnvy' | 'studentLoyalty'>>): ColleagueState {
  const s = normalizeColleagues(current); const next = { ...s };
  for (const key of Object.keys(changes) as Array<keyof typeof changes>) next[key] = clamp(s[key] + (changes[key] ?? 0));
  if (changes.peerBond !== undefined && next.peers.length === 0) next.peers = [{ id: 'peer_1', name: '同期医生', bond: next.peerBond, envy: next.peerEnvy, status: next.peerBond >= 60 ? 'ally' : 'neutral', keyEvents: [] }];
  else next.peers = next.peers.map((p, i) => i === 0 ? { ...p, bond: next.peerBond, envy: next.peerEnvy, status: next.peerEnvy >= 80 ? 'enemy' : next.peerEnvy >= 50 ? 'rival' : next.peerBond >= 60 ? 'ally' : 'neutral' } : p);
  next.nurses = { ...next.nurses, headNurse: { ...next.nurses.headNurse, alliance: next.nurseAlliance } };
  if (changes.studentLoyalty !== undefined && next.students.length === 0) next.students = [normalizeStudent({ id: 'student_1', name: '学生', loyalty: next.studentLoyalty, type: 'protege', status: 'active', betrayalRisk: clamp(100 - next.studentLoyalty) })];
  else next.students = next.students.map((student, i) => i === 0 ? { ...student, loyalty: next.studentLoyalty, betrayalRisk: clamp(100 - next.studentLoyalty) } : student);
  return normalizeColleagues(next);
}

export function recruitStudent(
  current: ColleagueState,
  student: { id: string; name: string; type: StudentType; loyalty: number; betrayalRisk?: number; researchSkill?: number; clinicalSkill?: number; ethics?: number; autonomy?: number },
): ColleagueState {
  const s = normalizeColleagues(current);
  const existing = s.students.find(item => item.id === student.id);
  const nextStudent = normalizeStudent({
    id: student.id,
    name: student.name,
    type: student.type,
    status: 'active',
    loyalty: student.loyalty,
    betrayalRisk: student.betrayalRisk,
    researchSkill: student.researchSkill,
    clinicalSkill: student.clinicalSkill,
    ethics: student.ethics,
    autonomy: student.autonomy,
  });
  const students = existing
    ? s.students.map(item => item.id === student.id ? { ...item, ...nextStudent } : item)
    : [...s.students, nextStudent];
  const active = students.filter(item => item.status === 'active');
  const studentLoyalty = active.length > 0
    ? clamp(active.reduce((sum, item) => sum + item.loyalty, 0) / active.length)
    : s.studentLoyalty;
  return normalizeColleagues({ ...s, students, studentLoyalty });
}

export function mentorStudents(
  current: ColleagueState,
  changes: Partial<Pick<MentoredStudent, 'loyalty' | 'betrayalRisk' | 'researchSkill' | 'clinicalSkill' | 'ethics' | 'autonomy'>>,
): ColleagueState {
  const s = normalizeColleagues(current);
  const students = s.students.map(student => {
    if (student.status !== 'active') return student;
    return normalizeStudent({
      ...student,
      loyalty: student.loyalty + (changes.loyalty ?? 0),
      betrayalRisk: student.betrayalRisk + (changes.betrayalRisk ?? 0),
      researchSkill: student.researchSkill + (changes.researchSkill ?? 0),
      clinicalSkill: student.clinicalSkill + (changes.clinicalSkill ?? 0),
      ethics: student.ethics + (changes.ethics ?? 0),
      autonomy: student.autonomy + (changes.autonomy ?? 0),
    });
  });
  const active = students.filter(item => item.status === 'active');
  const studentLoyalty = active.length > 0
    ? clamp(active.reduce((sum, student) => sum + student.loyalty, 0) / active.length)
    : s.studentLoyalty;
  return normalizeColleagues({ ...s, students, studentLoyalty });
}

export function tickColleagues(current: ColleagueState, reputation: number, factionRivalry: number): ColleagueState {
  const s = normalizeColleagues(current);
  const envyGain = reputation > 65 ? 1 : 0;
  const students = s.students.map(student => {
    if (student.status !== 'active') return student;
    const pressure = student.type === 'utilitarian' ? 2 : student.type === 'spy' ? 3 : 1;
    const loyalty = clamp(student.loyalty + (student.type === 'protege' ? 1 : 0) - (factionRivalry > 65 ? 1 : 0));
    const betrayalRisk = clamp(student.betrayalRisk + pressure + (factionRivalry > 60 ? 2 : 0) + (student.ethics < 45 ? 1 : 0) - (loyalty > 70 ? 2 : 0) - (student.ethics > 70 ? 1 : 0));
    return { ...student, loyalty, betrayalRisk };
  });
  const studentLoyalty = students.length > 0
    ? clamp(students.reduce((sum, student) => sum + student.loyalty, 0) / students.length)
    : s.studentLoyalty;
  return normalizeColleagues({ ...s, students, studentLoyalty, peerEnvy: clamp(s.peerEnvy + envyGain + (factionRivalry > 60 ? 1 : 0)) });
}
