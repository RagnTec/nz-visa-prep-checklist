import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { CURRENT_SAVED_PROJECT_SCHEMA_VERSION } from '../src/domain/types';

const storage = vi.hoisted(() => ({
  deleteProject: vi.fn(),
  loadProject: vi.fn(),
  saveProject: vi.fn()
}));

vi.mock('../src/storage/db', () => storage);

interface SurveyAnswers {
  funding?:
    | 'own_funds'
    | 'overseas_third_party'
    | 'nz_sponsorship'
    | 'scholarship'
    | 'education_loan'
    | 'mixed'
    | 'other_or_unclear';
  tuitionPaid?: boolean;
  passportValid?: boolean;
  hasGap?: boolean;
  hasOtherNames?: boolean;
  healthStatus?: 'not_provided' | 'previously_submitted' | 'new_exam_completed' | 'unclear';
  hasVisaRefusal?: boolean;
  offshoreArrivalDate?: string;
}

function setBoolean(questionTitle: string, value: boolean) {
  const title = screen.getByText(questionTitle);
  const question = title.closest('.sd-question');
  const input = question?.querySelector<HTMLInputElement>('input[type="checkbox"]');
  if (!input) throw new Error(`Boolean input not found for ${questionTitle}`);
  if (input.checked === value) fireEvent.click(input);
  if (input.checked !== value) fireEvent.click(input);
}

function selectChoice(choiceText: string) {
  fireEvent.click(screen.getByText(choiceText));
}

function setDate(questionTitle: string, value: string) {
  const title = screen.getByText(questionTitle);
  const question = title.closest('.sd-question');
  const input = question?.querySelector<HTMLInputElement>('input[type="date"]');
  if (!input) throw new Error(`Date input not found for ${questionTitle}`);
  fireEvent.change(input, { target: { value } });
}

async function setOnlyVisibleDate(value: string) {
  const input = await waitFor(() => {
    const inputs = document.querySelectorAll<HTMLInputElement>('input[type="date"]');
    if (inputs.length !== 1) {
      throw new Error(`Expected one visible date input, found ${inputs.length}`);
    }
    return inputs[0];
  });
  fireEvent.change(input, { target: { value } });
}

async function nextPage(expectedTitle: string) {
  fireEvent.click(screen.getByRole('button', { name: /Next|下一页/ }));
  await screen.findByText(expectedTitle);
}

function localDateWithOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function fillRequiredStudyQuestions() {
  setBoolean('你是否已经取得 Offer of Place？', true);
  setBoolean(
    '你是否已经支付学费并取得教育机构出具的付款证明？',
    false
  );
}

async function completeSurvey(overrides: SurveyAnswers = {}) {
  const answers = {
    funding: 'other_or_unclear' as const,
    tuitionPaid: false,
    passportValid: true,
    hasGap: false,
    hasOtherNames: false,
    healthStatus: 'not_provided' as const,
    hasVisaRefusal: false,
    ...overrides
  };

  await screen.findByText('使用边界');
  await nextPage('课程与学费');

  setBoolean('你是否已经取得 Offer of Place？', true);
  setBoolean(
    '你是否已经支付学费并取得教育机构出具的付款证明？',
    answers.tuitionPaid
  );
  selectChoice('课程尚未开始');
  await nextPage('所在地与申请时间');

  if (answers.offshoreArrivalDate) {
    selectChoice('新西兰境外');
    const arrivalInput = await waitFor(() => {
      const input = document.querySelector<HTMLInputElement>('input[type="date"]');
      if (!input) throw new Error('Intended arrival input not found');
      return input;
    });
    fireEvent.change(arrivalInput, { target: { value: answers.offshoreArrivalDate } });
    selectChoice('尚未提交');
  } else {
    selectChoice('新西兰境内');
    selectChoice('已经提交');
  }
  await nextPage('资金安排');

  const fundingChoices = {
    own_funds: '主要使用本人持有或可支配的资金',
    overseas_third_party: '由新西兰境外的第三方或财务担保人支持',
    nz_sponsorship: '由新西兰的个人或机构提供 sponsorship',
    scholarship: '主要使用奖学金',
    education_loan: '主要使用教育贷款',
    mixed: '同时使用两种或以上资金方式',
    other_or_unclear: '以上都不完全符合，或暂不确定'
  };
  selectChoice(fundingChoices[answers.funding]);
  await nextPage('教育与工作背景');

  selectChoice('以上都不完全符合，或我不确定如何归类');
  selectChoice('暂不明确');
  setBoolean('教育或工作时间线中是否有较长空档？', answers.hasGap);
  await nextPage('材料背景');

  selectChoice('已完成一项或多项学历、课程或培训');
  selectChoice('已有可用于核对院校英语要求的证明');
  selectChoice('主要由其他国家或地区机构出具');
  selectChoice('没有');
  selectChoice('目前没有已知的非英文材料');
  await nextPage('身份与基础检查');

  setBoolean(
    '你的护照预计在离开新西兰后仍至少有效3个月吗？',
    answers.passportValid
  );
  setBoolean('你是否使用过其他姓名或存在姓名拼写差异？', answers.hasOtherNames);
  const healthChoices = {
    not_provided: '提交本次申请前尚未准备或提交',
    previously_submitted: '以前曾向 INZ 提交过相关信息',
    new_exam_completed: '近期已完成新的 X 光或体检',
    unclear: '暂不确定'
  };
  selectChoice(healthChoices[answers.healthStatus]);
  setBoolean(
    '你是否有过签证拒签或需要额外说明的申请历史？',
    answers.hasVisaRefusal
  );
  fireEvent.click(screen.getByRole('button', { name: '生成清单' }));

  await screen.findByText('你的材料准备清单');
}

async function restartSurvey() {
  fireEvent.click(screen.getByRole('button', { name: '重新回答' }));
  await screen.findByText('使用边界');
}

describe('App SurveyJS integration', () => {
  beforeEach(() => {
    storage.deleteProject.mockReset();
    storage.loadProject.mockReset();
    storage.saveProject.mockReset();
    storage.deleteProject.mockResolvedValue(undefined);
    storage.loadProject.mockResolvedValue(undefined);
    storage.saveProject.mockResolvedValue(undefined);
  });

  it('shows date-order validation immediately and blocks page navigation', async () => {
    render(<App />);

    await screen.findByText('使用边界');
    fireEvent.click(screen.getByRole('button', { name: /Next|下一页/ }));
    await screen.findByText('课程与学费');

    fillRequiredStudyQuestions();
    setDate('课程开始日期', localDateWithOffset(10));
    setDate('课程结束日期', localDateWithOffset(9));
    selectChoice('课程尚未开始');

    expect(await screen.findByText('课程结束日期不能早于开始日期，请核对这两个日期。'))
      .toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /Next|下一页/ }));

    expect(screen.getByText('课程结束日期不能早于开始日期，请核对这两个日期。'))
      .toBeVisible();
    expect(screen.getByText('课程与学费')).toBeVisible();
  });

  it('blocks a past start with not-started status and clears the error immediately', async () => {
    render(<App />);

    await screen.findByText('使用边界');
    await nextPage('课程与学费');
    fillRequiredStudyQuestions();
    setDate('课程开始日期', localDateWithOffset(-1));
    selectChoice('课程尚未开始');

    const message =
      '课程开始日期已经过去，但你选择了‘课程尚未开始’。请更新课程日期，或选择与你当前情况相符的课程状态。';
    expect(await screen.findByText(message)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /Next|下一页/ }));
    expect(screen.getByText('课程与学费')).toBeVisible();

    selectChoice('我暂不确定，需要核对');
    await waitFor(() => expect(screen.queryByText(message)).not.toBeInTheDocument());
  });

  it('blocks a future start with already-started status', async () => {
    render(<App />);

    await screen.findByText('使用边界');
    await nextPage('课程与学费');
    fillRequiredStudyQuestions();
    setDate('课程开始日期', localDateWithOffset(10));
    selectChoice('课程已经开始');

    const message =
      '课程开始日期尚未到来，但你选择了‘课程已经开始’。请核对课程日期或当前课程状态。';
    expect(await screen.findByText(message)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /Next|下一页/ }));
    expect(screen.getByText('课程与学费')).toBeVisible();
  });

  it('warns for a deferred past start but permits navigation', async () => {
    render(<App />);

    await screen.findByText('使用边界');
    await nextPage('课程与学费');
    fillRequiredStudyQuestions();
    setDate('课程开始日期', localDateWithOffset(-1));
    selectChoice('课程已延期，或课程/日期已发生变化');

    expect(await screen.findByText(
      '你填写的开始日期已经过去，且课程已延期或发生变化。请确认这里填写的是教育机构最新记录中的日期，而不是旧 Offer 日期。'
    )).toBeVisible();
    await nextPage('所在地与申请时间');
  });

  it('warns for offshore arrival after course start and removes it after correction', async () => {
    render(<App />);

    await screen.findByText('使用边界');
    await nextPage('课程与学费');
    fillRequiredStudyQuestions();
    setDate('课程开始日期', localDateWithOffset(10));
    setDate('课程结束日期', localDateWithOffset(30));
    selectChoice('课程尚未开始');
    await nextPage('所在地与申请时间');

    selectChoice('新西兰境外');
    await setOnlyVisibleDate(localDateWithOffset(11));
    const warning =
      '预计抵达日期晚于课程开始日期。请核对最新 Offer、教育机构允许的到校时间，以及课程是否已延期或可以晚到。本工具不会判断该安排是否可接受。';
    expect(await screen.findByText(warning)).toBeVisible();

    await setOnlyVisibleDate(localDateWithOffset(9));
    await waitFor(() => expect(screen.queryByText(warning)).not.toBeInTheDocument());
  });

  it('blocks offshore arrival after course end', async () => {
    render(<App />);

    await screen.findByText('使用边界');
    await nextPage('课程与学费');
    fillRequiredStudyQuestions();
    setDate('课程开始日期', localDateWithOffset(10));
    setDate('课程结束日期', localDateWithOffset(30));
    selectChoice('课程尚未开始');
    await nextPage('所在地与申请时间');

    selectChoice('新西兰境外');
    await setOnlyVisibleDate(localDateWithOffset(31));
    selectChoice('已经提交');
    const message =
      '预计抵达日期晚于课程结束日期。请核对课程日期、预计抵达日期或课程当前状态。';
    expect(await screen.findByText(message)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /Next|下一页/ }));
    expect(screen.getByText('所在地与申请时间')).toBeVisible();
  });

  it('regenerates distinct funding output after restarting and re-answering', async () => {
    render(<App />);

    await completeSurvey({ funding: 'own_funds' });
    expect(screen.getByText('核对本人资金安排')).toBeVisible();
    expect(screen.queryByText('核对奖学金安排')).not.toBeInTheDocument();
    expect(screen.getByText('核对课程日期与当前状态')).toBeVisible();
    await waitFor(() => expect(storage.saveProject).toHaveBeenCalledWith(expect.objectContaining({
      schemaVersion: CURRENT_SAVED_PROJECT_SCHEMA_VERSION,
      answers: expect.objectContaining({
        funding: expect.objectContaining({
          arrangementType: 'own_funds'
        })
      })
    })));
    const ownFundsSave = storage.saveProject.mock.calls.at(-1)?.[0];
    expect(Object.prototype.hasOwnProperty.call(
      ownFundsSave.answers,
      'funding.arrangementType'
    )).toBe(false);
    expect(ownFundsSave.answers).not.toHaveProperty('_effects');

    await restartSurvey();
    await completeSurvey({ funding: 'scholarship' });
    expect(screen.getByText('核对奖学金安排')).toBeVisible();
    expect(screen.queryByText('核对本人资金安排')).not.toBeInTheDocument();
    await waitFor(() => expect(storage.saveProject).toHaveBeenLastCalledWith(
      expect.objectContaining({
        schemaVersion: CURRENT_SAVED_PROJECT_SCHEMA_VERSION,
        answers: expect.objectContaining({
          funding: expect.objectContaining({
            arrangementType: 'scholarship'
          })
        })
      })
    ));
  });

  it('renders tuition, identity, gap, refusal and health branches from completed answers', async () => {
    render(<App />);

    await completeSurvey({
      tuitionPaid: true,
      passportValid: false,
      hasGap: true,
      hasOtherNames: true,
      healthStatus: 'previously_submitted',
      hasVisaRefusal: true
    });

    expect(screen.getByText('学费收据或缴费能力证明')).toBeVisible();
    expect(screen.queryByText('整理学费支付安排')).not.toBeInTheDocument();
    expect(screen.getByText('核对护照有效期并安排更新')).toBeVisible();
    expect(screen.getByText('姓名差异或曾用名说明')).toBeVisible();
    expect(screen.getByText('整理空档时间线')).toBeVisible();
    expect(screen.getByText('整理既往拒签或特殊申请历史')).toBeVisible();
    fireEvent.click(screen.getByText('核对X光或体检要求'));
    expect(screen.getByText('过去曾提交健康信息')).toBeVisible();
    expect(screen.queryByText('尚未准备或提交健康信息')).not.toBeInTheDocument();

    await restartSurvey();
    await completeSurvey({
      tuitionPaid: false,
      passportValid: true,
      hasGap: false,
      hasOtherNames: false,
      healthStatus: 'not_provided',
      hasVisaRefusal: false
    });

    expect(screen.getByText('整理学费支付安排')).toBeVisible();
    expect(screen.queryByText('学费收据或缴费能力证明')).not.toBeInTheDocument();
    expect(screen.queryByText('核对护照有效期并安排更新')).not.toBeInTheDocument();
    expect(screen.queryByText('姓名差异或曾用名说明')).not.toBeInTheDocument();
    expect(screen.queryByText('整理空档时间线')).not.toBeInTheDocument();
    expect(screen.queryByText('整理既往拒签或特殊申请历史')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('核对X光或体检要求'));
    expect(screen.getByText('尚未准备或提交健康信息')).toBeVisible();
    expect(screen.queryByText('过去曾提交健康信息')).not.toBeInTheDocument();
  });

  it.each([
    ['not_provided', '尚未准备或提交健康信息'],
    ['previously_submitted', '过去曾提交健康信息'],
    ['new_exam_completed', '近期已完成新的检查'],
    ['unclear', '当前状态暂不确定']
  ] as const)(
    'completes with health status %s and renders its guidance',
    async (healthStatus, guidanceTitle) => {
      render(<App />);

      await completeSurvey({ healthStatus });
      fireEvent.click(screen.getByText('核对X光或体检要求'));
      expect(screen.getByText(guidanceTitle)).toBeVisible();
    }
  );

  it('renders the timing guidance for offshore, not submitted and travel within three months', async () => {
    render(<App />);

    await completeSurvey({
      offshoreArrivalDate: localDateWithOffset(1)
    });

    expect(screen.getByText('核对预计出行前的申请时间')).toBeVisible();
  });

  it('uses flat SurveyJS answers over stale nested defaults in a restored C1 snapshot', async () => {
    storage.loadProject.mockResolvedValue({
      kind: 'current',
      project: {
        id: 'default',
        schemaVersion: CURRENT_SAVED_PROJECT_SCHEMA_VERSION,
        answers: {
          'study.tuitionPaid': true,
          'study.courseStatus': 'not_started',
          'funding.arrangementType': 'scholarship',
          study: {
            hasOffer: true,
            tuitionPaid: false,
            courseStatus: 'unclear'
          },
          funding: {
            arrangementType: 'other_or_unclear'
          },
          background: {
            applicantType: 'other_or_unclear',
            studyRelation: 'unclear'
          },
          education: { recordContexts: ['completed_qualification'] },
          english: { providerEvidenceStatus: 'available' },
          documents: {
            originContext: 'other',
            nonEnglishEvidenceStatus: 'none_known'
          },
          family: { linkedApplicationContext: 'none' }
        },
        statuses: {},
        updatedAt: '2026-07-30T00:00:00.000Z'
      },
    });

    render(<App />);

    expect(await screen.findByText('核对奖学金安排')).toBeVisible();
    expect(screen.getByText('学费收据或缴费能力证明')).toBeVisible();
    expect(screen.queryByText('核对尚未归类的资金安排')).not.toBeInTheDocument();
    expect(screen.queryByText('整理学费支付安排')).not.toBeInTheDocument();
  });
});
