import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApplicationContextBar } from '../src/components/ApplicationContextBar';

describe('ApplicationContextBar component', () => {
  it('renders applicant display name and route label clearly', () => {
    render(
      <ApplicationContextBar
        applicantDisplayName="Alice Smith"
        routeLabel="新西兰 · 自费学生签证"
        onViewHub={vi.fn()}
      />
    );

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('新西兰 · 自费学生签证')).toBeInTheDocument();
  });

  it('renders "‹ 申请中心" button and invokes onViewHub when clicked', () => {
    const onViewHub = vi.fn();
    render(
      <ApplicationContextBar
        applicantDisplayName="Bob Jones"
        routeLabel="新西兰 · 访问签证"
        onViewHub={onViewHub}
      />
    );

    const hubButton = screen.getByRole('button', { name: '返回申请中心' });
    expect(hubButton).toHaveTextContent('‹ 申请中心');

    fireEvent.click(hubButton);
    expect(onViewHub).toHaveBeenCalledTimes(1);
  });

  it('renders "申请人档案" button when onViewProfile is provided and invokes it on click', () => {
    const onViewProfile = vi.fn();
    render(
      <ApplicationContextBar
        applicantDisplayName="Charlie Brown"
        routeLabel="新西兰 · 自费学生签证"
        onViewHub={vi.fn()}
        onViewProfile={onViewProfile}
      />
    );

    const profileButton = screen.getByRole('button', { name: '申请人档案' });
    expect(profileButton).toBeInTheDocument();

    fireEvent.click(profileButton);
    expect(onViewProfile).toHaveBeenCalledTimes(1);
  });

  it('omits "申请人档案" button when onViewProfile is not provided', () => {
    render(
      <ApplicationContextBar
        applicantDisplayName="Alice Smith"
        routeLabel="新西兰 · 自费学生签证"
        onViewHub={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: '申请人档案' })).not.toBeInTheDocument();
  });

  it('renders progress summary when provided', () => {
    render(
      <ApplicationContextBar
        applicantDisplayName="Alice Smith"
        routeLabel="新西兰 · 自费学生签证"
        onViewHub={vi.fn()}
        progressSummary="情况问卷 · 3 / 7"
      />
    );

    expect(screen.getByText('情况问卷 · 3 / 7')).toBeInTheDocument();
  });

  it('renders checklist progress summary when provided', () => {
    render(
      <ApplicationContextBar
        applicantDisplayName="Alice Smith"
        routeLabel="新西兰 · 自费学生签证"
        onViewHub={vi.fn()}
        progressSummary="材料清单 · 8 / 23 已处理"
      />
    );

    expect(screen.getByText('材料清单 · 8 / 23 已处理')).toBeInTheDocument();
  });

  it('renders survey stepper segments with correct status and aria attributes', () => {
    const { container } = render(
      <ApplicationContextBar
        applicantDisplayName="Alice Smith"
        routeLabel="新西兰 · 自费学生签证"
        onViewHub={vi.fn()}
        progressSummary="情况问卷 · 4 / 7"
        surveyStepProgress={{
          currentStep: 4,
          totalSteps: 7
        }}
      />
    );

    const stepper = screen.getByRole('list', { name: '问卷进度' });
    expect(stepper).toBeInTheDocument();

    const segments = container.querySelectorAll('.context-step-segment');
    expect(segments).toHaveLength(7);

    // Steps 1 to 3 should be completed
    for (let i = 0; i < 3; i++) {
      expect(segments[i]).toHaveClass('step-completed');
      expect(segments[i]).toHaveAttribute('data-status', 'completed');
      expect(segments[i]).not.toHaveAttribute('aria-current');
    }

    // Step 4 should be current
    expect(segments[3]).toHaveClass('step-current');
    expect(segments[3]).toHaveAttribute('data-status', 'current');
    expect(segments[3]).toHaveAttribute('aria-current', 'step');

    // Steps 5 to 7 should be upcoming
    for (let i = 4; i < 7; i++) {
      expect(segments[i]).toHaveClass('step-upcoming');
      expect(segments[i]).toHaveAttribute('data-status', 'upcoming');
      expect(segments[i]).not.toHaveAttribute('aria-current');
    }
  });

  it('does not render internal IDs or the word Workspace', () => {
    render(
      <ApplicationContextBar
        applicantDisplayName="Alice Smith"
        routeLabel="新西兰 · 自费学生签证"
        onViewHub={vi.fn()}
        onViewProfile={vi.fn()}
        progressSummary="情况问卷 · 1 / 5"
      />
    );

    expect(screen.queryByText(/Workspace/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/person-[a-z0-9-]+/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/app-[a-z0-9-]+/i)).not.toBeInTheDocument();
  });
});
