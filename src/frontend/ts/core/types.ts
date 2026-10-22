/**
 * Shared type contracts for the TLA-026 forensic portal UI layer.
 * These describe the shapes the /api endpoints already return, so new
 * TypeScript components get full type safety without touching the vanilla JS.
 */

export type SessionStatus = 'idle' | 'in_progress' | 'submitted' | 'expired';

export interface Investigator {
  id: number;
  full_name: string;
  email: string;
  team_name: string | null;
  college: string;
  role: 'investigator' | 'admin';
}

export interface CaseSession {
  id: number;
  status: SessionStatus;
  started_at: string | null;
  deadline_at: string | null;
  rules_acknowledged: boolean;
}

export interface CaseMetrics {
  evidence_available: number;
  notes_count: number;
  timeline_count: number;
  final_report: { status: string; evaluated_score?: number | null } | null;
  has_draft: boolean;
  score: number | null;
  rank: number | null;
}

/** Severity palette shared by badges, toasts and alert banners. */
export type Severity = 'critical' | 'warning' | 'info' | 'success';
