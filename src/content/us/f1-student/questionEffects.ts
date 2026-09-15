import type { QuestionEffects, QuestionEffectOptions } from '../../../domain/route';

function asRecord(value: unknown): Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export const immediateQuestionEffectFields: readonly string[] = [
  'scope.confirmedF1StudentVisa',
  'scope.applicationContext',
  'admission.i20Status'
];

export function cleanUsF1StaleAnswers(
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
  const cleaned = cleanUsF1StaleAnswers(safeAnswers);

  const validationErrors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  const scope = asRecord(cleaned.scope);
  const admission = asRecord(cleaned.admission);

  const confirmedF1 = scope.confirmedF1StudentVisa ?? cleaned['scope.confirmedF1StudentVisa'];
  const applicationContext = scope.applicationContext ?? cleaned['scope.applicationContext'];
  const i20Status = admission.i20Status ?? cleaned['admission.i20Status'];

  if (confirmedF1 === 'need_check') {
    warnings['scope.confirmedF1StudentVisa'] =
      '本清单基于美国 F-1 学生签证（学术或语言学习项目）设计。如果你尚未确定签证类型，或拟就读职业类培训（如 M-1 签证）、交流访问（如 J-1 签证），请先通过官方渠道核实适用的签证类别。';
  }

  if (
    applicationContext === 'continuing_or_returning' ||
    applicationContext === 'change_of_status_or_other' ||
    applicationContext === 'need_check'
  ) {
    warnings['scope.applicationContext'] =
      '本清单侧重在境外首次申请 F-1 签证的标准材料准备流程。境内身份转换（Change of Status）、在读返校或复杂续签可能涉及不同程序与特定要求。';
  }

  if (i20Status === 'admitted_waiting_i20' || i20Status === 'need_check') {
    warnings['admission.i20Status'] =
      'Form I-20 包含进行标准 F-1 签证准备所需的 SEVIS 及院校/项目信息。在收到并核对 Form I-20 后，请依据当前官方指引继续进行 DS-160 填写、适用费用缴纳及所属使领馆申请安排。';
  } else if (i20Status === 'not_admitted') {
    warnings['admission.i20Status'] =
      '标准 F-1 境外首次签证申请以获得 SEVP 认证学校的录取并取得 Form I-20 为前提。如尚未确定录取或取得 I-20，建议先完成院校申请并获得正式录取凭据。';
  }

  return {
    answersForChecklist: cleaned,
    validationErrors,
    warnings
  };
}
