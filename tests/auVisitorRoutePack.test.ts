import { describe, expect, it } from 'vitest';
import {
  AU_VISITOR_ROUTE_ID,
  auVisitorRoutePack,
  evaluateQuestionEffects,
  cleanAuVisitorStaleAnswers,
  immediateQuestionEffectFields
} from '../src/content/au/visitor';
import questionsJson from '../src/content/au/visitor/questions.zh-CN.json';
import checklistItemsJson from '../src/content/au/visitor/checklist-items.zh-CN.json';
import rulesJson from '../src/content/au/visitor/rules.json';
import sourcesJson from '../src/content/au/visitor/sources.json';
import { isRegisteredRouteId, getRoutePack, SUPPORTED_ROUTE_OPTIONS } from '../src/content/registry';
import { generateChecklist } from '../src/domain/checklist';
import type { ChecklistItem, ChecklistRule, OfficialSource } from '../src/domain/types';

describe('Australia Visitor Visa (subclass 600) RoutePack Contract', () => {
  it('conforms to the RoutePack interface with valid metadata and route-scoped assets', () => {
    expect(AU_VISITOR_ROUTE_ID).toBe('au-visitor');
    expect(auVisitorRoutePack.id).toBe('au-visitor');
    expect(auVisitorRoutePack.jurisdiction).toBe('au');
    expect(auVisitorRoutePack.title).toBe('澳大利亚访问签证材料准备清单');
    expect(auVisitorRoutePack.eyebrow).toBe('Visitor visa (subclass 600)');
    expect(auVisitorRoutePack.authorityName).toBe('Department of Home Affairs（澳大利亚内政事务部）');
    expect(auVisitorRoutePack.defaultExportFileName).toBe('au-visitor-visa-checklist.json');
    expect(auVisitorRoutePack.description).toContain('当前覆盖个人旅游度假访问准备');

    expect(auVisitorRoutePack.questions).toEqual(questionsJson);
    expect(auVisitorRoutePack.items).toEqual(checklistItemsJson);
    expect(auVisitorRoutePack.rules).toEqual(rulesJson);
    expect(auVisitorRoutePack.sources).toEqual(sourcesJson);

    expect(typeof auVisitorRoutePack.evaluateEffects).toBe('function');
    expect(typeof auVisitorRoutePack.cleanStaleAnswers).toBe('function');
    expect(auVisitorRoutePack.immediateEffectFields).toEqual(immediateQuestionEffectFields);
    expect(auVisitorRoutePack.immediateEffectFields?.length).toBeGreaterThan(0);
  });

  it('verifies that question names and choice values are stable machine identifiers with exactly 5 signals', () => {
    const pages = (questionsJson.pages as Array<{
      name: string;
      elements: Array<{ name: string; choices?: Array<{ value: string; text: string }> }>;
    }>);

    expect(pages).toHaveLength(2);
    const questionNames = pages.flatMap((p) => p.elements.map((e) => e.name));
    expect(questionNames).toEqual([
      'scope.confirmedTouristPurpose',
      'scope.confirmedVisaPathway',
      'scope.confirmedOffshoreApplication',
      'applicant.isEmployed',
      'documents.hasNonEnglishDocuments'
    ]);

    // Rejected and passive data fields must not exist
    expect(questionNames).not.toContain('scope.isOutsideAustralia');
    expect(questionNames).not.toContain('travel.plannedDates');
    expect(questionNames).not.toContain('travel.accommodationType');
    expect(questionNames).not.toContain('travel.itineraryReadiness');
    expect(questionNames).not.toContain('funds.bankStatementReadiness');
    expect(questionNames).not.toContain('travel.historyReadiness');

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

  it('verifies that all checklist item IDs are unique and adhere to the au.visitor prefix', () => {
    const items = auVisitorRoutePack.items as ChecklistItem[];
    expect(items).toHaveLength(9);

    const idSet = new Set<string>();
    for (const item of items) {
      expect(item.id).toMatch(/^au\.visitor\./);
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
    const sourceIds = (auVisitorRoutePack.sources as OfficialSource[]).map((s) => s.id);
    expect(sourceIds).toContain('au.visitor.subclass600.tourist-stream');
    expect(sourceIds).toContain('au.visitor.subclass600.step-by-step');
    expect(sourceIds).toContain('au.visitor.immiaccount');

    for (const item of auVisitorRoutePack.items as ChecklistItem[]) {
      expect(item.sourceIds.length).toBeGreaterThan(0);
      for (const sId of item.sourceIds) {
        expect(sourceIds).toContain(sId);
      }
    }
  });

  it('enforces exact RequirementType and EvidenceLayer values matching the AU-V0 contract', () => {
    const items = auVisitorRoutePack.items as ChecklistItem[];
    const itemsById = new Map(items.map((i) => [i.id, i]));

    // 1. Passport: usually_required + au_home_affairs_visa
    const passport = itemsById.get('au.visitor.identity.passport');
    expect(passport?.requirementType).toBe('usually_required');
    expect(passport?.evidenceLayer).toBe('au_home_affairs_visa');
    expect(passport?.defaultIncluded).toBe(true);

    // 2. Funds: recommended_supporting + au_home_affairs_visa
    const funds = itemsById.get('au.visitor.funds.financialSupport');
    expect(funds?.requirementType).toBe('recommended_supporting');
    expect(funds?.evidenceLayer).toBe('au_home_affairs_visa');
    expect(funds?.defaultIncluded).toBe(true);

    // 3. Travel plans: recommended_supporting + au_home_affairs_visa
    const plans = itemsById.get('au.visitor.travel.plans');
    expect(plans?.requirementType).toBe('recommended_supporting');
    expect(plans?.evidenceLayer).toBe('au_home_affairs_visa');
    expect(plans?.defaultIncluded).toBe(true);

    // 4. Reasons to return: recommended_supporting + au_home_affairs_visa
    const reasons = itemsById.get('au.visitor.ties.reasonsToReturn');
    expect(reasons?.requirementType).toBe('recommended_supporting');
    expect(reasons?.evidenceLayer).toBe('au_home_affairs_visa');
    expect(reasons?.defaultIncluded).toBe(true);

    // 5. Employment letter: recommended_supporting + au_home_affairs_visa (conditional)
    const employment = itemsById.get('au.visitor.ties.employmentLetter');
    expect(employment?.requirementType).toBe('recommended_supporting');
    expect(employment?.evidenceLayer).toBe('au_home_affairs_visa');
    expect(employment?.defaultIncluded).toBe(false);

    // 6. English translations: answer_dependent + au_home_affairs_visa (conditional)
    const translations = itemsById.get('au.visitor.documents.translations');
    expect(translations?.requirementType).toBe('answer_dependent');
    expect(translations?.evidenceLayer).toBe('au_home_affairs_visa');
    expect(translations?.defaultIncluded).toBe(false);

    // 7. Health examinations: may_be_requested + au_home_affairs_visa
    const health = itemsById.get('au.visitor.procedures.healthExaminations');
    expect(health?.requirementType).toBe('may_be_requested');
    expect(health?.evidenceLayer).toBe('au_home_affairs_visa');
    expect(health?.defaultIncluded).toBe(true);

    // 8. Biometrics: may_be_requested + au_home_affairs_visa
    const biometrics = itemsById.get('au.visitor.procedures.biometricsNotice');
    expect(biometrics?.requirementType).toBe('may_be_requested');
    expect(biometrics?.evidenceLayer).toBe('au_home_affairs_visa');
    expect(biometrics?.defaultIncluded).toBe(true);

    // 9. ImmiAccount check: product_organisation_guidance + product_guidance
    const immi = itemsById.get('au.visitor.submission.immiAccountCheck');
    expect(immi?.requirementType).toBe('product_organisation_guidance');
    expect(immi?.evidenceLayer).toBe('product_guidance');
    expect(immi?.defaultIncluded).toBe(true);
  });

  it('verifies that no explicitly excluded scope or unverified items are implemented', () => {
    const items = auVisitorRoutePack.items as ChecklistItem[];
    const itemIds = items.map((i) => i.id);

    // No family invitation or sponsorship items
    expect(itemIds.some((id) => id.includes('sponsor') || id.includes('family') || id.includes('invitation'))).toBe(false);
    // No student enrollment or course items
    expect(itemIds.some((id) => id.includes('student') || id.includes('study'))).toBe(false);
    // No business visitor or commercial activity items
    expect(itemIds.some((id) => id.includes('business') || id.includes('contract'))).toBe(false);
    // No property or asset ownership mandate items
    expect(itemIds.some((id) => id.includes('property') || id.includes('asset'))).toBe(false);
    // No minor / guardian items
    expect(itemIds.some((id) => id.includes('minor') || id.includes('guardian') || id.includes('child'))).toBe(false);
    // No NAATI or translation certification mandate items
    expect(itemIds.some((id) => id.includes('naati') || id.includes('notary'))).toBe(false);
  });

  it('is registered in the runtime registry and option list with expected label and description', () => {
    expect(isRegisteredRouteId('au-visitor')).toBe(true);
    expect(getRoutePack('au-visitor')).toBe(auVisitorRoutePack);

    const option = SUPPORTED_ROUTE_OPTIONS.find((o) => o.routeId === 'au-visitor');
    expect(option).toBeDefined();
    expect(option?.label).toBe('澳大利亚 · 旅游/访问签证');
    expect(option?.eyebrow).toBe('Visitor visa (subclass 600)');
    expect(option?.jurisdiction).toBe('au');
    expect(option?.routeCategory).toBe('visit');
    expect(option?.description).toContain('当前覆盖个人旅游访问准备');
  });

  describe('Deterministic checklist generation scenarios', () => {
    it('Scenario 1 (Baseline): Unemployed applicant with all-English documents produces exactly 7 default items', () => {
      const answers = {
        scope: {
          confirmedTouristPurpose: 'yes',
          confirmedVisaPathway: 'yes',
          confirmedOffshoreApplication: 'yes'
        },
        applicant: {
          isEmployed: 'no'
        },
        documents: {
          hasNonEnglishDocuments: 'no'
        }
      };

      const effects = evaluateQuestionEffects(answers);
      const items = generateChecklist(
        effects.answersForChecklist,
        auVisitorRoutePack.items as ChecklistItem[],
        auVisitorRoutePack.rules as ChecklistRule[]
      );

      expect(items).toHaveLength(7);
      const itemIds = items.map((i) => i.id);

      expect(itemIds).toContain('au.visitor.identity.passport');
      expect(itemIds).toContain('au.visitor.funds.financialSupport');
      expect(itemIds).toContain('au.visitor.travel.plans');
      expect(itemIds).toContain('au.visitor.ties.reasonsToReturn');
      expect(itemIds).toContain('au.visitor.procedures.healthExaminations');
      expect(itemIds).toContain('au.visitor.procedures.biometricsNotice');
      expect(itemIds).toContain('au.visitor.submission.immiAccountCheck');

      expect(itemIds).not.toContain('au.visitor.ties.employmentLetter');
      expect(itemIds).not.toContain('au.visitor.documents.translations');
    });

    it('Scenario 2 (Employed): Employed applicant with all-English documents produces 8 items (adds employmentLetter)', () => {
      const answers = {
        scope: {
          confirmedTouristPurpose: 'yes',
          confirmedVisaPathway: 'yes',
          confirmedOffshoreApplication: 'yes'
        },
        applicant: {
          isEmployed: 'yes'
        },
        documents: {
          hasNonEnglishDocuments: 'no'
        }
      };

      const effects = evaluateQuestionEffects(answers);
      const items = generateChecklist(
        effects.answersForChecklist,
        auVisitorRoutePack.items as ChecklistItem[],
        auVisitorRoutePack.rules as ChecklistRule[]
      );

      expect(items).toHaveLength(8);
      const itemIds = items.map((i) => i.id);

      expect(itemIds).toContain('au.visitor.ties.employmentLetter');
      expect(itemIds).not.toContain('au.visitor.documents.translations');
    });

    it('Scenario 3 (Non-English documents): Unemployed applicant with non-English documents produces 8 items (adds translations)', () => {
      const answers = {
        scope: {
          confirmedTouristPurpose: 'yes',
          confirmedVisaPathway: 'yes',
          confirmedOffshoreApplication: 'yes'
        },
        applicant: {
          isEmployed: 'no'
        },
        documents: {
          hasNonEnglishDocuments: 'yes'
        }
      };

      const effects = evaluateQuestionEffects(answers);
      const items = generateChecklist(
        effects.answersForChecklist,
        auVisitorRoutePack.items as ChecklistItem[],
        auVisitorRoutePack.rules as ChecklistRule[]
      );

      expect(items).toHaveLength(8);
      const itemIds = items.map((i) => i.id);

      expect(itemIds).toContain('au.visitor.documents.translations');
      expect(itemIds).not.toContain('au.visitor.ties.employmentLetter');
    });

    it('Scenario 4 (Employed + Non-English): Employed applicant with non-English documents produces all 9 items', () => {
      const answers = {
        scope: {
          confirmedTouristPurpose: 'yes',
          confirmedVisaPathway: 'yes',
          confirmedOffshoreApplication: 'yes'
        },
        applicant: {
          isEmployed: 'yes'
        },
        documents: {
          hasNonEnglishDocuments: 'yes'
        }
      };

      const effects = evaluateQuestionEffects(answers);
      const items = generateChecklist(
        effects.answersForChecklist,
        auVisitorRoutePack.items as ChecklistItem[],
        auVisitorRoutePack.rules as ChecklistRule[]
      );

      expect(items).toHaveLength(9);
      const itemIds = items.map((i) => i.id);

      expect(itemIds).toContain('au.visitor.identity.passport');
      expect(itemIds).toContain('au.visitor.funds.financialSupport');
      expect(itemIds).toContain('au.visitor.travel.plans');
      expect(itemIds).toContain('au.visitor.ties.reasonsToReturn');
      expect(itemIds).toContain('au.visitor.ties.employmentLetter');
      expect(itemIds).toContain('au.visitor.documents.translations');
      expect(itemIds).toContain('au.visitor.procedures.healthExaminations');
      expect(itemIds).toContain('au.visitor.procedures.biometricsNotice');
      expect(itemIds).toContain('au.visitor.submission.immiAccountCheck');
    });
  });

  describe('Question effects, scope guards, and recovery behavior', () => {
    it('returns empty validation errors and empty warnings for fully supported baseline inputs', () => {
      const input = {
        scope: {
          confirmedTouristPurpose: 'yes',
          confirmedVisaPathway: 'yes',
          confirmedOffshoreApplication: 'yes'
        },
        applicant: { isEmployed: 'yes' },
        documents: { hasNonEnglishDocuments: 'no' }
      };

      const result = evaluateQuestionEffects(input);
      expect(result.answersForChecklist).toEqual(input);
      expect(result.validationErrors).toEqual({});
      expect(result.warnings).toEqual({});
    });

    it('triggers a hard scope guard validation error when confirmedTouristPurpose is other', () => {
      const unsupportedPurpose = {
        scope: {
          confirmedTouristPurpose: 'other',
          confirmedVisaPathway: 'yes',
          confirmedOffshoreApplication: 'yes'
        }
      };

      const result = evaluateQuestionEffects(unsupportedPurpose);
      expect(result.validationErrors['scope.confirmedTouristPurpose']).toBe(
        '当前路线仅覆盖个人旅游或度假访问准备，其他访问目的暂不在支持范围内。'
      );

      // Recovers when corrected to yes
      const corrected = {
        scope: {
          confirmedTouristPurpose: 'yes',
          confirmedVisaPathway: 'yes',
          confirmedOffshoreApplication: 'yes'
        }
      };
      const recoveredResult = evaluateQuestionEffects(corrected);
      expect(recoveredResult.validationErrors['scope.confirmedTouristPurpose']).toBeUndefined();
    });

    it('triggers a hard scope guard validation error when confirmedOffshoreApplication is no', () => {
      const onshoreApp = {
        scope: {
          confirmedTouristPurpose: 'yes',
          confirmedVisaPathway: 'yes',
          confirmedOffshoreApplication: 'no'
        }
      };

      const result = evaluateQuestionEffects(onshoreApp);
      expect(result.validationErrors['scope.confirmedOffshoreApplication']).toBe(
        '当前路线仅覆盖在澳大利亚境外递交申请，并在签证决定时仍位于澳大利亚境外的 Tourist stream 准备场景。其他情况暂不在支持范围内。'
      );

      // Recovers when corrected to yes
      const corrected = {
        scope: {
          confirmedTouristPurpose: 'yes',
          confirmedVisaPathway: 'yes',
          confirmedOffshoreApplication: 'yes'
        }
      };
      const recoveredResult = evaluateQuestionEffects(corrected);
      expect(recoveredResult.validationErrors['scope.confirmedOffshoreApplication']).toBeUndefined();
    });

    it('triggers a non-blocking warning when confirmedVisaPathway is need_check', () => {
      const needsPathwayCheck = {
        scope: {
          confirmedTouristPurpose: 'yes',
          confirmedVisaPathway: 'need_check',
          confirmedOffshoreApplication: 'yes'
        }
      };

      const result = evaluateQuestionEffects(needsPathwayCheck);
      expect(result.validationErrors['scope.confirmedVisaPathway']).toBeUndefined();
      expect(result.warnings['scope.confirmedVisaPathway']).toBe(
        '请先通过澳大利亚官方渠道确认是否需要申请 Visitor visa (subclass 600) Tourist stream。VisaHelper 不判断 subclass 600、ETA 601、eVisitor 651 或其他签证途径的适用性。'
      );

      // Clears when confirmed
      const confirmed = {
        scope: {
          confirmedTouristPurpose: 'yes',
          confirmedVisaPathway: 'yes',
          confirmedOffshoreApplication: 'yes'
        }
      };
      const confirmedResult = evaluateQuestionEffects(confirmed);
      expect(confirmedResult.warnings['scope.confirmedVisaPathway']).toBeUndefined();
    });

    it('handles null or invalid answers gracefully in cleanAuVisitorStaleAnswers and evaluateQuestionEffects', () => {
      const cleaned = cleanAuVisitorStaleAnswers(null as unknown as Record<string, unknown>);
      expect(cleaned).toBeNull();

      const result = evaluateQuestionEffects(null as unknown as Record<string, unknown>);
      expect(result.answersForChecklist).toEqual({});
      expect(result.validationErrors).toEqual({});
      expect(result.warnings).toEqual({});
    });
  });
});
