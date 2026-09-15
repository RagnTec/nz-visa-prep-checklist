import type { RoutePack } from '../../../domain/route';
import type { ChecklistItem, ChecklistRule, OfficialSource } from '../../../domain/types';
import questionsJson from './questions.zh-CN.json';
import checklistItemsJson from './checklist-items.zh-CN.json';
import rulesJson from './rules.json';
import sourcesJson from './sources.json';
import {
  evaluateQuestionEffects,
  immediateQuestionEffectFields,
  cleanUsF1StaleAnswers
} from './questionEffects';

export const US_F1_STUDENT_ROUTE_ID = 'us-f1-student';

export const usF1StudentRoutePack: RoutePack = {
  id: US_F1_STUDENT_ROUTE_ID,
  jurisdiction: 'us',
  routeCategory: 'study',
  title: '美国 F-1 学生签证材料准备清单',
  eyebrow: 'F-1 Student Visa',
  description:
    '回答关键问题，生成与你情况相关的美国 F-1 学生签证材料准备任务。当前适用于在美国境外准备首次申请 F-1 学生签证，赴美参加符合 F-1 类别的学术或语言学习项目的成年申请人。你的答案只保存在当前浏览器。',
  authorityName: 'U.S. Department of State / U.S. ICE SEVP',
  disclaimerFooter:
    '本工具不评估签证资格或拒签风险，不预测签证结果，不提供法律建议，亦不代表美国国务院或任何使领馆。请以美国国务院（travel.state.gov）及美国国土安全部官方要求为准。',
  questions: questionsJson as Record<string, unknown>,
  items: checklistItemsJson as ChecklistItem[],
  rules: rulesJson as ChecklistRule[],
  sources: sourcesJson as OfficialSource[],
  evaluateEffects: evaluateQuestionEffects,
  immediateEffectFields: immediateQuestionEffectFields,
  cleanStaleAnswers: cleanUsF1StaleAnswers,
  defaultExportFileName: 'us-f1-student-visa-checklist.json'
};

export {
  evaluateQuestionEffects,
  immediateQuestionEffectFields,
  cleanUsF1StaleAnswers
};
