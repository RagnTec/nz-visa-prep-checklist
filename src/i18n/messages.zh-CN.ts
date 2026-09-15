import type { LocaleMessages } from './types';

export const zhCNMessages: LocaleMessages = {
  locale: 'zh-CN',
  checklistStatus: {
    not_started: '未开始',
    in_progress: '准备中',
    prepared: '已准备',
    needs_review: '需要复查',
    not_applicable: '不适用'
  },
  requirementType: {
    usually_required: '通常需要',
    answer_dependent: '根据回答需要',
    recommended_supporting: '建议准备',
    may_be_requested: '可能被要求',
    genuine_intentions_support: '用于支持真实学习意图',
    product_organisation_guidance: '产品整理建议'
  },
  evidenceLayer: {
    inz_visa: 'INZ 官方要求或指引',
    ircc_visa: 'IRCC 官方要求或指引',
    au_home_affairs_visa: '澳大利亚内政事务部（Home Affairs）官方要求或指引',
    us_dos_visa: '美国国务院签证指引',
    us_ice_sevp: '美国 ICE / SEVP 学生与 SEVIS 指引',
    product_guidance: '整理与核对建议'
  },
  reusedFact: {
    safe_reuse: '来自个人资料',
    confirm_reuse_pending: '来自个人资料 · 待确认',
    confirm_reuse_confirmed: '已在本申请确认'
  },
  applicationProgress: {
    checklistComplete: (completeCount, totalCount) => `材料清单 · ${completeCount} / ${totalCount} 已处理`,
    surveyInProgress: '情况问卷进行中',
    surveyStep: (currentStep, totalSteps) => `情况问卷 · ${currentStep} / ${totalSteps}`
  },
  routeCategory: {
    study: '学生签证',
    visit: '旅游/访问签证',
    work: '工作签证'
  },
  routeCategorySection: {
    study: '学习',
    visit: '旅游 / 访问',
    work: '工作'
  },
  routeDisplayName: {
    'nz-student-fee-paying': '自费学生签证',
    'nz-visitor': '访客签证',
    'nz-aewv': '认可雇主工作签证',
    'nz-china-working-holiday': '中国打工度假签证',
    'nz-post-study-work': '毕业后工作签证',
    'ca-study-permit': '学习许可',
    'ca-visitor': '访客签证',
    'ca-employer-specific-work-permit': '雇主特定工作许可',
    'au-visitor': '访客签证（600类）',
    'us-f1-student': 'F-1 学生签证',
    'us-b-visitor': '美国旅游/访问签证'
  },
  jurisdiction: {
    nz: '新西兰',
    ca: '加拿大',
    au: '澳大利亚',
    us: '美国'
  }
};
