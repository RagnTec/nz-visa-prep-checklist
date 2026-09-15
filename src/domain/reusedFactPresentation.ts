import type { ReusedFactStates } from './applicationFactMaterialization';
import {
  confirmMaterializedFactInApplication,
  type ConfirmMaterializedFactResult
} from './applicationFactMaterialization';

export type ReusedFactPresentationKind =
  | 'no_reuse'
  | 'safe_reuse'
  | 'confirm_reuse_pending'
  | 'confirm_reuse_confirmed';

export type ReusedFactPresentationState =
  | {
      readonly kind: 'no_reuse';
    }
  | {
      readonly kind: 'safe_reuse';
      readonly label: string;
      readonly allowsConfirmation: false;
      readonly lastConfirmedAt?: string;
    }
  | {
      readonly kind: 'confirm_reuse_pending';
      readonly label: string;
      readonly allowsConfirmation: true;
      readonly lastConfirmedAt?: string;
    }
  | {
      readonly kind: 'confirm_reuse_confirmed';
      readonly label: string;
      readonly allowsConfirmation: false;
      readonly confirmedAt?: string;
      readonly lastConfirmedAt?: string;
    };

import { REUSED_FACT_LABELS, type ReusedFactLabelKey } from '../i18n';

export { REUSED_FACT_LABELS };

export function resolveReusedFactPresentation(
  applicationPath: string,
  reusedFactStates?: ReusedFactStates,
  _currentAnswer?: unknown,
  resolveLabel: (kind: ReusedFactLabelKey) => string = (k) => REUSED_FACT_LABELS[k]
): ReusedFactPresentationState {
  if (!applicationPath || !reusedFactStates) {
    return { kind: 'no_reuse' };
  }

  const state = reusedFactStates[applicationPath];
  if (!state) {
    return { kind: 'no_reuse' };
  }

  if (state.reusePolicy === 'safe_reuse') {
    return {
      kind: 'safe_reuse',
      label: resolveLabel('safe_reuse'),
      allowsConfirmation: false,
      lastConfirmedAt: state.lastConfirmedAt
    };
  }

  if (state.status === 'confirmed') {
    return {
      kind: 'confirm_reuse_confirmed',
      label: resolveLabel('confirm_reuse_confirmed'),
      allowsConfirmation: false,
      confirmedAt: state.confirmedAt,
      lastConfirmedAt: state.lastConfirmedAt
    };
  }

  return {
    kind: 'confirm_reuse_pending',
    label: resolveLabel('confirm_reuse_pending'),
    allowsConfirmation: true,
    lastConfirmedAt: state.lastConfirmedAt
  };
}

export interface ConfirmApplicationReusedFactInput {
  readonly applicationPath: string;
  readonly reusedFactStates: ReusedFactStates;
  readonly confirmedAt: string;
}

export function confirmApplicationReusedFact(
  input: ConfirmApplicationReusedFactInput
): ConfirmMaterializedFactResult {
  return confirmMaterializedFactInApplication({
    applicationPath: input.applicationPath,
    reusedFactStates: input.reusedFactStates,
    confirmedAt: input.confirmedAt
  });
}
