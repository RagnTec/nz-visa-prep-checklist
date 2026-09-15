import type { QuestionEffects, QuestionEffectOptions } from '../../../domain/route';

export const immediateQuestionEffectFields: string[] = [
  'scope.confirmedPostStudyWork',
  'study.qualificationPathway',
  'timing.applicationWindowStatus',
  'history.previousPostStudyWorkVisa',
  'documents.hasNonEnglishDocuments'
];

export function cleanNzPostStudyWorkStaleAnswers(
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
  const cleaned = cleanNzPostStudyWorkStaleAnswers(safeAnswers);

  const validationErrors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  const scope = cleaned.scope;
  if (scope && typeof scope === 'object') {
    const scopeRec = scope as Record<string, unknown>;
    if (scopeRec.confirmedPostStudyWork === 'need_check') {
      warnings['scope.confirmedPostStudyWork'] =
        '你尚未确定是否申请新西兰毕业后工作签证（PSWV）。新西兰设有多种不同类别的工签路线（如认可雇主工签、打工度假等）；建议在递交前先核对 INZ 官方说明以确认适合你的路线。';
    }
  }

  const study = cleaned.study;
  if (study && typeof study === 'object') {
    const studyRec = study as Record<string, unknown>;
    if (studyRec.qualificationPathway === 'level_7_graduate_diploma') {
      warnings['study.qualificationPathway'] =
        '请注意：针对 7 级 Graduate Diploma 的毕业后工签新政将于 2026 年 11 月 16 日起正式生效实施。如在此日期前递交申请，该学历目前尚不符合 PSWV 申请资格；请务必确认在政策正式生效开放后再行提交。';
    } else if (studyRec.qualificationPathway === 'need_check') {
      warnings['study.qualificationPathway'] =
        '你尚不确定所修读课程对应的具体资格类别。毕业后工签对 NZQCF 学历等级、课程名称以及是否在合格资格清单上有严格界定，建议先对照就读文凭与 INZ 官方说明核对。';
    }
  }

  const timing = cleaned.timing;
  if (timing && typeof timing === 'object') {
    const timingRec = timing as Record<string, unknown>;
    if (timingRec.applicationWindowStatus === 'outside_applicable_window') {
      warnings['timing.applicationWindowStatus'] =
        '你自查认为已超出适用于自身情况的申请截止期限。逾期递交通常将面临无法获批的严重风险，建议核对个人学业与签证记录，并查阅当前 INZ 针对自身就读情况适用的具体递签时限指引。';
    } else if (timingRec.applicationWindowStatus === 'need_check') {
      warnings['timing.applicationWindowStatus'] =
        '你尚未确认适用于自身情况的申请截止期限。毕业后工签对递交时限有明确规定，建议对照当前持有的签证状态、学业完成情况及 INZ 官方说明核实适用的具体申请截止时限。';
    }
  }

  const history = cleaned.history;
  if (history && typeof history === 'object') {
    const historyRec = history as Record<string, unknown>;
    if (historyRec.previousPostStudyWorkVisa === 'yes') {
      warnings['history.previousPostStudyWorkVisa'] =
        '新西兰毕业后工作签证（PSWV）一生仅限获批一次。若你此前曾获批过该签证，当前申请路线可能不在适用范围内；建议核对 INZ 官方说明以了解其他适合的工作签证类别。';
    } else if (historyRec.previousPostStudyWorkVisa === 'need_check') {
      warnings['history.previousPostStudyWorkVisa'] =
        '你尚不确定此前是否曾获批过该签证。请核对并确认你以往在新西兰是否曾持有过毕业后工作签证（PSWV）。';
    }
  }

  return {
    validationErrors,
    warnings,
    answersForChecklist: cleaned
  };
}
