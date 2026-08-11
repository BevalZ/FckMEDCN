import manifest from '../../sources/evidence.json';

export type EvidenceStatus = 'pending' | 'verified' | 'rejected';
export type EvidenceScope = 'external' | 'session';

export interface EvidenceRef {
  scope: EvidenceScope;
  title: string;
  organization: string;
  publishedAt: string;
  url: string;
  accessedAt: string;
  status: EvidenceStatus;
  reviewedBy: string;
}

/**
 * External claims remain pending until a human reviewer records a traceable publication and URL.
 * Keys intentionally match the legacy labels so version-1 content can migrate without ambiguity.
 */
export const EVIDENCE_REFS = manifest.entries as Record<keyof typeof manifest.entries, EvidenceRef>;

export type EvidenceId = keyof typeof EVIDENCE_REFS;

export function verifiedEvidence(id: EvidenceId): EvidenceRef | null {
  const evidence = EVIDENCE_REFS[id];
  return evidence.status === 'verified' ? evidence : null;
}
