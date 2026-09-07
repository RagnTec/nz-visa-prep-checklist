import type { RoutePack } from '../../../domain/route';
import type { ChecklistItem, ChecklistRule, OfficialSource } from '../../../domain/types';
import questionsJson from './questions.zh-CN.json';
import checklistItemsJson from './checklist-items.zh-CN.json';
import rulesJson from './rules.json';
import sourcesJson from './sources.json';
import {
  evaluateQuestionEffects,
  immediateQuestionEffectFields,
  cleanCaStaleAnswers
} from './questionEffects';

export const CA_STUDY_PERMIT_ROUTE_ID = 'ca-study-permit';

export const caStudyPermitRoutePack: RoutePack = {
  id: CA_STUDY_PERMIT_ROUTE_ID,
  jurisdiction: 'ca',
  title: '加拿大学习许可（Study Permit）材料准备清单',
  eyebrow: 'Study Permit',
  description: '回答少量关键问题，生成与你情况相关的Study Permit准备任务。你的答案只保存在当前浏览器。',
  authorityName: 'Immigration, Refugees and Citizenship Canada（IRCC）',
  disclaimerFooter: '本工具不评估签证资格或申请风险，不预测申请结果，不判断哪些信息应披露或省略，也不会替你生成说明信。请以当前 IRCC 官方指引和在线申请要求为准；如需结合个人情况获得移民建议，请咨询加拿大持牌移民顾问（RCIC）或依法可提供相关建议的人士。',
  questions: questionsJson as Record<string, unknown>,
  items: checklistItemsJson as ChecklistItem[],
  rules: rulesJson as ChecklistRule[],
  sources: sourcesJson as OfficialSource[],
  evaluateEffects: evaluateQuestionEffects,
  immediateEffectFields: immediateQuestionEffectFields,
  cleanStaleAnswers: cleanCaStaleAnswers,
  defaultExportFileName: 'ca-study-permit-checklist.json'
};

export {
  evaluateQuestionEffects,
  immediateQuestionEffectFields,
  cleanCaStaleAnswers
};

export {
  resolveFundingSchedule,
  HISTORICAL_SCHEDULE_2024,
  LATEST_PUBLISHED_SCHEDULE_2025,
  FUNDING_RECHECK_ON_OR_AFTER
} from './fundingSchedule';
