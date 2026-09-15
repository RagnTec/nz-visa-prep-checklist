import type { QuestionEffects, QuestionEffectOptions } from '../../../domain/route';

export const immediateQuestionEffectFields: string[] = [
  'scope.confirmedAewvPathway',
  'skills.minimumSkillEvidenceStatus',
  'skills.registrationStatus',
  'english.requirementStatus',
  'health.intendedStayOver6Months',
  'health.hasTbRiskHistory',
  'character.totalStayInNz24MonthsOrMore',
  'document.hasNonEnglishDocuments'
];

export function cleanNzAewvStaleAnswers(
  answers: Record<string, unknown>
): Record<string, unknown> {
  if (!answers || typeof answers !== 'object') return answers;
  const result: Record<string, unknown> = { ...answers };

  const health = result.health;
  if (health && typeof health === 'object') {
    const healthRec = { ...(health as Record<string, unknown>) };
    if (healthRec.intendedStayOver6Months !== 'yes') {
      delete healthRec.hasTbRiskHistory;
    }
    result.health = healthRec;
  }

  return result;
}

export function evaluateQuestionEffects(
  answers: Record<string, unknown>,
  _options?: QuestionEffectOptions
): QuestionEffects {
  const safeAnswers = answers && typeof answers === 'object' ? answers : {};
  const cleaned = cleanNzAewvStaleAnswers(safeAnswers);

  const validationErrors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  const scope = cleaned.scope;
  if (scope && typeof scope === 'object') {
    const scopeRec = scope as Record<string, unknown>;
    if (scopeRec.confirmedAewvPathway === 'need_check') {
      warnings['scope.confirmedAewvPathway'] =
        '你尚未确定是否申请 AEWV。新西兰设有多种不同类型的工作签证（如工作假期、毕业生工签等）；建议在递交前先核对 INZ 官方说明以确认适合你情况的工签路线。';
    }
  }

  const skills = cleaned.skills;
  if (skills && typeof skills === 'object') {
    const skillsRec = skills as Record<string, unknown>;
    if (skillsRec.minimumSkillEvidenceStatus === 'need_check') {
      warnings['skills.minimumSkillEvidenceStatus'] =
        '你尚不确定该职位是否需要额外最低技能证明。请对照 INZ 最新 AEWV 最低技能标准核对所聘岗位对应的学历或工作资历要求。';
    }
    if (skillsRec.registrationStatus === 'need_check') {
      warnings['skills.registrationStatus'] =
        '你尚不确定该职位是否属于新西兰法定执业注册职业。请向雇主或查阅新西兰行业监管机构名单核实是否需要提前办理执业注册。';
    }
  }

  const english = cleaned.english;
  if (english && typeof english === 'object') {
    const englishRec = english as Record<string, unknown>;
    if (englishRec.requirementStatus === 'need_check') {
      warnings['english.requirementStatus'] =
        '你尚不确定是否满足或免除英语要求。请对照 INZ 针对 AEWV 岗位技能等级的最新英语指引自主核实是否需提供英语证明。';
    }
  }

  return {
    answersForChecklist: cleaned,
    validationErrors,
    warnings
  };
}
