import type { QuestionEffects, QuestionEffectOptions } from '../../../domain/route';

function asRecord(value: unknown): Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export const immediateQuestionEffectFields: readonly string[] = [
  'scope.confirmedBVisitorVisa',
  'scope.visitPurpose'
];

export function cleanUsBVisitorStaleAnswers(
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
  const cleaned = cleanUsBVisitorStaleAnswers(safeAnswers);

  const validationErrors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  const scope = asRecord(cleaned.scope);

  const confirmedBVisitor =
    scope.confirmedBVisitorVisa ?? cleaned['scope.confirmedBVisitorVisa'];
  const visitPurpose = scope.visitPurpose ?? cleaned['scope.visitPurpose'];

  if (confirmedBVisitor === 'need_check') {
    warnings['scope.confirmedBVisitorVisa'] =
      '本清单基于美国 B 类旅游/访问签证设计。部分符合条件的旅行者可能适用免签证计划（Visa Waiver Program / ESTA）等其他合法途径。建议在依据本清单准备材料前，先通过官方渠道核实适用的旅行或签证途径。';
  }

  if (visitPurpose === 'other_or_need_check') {
    warnings['scope.visitPurpose'] =
      '本路线适用于 B-2 / B1/B2 中的旅游、度假、探亲访友或就医等临时访问目的。学习、工作/就业或长期居留等活动通常需要核实其他适用的签证或移民类别，请核实你的活动是否符合本路线范围。';
  }

  return {
    answersForChecklist: cleaned,
    validationErrors,
    warnings
  };
}
