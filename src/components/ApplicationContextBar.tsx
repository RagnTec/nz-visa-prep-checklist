export interface SurveyStepProgress {
  readonly currentStep: number;
  readonly totalSteps: number;
}

export interface ApplicationContextBarProps {
  readonly applicantDisplayName: string;
  readonly routeLabel: string;
  readonly onViewHub: () => void;
  readonly onViewProfile?: () => void;
  readonly progressSummary?: string | null;
  readonly surveyStepProgress?: SurveyStepProgress | null;
}

export function ApplicationContextBar({
  applicantDisplayName,
  routeLabel,
  onViewHub,
  onViewProfile,
  progressSummary,
  surveyStepProgress
}: ApplicationContextBarProps) {
  return (
    <header className="app-context-bar no-print" aria-label="当前申请上下文">
      <div className="app-context-bar-inner">
        <div className="app-context-primary">
          <button
            type="button"
            className="context-hub-btn"
            onClick={onViewHub}
            aria-label="返回申请中心"
          >
            ‹ 申请中心
          </button>
          <div className="context-identity">
            <span className="context-applicant-name">{applicantDisplayName}</span>
            <span className="context-separator" aria-hidden="true">·</span>
            <span className="context-route-label">{routeLabel}</span>
            {progressSummary ? (
              <>
                <span className="context-separator" aria-hidden="true">·</span>
                <span className="context-progress-summary">{progressSummary}</span>
              </>
            ) : null}
            {surveyStepProgress && surveyStepProgress.totalSteps > 0 ? (
              <ol className="context-stepper" aria-label="问卷进度">
                {Array.from({ length: surveyStepProgress.totalSteps }, (_, idx) => {
                  const stepNumber = idx + 1;
                  const isCompleted = stepNumber < surveyStepProgress.currentStep;
                  const isCurrent = stepNumber === surveyStepProgress.currentStep;
                  const status = isCurrent ? 'current' : isCompleted ? 'completed' : 'upcoming';
                  const statusClass = isCurrent ? 'step-current' : isCompleted ? 'step-completed' : 'step-upcoming';
                  return (
                    <li
                      key={stepNumber}
                      className={`context-step-segment ${statusClass}`}
                      aria-current={isCurrent ? 'step' : undefined}
                      data-status={status}
                      aria-label={`第 ${stepNumber} 步，共 ${surveyStepProgress.totalSteps} 步（${isCurrent ? '当前' : isCompleted ? '已完成' : '未开始'}）`}
                    />
                  );
                })}
              </ol>
            ) : null}
          </div>
        </div>

        {onViewProfile ? (
          <div className="app-context-actions">
            <button
              type="button"
              className="context-profile-btn"
              onClick={onViewProfile}
            >
              申请人档案
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}

