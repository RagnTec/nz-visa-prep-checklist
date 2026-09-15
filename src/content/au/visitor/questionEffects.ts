import type { QuestionEffects, QuestionEffectOptions } from '../../../domain/route';

function asRecord(value: unknown): Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export const immediateQuestionEffectFields: string[] = [
  'scope.confirmedTouristPurpose',
  'scope.confirmedVisaPathway',
  'scope.confirmedOffshoreApplication',
  'applicant.isEmployed',
  'documents.hasNonEnglishDocuments'
];

export function cleanAuVisitorStaleAnswers(
  answers: Record<string, unknown>
): Record<string, unknown> {
  if (!answers || typeof answers !== 'object') return answers;
  return { ...answers };
}

export function evaluateQuestionEffects(
  answers: Record<string, unknown>,
  _options?: QuestionEffectOptions
): QuestionEffects {
  const safeAnswers = answers && typeof answers === 'object' ? answers : {};
  const cleaned = cleanAuVisitorStaleAnswers(safeAnswers);

  const validationErrors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  const scope = asRecord(cleaned.scope);
  const confirmedTouristPurpose = scope.confirmedTouristPurpose ?? cleaned['scope.confirmedTouristPurpose'];
  const confirmedVisaPathway = scope.confirmedVisaPathway ?? cleaned['scope.confirmedVisaPathway'];
  const confirmedOffshoreApplication = scope.confirmedOffshoreApplication ?? cleaned['scope.confirmedOffshoreApplication'];

  if (confirmedTouristPurpose === 'other') {
    validationErrors['scope.confirmedTouristPurpose'] =
      '当前路线仅覆盖个人旅游或度假访问准备，其他访问目的暂不在支持范围内。';
  }

  if (confirmedVisaPathway === 'need_check') {
    warnings['scope.confirmedVisaPathway'] =
      '请先通过澳大利亚官方渠道确认是否需要申请 Visitor visa (subclass 600) Tourist stream。VisaHelper 不判断 subclass 600、ETA 601、eVisitor 651 或其他签证途径的适用性。';
  }

  if (confirmedOffshoreApplication === 'no') {
    validationErrors['scope.confirmedOffshoreApplication'] =
      '当前路线仅覆盖在澳大利亚境外递交申请，并在签证决定时仍位于澳大利亚境外的 Tourist stream 准备场景。其他情况暂不在支持范围内。';
  }

  return {
    answersForChecklist: cleaned,
    validationErrors,
    warnings
  };
}
