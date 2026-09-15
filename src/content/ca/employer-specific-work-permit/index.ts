import type { RoutePack } from '../../../domain/route';
import type { ChecklistItem, ChecklistRule, OfficialSource } from '../../../domain/types';
import questionsJson from './questions.zh-CN.json';
import checklistItemsJson from './checklist-items.zh-CN.json';
import rulesJson from './rules.json';
import sourcesJson from './sources.json';
import {
  evaluateQuestionEffects,
  immediateQuestionEffectFields,
  cleanCaEswpStaleAnswers
} from './questionEffects';

export const CA_EMPLOYER_SPECIFIC_WORK_PERMIT_ROUTE_ID = 'ca-employer-specific-work-permit';

export const caEmployerSpecificWorkPermitRoutePack: RoutePack = {
  id: CA_EMPLOYER_SPECIFIC_WORK_PERMIT_ROUTE_ID,
  jurisdiction: 'ca',
  routeCategory: 'work',
  title: '加拿大雇主特定工签材料准备清单（境外申请）',
  eyebrow: 'Employer-specific work permit',
  description:
    '回答少量关键问题，生成与你情况相关的加拿大雇主特定工签（境外申请）材料准备清单。本清单面向已获得加拿大雇主录用且在魁北克省以外工作的常规申请人。',
  authorityName: 'Immigration, Refugees and Citizenship Canada（IRCC）',
  disclaimerFooter:
    '本工具不评估雇主合规性或劳工市场影响评估（LMIA）审批结果，不评估工作签证获批概率，不提供法律或移民建议。请以 IRCC 官方最新指引及正式网申要求为准；如需个案专业指导，请咨询加拿大持牌移民顾问（RCIC）或执业律师。',
  questions: questionsJson as Record<string, unknown>,
  items: checklistItemsJson as ChecklistItem[],
  rules: rulesJson as ChecklistRule[],
  sources: sourcesJson as OfficialSource[],
  evaluateEffects: evaluateQuestionEffects,
  immediateEffectFields: immediateQuestionEffectFields,
  cleanStaleAnswers: cleanCaEswpStaleAnswers,
  defaultExportFileName: 'ca-employer-specific-work-permit-checklist.json'
};

export {
  evaluateQuestionEffects,
  immediateQuestionEffectFields,
  cleanCaEswpStaleAnswers
};
