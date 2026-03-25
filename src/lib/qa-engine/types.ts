export interface DomainSelection {
  domain: string;
  sector: string;
}

export interface QualityScore {
  clarity: number;
  credibility: number;
  actionability: number;
  urgency: number;
  willingness_to_pay: number;
  overall: number;
}

export interface QualityError {
  section: string;
  issue: string;
  severity: 'critical' | 'warning';
  what_should_change: string;
}

export interface QualityNotInteresting {
  section: string;
  issue: string;
  suggestion: string;
}

export interface QualityEvaluation {
  domain: string;
  sector: string;
  audit_score: number | null;
  scores: QualityScore;
  errors: QualityError[];
  not_interesting: QualityNotInteresting[];
  would_send_to_ceo: boolean;
  ceo_reason: string;
  would_subscribe: boolean;
  subscribe_reason: string;
  best_part: string;
  worst_part: string;
  prompt_for_claude_code: string | null;
  raw_audit?: Record<string, any>;
  raw_report_text?: string;
  created_at?: string;
  id?: string;
}
