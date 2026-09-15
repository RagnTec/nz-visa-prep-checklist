import { describe, expect, it } from 'vitest';
import {
  NZ_AEWV_ROUTE_ID,
  nzAewvRoutePack,
  evaluateQuestionEffects,
  cleanNzAewvStaleAnswers
} from '../src/content/nz/aewv';
import questionsJson from '../src/content/nz/aewv/questions.zh-CN.json';
import checklistItemsJson from '../src/content/nz/aewv/checklist-items.zh-CN.json';
import rulesJson from '../src/content/nz/aewv/rules.json';
import sourcesJson from '../src/content/nz/aewv/sources.json';
import { isRegisteredRouteId, getRoutePack } from '../src/content/registry';
import { formatRoutePrimaryLabel } from '../src/i18n';
import { generateChecklist } from '../src/domain/checklist';
import type { ChecklistItem, ChecklistRule } from '../src/domain/types';

function getChecklist(answers: Record<string, unknown>): ChecklistItem[] {
  const effects = evaluateQuestionEffects(answers);
  return generateChecklist(
    effects.answersForChecklist,
    nzAewvRoutePack.items as ChecklistItem[],
    nzAewvRoutePack.rules as ChecklistRule[]
  );
}

describe('NZ Accredited Employer Work Visa (AEWV) RoutePack (WP-02)', () => {
  it('conforms to the RoutePack interface with valid work metadata and route-scoped assets', () => {
    expect(NZ_AEWV_ROUTE_ID).toBe('nz-aewv');
    expect(nzAewvRoutePack.id).toBe('nz-aewv');
    expect(nzAewvRoutePack.jurisdiction).toBe('nz');
    expect(nzAewvRoutePack.routeCategory).toBe('work');
    expect(nzAewvRoutePack.title).toBe('新西兰认可雇主工作签证材料准备清单');
    expect(nzAewvRoutePack.eyebrow).toBe('Accredited Employer Work Visa');
    expect(nzAewvRoutePack.authorityName).toBe('Immigration New Zealand（INZ）');
    expect(nzAewvRoutePack.defaultExportFileName).toBe('nz-aewv-work-visa-checklist.json');

    expect(formatRoutePrimaryLabel(nzAewvRoutePack.jurisdiction, nzAewvRoutePack.routeCategory)).toBe(
      '新西兰 · 工作签证'
    );

    expect(nzAewvRoutePack.questions).toEqual(questionsJson);
    expect(nzAewvRoutePack.items).toEqual(checklistItemsJson);
    expect(nzAewvRoutePack.rules).toEqual(rulesJson);
    expect(nzAewvRoutePack.sources).toEqual(sourcesJson);

    expect(typeof nzAewvRoutePack.evaluateEffects).toBe('function');
    expect(typeof nzAewvRoutePack.cleanStaleAnswers).toBe('function');
    expect(nzAewvRoutePack.immediateEffectFields).toBeDefined();
    expect(nzAewvRoutePack.immediateEffectFields?.length).toBeGreaterThan(0);
  });

  it('is registered in the runtime registry and resolves properly', () => {
    expect(isRegisteredRouteId('nz-aewv')).toBe(true);
    expect(getRoutePack('nz-aewv')).toBe(nzAewvRoutePack);
  });

  it('verifies that every checklist item references an existing source in sources.json', () => {
    const sourceIds = nzAewvRoutePack.sources.map((s) => s.id);
    expect(sourceIds).toContain('inz.aewv');
    expect(sourceIds).toContain('inz.aewv.english');
    expect(sourceIds).toContain('inz.police-certificates');
    expect(sourceIds).toContain('inz.english-translations');
    expect(sourceIds).toContain('inz.visa-photo');
    expect(sourceIds).toHaveLength(5);

    expect(nzAewvRoutePack.items).toHaveLength(15);
    for (const item of nzAewvRoutePack.items) {
      expect(item.sourceIds.length).toBeGreaterThan(0);
      for (const sId of item.sourceIds) {
        expect(sourceIds).toContain(sId);
      }
    }
  });

  it('generates exactly the 8 baseline items when answers are empty or minimal', () => {
    const emptyAnswers = {};
    const items = getChecklist(emptyAnswers);

    expect(items).toHaveLength(8);

    const itemIds = items.map((i) => i.id);
    // 5 usually_required official evidence items
    expect(itemIds).toContain('nz.aewv.identity.passport');
    expect(itemIds).toContain('nz.aewv.identity.photo');
    expect(itemIds).toContain('nz.aewv.employment.jobOffer');
    expect(itemIds).toContain('nz.aewv.employment.employmentAgreement');
    expect(itemIds).toContain('nz.aewv.employment.jobDescription');

    // 1 may_be_requested default follow-up item
    expect(itemIds).toContain('nz.aewv.health.medicalExam');

    // 2 product organisation guidance items
    expect(itemIds).toContain('nz.aewv.review.jobRequirements');
    expect(itemIds).toContain('nz.aewv.review.consistency');

    // conditional items must NOT be present
    expect(itemIds).not.toContain('nz.aewv.skills.workExperience');
    expect(itemIds).not.toContain('nz.aewv.skills.qualification');
    expect(itemIds).not.toContain('nz.aewv.skills.registration');
    expect(itemIds).not.toContain('nz.aewv.skills.english');
    expect(itemIds).not.toContain('nz.aewv.health.chestXray');
    expect(itemIds).not.toContain('nz.aewv.character.policeCertificate');
    expect(itemIds).not.toContain('nz.aewv.docs.translationReview');
  });

  it('generates all 15 items when all conditional triggers are met', () => {
    const maxAnswers = {
      scope: { confirmedAewvPathway: 'yes' },
      skills: {
        minimumSkillEvidenceStatus: 'both',
        registrationStatus: 'required'
      },
      english: { requirementStatus: 'required' },
      health: {
        intendedStayOver6Months: 'yes',
        hasTbRiskHistory: 'yes'
      },
      character: { totalStayInNz24MonthsOrMore: 'yes' },
      document: { hasNonEnglishDocuments: 'yes' }
    };

    const items = getChecklist(maxAnswers);

    expect(items).toHaveLength(15);
    const itemIds = items.map((i) => i.id);

    expect(itemIds).toContain('nz.aewv.skills.workExperience');
    expect(itemIds).toContain('nz.aewv.skills.qualification');
    expect(itemIds).toContain('nz.aewv.skills.registration');
    expect(itemIds).toContain('nz.aewv.skills.english');
    expect(itemIds).toContain('nz.aewv.health.chestXray');
    expect(itemIds).toContain('nz.aewv.character.policeCertificate');
    expect(itemIds).toContain('nz.aewv.docs.translationReview');
  });

  it('correctly branches minimum skill evidence options', () => {
    // work_experience only
    const weItems = getChecklist({
      skills: { minimumSkillEvidenceStatus: 'work_experience' }
    });
    const weIds = weItems.map((i) => i.id);
    expect(weIds).toContain('nz.aewv.skills.workExperience');
    expect(weIds).not.toContain('nz.aewv.skills.qualification');

    // qualification only
    const qualItems = getChecklist({
      skills: { minimumSkillEvidenceStatus: 'qualification' }
    });
    const qualIds = qualItems.map((i) => i.id);
    expect(qualIds).not.toContain('nz.aewv.skills.workExperience');
    expect(qualIds).toContain('nz.aewv.skills.qualification');

    // both
    const bothItems = getChecklist({
      skills: { minimumSkillEvidenceStatus: 'both' }
    });
    const bothIds = bothItems.map((i) => i.id);
    expect(bothIds).toContain('nz.aewv.skills.workExperience');
    expect(bothIds).toContain('nz.aewv.skills.qualification');

    // no_additional_evidence
    const noneItems = getChecklist({
      skills: { minimumSkillEvidenceStatus: 'no_additional_evidence' }
    });
    const noneIds = noneItems.map((i) => i.id);
    expect(noneIds).not.toContain('nz.aewv.skills.workExperience');
    expect(noneIds).not.toContain('nz.aewv.skills.qualification');
  });

  it('correctly branches occupational registration requirement', () => {
    const requiredItems = getChecklist({
      skills: { registrationStatus: 'required' }
    });
    expect(requiredItems.map((i) => i.id)).toContain('nz.aewv.skills.registration');

    const notRequiredItems = getChecklist({
      skills: { registrationStatus: 'not_required' }
    });
    expect(notRequiredItems.map((i) => i.id)).not.toContain('nz.aewv.skills.registration');
  });

  it('correctly branches English language requirement', () => {
    const requiredItems = getChecklist({
      english: { requirementStatus: 'required' }
    });
    expect(requiredItems.map((i) => i.id)).toContain('nz.aewv.skills.english');

    const notRequiredItems = getChecklist({
      english: { requirementStatus: 'not_required' }
    });
    expect(notRequiredItems.map((i) => i.id)).not.toContain('nz.aewv.skills.english');
  });

  it('evaluates health requirements with stay over 6 months and TB risk history', () => {
    // stay <= 6 months, TB risk no
    const shortStay = getChecklist({
      health: { intendedStayOver6Months: 'no', hasTbRiskHistory: 'no' }
    });
    expect(shortStay.map((i) => i.id)).not.toContain('nz.aewv.health.chestXray');
    expect(shortStay.map((i) => i.id)).toContain('nz.aewv.health.medicalExam');

    // stay > 6 months, TB risk no
    const longStayNoTb = getChecklist({
      health: { intendedStayOver6Months: 'yes', hasTbRiskHistory: 'no' }
    });
    expect(longStayNoTb.map((i) => i.id)).not.toContain('nz.aewv.health.chestXray');
    expect(longStayNoTb.map((i) => i.id)).toContain('nz.aewv.health.medicalExam');

    // stay > 6 months, TB risk yes
    const longStayWithTb = getChecklist({
      health: { intendedStayOver6Months: 'yes', hasTbRiskHistory: 'yes' }
    });
    expect(longStayWithTb.map((i) => i.id)).toContain('nz.aewv.health.chestXray');
    expect(longStayWithTb.map((i) => i.id)).toContain('nz.aewv.health.medicalExam');
  });

  it('cleans stale TB risk answer when stay over 6 months changes to no', () => {
    const staleAnswers = {
      health: {
        intendedStayOver6Months: 'no',
        hasTbRiskHistory: 'yes'
      },
      skills: {
        minimumSkillEvidenceStatus: 'work_experience'
      }
    };

    const cleaned = cleanNzAewvStaleAnswers(staleAnswers);
    expect((cleaned.health as Record<string, unknown>).hasTbRiskHistory).toBeUndefined();
    expect((cleaned.health as Record<string, unknown>).intendedStayOver6Months).toBe('no');
    expect((cleaned.skills as Record<string, unknown>).minimumSkillEvidenceStatus).toBe('work_experience');
  });

  it('evaluates police certificate requirement for total stay >= 24 months', () => {
    const stayOver24m = getChecklist({
      character: { totalStayInNz24MonthsOrMore: 'yes' }
    });
    expect(stayOver24m.map((i) => i.id)).toContain('nz.aewv.character.policeCertificate');

    const stayUnder24m = getChecklist({
      character: { totalStayInNz24MonthsOrMore: 'no' }
    });
    expect(stayUnder24m.map((i) => i.id)).not.toContain('nz.aewv.character.policeCertificate');
  });

  it('evaluates translation review item when applicant has non-English documents', () => {
    const hasNonEnglish = getChecklist({
      document: { hasNonEnglishDocuments: 'yes' }
    });
    expect(hasNonEnglish.map((i) => i.id)).toContain('nz.aewv.docs.translationReview');

    const allEnglish = getChecklist({
      document: { hasNonEnglishDocuments: 'no' }
    });
    expect(allEnglish.map((i) => i.id)).not.toContain('nz.aewv.docs.translationReview');
  });

  it('produces non-blocking warnings on need_check responses without blocking progress', () => {
    const needCheckAnswers = {
      scope: { confirmedAewvPathway: 'need_check' },
      skills: {
        minimumSkillEvidenceStatus: 'need_check',
        registrationStatus: 'need_check'
      },
      english: { requirementStatus: 'need_check' }
    };

    const effects = evaluateQuestionEffects(needCheckAnswers);

    expect(effects.validationErrors).toEqual({});

    expect(Object.keys(effects.warnings).sort()).toEqual([
      'english.requirementStatus',
      'scope.confirmedAewvPathway',
      'skills.minimumSkillEvidenceStatus',
      'skills.registrationStatus'
    ]);

    for (const warning of Object.values(effects.warnings)) {
      expect(warning.length).toBeGreaterThan(0);
    }


    // when answered with clear responses, no warnings are produced
    const clearAnswers = {
      scope: { confirmedAewvPathway: 'yes' },
      skills: {
        minimumSkillEvidenceStatus: 'work_experience',
        registrationStatus: 'not_required'
      },
      english: { requirementStatus: 'not_required' }
    };

    const clearEffects = evaluateQuestionEffects(clearAnswers);
    expect(clearEffects.warnings).toEqual({});
    expect(clearEffects.validationErrors).toEqual({});
  });

  it('strictly respects architectural boundaries: no employer entity, no salary thresholds, no ANZSCO codes', () => {
    const rawQuestionsStr = JSON.stringify(questionsJson);

    // No employer data model or enterprise entity
    expect(rawQuestionsStr).not.toContain('employerName');
    expect(rawQuestionsStr).not.toContain('accreditationNumber');
    expect(rawQuestionsStr).not.toContain('nzbn');

    // No salary or wage engine
    expect(rawQuestionsStr).not.toContain('hourlyRate');
    expect(rawQuestionsStr).not.toContain('medianWage');
    expect(rawQuestionsStr).not.toContain('salaryAmount');

    // No ANZSCO or occupation engine
    expect(rawQuestionsStr).not.toContain('anzscoCode');
    expect(rawQuestionsStr).not.toContain('greenList');

    // No family or partner workflows
    expect(rawQuestionsStr).not.toContain('partner');
    expect(rawQuestionsStr).not.toContain('dependentChild');

    // Anti-regression: Survey content must not introduce application-link or job-token fields
    const surveyPages = (questionsJson.pages as Array<{ elements: Array<{ name?: string }> }>);
    const surveyFieldNames = surveyPages.flatMap((p) => p.elements.map((e) => e.name)).filter(Boolean) as string[];
    for (const name of surveyFieldNames) {
      expect(name.toLowerCase()).not.toMatch(/(applicationlink|applylink|jobtoken|token)/);
    }

    // Anti-regression: Checklist items must not introduce application-link or job-token items
    const checklistItemIds = (checklistItemsJson as Array<{ id: string }>).map((i) => i.id);
    for (const id of checklistItemIds) {
      expect(id.toLowerCase()).not.toMatch(/(applicationlink|applylink|jobtoken|token)/);
    }

    // Unique application link is highlighted as route-level process guidance in description
    expect(nzAewvRoutePack.description).toContain('唯一链接');
  });
});
