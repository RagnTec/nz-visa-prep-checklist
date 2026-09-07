import {
  FACT_DEFAULT_REUSE_POLICIES,
  type FactReusePolicy
} from './personFacts';

export type PilotFactKey = 'dateOfBirth' | 'email' | 'residentialAddress';

export interface PersonFactBinding<TKey extends PilotFactKey = PilotFactKey> {
  /** The dot-notated application answer path in the RoutePack (e.g. "applicant.dateOfBirth") */
  readonly applicationPath: string;
  /** The standard reusable fact key */
  readonly factKey: TKey;
  /** The reuse policy, strictly locked to the canonical default policy for this factKey */
  readonly reusePolicy: typeof FACT_DEFAULT_REUSE_POLICIES[TKey];
}

export function createPersonFactBinding<TKey extends PilotFactKey>(
  applicationPath: string,
  factKey: TKey
): PersonFactBinding<TKey> {
  const trimmedPath = typeof applicationPath === 'string' ? applicationPath.trim() : '';
  if (!trimmedPath) {
    throw new Error('applicationPath must be a non-empty string.');
  }
  if (!(factKey in FACT_DEFAULT_REUSE_POLICIES)) {
    throw new Error(`Unsupported factKey: "${factKey}".`);
  }
  return {
    applicationPath: trimmedPath,
    factKey,
    reusePolicy: FACT_DEFAULT_REUSE_POLICIES[factKey]
  };
}

export function validatePersonFactBinding(
  binding: unknown
): { readonly valid: boolean; readonly error?: string } {
  if (!binding || typeof binding !== 'object') {
    return { valid: false, error: 'Binding must be an object.' };
  }
  const b = binding as Partial<PersonFactBinding>;
  if (typeof b.applicationPath !== 'string' || !b.applicationPath.trim()) {
    return { valid: false, error: 'applicationPath must be a non-empty string.' };
  }
  if (!b.factKey || !(b.factKey in FACT_DEFAULT_REUSE_POLICIES)) {
    return { valid: false, error: `Invalid or unsupported factKey: "${String(b.factKey)}".` };
  }
  const expectedPolicy: FactReusePolicy = FACT_DEFAULT_REUSE_POLICIES[b.factKey as PilotFactKey];
  if (b.reusePolicy !== expectedPolicy) {
    return {
      valid: false,
      error: `Policy mismatch for factKey "${b.factKey}": expected "${expectedPolicy}", got "${String(b.reusePolicy)}".`
    };
  }
  return { valid: true };
}
