import type { RoutePack } from '../../../domain/route';
import type { ChecklistItem, ChecklistRule, OfficialSource } from '../../../domain/types';
import questionsJson from './questions.zh-CN.json';
import checklistItemsJson from './checklist-items.zh-CN.json';
import rulesJson from './rules.json';
import sourcesJson from './sources.json';
import {
  evaluateQuestionEffects,
  immediateQuestionEffectFields,
  cleanUsBVisitorStaleAnswers
} from './questionEffects';

export const US_B_VISITOR_ROUTE_ID = 'us-b-visitor';

export const usBVisitorRoutePack: RoutePack = {
  id: US_B_VISITOR_ROUTE_ID,
  jurisdiction: 'us',
  routeCategory: 'visit',
  title: '美国旅游/访问签证材料准备清单',
  eyebrow: 'Visitor Visa (B-2 / B1/B2)',
  description:
    '回答关键问题，生成与你情况相关的美国旅游/访问签证（B-2 / B1/B2，用于旅游/访问目的）材料准备任务。适用于在美国境外准备美国旅游/访问签证，用于旅游、度假、探亲访友或就医等临时访问目的的成年申请人。你的答案只保存在当前浏览器。',
  authorityName: 'U.S. Department of State',
  disclaimerFooter:
    '本工具不评估签证资格或拒签风险，不预测签证结果，不提供法律建议，亦不代表美国国务院或任何使领馆。请以美国国务院（travel.state.gov）及相关使领馆官方要求为准。',
  questions: questionsJson as Record<string, unknown>,
  items: checklistItemsJson as ChecklistItem[],
  rules: rulesJson as ChecklistRule[],
  sources: sourcesJson as OfficialSource[],
  evaluateEffects: evaluateQuestionEffects,
  immediateEffectFields: immediateQuestionEffectFields,
  cleanStaleAnswers: cleanUsBVisitorStaleAnswers,
  defaultExportFileName: 'us-b-visitor-visa-checklist.json'
};

export {
  evaluateQuestionEffects,
  immediateQuestionEffectFields,
  cleanUsBVisitorStaleAnswers
};
