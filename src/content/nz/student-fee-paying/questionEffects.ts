import {
  addCalendarMonths,
  compareLocalDates,
  localDateFromDate,
  parseLocalDate
} from '../../../domain/localDate';

export const courseDateInvalidMessage = '请输入有效的课程日期。';
export const courseDateOrderMessage = '课程结束日期不能早于开始日期，请核对这两个日期。';
export const intendedArrivalInvalidMessage = '请输入有效的预计抵达日期。';
export const intendedArrivalPastMessage =
  '预计抵达日期不能早于今天。请更正日期，或选择与你情况相符的所在地。';
export const pastCourseNotStartedMessage =
  '课程开始日期已经过去，但你选择了‘课程尚未开始’。请更新课程日期，或选择与你当前情况相符的课程状态。';
export const futureCourseAlreadyStartedMessage =
  '课程开始日期尚未到来，但你选择了‘课程已经开始’。请核对课程日期或当前课程状态。';
export const deferredPastCourseWarning =
  '你填写的开始日期已经过去，且课程已延期或发生变化。请确认这里填写的是教育机构最新记录中的日期，而不是旧 Offer 日期。';
export const arrivalAfterCourseStartWarning =
  '预计抵达日期晚于课程开始日期。请核对最新 Offer、教育机构允许的到校时间，以及课程是否已延期或可以晚到。本工具不会判断该安排是否可接受。';
export const arrivalAfterCourseEndMessage =
  '预计抵达日期晚于课程结束日期。请核对课程日期、预计抵达日期或课程当前状态。';
export const applicationTimingWarningMessage =
  '你目前在新西兰境外、尚未提交学生签证申请，且预计在 3 个月内出行。INZ 目前强烈建议尽可能在预计出行日期至少 3 个月前申请，并说明学生签证处理时间不受保证。这是时间规划提示，不是申请截止日期、签证资格判断或结果保证。';
export const childVisitorLongTermStudyWarning =
  '你目前选择的是子女访客类安排，同时填写了计划学习超过 3 个月。INZ 当前说明，相关访客签证下的学习通常最多为 3 个月；如计划学习超过 3 个月，请核对相应的学生签证安排和当前官方要求。本提示仅用于发现当前填写信息之间需要进一步核对的地方。';
export const questionEffectFields = [
  'study.courseStart',
  'study.courseEnd',
  'study.courseStatus',
  'travel.locationContext',
  'travel.intendedArrivalDate',
  'application.stage',
  'health.evidenceStatus',
  'education.recordContexts',
  'english.providerEvidenceStatus',
  'documents.originContext',
  'family.linkedApplicationContext',
  'family.partnerVisaRoute',
  'family.childStudyPlan',
  'family.childApplicationArrangement',
  'family.childSupportBasis',
  'family.childVisaRoute',
  'documents.nonEnglishEvidenceStatus'
] as const;
export const immediateQuestionEffectFields = questionEffectFields.slice(0, 6);

export interface QuestionEffects {
  answersForChecklist: Record<string, unknown>;
  validationErrors: Record<string, string>;
  warnings: Record<string, string>;
}

export interface QuestionEffectOptions {
  checklistGenerated?: boolean;
  now?: Date;
}

const educationRecordContexts = new Set([
  'completed_qualification',
  'currently_enrolled',
  'incomplete_or_withdrawn',
  'other_or_unclear'
]);
const englishProviderEvidenceStatuses = new Set([
  'available',
  'pending_or_conditional',
  'provider_confirmed_not_required',
  'other_or_unclear'
]);
const documentOriginContexts = new Set(['mainland_china', 'other', 'mixed', 'unclear']);
const linkedApplicationContexts = new Set([
  'none',
  'partner',
  'dependent_child',
  'partner_and_child',
  'unclear'
]);
const partnerVisaRoutes = new Set([
  'partner_student_work',
  'partner_student_visitor',
  'undecided'
]);
const childStudyPlans = new Set([
  'no_long_term_study',
  'more_than_3_months',
  'undecided'
]);
const childApplicationArrangements = new Set([
  'included_with_partner_student_visitor',
  'separate_child_application',
  'undecided'
]);
const childSupportBases = new Set([
  'student_parent',
  'work_visa_parent',
  'undecided'
]);
const childVisaRoutes = new Set([
  'dependent_child_student',
  'child_student_visitor',
  'child_worker_visitor',
  'undecided'
]);
const nonEnglishEvidenceStatuses = new Set([
  'none_known',
  'includes_non_english',
  'unclear'
]);
const applicantTypes = new Set([
  'recent_graduate_no_formal_work',
  'employed_or_previously_employed',
  'non_recent_graduate_no_formal_work',
  'other_or_unclear'
]);
const studyRelations = new Set([
  'continuation',
  'adjacent_capability',
  'significant_transition',
  'unclear'
]);

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}

function isAllowedString(value: unknown, allowed: Set<string>): value is string {
  return typeof value === 'string' && allowed.has(value);
}

function hasValidEducationContexts(value: unknown): boolean {
  if (!Array.isArray(value) || value.length === 0) return false;
  if (!value.every((entry) => isAllowedString(entry, educationRecordContexts))) return false;
  if (new Set(value).size !== value.length) return false;
  return !value.includes('other_or_unclear') || value.length === 1;
}

function includesPartner(context: unknown): boolean {
  return context === 'partner' || context === 'partner_and_child';
}

function includesChild(context: unknown): boolean {
  return context === 'dependent_child' || context === 'partner_and_child';
}

export function removeHiddenFamilyRouteAnswers(
  answers: Record<string, unknown>
): Record<string, unknown> {
  const familyValue = answers.family;
  if (!familyValue || typeof familyValue !== 'object' || Array.isArray(familyValue)) {
    return answers;
  }

  const family = familyValue as Record<string, unknown>;
  const cleanedFamily = { ...family };
  let changed = false;

  if (!includesPartner(family.linkedApplicationContext)) {
    if ('partnerVisaRoute' in cleanedFamily) {
      delete cleanedFamily.partnerVisaRoute;
      changed = true;
    }
    if ('childApplicationArrangement' in cleanedFamily) {
      delete cleanedFamily.childApplicationArrangement;
      changed = true;
    }
  }

  if (!includesChild(family.linkedApplicationContext)) {
    if ('childStudyPlan' in cleanedFamily) {
      delete cleanedFamily.childStudyPlan;
      changed = true;
    }
    if ('childApplicationArrangement' in cleanedFamily) {
      delete cleanedFamily.childApplicationArrangement;
      changed = true;
    }
    if ('childSupportBasis' in cleanedFamily) {
      delete cleanedFamily.childSupportBasis;
      changed = true;
    }
    if ('childVisaRoute' in cleanedFamily) {
      delete cleanedFamily.childVisaRoute;
      changed = true;
    }
  } else {
    const isPartnerAndChild = family.linkedApplicationContext === 'partner_and_child';

    if (!isPartnerAndChild && 'childApplicationArrangement' in cleanedFamily) {
      delete cleanedFamily.childApplicationArrangement;
      changed = true;
    }

    if (isPartnerAndChild) {
      if (family.partnerVisaRoute !== 'partner_student_visitor' && 'childApplicationArrangement' in cleanedFamily) {
        delete cleanedFamily.childApplicationArrangement;
        changed = true;
      }
      if (family.partnerVisaRoute !== 'partner_student_work' && family.partnerVisaRoute !== 'partner_student_visitor') {
        if ('childApplicationArrangement' in cleanedFamily) {
          delete cleanedFamily.childApplicationArrangement;
          changed = true;
        }
        if ('childSupportBasis' in cleanedFamily) {
          delete cleanedFamily.childSupportBasis;
          changed = true;
        }
        if ('childVisaRoute' in cleanedFamily) {
          delete cleanedFamily.childVisaRoute;
          changed = true;
        }
      } else if (
        family.partnerVisaRoute === 'partner_student_visitor'
        && family.childApplicationArrangement !== 'separate_child_application'
      ) {
        if ('childSupportBasis' in cleanedFamily) {
          delete cleanedFamily.childSupportBasis;
          changed = true;
        }
        if ('childVisaRoute' in cleanedFamily) {
          delete cleanedFamily.childVisaRoute;
          changed = true;
        }
      }
    }

    if (cleanedFamily.childSupportBasis === 'undecided' && 'childVisaRoute' in cleanedFamily) {
      delete cleanedFamily.childVisaRoute;
      changed = true;
    }

    const supportBasis = cleanedFamily.childSupportBasis;
    const childRoute = cleanedFamily.childVisaRoute;

    if (supportBasis === 'student_parent' && childRoute === 'child_worker_visitor') {
      delete cleanedFamily.childVisaRoute;
      changed = true;
    } else if (supportBasis === 'work_visa_parent' && childRoute === 'child_student_visitor') {
      delete cleanedFamily.childVisaRoute;
      changed = true;
    }
  }

  return changed ? { ...answers, family: cleanedFamily } : answers;
}

function isChildProfileComplete(family: Record<string, unknown>): boolean {
  if (!includesChild(family.linkedApplicationContext)) return true;

  if (!isAllowedString(family.childStudyPlan, childStudyPlans)) return false;

  const isPartnerAndChild = family.linkedApplicationContext === 'partner_and_child';

  if (isPartnerAndChild) {
    if (!isAllowedString(family.partnerVisaRoute, partnerVisaRoutes)) return false;

    if (family.partnerVisaRoute === 'partner_student_visitor') {
      if (!isAllowedString(family.childApplicationArrangement, childApplicationArrangements)) {
        return false;
      }
      if (
        family.childApplicationArrangement === 'included_with_partner_student_visitor'
        || family.childApplicationArrangement === 'undecided'
      ) {
        return true;
      }
    } else if (family.partnerVisaRoute === 'undecided') {
      return true;
    }
  }

  if (!isAllowedString(family.childSupportBasis, childSupportBases)) return false;
  if (!isAllowedString(family.childVisaRoute, childVisaRoutes)) return false;

  if (family.childSupportBasis === 'student_parent') {
    return ['dependent_child_student', 'child_student_visitor', 'undecided'].includes(
      family.childVisaRoute as string
    );
  }
  if (family.childSupportBasis === 'work_visa_parent') {
    return ['dependent_child_student', 'child_worker_visitor', 'undecided'].includes(
      family.childVisaRoute as string
    );
  }
  return ['dependent_child_student', 'child_student_visitor', 'child_worker_visitor', 'undecided'].includes(
    family.childVisaRoute as string
  );
}

export function isChildVisitorStudyConflict(family: Record<string, unknown> | undefined): boolean {
  if (!family || typeof family !== 'object') return false;
  if (family.childStudyPlan !== 'more_than_3_months') return false;

  const isIncludedWithPartnerVisitor =
    family.linkedApplicationContext === 'partner_and_child'
    && family.partnerVisaRoute === 'partner_student_visitor'
    && family.childApplicationArrangement === 'included_with_partner_student_visitor';

  const isChildVisitorRoute =
    (family.linkedApplicationContext === 'dependent_child' || family.linkedApplicationContext === 'partner_and_child')
    && (family.childVisaRoute === 'child_student_visitor' || family.childVisaRoute === 'child_worker_visitor');

  return isIncludedWithPartnerVisitor || isChildVisitorRoute;
}

export function evaluateQuestionEffects(
  answers: Record<string, unknown>,
  options: QuestionEffectOptions = {}
): QuestionEffects {
  const study = asRecord(answers.study);
  const travel = asRecord(answers.travel);
  const application = asRecord(answers.application);
  const funding = asRecord(answers.funding);
  const background = asRecord(answers.background);
  const education = asRecord(answers.education);
  const english = asRecord(answers.english);
  const documents = asRecord(answers.documents);
  const family = asRecord(answers.family);
  const now = options.now ?? new Date();
  const today = localDateFromDate(now);
  const courseStart = parseLocalDate(study.courseStart);
  const courseEnd = parseLocalDate(study.courseEnd);
  const intendedArrival = parseLocalDate(travel.intendedArrivalDate);
  const validationErrors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  if (hasValue(study.courseStart) && !courseStart) {
    validationErrors['study.courseStart'] = courseDateInvalidMessage;
  }
  if (hasValue(study.courseEnd) && !courseEnd) {
    validationErrors['study.courseEnd'] = courseDateInvalidMessage;
  } else if (courseStart && courseEnd && compareLocalDates(courseEnd, courseStart) < 0) {
    validationErrors['study.courseEnd'] = courseDateOrderMessage;
  }

  if (courseStart && compareLocalDates(courseStart, today) < 0) {
    if (study.courseStatus === 'not_started') {
      validationErrors['study.courseStatus'] = pastCourseNotStartedMessage;
    } else if (study.courseStatus === 'deferred_or_changed') {
      warnings['study.courseStatus'] = deferredPastCourseWarning;
    }
  } else if (
    courseStart
    && compareLocalDates(courseStart, today) > 0
    && study.courseStatus === 'already_started'
  ) {
    validationErrors['study.courseStatus'] = futureCourseAlreadyStartedMessage;
  }

  if (hasValue(travel.intendedArrivalDate) && !intendedArrival) {
    validationErrors['travel.intendedArrivalDate'] = intendedArrivalInvalidMessage;
  } else if (
    travel.locationContext === 'offshore'
    && intendedArrival
    && compareLocalDates(intendedArrival, today) < 0
  ) {
    validationErrors['travel.intendedArrivalDate'] = intendedArrivalPastMessage;
  } else if (
    travel.locationContext === 'offshore'
    && intendedArrival
    && courseEnd
    && compareLocalDates(intendedArrival, courseEnd) > 0
  ) {
    validationErrors['travel.intendedArrivalDate'] = arrivalAfterCourseEndMessage;
  } else if (
    travel.locationContext === 'offshore'
    && intendedArrival
    && courseStart
    && courseEnd
    && compareLocalDates(intendedArrival, courseStart) > 0
    && compareLocalDates(intendedArrival, courseEnd) <= 0
  ) {
    warnings['travel.intendedArrivalDate'] = arrivalAfterCourseStartWarning;
  }

  const courseStartPast = Boolean(
    courseStart && compareLocalDates(courseStart, today) < 0
  );
  const applicationTimingSoon = Boolean(
    travel.locationContext === 'offshore'
    && application.stage === 'not_submitted'
    && intendedArrival
    && compareLocalDates(intendedArrival, today) > 0
    && compareLocalDates(intendedArrival, addCalendarMonths(today, 3)) < 0
  );
  if (applicationTimingSoon) {
    warnings['application.stage'] = applicationTimingWarningMessage;
  }
  if (isChildVisitorStudyConflict(family)) {
    if (family.childApplicationArrangement === 'included_with_partner_student_visitor') {
      warnings['family.childApplicationArrangement'] = childVisitorLongTermStudyWarning;
    }
    if (family.childVisaRoute === 'child_student_visitor' || family.childVisaRoute === 'child_worker_visitor') {
      warnings['family.childVisaRoute'] = childVisitorLongTermStudyWarning;
    }
  }

  const materialProfileIncomplete = !(
    hasValidEducationContexts(education.recordContexts)
    && isAllowedString(english.providerEvidenceStatus, englishProviderEvidenceStatuses)
    && isAllowedString(documents.originContext, documentOriginContexts)
    && isAllowedString(family.linkedApplicationContext, linkedApplicationContexts)
    && (
      !includesPartner(family.linkedApplicationContext)
      || isAllowedString(family.partnerVisaRoute, partnerVisaRoutes)
    )
    && isChildProfileComplete(family)
    && isAllowedString(documents.nonEnglishEvidenceStatus, nonEnglishEvidenceStatuses)
  );
  const studyRationaleSupport = (
    isAllowedString(background.applicantType, applicantTypes)
    && isAllowedString(background.studyRelation, studyRelations)
  );
  const chronologySummary = (
    isAllowedString(background.applicantType, applicantTypes)
    || background.hasGap === true
  );
  const supporterRelationshipReview = [
    'overseas_third_party',
    'nz_sponsorship',
    'mixed'
  ].includes(typeof funding.arrangementType === 'string' ? funding.arrangementType : '');
  const partnerRelationshipReview = [
    'partner',
    'partner_and_child'
  ].includes(typeof family.linkedApplicationContext === 'string'
    ? family.linkedApplicationContext
    : '');
  const childRelationshipReview = [
    'dependent_child',
    'partner_and_child'
  ].includes(typeof family.linkedApplicationContext === 'string'
    ? family.linkedApplicationContext
    : '');
  const childVisitorStudyConflict = isChildVisitorStudyConflict(family);
  const translationReview = [
    'includes_non_english',
    'unclear'
  ].includes(typeof documents.nonEnglishEvidenceStatus === 'string'
    ? documents.nonEnglishEvidenceStatus
    : '');

  return {
    answersForChecklist: {
      ...answers,
      _effects: {
        courseStartPast,
        applicationTimingSoon,
        materialProfileIncomplete,
        studyRationaleSupport,
        chronologySummary,
        supporterRelationshipReview,
        partnerRelationshipReview,
        childRelationshipReview,
        childVisitorStudyConflict,
        translationReview,
        documentIndex: options.checklistGenerated === true
      }
    },
    validationErrors,
    warnings
  };
}
