import { describe, expect, it } from 'vitest';
import {
  CA_EMPLOYER_SPECIFIC_WORK_PERMIT_ROUTE_ID,
  caEmployerSpecificWorkPermitRoutePack,
  evaluateQuestionEffects,
  cleanCaEswpStaleAnswers
} from '../src/content/ca/employer-specific-work-permit';
import questionsJson from '../src/content/ca/employer-specific-work-permit/questions.zh-CN.json';
import checklistItemsJson from '../src/content/ca/employer-specific-work-permit/checklist-items.zh-CN.json';
import rulesJson from '../src/content/ca/employer-specific-work-permit/rules.json';
import sourcesJson from '../src/content/ca/employer-specific-work-permit/sources.json';
import { isRegisteredRouteId, getRoutePack } from '../src/content/registry';
import { formatRoutePrimaryLabel } from '../src/i18n';
import { generateChecklist } from '../src/domain/checklist';
import type { ChecklistItem, ChecklistRule } from '../src/domain/types';

function getChecklist(answers: Record<string, unknown>): ChecklistItem[] {
  const effects = evaluateQuestionEffects(answers);
  return generateChecklist(
    effects.answersForChecklist,
    caEmployerSpecificWorkPermitRoutePack.items as ChecklistItem[],
    caEmployerSpecificWorkPermitRoutePack.rules as ChecklistRule[]
  );
}

describe('Canada Employer-Specific Work Permit RoutePack (WP-04)', () => {
  it('conforms to the RoutePack interface with valid work metadata and route-scoped assets', () => {
    expect(CA_EMPLOYER_SPECIFIC_WORK_PERMIT_ROUTE_ID).toBe('ca-employer-specific-work-permit');
    expect(caEmployerSpecificWorkPermitRoutePack.id).toBe('ca-employer-specific-work-permit');
    expect(caEmployerSpecificWorkPermitRoutePack.jurisdiction).toBe('ca');
    expect(caEmployerSpecificWorkPermitRoutePack.routeCategory).toBe('work');
    expect(caEmployerSpecificWorkPermitRoutePack.title).toBe('加拿大雇主特定工签材料准备清单（境外申请）');
    expect(caEmployerSpecificWorkPermitRoutePack.eyebrow).toBe('Employer-specific work permit');
    expect(caEmployerSpecificWorkPermitRoutePack.authorityName).toBe(
      'Immigration, Refugees and Citizenship Canada（IRCC）'
    );
    expect(caEmployerSpecificWorkPermitRoutePack.defaultExportFileName).toBe(
      'ca-employer-specific-work-permit-checklist.json'
    );

    expect(
      formatRoutePrimaryLabel(
        caEmployerSpecificWorkPermitRoutePack.jurisdiction,
        caEmployerSpecificWorkPermitRoutePack.routeCategory
      )
    ).toBe('加拿大 · 工作签证');

    expect(caEmployerSpecificWorkPermitRoutePack.questions).toEqual(questionsJson);
    expect(caEmployerSpecificWorkPermitRoutePack.items).toEqual(checklistItemsJson);
    expect(caEmployerSpecificWorkPermitRoutePack.rules).toEqual(rulesJson);
    expect(caEmployerSpecificWorkPermitRoutePack.sources).toEqual(sourcesJson);

    expect(typeof caEmployerSpecificWorkPermitRoutePack.evaluateEffects).toBe('function');
    expect(typeof caEmployerSpecificWorkPermitRoutePack.cleanStaleAnswers).toBe('function');
    expect(caEmployerSpecificWorkPermitRoutePack.immediateEffectFields).toBeDefined();
    expect(caEmployerSpecificWorkPermitRoutePack.immediateEffectFields?.length).toBeGreaterThan(0);
  });

  it('is registered in the runtime registry and resolves properly', () => {
    expect(isRegisteredRouteId('ca-employer-specific-work-permit')).toBe(true);
    expect(getRoutePack('ca-employer-specific-work-permit')).toBe(caEmployerSpecificWorkPermitRoutePack);
  });

  it('verifies that every checklist item references an existing source in sources.json', () => {
    const sourceIds = caEmployerSpecificWorkPermitRoutePack.sources.map((s) => s.id);
    expect(sourceIds).toContain('ircc.work-permit.employer-specific');
    expect(sourceIds).toContain('ircc.work-permit.outside-documents');
    expect(sourceIds).toHaveLength(2);

    expect(caEmployerSpecificWorkPermitRoutePack.items).toHaveLength(16);
    for (const item of caEmployerSpecificWorkPermitRoutePack.items) {
      expect(item.sourceIds.length).toBeGreaterThan(0);
      for (const sId of item.sourceIds) {
        expect(sourceIds).toContain(sId);
      }
    }
  });

  it('generates exactly the 12 baseline items when answers are empty or minimal', () => {
    const emptyAnswers = {};
    const items = getChecklist(emptyAnswers);

    expect(items).toHaveLength(12);

    const itemIds = items.map((i) => i.id);
    // 3 general outside application baseline items
    expect(itemIds).toContain('ca.eswp.form.imm1295');
    expect(itemIds).toContain('ca.eswp.identity.passport');
    expect(itemIds).toContain('ca.eswp.identity.photo');

    // 5 employer/qualification baseline items
    expect(itemIds).toContain('ca.eswp.employment.contract');
    expect(itemIds).toContain('ca.eswp.skills.resume');
    expect(itemIds).toContain('ca.eswp.skills.currentEmployment');
    expect(itemIds).toContain('ca.eswp.skills.pastReferences');
    expect(itemIds).toContain('ca.eswp.skills.jobQualifications');

    // 3 default may_be_requested items
    expect(itemIds).toContain('ca.eswp.health.medicalExam');
    expect(itemIds).toContain('ca.eswp.character.policeCertificate');
    expect(itemIds).toContain('ca.eswp.visaOffice.instructionsReview');

    // 1 product guidance consistency check item
    expect(itemIds).toContain('ca.eswp.review.consistency');

    // conditional items must NOT be present
    expect(itemIds).not.toContain('ca.eswp.pathway.lmiaCopy');
    expect(itemIds).not.toContain('ca.eswp.pathway.jobOfferLetter');
    expect(itemIds).not.toContain('ca.eswp.pathway.offerOfEmploymentNumber');
    expect(itemIds).not.toContain('ca.eswp.docs.translation');

    // removed implementation-scope items must NOT be present
    expect(itemIds).not.toContain('ca.eswp.status.currentResidence');
    expect(itemIds).not.toContain('ca.eswp.skills.credentials');
    expect(itemIds).not.toContain('ca.eswp.skills.experience');
    expect(itemIds).not.toContain('ca.eswp.biometrics.instruction');
  });

  it('correctly adds LMIA copy and Job Offer Letter for LMIA-required pathway', () => {
    const lmiaAnswers = {
      scope: {
        confirmedEmployerSpecificPermit: 'yes',
        workLocationScope: 'outside_quebec'
      },
      employment: {
        lmiaPathway: 'lmia_required'
      },
      document: {
        hasNonEnglishDocuments: 'no'
      }
    };

    const items = getChecklist(lmiaAnswers);

    expect(items).toHaveLength(14); // 12 baseline + 2 LMIA-required
    const itemIds = items.map((i) => i.id);

    expect(itemIds).toContain('ca.eswp.pathway.lmiaCopy');
    expect(itemIds).toContain('ca.eswp.pathway.jobOfferLetter');
    expect(itemIds).not.toContain('ca.eswp.pathway.offerOfEmploymentNumber');
    expect(itemIds).not.toContain('ca.eswp.docs.translation');
  });

  it('correctly adds Offer of Employment Number for LMIA-exempt Employer Portal pathway', () => {
    const lmiaExemptAnswers = {
      scope: {
        confirmedEmployerSpecificPermit: 'yes',
        workLocationScope: 'outside_quebec'
      },
      employment: {
        lmiaPathway: 'lmia_exempt_employer_portal'
      },
      document: {
        hasNonEnglishDocuments: 'no'
      }
    };

    const items = getChecklist(lmiaExemptAnswers);

    expect(items).toHaveLength(13); // 12 baseline + 1 LMIA-exempt
    const itemIds = items.map((i) => i.id);

    expect(itemIds).toContain('ca.eswp.pathway.offerOfEmploymentNumber');
    expect(itemIds).not.toContain('ca.eswp.pathway.lmiaCopy');
    expect(itemIds).not.toContain('ca.eswp.pathway.jobOfferLetter');
    expect(itemIds).not.toContain('ca.eswp.docs.translation');
  });

  it('correctly branches non-English document translation requirement', () => {
    const withTranslation = getChecklist({
      document: { hasNonEnglishDocuments: 'yes' }
    });
    expect(withTranslation.map((i) => i.id)).toContain('ca.eswp.docs.translation');

    const withoutTranslation = getChecklist({
      document: { hasNonEnglishDocuments: 'no' }
    });
    expect(withoutTranslation.map((i) => i.id)).not.toContain('ca.eswp.docs.translation');
  });

  it('generates all 15 items when LMIA-required pathway and translation are both triggered', () => {
    const maxAnswers = {
      scope: {
        confirmedEmployerSpecificPermit: 'yes',
        workLocationScope: 'outside_quebec'
      },
      employment: {
        lmiaPathway: 'lmia_required'
      },
      document: {
        hasNonEnglishDocuments: 'yes'
      }
    };

    const items = getChecklist(maxAnswers);
    expect(items).toHaveLength(15);
    const itemIds = items.map((i) => i.id);
    expect(itemIds).toContain('ca.eswp.pathway.lmiaCopy');
    expect(itemIds).toContain('ca.eswp.pathway.jobOfferLetter');
    expect(itemIds).toContain('ca.eswp.docs.translation');
  });

  it('produces non-blocking warnings on need_check, quebec, and unsupported exception responses without blocking progress', () => {
    const needCheckAnswers = {
      scope: {
        confirmedEmployerSpecificPermit: 'need_check',
        workLocationScope: 'need_check'
      },
      employment: {
        lmiaPathway: 'need_check'
      }
    };

    const effects = evaluateQuestionEffects(needCheckAnswers);
    expect(effects.validationErrors).toEqual({});
    expect(Object.keys(effects.warnings).sort()).toEqual([
      'employment.lmiaPathway',
      'scope.confirmedEmployerSpecificPermit',
      'scope.workLocationScope'
    ]);
    for (const warning of Object.values(effects.warnings)) {
      expect(warning.length).toBeGreaterThan(0);
    }

    // Quebec warning check
    const quebecEffects = evaluateQuestionEffects({
      scope: { workLocationScope: 'quebec' }
    });
    expect(quebecEffects.warnings['scope.workLocationScope']).toBeDefined();
    expect(quebecEffects.warnings['scope.workLocationScope'].length).toBeGreaterThan(0);

    // Unsupported LMIA-exempt exception warning check
    const exceptionEffects = evaluateQuestionEffects({
      employment: { lmiaPathway: 'lmia_exempt_other_or_exception' }
    });
    expect(exceptionEffects.warnings['employment.lmiaPathway']).toBeDefined();
    expect(exceptionEffects.warnings['employment.lmiaPathway'].length).toBeGreaterThan(0);

    // When answered with standard clear responses, no warnings or errors are produced
    const clearAnswers = {
      scope: {
        confirmedEmployerSpecificPermit: 'yes',
        workLocationScope: 'outside_quebec'
      },
      employment: {
        lmiaPathway: 'lmia_required'
      },
      document: {
        hasNonEnglishDocuments: 'no'
      }
    };

    const clearEffects = evaluateQuestionEffects(clearAnswers);
    expect(clearEffects.warnings).toEqual({});
    expect(clearEffects.validationErrors).toEqual({});
  });

  it('preserves cleanStaleAnswers as a safe pure function', () => {
    const rawAnswers = {
      scope: { confirmedEmployerSpecificPermit: 'yes' },
      employment: { lmiaPathway: 'lmia_required' }
    };
    const cleaned = cleanCaEswpStaleAnswers(rawAnswers);
    expect(cleaned).toEqual(rawAnswers);
    expect(cleaned).not.toBe(rawAnswers);
  });

  it('strictly respects architectural boundaries: no employer entity, no NOC/TEER codes, no salary thresholds, no family workflow', () => {
    const rawQuestionsStr = JSON.stringify(questionsJson);

    // No employer data model or enterprise entity
    expect(rawQuestionsStr).not.toContain('employerName');
    expect(rawQuestionsStr).not.toContain('employerAddress');
    expect(rawQuestionsStr).not.toContain('businessNumber');
    expect(rawQuestionsStr).not.toContain('craNumber');

    // No application numbers or credentials collected in survey
    expect(rawQuestionsStr).not.toContain('lmiaNumber');
    expect(rawQuestionsStr).not.toContain('offerOfEmploymentNumber');

    // No NOC / TEER engine
    expect(rawQuestionsStr).not.toContain('nocCode');
    expect(rawQuestionsStr).not.toContain('teerCategory');
    expect(rawQuestionsStr).not.toContain('jobTitleClassification');

    // No salary or wage engine
    expect(rawQuestionsStr).not.toContain('hourlyRate');
    expect(rawQuestionsStr).not.toContain('prevailingWage');
    expect(rawQuestionsStr).not.toContain('salaryAmount');

    // No family or dependent workflows
    expect(rawQuestionsStr).not.toContain('spouse');
    expect(rawQuestionsStr).not.toContain('partner');
    expect(rawQuestionsStr).not.toContain('dependentChild');

    // Exactly 4 questions collected across 3 pages
    const surveyPages = (questionsJson.pages as Array<{ elements: Array<{ name?: string }> }>);
    const surveyFieldNames = surveyPages.flatMap((p) => p.elements.map((e) => e.name)).filter(Boolean);
    expect(surveyFieldNames).toHaveLength(4);
    expect(surveyFieldNames).toEqual([
      'scope.confirmedEmployerSpecificPermit',
      'scope.workLocationScope',
      'employment.lmiaPathway',
      'document.hasNonEnglishDocuments'
    ]);
  });
});
