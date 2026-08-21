import { describe, expect, it } from 'vitest';
import checklistItemsJson from '../src/content/nz/student-fee-paying/checklist-items.zh-CN.json';
import questionsJson from '../src/content/nz/student-fee-paying/questions.zh-CN.json';
import rulesJson from '../src/content/nz/student-fee-paying/rules.json';
import sourcesJson from '../src/content/nz/student-fee-paying/sources.json';
import { questionEffectFields } from '../src/content/nz/student-fee-paying/questionEffects';
import type { ChecklistItem, ChecklistRule, OfficialSource } from '../src/domain/types';

interface SurveyChoice {
  value: string;
  text: string;
  isExclusive?: boolean;
}

interface SurveyElement {
  type: string;
  name?: string;
  title?: string;
  html?: string;
  description?: string;
  visibleIf?: string;
  clearIfInvisible?: string;
  choices?: SurveyChoice[];
  isRequired?: boolean;
}

interface SurveyPage {
  name: string;
  title: string;
  elements: SurveyElement[];
}

const items = checklistItemsJson as ChecklistItem[];
const rules = rulesJson as ChecklistRule[];
const sources = sourcesJson as OfficialSource[];
const pages = questionsJson.pages as SurveyPage[];
const elements = pages.flatMap((page) => page.elements);

function collectRuleFields(expression: unknown): string[] {
  if (!expression || typeof expression !== 'object' || Array.isArray(expression)) return [];
  const record = expression as Record<string, unknown>;
  if (typeof record.field === 'string') return [record.field];
  if (Array.isArray(record.all)) return record.all.flatMap(collectRuleFields);
  if (Array.isArray(record.any)) return record.any.flatMap(collectRuleFields);
  return Object.prototype.hasOwnProperty.call(record, 'not')
    ? collectRuleFields(record.not)
    : [];
}

describe('content contract', () => {
  it('uses the approved static scope statement and current questions', () => {
    const scopeElement = elements.find((element) => element.type === 'html');
    const applicantType = elements.find((element) => element.name === 'background.applicantType');
    const studyRelation = elements.find((element) => element.name === 'background.studyRelation');

    const questionNames = elements.flatMap((element) => element.name ? [element.name] : []);

    expect(questionNames).not.toContain('scope.confirmedVisaType');
    expect(questionNames).not.toContain('employment.hasWorkExperience');
    expect(questionNames).not.toContain('employment.currentlyEmployed');
    expect(questionNames).not.toContain('employment.courseRelation');
    expect(questionNames).not.toContain('funding.source');
    expect(questionNames).toHaveLength(24);
    expect(scopeElement?.html).toBe(
      '<p>本工具面向已经自行选择申请新西兰 Fee Paying Student Visa 的成年人，用于整理申请前的材料准备事项。它不会判断你是否适合或有资格申请该签证，也不会推荐签证类型。如果你尚未确定签证类型，请先查阅 INZ 官方信息或咨询持牌专业人士。</p>'
    );
    expect(applicantType?.description).toBe(
      '工作经历包括受雇、自雇、自由职业或经营活动。请选择最接近自己主要背景的一项。“近期毕业”由你自行判断，本工具不会根据毕业日期推断。这里的分类只用于调整准备提示，不是 INZ 的申请人分类。'
    );
    expect(applicantType?.choices).toEqual([
      { value: 'recent_graduate_no_formal_work', text: '我近期完成学业，目前没有工作经历' },
      { value: 'employed_or_previously_employed', text: '我目前或过去有工作经历' },
      { value: 'non_recent_graduate_no_formal_work', text: '我并非近期毕业，目前没有工作经历' },
      { value: 'other_or_unclear', text: '以上都不完全符合，或我不确定如何归类' }
    ]);
    expect(studyRelation?.choices).toEqual([
      { value: 'continuation', text: '基本延续' },
      { value: 'adjacent_capability', text: '相邻拓展' },
      { value: 'significant_transition', text: '明显转向' },
      { value: 'unclear', text: '暂不明确' }
    ]);
  });

  it('keeps item, rule, source and guidance ids unique and references resolvable', () => {
    const itemIds = items.map((item) => item.id);
    const ruleIds = rules.map((rule) => rule.id);
    const sourceIds = sources.map((source) => source.id);
    const guidanceIds = items.flatMap((item) =>
      item.conditionalGuidanceBlocks?.map((block) => block.id) ?? []
    );
    const questionNames = elements.flatMap((element) => element.name ? [element.name] : []);
    const ruleFields = [
      ...rules.flatMap((rule) => collectRuleFields(rule.when)),
      ...items.flatMap((item) =>
        item.conditionalGuidanceBlocks?.flatMap((block) => collectRuleFields(block.when)) ?? []
      )
    ];

    expect(new Set(itemIds).size).toBe(itemIds.length);
    expect(new Set(ruleIds).size).toBe(ruleIds.length);
    expect(new Set(sourceIds).size).toBe(sourceIds.length);
    expect(new Set(guidanceIds).size).toBe(guidanceIds.length);
    expect(items.every((item) =>
      item.sourceIds.length > 0 && item.sourceIds.every((sourceId) => sourceIds.includes(sourceId))
    )).toBe(true);
    expect(rules.every((rule) =>
      rule.addChecklistItems.every((itemId) => itemIds.includes(itemId))
    )).toBe(true);
    expect(ruleFields.every((field) =>
      questionNames.includes(field) || field.startsWith('_effects.')
    )).toBe(true);
  });

  it('records only approved live-verification dates', () => {
    expect(sources.find((source) => source.id === 'inz.fee-paying-student')?.checkedAt)
      .toBe('2026-07-27');
    expect(sources.find((source) => source.id === 'inz.genuine-intentions-study'))
      .toEqual({
        id: 'inz.genuine-intentions-study',
        title: 'Genuine intentions to study in New Zealand',
        publisher: 'Immigration New Zealand',
        url: 'https://www.immigration.govt.nz/process-to-apply/applying-for-a-visa/providing-evidence-and-documents-to-support-your-visa-application/genuine-intentions-to-study-in-new-zealand/',
        checkedAt: '2026-07-29'
      });
    expect(sources.filter((source) => source.checkedAt === '2026-07-30').map((source) => source.id))
      .toEqual([
        'inz.student-visa-apply-early',
        'inz.student-visas-overview',
        'inz.student-fund-requirements',
        'inz.health-xray-medical'
      ]);
    expect(sources.filter((source) => source.checkedAt === '2026-08-17').map((source) => source.id))
      .toEqual(['inz.partnership-proof']);
    expect(sources.filter((source) => source.checkedAt === '2026-08-18').map((source) => source.id))
      .toEqual([
        'inz.partner-student-work-visa',
        'inz.dependent-child-student-visa',
        'inz.bringing-family-student-visa',
        'inz.partner-student-visitor-visa',
        'inz.child-student-visitor-visa',
        'inz.bringing-children'
      ]);
    expect(sources.every((source) => /^\d{4}-\d{2}-\d{2}$/.test(source.checkedAt))).toBe(true);
  });

  it('uses the approved location, health, funding and course-status wording', () => {
    const location = elements.find((element) => element.name === 'travel.locationContext');
    const health = elements.find((element) => element.name === 'health.evidenceStatus');
    const funding = elements.find((element) => element.name === 'funding.arrangementType');
    const courseStatus = elements.find((element) => element.name === 'study.courseStatus');

    expect(location).toEqual(expect.objectContaining({
      title: '你目前位于哪里？',
      description: '仅用于调整预计出行和申请时间提示，不判断申请资格，也不建议你应在哪里提交申请。',
      choices: [
        { value: 'offshore', text: '新西兰境外' },
        { value: 'onshore', text: '新西兰境内' },
        { value: 'unclear', text: '暂不确定' }
      ]
    }));
    expect(health).toEqual(expect.objectContaining({
      title: '你目前的 X 光或体检信息处于什么状态？',
      description: '是否需要提供以及既往信息能否使用，取决于当前 INZ 要求和你的具体情况。尚未提供不代表本工具判断申请不能提交；INZ 在处理期间也可能要求补充或重新检查。',
      choices: [
        { value: 'not_provided', text: '提交本次申请前尚未准备或提交' },
        { value: 'previously_submitted', text: '以前曾向 INZ 提交过相关信息' },
        { value: 'new_exam_completed', text: '近期已完成新的 X 光或体检' },
        { value: 'unclear', text: '暂不确定' }
      ]
    }));
    expect(courseStatus?.choices).toHaveLength(4);
    expect(funding?.choices?.map((choice) => choice.value)).toEqual([
      'own_funds',
      'overseas_third_party',
      'nz_sponsorship',
      'scholarship',
      'education_loan',
      'mixed',
      'other_or_unclear'
    ]);
  });

  it('keeps the five material-context questions and adjacent V6 family-route questions', () => {
    const page = pages.find((candidate) => candidate.name === 'material-background');
    const materialQuestions = page?.elements.filter((element) => element.name) ?? [];

    expect(page?.title).toBe('材料背景');
    expect(materialQuestions.map((question) => question.name)).toEqual([
      'education.recordContexts',
      'english.providerEvidenceStatus',
      'documents.originContext',
      'family.linkedApplicationContext',
      'family.partnerVisaRoute',
      'family.childVisaRoute',
      'documents.nonEnglishEvidenceStatus'
    ]);
    expect(materialQuestions.every((question) => question.isRequired === true)).toBe(true);
    expect(materialQuestions[0]).toEqual(expect.objectContaining({
      type: 'checkbox',
      title: '以下哪些情况符合你的教育记录？',
      description: '用于调整学术记录整理提示，不判断学历是否满足院校或签证要求。',
      choices: [
        { value: 'completed_qualification', text: '已完成一项或多项学历、课程或培训' },
        { value: 'currently_enrolled', text: '目前仍在学习' },
        { value: 'incomplete_or_withdrawn', text: '曾有未完成、中断或退出的学习' },
        {
          value: 'other_or_unclear',
          text: '其他情况，或暂不明确',
          isExclusive: true
        }
      ]
    }));
    expect(materialQuestions.slice(1, 4).map((question) =>
      question.choices?.map((choice) => choice.value)
    )).toEqual([
      [
        'available',
        'pending_or_conditional',
        'provider_confirmed_not_required',
        'other_or_unclear'
      ],
      ['mainland_china', 'other', 'mixed', 'unclear'],
      ['none', 'partner', 'dependent_child', 'partner_and_child', 'unclear']
    ]);
    expect(materialQuestions.at(-1)?.choices?.map((choice) => choice.value))
      .toEqual(['none_known', 'includes_non_english', 'unclear']);
    expect(elements.some((element) => element.name === 'identity.documentContext')).toBe(false);
  });

  it('uses only the approved requirement classifications and explicit evidence layers', () => {
    const approved = new Set([
      'usually_required',
      'answer_dependent',
      'may_be_requested',
      'genuine_intentions_support',
      'product_organisation_guidance'
    ]);
    const retired = new Set([
      'core',
      'conditional',
      'possible',
      'action',
      'preparation_guidance'
    ]);

    const evidenceLayers = new Set([
      'inz_visa',
      'product_guidance'
    ]);

    expect(items).toHaveLength(45);
    expect(items.every((item) => approved.has(item.requirementType))).toBe(true);
    expect(items.every((item) => !retired.has(item.requirementType))).toBe(true);
    expect(items.every((item) => evidenceLayers.has(item.evidenceLayer))).toBe(true);
    expect(items.find((item) => item.id === 'submission.finalReview')).toEqual(
      expect.objectContaining({
        category: '提交整理工具',
        requirementType: 'product_organisation_guidance'
      })
    );
  });

  it('applies the approved classification to every stable checklist item ID', () => {
    expect(Object.fromEntries(items.map((item) => [item.id, item.requirementType]))).toEqual({
      'identity.passport': 'usually_required',
      'study.offer': 'usually_required',
      'study.offer.pending': 'answer_dependent',
      'study.tuitionReceipt': 'answer_dependent',
      'study.tuitionPlan': 'product_organisation_guidance',
      'study.courseTimeline': 'product_organisation_guidance',
      'study.courseStartPast': 'product_organisation_guidance',
      'application.timingReview': 'product_organisation_guidance',
      'education.completionEvidence': 'product_organisation_guidance',
      'education.transcripts': 'product_organisation_guidance',
      'education.gradingScale': 'product_organisation_guidance',
      'education.mainlandDocumentNaming': 'product_organisation_guidance',
      'education.providerRequirementReview': 'answer_dependent',
      'english.providerEvidence': 'answer_dependent',
      'english.pendingCondition': 'answer_dependent',
      'funds.bankStatements': 'answer_dependent',
      'funds.ownFunds': 'answer_dependent',
      'funds.overseasThirdParty': 'answer_dependent',
      'funds.nzSponsorship': 'answer_dependent',
      'funds.scholarship': 'answer_dependent',
      'funds.educationLoan': 'answer_dependent',
      'funds.mixed': 'product_organisation_guidance',
      'funds.otherOrUnclear': 'product_organisation_guidance',
      'funds.supporter': 'answer_dependent',
      'funds.largeDeposit': 'may_be_requested',
      'background.recentGraduateChronology': 'product_organisation_guidance',
      'background.workChronology': 'product_organisation_guidance',
      'background.nonRecentNoWorkChronology': 'product_organisation_guidance',
      'background.otherChronology': 'product_organisation_guidance',
      'background.studyConnection': 'genuine_intentions_support',
      'background.gap': 'product_organisation_guidance',
      'identity.passportValidityReview': 'answer_dependent',
      'identity.otherNames': 'answer_dependent',
      'health.review': 'may_be_requested',
      'character.policeReview': 'may_be_requested',
      'history.refusal': 'genuine_intentions_support',
      'family.partnerRelationship': 'answer_dependent',
      'family.partnerRouteReview': 'product_organisation_guidance',
      'family.childRelationship': 'answer_dependent',
      'family.childRouteReview': 'product_organisation_guidance',
      'family.partnerStudentWorkRouteMaterials': 'answer_dependent',
      'family.partnerStudentVisitorRouteMaterials': 'answer_dependent',
      'family.dependentChildStudentRouteMaterials': 'answer_dependent',
      'family.childOfStudentVisitorRouteMaterials': 'answer_dependent',
      'submission.finalReview': 'product_organisation_guidance'
    });
  });

  it('applies the reviewed evidence layer to every checklist item', () => {
    expect(Object.fromEntries(items.map((item) => [item.id, item.evidenceLayer]))).toEqual({
      'identity.passport': 'inz_visa',
      'study.offer': 'inz_visa',
      'study.offer.pending': 'inz_visa',
      'study.tuitionReceipt': 'inz_visa',
      'study.tuitionPlan': 'product_guidance',
      'study.courseTimeline': 'product_guidance',
      'study.courseStartPast': 'product_guidance',
      'application.timingReview': 'product_guidance',
      'education.completionEvidence': 'product_guidance',
      'education.transcripts': 'product_guidance',
      'education.gradingScale': 'product_guidance',
      'education.mainlandDocumentNaming': 'product_guidance',
      'education.providerRequirementReview': 'product_guidance',
      'english.providerEvidence': 'product_guidance',
      'english.pendingCondition': 'product_guidance',
      'funds.bankStatements': 'inz_visa',
      'funds.ownFunds': 'inz_visa',
      'funds.overseasThirdParty': 'inz_visa',
      'funds.nzSponsorship': 'inz_visa',
      'funds.scholarship': 'inz_visa',
      'funds.educationLoan': 'inz_visa',
      'funds.mixed': 'product_guidance',
      'funds.otherOrUnclear': 'product_guidance',
      'funds.supporter': 'inz_visa',
      'funds.largeDeposit': 'inz_visa',
      'background.recentGraduateChronology': 'product_guidance',
      'background.workChronology': 'product_guidance',
      'background.nonRecentNoWorkChronology': 'product_guidance',
      'background.otherChronology': 'product_guidance',
      'background.studyConnection': 'product_guidance',
      'background.gap': 'product_guidance',
      'identity.passportValidityReview': 'inz_visa',
      'identity.otherNames': 'product_guidance',
      'health.review': 'inz_visa',
      'character.policeReview': 'inz_visa',
      'history.refusal': 'product_guidance',
      'family.partnerRelationship': 'inz_visa',
      'family.partnerRouteReview': 'product_guidance',
      'family.childRelationship': 'inz_visa',
      'family.childRouteReview': 'product_guidance',
      'family.partnerStudentWorkRouteMaterials': 'inz_visa',
      'family.partnerStudentVisitorRouteMaterials': 'inz_visa',
      'family.dependentChildStudentRouteMaterials': 'inz_visa',
      'family.childOfStudentVisitorRouteMaterials': 'inz_visa',
      'submission.finalReview': 'product_guidance'
    });
  });

  it('does not add unapproved checklist items', () => {
    const ids = items.map((item) => item.id);
    expect(ids).not.toEqual(expect.arrayContaining([
      'education.records',
      'education.currentEnrollment',
      'education.incompleteStudy',
      'education.academicTranslation',
      'english.genuineIntentionsContext',
      'documents.translationReview',
      'family.custodyGuardianship',
      'character.policeCertificateReview',
      'travel.outwardTravelEvidence',
      'submission.documentIndex',
      'submission.fileNaming',
      'background.chronologySummary'
    ]));
  });

  it('keeps B2b route materials distinct, sourced and non-advisory', () => {
    const byId = Object.fromEntries(items.map((item) => [item.id, item]));
    const b2bIds = [
      'family.partnerStudentWorkRouteMaterials',
      'family.partnerStudentVisitorRouteMaterials',
      'family.dependentChildStudentRouteMaterials',
      'family.childOfStudentVisitorRouteMaterials'
    ];
    const b2bText = b2bIds.map((id) => JSON.stringify(byId[id])).join(' ');

    expect(b2bIds.every((id) => byId[id]?.requirementType === 'answer_dependent'))
      .toBe(true);
    expect(b2bIds.every((id) => byId[id]?.evidenceLayer === 'inz_visa'))
      .toBe(true);
    expect(byId['family.partnerStudentWorkRouteMaterials'].sourceIds).toEqual([
      'inz.partner-student-work-visa',
      'inz.bringing-family-student-visa'
    ]);
    expect(byId['family.partnerStudentVisitorRouteMaterials']
      .conditionalGuidanceBlocks?.map((block) => block.id))
      .toEqual(['family.partnerStudentVisitorRouteMaterials.childInclusionReview']);
    expect(byId['family.dependentChildStudentRouteMaterials'].sourceIds).toEqual([
      'inz.dependent-child-student-visa',
      'inz.bringing-family-student-visa',
      'inz.bringing-children'
    ]);
    expect(byId['family.childOfStudentVisitorRouteMaterials'].sourceIds).toEqual([
      'inz.child-student-visitor-visa',
      'inz.bringing-family-student-visa',
      'inz.bringing-children'
    ]);
    expect(b2bText).not.toMatch(/保证获批|批准概率|拒签概率|风险评分|材料充分|最适合|建议申请/);
  });

  it('defines the V6 family route questions and B2a item boundaries', () => {
    const partner = elements.find((element) => element.name === 'family.partnerVisaRoute');
    const child = elements.find((element) => element.name === 'family.childVisaRoute');
    const byId = Object.fromEntries(items.map((item) => [item.id, item]));

    expect(partner).toEqual(expect.objectContaining({
      isRequired: true,
      clearIfInvisible: 'onHidden',
      choices: [
        { value: 'partner_student_work', text: 'Partner of a Student Work Visa' },
        { value: 'partner_student_visitor', text: 'Partner of a Student Visitor Visa' },
        { value: 'undecided', text: '尚未选定，需要继续核对' }
      ]
    }));
    expect(partner?.visibleIf).toContain("{family.linkedApplicationContext} = 'partner'");
    expect(child).toEqual(expect.objectContaining({
      isRequired: true,
      clearIfInvisible: 'onHidden',
      choices: [
        { value: 'dependent_child_student', text: 'Dependent Child Student Visa' },
        { value: 'child_student_visitor', text: 'Child of a Student Visitor Visa' },
        { value: 'undecided', text: '尚未选定，需要继续核对' }
      ]
    }));
    expect(child?.visibleIf).toContain("{family.linkedApplicationContext} = 'dependent_child'");
    expect(byId['family.partnerRelationship']).toEqual(expect.objectContaining({
      evidenceLayer: 'inz_visa',
      sourceIds: ['inz.partnership-proof']
    }));
    expect(byId['family.partnerRouteReview']).toEqual(expect.objectContaining({
      evidenceLayer: 'product_guidance',
      sourceIds: [
        'inz.bringing-family-student-visa',
        'inz.partner-student-work-visa',
        'inz.partner-student-visitor-visa'
      ]
    }));
    expect(byId['family.childRelationship']).toEqual(expect.objectContaining({
      evidenceLayer: 'inz_visa',
      sourceIds: ['inz.bringing-children']
    }));
    expect(byId['family.childRouteReview'].evidenceLayer).toBe('product_guidance');
  });

  it('keeps mainland document naming boundaries and stable supporter ID', () => {
    const mainland = items.find((item) => item.id === 'education.mainlandDocumentNaming');
    const supporter = items.find((item) => item.id === 'funds.supporter');
    const gradingIndex = items.findIndex((item) => item.id === 'education.gradingScale');
    const mainlandIndex = items.findIndex((item) => item.id === mainland?.id);
    const providerReviewIndex = items.findIndex(
      (item) => item.id === 'education.providerRequirementReview'
    );

    expect(mainland).toEqual(expect.objectContaining({
      category: '教育与学术记录',
      requirementType: 'product_organisation_guidance',
      evidenceLayer: 'product_guidance',
      sourceIds: ['inz.offering-place-student']
    }));
    expect(gradingIndex).toBeLessThan(mainlandIndex);
    expect(mainlandIndex).toBeLessThan(providerReviewIndex);
    expect(supporter).toEqual(expect.objectContaining({
      id: 'funds.supporter',
      category: '生活资金',
      requirementType: 'answer_dependent',
      evidenceLayer: 'inz_visa',
      sourceIds: ['inz.student-fund-requirements']
    }));
    expect(supporter?.conditionalGuidanceBlocks?.map((block) => block.id)).toEqual([
      'funds.supporter.overseasThirdParty',
      'funds.supporter.nzSponsorship',
      'funds.supporter.mixed'
    ]);
  });

  it('keeps all seven generic academic and english items as product_guidance with offering-place source', () => {
    const genericItemIds = [
      'education.completionEvidence',
      'education.transcripts',
      'education.gradingScale',
      'education.mainlandDocumentNaming',
      'education.providerRequirementReview',
      'english.providerEvidence',
      'english.pendingCondition'
    ];

    genericItemIds.forEach((itemId) => {
      const targetItem = items.find((item) => item.id === itemId);
      expect(targetItem).toBeDefined();
      expect(targetItem?.evidenceLayer).toBe('product_guidance');
      expect(targetItem?.sourceIds).toEqual(['inz.offering-place-student']);
    });
  });

  it('gives every persisted question a rule, guidance, validation or allowlisted system effect', () => {
    const questionNames = elements.flatMap((element) => element.name ? [element.name] : []);
    const directEffectFields = new Set([
      ...rules.flatMap((rule) => collectRuleFields(rule.when)),
      ...items.flatMap((item) =>
        item.conditionalGuidanceBlocks?.flatMap((block) => collectRuleFields(block.when)) ?? []
      )
    ].filter((field) => !field.startsWith('_effects.')));
    questionEffectFields.forEach((field) => directEffectFields.add(field));

    expect([...directEffectFields].sort()).toEqual([...questionNames].sort());
  });

  it('uses the approved Offer guidance ID and exact timing warning', () => {
    const offer = items.find((item) => item.id === 'study.offer');
    const timing = items.find((item) => item.id === 'application.timingReview');

    expect(offer?.conditionalGuidanceBlocks?.map((block) => block.id))
      .toEqual(['study.offer.statusReview']);
    expect(timing?.why).toBe(
      '你目前在新西兰境外、尚未提交学生签证申请，且预计在 3 个月内出行。INZ 目前强烈建议尽可能在预计出行日期至少 3 个月前申请，并说明学生签证处理时间不受保证。这是时间规划提示，不是申请截止日期、签证资格判断或结果保证。请查看当前学生签证等待时间；如担心无法赶上课程开始日期，可与教育机构核对可行的课程安排。'
    );
  });

  it('keeps background tasks factual and guidance explicitly preparatory', () => {
    const chronologyItems = items.filter((item) => item.id.endsWith('Chronology'));
    const studyConnection = items.find((item) => item.id === 'background.studyConnection');

    expect(chronologyItems).toHaveLength(4);
    expect(chronologyItems.every((item) =>
      item.requirementType === 'product_organisation_guidance'
      && !item.steps.some((step) => /课程选择|能力|学习计划|完成课程后/.test(step))
    )).toBe(true);
    expect(items.find((item) => item.id === 'background.recentGraduateChronology')?.steps[0])
      .toBe('按年月记录最近完成的学历、课程和培训，以及目前仍在进行的学习活动。');
    expect(studyConnection?.guidanceDisclaimer).toBe(
      '以下内容用于帮助你整理事实和核对信息，不代表 INZ 要求单独提交特定文件，也不判断材料是否充分或申请结果。'
    );
    expect(studyConnection?.conditionalGuidanceBlocks).toHaveLength(4);
    expect(studyConnection?.conditionalGuidanceBlocks?.every((block) =>
      !block.title.startsWith('如果')
    )).toBe(true);
  });

  it.each([
    'Example University',
    'Example Portal',
    'example-provider.example',
    'example_provider',
    'example_qualification'
  ])('protects generic product runtime and content from provider identifier: %s', (identifier) => {
    const runtimeAndContent = JSON.stringify({
      checklistItems: checklistItemsJson,
      questions: questionsJson,
      rules: rulesJson,
      sources: sourcesJson
    });

    expect(runtimeAndContent).not.toContain(identifier);
  });

  it.each([
    '你有资格申请',
    '你符合申请资格',
    '申请风险较低',
    '申请风险较高',
    '材料已经充分',
    '材料足以满足',
    '申请会获批',
    '申请将获批',
    '保证获得签证',
    '应当披露',
    '不应披露',
    '可以省略',
    '必须提交说明信',
    '必须准备说明信',
    'INZ 要求你单独提交',
    'guaranteed',
    'sufficient',
    'eligible',
    'visa will be approved',
    'mandatory standalone CV',
    'mandatory standalone study plan',
    'all non-English documents require certified translation'
  ])('does not contain prohibited applicant-facing conclusion: %s', (prohibitedText) => {
    const applicantFacingContent = JSON.stringify({
      checklistItems: checklistItemsJson,
      questions: questionsJson
    });

    expect(applicantFacingContent).not.toContain(prohibitedText);
  });
});
