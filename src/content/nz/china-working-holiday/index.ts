import type { RoutePack } from '../../../domain/route';
import type { ChecklistItem, ChecklistRule, OfficialSource } from '../../../domain/types';
import questionsJson from './questions.zh-CN.json';
import checklistItemsJson from './checklist-items.zh-CN.json';
import rulesJson from './rules.json';
import sourcesJson from './sources.json';
import {
  evaluateQuestionEffects,
  immediateQuestionEffectFields,
  cleanNzChinaWorkingHolidayStaleAnswers
} from './questionEffects';

export const NZ_CHINA_WORKING_HOLIDAY_ROUTE_ID = 'nz-china-working-holiday';

export const nzChinaWorkingHolidayRoutePack: RoutePack = {
  id: NZ_CHINA_WORKING_HOLIDAY_ROUTE_ID,
  jurisdiction: 'nz',
  routeCategory: 'work',
  title: '新西兰中国打工度假签证材料准备清单',
  eyebrow: 'China Working Holiday Visa',
  description:
    '回答少量关键问题，生成与你情况相关的 China Working Holiday Visa 申请准备任务。本路线适用于持中国护照、常住中国大陆且在境内递交的青年申请人。持有该签证可在新西兰度假并从事临时工作（为单一雇主工作最长可达 6 个月）。本工具仅用于申请人个人材料清单准备。',
  authorityName: 'Immigration New Zealand（INZ）',
  disclaimerFooter:
    '本工具不保证配额获取或审理结果，不提供移民法律或个案申请建议。申请人须自行在 INZ 官方开放时间内获取名额并完成在线递交。请以当前新西兰移民局（INZ）官方说明为准；如需个案移民建议，请咨询新西兰持牌移民顾问或法定专业人士。',
  questions: questionsJson as Record<string, unknown>,
  items: checklistItemsJson as ChecklistItem[],
  rules: rulesJson as ChecklistRule[],
  sources: sourcesJson as OfficialSource[],
  evaluateEffects: evaluateQuestionEffects,
  immediateEffectFields: immediateQuestionEffectFields,
  cleanStaleAnswers: cleanNzChinaWorkingHolidayStaleAnswers,
  defaultExportFileName: 'nz-china-working-holiday-checklist.json'
};

export {
  evaluateQuestionEffects,
  immediateQuestionEffectFields,
  cleanNzChinaWorkingHolidayStaleAnswers
};
