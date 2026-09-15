import type { QuestionEffects, QuestionEffectOptions } from '../../../domain/route';

export const immediateQuestionEffectFields: string[] = [
  'scope.confirmedChinaWorkingHoliday',
  'scope.citizenshipStatus',
  'scope.ageBand',
  'scope.applicationResidence',
  'scope.previousNzWorkingHolidayVisa'
];

export function cleanNzChinaWorkingHolidayStaleAnswers(
  answers: Record<string, unknown>
): Record<string, unknown> {
  if (!answers || typeof answers !== 'object') return answers;
  return { ...answers };
}

export function evaluateQuestionEffects(
  answers: Record<string, unknown>,
  _options?: QuestionEffectOptions
): QuestionEffects {
  const safeAnswers = answers && typeof answers === 'object' ? answers : {};
  const cleaned = cleanNzChinaWorkingHolidayStaleAnswers(safeAnswers);

  const validationErrors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  const scope = cleaned.scope;
  if (scope && typeof scope === 'object') {
    const scopeRec = scope as Record<string, unknown>;

    if (scopeRec.confirmedChinaWorkingHoliday === 'need_check') {
      warnings['scope.confirmedChinaWorkingHoliday'] =
        '你尚未确定是否申请中国打工度假签证。新西兰设有多种不同类别的签证（如普通访客、学生、AEWV 等）；建议在递交前先核对 INZ 官方说明以确认适合你的路线。';
    }

    if (scopeRec.citizenshipStatus === 'other') {
      warnings['scope.citizenshipStatus'] =
        '新西兰中国打工度假签证（China Working Holiday Visa）仅面向中华人民共和国公民开放；若非中国公民，可能不适用本签证路线，请核对所属国籍适用的签证类别。';
    } else if (scopeRec.citizenshipStatus === 'need_check') {
      warnings['scope.citizenshipStatus'] =
        '你尚不确定国籍身份是否适用。该协定仅限中华人民共和国公民申请，建议核对护照颁发国及双边协定范围。';
    }

    if (scopeRec.ageBand === 'outside_18_30') {
      warnings['scope.ageBand'] =
        '中国打工度假协定要求申请人在递交签证时年满 18 周岁且未满 31 周岁。若超出该年龄区间，可能不符合本协定申请范围，请核实生日与预计递签日。';
    } else if (scopeRec.ageBand === 'need_check') {
      warnings['scope.ageBand'] =
        '你尚不确定递签时的周岁年龄是否在 18 至 30 周岁之间。建议结合护照出生日期与移民局开放递签日期确认是否符合年龄要求。';
    }

    if (scopeRec.applicationResidence === 'outside_scope') {
      warnings['scope.applicationResidence'] =
        '中国打工度假协定要求申请人通常居住在中国大陆且递签时实际身处中国境内。若常住境外或递签时不在中国本土，可能不符合本协定的递交要求。';
    } else if (scopeRec.applicationResidence === 'need_check') {
      warnings['scope.applicationResidence'] =
        '你尚不确定是否满足常住中国本土及在境内递交的要求。建议在递签前核实居所要求及相关支持凭证。';
    }

    if (scopeRec.previousNzWorkingHolidayVisa === 'yes') {
      warnings['scope.previousNzWorkingHolidayVisa'] =
        '新西兰打工度假签证通常一生仅限获批一次。若此前曾获得过该签证，可能无法再次申请，建议咨询官方或查阅其他临时签证路线。';
    } else if (scopeRec.previousNzWorkingHolidayVisa === 'need_check') {
      warnings['scope.previousNzWorkingHolidayVisa'] =
        '你尚不确定以往是否曾获批过新西兰打工度假签证。建议核对历史签证信或出入境记录以确认既往获签情况。';
    }
  }

  return {
    validationErrors,
    warnings,
    answersForChecklist: cleaned
  };
}
