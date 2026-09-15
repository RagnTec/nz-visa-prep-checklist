import type { RoutePack } from '../../../domain/route';
import type { ChecklistItem, ChecklistRule, OfficialSource } from '../../../domain/types';
import questionsJson from './questions.zh-CN.json';
import checklistItemsJson from './checklist-items.zh-CN.json';
import rulesJson from './rules.json';
import sourcesJson from './sources.json';
import {
  evaluateQuestionEffects,
  immediateQuestionEffectFields,
  cleanCaVisitorStaleAnswers
} from './questionEffects';

export const CA_VISITOR_ROUTE_ID = 'ca-visitor';

export const caVisitorRoutePack: RoutePack = {
  id: CA_VISITOR_ROUTE_ID,
  jurisdiction: 'ca',
  routeCategory: 'visit',
  title: '加拿大访问签证材料准备清单',
  eyebrow: 'Visitor Visa',
  description: '回答关键问题，生成与你情况相关的加拿大访问签证（Visitor Visa）准备任务。当前覆盖个人旅游访问准备。你的答案只保存在当前浏览器。',
  authorityName: 'Immigration, Refugees and Citizenship Canada（IRCC）',
  disclaimerFooter: '本工具不评估签证资格或申请风险，不预测申请结果，不判断哪些信息应披露或省略，也不会替你生成说明信。请以当前 IRCC 官方指引和在线申请要求为准；如需结合个人情况获得移民建议，请咨询依法可提供加拿大移民咨询的专业人士。',
  questions: questionsJson as Record<string, unknown>,
  items: checklistItemsJson as ChecklistItem[],
  rules: rulesJson as ChecklistRule[],
  sources: sourcesJson as OfficialSource[],
  evaluateEffects: evaluateQuestionEffects,
  immediateEffectFields: immediateQuestionEffectFields,
  cleanStaleAnswers: cleanCaVisitorStaleAnswers,
  defaultExportFileName: 'ca-visitor-visa-checklist.json'
};

export {
  evaluateQuestionEffects,
  immediateQuestionEffectFields,
  cleanCaVisitorStaleAnswers
};
