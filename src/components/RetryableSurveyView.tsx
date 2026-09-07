import React, { Suspense, useMemo, lazy, type ReactNode, type ComponentType } from 'react';
import type { SurveyWorkflowViewProps } from './SurveyWorkflowView';

const defaultSurveyLoader = () => import('./SurveyWorkflowView');

export interface RetryableSurveyViewProps extends SurveyWorkflowViewProps {
  readonly retryKey: number | string;
  readonly fallback?: ReactNode;
  readonly loader?: () => Promise<{ default: ComponentType<SurveyWorkflowViewProps> }>;
}

export function RetryableSurveyView({
  retryKey,
  fallback,
  loader = defaultSurveyLoader,
  ...workflowProps
}: RetryableSurveyViewProps) {
  // Create a fresh React.lazy instance whenever retryKey or loader changes,
  // ensuring the dynamic import loader function can be executed again on retry.
  const LazyWorkflow = useMemo(
    () => lazy(loader),
    [retryKey, loader]
  );

  return (
    <Suspense
      fallback={
        fallback ?? (
          <div
            className="survey-loading-fallback"
            role="status"
            style={{ padding: '2rem', textAlign: 'center' }}
          >
            <p>正在加载情况问卷…</p>
          </div>
        )
      }
    >
      <LazyWorkflow {...workflowProps} />
    </Suspense>
  );
}
