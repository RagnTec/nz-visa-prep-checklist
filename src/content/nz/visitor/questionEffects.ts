import type { QuestionEffects, QuestionEffectOptions } from '../../../domain/route';

export const immediateQuestionEffectFields: string[] = [
  'scope.isAdultApplicant',
  'visit.primaryPurpose',
  'travel.hasSpecificDates',
  'travel.intendedArrivalDate',
  'travel.intendedDepartureDate',
  'travel.intendedStayDuration',
  'travel.outwardTravelBasis',
  'funding.fundingSource',
  'funding.hasPrepaidAccommodation',
  'genuineVisitor.employmentOrStudyStatus',
  'genuineVisitor.hasVisaDeclineHistory',
  'health.hasTbRiskHistory',
  'health.hasSignificantMedicalCondition',
  'character.totalStayInNz24MonthsOrMore',
  'character.hasCriminalOrRemovalHistory',
  'identity.hasValidPassport',
  'identity.passportValidityConfirmed',
  'identity.hasOtherNames'
];

export function cleanNzVisitorStaleAnswers(
  answers: Record<string, unknown>
): Record<string, unknown> {
  if (!answers || typeof answers !== 'object') return answers;
  const result: Record<string, unknown> = { ...answers };

  const identity = result.identity;
  if (identity && typeof identity === 'object') {
    const idRec = { ...(identity as Record<string, unknown>) };
    if (idRec.hasValidPassport !== 'yes') {
      delete idRec.passportValidityConfirmed;
    }
    result.identity = idRec;
  }

  const travel = result.travel;
  if (travel && typeof travel === 'object') {
    const travelRec = { ...(travel as Record<string, unknown>) };
    if (travelRec.hasSpecificDates !== 'yes') {
      delete travelRec.intendedArrivalDate;
      delete travelRec.intendedDepartureDate;
    }
    result.travel = travelRec;
  }

  const funding = result.funding;
  if (funding && typeof funding === 'object') {
    const fundingRec = { ...(funding as Record<string, unknown>) };
    if (fundingRec.fundingSource !== 'self_funded') {
      delete fundingRec.hasPrepaidAccommodation;
      delete fundingRec.selfFundingEvidenceTypes;
    }
    result.funding = fundingRec;
  }

  return result;
}

export function evaluateQuestionEffects(
  answers: Record<string, unknown>,
  _options?: QuestionEffectOptions
): QuestionEffects {
  const safeAnswers = answers && typeof answers === 'object' ? answers : {};
  const cleaned = cleanNzVisitorStaleAnswers(safeAnswers);

  const validationErrors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  const travel = cleaned.travel;
  if (travel && typeof travel === 'object') {
    const travelRec = travel as Record<string, unknown>;
    const arrival = typeof travelRec.intendedArrivalDate === 'string' ? travelRec.intendedArrivalDate.trim() : '';
    const departure = typeof travelRec.intendedDepartureDate === 'string' ? travelRec.intendedDepartureDate.trim() : '';

    if (arrival && departure && /^\d{4}-\d{2}-\d{2}$/.test(arrival) && /^\d{4}-\d{2}-\d{2}$/.test(departure)) {
      if (departure < arrival) {
        validationErrors['travel.intendedDepartureDate'] = '预计离开新西兰日期不能早于预计到达日期。';
      }
    }
  }

  return {
    answersForChecklist: cleaned,
    validationErrors,
    warnings
  };
}
