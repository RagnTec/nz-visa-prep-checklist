import type { QuestionEffects, QuestionEffectOptions } from '../../../domain/route';

function asRecord(value: unknown): Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export const immediateQuestionEffectFields: string[] = [
  'scope.confirmedTouristPurpose',
  'scope.confirmedVisaPathway',
  'applicant.isEmployed'
];

export function cleanCaVisitorStaleAnswers(
  answers: Record<string, unknown>
): Record<string, unknown> {
  if (!answers || typeof answers !== 'object') return answers;
  const result: Record<string, unknown> = { ...answers };

  if (result.travel && typeof result.travel === 'object') {
    const travelRec = { ...(result.travel as Record<string, unknown>) };
    delete travelRec.hasPlannedDates;
    delete travelRec.accommodationType;
    if (Object.keys(travelRec).length === 0) {
      delete result.travel;
    } else {
      result.travel = travelRec;
    }
  }

  return result;
}

export function evaluateQuestionEffects(
  answers: Record<string, unknown>,
  _options?: QuestionEffectOptions
): QuestionEffects {
  const safeAnswers = answers && typeof answers === 'object' ? answers : {};
  const cleaned = cleanCaVisitorStaleAnswers(safeAnswers);

  const validationErrors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  const scope = asRecord(cleaned.scope);
  const confirmedTouristPurpose = scope.confirmedTouristPurpose ?? cleaned['scope.confirmedTouristPurpose'];
  const confirmedVisaPathway = scope.confirmedVisaPathway ?? cleaned['scope.confirmedVisaPathway'];

  if (confirmedTouristPurpose === 'other') {
    validationErrors['scope.confirmedTouristPurpose'] =
      '当前路线仅覆盖个人旅游或度假访问准备，其他访问目的暂不在支持范围内。';
  }

  if (confirmedVisaPathway === 'need_check') {
    warnings['scope.confirmedVisaPathway'] =
      '请先通过 IRCC 官方渠道确认是否需要申请 Visitor Visa。VisaHelper 不判断 Visitor Visa、eTA 或其他入境许可的适用性。';
  }

  return {
    answersForChecklist: cleaned,
    validationErrors,
    warnings
  };
}
