import { describe, expect, it } from 'vitest';
import { conditionMatches, evaluateRuleExpression, generateChecklist } from '../src/domain/checklist';
import { evaluateQuestionEffects } from '../src/content/nz/student-fee-paying/questionEffects';
import itemsJson from '../src/content/nz/student-fee-paying/checklist-items.zh-CN.json';
import rulesJson from '../src/content/nz/student-fee-paying/rules.json';
import type { ChecklistItem, ChecklistRule, RuleExpression } from '../src/domain/types';

const items = itemsJson as ChecklistItem[];
const rules = rulesJson as ChecklistRule[];

function materialAnswers(
  recordContexts: unknown,
  providerEvidenceStatus = 'available',
  originContext = 'other'
) {
  return {
    education: { recordContexts },
    english: { providerEvidenceStatus },
    documents: {
      originContext,
      nonEnglishEvidenceStatus: 'none_known'
    },
    family: { linkedApplicationContext: 'none' }
  };
}

describe('student visa checklist rules', () => {
  const fundingCases = [
    ['own_funds', 'funds.ownFunds'],
    ['overseas_third_party', 'funds.overseasThirdParty'],
    ['nz_sponsorship', 'funds.nzSponsorship'],
    ['scholarship', 'funds.scholarship'],
    ['education_loan', 'funds.educationLoan'],
    ['mixed', 'funds.mixed'],
    ['other_or_unclear', 'funds.otherOrUnclear']
  ] as const;
  const fundingItemIds = fundingCases.map(([, itemId]) => itemId);

  it.each(fundingCases)(
    'selects only the %s funding branch',
    (arrangementType, expectedItemId) => {
      const result = generateChecklist({ funding: { arrangementType } }, items, rules);
      const selectedFundingItems = result
        .map((item) => item.id)
        .filter((itemId) => fundingItemIds.includes(itemId as typeof fundingItemIds[number]));

      expect(selectedFundingItems).toEqual([expectedItemId]);
    }
  );

  it.each([
    ['own_funds', ['funds.bankStatements', 'funds.ownFunds']],
    ['overseas_third_party', ['funds.overseasThirdParty', 'funds.supporter']],
    ['nz_sponsorship', ['funds.nzSponsorship', 'funds.supporter']],
    ['scholarship', ['funds.scholarship']],
    ['education_loan', ['funds.educationLoan']],
    ['mixed', ['funds.mixed', 'funds.supporter']],
    ['other_or_unclear', ['funds.otherOrUnclear']]
  ] as const)(
    'generates the exact approved funding output for %s',
    (arrangementType, expectedIds) => {
      const answers = { funding: { arrangementType } };
      const withEffects = evaluateQuestionEffects(answers).answersForChecklist;
      const fundingIds = generateChecklist(withEffects, items, rules)
        .map((item) => item.id)
        .filter((id) => id.startsWith('funds.'));

      expect(fundingIds).toEqual(expectedIds);
    }
  );

  it('matches no funding arrangement for missing or invalid values', () => {
    for (const answers of [{}, { funding: { arrangementType: 'invalid' } }]) {
      const withEffects = evaluateQuestionEffects(answers).answersForChecklist;
      const fundingIds = generateChecklist(withEffects, items, rules)
        .map((item) => item.id)
        .filter((id) => id.startsWith('funds.'));

      expect(fundingIds).toEqual([]);
    }
  });

  it('keeps the large-deposit task independent from the funding arrangement', () => {
    const answers = {
      funding: {
        arrangementType: 'scholarship',
        largeRecentDeposit: true
      }
    };
    const withEffects = evaluateQuestionEffects(answers).answersForChecklist;
    const itemIds = generateChecklist(withEffects, items, rules).map((item) => item.id);

    expect(itemIds).toContain('funds.scholarship');
    expect(itemIds).toContain('funds.largeDeposit');
    expect(itemIds).not.toContain('funds.bankStatements');
    expect(itemIds).not.toContain('funds.supporter');
  });

  it.each([
    ['overseas_third_party', 'funds.supporter.overseasThirdParty'],
    ['nz_sponsorship', 'funds.supporter.nzSponsorship'],
    ['mixed', 'funds.supporter.mixed']
  ] as const)(
    'selects only the %s supporter guidance',
    (arrangementType, expectedGuidanceId) => {
      const withEffects = evaluateQuestionEffects({
        funding: { arrangementType }
      }).answersForChecklist;
      const supporter = generateChecklist(withEffects, items, rules)
        .find((item) => item.id === 'funds.supporter');

      expect(supporter?.guidanceBlocks?.map((block) => block.id))
        .toEqual([expectedGuidanceId]);
      expect(supporter?.conditionalGuidanceBlocks).toBeUndefined();
    }
  );

  it.each([
    ['mainland_china', ['completed_qualification']],
    ['mixed', ['completed_qualification']],
    ['mainland_china', ['completed_qualification', 'currently_enrolled']]
  ] as const)(
    'includes mainland document naming for %s with valid completed study contexts',
    (originContext, recordContexts) => {
      const withEffects = evaluateQuestionEffects(
        materialAnswers(recordContexts, 'available', originContext)
      ).answersForChecklist;

      expect(generateChecklist(withEffects, items, rules).map((item) => item.id))
        .toContain('education.mainlandDocumentNaming');
    }
  );

  it.each([
    ['other', ['completed_qualification']],
    ['unclear', ['completed_qualification']],
    ['mainland_china', ['currently_enrolled']],
    ['mainland_china', ['incomplete_or_withdrawn']],
    ['mainland_china', ['currently_enrolled', 'incomplete_or_withdrawn']],
    ['mainland_china', ['other_or_unclear']],
    ['mainland_china', ['completed_qualification', 'other_or_unclear']],
    ['mainland_china', { malformed: true }]
  ] as const)(
    'omits mainland document naming for origin %s and education context %#',
    (originContext, recordContexts) => {
      const withEffects = evaluateQuestionEffects(
        materialAnswers(recordContexts, 'available', originContext)
      ).answersForChecklist;

      expect(generateChecklist(withEffects, items, rules).map((item) => item.id))
        .not.toContain('education.mainlandDocumentNaming');
    }
  );

  it('selects the approved Offer status guidance for an existing Offer', () => {
    const result = generateChecklist({ study: { hasOffer: true } }, items, rules);
    const offer = result.find((item) => item.id === 'study.offer');

    expect(offer?.guidanceBlocks?.map((block) => block.id))
      .toEqual(['study.offer.statusReview']);
    expect(result.map((item) => item.id)).not.toContain('study.offer.pending');
  });

  it('selects the pending Offer task when an Offer is absent', () => {
    const result = generateChecklist({ study: { hasOffer: false } }, items, rules);
    const offer = result.find((item) => item.id === 'study.offer');

    expect(result.map((item) => item.id)).toContain('study.offer.pending');
    expect(result.map((item) => item.id)).not.toContain('study.offer');
    expect(offer?.guidanceBlocks).toBeUndefined();
  });

  it('matches neither Offer item when the answer is missing or invalid', () => {
    for (const answers of [{}, { study: { hasOffer: 'invalid' } }]) {
      const itemIds = generateChecklist(answers, items, rules).map((item) => item.id);
      expect(itemIds).not.toContain('study.offer');
      expect(itemIds).not.toContain('study.offer.pending');
    }
  });

  it.each([
    ['not_started', 'study.courseStartPast.notStarted'],
    ['already_started', 'study.courseStartPast.alreadyStarted'],
    ['deferred_or_changed', 'study.courseStartPast.deferredOrChanged'],
    ['unclear', 'study.courseStartPast.unclear']
  ] as const)(
    'shows contextual past-date guidance for course status %s',
    (courseStatus, expectedGuidanceId) => {
      const now = new Date(2026, 6, 30, 12);
      const answers = {
        study: {
          courseStart: '2026-07-29',
          courseStatus
        }
      };
      const withEffects = evaluateQuestionEffects(answers, { now }).answersForChecklist;
      const result = generateChecklist(withEffects, items, rules);
      const pastDateItem = result.find((item) => item.id === 'study.courseStartPast');

      expect(result.map((item) => item.id)).toContain('study.courseTimeline');
      expect(pastDateItem?.guidanceBlocks?.map((block) => block.id))
        .toEqual([expectedGuidanceId]);
    }
  );

  it('includes the timing warning only when the derived local-calendar condition matches', () => {
    const now = new Date(2026, 6, 30, 12);
    const answers = {
      travel: {
        locationContext: 'offshore',
        intendedArrivalDate: '2026-10-29'
      },
      application: {
        stage: 'not_submitted'
      }
    };
    const withEffects = evaluateQuestionEffects(answers, { now }).answersForChecklist;

    expect(generateChecklist(withEffects, items, rules).map((item) => item.id))
      .toContain('application.timingReview');
  });
});

describe('V6 family-route checklist branches', () => {
  const familyItemIds = [
    'family.partnerRelationship',
    'family.partnerRouteReview',
    'family.childRelationship',
    'family.childRouteReview'
  ];

  it.each([
    [
      { linkedApplicationContext: 'partner', partnerVisaRoute: 'partner_student_work' },
      ['family.partnerRelationship']
    ],
    [
      { linkedApplicationContext: 'partner', partnerVisaRoute: 'partner_student_visitor' },
      ['family.partnerRelationship']
    ],
    [
      { linkedApplicationContext: 'partner', partnerVisaRoute: 'undecided' },
      ['family.partnerRouteReview']
    ],
    [
      {
        linkedApplicationContext: 'dependent_child',
        childStudyPlan: 'more_than_3_months',
        childSupportBasis: 'student_parent',
        childVisaRoute: 'dependent_child_student'
      },
      ['family.childRelationship']
    ],
    [
      {
        linkedApplicationContext: 'dependent_child',
        childStudyPlan: 'no_long_term_study',
        childSupportBasis: 'student_parent',
        childVisaRoute: 'child_student_visitor'
      },
      ['family.childRelationship']
    ],
    [
      {
        linkedApplicationContext: 'dependent_child',
        childStudyPlan: 'more_than_3_months',
        childSupportBasis: 'work_visa_parent',
        childVisaRoute: 'dependent_child_student'
      },
      ['family.childRelationship']
    ],
    [
      {
        linkedApplicationContext: 'dependent_child',
        childStudyPlan: 'no_long_term_study',
        childSupportBasis: 'work_visa_parent',
        childVisaRoute: 'child_worker_visitor'
      },
      ['family.childRelationship']
    ],
    [
      {
        linkedApplicationContext: 'dependent_child',
        childStudyPlan: 'undecided',
        childSupportBasis: 'student_parent',
        childVisaRoute: 'dependent_child_student'
      },
      ['family.childRelationship', 'family.childRouteReview']
    ],
    [
      {
        linkedApplicationContext: 'dependent_child',
        childStudyPlan: 'more_than_3_months',
        childSupportBasis: 'undecided',
        childVisaRoute: 'undecided'
      },
      ['family.childRouteReview']
    ],
    [
      {
        linkedApplicationContext: 'dependent_child',
        childStudyPlan: 'more_than_3_months',
        childSupportBasis: 'student_parent',
        childVisaRoute: 'undecided'
      },
      ['family.childRouteReview']
    ],
    [
      {
        linkedApplicationContext: 'partner_and_child',
        partnerVisaRoute: 'partner_student_visitor',
        childStudyPlan: 'no_long_term_study',
        childApplicationArrangement: 'included_with_partner_student_visitor'
      },
      ['family.partnerRelationship', 'family.childRelationship']
    ],
    [
      {
        linkedApplicationContext: 'partner_and_child',
        partnerVisaRoute: 'partner_student_visitor',
        childStudyPlan: 'more_than_3_months',
        childApplicationArrangement: 'separate_child_application',
        childSupportBasis: 'student_parent',
        childVisaRoute: 'dependent_child_student'
      },
      ['family.partnerRelationship', 'family.childRelationship']
    ],
    [
      {
        linkedApplicationContext: 'dependent_child',
        childStudyPlan: 'more_than_3_months',
        childSupportBasis: 'student_parent',
        childVisaRoute: 'child_student_visitor'
      },
      ['family.childRelationship', 'family.childRouteReview']
    ],
    [
      {
        linkedApplicationContext: 'dependent_child',
        childStudyPlan: 'more_than_3_months',
        childSupportBasis: 'work_visa_parent',
        childVisaRoute: 'child_worker_visitor'
      },
      ['family.childRelationship', 'family.childRouteReview']
    ],
    [
      {
        linkedApplicationContext: 'partner_and_child',
        partnerVisaRoute: 'partner_student_visitor',
        childStudyPlan: 'more_than_3_months',
        childApplicationArrangement: 'included_with_partner_student_visitor'
      },
      ['family.partnerRelationship', 'family.childRelationship', 'family.childRouteReview']
    ],
    [
      {
        linkedApplicationContext: 'partner_and_child',
        partnerVisaRoute: 'partner_student_work',
        childStudyPlan: 'no_long_term_study',
        childSupportBasis: 'work_visa_parent',
        childVisaRoute: 'child_worker_visitor'
      },
      ['family.partnerRelationship', 'family.childRelationship']
    ],
    [
      {
        linkedApplicationContext: 'partner_and_child',
        partnerVisaRoute: 'undecided',
        childStudyPlan: 'more_than_3_months'
      },
      ['family.partnerRouteReview']
    ],
    [{ linkedApplicationContext: 'none' }, []],
    [{ linkedApplicationContext: 'unclear' }, []],
    [{ linkedApplicationContext: 'partner' }, []],
    [
      {
        linkedApplicationContext: 'none',
        partnerVisaRoute: 'partner_student_work',
        childSupportBasis: 'student_parent',
        childVisaRoute: 'dependent_child_student'
      },
      []
    ]
  ])('selects only the applicable family items for %#', (family, expectedIds) => {
    const selected = generateChecklist({ family }, items, rules)
      .map((item) => item.id)
      .filter((itemId) => familyItemIds.includes(itemId));

    expect(selected).toEqual(expectedIds);
  });
});

describe('route-specific material branches', () => {
  const b2bItemIds = [
    'family.partnerStudentWorkRouteMaterials',
    'family.partnerStudentVisitorRouteMaterials',
    'family.dependentChildStudentRouteMaterials',
    'family.childOfStudentVisitorRouteMaterials',
    'family.childOfWorkerVisitorRouteMaterials'
  ];

  function selectedFamilyItems(family: Record<string, unknown>) {
    return generateChecklist({ family }, items, rules)
      .filter((item) => b2bItemIds.includes(item.id));
  }

  it.each([
    [
      { linkedApplicationContext: 'partner', partnerVisaRoute: 'partner_student_work' },
      ['family.partnerStudentWorkRouteMaterials']
    ],
    [
      { linkedApplicationContext: 'partner', partnerVisaRoute: 'partner_student_visitor' },
      ['family.partnerStudentVisitorRouteMaterials']
    ],
    [
      {
        linkedApplicationContext: 'dependent_child',
        childStudyPlan: 'more_than_3_months',
        childSupportBasis: 'student_parent',
        childVisaRoute: 'dependent_child_student'
      },
      ['family.dependentChildStudentRouteMaterials']
    ],
    [
      {
        linkedApplicationContext: 'dependent_child',
        childStudyPlan: 'no_long_term_study',
        childSupportBasis: 'student_parent',
        childVisaRoute: 'child_student_visitor'
      },
      ['family.childOfStudentVisitorRouteMaterials']
    ],
    [
      {
        linkedApplicationContext: 'dependent_child',
        childStudyPlan: 'more_than_3_months',
        childSupportBasis: 'student_parent',
        childVisaRoute: 'child_student_visitor'
      },
      ['family.childOfStudentVisitorRouteMaterials']
    ],
    [
      {
        linkedApplicationContext: 'dependent_child',
        childStudyPlan: 'more_than_3_months',
        childSupportBasis: 'work_visa_parent',
        childVisaRoute: 'dependent_child_student'
      },
      ['family.dependentChildStudentRouteMaterials']
    ],
    [
      {
        linkedApplicationContext: 'dependent_child',
        childStudyPlan: 'no_long_term_study',
        childSupportBasis: 'work_visa_parent',
        childVisaRoute: 'child_worker_visitor'
      },
      ['family.childOfWorkerVisitorRouteMaterials']
    ],
    [
      {
        linkedApplicationContext: 'dependent_child',
        childStudyPlan: 'more_than_3_months',
        childSupportBasis: 'work_visa_parent',
        childVisaRoute: 'child_worker_visitor'
      },
      ['family.childOfWorkerVisitorRouteMaterials']
    ],
    [
      {
        linkedApplicationContext: 'partner_and_child',
        partnerVisaRoute: 'partner_student_visitor',
        childStudyPlan: 'no_long_term_study',
        childApplicationArrangement: 'included_with_partner_student_visitor'
      },
      ['family.partnerStudentVisitorRouteMaterials']
    ],
    [
      {
        linkedApplicationContext: 'partner_and_child',
        partnerVisaRoute: 'partner_student_work',
        childStudyPlan: 'no_long_term_study',
        childSupportBasis: 'work_visa_parent',
        childVisaRoute: 'child_worker_visitor'
      },
      [
        'family.partnerStudentWorkRouteMaterials',
        'family.childOfWorkerVisitorRouteMaterials'
      ]
    ],
    [
      {
        linkedApplicationContext: 'partner_and_child',
        partnerVisaRoute: 'undecided',
        childStudyPlan: 'undecided',
        childSupportBasis: 'undecided',
        childVisaRoute: 'undecided'
      },
      []
    ],
    [
      {
        linkedApplicationContext: 'partner_and_child',
        partnerVisaRoute: 'undecided',
        childStudyPlan: 'more_than_3_months'
      },
      []
    ],
    [
      {
        linkedApplicationContext: 'dependent_child',
        childStudyPlan: 'more_than_3_months',
        childSupportBasis: 'undecided'
      },
      []
    ],
    [
      {
        linkedApplicationContext: 'partner_and_child',
        partnerVisaRoute: 'partner_student_visitor',
        childStudyPlan: 'more_than_3_months',
        childApplicationArrangement: 'included_with_partner_student_visitor'
      },
      ['family.partnerStudentVisitorRouteMaterials']
    ],
    [
      {
        linkedApplicationContext: 'none',
        partnerVisaRoute: 'partner_student_work',
        childSupportBasis: 'work_visa_parent',
        childVisaRoute: 'dependent_child_student'
      },
      []
    ]
  ])('selects only explicit route materials for %#', (family, expectedIds) => {
    expect(selectedFamilyItems(family).map((item) => item.id)).toEqual(expectedIds);
  });

  it('renders student-parent vs work-visa-parent conditional guidance on dependent child student item', () => {
    const studentParentItem = selectedFamilyItems({
      linkedApplicationContext: 'dependent_child',
      childSupportBasis: 'student_parent',
      childVisaRoute: 'dependent_child_student'
    }).find((item) => item.id === 'family.dependentChildStudentRouteMaterials');

    const workVisaParentItem = selectedFamilyItems({
      linkedApplicationContext: 'dependent_child',
      childSupportBasis: 'work_visa_parent',
      childVisaRoute: 'dependent_child_student'
    }).find((item) => item.id === 'family.dependentChildStudentRouteMaterials');

    expect(studentParentItem?.guidanceBlocks?.map((b) => b.id))
      .toEqual(['family.dependentChildStudentRouteMaterials.studentParentBasis']);
    expect(workVisaParentItem?.guidanceBlocks?.map((b) => b.id))
      .toEqual(['family.dependentChildStudentRouteMaterials.workVisaParentBasis']);
  });

  it('renders childInclusionReview conditional guidance block on partner visitor item when child is included', () => {
    const includedChildItem = selectedFamilyItems({
      linkedApplicationContext: 'partner_and_child',
      partnerVisaRoute: 'partner_student_visitor',
      childStudyPlan: 'no_long_term_study',
      childApplicationArrangement: 'included_with_partner_student_visitor'
    }).find((item) => item.id === 'family.partnerStudentVisitorRouteMaterials');

    const separateChildItem = selectedFamilyItems({
      linkedApplicationContext: 'partner_and_child',
      partnerVisaRoute: 'partner_student_visitor',
      childStudyPlan: 'no_long_term_study',
      childApplicationArrangement: 'separate_child_application'
    }).find((item) => item.id === 'family.partnerStudentVisitorRouteMaterials');

    expect(includedChildItem?.guidanceBlocks?.map((b) => b.id))
      .toEqual(['family.partnerStudentVisitorRouteMaterials.childInclusionReview']);
    expect(separateChildItem?.guidanceBlocks?.map((b) => b.id) ?? []).toEqual([]);
  });

  it('keeps B2a undecided review output without adding B2b materials', () => {
    const result = generateChecklist({
      family: {
        linkedApplicationContext: 'partner_and_child',
        partnerVisaRoute: 'undecided',
        childStudyPlan: 'undecided',
        childSupportBasis: 'undecided',
        childVisaRoute: 'undecided'
      }
    }, items, rules);
    const ids = result.map((item) => item.id);

    expect(ids).toContain('family.partnerRouteReview');
    expect(ids).toContain('family.childRouteReview');
    expect(ids.some((id) => b2bItemIds.includes(id))).toBe(false);
  });

  it('shows child-inclusion guidance only for partner visitor when child is included in application', () => {
    const partnerOnly = selectedFamilyItems({
      linkedApplicationContext: 'partner',
      partnerVisaRoute: 'partner_student_visitor'
    })[0];
    const withIncludedChild = selectedFamilyItems({
      linkedApplicationContext: 'partner_and_child',
      partnerVisaRoute: 'partner_student_visitor',
      childStudyPlan: 'no_long_term_study',
      childApplicationArrangement: 'included_with_partner_student_visitor'
    }).find((item) => item.id === 'family.partnerStudentVisitorRouteMaterials');
    const withSeparateChild = selectedFamilyItems({
      linkedApplicationContext: 'partner_and_child',
      partnerVisaRoute: 'partner_student_visitor',
      childStudyPlan: 'more_than_3_months',
      childApplicationArrangement: 'separate_child_application',
      childSupportBasis: 'student_parent',
      childVisaRoute: 'dependent_child_student'
    }).find((item) => item.id === 'family.partnerStudentVisitorRouteMaterials');

    expect(partnerOnly?.guidanceBlocks).toBeUndefined();
    expect(withIncludedChild?.guidanceBlocks?.map((block) => block.id))
      .toEqual(['family.partnerStudentVisitorRouteMaterials.childInclusionReview']);
    expect(withSeparateChild?.guidanceBlocks).toBeUndefined();
  });
});

const applicantCases = [
  ['recent_graduate_no_formal_work', 'background.recentGraduateChronology'],
  ['employed_or_previously_employed', 'background.workChronology'],
  ['non_recent_graduate_no_formal_work', 'background.nonRecentNoWorkChronology'],
  ['other_or_unclear', 'background.otherChronology']
] as const;

const relationCases = [
  ['continuation', 'background.studyConnection.continuation'],
  ['adjacent_capability', 'background.studyConnection.adjacentCapability'],
  ['significant_transition', 'background.studyConnection.significantTransition'],
  ['unclear', 'background.studyConnection.unclear']
] as const;

const backgroundChronologyIds = applicantCases.map(([, itemId]) => itemId);

describe('applicant-background checklist branches', () => {
  it.each(applicantCases.flatMap(([applicantType, expectedItemId]) =>
    relationCases.map(([studyRelation, expectedGuidanceId]) => [
      applicantType,
      studyRelation,
      expectedItemId,
      expectedGuidanceId
    ] as const)
  ))(
    'selects one chronology and one guidance block for %s with %s',
    (applicantType, studyRelation, expectedItemId, expectedGuidanceId) => {
      const result = generateChecklist({
        background: {
          applicantType,
          studyRelation,
          hasGap: false
        }
      }, items, rules);
      const itemIds = result.map((item) => item.id);
      const chronologyIds = itemIds.filter((id) => backgroundChronologyIds.includes(
        id as typeof backgroundChronologyIds[number]
      ));
      const studyConnection = result.find((item) => item.id === 'background.studyConnection');

      expect(chronologyIds).toEqual([expectedItemId]);
      expect(itemIds).toContain('background.studyConnection');
      expect(itemIds).not.toContain('background.gap');
      expect(studyConnection?.guidanceBlocks?.map((block) => block.id))
        .toEqual([expectedGuidanceId]);
      expect(studyConnection?.conditionalGuidanceBlocks).toBeUndefined();
    }
  );

  it.each(applicantCases.flatMap(([applicantType, expectedItemId]) => [
    [applicantType, false, expectedItemId],
    [applicantType, true, expectedItemId]
  ] as const))(
    'keeps the %s chronology stable when gap is %s',
    (applicantType, hasGap, expectedItemId) => {
      const result = generateChecklist({
        background: {
          applicantType,
          studyRelation: 'continuation',
          hasGap
        }
      }, items, rules);
      const itemIds = result.map((item) => item.id);
      const studyConnection = result.find((item) => item.id === 'background.studyConnection');

      expect(itemIds).toContain(expectedItemId);
      expect(itemIds).toContain('background.studyConnection');
      expect(itemIds.includes('background.gap')).toBe(hasGap);
      expect(studyConnection?.guidanceBlocks?.map((block) => block.id))
        .toEqual(['background.studyConnection.continuation']);
    }
  );
});

describe('academic and english checklist branches', () => {
  const educationItemIds = [
    'education.completionEvidence',
    'education.transcripts',
    'education.gradingScale',
    'education.providerRequirementReview'
  ];
  const englishItemIds = ['english.providerEvidence', 'english.pendingCondition'];

  it.each([
    [['completed_qualification'], educationItemIds.slice(0, 3)],
    [['completed_qualification', 'currently_enrolled'], educationItemIds.slice(0, 3)],
    [['currently_enrolled'], []],
    [['incomplete_or_withdrawn'], []],
    [['currently_enrolled', 'incomplete_or_withdrawn'], []],
    [['other_or_unclear'], ['education.providerRequirementReview']]
  ] as const)('selects the approved education output for %j', (recordContexts, expectedIds) => {
    const answers = materialAnswers([...recordContexts]);
    const withEffects = evaluateQuestionEffects(answers).answersForChecklist;
    const selected = generateChecklist(withEffects, items, rules)
      .map((item) => item.id)
      .filter((id) => educationItemIds.includes(id));

    expect(selected).toEqual(expectedIds);
  });

  it.each([
    [['other_or_unclear', 'completed_qualification']],
    [['completed_qualification', 'unknown']],
    [[]],
    ['completed_qualification']
  ])('fails closed for invalid education contexts %j', (recordContexts) => {
    const answers = materialAnswers(recordContexts);
    const withEffects = evaluateQuestionEffects(answers).answersForChecklist;
    const selected = generateChecklist(withEffects, items, rules)
      .map((item) => item.id)
      .filter((id) => educationItemIds.includes(id));

    expect(selected).toEqual([]);
  });

  it.each([
    ['available', ['english.providerEvidence'], ['english.providerEvidence.available']],
    ['pending_or_conditional', ['english.pendingCondition'], []],
    ['provider_confirmed_not_required', [], []],
    ['other_or_unclear', ['english.providerEvidence'], ['english.providerEvidence.otherOrUnclear']]
  ] as const)('selects the approved English output for %s', (status, expectedIds, guidanceIds) => {
    const answers = materialAnswers(['completed_qualification'], status);
    const withEffects = evaluateQuestionEffects(answers).answersForChecklist;
    const result = generateChecklist(withEffects, items, rules);
    const selected = result.map((item) => item.id).filter((id) => englishItemIds.includes(id));
    const providerEvidence = result.find((item) => item.id === 'english.providerEvidence');

    expect(selected).toEqual(expectedIds);
    expect(providerEvidence?.guidanceBlocks?.map((block) => block.id) ?? []).toEqual(guidanceIds);
  });
});

describe('rule expression evaluation', () => {
  const answers = {
    background: {
      applicantType: 'employed_or_previously_employed',
      hasGap: false
    },
    funding: {
      source: 'parent'
    }
  };

  it.each([
    [{ field: 'funding.source', operator: 'equals', value: 'parent' }, true],
    [{ field: 'funding.source', operator: 'equals', value: 'self' }, false],
    [{ field: 'funding.source', operator: 'not_equals', value: 'self' }, true],
    [{ field: 'funding.source', operator: 'not_equals', value: 'parent' }, false],
    [{ field: 'funding.source', operator: 'in', value: ['parent', 'relative'] }, true],
    [{ field: 'funding.source', operator: 'in', value: ['self', 'relative'] }, false],
    [{ field: 'funding.source', operator: 'truthy' }, true],
    [{ field: 'background.hasGap', operator: 'truthy' }, false],
    [{ field: 'background.missing', operator: 'equals', value: true }, 'unknown']
  ] as const)('evaluates atomic condition %#', (expression, expected) => {
    expect(evaluateRuleExpression(expression, answers)).toBe(expected);
  });

  it('matches array members with contains without coercion or substring matching', () => {
    const data = { values: ['completed_qualification', 2, true] };

    expect(evaluateRuleExpression(
      { field: 'values', operator: 'contains', value: 'completed_qualification' }, data
    )).toBe(true);
    expect(evaluateRuleExpression(
      { field: 'values', operator: 'contains', value: 'completed' }, data
    )).toBe(false);
    expect(evaluateRuleExpression(
      { field: 'values', operator: 'contains', value: '2' }, data
    )).toBe(false);
  });

  it.each([
    [{}, 'completed_qualification'],
    [{ values: 'completed_qualification' }, 'completed_qualification'],
    [{ values: [] }, 'completed_qualification'],
    [{ values: ['completed_qualification', { malformed: true }] }, 'completed_qualification'],
    [{ values: ['completed_qualification'] }, null],
    [{ values: ['completed_qualification'] }, { malformed: true }],
    [{ values: ['completed_qualification'] }, Number.NaN],
    [{ values: [Number.NaN] }, Number.NaN]
  ])('fails closed for malformed contains input %#', (data, expected) => {
    expect(evaluateRuleExpression({
      field: 'values',
      operator: 'contains',
      value: expected
    }, data)).toBe(false);
  });

  it('evaluates all, any, not and nested expressions', () => {
    const expression: RuleExpression = {
      all: [
        { field: 'funding.source', operator: 'equals', value: 'parent' },
        {
          any: [
            { field: 'background.hasGap', operator: 'equals', value: true },
            {
              not: {
                field: 'background.applicantType',
                operator: 'equals',
                value: 'recent_graduate_no_formal_work'
              }
            }
          ]
        }
      ]
    };

    expect(evaluateRuleExpression(expression, answers)).toBe(true);
    expect(conditionMatches(expression, answers)).toBe(true);
  });

  it('returns false for conclusive all, any and not failures', () => {
    expect(evaluateRuleExpression({ all: [
      { field: 'funding.source', operator: 'equals', value: 'parent' },
      { field: 'background.hasGap', operator: 'equals', value: true }
    ] }, answers)).toBe(false);
    expect(evaluateRuleExpression({ any: [
      { field: 'funding.source', operator: 'equals', value: 'self' },
      { field: 'background.hasGap', operator: 'equals', value: true }
    ] }, answers)).toBe(false);
    expect(evaluateRuleExpression({ not: {
      field: 'funding.source',
      operator: 'equals',
      value: 'parent'
    } }, answers)).toBe(false);
  });

  it('lets a conclusive result dominate unknown in a valid combination', () => {
    const missing = {
      field: 'background.studyRelation',
      operator: 'equals',
      value: 'continuation'
    };

    expect(evaluateRuleExpression({ all: [
      { field: 'funding.source', operator: 'equals', value: 'self' },
      missing
    ] }, answers)).toBe(false);
    expect(evaluateRuleExpression({ any: [
      { field: 'funding.source', operator: 'equals', value: 'parent' },
      missing
    ] }, answers)).toBe(true);
  });

  it('propagates unknown through not and combinations', () => {
    const missing: RuleExpression = {
      field: 'background.studyRelation',
      operator: 'equals',
      value: 'continuation'
    };

    expect(evaluateRuleExpression({ not: missing }, answers)).toBe('unknown');
    expect(evaluateRuleExpression({ all: [
      { field: 'funding.source', operator: 'equals', value: 'parent' },
      missing
    ] }, answers)).toBe('unknown');
    expect(evaluateRuleExpression({ any: [
      { field: 'funding.source', operator: 'equals', value: 'self' },
      missing
    ] }, answers)).toBe('unknown');
    expect(conditionMatches({ not: missing }, answers)).toBe(false);
  });

  it.each([
    { all: [] },
    { any: [] },
    { not: null },
    { all: [], any: [] },
    { field: 'funding.source', operator: 'in', value: 'parent' },
    { field: 'funding.source', operator: 'unsupported', value: 'parent' }
  ])('fails closed for empty or invalid expression %#', (expression) => {
    expect(evaluateRuleExpression(expression, answers)).toBe('unknown');
    expect(conditionMatches(expression as unknown as RuleExpression, answers)).toBe(false);
  });

  it('fails closed when a combination contains an invalid child', () => {
    const invalidChild = { field: 'funding.source', operator: 'unsupported', value: 'parent' };

    expect(evaluateRuleExpression({
      any: [
        { field: 'funding.source', operator: 'equals', value: 'parent' },
        invalidChild
      ]
    }, answers)).toBe('unknown');
    expect(evaluateRuleExpression({
      all: [
        { field: 'funding.source', operator: 'equals', value: 'self' },
        invalidChild
      ]
    }, answers)).toBe('unknown');
  });

  it('keeps checklist ordering deterministic and deduplicates item ids', () => {
    const definitions: ChecklistItem[] = [
      {
        id: 'first',
        category: 'Synthetic',
        title: 'First',
        requirementType: 'product_organisation_guidance',
        evidenceLayer: 'product_guidance',
        why: 'Synthetic test item.',
        steps: ['First step'],
        sourceIds: ['synthetic'],
        defaultIncluded: true
      },
      {
        id: 'second',
        category: 'Synthetic',
        title: 'Second',
        requirementType: 'product_organisation_guidance',
        evidenceLayer: 'product_guidance',
        why: 'Synthetic test item.',
        steps: ['Second step'],
        sourceIds: ['synthetic']
      }
    ];
    const duplicateRules: ChecklistRule[] = [
      {
        id: 'second-once',
        when: { field: 'funding.source', operator: 'equals', value: 'parent' },
        addChecklistItems: ['second']
      },
      {
        id: 'second-twice',
        when: { all: [
          { field: 'funding.source', operator: 'equals', value: 'parent' },
          { field: 'background.hasGap', operator: 'equals', value: false }
        ] },
        addChecklistItems: ['second']
      }
    ];

    expect(generateChecklist(answers, definitions, duplicateRules).map((item) => item.id))
      .toEqual(['first', 'second']);
  });

  describe('police certificate checklist item', () => {
    it('is default included in the generated checklist with approved configuration', () => {
      const result = generateChecklist({}, items, rules);
      const policeItem = result.find((item) => item.id === 'character.policeReview');

      expect(policeItem).toBeDefined();
      expect(policeItem?.category).toBe('健康与品行');
      expect(policeItem?.requirementType).toBe('may_be_requested');
      expect(policeItem?.evidenceLayer).toBe('inz_visa');
      expect(policeItem?.sourceIds).toEqual(['inz.police-certificates', 'inz.fee-paying-student']);
      expect(policeItem?.defaultIncluded).toBe(true);
    });
  });

  describe('generalised academic and english items V6 compatibility', () => {
    it('generates the 7 retained academic and english items with product_guidance evidence layer', () => {
      const answers = materialAnswers(['completed_qualification'], 'available', 'mainland_china');
      const withEffects = evaluateQuestionEffects(answers).answersForChecklist;

      const result = generateChecklist(withEffects, items, rules);
      const generatedIds = result.map((item) => item.id);

      expect(generatedIds).toContain('education.completionEvidence');
      expect(generatedIds).toContain('education.transcripts');
      expect(generatedIds).toContain('education.gradingScale');
      expect(generatedIds).toContain('education.mainlandDocumentNaming');
      expect(generatedIds).toContain('english.providerEvidence');

      const academicAndEnglishItems = result.filter((item) =>
        item.id.startsWith('education.') || item.id.startsWith('english.')
      );

      expect(academicAndEnglishItems.every((item) => item.evidenceLayer === 'product_guidance')).toBe(true);
    });
  });
});
