import type { RoutePack } from '../domain/route';
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

export const DEFAULT_ROUTE_ID = NZ_STUDENT_FEE_PAYING_ROUTE_ID;

const routeRegistry: ReadonlyMap<string, RoutePack> = new Map<string, RoutePack>([
  [nzStudentFeePayingRoutePack.id, nzStudentFeePayingRoutePack],
  [nzVisitorRoutePack.id, nzVisitorRoutePack],
  [caStudyPermitRoutePack.id, caStudyPermitRoutePack]
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
  readonly description: string;
  readonly jurisdiction: string;
}

export const SUPPORTED_ROUTE_OPTIONS: readonly RouteOption[] = [
  {
    routeId: NZ_STUDENT_FEE_PAYING_ROUTE_ID,
    label: '新西兰 · 自费学生签证',
    description: '适用于已确定申请新西兰自费学生签证（Fee Paying Student Visa）的成年申请人',
    jurisdiction: 'nz'
  },
  {
    routeId: NZ_VISITOR_ROUTE_ID,
    label: '新西兰 · 访问签证',
    description: '适用于前往新西兰旅游、度假、探访亲友或短期学习的成年申请人',
    jurisdiction: 'nz'
  },
  {
    routeId: CA_STUDY_PERMIT_ROUTE_ID,
    label: '加拿大 · 学习许可',
    description: '适用于在加拿大境外申请高等院校学习许可（Study Permit）的成年主申请人',
    jurisdiction: 'ca'
  }
];

export {
  NZ_STUDENT_FEE_PAYING_ROUTE_ID,
  nzStudentFeePayingRoutePack,
  NZ_VISITOR_ROUTE_ID,
  nzVisitorRoutePack,
  CA_STUDY_PERMIT_ROUTE_ID,
  caStudyPermitRoutePack
};
