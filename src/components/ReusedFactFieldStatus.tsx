import type { ReusedFactStates } from '../domain/applicationFactMaterialization';
import {
  resolveReusedFactPresentation,
  type ReusedFactPresentationState
} from '../domain/reusedFactPresentation';

export interface ReusedFactFieldStatusProps {
  readonly applicationPath?: string;
  readonly reusedFactStates?: ReusedFactStates;
  readonly presentation?: ReusedFactPresentationState;
  readonly onConfirm?: (confirmedAt: string) => void;
  readonly onViewProfile?: () => void;
  readonly disabled?: boolean;
  readonly now?: () => string;
}

export function ReusedFactFieldStatus({
  applicationPath,
  reusedFactStates,
  presentation: explicitPresentation,
  onConfirm,
  onViewProfile,
  disabled = false,
  now
}: ReusedFactFieldStatusProps) {
  const presentation =
    explicitPresentation ??
    (applicationPath
      ? resolveReusedFactPresentation(applicationPath, reusedFactStates)
      : { kind: 'no_reuse' as const });

  if (presentation.kind === 'no_reuse') {
    return null;
  }

  const handleConfirmClick = () => {
    if (disabled || !onConfirm) return;
    const confirmedAt = now ? now() : new Date().toISOString();
    onConfirm(confirmedAt);
  };

  let badgeClass = 'reused-fact-badge';
  if (presentation.kind === 'safe_reuse') {
    badgeClass += ' safe-reuse';
  } else if (presentation.kind === 'confirm_reuse_pending') {
    badgeClass += ' pending';
  } else {
    badgeClass += ' confirmed';
  }

  return (
    <div className="reused-fact-status">
      <span className={badgeClass}>{presentation.label}</span>

      {presentation.kind === 'confirm_reuse_pending' && onConfirm ? (
        <button
          type="button"
          className="reused-fact-confirm-btn"
          onClick={handleConfirmClick}
          disabled={disabled}
        >
          确认信息
        </button>
      ) : null}

      {onViewProfile ? (
        <button
          type="button"
          className="reused-fact-link-btn"
          onClick={onViewProfile}
          disabled={disabled}
        >
          查看个人资料
        </button>
      ) : null}
    </div>
  );
}
