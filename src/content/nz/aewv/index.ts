import type { RoutePack } from '../../../domain/route';
import type { ChecklistItem, ChecklistRule, OfficialSource } from '../../../domain/types';
import questionsJson from './questions.zh-CN.json';
import checklistItemsJson from './checklist-items.zh-CN.json';
import rulesJson from './rules.json';
import sourcesJson from './sources.json';
import {
  evaluateQuestionEffects,
  immediateQuestionEffectFields,
  cleanNzAewvStaleAnswers
} from './questionEffects';

export const NZ_AEWV_ROUTE_ID = 'nz-aewv';

export const nzAewvRoutePack: RoutePack = {
  id: NZ_AEWV_ROUTE_ID,
  jurisdiction: 'nz',
  routeCategory: 'work',
  title: '新西兰认可雇主工作签证材料准备清单',
  eyebrow: 'Accredited Employer Work Visa',
  description:
    '回答少量关键问题，生成与你情况相关的 Accredited Employer Work Visa（AEWV）申请准备任务。请注意：AEWV 申请必须通过雇主在 Job Check 获批后向你提供的专属唯一链接开始在线递交。本工具仅用于申请人个人材料清单准备。',
  authorityName: 'Immigration New Zealand（INZ）',
  disclaimerFooter:
    '本工具不评估雇主认证资质或岗位审核（Job Check）合规性，不计算薪资中位数或逗留时长，不评估签证申请资格或审批概率。请以当前 INZ 官方指引和在线递交要求为准；如需个案移民建议，请咨询新西兰持牌移民顾问或法定专业人士。',
  questions: questionsJson as Record<string, unknown>,
  items: checklistItemsJson as ChecklistItem[],
  rules: rulesJson as ChecklistRule[],
  sources: sourcesJson as OfficialSource[],
  evaluateEffects: evaluateQuestionEffects,
  immediateEffectFields: immediateQuestionEffectFields,
  cleanStaleAnswers: cleanNzAewvStaleAnswers,
  defaultExportFileName: 'nz-aewv-work-visa-checklist.json'
};

export {
  evaluateQuestionEffects,
  immediateQuestionEffectFields,
  cleanNzAewvStaleAnswers
};
