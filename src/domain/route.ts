import type { ChecklistItem, ChecklistRule, OfficialSource } from './types';
import type { PersonFactBinding } from './personFactBindings';

export interface QuestionEffects {
  answersForChecklist: Record<string, unknown>;
  validationErrors: Record<string, string>;
  warnings: Record<string, string>;
}

export interface QuestionEffectOptions {
  checklistGenerated?: boolean;
  now?: Date;
}

export type EvaluateQuestionEffects = (
  answers: Record<string, unknown>,
  options?: QuestionEffectOptions
) => QuestionEffects;

export interface RoutePack {
  readonly id: string;
  readonly jurisdiction: string;
  readonly title: string;
  readonly description?: string;
  readonly authorityName?: string;
  readonly disclaimerFooter?: string;
  readonly eyebrow?: string;
  readonly questions: Record<string, unknown>;
  readonly items: readonly ChecklistItem[];
  readonly rules: readonly ChecklistRule[];
  readonly sources: readonly OfficialSource[];
  readonly evaluateEffects: EvaluateQuestionEffects;
  readonly immediateEffectFields?: readonly string[];
  readonly cleanStaleAnswers?: (answers: Record<string, unknown>) => Record<string, unknown>;
  readonly defaultExportFileName: string;
  readonly personFactBindings?: readonly PersonFactBinding[];
}
