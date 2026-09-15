import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ROUTE_ID,
  getRoutePack,
  isRegisteredRouteId,
  nzStudentFeePayingRoutePack,
  nzVisitorRoutePack,
  caStudyPermitRoutePack,
  CA_STUDY_PERMIT_ROUTE_ID,
  NZ_STUDENT_FEE_PAYING_ROUTE_ID,
  NZ_VISITOR_ROUTE_ID,
  AU_VISITOR_ROUTE_ID,
  auVisitorRoutePack,
  CA_VISITOR_ROUTE_ID,
  caVisitorRoutePack,
  NZ_AEWV_ROUTE_ID,
  nzAewvRoutePack,
  NZ_CHINA_WORKING_HOLIDAY_ROUTE_ID,
  nzChinaWorkingHolidayRoutePack,
  NZ_POST_STUDY_WORK_ROUTE_ID,
  nzPostStudyWorkRoutePack,
  CA_EMPLOYER_SPECIFIC_WORK_PERMIT_ROUTE_ID,
  caEmployerSpecificWorkPermitRoutePack,
  US_F1_STUDENT_ROUTE_ID,
  usF1StudentRoutePack,
  US_B_VISITOR_ROUTE_ID,
  usBVisitorRoutePack,
  SUPPORTED_ROUTE_OPTIONS
} from '../src/content/registry';
import {
  formatRoutePrimaryLabel,
  formatRouteDisplayName,
  routeCategoryLabels,
  jurisdictionLabels
} from '../src/i18n';
import type { RouteCategory } from '../src/domain/route';
import nzQuestionsJson from '../src/content/nz/student-fee-paying/questions.zh-CN.json';
import nzChecklistItemsJson from '../src/content/nz/student-fee-paying/checklist-items.zh-CN.json';
import nzRulesJson from '../src/content/nz/student-fee-paying/rules.json';
import nzSourcesJson from '../src/content/nz/student-fee-paying/sources.json';
import caQuestionsJson from '../src/content/ca/study-permit/questions.zh-CN.json';
import caChecklistItemsJson from '../src/content/ca/study-permit/checklist-items.zh-CN.json';
import caRulesJson from '../src/content/ca/study-permit/rules.json';
import caSourcesJson from '../src/content/ca/study-permit/sources.json';
import {
  evaluateQuestionEffects as directEvaluateEffects,
  removeHiddenFamilyRouteAnswers as directRemoveHidden
} from '../src/content/nz/student-fee-paying/questionEffects';
import { cleanNzStaleAnswers } from '../src/content/nz/student-fee-paying';
import { generateChecklist } from '../src/domain/checklist';
import type { ChecklistItem, ChecklistRule } from '../src/domain/types';

describe('RoutePack and Registry Architecture', () => {
  it('returns the NZ RoutePack by default and for exact registered ID', () => {
    expect(DEFAULT_ROUTE_ID).toBe('nz-student-fee-paying');
    expect(NZ_STUDENT_FEE_PAYING_ROUTE_ID).toBe('nz-student-fee-paying');
    expect(isRegisteredRouteId('nz-student-fee-paying')).toBe(true);

    const defaultPack = getRoutePack();
    const explicitPack = getRoutePack('nz-student-fee-paying');

    expect(defaultPack).toBe(nzStudentFeePayingRoutePack);
    expect(explicitPack).toBe(nzStudentFeePayingRoutePack);
    expect(defaultPack.id).toBe('nz-student-fee-paying');
    expect(defaultPack.jurisdiction).toBe('nz');
  });

  it('resolves the NZ Visitor RoutePack for exact registered ID', () => {
    expect(NZ_VISITOR_ROUTE_ID).toBe('nz-visitor');
    expect(isRegisteredRouteId('nz-visitor')).toBe(true);

    const explicitPack = getRoutePack('nz-visitor');
    expect(explicitPack).toBe(nzVisitorRoutePack);
    expect(explicitPack.id).toBe('nz-visitor');
    expect(explicitPack.jurisdiction).toBe('nz');
    expect(explicitPack.title).toBe('新西兰访问签证材料准备清单');
  });

  it('resolves the Canada Study Permit RoutePack for exact registered ID', () => {
    expect(CA_STUDY_PERMIT_ROUTE_ID).toBe('ca-study-permit');
    expect(isRegisteredRouteId('ca-study-permit')).toBe(true);

    const explicitPack = getRoutePack('ca-study-permit');
    expect(explicitPack).toBe(caStudyPermitRoutePack);
    expect(explicitPack.id).toBe('ca-study-permit');
    expect(explicitPack.jurisdiction).toBe('ca');
    expect(explicitPack.title).toBe('加拿大学习许可（Study Permit）材料准备清单');
  });

  it('resolves the Australia Visitor RoutePack for exact registered ID', () => {
    expect(AU_VISITOR_ROUTE_ID).toBe('au-visitor');
    expect(isRegisteredRouteId('au-visitor')).toBe(true);

    const explicitPack = getRoutePack('au-visitor');
    expect(explicitPack).toBe(auVisitorRoutePack);
    expect(explicitPack.id).toBe('au-visitor');
    expect(explicitPack.jurisdiction).toBe('au');
    expect(explicitPack.title).toBe('澳大利亚访问签证材料准备清单');
  });

  it('resolves the NZ AEWV RoutePack for exact registered ID', () => {
    expect(NZ_AEWV_ROUTE_ID).toBe('nz-aewv');
    expect(isRegisteredRouteId('nz-aewv')).toBe(true);

    const explicitPack = getRoutePack('nz-aewv');
    expect(explicitPack).toBe(nzAewvRoutePack);
    expect(explicitPack.id).toBe('nz-aewv');
    expect(explicitPack.jurisdiction).toBe('nz');
    expect(explicitPack.title).toBe('新西兰认可雇主工作签证材料准备清单');
  });

  it('resolves the Canada Employer-Specific Work Permit RoutePack for exact registered ID', () => {
    expect(CA_EMPLOYER_SPECIFIC_WORK_PERMIT_ROUTE_ID).toBe('ca-employer-specific-work-permit');
    expect(isRegisteredRouteId('ca-employer-specific-work-permit')).toBe(true);

    const explicitPack = getRoutePack('ca-employer-specific-work-permit');
    expect(explicitPack).toBe(caEmployerSpecificWorkPermitRoutePack);
    expect(explicitPack.id).toBe('ca-employer-specific-work-permit');
    expect(explicitPack.jurisdiction).toBe('ca');
    expect(explicitPack.title).toBe('加拿大雇主特定工签材料准备清单（境外申请）');
  });

  it('resolves the NZ China Working Holiday RoutePack for exact registered ID', () => {
    expect(NZ_CHINA_WORKING_HOLIDAY_ROUTE_ID).toBe('nz-china-working-holiday');
    expect(isRegisteredRouteId('nz-china-working-holiday')).toBe(true);

    const explicitPack = getRoutePack('nz-china-working-holiday');
    expect(explicitPack).toBe(nzChinaWorkingHolidayRoutePack);
    expect(explicitPack.id).toBe('nz-china-working-holiday');
    expect(explicitPack.jurisdiction).toBe('nz');
    expect(explicitPack.title).toBe('新西兰中国打工度假签证材料准备清单');
  });

  it('resolves the NZ Post-Study Work RoutePack for exact registered ID', () => {
    expect(NZ_POST_STUDY_WORK_ROUTE_ID).toBe('nz-post-study-work');
    expect(isRegisteredRouteId('nz-post-study-work')).toBe(true);

    const explicitPack = getRoutePack('nz-post-study-work');
    expect(explicitPack).toBe(nzPostStudyWorkRoutePack);
    expect(explicitPack.id).toBe('nz-post-study-work');
    expect(explicitPack.jurisdiction).toBe('nz');
    expect(explicitPack.title).toBe('新西兰毕业后工作签证材料准备清单');
  });

  it('resolves the US F-1 Student RoutePack for exact registered ID', () => {
    expect(US_F1_STUDENT_ROUTE_ID).toBe('us-f1-student');
    expect(isRegisteredRouteId('us-f1-student')).toBe(true);

    const explicitPack = getRoutePack('us-f1-student');
    expect(explicitPack).toBe(usF1StudentRoutePack);
    expect(explicitPack.id).toBe('us-f1-student');
    expect(explicitPack.jurisdiction).toBe('us');
    expect(explicitPack.title).toBe('美国 F-1 学生签证材料准备清单');
  });

  it('exposes all supported route options in the expected order', () => {
    expect(SUPPORTED_ROUTE_OPTIONS).toHaveLength(11);
    expect(SUPPORTED_ROUTE_OPTIONS.map((o) => o.routeId)).toEqual([
      'nz-student-fee-paying',
      'nz-visitor',
      'ca-study-permit',
      'ca-visitor',
      'au-visitor',
      'nz-aewv',
      'nz-china-working-holiday',
      'nz-post-study-work',
      'ca-employer-specific-work-permit',
      'us-f1-student',
      'us-b-visitor'
    ]);
    expect(SUPPORTED_ROUTE_OPTIONS[0].label).toBe('新西兰 · 学生签证');
    expect(SUPPORTED_ROUTE_OPTIONS[0].eyebrow).toBe('Fee Paying Student Visa');
    expect(SUPPORTED_ROUTE_OPTIONS[1].label).toBe('新西兰 · 旅游/访问签证');
    expect(SUPPORTED_ROUTE_OPTIONS[1].eyebrow).toBe('Visitor Visa');
    expect(SUPPORTED_ROUTE_OPTIONS[2].label).toBe('加拿大 · 学生签证');
    expect(SUPPORTED_ROUTE_OPTIONS[2].eyebrow).toBe('Study Permit');
    expect(SUPPORTED_ROUTE_OPTIONS[3].label).toBe('加拿大 · 旅游/访问签证');
    expect(SUPPORTED_ROUTE_OPTIONS[3].eyebrow).toBe('Visitor Visa');
    expect(SUPPORTED_ROUTE_OPTIONS[4].label).toBe('澳大利亚 · 旅游/访问签证');
    expect(SUPPORTED_ROUTE_OPTIONS[4].eyebrow).toBe('Visitor visa (subclass 600)');
    expect(SUPPORTED_ROUTE_OPTIONS[5].label).toBe('新西兰 · 工作签证');
    expect(SUPPORTED_ROUTE_OPTIONS[5].eyebrow).toBe('Accredited Employer Work Visa');
    expect(SUPPORTED_ROUTE_OPTIONS[6].label).toBe('新西兰 · 工作签证');
    expect(SUPPORTED_ROUTE_OPTIONS[6].eyebrow).toBe('China Working Holiday Visa');
    expect(SUPPORTED_ROUTE_OPTIONS[7].label).toBe('新西兰 · 工作签证');
    expect(SUPPORTED_ROUTE_OPTIONS[7].eyebrow).toBe('Post-Study Work Visa');
    expect(SUPPORTED_ROUTE_OPTIONS[8].label).toBe('加拿大 · 工作签证');
    expect(SUPPORTED_ROUTE_OPTIONS[8].eyebrow).toBe('Employer-specific work permit');
    expect(SUPPORTED_ROUTE_OPTIONS[9].label).toBe('美国 · 学生签证');
    expect(SUPPORTED_ROUTE_OPTIONS[9].eyebrow).toBe('F-1 Student Visa');
    expect(SUPPORTED_ROUTE_OPTIONS[10].label).toBe('美国 · 旅游/访问签证');
    expect(SUPPORTED_ROUTE_OPTIONS[10].eyebrow).toBe('Visitor Visa (B-2 / B1/B2)');
  });

  it('fails safely with clear error on unknown route ID', () => {
    expect(isRegisteredRouteId('unknown_random')).toBe(false);
    expect(isRegisteredRouteId('unregistered-visa-xyz')).toBe(false);
    expect(() => getRoutePack('unknown_random')).toThrowError(/Unknown route ID: "unknown_random"/);
    expect(() => getRoutePack('unregistered-visa-xyz')).toThrowError(/Unknown route ID: "unregistered-visa-xyz"/);
  });

  it('verifies that caStudyPermitRoutePack contains all required route-scoped assets and functions', () => {
    const pack = caStudyPermitRoutePack;

    expect(pack.id).toBe('ca-study-permit');
    expect(pack.jurisdiction).toBe('ca');
    expect(pack.title).toBe('加拿大学习许可（Study Permit）材料准备清单');
    expect(pack.defaultExportFileName).toBe('ca-study-permit-checklist.json');

    expect(pack.questions).toEqual(caQuestionsJson);
    expect(pack.items).toEqual(caChecklistItemsJson);
    expect(pack.rules).toEqual(caRulesJson);
    expect(pack.sources).toEqual(caSourcesJson);

    expect(typeof pack.evaluateEffects).toBe('function');
    expect(typeof pack.cleanStaleAnswers).toBe('function');
    expect(pack.immediateEffectFields).toBeDefined();
    expect(pack.immediateEffectFields?.length).toBeGreaterThan(0);
  });

  it('verifies that nzStudentFeePayingRoutePack contains all required assets and functions', () => {
    const pack = nzStudentFeePayingRoutePack;

    expect(pack.id).toBe('nz-student-fee-paying');
    expect(pack.jurisdiction).toBe('nz');
    expect(pack.title).toBe('新西兰自费学生签证材料准备清单');
    expect(pack.defaultExportFileName).toBe('nz-student-visa-checklist.json');

    expect(pack.questions).toEqual(nzQuestionsJson);
    expect(pack.items).toEqual(nzChecklistItemsJson);
    expect(pack.rules).toEqual(nzRulesJson);
    expect(pack.sources).toEqual(nzSourcesJson);

    expect(typeof pack.evaluateEffects).toBe('function');
    expect(typeof pack.cleanStaleAnswers).toBe('function');
    expect(pack.immediateEffectFields).toBeDefined();
    expect(pack.immediateEffectFields?.length).toBeGreaterThan(0);
  });

  it('operates cleanStaleAnswers on the full answers object, cleaning family while preserving other sections immutably', () => {
    const sampleFullAnswers: Record<string, unknown> = {
      study: {
        courseStart: '2026-10-01',
        courseEnd: '2027-10-01',
        courseStatus: 'not_started'
      },
      travel: {
        locationContext: 'offshore',
        intendedArrivalDate: '2026-09-20'
      },
      funding: {
        arrangementType: 'self_funded'
      },
      family: {
        linkedApplicationContext: 'partner_and_child',
        partnerVisaRoute: 'undecided',
        childStudyPlan: 'more_than_3_months',
        childApplicationArrangement: 'included_with_partner_student_visitor',
        childSupportBasis: 'work_visa_parent',
        childVisaRoute: 'child_worker_visitor'
      }
    };

    const snapshotBefore = JSON.parse(JSON.stringify(sampleFullAnswers));
    const pack = getRoutePack('nz-student-fee-paying');

    expect(pack.cleanStaleAnswers).toBeDefined();
    const cleaned = pack.cleanStaleAnswers!(sampleFullAnswers);

    // Input object is not mutated
    expect(sampleFullAnswers).toEqual(snapshotBefore);

    // Unrelated top-level sections remain identical
    expect(cleaned.study).toEqual(sampleFullAnswers.study);
    expect(cleaned.travel).toEqual(sampleFullAnswers.travel);
    expect(cleaned.funding).toEqual(sampleFullAnswers.funding);

    // Family section is cleaned by removeHiddenFamilyRouteAnswers
    const expectedCleaned = directRemoveHidden(sampleFullAnswers);
    expect(cleaned).toEqual(expectedCleaned);
    expect(cleaned.family).toEqual((expectedCleaned as Record<string, unknown>).family);
    expect(cleaned.family).toEqual({
      linkedApplicationContext: 'partner_and_child',
      partnerVisaRoute: 'undecided',
      childStudyPlan: 'more_than_3_months'
    });
    expect(cleaned).toEqual(cleanNzStaleAnswers(sampleFullAnswers));
  });

  it('produces identical evaluateEffects output and checklist generation via RoutePack as direct module', () => {
    const sampleAnswers: Record<string, unknown> = {
      study: {
        courseStart: '2026-10-01',
        courseEnd: '2027-10-01',
        courseStatus: 'not_started'
      },
      travel: {
        locationContext: 'offshore',
        intendedArrivalDate: '2026-09-20'
      },
      funding: {
        arrangementType: 'self_funded'
      },
      family: {
        linkedApplicationContext: 'partner_and_child',
        partnerVisaRoute: 'partner_student_work',
        childStudyPlan: 'more_than_3_months',
        childSupportBasis: 'work_visa_parent',
        childVisaRoute: 'child_worker_visitor'
      }
    };

    const pack = getRoutePack('nz-student-fee-paying');

    const directEffects = directEvaluateEffects(sampleAnswers);
    const packEffects = pack.evaluateEffects(sampleAnswers);
    expect(packEffects).toEqual(directEffects);

    const directChecklist = generateChecklist(
      directEffects.answersForChecklist,
      nzChecklistItemsJson as ChecklistItem[],
      nzRulesJson as ChecklistRule[]
    );
    const packChecklist = generateChecklist(
      packEffects.answersForChecklist,
      pack.items as ChecklistItem[],
      pack.rules as ChecklistRule[]
    );
    expect(packChecklist).toEqual(directChecklist);
  });

  describe('RouteCategory and Plain-Language Display Presentation (RTD-01)', () => {
    const allRegisteredPacks = [
      nzStudentFeePayingRoutePack,
      nzVisitorRoutePack,
      caStudyPermitRoutePack,
      caVisitorRoutePack,
      auVisitorRoutePack,
      nzAewvRoutePack,
      nzChinaWorkingHolidayRoutePack,
      nzPostStudyWorkRoutePack,
      caEmployerSpecificWorkPermitRoutePack,
      usF1StudentRoutePack
    ];

    it('ensures every registered RoutePack has a valid routeCategory of study, visit, or work', () => {
      const allowedCategories: readonly RouteCategory[] = ['study', 'visit', 'work'];
      for (const pack of allRegisteredPacks) {
        expect(pack.routeCategory).toBeDefined();
        expect(allowedCategories).toContain(pack.routeCategory);
      }
    });

    it('resolves localized category and jurisdiction labels correctly', () => {
      expect(routeCategoryLabels.study).toBe('学生签证');
      expect(routeCategoryLabels.visit).toBe('旅游/访问签证');
      expect(routeCategoryLabels.work).toBe('工作签证');
      expect(jurisdictionLabels.nz).toBe('新西兰');
      expect(jurisdictionLabels.ca).toBe('加拿大');
      expect(jurisdictionLabels.au).toBe('澳大利亚');
      expect(jurisdictionLabels.us).toBe('美国');
    });

    it('formats all ten current routes into expected primary display labels', () => {
      expect(formatRoutePrimaryLabel('nz', 'study')).toBe('新西兰 · 学生签证');
      expect(formatRoutePrimaryLabel('nz', 'visit')).toBe('新西兰 · 旅游/访问签证');
      expect(formatRoutePrimaryLabel('nz', 'work')).toBe('新西兰 · 工作签证');
      expect(formatRoutePrimaryLabel('ca', 'study')).toBe('加拿大 · 学生签证');
      expect(formatRoutePrimaryLabel('ca', 'visit')).toBe('加拿大 · 旅游/访问签证');
      expect(formatRoutePrimaryLabel('ca', 'work')).toBe('加拿大 · 工作签证');
      expect(formatRoutePrimaryLabel('au', 'visit')).toBe('澳大利亚 · 旅游/访问签证');
      expect(formatRoutePrimaryLabel('us', 'study')).toBe('美国 · 学生签证');
    });

    it('verifies NZ AEWV displays primary "新西兰 · 工作签证" while retaining "Accredited Employer Work Visa" as secondary official identity', () => {
      const option = SUPPORTED_ROUTE_OPTIONS.find((o) => o.routeId === NZ_AEWV_ROUTE_ID);
      expect(option).toBeDefined();
      expect(option?.label).toBe('新西兰 · 工作签证');
      expect(option?.eyebrow).toBe('Accredited Employer Work Visa');
      expect(nzAewvRoutePack.eyebrow).toBe('Accredited Employer Work Visa');
    });

    it('verifies NZ China Working Holiday displays primary "新西兰 · 工作签证" while retaining "China Working Holiday Visa" as secondary official identity', () => {
      const option = SUPPORTED_ROUTE_OPTIONS.find((o) => o.routeId === NZ_CHINA_WORKING_HOLIDAY_ROUTE_ID);
      expect(option).toBeDefined();
      expect(option?.label).toBe('新西兰 · 工作签证');
      expect(option?.eyebrow).toBe('China Working Holiday Visa');
      expect(nzChinaWorkingHolidayRoutePack.eyebrow).toBe('China Working Holiday Visa');
    });

    it('verifies NZ Post-Study Work displays primary "新西兰 · 工作签证" while retaining "Post-Study Work Visa" as secondary official identity', () => {
      const option = SUPPORTED_ROUTE_OPTIONS.find((o) => o.routeId === NZ_POST_STUDY_WORK_ROUTE_ID);
      expect(option).toBeDefined();
      expect(option?.label).toBe('新西兰 · 工作签证');
      expect(option?.eyebrow).toBe('Post-Study Work Visa');
      expect(nzPostStudyWorkRoutePack.eyebrow).toBe('Post-Study Work Visa');
    });

    it('verifies Canada Employer-Specific Work Permit displays primary "加拿大 · 工作签证" while retaining "Employer-specific work permit" as secondary official identity', () => {
      const option = SUPPORTED_ROUTE_OPTIONS.find((o) => o.routeId === CA_EMPLOYER_SPECIFIC_WORK_PERMIT_ROUTE_ID);
      expect(option).toBeDefined();
      expect(option?.label).toBe('加拿大 · 工作签证');
      expect(option?.eyebrow).toBe('Employer-specific work permit');
      expect(caEmployerSpecificWorkPermitRoutePack.eyebrow).toBe('Employer-specific work permit');
    });

    it('verifies Canada Study Permit displays primary "加拿大 · 学生签证" while retaining "Study Permit" as secondary official identity', () => {
      const option = SUPPORTED_ROUTE_OPTIONS.find((o) => o.routeId === CA_STUDY_PERMIT_ROUTE_ID);
      expect(option).toBeDefined();
      expect(option?.label).toBe('加拿大 · 学生签证');
      expect(option?.eyebrow).toBe('Study Permit');
      expect(caStudyPermitRoutePack.eyebrow).toBe('Study Permit');
    });

    it('verifies NZ Fee Paying Student displays primary "新西兰 · 学生签证" while retaining "Fee Paying Student Visa" as secondary official identity', () => {
      const option = SUPPORTED_ROUTE_OPTIONS.find((o) => o.routeId === NZ_STUDENT_FEE_PAYING_ROUTE_ID);
      expect(option).toBeDefined();
      expect(option?.label).toBe('新西兰 · 学生签证');
      expect(option?.eyebrow).toBe('Fee Paying Student Visa');
      expect(nzStudentFeePayingRoutePack.eyebrow).toBe('Fee Paying Student Visa');
    });

    it('verifies US F-1 Student displays primary "美国 · 学生签证" while retaining "F-1 Student Visa" as secondary official identity', () => {
      const option = SUPPORTED_ROUTE_OPTIONS.find((o) => o.routeId === US_F1_STUDENT_ROUTE_ID);
      expect(option).toBeDefined();
      expect(option?.label).toBe('美国 · 学生签证');
      expect(option?.eyebrow).toBe('F-1 Student Visa');
      expect(usF1StudentRoutePack.eyebrow).toBe('F-1 Student Visa');
    });

    it('verifies US B Visitor displays primary "美国 · 旅游/访问签证" while retaining "Visitor Visa (B-2 / B1/B2)" as secondary official identity', () => {
      const option = SUPPORTED_ROUTE_OPTIONS.find((o) => o.routeId === US_B_VISITOR_ROUTE_ID);
      expect(option).toBeDefined();
      expect(option?.label).toBe('美国 · 旅游/访问签证');
      expect(option?.eyebrow).toBe('Visitor Visa (B-2 / B1/B2)');
      expect(usBVisitorRoutePack.eyebrow).toBe('Visitor Visa (B-2 / B1/B2)');
    });

    it('verifies all visit routes display "<国家> · 旅游/访问签证"', () => {
      const visitOptions = SUPPORTED_ROUTE_OPTIONS.filter((o) => o.routeCategory === 'visit');
      expect(visitOptions).toHaveLength(4);
      for (const option of visitOptions) {
        expect(option.label).toMatch(/^(新西兰|加拿大|澳大利亚|美国) · 旅游\/访问签证$/);
      }
    });

    it('ensures RouteOptions are projected from RoutePacks rather than holding independent conflicting labels', () => {
      for (const option of SUPPORTED_ROUTE_OPTIONS) {
        const pack = getRoutePack(option.routeId);
        expect(option.label).toBe(formatRoutePrimaryLabel(pack.jurisdiction, pack.routeCategory));
        expect(option.displayName).toBe(formatRouteDisplayName(pack.id));
        expect(option.eyebrow).toBe(pack.eyebrow);
        expect(option.jurisdiction).toBe(pack.jurisdiction);
        expect(option.routeCategory).toBe(pack.routeCategory);
      }
    });
  });
});
