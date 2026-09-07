import type { QuestionEffects, QuestionEffectOptions } from '../../../domain/route';
import { parseLocalDate, compareLocalDates } from '../../../domain/localDate';
import { resolveFundingSchedule } from './fundingSchedule';

function asRecord(value: unknown): Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export const immediateQuestionEffectFields = [
  'scope.applicationLocation',
  'scope.destinationProvince',
  'scope.studyType',
  'submission.hasPlannedDate',
  'submission.plannedSubmissionDate',
  'admission.dliStatus',
  'admission.institutionType',
  'admission.programLevel',
  'admission.degreeGranting',
  'admission.otherPalException',
  'funding.peopleComingToCanadaStatus',
  'funding.peopleComingToCanadaCount',
  'funding.programDuration',
  'biometrics.ageAtSubmissionBand',
  'biometrics.previousBiometricsStatus',
  'biometrics.validityCheckStatus',
  'biometrics.bilStatus'
];

export function evaluateQuestionEffects(
  answers: Record<string, unknown>,
  _options?: QuestionEffectOptions
): QuestionEffects {
  const scope = asRecord(answers.scope);
  const submission = asRecord(answers.submission);
  const admission = asRecord(answers.admission);
  const funding = asRecord(answers.funding);
  const biometrics = asRecord(answers.biometrics);

  const validationErrors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  // Validate planned submission date strictly via localDate parser
  let submissionDateApplicability: 'before_2026' | 'on_or_after_2026' | 'unknown' = 'unknown';

  if (submission.hasPlannedDate === 'yes') {
    const rawDate = submission.plannedSubmissionDate;
    const parsedDate = parseLocalDate(rawDate);
    if (!parsedDate) {
      validationErrors['submission.plannedSubmissionDate'] = '请输入有效的计划申请递交日期（格式：YYYY-MM-DD）。';
      submissionDateApplicability = 'unknown';
    } else {
      const cmp = compareLocalDates(parsedDate, { year: 2026, month: 1, day: 1 });
      submissionDateApplicability = cmp < 0 ? 'before_2026' : 'on_or_after_2026';
    }
  } else {
    submissionDateApplicability = 'unknown';
  }

  // Validate funding people count if known
  if (funding.peopleComingToCanadaStatus === 'known') {
    const rawCount = funding.peopleComingToCanadaCount;
    if (rawCount === undefined || rawCount === null || rawCount === '') {
      validationErrors['funding.peopleComingToCanadaCount'] = '请输入计划随本次学习安排来到加拿大的有效总人数（包括你本人）。';
    } else {
      const num = Number(rawCount);
      if (!Number.isInteger(num) || num < 1) {
        validationErrors['funding.peopleComingToCanadaCount'] = '人数须为大于或等于 1 的有效整数。';
      }
    }
  }

  const isSupportedBaseScope =
    scope.applicationLocation === 'outside_canada'
    && scope.destinationProvince === 'outside_quebec'
    && scope.studyType === 'post_secondary';

  const hasConfirmedDli = admission.dliStatus === 'confirmed_dli';

  const scopeReviewNeeded = !isSupportedBaseScope || admission.dliStatus === 'confirmed_not_dli';

  const dliReviewNeeded =
    admission.dliStatus === 'not_verified'
    || admission.dliStatus === 'unclear'
    || admission.dliStatus === 'confirmed_not_dli';

  const isPublicGraduateCandidate =
    admission.institutionType === 'public'
    && (admission.programLevel === 'masters_degree' || admission.programLevel === 'doctoral_degree')
    && admission.degreeGranting === 'degree_granting';

  const hasPublicGraduateExceptionContext =
    isSupportedBaseScope
    && hasConfirmedDli
    && isPublicGraduateCandidate
    && submissionDateApplicability === 'on_or_after_2026';

  const hasPossibleOtherPalException =
    isSupportedBaseScope
    && hasConfirmedDli
    && !hasPublicGraduateExceptionContext
    && admission.otherPalException === 'possible_other_official_exception';

  const hasGraduateDegreeUnclear =
    (admission.programLevel === 'masters_degree' || admission.programLevel === 'doctoral_degree')
    && admission.degreeGranting === 'unclear';

  const isDliUnconfirmedInBaseScope =
    isSupportedBaseScope && (admission.dliStatus === 'not_verified' || admission.dliStatus === 'unclear');

  const palTalReviewNeeded =
    isSupportedBaseScope
    && admission.dliStatus !== 'confirmed_not_dli'
    && !hasPublicGraduateExceptionContext
    && !hasPossibleOtherPalException
    && (
      isDliUnconfirmedInBaseScope
      || (isPublicGraduateCandidate && submissionDateApplicability === 'unknown')
      || admission.institutionType === 'unclear'
      || admission.programLevel === 'unclear'
      || hasGraduateDegreeUnclear
      || admission.otherPalException === 'unclear'
    );

  const isStandardPalTalRequired =
    isSupportedBaseScope
    && hasConfirmedDli
    && !hasPublicGraduateExceptionContext
    && !hasPossibleOtherPalException
    && !palTalReviewNeeded
    && admission.otherPalException === 'none_known';

  const isLoaRequired = isSupportedBaseScope && hasConfirmedDli;

  // Resolve funding schedule
  const isFundingScopeUsable = isSupportedBaseScope && admission.dliStatus !== 'confirmed_not_dli';

  const fundingResolved = resolveFundingSchedule({
    hasPlannedDate: submission.hasPlannedDate,
    plannedSubmissionDate: submission.plannedSubmissionDate,
    peopleComingToCanadaStatus: funding.peopleComingToCanadaStatus,
    peopleComingToCanadaCount: funding.peopleComingToCanadaCount
  });

  const isFundingRequiredPeriodProofNeeded =
    isFundingScopeUsable
    && funding.programDuration !== 'unclear'
    && Boolean(funding.programDuration);

  const isFundingLivingExpenseReferenceNeeded =
    isFundingScopeUsable
    && (
      fundingResolved.status === 'historical_match'
      || fundingResolved.status === 'published_match'
      || fundingResolved.status === 'future_recheck_required'
      || fundingResolved.status === 'unknown_date'
    )
    && fundingResolved.peopleCount !== undefined;

  const isFundingLongerProgramPlanNeeded =
    isFundingScopeUsable
    && funding.programDuration === 'more_than_one_year';

  const isFundingEvidenceOptionsReviewNeeded = isFundingScopeUsable;

  const isFundingAnnualUpdateReviewNeeded =
    isFundingScopeUsable
    && fundingResolved.isFutureRecheckRequired;

  const isFundingRequirementReviewNeeded =
    isFundingScopeUsable
    && (
      fundingResolved.isUnknownDate
      || fundingResolved.isUnsupportedHistoricalDate
      || fundingResolved.isUnknownPeopleCount
      || funding.programDuration === 'unclear'
      || !funding.programDuration
    );

  // Resolve biometrics
  const isBiometricsScopeUsable = isSupportedBaseScope && admission.dliStatus !== 'confirmed_not_dli';

  const hasReceivedBil = biometrics.bilStatus === 'received';
  const hasBilStatusUnclear = biometrics.bilStatus === 'unclear';
  const isAge80Plus = biometrics.ageAtSubmissionBand === 'age_80_or_over';
  const isAge18To79 = biometrics.ageAtSubmissionBand === 'age_18_to_79';
  const isAgeUnclear = biometrics.ageAtSubmissionBand === 'unclear' || !biometrics.ageAtSubmissionBand;

  const hasNeverProvided = biometrics.previousBiometricsStatus === 'never_provided';
  const hasProvidedBefore = biometrics.previousBiometricsStatus === 'provided_before';
  const isPreviousBiometricsUnclear =
    biometrics.previousBiometricsStatus === 'unclear' || !biometrics.previousBiometricsStatus;

  const isConfirmedValidByIrcc = hasProvidedBefore && biometrics.validityCheckStatus === 'confirmed_valid_by_ircc';
  const isConfirmedNotValid = hasProvidedBefore && biometrics.validityCheckStatus === 'confirmed_not_valid';
  const isValidityUncheckedOrUnclear =
    hasProvidedBefore
    && (
      biometrics.validityCheckStatus === 'not_checked'
      || biometrics.validityCheckStatus === 'unclear'
      || !biometrics.validityCheckStatus
    );

  // 1. Current application BIL is an official procedural instruction and MUST NOT be suppressed by general route or DLI inference gates
  const isBiometricsBilActionNeeded = hasReceivedBil;

  // 2. General biometrics inference items remain scope-gated and are suppressed if BIL is received
  const isBiometricsAgeRuleInfoNeeded = isBiometricsScopeUsable && isAge80Plus && !hasReceivedBil;

  const isBiometricsValidReuseInfoNeeded =
    isBiometricsScopeUsable && isAge18To79 && isConfirmedValidByIrcc && !hasReceivedBil;

  const isBiometricsValidityCheckNeeded =
    isBiometricsScopeUsable && isAge18To79 && isValidityUncheckedOrUnclear && !hasReceivedBil;

  const isBiometricsCollectionPreparationNeeded =
    isBiometricsScopeUsable
    && !hasReceivedBil
    && (
      (isAge18To79 && hasNeverProvided)
      || (isAge18To79 && isConfirmedNotValid)
    );

  // 3. Requirement review:
  // - If BIL is received, flag conflict when it contradicts general age, reuse, DLI, or scope inference
  // - If BIL is NOT received, flag general uncertainty (age unclear, 18-79 previous history unclear, or BIL status unclear)
  const isBiometricsRequirementReviewNeeded = hasReceivedBil
    ? (isAge80Plus || isConfirmedValidByIrcc || !isSupportedBaseScope || admission.dliStatus === 'confirmed_not_dli')
    : (
      isBiometricsScopeUsable
      && (
        isAgeUnclear
        || (isAge18To79 && isPreviousBiometricsUnclear)
        || hasBilStatusUnclear
      )
    );

  const derivedEffects: Record<string, unknown> = {
    submissionDateApplicability,
    isSupportedBaseScope,
    hasConfirmedDli,
    scopeReviewNeeded,
    dliReviewNeeded,
    isPublicGraduateCandidate,
    hasPublicGraduateExceptionContext,
    hasPossibleOtherPalException,
    palTalReviewNeeded,
    isStandardPalTalRequired,
    isLoaRequired,
    // Funding derived facts
    fundingResolution: fundingResolved.status,
    livingExpenseDefinitiveAmountCad: fundingResolved.definitiveAmountForSubmissionDateCad,
    livingExpenseLatestPublishedReferenceAmountCad: fundingResolved.latestPublishedReferenceAmountCad,
    fundingPeopleCount: fundingResolved.peopleCount,
    isFundingAnnualReviewPending: fundingResolved.isFutureRecheckRequired,
    isFundingRequiredPeriodProofNeeded,
    isFundingLivingExpenseReferenceNeeded,
    isFundingLongerProgramPlanNeeded,
    isFundingEvidenceOptionsReviewNeeded,
    isFundingAnnualUpdateReviewNeeded,
    isFundingRequirementReviewNeeded,
    // Biometrics derived facts
    isBiometricsScopeUsable,
    isBiometricsBilActionNeeded,
    isBiometricsAgeRuleInfoNeeded,
    isBiometricsValidReuseInfoNeeded,
    isBiometricsValidityCheckNeeded,
    isBiometricsCollectionPreparationNeeded,
    isBiometricsRequirementReviewNeeded
  };

  return {
    answersForChecklist: {
      ...answers,
      _effects: derivedEffects
    },
    validationErrors,
    warnings
  };
}

export function cleanCaStaleAnswers(
  answers: Record<string, unknown>
): Record<string, unknown> {
  if (!answers || typeof answers !== 'object') return answers;

  let changed = false;
  const cleanedAnswers: Record<string, unknown> = { ...answers };

  // 1. Clean submission section
  if ('submission' in answers && answers.submission && typeof answers.submission === 'object') {
    const sub = { ...(answers.submission as Record<string, unknown>) };
    let subChanged = false;
    if (sub.hasPlannedDate !== 'yes' && 'plannedSubmissionDate' in sub) {
      delete sub.plannedSubmissionDate;
      subChanged = true;
    }
    if (subChanged) {
      cleanedAnswers.submission = sub;
      changed = true;
    }
  }

  // 2. Clean admission section
  if ('admission' in answers && answers.admission && typeof answers.admission === 'object') {
    const adm = { ...(answers.admission as Record<string, unknown>) };
    let admChanged = false;

    if (adm.dliStatus === 'confirmed_not_dli') {
      if ('institutionType' in adm) { delete adm.institutionType; admChanged = true; }
      if ('programLevel' in adm) { delete adm.programLevel; admChanged = true; }
      if ('degreeGranting' in adm) { delete adm.degreeGranting; admChanged = true; }
      if ('otherPalException' in adm) { delete adm.otherPalException; admChanged = true; }
    } else {
      if (adm.programLevel !== 'masters_degree' && adm.programLevel !== 'doctoral_degree') {
        if ('degreeGranting' in adm) {
          delete adm.degreeGranting;
          admChanged = true;
        }
      }
    }

    if (admChanged) {
      cleanedAnswers.admission = adm;
      changed = true;
    }
  }

  // 3. Clean funding section
  if ('funding' in answers && answers.funding && typeof answers.funding === 'object') {
    const fnd = { ...(answers.funding as Record<string, unknown>) };
    let fndChanged = false;

    if (fnd.peopleComingToCanadaStatus !== 'known' && 'peopleComingToCanadaCount' in fnd) {
      delete fnd.peopleComingToCanadaCount;
      fndChanged = true;
    }

    if (fndChanged) {
      cleanedAnswers.funding = fnd;
      changed = true;
    }
  }

  // 4. Clean biometrics section
  if ('biometrics' in answers && answers.biometrics && typeof answers.biometrics === 'object') {
    const bio = { ...(answers.biometrics as Record<string, unknown>) };
    let bioChanged = false;

    if (bio.ageAtSubmissionBand === 'age_80_or_over') {
      if ('previousBiometricsStatus' in bio) {
        delete bio.previousBiometricsStatus;
        bioChanged = true;
      }
      if ('validityCheckStatus' in bio) {
        delete bio.validityCheckStatus;
        bioChanged = true;
      }
    } else if (bio.previousBiometricsStatus !== 'provided_before' && 'validityCheckStatus' in bio) {
      delete bio.validityCheckStatus;
      bioChanged = true;
    }

    if (bioChanged) {
      cleanedAnswers.biometrics = bio;
      changed = true;
    }
  }

  return changed ? cleanedAnswers : answers;
}
