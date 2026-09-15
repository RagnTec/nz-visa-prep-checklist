import { describe, expect, it } from 'vitest';
import {
  NZ_POST_STUDY_WORK_ROUTE_ID,
  nzPostStudyWorkRoutePack,
  evaluateQuestionEffects,
  cleanNzPostStudyWorkStaleAnswers
} from '../src/content/nz/post-study-work';
import questionsJson from '../src/content/nz/post-study-work/questions.zh-CN.json';
import checklistItemsJson from '../src/content/nz/post-study-work/checklist-items.zh-CN.json';
import rulesJson from '../src/content/nz/post-study-work/rules.json';
import sourcesJson from '../src/content/nz/post-study-work/sources.json';
import { isRegisteredRouteId, getRoutePack } from '../src/content/registry';
import { formatRoutePrimaryLabel } from '../src/i18n';
import { generateChecklist } from '../src/domain/checklist';
import type { ChecklistItem, ChecklistRule } from '../src/domain/types';

function getChecklist(answers: Record<string, unknown>): ChecklistItem[] {
  const effects = evaluateQuestionEffects(answers);
  return generateChecklist(
    effects.answersForChecklist,
    nzPostStudyWorkRoutePack.items as ChecklistItem[],
    nzPostStudyWorkRoutePack.rules as ChecklistRule[]
  );
}

describe('New Zealand Post-Study Work Visa RoutePack (WP-08)', () => {
  it('1: conforms to RoutePack interface with correct route identity and metadata', () => {
    expect(NZ_POST_STUDY_WORK_ROUTE_ID).toBe('nz-post-study-work');
    expect(nzPostStudyWorkRoutePack.id).toBe('nz-post-study-work');
    expect(nzPostStudyWorkRoutePack.jurisdiction).toBe('nz');
    expect(nzPostStudyWorkRoutePack.routeCategory).toBe('work');
    expect(nzPostStudyWorkRoutePack.eyebrow).toBe('Post-Study Work Visa');
    expect(nzPostStudyWorkRoutePack.title).toBe('新西兰毕业后工作签证材料准备清单');
    expect(nzPostStudyWorkRoutePack.authorityName).toBe('Immigration New Zealand（INZ）');
    expect(nzPostStudyWorkRoutePack.defaultExportFileName).toBe(
      'nz-post-study-work-checklist.json'
    );

    expect(
      formatRoutePrimaryLabel(
        nzPostStudyWorkRoutePack.jurisdiction,
        nzPostStudyWorkRoutePack.routeCategory
      )
    ).toBe('新西兰 · 工作签证');

    expect(nzPostStudyWorkRoutePack.questions).toEqual(questionsJson);
    expect(nzPostStudyWorkRoutePack.items).toEqual(checklistItemsJson);
    expect(nzPostStudyWorkRoutePack.rules).toEqual(rulesJson);
    expect(nzPostStudyWorkRoutePack.sources).toEqual(sourcesJson);

    expect(typeof nzPostStudyWorkRoutePack.evaluateEffects).toBe('function');
    expect(typeof nzPostStudyWorkRoutePack.cleanStaleAnswers).toBe('function');
    expect(nzPostStudyWorkRoutePack.immediateEffectFields).toBeDefined();
    expect(nzPostStudyWorkRoutePack.immediateEffectFields?.length).toBe(5);

    expect(isRegisteredRouteId('nz-post-study-work')).toBe(true);
    expect(getRoutePack('nz-post-study-work')).toBe(nzPostStudyWorkRoutePack);
  });

  it('2: contains exactly 5 Survey signals on a single scope page', () => {
    const pages = (questionsJson as { pages: Array<{ name: string; elements: Array<{ name: string }> }> }).pages;
    expect(pages).toHaveLength(1);
    expect(pages[0].name).toBe('scope');

    const elementNames = pages[0].elements.map((e) => e.name);
    expect(elementNames).toHaveLength(5);
    expect(elementNames).toEqual([
      'scope.confirmedPostStudyWork',
      'study.qualificationPathway',
      'timing.applicationWindowStatus',
      'history.previousPostStudyWorkVisa',
      'documents.hasNonEnglishDocuments'
    ]);
  });

  it('3: ensures forbidden Survey data fields and calculators are absent', () => {
    const questionsString = JSON.stringify(questionsJson);

    expect(questionsString).not.toContain('bankBalance');
    expect(questionsString).not.toContain('accountNumber');
    expect(questionsString).not.toContain('employerName');
    expect(questionsString).not.toContain('jobCheck');
    expect(questionsString).not.toContain('nzqcfCode');
    expect(questionsString).not.toContain('studyWeeks');
    expect(questionsString).not.toContain('expiryDate');
  });

  it('4: contains exactly 15 checklist items with proper types and structural roles', () => {
    const items = nzPostStudyWorkRoutePack.items;
    expect(items).toHaveLength(15);

    // Baseline completion evidence
    const completionItem = items.find((i) => i.id === 'nz.psw.qualification.completionEvidence');
    expect(completionItem).toBeDefined();
    expect(completionItem?.defaultIncluded).toBe(true);
    expect(completionItem?.requirementType).toBe('usually_required');

    // Study requirement review
    const studyReviewItem = items.find((i) => i.id === 'nz.psw.study.requirementReview');
    expect(studyReviewItem).toBeDefined();
    expect(studyReviewItem?.defaultIncluded).toBe(true);
    expect(studyReviewItem?.requirementType).toBe('usually_required');

    // Application process
    const processItem = items.find((i) => i.id === 'nz.psw.process.applicationPreparation');
    expect(processItem).toBeDefined();
    expect(processItem?.defaultIncluded).toBe(true);
    expect(processItem?.evidenceLayer).toBe('inz_visa');

    // Health and character are may_be_requested
    const healthItem = items.find((i) => i.id === 'nz.psw.health.medicalReview');
    expect(healthItem?.requirementType).toBe('may_be_requested');

    const policeItem = items.find((i) => i.id === 'nz.psw.character.police');
    expect(policeItem?.requirementType).toBe('may_be_requested');
  });

  it('5: baseline checklist generation returns exactly 11 default-included items with empty answers', () => {
    const emptyAnswers = {};
    const items = getChecklist(emptyAnswers);
    expect(items).toHaveLength(11);

    const itemIds = items.map((i) => i.id);
    expect(itemIds).toContain('nz.psw.identity.passport');
    expect(itemIds).toContain('nz.psw.identity.photo');
    expect(itemIds).toContain('nz.psw.qualification.completionEvidence');
    expect(itemIds).toContain('nz.psw.study.requirementReview');
    expect(itemIds).toContain('nz.psw.timing.windowCheck');
    expect(itemIds).toContain('nz.psw.funds.maintenance');
    expect(itemIds).toContain('nz.psw.health.medicalReview');
    expect(itemIds).toContain('nz.psw.character.police');
    expect(itemIds).toContain('nz.psw.process.applicationPreparation');
    expect(itemIds).toContain('nz.psw.guidance.workRights');
    expect(itemIds).toContain('nz.psw.review.consistency');

    // Conditional items are not included by default
    expect(itemIds).not.toContain('nz.psw.pathway.nonDegreeList');
    expect(itemIds).not.toContain('nz.psw.pathway.bachelorDegree');
    expect(itemIds).not.toContain('nz.psw.pathway.gradDipTranscript');
    expect(itemIds).not.toContain('nz.psw.document.translation');
  });

  it('6: conditionally includes pathway and translation items based on Survey answers', () => {
    // 6.1 Non-degree pathway adds nonDegreeList item
    const nonDegreeChecklist = getChecklist({
      study: { qualificationPathway: 'eligible_non_degree_level_4_7' }
    });
    expect(nonDegreeChecklist).toHaveLength(12);
    expect(nonDegreeChecklist.map((i) => i.id)).toContain('nz.psw.pathway.nonDegreeList');

    // 6.2 Graduate diploma pathway adds bachelorDegree and gradDipTranscript
    const gradDipChecklist = getChecklist({
      study: { qualificationPathway: 'level_7_graduate_diploma' }
    });
    expect(gradDipChecklist).toHaveLength(13);
    expect(gradDipChecklist.map((i) => i.id)).toContain('nz.psw.pathway.bachelorDegree');
    expect(gradDipChecklist.map((i) => i.id)).toContain('nz.psw.pathway.gradDipTranscript');

    // 6.3 Translation adds translation item on yes or need_check
    const translationChecklistYes = getChecklist({
      documents: { hasNonEnglishDocuments: 'yes' }
    });
    expect(translationChecklistYes).toHaveLength(12);
    expect(translationChecklistYes.map((i) => i.id)).toContain('nz.psw.document.translation');

    const translationChecklistNeedCheck = getChecklist({
      documents: { hasNonEnglishDocuments: 'need_check' }
    });
    expect(translationChecklistNeedCheck).toHaveLength(12);
    expect(translationChecklistNeedCheck.map((i) => i.id)).toContain('nz.psw.document.translation');

    // 6.4 Grad diploma + translation combined produces 14 items
    const combinedChecklist = getChecklist({
      study: { qualificationPathway: 'level_7_graduate_diploma' },
      documents: { hasNonEnglishDocuments: 'yes' }
    });
    expect(combinedChecklist).toHaveLength(14);
  });

  it('7: verifies that every checklist item references an existing source in sources.json', () => {
    const sourceIds = nzPostStudyWorkRoutePack.sources.map((s) => s.id);
    expect(sourceIds).toContain('inz.post-study-work');
    expect(sourceIds).toContain('inz.post-study-work.policy-change');
    expect(sourceIds).toContain('inz.post-study-work.eligible-qualifications');
    expect(sourceIds).toContain('inz.health-xray-medical');
    expect(sourceIds).toContain('inz.police-certificates');
    expect(sourceIds).toContain('inz.english-translations');

    for (const item of nzPostStudyWorkRoutePack.items) {
      expect(item.sourceIds.length).toBeGreaterThan(0);
      for (const sId of item.sourceIds) {
        expect(sourceIds).toContain(sId);
      }
    }
  });

  it('8: produces non-blocking warnings and zero validationErrors for boundary scope answers', () => {
    // 8.1 unconfirmed scope
    const r1 = evaluateQuestionEffects({
      scope: { confirmedPostStudyWork: 'need_check' }
    });
    expect(r1.validationErrors).toEqual({});
    expect(r1.warnings['scope.confirmedPostStudyWork']).toBeDefined();

    // 8.2 grad diploma pathway triggers notice with 2026-11-16 date
    const r2GradDip = evaluateQuestionEffects({
      study: { qualificationPathway: 'level_7_graduate_diploma' }
    });
    expect(r2GradDip.validationErrors).toEqual({});
    expect(r2GradDip.warnings['study.qualificationPathway']).toContain('2026 年 11 月 16 日');

    // 8.3 pathway need_check
    const r2Check = evaluateQuestionEffects({
      study: { qualificationPathway: 'need_check' }
    });
    expect(r2Check.validationErrors).toEqual({});
    expect(r2Check.warnings['study.qualificationPathway']).toBeDefined();

    // 8.4 outside applicable window
    const r3Outside = evaluateQuestionEffects({
      timing: { applicationWindowStatus: 'outside_applicable_window' }
    });
    expect(r3Outside.validationErrors).toEqual({});
    expect(r3Outside.warnings['timing.applicationWindowStatus']).toBeDefined();

    // 8.5 timing need_check
    const r3Check = evaluateQuestionEffects({
      timing: { applicationWindowStatus: 'need_check' }
    });
    expect(r3Check.validationErrors).toEqual({});
    expect(r3Check.warnings['timing.applicationWindowStatus']).toBeDefined();

    // 8.6 previous PSWV yes
    const r4Yes = evaluateQuestionEffects({
      history: { previousPostStudyWorkVisa: 'yes' }
    });
    expect(r4Yes.validationErrors).toEqual({});
    expect(r4Yes.warnings['history.previousPostStudyWorkVisa']).toBeDefined();

    // 8.7 previous PSWV need_check
    const r4Check = evaluateQuestionEffects({
      history: { previousPostStudyWorkVisa: 'need_check' }
    });
    expect(r4Check.validationErrors).toEqual({});
    expect(r4Check.warnings['history.previousPostStudyWorkVisa']).toBeDefined();
  });

  it('9: produces zero warnings when all scope answers confirm clear standard pathway', () => {
    const clearAnswers = {
      scope: { confirmedPostStudyWork: 'yes' },
      study: { qualificationPathway: 'degree_level_7_or_higher' },
      timing: { applicationWindowStatus: 'within_applicable_window' },
      history: { previousPostStudyWorkVisa: 'no' },
      documents: { hasNonEnglishDocuments: 'no' }
    };

    const effects = evaluateQuestionEffects(clearAnswers);
    expect(effects.validationErrors).toEqual({});
    expect(effects.warnings).toEqual({});
  });
});
