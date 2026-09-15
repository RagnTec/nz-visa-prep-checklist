import React, { Suspense, lazy, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RetryableSurveyView } from '../src/components/RetryableSurveyView';
import { SurveyErrorBoundary } from '../src/components/SurveyErrorBoundary';
import SurveyWorkflowView, {
  type SurveyProgress,
  type SurveyWorkflowViewProps
} from '../src/components/SurveyWorkflowView';
import { ApplicationContextBar } from '../src/components/ApplicationContextBar';
import type { RoutePack } from '../src/domain/route';

describe('SurveyErrorBoundary', () => {
  it('renders children when no error is thrown', () => {
    render(
      <SurveyErrorBoundary>
        <div data-testid="child">Normal Content</div>
      </SurveyErrorBoundary>
    );

    expect(screen.getByTestId('child')).toHaveTextContent('Normal Content');
  });

  it('catches render error, displays friendly alert message and local retry button', () => {
    const ProblemChild = () => {
      throw new Error('Failed to fetch dynamically imported module');
    };

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <SurveyErrorBoundary>
        <ProblemChild />
      </SurveyErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('加载情况问卷失败，请检查网络后重试。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重新加载' })).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it('calls onRetry callback and resets internal error state when retry button is clicked', () => {
    let shouldThrow = true;
    const TestComponent = () => {
      if (shouldThrow) {
        throw new Error('Chunk load failed');
      }
      return <div data-testid="recovered">Recovered Successfully</div>;
    };

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onRetry = vi.fn(() => {
      shouldThrow = false;
    });

    render(
      <SurveyErrorBoundary onRetry={onRetry}>
        <TestComponent />
      </SurveyErrorBoundary>
    );

    expect(screen.getByText('加载情况问卷失败，请检查网络后重试。')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '重新加载' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('recovered')).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });
});

describe('SurveyWorkflowView lazy boundary integration', () => {
  const dummyRoutePack = {
    id: 'test-route',
    title: 'Test Route',
    questions: { pages: [{ name: 'page1', elements: [{ type: 'text', name: 'q1' }] }] },
    evaluateEffects: vi.fn(() => ({ validationErrors: {}, warnings: {}, answersForChecklist: {} })),
    items: [],
    rules: [],
    sources: []
  } as unknown as any;

  it('displays fallback with role="status" and text "正在加载情况问卷…" while loading', async () => {
    let resolvePromise: (value: { default: React.ComponentType<SurveyWorkflowViewProps> }) => void;
    const pendingImport = new Promise<{ default: React.ComponentType<SurveyWorkflowViewProps> }>((resolve) => {
      resolvePromise = resolve;
    });

    const LazySurvey = lazy(() => pendingImport);

    const fallback = (
      <div className="survey-loading-fallback" role="status">
        <p>正在加载情况问卷…</p>
      </div>
    );

    render(
      <Suspense fallback={fallback}>
        <LazySurvey
          activeRoutePack={dummyRoutePack}
          activeProjectId="test-app"
          answers={null}
          surveyCompleted={false}
          onAnswersChange={vi.fn()}
          onSurveyComplete={vi.fn()}
          onProgressChange={vi.fn()}
        />
      </Suspense>
    );

    const loadingElem = screen.getByRole('status');
    expect(loadingElem).toHaveTextContent('正在加载情况问卷…');

    const MockComponent: React.FC<SurveyWorkflowViewProps> = ({ onProgressChange }) => {
      React.useEffect(() => {
        onProgressChange({
          currentStep: 1,
          totalSteps: 3,
          summary: '情况问卷 · 1 / 3'
        });
      }, [onProgressChange]);
      return <div data-testid="survey-content">Survey Content Loaded</div>;
    };

    resolvePromise!({ default: MockComponent });

    await screen.findByTestId('survey-content');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('updates ApplicationContextBar with step progress and summary reported by SurveyWorkflowView', async () => {
    const Harness = () => {
      const [progress, setProgress] = useState<SurveyProgress | null>(null);

      return (
        <>
          <ApplicationContextBar
            applicantDisplayName="Test Applicant"
            routeLabel="测试路线"
            onViewHub={vi.fn()}
            progressSummary={progress?.summary}
            surveyStepProgress={
              progress
                ? { currentStep: progress.currentStep, totalSteps: progress.totalSteps }
                : null
            }
          />
          <button
            type="button"
            onClick={() =>
              setProgress({
                currentStep: 2,
                totalSteps: 5,
                summary: '情况问卷 · 2 / 5'
              })
            }
          >
            Simulate Progress Update
          </button>
        </>
      );
    };

    render(<Harness />);

    expect(screen.queryByText('情况问卷 · 2 / 5')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Simulate Progress Update'));

    expect(screen.getByText('情况问卷 · 2 / 5')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: '问卷进度' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });

  it('retries dynamic import with a fresh lazy component when retry button is clicked', async () => {
    let attempts = 0;
    const loader = vi.fn(async () => {
      attempts++;
      if (attempts === 1) {
        throw new Error('Network chunk load error');
      }
      return {
        default: ({ onProgressChange }: SurveyWorkflowViewProps) => {
          React.useEffect(() => {
            onProgressChange({
              currentStep: 1,
              totalSteps: 3,
              summary: '情况问卷 · 1 / 3'
            });
          }, [onProgressChange]);
          return <div data-testid="survey-retry-content">Survey Content Loaded On Retry</div>;
        }
      };
    });

    const Harness = () => {
      const [retryKey, setRetryKey] = useState(0);

      return (
        <SurveyErrorBoundary
          key={retryKey}
          onRetry={() => setRetryKey((k) => k + 1)}
        >
          <RetryableSurveyView
            retryKey={retryKey}
            loader={loader}
            activeRoutePack={dummyRoutePack}
            activeProjectId="test-app"
            answers={null}
            surveyCompleted={false}
            onAnswersChange={vi.fn()}
            onSurveyComplete={vi.fn()}
            onProgressChange={vi.fn()}
          />
        </SurveyErrorBoundary>
      );
    };

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<Harness />);

    // Step 1: Initial load attempt occurs and rejects
    expect(loader).toHaveBeenCalledTimes(1);

    // Step 2: Survey error UI appears
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('加载情况问卷失败，请检查网络后重试。')).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: '重新加载' });
    expect(retryBtn).toBeInTheDocument();

    // Step 3: User clicks retry
    fireEvent.click(retryBtn);

    // Step 4: Lazy loader invocation #2 occurs with fresh lazy component generation
    expect(loader).toHaveBeenCalledTimes(2);

    // Step 5 & 6: Second load resolves and survey content renders successfully
    await screen.findByTestId('survey-retry-content');
    expect(screen.getByText('Survey Content Loaded On Retry')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it('reports initial survey progress on mount and survives remounting without losing progress', () => {
    const multiPageRoutePack = {
      id: 'test-multi-page',
      title: 'Multi Page Route',
      questions: {
        pages: [
          { name: 'page1', elements: [{ type: 'text', name: 'q1', title: 'Question 1' }] },
          { name: 'page2', elements: [{ type: 'text', name: 'q2', title: 'Question 2' }] },
          { name: 'page3', elements: [{ type: 'text', name: 'q3', title: 'Question 3' }] }
        ]
      },
      evaluateEffects: vi.fn(() => ({ validationErrors: {}, warnings: {}, answersForChecklist: {} })),
      cleanStaleAnswers: vi.fn((a) => a),
      immediateEffectFields: []
    } as unknown as RoutePack;

    const onProgressChange = vi.fn();

    const { unmount } = render(
      <SurveyWorkflowView
        activeRoutePack={multiPageRoutePack}
        activeProjectId="test-app-progress"
        answers={null}
        surveyCompleted={false}
        onAnswersChange={vi.fn()}
        onSurveyComplete={vi.fn()}
        onProgressChange={onProgressChange}
      />
    );

    // Initial progress is dispatched immediately on first render of page 1
    expect(onProgressChange).toHaveBeenCalledWith({
      currentStep: 1,
      totalSteps: 3,
      summary: '情况问卷 · 1 / 3'
    });

    // Unmounting cleans up progress to null
    unmount();
    expect(onProgressChange).toHaveBeenLastCalledWith(null);

    // Remounting (simulating StrictMode or re-entry) immediately re-synchronizes progress
    render(
      <SurveyWorkflowView
        activeRoutePack={multiPageRoutePack}
        activeProjectId="test-app-progress"
        answers={null}
        surveyCompleted={false}
        onAnswersChange={vi.fn()}
        onSurveyComplete={vi.fn()}
        onProgressChange={onProgressChange}
      />
    );

    expect(onProgressChange).toHaveBeenLastCalledWith({
      currentStep: 1,
      totalSteps: 3,
      summary: '情况问卷 · 1 / 3'
    });
  });
});
