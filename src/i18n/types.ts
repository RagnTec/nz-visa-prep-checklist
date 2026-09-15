import type { ChecklistStatus, EvidenceLayer, RequirementType } from '../domain/types';
import type { RouteCategory } from '../domain/route';

/** Currently active and available runtime locale */
export type AvailableLocale = 'zh-CN';

/** Conceptually supported future locales */
export type SupportedLocale = AvailableLocale | 'en';

export type ReusedFactLabelKey =
  | 'safe_reuse'
  | 'confirm_reuse_pending'
  | 'confirm_reuse_confirmed';

export interface ApplicationProgressFormatters {
  readonly checklistComplete: (completeCount: number, totalCount: number) => string;
  readonly surveyInProgress: string;
  readonly surveyStep: (currentStep: number, totalSteps: number) => string;
}

export interface LocaleMessages {
  readonly locale: AvailableLocale;
  readonly checklistStatus: Record<ChecklistStatus, string>;
  readonly requirementType: Record<RequirementType, string>;
  readonly evidenceLayer: Record<EvidenceLayer, string>;
  readonly reusedFact: Record<ReusedFactLabelKey, string>;
  readonly applicationProgress: ApplicationProgressFormatters;
  readonly routeCategory: Record<RouteCategory, string>;
  readonly routeCategorySection: Record<RouteCategory, string>;
  readonly routeDisplayName: Record<string, string>;
  readonly jurisdiction: Record<string, string>;
}
