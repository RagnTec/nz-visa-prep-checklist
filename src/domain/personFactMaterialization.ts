import type { PilotFactKey, PersonFactBinding } from './personFactBindings';
import type {
  PersonFactProfile,
  ResidentialAddress
} from './personFacts';
import type { RoutePack } from './route';

export interface BaseMaterializationCandidate<
  TKey extends PilotFactKey = PilotFactKey,
  TValue = unknown
> {
  readonly applicationPath: string;
  readonly factKey: TKey;
  readonly reusePolicy: 'safe_reuse' | 'confirm_reuse';
  readonly value: TValue;
  readonly lastConfirmedAt: string;
  readonly sourceApplicationId?: string;
}

export type DateOfBirthMaterializationCandidate = BaseMaterializationCandidate<
  'dateOfBirth',
  string
>;
export type EmailMaterializationCandidate = BaseMaterializationCandidate<
  'email',
  string
>;
export type ResidentialAddressMaterializationCandidate = BaseMaterializationCandidate<
  'residentialAddress',
  ResidentialAddress
>;

export type MaterializationCandidate =
  | DateOfBirthMaterializationCandidate
  | EmailMaterializationCandidate
  | ResidentialAddressMaterializationCandidate;

export interface FactMaterializationResolution {
  readonly allCandidates: readonly MaterializationCandidate[];
  readonly safeReuseCandidates: readonly MaterializationCandidate[];
  readonly confirmReuseCandidates: readonly MaterializationCandidate[];
}

function extractPersonFactBindings(
  routeOrBindings: RoutePack | readonly PersonFactBinding[] | undefined
): readonly PersonFactBinding[] {
  if (!routeOrBindings) return [];
  if (Array.isArray(routeOrBindings)) return routeOrBindings;
  if ('personFactBindings' in routeOrBindings && Array.isArray(routeOrBindings.personFactBindings)) {
    return routeOrBindings.personFactBindings;
  }
  return [];
}

export function resolveMaterializationCandidates(
  routeOrBindings: RoutePack | readonly PersonFactBinding[] | undefined,
  profile: PersonFactProfile | undefined
): FactMaterializationResolution {
  if (!profile || !profile.facts || typeof profile.facts !== 'object') {
    return {
      allCandidates: [],
      safeReuseCandidates: [],
      confirmReuseCandidates: []
    };
  }

  const bindings = extractPersonFactBindings(routeOrBindings);

  if (bindings.length === 0) {
    return {
      allCandidates: [],
      safeReuseCandidates: [],
      confirmReuseCandidates: []
    };
  }

  const allCandidates: MaterializationCandidate[] = [];

  for (const binding of bindings) {
    if (!binding || typeof binding !== 'object') continue;

    if (binding.factKey === 'dateOfBirth') {
      const fact = profile.facts.dateOfBirth;
      if (fact && typeof fact.date === 'string' && fact.date) {
        allCandidates.push({
          applicationPath: binding.applicationPath,
          factKey: 'dateOfBirth',
          reusePolicy: 'safe_reuse',
          value: fact.date,
          lastConfirmedAt: fact.lastConfirmedAt,
          ...(fact.sourceApplicationId ? { sourceApplicationId: fact.sourceApplicationId } : {})
        });
      }
    } else if (binding.factKey === 'email') {
      const fact = profile.facts.email;
      if (fact && typeof fact.email === 'string' && fact.email) {
        allCandidates.push({
          applicationPath: binding.applicationPath,
          factKey: 'email',
          reusePolicy: 'confirm_reuse',
          value: fact.email,
          lastConfirmedAt: fact.lastConfirmedAt,
          ...(fact.sourceApplicationId ? { sourceApplicationId: fact.sourceApplicationId } : {})
        });
      }
    } else if (binding.factKey === 'residentialAddress') {
      const fact = profile.facts.residentialAddress;
      if (fact && fact.address && typeof fact.address === 'object') {
        allCandidates.push({
          applicationPath: binding.applicationPath,
          factKey: 'residentialAddress',
          reusePolicy: 'confirm_reuse',
          value: fact.address,
          lastConfirmedAt: fact.lastConfirmedAt,
          ...(fact.sourceApplicationId ? { sourceApplicationId: fact.sourceApplicationId } : {})
        });
      }
    }
  }

  const safeReuseCandidates = allCandidates.filter((c) => c.reusePolicy === 'safe_reuse');
  const confirmReuseCandidates = allCandidates.filter((c) => c.reusePolicy === 'confirm_reuse');

  return {
    allCandidates,
    safeReuseCandidates,
    confirmReuseCandidates
  };
}
