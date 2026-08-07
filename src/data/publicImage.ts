export interface PublicImageState {
  publicRisk: number; onlineHeat: number; privacyAwareness: number; crisisManagement: number;
  incidents: { type: '偷拍' | '网络医闹' | '恶意剪辑' | '隐私泄露' | '网红争议' | '医疗反腐'; year: number; severity: number; status: 'ongoing' | 'resolved' | 'escalated'; resolution: string }[];
  onlineHarassment: { active: boolean; duration: number; postCount: number; reportCount: number; policeReports: number; platforms: string[] };
  socialMedia: { followers: number; contentCount: number; monetized: boolean; mcnContract: boolean; strategy: 'none' | 'pure_education' | 'mixed' | 'commercial' | 'controversial'; lastViolation: string };
  privacy: { patientConsentRecords: boolean; videoBlurStandard: 'face_only' | 'full_anonymization' | 'none'; pastViolations: string[] };
  crisisHistory: { event: string; response: 'proactive' | 'defensive' | 'legal' | 'ignore'; outcome: 'success' | 'partial' | 'failure' }[];
}

export const DEFAULT_PUBLIC_IMAGE_STATE: PublicImageState = { publicRisk: 5, onlineHeat: 0, privacyAwareness: 50, crisisManagement: 30, incidents: [],
  onlineHarassment: { active: false, duration: 0, postCount: 0, reportCount: 0, policeReports: 0, platforms: [] },
  socialMedia: { followers: 0, contentCount: 0, monetized: false, mcnContract: false, strategy: 'none', lastViolation: '' },
  privacy: { patientConsentRecords: false, videoBlurStandard: 'none', pastViolations: [] }, crisisHistory: [] };
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n))); const clampHeat = (n: number) => Math.max(-100, Math.min(100, Math.round(n)));
export function normalizePublicImage(raw?: Partial<PublicImageState>): PublicImageState {
  const r = raw ?? {}; const harassment = (r.onlineHarassment ?? {}) as Partial<PublicImageState['onlineHarassment']>; const media = (r.socialMedia ?? {}) as Partial<PublicImageState['socialMedia']>; const privacy = (r.privacy ?? {}) as Partial<PublicImageState['privacy']>;
  return { ...DEFAULT_PUBLIC_IMAGE_STATE, ...r, publicRisk: clamp(r.publicRisk ?? 5), onlineHeat: clampHeat(r.onlineHeat ?? 0), privacyAwareness: clamp(r.privacyAwareness ?? 50), crisisManagement: clamp(r.crisisManagement ?? 30), incidents: [...(r.incidents ?? [])],
    onlineHarassment: { ...DEFAULT_PUBLIC_IMAGE_STATE.onlineHarassment, ...harassment, platforms: [...(harassment.platforms ?? [])] }, socialMedia: { ...DEFAULT_PUBLIC_IMAGE_STATE.socialMedia, ...media }, privacy: { ...DEFAULT_PUBLIC_IMAGE_STATE.privacy, ...privacy, pastViolations: [...(privacy.pastViolations ?? [])] }, crisisHistory: [...(r.crisisHistory ?? [])] };
}

export function changePublicImage(current: PublicImageState, changes: Partial<Pick<PublicImageState, 'publicRisk' | 'onlineHeat' | 'privacyAwareness' | 'crisisManagement'>>): PublicImageState {
  const s = normalizePublicImage(current); return { ...s, publicRisk: clamp(s.publicRisk + (changes.publicRisk ?? 0)), onlineHeat: clampHeat(s.onlineHeat + (changes.onlineHeat ?? 0)), privacyAwareness: clamp(s.privacyAwareness + (changes.privacyAwareness ?? 0)), crisisManagement: clamp(s.crisisManagement + (changes.crisisManagement ?? 0)) };
}

export function tickPublicImage(current: PublicImageState): PublicImageState {
  const s = normalizePublicImage(current); if (!s.onlineHarassment.active) return { ...s, publicRisk: clamp(s.publicRisk - 1), onlineHeat: s.onlineHeat < 0 ? clampHeat(s.onlineHeat + 1) : s.onlineHeat };
  const duration = s.onlineHarassment.duration + 1; return { ...s, publicRisk: clamp(s.publicRisk + 6), onlineHeat: clampHeat(s.onlineHeat - 5), onlineHarassment: { ...s.onlineHarassment, duration, postCount: s.onlineHarassment.postCount + 1, active: duration < 12 } };
}

export const publicImmunity = (s: PublicImageState, resilience: number) => clamp(s.privacyAwareness * 0.3 + s.crisisManagement * 0.4 + resilience * 0.3);
