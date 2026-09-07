import type { RoutePack } from '../../../domain/route';
import type { ChecklistItem, ChecklistRule, OfficialSource } from '../../../domain/types';
import questionsJson from './questions.zh-CN.json';
import checklistItemsJson from './checklist-items.zh-CN.json';
import rulesJson from './rules.json';
import sourcesJson from './sources.json';
import {
  evaluateQuestionEffects,
  immediateQuestionEffectFields,
  removeHiddenFamilyRouteAnswers
} from './questionEffects';

export const NZ_STUDENT_FEE_PAYING_ROUTE_ID = 'nz-student-fee-paying';

export function cleanNzStaleAnswers(
  answers: Record<string, unknown>
): Record<string, unknown> {
  if (!answers || typeof answers !== 'object') return answers;
  return removeHiddenFamilyRouteAnswers(answers);
}

export const nzStudentFeePayingRoutePack: RoutePack = {
  id: NZ_STUDENT_FEE_PAYING_ROUTE_ID,
  jurisdiction: 'nz',
  title: '新西兰自费学生签证材料准备清单',
  eyebrow: 'Fee Paying Student Visa',
  description: '回答少量关键问题，生成与你情况相关的Fee Paying Student Visa准备任务。你的答案只保存在当前浏览器。',
  authorityName: 'Immigration New Zealand（INZ）',
  disclaimerFooter: '本工具不评估签证资格或申请风险，不预测申请结果，不判断哪些信息应披露或省略，也不会替你生成说明信。请以当前 INZ 官方指引和在线申请要求为准；如需结合个人情况获得移民建议，请咨询新西兰持牌移民顾问或依法可提供相关建议的人士。',
  questions: questionsJson as Record<string, unknown>,
  items: checklistItemsJson as ChecklistItem[],
  rules: rulesJson as ChecklistRule[],
  sources: sourcesJson as OfficialSource[],
  evaluateEffects: evaluateQuestionEffects,
  immediateEffectFields: immediateQuestionEffectFields,
  cleanStaleAnswers: cleanNzStaleAnswers,
  defaultExportFileName: 'nz-student-visa-checklist.json'
};

export {
  evaluateQuestionEffects,
  immediateQuestionEffectFields,
  removeHiddenFamilyRouteAnswers
};
