export type ChecklistStatus = 'not_started' | 'in_progress' | 'prepared' | 'needs_review' | 'not_applicable';
export type RuleEvaluation = true | false | 'unknown';

export const CURRENT_SAVED_PROJECT_SCHEMA_VERSION = 6;

export type RequirementType =
  | 'usually_required'
  | 'answer_dependent'
  | 'may_be_requested'
  | 'genuine_intentions_support'
  | 'product_organisation_guidance';

export type EvidenceLayer =
  | 'inz_visa'
  | 'product_guidance';

export interface OfficialSource {
  id: string;
  title: string;
  publisher: string;
  url: string;
  checkedAt: string;
}

export interface ChecklistGuidanceBlock {
  id: string;
  title: string;
  steps: string[];
}

export interface ConditionalChecklistGuidanceBlock extends ChecklistGuidanceBlock {
  when: RuleExpression;
}

export interface ChecklistItem {
  id: string;
  category: string;
  title: string;
  requirementType: RequirementType;
  evidenceLayer: EvidenceLayer;
  why: string;
  steps: string[];
  requiredFields?: string[];
  preferredFormat?: string;
  commonMistakes?: string[];
  warnings?: string[];
  guidanceDisclaimer?: string;
  guidanceBlocks?: ChecklistGuidanceBlock[];
  conditionalGuidanceBlocks?: ConditionalChecklistGuidanceBlock[];
  sourceIds: string[];
  defaultIncluded?: boolean;
}

export interface AtomicRuleCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'in' | 'truthy' | 'contains';
  value?: unknown;
}

export interface AllRuleExpression {
  all: RuleExpression[];
}

export interface AnyRuleExpression {
  any: RuleExpression[];
}

export interface NotRuleExpression {
  not: RuleExpression;
}

export type RuleExpression = AtomicRuleCondition | AllRuleExpression | AnyRuleExpression | NotRuleExpression;

export interface ChecklistRule {
  id: string;
  when: RuleExpression;
  addChecklistItems: string[];
}

export interface SavedProject {
  [key: string]: unknown;
  id: string;
  schemaVersion?: number;
  answers: Record<string, unknown>;
  statuses: Record<string, ChecklistStatus>;
  updatedAt: string;
}
