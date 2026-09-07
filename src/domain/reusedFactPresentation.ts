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

export const REUSED_FACT_LABELS = {
  safe_reuse: '来自个人资料',
  confirm_reuse_pending: '来自个人资料 · 待确认',
  confirm_reuse_confirmed: '已在本申请确认'
} as const;

export function resolveReusedFactPresentation(
  applicationPath: string,
  reusedFactStates?: ReusedFactStates,
  _currentAnswer?: unknown
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
      label: REUSED_FACT_LABELS.safe_reuse,
      allowsConfirmation: false,
      lastConfirmedAt: state.lastConfirmedAt
    };
  }

  if (state.status === 'confirmed') {
    return {
      kind: 'confirm_reuse_confirmed',
      label: REUSED_FACT_LABELS.confirm_reuse_confirmed,
      allowsConfirmation: false,
      confirmedAt: state.confirmedAt,
      lastConfirmedAt: state.lastConfirmedAt
    };
  }

  return {
    kind: 'confirm_reuse_pending',
    label: REUSED_FACT_LABELS.confirm_reuse_pending,
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
