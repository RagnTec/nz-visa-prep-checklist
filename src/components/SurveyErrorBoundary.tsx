import React, { Component, type ReactNode, type ErrorInfo } from 'react';

export interface SurveyErrorBoundaryProps {
  readonly children: ReactNode;
  readonly onRetry?: () => void;
}

export interface SurveyErrorBoundaryState {
  readonly hasError: boolean;
  readonly error: Error | null;
}

export class SurveyErrorBoundary extends Component<SurveyErrorBoundaryProps, SurveyErrorBoundaryState> {
  constructor(props: SurveyErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): SurveyErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo): void {
    // Retain error state; avoid unnecessary logging in production
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="survey-error-card" role="alert" style={{ padding: '2rem', textAlign: 'center' }}>
          <p>加载情况问卷失败，请检查网络后重试。</p>
          <button type="button" className="secondary" onClick={this.handleRetry}>
            重新加载
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
