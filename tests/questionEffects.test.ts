import { describe, expect, it } from 'vitest';
import {
  applicationTimingWarningMessage,
  arrivalAfterCourseEndMessage,
  arrivalAfterCourseStartWarning,
  courseDateInvalidMessage,
  courseDateOrderMessage,
  deferredPastCourseWarning,
  evaluateQuestionEffects,
  futureCourseAlreadyStartedMessage,
  intendedArrivalInvalidMessage,
  intendedArrivalPastMessage,
  pastCourseNotStartedMessage,
  removeHiddenFamilyRouteAnswers
} from '../src/content/nz/student-fee-paying/questionEffects';
import {
  addCalendarMonths,
  compareLocalDates,
  localDateFromDate,
  parseLocalDate
} from '../src/domain/localDate';

const localNow = new Date(2026, 0, 31, 23, 30);

function effects(answers: Record<string, unknown>) {
  return evaluateQuestionEffects(answers, { now: localNow });
}

function derived(result: ReturnType<typeof effects>) {
  return result.answersForChecklist._effects as Record<string, unknown>;
}

describe('local-calendar date handling', () => {
  it('parses valid date-only values and rejects impossible or non-date values', () => {
    expect(parseLocalDate('2026-02-28')).toEqual({ year: 2026, month: 2, day: 28 });
    expect(parseLocalDate('2026-02-29')).toBeNull();
    expect(parseLocalDate('2024-02-29')).toEqual({ year: 2024, month: 2, day: 29 });
    expect(parseLocalDate('2026-2-28')).toBeNull();
    expect(parseLocalDate(new Date())).toBeNull();
  });

  it('uses local date parts without a UTC date conversion', () => {
    expect(localDateFromDate(localNow)).toEqual({ year: 2026, month: 1, day: 31 });
  });

  it('adds calendar months and clamps to the last day of the target month', () => {
    expect(addCalendarMonths({ year: 2026, month: 1, day: 31 }, 1))
      .toEqual({ year: 2026, month: 2, day: 28 });
    expect(addCalendarMonths({ year: 2026, month: 1, day: 31 }, 3))
      .toEqual({ year: 2026, month: 4, day: 30 });
    expect(compareLocalDates(
      { year: 2026, month: 4, day: 30 },
      { year: 2026, month: 4, day: 29 }
    )).toBeGreaterThan(0);
  });
});

describe('Task C1 question effects', () => {
  it('blocks a course end date before the start date', () => {
    const result = effects({
      study: {
        courseStart: '2026-08-10',
        courseEnd: '2026-08-09'
      }
    });

    expect(result.validationErrors).toEqual({
      'study.courseEnd': courseDateOrderMessage
    });
  });

  it('allows equal course dates', () => {
    const result = effects({
      study: {
        courseStart: '2026-08-10',
        courseEnd: '2026-08-10'
      }
    });

    expect(result.validationErrors).toEqual({});
  });

  it('reports malformed course dates without converting them through Date', () => {
    const result = effects({
      study: {
        courseStart: '2026-02-30',
        courseEnd: 'not-a-date'
      }
    });

    expect(result.validationErrors).toEqual({
      'study.courseStart': courseDateInvalidMessage,
      'study.courseEnd': courseDateInvalidMessage
    });
  });

  it('marks a past course start for contextual guidance without blocking it', () => {
    const result = effects({
      study: {
        courseStart: '2026-01-30',
        courseStatus: 'already_started'
      }
    });

    expect(result.validationErrors).toEqual({});
    expect(derived(result).courseStartPast).toBe(true);
  });

  it.each([
    ['2026-01-30', 'not_started', pastCourseNotStartedMessage],
    ['2026-02-01', 'already_started', futureCourseAlreadyStartedMessage],
    ['2026-01-30', 'unclear', undefined],
    ['2026-01-31', 'not_started', undefined]
  ])(
    'validates course start %s against status %s',
    (courseStart, courseStatus, expected) => {
      const result = effects({ study: { courseStart, courseStatus } });

      expect(result.validationErrors['study.courseStatus']).toBe(expected);
    }
  );

  it('warns without blocking when a past course start is deferred or changed', () => {
    const result = effects({
      study: {
        courseStart: '2026-01-30',
        courseStatus: 'deferred_or_changed'
      }
    });

    expect(result.validationErrors['study.courseStatus']).toBeUndefined();
    expect(result.warnings['study.courseStatus']).toBe(deferredPastCourseWarning);
  });

  it.each([
    ['offshore', intendedArrivalPastMessage],
    ['onshore', undefined],
    ['unclear', undefined]
  ])('applies past intended-arrival validation for %s context', (locationContext, expected) => {
    const result = effects({
      travel: {
        locationContext,
        intendedArrivalDate: '2026-01-30'
      }
    });

    expect(result.validationErrors['travel.intendedArrivalDate']).toBe(expected);
  });

  it('reports an invalid intended-arrival date in every location context', () => {
    const result = effects({
      travel: {
        locationContext: 'onshore',
        intendedArrivalDate: '2026-02-30'
      }
    });

    expect(result.validationErrors['travel.intendedArrivalDate'])
      .toBe(intendedArrivalInvalidMessage);
  });

  it('warns when offshore arrival is after course start but not after course end', () => {
    const result = effects({
      study: {
        courseStart: '2026-02-10',
        courseEnd: '2026-03-10'
      },
      travel: {
        locationContext: 'offshore',
        intendedArrivalDate: '2026-02-11'
      }
    });

    expect(result.validationErrors['travel.intendedArrivalDate']).toBeUndefined();
    expect(result.warnings['travel.intendedArrivalDate']).toBe(arrivalAfterCourseStartWarning);
  });

  it('blocks when offshore arrival is after course end', () => {
    const result = effects({
      study: {
        courseStart: '2026-02-10',
        courseEnd: '2026-03-10'
      },
      travel: {
        locationContext: 'offshore',
        intendedArrivalDate: '2026-03-11'
      }
    });

    expect(result.validationErrors['travel.intendedArrivalDate']).toBe(
      arrivalAfterCourseEndMessage
    );
    expect(result.warnings['travel.intendedArrivalDate']).toBeUndefined();
  });

  it('does not apply course-arrival comparisons outside the offshore context', () => {
    const result = effects({
      study: {
        courseStart: '2026-02-10',
        courseEnd: '2026-03-10'
      },
      travel: {
        locationContext: 'onshore',
        intendedArrivalDate: '2026-03-11'
      }
    });

    expect(result.validationErrors['travel.intendedArrivalDate']).toBeUndefined();
    expect(result.warnings['travel.intendedArrivalDate']).toBeUndefined();
  });

  it.each([
    ['2026-04-29', 'not_submitted', true],
    ['2026-04-30', 'not_submitted', false],
    ['2026-05-01', 'not_submitted', false],
    ['2026-04-29', 'submitted', false],
    ['2026-04-29', 'unclear', false]
  ] as const)(
    'evaluates the calendar-month warning for arrival %s and stage %s',
    (intendedArrivalDate, stage, expected) => {
      const result = effects({
        travel: {
          locationContext: 'offshore',
          intendedArrivalDate
        },
        application: { stage }
      });

      expect(derived(result).applicationTimingSoon).toBe(expected);
      expect(result.warnings['application.stage']).toBe(
        expected ? applicationTimingWarningMessage : undefined
      );
    }
  );

  it.each(['onshore', 'unclear'])(
    'does not show the offshore timing warning for %s location',
    (locationContext) => {
      const result = effects({
        travel: {
          locationContext,
          intendedArrivalDate: '2026-04-29'
        },
        application: { stage: 'not_submitted' }
      });

      expect(derived(result).applicationTimingSoon).toBe(false);
    }
  );

  it('does not mutate answers while adding non-persisted derived fields', () => {
    const answers = {
      study: { courseStart: '2026-01-30' },
      unknown: { preserved: true }
    };
    const original = structuredClone(answers);

    const result = effects(answers);

    expect(answers).toEqual(original);
    expect(result.answersForChecklist).not.toBe(answers);
    expect(result.answersForChecklist.unknown).toEqual({ preserved: true });
  });
});

const completeMaterialProfile = {
  education: {
    recordContexts: ['completed_qualification', 'currently_enrolled']
  },
  english: {
    providerEvidenceStatus: 'available'
  },
  documents: {
    originContext: 'mainland_china',
    nonEnglishEvidenceStatus: 'none_known'
  },
  family: {
    linkedApplicationContext: 'none'
  }
};

describe('material-background effects', () => {
  it.each([
    ['education.recordContexts', { ...completeMaterialProfile, education: {} }],
    ['english.providerEvidenceStatus', { ...completeMaterialProfile, english: {} }],
    ['documents.originContext', {
      ...completeMaterialProfile,
      documents: { nonEnglishEvidenceStatus: 'none_known' }
    }],
    ['family.linkedApplicationContext', { ...completeMaterialProfile, family: {} }],
    ['documents.nonEnglishEvidenceStatus', {
      ...completeMaterialProfile,
      documents: { originContext: 'mainland_china' }
    }]
  ])('marks the profile incomplete when %s is missing', (_field, answers) => {
    expect(derived(effects(answers)).materialProfileIncomplete).toBe(true);
  });

  it.each([
    [],
    'completed_qualification',
    ['unknown'],
    ['completed_qualification', 'completed_qualification'],
    ['completed_qualification', 'other_or_unclear']
  ])('fails closed for invalid education contexts %#', (recordContexts) => {
    const result = effects({
      ...completeMaterialProfile,
      education: { recordContexts }
    });

    expect(derived(result).materialProfileIncomplete).toBe(true);
  });

  it('treats education multi-select ordering as equivalent', () => {
    const first = effects(completeMaterialProfile);
    const second = effects({
      ...completeMaterialProfile,
      education: {
        recordContexts: ['currently_enrolled', 'completed_qualification']
      }
    });

    expect(derived(first).materialProfileIncomplete).toBe(false);
    expect(derived(second).materialProfileIncomplete).toBe(false);
  });

  it.each([
    ['english', { providerEvidenceStatus: 'invalid' }],
    ['documents', {
      originContext: 'invalid',
      nonEnglishEvidenceStatus: 'none_known'
    }],
    ['family', { linkedApplicationContext: 'invalid' }],
    ['documents', {
      originContext: 'mainland_china',
      nonEnglishEvidenceStatus: 'invalid'
    }]
  ])('fails closed for an invalid %s value', (section, invalidSection) => {
    const result = effects({
      ...completeMaterialProfile,
      [section]: invalidSection
    });

    expect(derived(result).materialProfileIncomplete).toBe(true);
  });

  it.each([
    ['partner', undefined, undefined, true],
    ['partner', 'partner_student_work', undefined, false],
    ['partner', 'partner_student_visitor', undefined, false],
    ['partner', 'undecided', undefined, false],
    ['dependent_child', undefined, undefined, true],
    ['dependent_child', undefined, 'dependent_child_student', false],
    ['dependent_child', undefined, 'child_student_visitor', false],
    ['dependent_child', undefined, 'undecided', false],
    ['partner_and_child', undefined, undefined, true],
    ['partner_and_child', 'partner_student_work', undefined, true],
    ['partner_and_child', undefined, 'dependent_child_student', true],
    ['partner_and_child', 'undecided', 'undecided', false],
    ['none', undefined, undefined, false],
    ['unclear', undefined, undefined, false]
  ] as const)(
    'applies the V6 completion contract for %s / %s / %s',
    (linkedApplicationContext, partnerVisaRoute, childVisaRoute, expected) => {
      const result = effects({
        ...completeMaterialProfile,
        family: { linkedApplicationContext, partnerVisaRoute, childVisaRoute }
      });

      expect(derived(result).materialProfileIncomplete).toBe(expected);
    }
  );

  it.each([
    ['available', false],
    ['pending_or_conditional', false],
    ['provider_confirmed_not_required', false],
    ['other_or_unclear', false]
  ])('accepts English evidence status %s', (providerEvidenceStatus, expected) => {
    const result = effects({
      ...completeMaterialProfile,
      english: { providerEvidenceStatus }
    });
    expect(derived(result).materialProfileIncomplete).toBe(expected);
  });

  it.each([
    ['completed_qualification'],
    ['currently_enrolled'],
    ['incomplete_or_withdrawn'],
    ['other_or_unclear'],
    ['completed_qualification', 'currently_enrolled', 'incomplete_or_withdrawn']
  ])('accepts education contexts %#', (...recordContexts) => {
    const result = effects({
      ...completeMaterialProfile,
      education: { recordContexts }
    });
    expect(derived(result).materialProfileIncomplete).toBe(false);
  });

  it.each(['mainland_china', 'other', 'mixed', 'unclear'])(
    'accepts document origin %s without inferring language',
    (originContext) => {
      const result = effects({
        ...completeMaterialProfile,
        documents: {
          originContext,
          nonEnglishEvidenceStatus: 'none_known'
        }
      });
      expect(derived(result)).toEqual(expect.objectContaining({
        materialProfileIncomplete: false,
        translationReview: false
      }));
    }
  );

  it('derives study-rationale and chronology effects only from valid values', () => {
    const valid = effects({
      ...completeMaterialProfile,
      background: {
        applicantType: 'employed_or_previously_employed',
        studyRelation: 'adjacent_capability',
        hasGap: false
      }
    });
    const invalid = effects({
      ...completeMaterialProfile,
      background: {
        applicantType: 'invalid',
        studyRelation: 'continuation',
        hasGap: false
      }
    });
    const gapOnly = effects({
      ...completeMaterialProfile,
      background: { hasGap: true }
    });

    expect(derived(valid)).toEqual(expect.objectContaining({
      studyRationaleSupport: true,
      chronologySummary: true
    }));
    expect(derived(invalid)).toEqual(expect.objectContaining({
      studyRationaleSupport: false,
      chronologySummary: false
    }));
    expect(derived(gapOnly).chronologySummary).toBe(true);
  });

  it.each([
    ['overseas_third_party', true],
    ['nz_sponsorship', true],
    ['mixed', true],
    ['own_funds', false],
    ['invalid', false],
    [undefined, false]
  ])('derives supporter review for funding %s', (arrangementType, expected) => {
    const result = effects({
      ...completeMaterialProfile,
      funding: { arrangementType }
    });
    expect(derived(result).supporterRelationshipReview).toBe(expected);
  });

  it.each([
    ['none', false, false],
    ['partner', true, false],
    ['dependent_child', false, true],
    ['partner_and_child', true, true],
    ['unclear', false, false],
    ['invalid', false, false]
  ])(
    'derives family reviews for %s',
    (linkedApplicationContext, partnerExpected, childExpected) => {
      const result = effects({
        ...completeMaterialProfile,
        family: { linkedApplicationContext }
      });
      expect(derived(result)).toEqual(expect.objectContaining({
        partnerRelationshipReview: partnerExpected,
        childRelationshipReview: childExpected
      }));
    }
  );

  it.each([
    ['none_known', false],
    ['includes_non_english', true],
    ['unclear', true],
    ['invalid', false],
    [undefined, false]
  ])('derives translation review for %s', (nonEnglishEvidenceStatus, expected) => {
    const result = effects({
      ...completeMaterialProfile,
      documents: {
        originContext: 'mainland_china',
        nonEnglishEvidenceStatus
      }
    });
    expect(derived(result).translationReview).toBe(expected);
  });

  it('does not infer translation review from document origin', () => {
    const result = effects({
      ...completeMaterialProfile,
      documents: {
        originContext: 'mainland_china',
        nonEnglishEvidenceStatus: 'none_known'
      }
    });
    expect(derived(result).translationReview).toBe(false);
  });

  it('requires an explicit checklist-generation context for documentIndex', () => {
    expect(derived(effects(completeMaterialProfile)).documentIndex).toBe(false);
    const generated = evaluateQuestionEffects(completeMaterialProfile, {
      now: localNow,
      checklistGenerated: true
    });
    expect((generated.answersForChecklist._effects as Record<string, unknown>).documentIndex)
      .toBe(true);
  });
});

describe('V6 hidden family-route answer cleanup', () => {
  it.each([
    [
      'partner_and_child to partner',
      {
        linkedApplicationContext: 'partner',
        partnerVisaRoute: 'partner_student_work',
        childVisaRoute: 'dependent_child_student'
      },
      {
        linkedApplicationContext: 'partner',
        partnerVisaRoute: 'partner_student_work'
      }
    ],
    [
      'partner to none',
      { linkedApplicationContext: 'none', partnerVisaRoute: 'partner_student_visitor' },
      { linkedApplicationContext: 'none' }
    ],
    [
      'dependent child to unclear',
      { linkedApplicationContext: 'unclear', childVisaRoute: 'child_student_visitor' },
      { linkedApplicationContext: 'unclear' }
    ]
  ])('clears stale routes for %s', (_label, family, expectedFamily) => {
    const answers = {
      family: { ...family, unknownNested: 'synthetic' },
      unknownSection: { preserved: true }
    };
    const original = structuredClone(answers);

    const cleaned = removeHiddenFamilyRouteAnswers(answers);

    expect(answers).toEqual(original);
    expect(cleaned).toEqual({
      family: { ...expectedFamily, unknownNested: 'synthetic' },
      unknownSection: { preserved: true }
    });
  });
});
