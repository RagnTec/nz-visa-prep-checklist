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
  SUPPORTED_ROUTE_OPTIONS
} from '../src/content/registry';
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

  it('exposes all three supported route options in the expected order', () => {
    expect(SUPPORTED_ROUTE_OPTIONS).toHaveLength(3);
    expect(SUPPORTED_ROUTE_OPTIONS.map((o) => o.routeId)).toEqual([
      'nz-student-fee-paying',
      'nz-visitor',
      'ca-study-permit'
    ]);
    expect(SUPPORTED_ROUTE_OPTIONS[0].label).toBe('新西兰 · 自费学生签证');
    expect(SUPPORTED_ROUTE_OPTIONS[1].label).toBe('新西兰 · 访问签证');
    expect(SUPPORTED_ROUTE_OPTIONS[2].label).toBe('加拿大 · 学习许可');
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
});
