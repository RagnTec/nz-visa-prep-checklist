import { describe, expect, it } from 'vitest';
import {
  NZ_CHINA_WORKING_HOLIDAY_ROUTE_ID,
  nzChinaWorkingHolidayRoutePack,
  evaluateQuestionEffects,
  cleanNzChinaWorkingHolidayStaleAnswers
} from '../src/content/nz/china-working-holiday';
import questionsJson from '../src/content/nz/china-working-holiday/questions.zh-CN.json';
import checklistItemsJson from '../src/content/nz/china-working-holiday/checklist-items.zh-CN.json';
import rulesJson from '../src/content/nz/china-working-holiday/rules.json';
import sourcesJson from '../src/content/nz/china-working-holiday/sources.json';
import { isRegisteredRouteId, getRoutePack } from '../src/content/registry';
import { formatRoutePrimaryLabel } from '../src/i18n';
import { generateChecklist } from '../src/domain/checklist';
import type { ChecklistItem, ChecklistRule } from '../src/domain/types';

function getChecklist(answers: Record<string, unknown>): ChecklistItem[] {
  const effects = evaluateQuestionEffects(answers);
  return generateChecklist(
    effects.answersForChecklist,
    nzChinaWorkingHolidayRoutePack.items as ChecklistItem[],
    nzChinaWorkingHolidayRoutePack.rules as ChecklistRule[]
  );
}

describe('New Zealand China Working Holiday Visa RoutePack (WP-06)', () => {
  it('1: conforms to RoutePack interface with correct route identity and metadata', () => {
    expect(NZ_CHINA_WORKING_HOLIDAY_ROUTE_ID).toBe('nz-china-working-holiday');
    expect(nzChinaWorkingHolidayRoutePack.id).toBe('nz-china-working-holiday');
    expect(nzChinaWorkingHolidayRoutePack.jurisdiction).toBe('nz');
    expect(nzChinaWorkingHolidayRoutePack.routeCategory).toBe('work');
    expect(nzChinaWorkingHolidayRoutePack.eyebrow).toBe('China Working Holiday Visa');
    expect(nzChinaWorkingHolidayRoutePack.title).toBe('新西兰中国打工度假签证材料准备清单');
    expect(nzChinaWorkingHolidayRoutePack.authorityName).toBe('Immigration New Zealand（INZ）');
    expect(nzChinaWorkingHolidayRoutePack.defaultExportFileName).toBe(
      'nz-china-working-holiday-checklist.json'
    );

    expect(
      formatRoutePrimaryLabel(
        nzChinaWorkingHolidayRoutePack.jurisdiction,
        nzChinaWorkingHolidayRoutePack.routeCategory
      )
    ).toBe('新西兰 · 工作签证');

    expect(nzChinaWorkingHolidayRoutePack.questions).toEqual(questionsJson);
    expect(nzChinaWorkingHolidayRoutePack.items).toEqual(checklistItemsJson);
    expect(nzChinaWorkingHolidayRoutePack.rules).toEqual(rulesJson);
    expect(nzChinaWorkingHolidayRoutePack.sources).toEqual(sourcesJson);

    expect(typeof nzChinaWorkingHolidayRoutePack.evaluateEffects).toBe('function');
    expect(typeof nzChinaWorkingHolidayRoutePack.cleanStaleAnswers).toBe('function');
    expect(nzChinaWorkingHolidayRoutePack.immediateEffectFields).toBeDefined();
    expect(nzChinaWorkingHolidayRoutePack.immediateEffectFields?.length).toBe(5);

    expect(isRegisteredRouteId('nz-china-working-holiday')).toBe(true);
    expect(getRoutePack('nz-china-working-holiday')).toBe(nzChinaWorkingHolidayRoutePack);
  });

  it('2: contains exactly 5 Survey signals on a single scope page', () => {
    const pages = (questionsJson as { pages: Array<{ name: string; elements: Array<{ name: string }> }> }).pages;
    expect(pages).toHaveLength(1);
    expect(pages[0].name).toBe('scope');

    const elementNames = pages[0].elements.map((e) => e.name);
    expect(elementNames).toHaveLength(5);
    expect(elementNames).toEqual([
      'scope.confirmedChinaWorkingHoliday',
      'scope.citizenshipStatus',
      'scope.ageBand',
      'scope.applicationResidence',
      'scope.previousNzWorkingHolidayVisa'
    ]);
  });

  it('3: ensures forbidden Survey data fields are completely absent', () => {
    const questionsString = JSON.stringify(questionsJson);

    // Forbidden Survey data
    expect(questionsString).not.toContain('passportNumber');
    expect(questionsString).not.toContain('passport_number');
    expect(questionsString).not.toContain('bankBalance');
    expect(questionsString).not.toContain('bank_balance');
    expect(questionsString).not.toContain('ieltsScore');
    expect(questionsString).not.toContain('englishScore');
    expect(questionsString).not.toContain('policyNumber');
    expect(questionsString).not.toContain('insurancePolicy');
    expect(questionsString).not.toContain('quotaStatus');
    expect(questionsString).not.toContain('openStatus');
    expect(questionsString).not.toContain('employerName');
    expect(questionsString).not.toContain('jobOffer');
    expect(questionsString).not.toContain('dateOfBirth');
  });

  it('4: contains exactly 13 checklist items with valid schema', () => {
    const items = nzChinaWorkingHolidayRoutePack.items;
    expect(items).toHaveLength(13);

    const expectedItemIds = [
      'nz.cwh.identity.passport',
      'nz.cwh.application.inz1027',
      'nz.cwh.residence.evidence',
      'nz.cwh.education.highSchool',
      'nz.cwh.english.test',
      'nz.cwh.funds.maintenance',
      'nz.cwh.travel.onward',
      'nz.cwh.insurance.medical',
      'nz.cwh.health.medicalReview',
      'nz.cwh.character.police',
      'nz.cwh.process.quotaAndOpening',
      'nz.cwh.process.onlineApplication',
      'nz.cwh.review.consistency'
    ];

    const actualItemIds = items.map((i) => i.id);
    expect(actualItemIds).toEqual(expectedItemIds);

    for (const item of items) {
      expect(item.defaultIncluded).toBe(true);
      expect(['inz_visa', 'product_guidance']).toContain(item.evidenceLayer);
      expect([
        'usually_required',
        'may_be_requested',
        'product_organisation_guidance'
      ]).toContain(item.requirementType);
    }
  });

  it('5 & 6: baseline checklist generation returns all 13 default-included items with empty rules', () => {
    expect(nzChinaWorkingHolidayRoutePack.rules).toEqual([]);

    const emptyAnswers = {};
    const items = getChecklist(emptyAnswers);
    expect(items).toHaveLength(13);

    const clearAnswers = {
      scope: {
        confirmedChinaWorkingHoliday: 'yes',
        citizenshipStatus: 'china',
        ageBand: '18_30',
        applicationResidence: 'meets_china_residence',
        previousNzWorkingHolidayVisa: 'no'
      }
    };
    const itemsWithAnswers = getChecklist(clearAnswers);
    expect(itemsWithAnswers).toHaveLength(13);
  });

  it('7: verifies all official source references resolve in sources.json', () => {
    const sourceIds = nzChinaWorkingHolidayRoutePack.sources.map((s) => s.id);
    expect(sourceIds).toContain('inz.china-working-holiday');
    expect(sourceIds).toContain('inz.inz1027');
    expect(sourceIds).toContain('inz.cwh.education-verification');
    expect(sourceIds).toContain('inz.cwh.english');
    expect(sourceIds).toContain('inz.health-xray-medical');
    expect(sourceIds).toContain('inz.police-certificates');

    for (const item of nzChinaWorkingHolidayRoutePack.items) {
      expect(item.sourceIds.length).toBeGreaterThan(0);
      for (const sId of item.sourceIds) {
        expect(sourceIds).toContain(sId);
      }
    }
  });

  it('8 & 9: produces non-blocking warnings and zero validationErrors for boundary scope answers', () => {
    // 8.1 confirmed route need_check
    const r1 = evaluateQuestionEffects({
      scope: { confirmedChinaWorkingHoliday: 'need_check' }
    });
    expect(r1.validationErrors).toEqual({});
    expect(r1.warnings['scope.confirmedChinaWorkingHoliday']).toBeDefined();
    expect(typeof r1.warnings['scope.confirmedChinaWorkingHoliday']).toBe('string');

    // 8.2 citizenship other & need_check
    const r2Other = evaluateQuestionEffects({
      scope: { citizenshipStatus: 'other' }
    });
    expect(r2Other.validationErrors).toEqual({});
    expect(r2Other.warnings['scope.citizenshipStatus']).toBeDefined();

    const r2Check = evaluateQuestionEffects({
      scope: { citizenshipStatus: 'need_check' }
    });
    expect(r2Check.validationErrors).toEqual({});
    expect(r2Check.warnings['scope.citizenshipStatus']).toBeDefined();

    // 8.3 age outside_18_30 & need_check
    const r3Outside = evaluateQuestionEffects({
      scope: { ageBand: 'outside_18_30' }
    });
    expect(r3Outside.validationErrors).toEqual({});
    expect(r3Outside.warnings['scope.ageBand']).toBeDefined();

    const r3Check = evaluateQuestionEffects({
      scope: { ageBand: 'need_check' }
    });
    expect(r3Check.validationErrors).toEqual({});
    expect(r3Check.warnings['scope.ageBand']).toBeDefined();

    // 8.4 residence outside_scope & need_check
    const r4Outside = evaluateQuestionEffects({
      scope: { applicationResidence: 'outside_scope' }
    });
    expect(r4Outside.validationErrors).toEqual({});
    expect(r4Outside.warnings['scope.applicationResidence']).toBeDefined();

    const r4Check = evaluateQuestionEffects({
      scope: { applicationResidence: 'need_check' }
    });
    expect(r4Check.validationErrors).toEqual({});
    expect(r4Check.warnings['scope.applicationResidence']).toBeDefined();

    // 8.5 previous WHV yes & need_check
    const r5Yes = evaluateQuestionEffects({
      scope: { previousNzWorkingHolidayVisa: 'yes' }
    });
    expect(r5Yes.validationErrors).toEqual({});
    expect(r5Yes.warnings['scope.previousNzWorkingHolidayVisa']).toBeDefined();

    const r5Check = evaluateQuestionEffects({
      scope: { previousNzWorkingHolidayVisa: 'need_check' }
    });
    expect(r5Check.validationErrors).toEqual({});
    expect(r5Check.warnings['scope.previousNzWorkingHolidayVisa']).toBeDefined();
  });

  it('10: produces zero warnings when all scope answers confirm route applicability', () => {
    const clearAnswers = {
      scope: {
        confirmedChinaWorkingHoliday: 'yes',
        citizenshipStatus: 'china',
        ageBand: '18_30',
        applicationResidence: 'meets_china_residence',
        previousNzWorkingHolidayVisa: 'no'
      }
    };

    const effects = evaluateQuestionEffects(clearAnswers);
    expect(effects.validationErrors).toEqual({});
    expect(effects.warnings).toEqual({});
  });

  it('11: health item is may_be_requested and models review rather than universal mandatory X-ray', () => {
    const healthItem = nzChinaWorkingHolidayRoutePack.items.find(
      (i) => i.id === 'nz.cwh.health.medicalReview'
    );
    expect(healthItem).toBeDefined();
    expect(healthItem?.requirementType).toBe('may_be_requested');
    expect(healthItem?.evidenceLayer).toBe('inz_visa');
    expect(healthItem?.title).not.toBe('胸部X光体检');
  });

  it('12: confirms no employer or job offer models exist in this RoutePack', () => {
    const questions = JSON.stringify(questionsJson);
    expect(questions).not.toContain('employer');
    expect(questions).not.toContain('jobCheck');
    expect(questions).not.toContain('accreditation');

    const cleanResult = cleanNzChinaWorkingHolidayStaleAnswers({ test: 'value' });
    expect(cleanResult).toEqual({ test: 'value' });
  });

  it('13: confirms no live quota availability state is hard-coded as eligibility truth', () => {
    const quotaItem = nzChinaWorkingHolidayRoutePack.items.find(
      (i) => i.id === 'nz.cwh.process.quotaAndOpening'
    );
    expect(quotaItem).toBeDefined();
    expect(quotaItem?.evidenceLayer).toBe('inz_visa');

    const serializedItem = JSON.stringify(quotaItem);
    expect(serializedItem).not.toContain('名额充足');
    expect(serializedItem).not.toContain('名额已满');
    expect(serializedItem).not.toContain('当前开放');
    expect(serializedItem).not.toContain('当前关闭');
  });
});
