import { describe, expect, it } from 'vitest';
import {
  US_B_VISITOR_ROUTE_ID,
  usBVisitorRoutePack,
  evaluateQuestionEffects,
  cleanUsBVisitorStaleAnswers,
  immediateQuestionEffectFields
} from '../src/content/us/b-visitor';
import questionsJson from '../src/content/us/b-visitor/questions.zh-CN.json';
import checklistItemsJson from '../src/content/us/b-visitor/checklist-items.zh-CN.json';
import rulesJson from '../src/content/us/b-visitor/rules.json';
import sourcesJson from '../src/content/us/b-visitor/sources.json';
import {
  isRegisteredRouteId,
  getRoutePack,
  SUPPORTED_ROUTE_OPTIONS,
  groupRouteOptionsByJurisdiction
} from '../src/content/registry';
import { formatRoutePrimaryLabel, formatRouteDisplayName } from '../src/i18n';
import { generateChecklist } from '../src/domain/checklist';
import type { ChecklistItem, ChecklistRule, OfficialSource } from '../src/domain/types';

describe('US B Visitor Visa RoutePack Contract (US-02)', () => {
  it('conforms to the RoutePack interface with valid metadata and route-scoped assets', () => {
    expect(US_B_VISITOR_ROUTE_ID).toBe('us-b-visitor');
    expect(usBVisitorRoutePack.id).toBe('us-b-visitor');
    expect(usBVisitorRoutePack.jurisdiction).toBe('us');
    expect(usBVisitorRoutePack.routeCategory).toBe('visit');
    expect(usBVisitorRoutePack.title).toBe('美国旅游/访问签证材料准备清单');
    expect(usBVisitorRoutePack.eyebrow).toBe('Visitor Visa (B-2 / B1/B2)');
    expect(usBVisitorRoutePack.authorityName).toBe('U.S. Department of State');
    expect(usBVisitorRoutePack.description).toContain(
      '适用于在美国境外准备美国旅游/访问签证，用于旅游、度假、探亲访友或就医等临时访问目的的成年申请人'
    );

    expect(
      formatRoutePrimaryLabel(
        usBVisitorRoutePack.jurisdiction,
        usBVisitorRoutePack.routeCategory
      )
    ).toBe('美国 · 旅游/访问签证');
    expect(formatRouteDisplayName(usBVisitorRoutePack.id)).toBe('美国旅游/访问签证');

    expect(usBVisitorRoutePack.questions).toEqual(questionsJson);
    expect(usBVisitorRoutePack.items).toEqual(checklistItemsJson);
    expect(usBVisitorRoutePack.rules).toEqual(rulesJson);
    expect(usBVisitorRoutePack.sources).toEqual(sourcesJson);

    expect(typeof usBVisitorRoutePack.evaluateEffects).toBe('function');
    expect(typeof usBVisitorRoutePack.cleanStaleAnswers).toBe('function');
    expect(usBVisitorRoutePack.immediateEffectFields).toEqual(immediateQuestionEffectFields);
    expect(usBVisitorRoutePack.immediateEffectFields).toEqual([
      'scope.confirmedBVisitorVisa',
      'scope.visitPurpose'
    ]);
  });

  it('is properly registered in registry and exposed in SUPPORTED_ROUTE_OPTIONS', () => {
    expect(isRegisteredRouteId('us-b-visitor')).toBe(true);
    expect(getRoutePack('us-b-visitor')).toBe(usBVisitorRoutePack);

    const option = SUPPORTED_ROUTE_OPTIONS.find((o) => o.routeId === 'us-b-visitor');
    expect(option).toBeDefined();
    expect(option?.label).toBe('美国 · 旅游/访问签证');
    expect(option?.displayName).toBe('美国旅游/访问签证');
    expect(option?.eyebrow).toBe('Visitor Visa (B-2 / B1/B2)');
    expect(option?.jurisdiction).toBe('us');
    expect(option?.routeCategory).toBe('visit');
  });

  it('groups under US jurisdiction in route grouping alongside F-1 student route', () => {
    const groups = groupRouteOptionsByJurisdiction(SUPPORTED_ROUTE_OPTIONS);
    const usGroup = groups.find((g) => g.jurisdiction === 'us');
    expect(usGroup).toBeDefined();
    expect(usGroup?.categories.map((c) => c.routeCategory)).toEqual(['study', 'visit']);

    const studyCat = usGroup?.categories.find((c) => c.routeCategory === 'study');
    expect(studyCat?.options.map((o) => o.routeId)).toEqual(['us-f1-student']);

    const visitCat = usGroup?.categories.find((c) => c.routeCategory === 'visit');
    expect(visitCat?.options.map((o) => o.routeId)).toEqual(['us-b-visitor']);
  });

  it('contains exactly two Survey signals with expected choices and pages', () => {
    const pages = (questionsJson as any).pages;
    expect(pages).toHaveLength(1);

    const elements = pages[0].elements;
    expect(elements).toHaveLength(2);

    const q1 = elements.find((e: any) => e.name === 'scope.confirmedBVisitorVisa');
    expect(q1).toBeDefined();
    expect(q1.choices.map((c: any) => c.value)).toEqual(['yes', 'need_check']);

    const q2 = elements.find((e: any) => e.name === 'scope.visitPurpose');
    expect(q2).toBeDefined();
    expect(q2.choices.map((c: any) => c.value)).toEqual([
      'tourism_or_vacation',
      'visit_friends_or_relatives',
      'medical_treatment',
      'other_or_need_check'
    ]);
  });

  it('produces non-blocking scope warnings for need_check and other_or_need_check without validation errors', () => {
    // Default yes + tourism
    const defaultEffects = evaluateQuestionEffects({
      scope: {
        confirmedBVisitorVisa: 'yes',
        visitPurpose: 'tourism_or_vacation'
      }
    });
    expect(Object.keys(defaultEffects.validationErrors)).toHaveLength(0);
    expect(Object.keys(defaultEffects.warnings)).toHaveLength(0);

    // Warning for confirmedBVisitorVisa need_check
    const needCheckEffects = evaluateQuestionEffects({
      scope: {
        confirmedBVisitorVisa: 'need_check',
        visitPurpose: 'tourism_or_vacation'
      }
    });
    expect(Object.keys(needCheckEffects.validationErrors)).toHaveLength(0);
    expect(needCheckEffects.warnings['scope.confirmedBVisitorVisa']).toContain('免签证计划');

    // Warning for visitPurpose other_or_need_check
    const otherPurposeEffects = evaluateQuestionEffects({
      scope: {
        confirmedBVisitorVisa: 'yes',
        visitPurpose: 'other_or_need_check'
      }
    });
    expect(Object.keys(otherPurposeEffects.validationErrors)).toHaveLength(0);
    expect(otherPurposeEffects.warnings['scope.visitPurpose']).toContain(
      '本路线适用于 B-2 / B1/B2 中的旅游、度假、探亲访友或就医等临时访问目的'
    );
  });

  it('contains exactly 10 checklist items with valid evidence layers and sources', () => {
    const items = checklistItemsJson as ChecklistItem[];
    expect(items).toHaveLength(10);

    const validLayers = new Set(['us_dos_visa', 'product_guidance']);
    for (const item of items) {
      expect(validLayers.has(item.evidenceLayer)).toBe(true);
      expect(item.sourceIds.length).toBeGreaterThan(0);
      for (const srcId of item.sourceIds) {
        expect(sourcesJson.some((s) => s.id === srcId)).toBe(true);
      }
    }
  });

  it('generates 9 baseline items for tourism_or_vacation and excludes medical treatment', () => {
    const checklist = generateChecklist(
      {
        scope: {
          confirmedBVisitorVisa: 'yes',
          visitPurpose: 'tourism_or_vacation'
        }
      },
      usBVisitorRoutePack.items as ChecklistItem[],
      usBVisitorRoutePack.rules as ChecklistRule[]
    );

    expect(checklist).toHaveLength(9);
    const itemIds = checklist.map((i) => i.id);

    expect(itemIds).toEqual([
      'us.bvisitor.identity.passport',
      'us.bvisitor.application.ds160Confirmation',
      'us.bvisitor.application.photo',
      'us.bvisitor.process.visaFee',
      'us.bvisitor.process.interviewInstructions',
      'us.bvisitor.support.tripPurpose',
      'us.bvisitor.support.intentToDepart',
      'us.bvisitor.support.financialCapacity',
      'us.bvisitor.review.consistency'
    ]);

    expect(itemIds).not.toContain('us.bvisitor.support.medicalTreatment');
  });

  it('generates 9 baseline items for visit_friends_or_relatives and excludes medical treatment', () => {
    const checklist = generateChecklist(
      {
        scope: {
          confirmedBVisitorVisa: 'yes',
          visitPurpose: 'visit_friends_or_relatives'
        }
      },
      usBVisitorRoutePack.items as ChecklistItem[],
      usBVisitorRoutePack.rules as ChecklistRule[]
    );

    expect(checklist).toHaveLength(9);
    expect(checklist.map((i) => i.id)).not.toContain('us.bvisitor.support.medicalTreatment');
  });

  it('includes medical-treatment support item when visitPurpose is medical_treatment', () => {
    const checklist = generateChecklist(
      {
        scope: {
          confirmedBVisitorVisa: 'yes',
          visitPurpose: 'medical_treatment'
        }
      },
      usBVisitorRoutePack.items as ChecklistItem[],
      usBVisitorRoutePack.rules as ChecklistRule[]
    );

    expect(checklist).toHaveLength(10);
    const itemIds = checklist.map((i) => i.id);
    expect(itemIds).toContain('us.bvisitor.support.medicalTreatment');

    const medItem = checklist.find((i) => i.id === 'us.bvisitor.support.medicalTreatment')!;
    expect(medItem.requirementType).toBe('may_be_requested');
    expect(medItem.evidenceLayer).toBe('us_dos_visa');
  });

  it('confirms requirementTypes of supporting items are may_be_requested', () => {
    const items = checklistItemsJson as ChecklistItem[];
    const tripPurpose = items.find((i) => i.id === 'us.bvisitor.support.tripPurpose')!;
    const intentToDepart = items.find((i) => i.id === 'us.bvisitor.support.intentToDepart')!;
    const financialCapacity = items.find((i) => i.id === 'us.bvisitor.support.financialCapacity')!;
    const medicalTreatment = items.find((i) => i.id === 'us.bvisitor.support.medicalTreatment')!;

    expect(tripPurpose.requirementType).toBe('may_be_requested');
    expect(intentToDepart.requirementType).toBe('may_be_requested');
    expect(financialCapacity.requirementType).toBe('may_be_requested');
    expect(medicalTreatment.requirementType).toBe('may_be_requested');
  });

  it('strictly respects invitation-letter boundary: no standalone invitation letter or Affidavit of Support item', () => {
    const items = checklistItemsJson as ChecklistItem[];
    const allIds = items.map((i) => i.id);
    const allTitles = items.map((i) => i.title);

    expect(allIds).not.toContain('us.bvisitor.support.invitationLetter');
    expect(allIds).not.toContain('us.bvisitor.support.affidavitOfSupport');
    expect(allTitles).not.toContain('邀请信');
    expect(allTitles).not.toContain('经济担保书');
  });
});
