import type { QuestionEffects, QuestionEffectOptions } from '../../../domain/route';

export const immediateQuestionEffectFields: string[] = [
  'scope.confirmedEmployerSpecificPermit',
  'scope.workLocationScope',
  'employment.lmiaPathway',
  'document.hasNonEnglishDocuments'
];

export function cleanCaEswpStaleAnswers(
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
  const cleaned = cleanCaEswpStaleAnswers(safeAnswers);

  const validationErrors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  const scope = cleaned.scope;
  if (scope && typeof scope === 'object') {
    const scopeRec = scope as Record<string, unknown>;
    if (scopeRec.confirmedEmployerSpecificPermit === 'need_check') {
      warnings['scope.confirmedEmployerSpecificPermit'] =
        '你尚未确定是否申请加拿大雇主特定工签。加拿大工签分为开放式（Open Work Permit）与雇主特定（Employer-Specific）等多种类别；建议在递交前先核对 IRCC 官方说明以确认适合你的申请类别。';
    }
    if (scopeRec.workLocationScope === 'quebec') {
      warnings['scope.workLocationScope'] =
        '工作地点位于魁北克省的工签通常需要办理魁省移民部门（MIFI）的额外许可程序（如 CAQ/接收证明）。本清单仅面向魁北克省以外的常规境外工签准备，请核对魁省专属官方指引。';
    } else if (scopeRec.workLocationScope === 'need_check') {
      warnings['scope.workLocationScope'] =
        '你尚未确定工作地点是否在魁北克省。魁省对临时外国劳工有单独的省阶段筛选与 CAQ 要求，请先与雇主确认实际工作地点。';
    }
  }

  const employment = cleaned.employment;
  if (employment && typeof employment === 'object') {
    const empRec = employment as Record<string, unknown>;
    if (empRec.lmiaPathway === 'lmia_exempt_other_or_exception') {
      warnings['employment.lmiaPathway'] =
        '你选择了其他 LMIA 豁免或非标准例外情形。若雇主无需通过 Employer Portal 申报，请核对 IRCC 针对具体豁免代码（Exemption Code）的特殊证明要求。本清单主要面向常规 Employer Portal 申报途径。';
    } else if (empRec.lmiaPathway === 'need_check') {
      warnings['employment.lmiaPathway'] =
        '你尚未确定该职位对应的 LMIA 途径。雇主在为你办理录用前应明确其属于 LMIA-required 还是 LMIA-exempt；建议与雇主核实以准备正确的官方凭证。';
    }
  }

  return {
    answersForChecklist: cleaned,
    validationErrors,
    warnings
  };
}
