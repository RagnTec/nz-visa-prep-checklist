import type { RouteCategory, RoutePack } from '../domain/route';
import {
  formatJurisdictionLabel,
  formatRouteCategorySectionLabel,
  formatRouteDisplayName,
  formatRoutePrimaryLabel
} from '../i18n';
import {
  NZ_STUDENT_FEE_PAYING_ROUTE_ID,
  nzStudentFeePayingRoutePack
} from './nz/student-fee-paying';
import {
  NZ_VISITOR_ROUTE_ID,
  nzVisitorRoutePack
} from './nz/visitor';
import {
  CA_STUDY_PERMIT_ROUTE_ID,
  caStudyPermitRoutePack
} from './ca/study-permit';
import {
  CA_VISITOR_ROUTE_ID,
  caVisitorRoutePack
} from './ca/visitor';
import {
  AU_VISITOR_ROUTE_ID,
  auVisitorRoutePack
} from './au/visitor';
import {
  NZ_AEWV_ROUTE_ID,
  nzAewvRoutePack
} from './nz/aewv';
import {
  NZ_CHINA_WORKING_HOLIDAY_ROUTE_ID,
  nzChinaWorkingHolidayRoutePack
} from './nz/china-working-holiday';
import {
  NZ_POST_STUDY_WORK_ROUTE_ID,
  nzPostStudyWorkRoutePack
} from './nz/post-study-work';
import {
  CA_EMPLOYER_SPECIFIC_WORK_PERMIT_ROUTE_ID,
  caEmployerSpecificWorkPermitRoutePack
} from './ca/employer-specific-work-permit';
import {
  US_F1_STUDENT_ROUTE_ID,
  usF1StudentRoutePack
} from './us/f1-student';
import {
  US_B_VISITOR_ROUTE_ID,
  usBVisitorRoutePack
} from './us/b-visitor';

export const DEFAULT_ROUTE_ID = NZ_STUDENT_FEE_PAYING_ROUTE_ID;

const routeRegistry: ReadonlyMap<string, RoutePack> = new Map<string, RoutePack>([
  [nzStudentFeePayingRoutePack.id, nzStudentFeePayingRoutePack],
  [nzVisitorRoutePack.id, nzVisitorRoutePack],
  [caStudyPermitRoutePack.id, caStudyPermitRoutePack],
  [caVisitorRoutePack.id, caVisitorRoutePack],
  [auVisitorRoutePack.id, auVisitorRoutePack],
  [nzAewvRoutePack.id, nzAewvRoutePack],
  [nzChinaWorkingHolidayRoutePack.id, nzChinaWorkingHolidayRoutePack],
  [nzPostStudyWorkRoutePack.id, nzPostStudyWorkRoutePack],
  [caEmployerSpecificWorkPermitRoutePack.id, caEmployerSpecificWorkPermitRoutePack],
  [usF1StudentRoutePack.id, usF1StudentRoutePack],
  [usBVisitorRoutePack.id, usBVisitorRoutePack]
]);

export function getRoutePack(routeId: string = DEFAULT_ROUTE_ID): RoutePack {
  const pack = routeRegistry.get(routeId);
  if (!pack) {
    throw new Error(`Unknown route ID: "${routeId}". No matching RoutePack found.`);
  }
  return pack;
}

export function isRegisteredRouteId(routeId: string): boolean {
  return routeRegistry.has(routeId);
}

export interface RouteOption {
  readonly routeId: string;
  readonly label: string;
  readonly displayName: string;
  readonly eyebrow?: string;
  readonly description: string;
  readonly jurisdiction: string;
  readonly routeCategory: RouteCategory;
}

function projectRouteOption(pack: RoutePack, description: string): RouteOption {
  return {
    routeId: pack.id,
    label: formatRoutePrimaryLabel(pack.jurisdiction, pack.routeCategory),
    displayName: formatRouteDisplayName(pack.id),
    eyebrow: pack.eyebrow,
    description,
    jurisdiction: pack.jurisdiction,
    routeCategory: pack.routeCategory
  };
}

export const SUPPORTED_ROUTE_OPTIONS: readonly RouteOption[] = [
  projectRouteOption(
    nzStudentFeePayingRoutePack,
    '适用于已确定申请新西兰自费学生签证（Fee Paying Student Visa）的成年申请人'
  ),
  projectRouteOption(
    nzVisitorRoutePack,
    '适用于前往新西兰旅游、度假、探访亲友或短期学习的成年申请人'
  ),
  projectRouteOption(
    caStudyPermitRoutePack,
    '适用于在加拿大境外申请高等院校学习许可（Study Permit）的成年主申请人'
  ),
  projectRouteOption(
    caVisitorRoutePack,
    '适用于前往加拿大进行个人旅游度假的成年申请人（当前覆盖个人旅游访问准备）'
  ),
  projectRouteOption(
    auVisitorRoutePack,
    '适用于在澳大利亚境外递交申请的成年申请人（当前覆盖个人旅游访问准备）'
  ),
  projectRouteOption(
    nzAewvRoutePack,
    '适用于已确定申请新西兰认可雇主工作签证（AEWV），并持有认可雇主全职工作聘约的成年申请人'
  ),
  projectRouteOption(
    nzChinaWorkingHolidayRoutePack,
    '适用于符合新西兰与中国打工度假双边协定范围、自行筹备申请材料的中国青年申请人'
  ),
  projectRouteOption(
    nzPostStudyWorkRoutePack,
    '适用于近期在新西兰完成符合政策要求的全日制课程并拟申请毕业后工签的成年申请人'
  ),
  projectRouteOption(
    caEmployerSpecificWorkPermitRoutePack,
    '适用于已获得加拿大雇主聘约并在境外申请雇主特定工签（非魁省）的成年申请人'
  ),
  projectRouteOption(
    usF1StudentRoutePack,
    '适用于在美国境外准备首次申请 F-1 学生签证，赴美参加符合 F-1 类别的学术或语言学习项目的成年申请人'
  ),
  projectRouteOption(
    usBVisitorRoutePack,
    '适用于在美国境外准备美国旅游/访问签证，用于旅游、度假、探亲访友或就医等临时访问目的的成年申请人'
  )
];

export interface RouteCategoryGroup {
  readonly routeCategory: RouteCategory;
  readonly categoryLabel: string;
  readonly options: readonly RouteOption[];
}

export interface RouteJurisdictionGroup {
  readonly jurisdiction: string;
  readonly jurisdictionLabel: string;
  readonly categories: readonly RouteCategoryGroup[];
  readonly options: readonly RouteOption[];
}

const CATEGORY_DISPLAY_ORDER: Record<RouteCategory, number> = {
  study: 0,
  visit: 1,
  work: 2
};

export function groupRouteOptionsByJurisdiction(
  options: readonly RouteOption[] = SUPPORTED_ROUTE_OPTIONS
): readonly RouteJurisdictionGroup[] {
  const jurisdictionOrder: string[] = [];
  const groupsMap = new Map<string, RouteOption[]>();

  for (const option of options) {
    let list = groupsMap.get(option.jurisdiction);
    if (!list) {
      list = [];
      groupsMap.set(option.jurisdiction, list);
      jurisdictionOrder.push(option.jurisdiction);
    }
    list.push(option);
  }

  return jurisdictionOrder.map((jurisdiction) => {
    const list = groupsMap.get(jurisdiction) ?? [];
    const sortedOptions = [...list].sort((a, b) => {
      const orderA = CATEGORY_DISPLAY_ORDER[a.routeCategory] ?? 99;
      const orderB = CATEGORY_DISPLAY_ORDER[b.routeCategory] ?? 99;
      return orderA - orderB;
    });

    const categoryBuckets = new Map<RouteCategory, RouteOption[]>();
    for (const opt of sortedOptions) {
      let bucket = categoryBuckets.get(opt.routeCategory);
      if (!bucket) {
        bucket = [];
        categoryBuckets.set(opt.routeCategory, bucket);
      }
      bucket.push(opt);
    }

    const categories: RouteCategoryGroup[] = [];
    const canonicalCategories: readonly RouteCategory[] = ['study', 'visit', 'work'];
    for (const cat of canonicalCategories) {
      const catOptions = categoryBuckets.get(cat);
      if (catOptions && catOptions.length > 0) {
        categories.push({
          routeCategory: cat,
          categoryLabel: formatRouteCategorySectionLabel(cat),
          options: catOptions
        });
      }
    }

    return {
      jurisdiction,
      jurisdictionLabel: formatJurisdictionLabel(jurisdiction),
      categories,
      options: sortedOptions
    };
  });
}

export {
  NZ_STUDENT_FEE_PAYING_ROUTE_ID,
  nzStudentFeePayingRoutePack,
  NZ_VISITOR_ROUTE_ID,
  nzVisitorRoutePack,
  CA_STUDY_PERMIT_ROUTE_ID,
  caStudyPermitRoutePack,
  CA_VISITOR_ROUTE_ID,
  caVisitorRoutePack,
  AU_VISITOR_ROUTE_ID,
  auVisitorRoutePack,
  NZ_AEWV_ROUTE_ID,
  nzAewvRoutePack,
  NZ_CHINA_WORKING_HOLIDAY_ROUTE_ID,
  nzChinaWorkingHolidayRoutePack,
  NZ_POST_STUDY_WORK_ROUTE_ID,
  nzPostStudyWorkRoutePack,
  CA_EMPLOYER_SPECIFIC_WORK_PERMIT_ROUTE_ID,
  caEmployerSpecificWorkPermitRoutePack,
  US_F1_STUDENT_ROUTE_ID,
  usF1StudentRoutePack,
  US_B_VISITOR_ROUTE_ID,
  usBVisitorRoutePack
};
