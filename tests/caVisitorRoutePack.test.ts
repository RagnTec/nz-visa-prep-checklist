import { describe, expect, it } from 'vitest';
import {
  CA_VISITOR_ROUTE_ID,
  caVisitorRoutePack,
  evaluateQuestionEffects,
  cleanCaVisitorStaleAnswers,
  immediateQuestionEffectFields
} from '../src/content/ca/visitor';
import questionsJson from '../src/content/ca/visitor/questions.zh-CN.json';
import checklistItemsJson from '../src/content/ca/visitor/checklist-items.zh-CN.json';
import rulesJson from '../src/content/ca/visitor/rules.json';
import sourcesJson from '../src/content/ca/visitor/sources.json';
import { isRegisteredRouteId, getRoutePack, SUPPORTED_ROUTE_OPTIONS } from '../src/content/registry';
import { generateChecklist } from '../src/domain/checklist';
import type { ChecklistItem, ChecklistRule, OfficialSource } from '../src/domain/types';

describe('Canada Visitor Visa (TRV) RoutePack Contract', () => {
  it('conforms to the RoutePack interface with valid metadata and route-scoped assets', () => {
    expect(CA_VISITOR_ROUTE_ID).toBe('ca-visitor');
    expect(caVisitorRoutePack.id).toBe('ca-visitor');
    expect(caVisitorRoutePack.jurisdiction).toBe('ca');
    expect(caVisitorRoutePack.title).toBe('加拿大访问签证材料准备清单');
    expect(caVisitorRoutePack.eyebrow).toBe('Visitor Visa');
    expect(caVisitorRoutePack.authorityName).toBe('Immigration, Refugees and Citizenship Canada（IRCC）');
    expect(caVisitorRoutePack.defaultExportFileName).toBe('ca-visitor-visa-checklist.json');
    expect(caVisitorRoutePack.description).toContain('当前覆盖个人旅游访问准备');

    expect(caVisitorRoutePack.questions).toEqual(questionsJson);
    expect(caVisitorRoutePack.items).toEqual(checklistItemsJson);
    expect(caVisitorRoutePack.rules).toEqual(rulesJson);
    expect(caVisitorRoutePack.sources).toEqual(sourcesJson);

    expect(typeof caVisitorRoutePack.evaluateEffects).toBe('function');
    expect(typeof caVisitorRoutePack.cleanStaleAnswers).toBe('function');
    expect(caVisitorRoutePack.immediateEffectFields).toEqual(immediateQuestionEffectFields);
    expect(caVisitorRoutePack.immediateEffectFields?.length).toBeGreaterThan(0);
  });

  it('verifies that question names and choice values are stable machine identifiers without passive fields', () => {
    const pages = (questionsJson.pages as Array<{
      name: string;
      elements: Array<{ name: string; choices?: Array<{ value: string; text: string }> }>;
    }>);

    expect(pages).toHaveLength(2);
    const questionNames = pages.flatMap((p) => p.elements.map((e) => e.name));
    expect(questionNames).toEqual([
      'scope.confirmedTouristPurpose',
      'scope.confirmedVisaPathway',
      'applicant.isEmployed'
    ]);

    // Passive data fields must not exist
    expect(questionNames).not.toContain('travel.hasPlannedDates');
    expect(questionNames).not.toContain('travel.accommodationType');

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

  it('verifies that all checklist item IDs are unique and adhere to the ca.visitor prefix', () => {
    const items = caVisitorRoutePack.items as ChecklistItem[];
    expect(items).toHaveLength(8);

    const idSet = new Set<string>();
    for (const item of items) {
      expect(item.id).toMatch(/^ca\.visitor\./);
      expect(idSet.has(item.id)).toBe(false);
      idSet.add(item.id);

      expect(typeof item.title).toBe('string');
      expect(item.title.trim().length).toBeGreaterThan(0);
      expect(typeof item.why).toBe('string');
      expect(item.why.trim().length).toBeGreaterThan(0);
      expect(Array.isArray(item.steps)).toBe(true);
      expect(item.steps.length).toBeGreaterThan(0);
      for (const step of item.steps) {
        expect(typeof step).toBe('string');
        expect(step.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('verifies that all checklist item sourceIds resolve to sources.json entries', () => {
    const sourceIds = (caVisitorRoutePack.sources as OfficialSource[]).map((s) => s.id);
    expect(sourceIds).toContain('ca.visitor.apply');
    expect(sourceIds).toContain('ca.visitor.supporting-documents');
    expect(sourceIds).toContain('ca.visitor.biometrics');

    for (const item of caVisitorRoutePack.items as ChecklistItem[]) {
      expect(item.sourceIds.length).toBeGreaterThan(0);
      for (const sId of item.sourceIds) {
        expect(sourceIds).toContain(sId);
      }
    }
  });

  it('enforces exact RequirementType and EvidenceLayer values matching the V1 contract', () => {
    const items = caVisitorRoutePack.items as ChecklistItem[];
    const itemsById = new Map(items.map((i) => [i.id, i]));

    // Core / broadly required: usually_required + ircc_visa
    const passport = itemsById.get('ca.visitor.identity.passport');
    expect(passport?.requirementType).toBe('usually_required');
    expect(passport?.evidenceLayer).toBe('ircc_visa');

    // Recommended supporting: recommended_supporting + ircc_visa
    const itinerary = itemsById.get('ca.visitor.travel.itinerary');
    expect(itinerary?.requirementType).toBe('recommended_supporting');
    expect(itinerary?.evidenceLayer).toBe('ircc_visa');

    const bank = itemsById.get('ca.visitor.funds.bankStatements');
    expect(bank?.requirementType).toBe('recommended_supporting');
    expect(bank?.evidenceLayer).toBe('ircc_visa');

    const employer = itemsById.get('ca.visitor.ties.employmentLetter');
    expect(employer?.requirementType).toBe('recommended_supporting');
    expect(employer?.evidenceLayer).toBe('ircc_visa');

    const history = itemsById.get('ca.visitor.travel.history');
    expect(history?.requirementType).toBe('recommended_supporting');
    expect(history?.evidenceLayer).toBe('ircc_visa');

    // May be requested: may_be_requested + ircc_visa
    const additional = itemsById.get('ca.visitor.procedures.additionalRequests');
    expect(additional?.requirementType).toBe('may_be_requested');
    expect(additional?.evidenceLayer).toBe('ircc_visa');

    // Product guidance: product_organisation_guidance + product_guidance
    const biometrics = itemsById.get('ca.visitor.procedures.biometricsNotice');
    expect(biometrics?.requirementType).toBe('product_organisation_guidance');
    expect(biometrics?.evidenceLayer).toBe('product_guidance');

    const portal = itemsById.get('ca.visitor.submission.portalChecklistMatch');
    expect(portal?.requirementType).toBe('product_organisation_guidance');
    expect(portal?.evidenceLayer).toBe('product_guidance');
  });

  it('verifies that no explicitly deferred items exist in the checklist', () => {
    const items = caVisitorRoutePack.items as ChecklistItem[];
    const itemIds = items.map((i) => i.id);

    // No student enrollment / leave items
    expect(itemIds.some((id) => id.includes('student'))).toBe(false);
    // No third-party sponsorship package items
    expect(itemIds.some((id) => id.includes('sponsor') || id.includes('thirdParty'))).toBe(false);
    // No property / vehicle / asset items
    expect(itemIds.some((id) => id.includes('property') || id.includes('asset'))).toBe(false);
    // No refusal explanation items
    expect(itemIds.some((id) => id.includes('refusal') || id.includes('decline'))).toBe(false);
    // No business tax / company banking items
    expect(itemIds.some((id) => id.includes('business') || id.includes('tax'))).toBe(false);
    // No specific photo requirements
    expect(itemIds.some((id) => id.includes('photo'))).toBe(false);
    // No minor / guardian consent items
    expect(itemIds.some((id) => id.includes('minor') || id.includes('guardian'))).toBe(false);
    // No invitation / family visit items
    expect(itemIds.some((id) => id.includes('invitation'))).toBe(false);
  });

  it('is registered in the runtime registry and option list with tourist-scope description', () => {
    expect(isRegisteredRouteId('ca-visitor')).toBe(true);
    expect(getRoutePack('ca-visitor')).toBe(caVisitorRoutePack);

    const option = SUPPORTED_ROUTE_OPTIONS.find((o) => o.routeId === 'ca-visitor');
    expect(option).toBeDefined();
    expect(option?.label).toBe('加拿大 · 旅游/访问签证');
    expect(option?.eyebrow).toBe('Visitor Visa');
    expect(option?.jurisdiction).toBe('ca');
    expect(option?.routeCategory).toBe('visit');
    expect(option?.description).toContain('当前覆盖个人旅游访问准备');
  });

  describe('Deterministic checklist generation scenarios', () => {
    it('Scenario 1: Non-employed tourist applicant generates exactly 7 base items without employer letter', () => {
      const answers = {
        scope: {
          confirmedTouristPurpose: 'yes',
          confirmedVisaPathway: 'yes'
        },
        applicant: {
          isEmployed: 'no'
        }
      };

      const effects = evaluateQuestionEffects(answers);
      const items = generateChecklist(
        effects.answersForChecklist,
        caVisitorRoutePack.items as ChecklistItem[],
        caVisitorRoutePack.rules as ChecklistRule[]
      );

      expect(items).toHaveLength(7);
      const itemIds = items.map((i) => i.id);

      expect(itemIds).toContain('ca.visitor.identity.passport');
      expect(itemIds).toContain('ca.visitor.travel.itinerary');
      expect(itemIds).toContain('ca.visitor.funds.bankStatements');
      expect(itemIds).toContain('ca.visitor.travel.history');
      expect(itemIds).toContain('ca.visitor.procedures.additionalRequests');
      expect(itemIds).toContain('ca.visitor.procedures.biometricsNotice');
      expect(itemIds).toContain('ca.visitor.submission.portalChecklistMatch');
      expect(itemIds).not.toContain('ca.visitor.ties.employmentLetter');
    });

    it('Scenario 2: Employed tourist applicant generates all 8 items including employer letter', () => {
      const answers = {
        scope: {
          confirmedTouristPurpose: 'yes',
          confirmedVisaPathway: 'yes'
        },
        applicant: {
          isEmployed: 'yes'
        }
      };

      const effects = evaluateQuestionEffects(answers);
      const items = generateChecklist(
        effects.answersForChecklist,
        caVisitorRoutePack.items as ChecklistItem[],
        caVisitorRoutePack.rules as ChecklistRule[]
      );

      expect(items).toHaveLength(8);
      const itemIds = items.map((i) => i.id);

      expect(itemIds).toContain('ca.visitor.identity.passport');
      expect(itemIds).toContain('ca.visitor.travel.itinerary');
      expect(itemIds).toContain('ca.visitor.funds.bankStatements');
      expect(itemIds).toContain('ca.visitor.travel.history');
      expect(itemIds).toContain('ca.visitor.procedures.additionalRequests');
      expect(itemIds).toContain('ca.visitor.procedures.biometricsNotice');
      expect(itemIds).toContain('ca.visitor.submission.portalChecklistMatch');
      expect(itemIds).toContain('ca.visitor.ties.employmentLetter');
    });
  });

  describe('questionEffects pure function behavior, scope guards, and cleanup', () => {
    it('returns clean answers and empty errors/warnings for safe supported tourist inputs', () => {
      const input = {
        scope: { confirmedTouristPurpose: 'yes', confirmedVisaPathway: 'yes' },
        applicant: { isEmployed: 'yes' }
      };

      const result = evaluateQuestionEffects(input);
      expect(result.answersForChecklist).toEqual(input);
      expect(result.validationErrors).toEqual({});
      expect(result.warnings).toEqual({});
    });

    it('triggers a hard scope guard validation error when confirmedTouristPurpose is other', () => {
      const unsupportedInput = {
        scope: { confirmedTouristPurpose: 'other', confirmedVisaPathway: 'yes' },
        applicant: { isEmployed: 'yes' }
      };

      const result = evaluateQuestionEffects(unsupportedInput);
      expect(result.validationErrors['scope.confirmedTouristPurpose']).toBe(
        '当前路线仅覆盖个人旅游或度假访问准备，其他访问目的暂不在支持范围内。'
      );

      // Clears when set back to supported
      const fixedInput = {
        scope: { confirmedTouristPurpose: 'yes', confirmedVisaPathway: 'yes' },
        applicant: { isEmployed: 'yes' }
      };
      const fixedResult = evaluateQuestionEffects(fixedInput);
      expect(fixedResult.validationErrors['scope.confirmedTouristPurpose']).toBeUndefined();
    });

    it('triggers a non-blocking warning when confirmedVisaPathway is need_check', () => {
      const inputNeedingCheck = {
        scope: { confirmedTouristPurpose: 'yes', confirmedVisaPathway: 'need_check' },
        applicant: { isEmployed: 'no' }
      };

      const result = evaluateQuestionEffects(inputNeedingCheck);
      expect(result.validationErrors['scope.confirmedVisaPathway']).toBeUndefined();
      expect(result.warnings['scope.confirmedVisaPathway']).toBe(
        '请先通过 IRCC 官方渠道确认是否需要申请 Visitor Visa。VisaHelper 不判断 Visitor Visa、eTA 或其他入境许可的适用性。'
      );

      // Clears when confirmed
      const confirmedInput = {
        scope: { confirmedTouristPurpose: 'yes', confirmedVisaPathway: 'yes' },
        applicant: { isEmployed: 'no' }
      };
      const confirmedResult = evaluateQuestionEffects(confirmedInput);
      expect(confirmedResult.warnings['scope.confirmedVisaPathway']).toBeUndefined();
    });

    it('cleans up stale travel.* passive fields if encountered in draft answers', () => {
      const staleAnswers = {
        scope: { confirmedTouristPurpose: 'yes' },
        travel: {
          hasPlannedDates: 'yes',
          accommodationType: 'hotel_or_rental'
        },
        applicant: { isEmployed: 'yes' }
      };

      const cleaned = cleanCaVisitorStaleAnswers(staleAnswers);
      expect(cleaned.travel).toBeUndefined();
      expect(cleaned.scope).toEqual({ confirmedTouristPurpose: 'yes' });
      expect(cleaned.applicant).toEqual({ isEmployed: 'yes' });
    });

    it('handles null or invalid answers gracefully', () => {
      const cleaned = cleanCaVisitorStaleAnswers(null as unknown as Record<string, unknown>);
      expect(cleaned).toBeNull();

      const result = evaluateQuestionEffects(null as unknown as Record<string, unknown>);
      expect(result.answersForChecklist).toEqual({});
      expect(result.validationErrors).toEqual({});
      expect(result.warnings).toEqual({});
    });
  });
});
