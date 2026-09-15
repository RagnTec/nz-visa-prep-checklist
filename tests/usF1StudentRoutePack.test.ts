import { describe, expect, it } from 'vitest';
import {
  US_F1_STUDENT_ROUTE_ID,
  usF1StudentRoutePack,
  evaluateQuestionEffects,
  cleanUsF1StaleAnswers,
  immediateQuestionEffectFields
} from '../src/content/us/f1-student';
import questionsJson from '../src/content/us/f1-student/questions.zh-CN.json';
import checklistItemsJson from '../src/content/us/f1-student/checklist-items.zh-CN.json';
import rulesJson from '../src/content/us/f1-student/rules.json';
import sourcesJson from '../src/content/us/f1-student/sources.json';
import { isRegisteredRouteId, getRoutePack, SUPPORTED_ROUTE_OPTIONS } from '../src/content/registry';
import { formatRoutePrimaryLabel, formatRouteDisplayName } from '../src/i18n';
import { generateChecklist } from '../src/domain/checklist';
import type { ChecklistItem, ChecklistRule, OfficialSource } from '../src/domain/types';

describe('US F-1 Student Visa RoutePack Contract (US-01)', () => {
  it('conforms to the RoutePack interface with valid metadata and route-scoped assets', () => {
    expect(US_F1_STUDENT_ROUTE_ID).toBe('us-f1-student');
    expect(usF1StudentRoutePack.id).toBe('us-f1-student');
    expect(usF1StudentRoutePack.jurisdiction).toBe('us');
    expect(usF1StudentRoutePack.routeCategory).toBe('study');
    expect(usF1StudentRoutePack.title).toBe('美国 F-1 学生签证材料准备清单');
    expect(usF1StudentRoutePack.eyebrow).toBe('F-1 Student Visa');
    expect(usF1StudentRoutePack.authorityName).toBe('U.S. Department of State / U.S. ICE SEVP');
    expect(usF1StudentRoutePack.description).toContain(
      '适用于在美国境外准备首次申请 F-1 学生签证，赴美参加符合 F-1 类别的学术或语言学习项目的成年申请人'
    );

    expect(
      formatRoutePrimaryLabel(
        usF1StudentRoutePack.jurisdiction,
        usF1StudentRoutePack.routeCategory
      )
    ).toBe('美国 · 学生签证');
    expect(formatRouteDisplayName(usF1StudentRoutePack.id)).toBe('F-1 学生签证');

    expect(usF1StudentRoutePack.questions).toEqual(questionsJson);
    expect(usF1StudentRoutePack.items).toEqual(checklistItemsJson);
    expect(usF1StudentRoutePack.rules).toEqual(rulesJson);
    expect(usF1StudentRoutePack.sources).toEqual(sourcesJson);

    expect(typeof usF1StudentRoutePack.evaluateEffects).toBe('function');
    expect(typeof usF1StudentRoutePack.cleanStaleAnswers).toBe('function');
    expect(usF1StudentRoutePack.immediateEffectFields).toEqual(immediateQuestionEffectFields);
    expect(usF1StudentRoutePack.immediateEffectFields).toEqual([
      'scope.confirmedF1StudentVisa',
      'scope.applicationContext',
      'admission.i20Status'
    ]);
  });

  it('is properly registered in registry and exposed in SUPPORTED_ROUTE_OPTIONS', () => {
    expect(isRegisteredRouteId('us-f1-student')).toBe(true);
    expect(getRoutePack('us-f1-student')).toBe(usF1StudentRoutePack);

    const option = SUPPORTED_ROUTE_OPTIONS.find((o) => o.routeId === 'us-f1-student');
    expect(option).toBeDefined();
    expect(option?.label).toBe('美国 · 学生签证');
    expect(option?.displayName).toBe('F-1 学生签证');
    expect(option?.eyebrow).toBe('F-1 Student Visa');
    expect(option?.jurisdiction).toBe('us');
    expect(option?.routeCategory).toBe('study');
    expect(option?.description).toContain('学术或语言学习项目');
  });

  it('verifies that questions contain exactly 3 machine-identified signals without passive collection', () => {
    const pages = questionsJson.pages as Array<{
      name: string;
      title: string;
      elements: Array<{ name: string; choices?: Array<{ value: string; text: string }> }>;
    }>;

    expect(pages).toHaveLength(2);
    const questionNames = pages.flatMap((p) => p.elements.map((e) => e.name));
    expect(questionNames).toEqual([
      'scope.confirmedF1StudentVisa',
      'scope.applicationContext',
      'admission.i20Status'
    ]);

    for (const page of pages) {
      for (const element of page.elements) {
        expect(element.name).toMatch(/^[a-z]+(\.[a-zA-Z0-9]+)+$/);
        if (element.choices) {
          for (const choice of element.choices) {
            expect(choice.value).toMatch(/^[a-z0-9_]+$/);
            expect(typeof choice.text).toBe('string');
            expect(choice.text.trim().length).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it('verifies that checklist items contain exactly 11 items with us.f1 prefix and valid evidence layers', () => {
    const items = usF1StudentRoutePack.items as ChecklistItem[];
    expect(items).toHaveLength(11);

    const expectedItemIds = [
      'us.f1.identity.passport',
      'us.f1.application.ds160Confirmation',
      'us.f1.application.photo',
      'us.f1.student.i20',
      'us.f1.student.sevisI901',
      'us.f1.process.visaFee',
      'us.f1.process.interviewInstructions',
      'us.f1.support.academicPreparation',
      'us.f1.support.intentToDepart',
      'us.f1.support.financialCapacity',
      'us.f1.review.consistency'
    ];

    const actualItemIds = items.map((item) => item.id);
    expect(actualItemIds).toEqual(expectedItemIds);

    const allowedLayers = new Set(['us_dos_visa', 'us_ice_sevp', 'product_guidance']);
    const allowedRequirementTypes = new Set([
      'usually_required',
      'may_be_requested',
      'product_organisation_guidance'
    ]);

    for (const item of items) {
      expect(item.id).toMatch(/^us\.f1\./);
      expect(allowedLayers.has(item.evidenceLayer)).toBe(true);
      expect(allowedRequirementTypes.has(item.requirementType)).toBe(true);
      expect(item.defaultIncluded).toBe(true);
      expect(typeof item.title).toBe('string');
      expect(item.title.trim().length).toBeGreaterThan(0);
      expect(typeof item.why).toBe('string');
      expect(item.why.trim().length).toBeGreaterThan(0);
      expect(Array.isArray(item.steps)).toBe(true);
      expect(item.steps.length).toBeGreaterThan(0);
      expect(item.sourceIds.length).toBeGreaterThan(0);
    }

    const feeItem = items.find((i) => i.id === 'us.f1.process.visaFee');
    expect(feeItem?.title).toBe('签证申请费与缴费要求核对');

    const interviewItem = items.find((i) => i.id === 'us.f1.process.interviewInstructions');
    expect(interviewItem?.title).toBe('当前使领馆申请与面谈要求核对');

    const sevisItem = items.find((i) => i.id === 'us.f1.student.sevisI901');
    expect(sevisItem?.title).toBe('SEVIS I-901 缴费与记录核对');

    const intentItem = items.find((i) => i.id === 'us.f1.support.intentToDepart');
    expect(intentItem?.title).toBe('完成学业后离美意向支持材料');
  });

  it('verifies that all checklist item sourceIds resolve to valid sources in sources.json', () => {
    const sources = usF1StudentRoutePack.sources as OfficialSource[];
    const sourceIds = sources.map((s) => s.id);

    expect(sourceIds).toEqual([
      'us.dos.student-visa',
      'us.dos.ds160-faq',
      'us.dos.photo-requirements',
      'us.ice.sevp-students',
      'us.dhs.sevis-i901-fee'
    ]);

    for (const source of sources) {
      expect(source.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(source.url.startsWith('https://')).toBe(true);
      expect(source.title.trim().length).toBeGreaterThan(0);
      expect(source.publisher.trim().length).toBeGreaterThan(0);
    }

    const items = usF1StudentRoutePack.items as ChecklistItem[];
    for (const item of items) {
      for (const sId of item.sourceIds) {
        expect(sourceIds).toContain(sId);
      }
    }
  });

  it('generates all 11 default checklist items for minimal answers', () => {
    const effects = evaluateQuestionEffects({});
    const generated = generateChecklist(
      effects.answersForChecklist,
      usF1StudentRoutePack.items as ChecklistItem[],
      usF1StudentRoutePack.rules as ChecklistRule[]
    );
    expect(generated).toHaveLength(11);
  });

  it('evaluates question effects producing non-blocking warnings without validation errors', () => {
    // Normal ideal case: no errors, no warnings
    const idealEffects = evaluateQuestionEffects({
      'scope.confirmedF1StudentVisa': 'yes',
      'scope.applicationContext': 'initial_outside_us',
      'admission.i20Status': 'have_i20'
    });
    expect(idealEffects.validationErrors).toEqual({});
    expect(idealEffects.warnings).toEqual({});

    // Warning on unconfirmed visa type
    const needCheckVisa = evaluateQuestionEffects({
      'scope.confirmedF1StudentVisa': 'need_check'
    });
    expect(needCheckVisa.validationErrors).toEqual({});
    expect(needCheckVisa.warnings['scope.confirmedF1StudentVisa']).toBeDefined();
    expect(needCheckVisa.warnings['scope.confirmedF1StudentVisa']).toContain('F-1 学生签证');

    // Warning on continuing / change of status / need_check application contexts
    for (const ctx of ['continuing_or_returning', 'change_of_status_or_other', 'need_check']) {
      const ctxEffects = evaluateQuestionEffects({
        'scope.applicationContext': ctx
      });
      expect(ctxEffects.validationErrors).toEqual({});
      expect(ctxEffects.warnings['scope.applicationContext']).toBeDefined();
      expect(ctxEffects.warnings['scope.applicationContext']).toContain('首次申请');
    }

    // Warning on incomplete I-20 status
    for (const st of ['admitted_waiting_i20', 'need_check']) {
      const stEffects = evaluateQuestionEffects({
        'admission.i20Status': st
      });
      expect(stEffects.validationErrors).toEqual({});
      expect(stEffects.warnings['admission.i20Status']).toBeDefined();
      expect(stEffects.warnings['admission.i20Status']).toContain('DS-160');
    }

    const notAdmittedEffects = evaluateQuestionEffects({
      'admission.i20Status': 'not_admitted'
    });
    expect(notAdmittedEffects.validationErrors).toEqual({});
    expect(notAdmittedEffects.warnings['admission.i20Status']).toBeDefined();
    expect(notAdmittedEffects.warnings['admission.i20Status']).toContain('SEVP');

    // Handles nested answers cleanly
    const nestedEffects = evaluateQuestionEffects({
      scope: {
        confirmedF1StudentVisa: 'need_check',
        applicationContext: 'continuing_or_returning'
      },
      admission: {
        i20Status: 'not_admitted'
      }
    });
    expect(nestedEffects.validationErrors).toEqual({});
    expect(Object.keys(nestedEffects.warnings)).toHaveLength(3);
  });

  it('preserves answers immutably through cleanUsF1StaleAnswers', () => {
    const input = { 'scope.confirmedF1StudentVisa': 'yes', customField: 123 };
    const cleaned = cleanUsF1StaleAnswers(input);
    expect(cleaned).toEqual(input);
    expect(cleaned).not.toBe(input);
  });
});
