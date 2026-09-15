import type { RoutePack } from '../../../domain/route';
import type { ChecklistItem, ChecklistRule, OfficialSource } from '../../../domain/types';
import questionsJson from './questions.zh-CN.json';
import checklistItemsJson from './checklist-items.zh-CN.json';
import rulesJson from './rules.json';
import sourcesJson from './sources.json';
import {
  evaluateQuestionEffects,
  immediateQuestionEffectFields,
  cleanNzPostStudyWorkStaleAnswers
} from './questionEffects';

export const NZ_POST_STUDY_WORK_ROUTE_ID = 'nz-post-study-work';

export const nzPostStudyWorkRoutePack: RoutePack = {
  id: NZ_POST_STUDY_WORK_ROUTE_ID,
  jurisdiction: 'nz',
  routeCategory: 'work',
  title: '新西兰毕业后工作签证材料准备清单',
  eyebrow: 'Post-Study Work Visa',
  description:
    '回答少量关键问题，生成与你情况相关的 Post-Study Work Visa（PSWV）申请准备任务。本路线适用于近期在新西兰完成符合要求的受认可课程的毕业生。持有该签证可在新西兰工作最长达 3 年（工作权限依所修文凭等级而定）。本工具仅用于申请人个人材料清单准备。',
  authorityName: 'Immigration New Zealand（INZ）',
  disclaimerFooter:
    '本工具不评估课程或学历适格性，不计算在新西兰就读周数或申请时限，不保证签证获批或审批结果。请以当前新西兰移民局（INZ）官方指引与在线申请系统要求为准；如需个案移民建议，请咨询新西兰持牌移民顾问或法定专业人士。',
  questions: questionsJson as Record<string, unknown>,
  items: checklistItemsJson as ChecklistItem[],
  rules: rulesJson as ChecklistRule[],
  sources: sourcesJson as OfficialSource[],
  evaluateEffects: evaluateQuestionEffects,
  immediateEffectFields: immediateQuestionEffectFields,
  cleanStaleAnswers: cleanNzPostStudyWorkStaleAnswers,
  defaultExportFileName: 'nz-post-study-work-checklist.json'
};

export {
  evaluateQuestionEffects,
  immediateQuestionEffectFields,
  cleanNzPostStudyWorkStaleAnswers
};
