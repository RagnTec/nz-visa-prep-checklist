import type { RoutePack } from '../../../domain/route';
import type { ChecklistItem, ChecklistRule, OfficialSource } from '../../../domain/types';
import questionsJson from './questions.zh-CN.json';
import checklistItemsJson from './checklist-items.zh-CN.json';
import rulesJson from './rules.json';
import sourcesJson from './sources.json';
import {
  evaluateQuestionEffects,
  immediateQuestionEffectFields,
  cleanAuVisitorStaleAnswers
} from './questionEffects';

export const AU_VISITOR_ROUTE_ID = 'au-visitor';

export const auVisitorRoutePack: RoutePack = {
  id: AU_VISITOR_ROUTE_ID,
  jurisdiction: 'au',
  routeCategory: 'visit',
  title: '澳大利亚访问签证材料准备清单',
  eyebrow: 'Visitor visa (subclass 600)',
  description: '回答关键问题，生成与你情况相关的澳大利亚访问签证（subclass 600 Tourist stream 境外递交）准备任务。当前覆盖个人旅游度假访问准备。你的答案只保存在当前浏览器。',
  authorityName: 'Department of Home Affairs（澳大利亚内政事务部）',
  disclaimerFooter: '本工具不评估签证资格或申请风险，不预测申请结果，不判断哪些信息应披露或省略，也不会替你生成说明信。请以当前澳大利亚内政事务部官方指引和 ImmiAccount 在线申请要求为准；如需结合个人情况获得移民建议，请咨询依法可提供澳大利亚移民咨询的持牌专业人士。',
  questions: questionsJson as Record<string, unknown>,
  items: checklistItemsJson as ChecklistItem[],
  rules: rulesJson as ChecklistRule[],
  sources: sourcesJson as OfficialSource[],
  evaluateEffects: evaluateQuestionEffects,
  immediateEffectFields: immediateQuestionEffectFields,
  cleanStaleAnswers: cleanAuVisitorStaleAnswers,
  defaultExportFileName: 'au-visitor-visa-checklist.json'
};

export {
  evaluateQuestionEffects,
  immediateQuestionEffectFields,
  cleanAuVisitorStaleAnswers
};
