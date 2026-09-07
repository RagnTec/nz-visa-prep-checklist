import { parseLocalDate, compareLocalDates } from '../../../domain/localDate';

/**
 * Route-local Canada Study Permit living-expense funding schedule definition.
 * All amounts are in CAD for all provinces/territories except Quebec.
 * These amounts cover living expenses only (excluding tuition and transportation).
 */
export interface FundingSchedule {
  effectiveFrom: string; // 'YYYY-MM-DD'
  effectiveThrough?: string; // 'YYYY-MM-DD', absent if ongoing
  baseAmounts: number[]; // 1-indexed by family count up to 7
  additionalPersonAmount: number;
  sourceId: string;
}

export const HISTORICAL_SCHEDULE_2024: FundingSchedule = {
  effectiveFrom: '2024-01-01',
  effectiveThrough: '2025-08-31',
  baseAmounts: [0, 20635, 25690, 31583, 38346, 43492, 49051, 54611],
  additionalPersonAmount: 5559,
  sourceId: 'ca.study-permit.financial-support'
};

export const LATEST_PUBLISHED_SCHEDULE_2025: FundingSchedule = {
  effectiveFrom: '2025-09-01',
  // Note: No effectiveThrough is fabricated. The official page states "on or after September 1, 2025".
  baseAmounts: [0, 22895, 28502, 35040, 42543, 48252, 54420, 60589],
  additionalPersonAmount: 6170,
  sourceId: 'ca.study-permit.financial-support'
};

/**
 * Product-governance recheck boundary.
 * IRCC adjusts study permit living expense amounts on September 1 annually.
 * As of checkedAt 2026-08-24, the post-2026-09-01 schedule is not yet published on Canada.ca.
 * This is NOT an official legal effectiveThrough date for the 2025 schedule;
 * it is a product freshness boundary requiring recheck before submission.
 */
export const FUNDING_RECHECK_ON_OR_AFTER = '2026-09-01';

const PARSED_HISTORICAL_START = parseLocalDate('2024-01-01')!;
const PARSED_2025_SCHEDULE_START = parseLocalDate('2025-09-01')!;
const PARSED_RECHECK_BOUNDARY = parseLocalDate(FUNDING_RECHECK_ON_OR_AFTER)!;

export type FundingResolutionStatus =
  | 'historical_match'
  | 'published_match'
  | 'future_recheck_required'
  | 'unknown_date'
  | 'unsupported_historical_date'
  | 'unknown_people_count';

export interface ResolveFundingScheduleInput {
  hasPlannedDate?: unknown;
  plannedSubmissionDate?: unknown;
  peopleComingToCanadaStatus?: unknown;
  peopleComingToCanadaCount?: unknown;
}

export interface ResolvedFundingSchedule {
  status: FundingResolutionStatus;
  definitiveAmountForSubmissionDateCad?: number;
  latestPublishedReferenceAmountCad?: number;
  peopleCount?: number;
  isHistoricalSchedule: boolean;
  isFutureRecheckRequired: boolean;
  isUnknownDate: boolean;
  isUnsupportedHistoricalDate: boolean;
  isUnknownPeopleCount: boolean;
  sourceId: string;
}

export function calculateLivingExpenseForSchedule(
  schedule: FundingSchedule,
  count: number
): number | undefined {
  if (!Number.isInteger(count) || count < 1) return undefined;
  if (count <= 7) {
    return schedule.baseAmounts[count];
  }
  const base7 = schedule.baseAmounts[7];
  if (base7 === undefined) return undefined;
  return base7 + (count - 7) * schedule.additionalPersonAmount;
}

export function resolveFundingSchedule(
  input: ResolveFundingScheduleInput
): ResolvedFundingSchedule {
  const sourceId = 'ca.study-permit.financial-support';

  // 1. Resolve people count
  let peopleCount: number | undefined;
  if (input.peopleComingToCanadaStatus === 'known') {
    const rawCount = Number(input.peopleComingToCanadaCount);
    if (Number.isInteger(rawCount) && rawCount >= 1) {
      peopleCount = rawCount;
    }
  }

  const isUnknownPeopleCount = peopleCount === undefined;

  // Compute reference amount on latest published schedule if count is known
  const latestPublishedReferenceAmountCad = peopleCount !== undefined
    ? calculateLivingExpenseForSchedule(LATEST_PUBLISHED_SCHEDULE_2025, peopleCount)
    : undefined;

  // 2. Resolve date applicability
  if (input.hasPlannedDate !== 'yes') {
    return {
      status: isUnknownPeopleCount ? 'unknown_people_count' : 'unknown_date',
      latestPublishedReferenceAmountCad,
      peopleCount,
      isHistoricalSchedule: false,
      isFutureRecheckRequired: false,
      isUnknownDate: true,
      isUnsupportedHistoricalDate: false,
      isUnknownPeopleCount,
      sourceId
    };
  }

  const parsedDate = parseLocalDate(input.plannedSubmissionDate);
  if (!parsedDate) {
    return {
      status: isUnknownPeopleCount ? 'unknown_people_count' : 'unknown_date',
      latestPublishedReferenceAmountCad,
      peopleCount,
      isHistoricalSchedule: false,
      isFutureRecheckRequired: false,
      isUnknownDate: true,
      isUnsupportedHistoricalDate: false,
      isUnknownPeopleCount,
      sourceId
    };
  }

  // Check date boundaries using parsed single-source constants
  const cmpHistoricalStart = compareLocalDates(parsedDate, PARSED_HISTORICAL_START);
  const cmp2025Start = compareLocalDates(parsedDate, PARSED_2025_SCHEDULE_START);
  const cmpRecheckBoundary = compareLocalDates(parsedDate, PARSED_RECHECK_BOUNDARY);

  if (cmpHistoricalStart < 0) {
    return {
      status: 'unsupported_historical_date',
      latestPublishedReferenceAmountCad: undefined,
      peopleCount,
      isHistoricalSchedule: false,
      isFutureRecheckRequired: false,
      isUnknownDate: false,
      isUnsupportedHistoricalDate: true,
      isUnknownPeopleCount,
      sourceId
    };
  }

  if (cmp2025Start < 0) {
    // Historical 2024 schedule
    const definitiveAmountForSubmissionDateCad = peopleCount !== undefined
      ? calculateLivingExpenseForSchedule(HISTORICAL_SCHEDULE_2024, peopleCount)
      : undefined;

    return {
      status: isUnknownPeopleCount ? 'unknown_people_count' : 'historical_match',
      definitiveAmountForSubmissionDateCad,
      latestPublishedReferenceAmountCad,
      peopleCount,
      isHistoricalSchedule: true,
      isFutureRecheckRequired: false,
      isUnknownDate: false,
      isUnsupportedHistoricalDate: false,
      isUnknownPeopleCount,
      sourceId
    };
  }

  if (cmpRecheckBoundary >= 0) {
    // Planned submission date crosses expected annual update boundary
    return {
      status: isUnknownPeopleCount ? 'unknown_people_count' : 'future_recheck_required',
      // Notice: definitiveAmountForSubmissionDateCad is absent because no post-boundary rate has been published yet
      latestPublishedReferenceAmountCad,
      peopleCount,
      isHistoricalSchedule: false,
      isFutureRecheckRequired: true,
      isUnknownDate: false,
      isUnsupportedHistoricalDate: false,
      isUnknownPeopleCount,
      sourceId
    };
  }

  // Published 2025 schedule match (2025-09-01 through 2026-08-31)
  const definitiveAmountForSubmissionDateCad = peopleCount !== undefined
    ? calculateLivingExpenseForSchedule(LATEST_PUBLISHED_SCHEDULE_2025, peopleCount)
    : undefined;

  return {
    status: isUnknownPeopleCount ? 'unknown_people_count' : 'published_match',
    definitiveAmountForSubmissionDateCad,
    latestPublishedReferenceAmountCad,
    peopleCount,
    isHistoricalSchedule: false,
    isFutureRecheckRequired: false,
    isUnknownDate: false,
    isUnsupportedHistoricalDate: false,
    isUnknownPeopleCount,
    sourceId
  };
}
