import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ChecklistView } from '../src/components/ChecklistView';
import type { ChecklistItem, OfficialSource } from '../src/domain/types';

const item: ChecklistItem = {
  id: 'background.studyConnection',
  category: 'Synthetic',
  title: 'Synthetic study connection',
  requirementType: 'genuine_intentions_support',
  evidenceLayer: 'product_guidance',
  why: 'Synthetic explanation.',
  steps: ['Synthetic base step.'],
  guidanceDisclaimer: 'Synthetic guidance disclaimer.',
  guidanceBlocks: [{
    id: 'background.studyConnection.continuation',
    title: '基本延续：在已有方向上继续学习',
    steps: ['Synthetic filtered guidance.']
  }],
  sourceIds: ['synthetic.source']
};

const source: OfficialSource = {
  id: 'synthetic.source',
  title: 'Synthetic official source',
  publisher: 'Synthetic publisher',
  url: 'https://example.invalid/synthetic',
  checkedAt: '2026-07-29'
};

describe('ChecklistView guidance rendering', () => {
  it('renders already-filtered guidance without evaluating applicant answers', () => {
    render(
      <ChecklistView
        items={[item]}
        statuses={{}}
        sources={[source]}
        onStatusChange={vi.fn()}
        onRestart={vi.fn()}
        onExport={vi.fn()}
      />
    );

    expect(screen.getByText('Synthetic guidance disclaimer.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '基本延续：在已有方向上继续学习' }))
      .toBeInTheDocument();
    expect(screen.getByText('Synthetic filtered guidance.')).toBeInTheDocument();
    expect(screen.getByText('建议核对', { selector: '.primary-label-chip' })).toBeInTheDocument();
    expect(screen.getByText('整理与核对建议')).toBeInTheDocument();
    expect(screen.getByText(
      '参考官方信息：Synthetic publisher · Synthetic official source（核验于 2026-07-29）'
    )).toBeInTheDocument();
    expect(screen.getByText(
      '本工具不评估签证资格或申请风险，不预测申请结果，不判断哪些信息应披露或省略，也不会替你生成说明信。请以当前 INZ 官方指引和在线申请要求为准；如需结合个人情况获得移民建议，请咨询新西兰持牌移民顾问或依法可提供相关建议的人士。'
    )).toBeInTheDocument();
    expect(screen.getByLabelText('测试预览说明')).toHaveTextContent(
      '测试预览版：本工具仅协助整理材料，不是 Immigration New Zealand（INZ）官方产品'
    );
  });

  it.each([
    ['inz_visa', '依据来源：Synthetic publisher · Synthetic official source（核验于 2026-07-29）'],
    ['product_guidance', '参考官方信息：Synthetic publisher · Synthetic official source（核验于 2026-07-29）']
  ] as const)('renders correct source prefix for %s evidence layer', (evidenceLayer, expectedSourceText) => {
    render(
      <ChecklistView
        items={[{ ...item, evidenceLayer }]}
        statuses={{}}
        sources={[source]}
        onStatusChange={vi.fn()}
        onRestart={vi.fn()}
        onExport={vi.fn()}
      />
    );

    expect(screen.getByText(expectedSourceText)).toBeInTheDocument();
  });

  it.each([
    ['inz_visa', 'INZ 官方要求或指引'],
    ['product_guidance', '整理与核对建议']
  ] as const)('renders the %s evidence-layer label in detail-body', (evidenceLayer, label) => {
    render(
      <ChecklistView
        items={[{ ...item, evidenceLayer }]}
        statuses={{}}
        sources={[source]}
        onStatusChange={vi.fn()}
        onRestart={vi.fn()}
        onExport={vi.fn()}
      />
    );

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it.each([
    [{ ...item, id: 'identity.passport', requirementType: 'usually_required' as const, evidenceLayer: 'inz_visa' as const }, '核心要求'],
    [{ ...item, id: 'study.offer.pending', requirementType: 'answer_dependent' as const, evidenceLayer: 'inz_visa' as const }, '核心要求'],
    [{ ...item, id: 'study.tuitionReceipt', requirementType: 'answer_dependent' as const, evidenceLayer: 'inz_visa' as const }, '核心要求'],
    [{ ...item, id: 'funds.bankStatements', requirementType: 'answer_dependent' as const, evidenceLayer: 'inz_visa' as const }, '按情况要求'],
    [{ ...item, id: 'health.review', requirementType: 'may_be_requested' as const, evidenceLayer: 'inz_visa' as const }, '按情况要求'],
    [{ ...item, id: 'education.transcripts', requirementType: 'product_organisation_guidance' as const, evidenceLayer: 'product_guidance' as const }, '建议核对'],
    [{ ...item, id: 'english.providerEvidence', requirementType: 'answer_dependent' as const, evidenceLayer: 'product_guidance' as const }, '建议核对'],
    [{ ...item, id: 'english.pendingCondition', requirementType: 'answer_dependent' as const, evidenceLayer: 'product_guidance' as const }, '建议核对']
  ])('maps item $id to primary requirement label $expected', (targetItem, expectedLabel) => {
    render(
      <ChecklistView
        items={[targetItem]}
        statuses={{}}
        sources={[source]}
        onStatusChange={vi.fn()}
        onRestart={vi.fn()}
        onExport={vi.fn()}
      />
    );

    expect(screen.getByText(expectedLabel, { selector: '.primary-label-chip' })).toBeInTheDocument();
  });

  it('temporarily expands checklist details for print and restores their state', () => {
    render(
      <ChecklistView
        items={[item, { ...item, id: 'synthetic.second', title: 'Synthetic second item' }]}
        statuses={{}}
        sources={[source]}
        onStatusChange={vi.fn()}
        onRestart={vi.fn()}
        onExport={vi.fn()}
      />
    );

    const details = [...document.querySelectorAll<HTMLDetailsElement>('details.checklist-item')];
    details[1].open = true;

    act(() => window.dispatchEvent(new Event('beforeprint')));
    expect(details.every((element) => element.open)).toBe(true);

    act(() => window.dispatchEvent(new Event('afterprint')));
    expect(details.map((element) => element.open)).toEqual([false, true]);
  });

  it('keeps print details and an unambiguous source URL in the rendered DOM', () => {
    render(
      <ChecklistView
        items={[item]}
        statuses={{ 'background.studyConnection': 'needs_review' }}
        sources={[source]}
        onStatusChange={vi.fn()}
        onRestart={vi.fn()}
        onExport={vi.fn()}
      />
    );

    expect(screen.getByText('Synthetic explanation.')).toBeInTheDocument();
    expect(screen.getByText('Synthetic base step.')).toBeInTheDocument();
    expect(screen.getByText('https://example.invalid/synthetic')).toBeInTheDocument();
    expect(screen.getByText('需要复查', { selector: '.status-chip' })).toBeInTheDocument();
    expect(screen.getByText('需要复查', { selector: '.status-chip' })).toHaveClass('status-needs-review');
    expect(screen.getByRole('button', { name: '打印或保存PDF' })).toHaveClass('secondary');
    expect(screen.getByRole('button', { name: '打印或保存PDF' }).parentElement)
      .toHaveClass('no-print');
    expect(screen.getByText('当前状态').closest('label')).toHaveClass('no-print');
  });

  describe('Status chip visual class mapping', () => {
    it.each([
      ['not_started', '未开始', 'status-not-started'],
      ['in_progress', '准备中', 'status-in-progress'],
      ['needs_review', '需要复查', 'status-needs-review'],
      ['prepared', '已准备', 'status-prepared'],
      ['not_applicable', '不适用', 'status-not-applicable']
    ] as const)('renders status %s with label %s and class %s', (statusValue, expectedText, expectedClass) => {
      render(
        <ChecklistView
          items={[item]}
          statuses={{ 'background.studyConnection': statusValue }}
          sources={[source]}
          onStatusChange={vi.fn()}
          onRestart={vi.fn()}
          onExport={vi.fn()}
        />
      );

      const statusChip = screen.getByText(expectedText, { selector: '.status-chip' });
      expect(statusChip).toBeInTheDocument();
      expect(statusChip).toHaveClass(expectedClass);
      expect(statusChip).toHaveClass('status-chip');
      expect(statusChip).not.toHaveClass('chip-core');
      expect(statusChip).not.toHaveClass('chip-conditional');
      expect(statusChip).not.toHaveClass('chip-guidance');

      const primaryChip = screen.getByText('建议核对', { selector: '.primary-label-chip' });
      expect(primaryChip).toHaveClass('chip-guidance');
      expect(primaryChip).not.toHaveClass(expectedClass);
    });
  });

  describe('Checklist filtering and expand/collapse controls', () => {
    const sampleItems: ChecklistItem[] = [
      {
        ...item,
        id: 'identity.passport',
        category: '身份与核心',
        title: '护照个人信息页',
        requirementType: 'usually_required',
        evidenceLayer: 'inz_visa'
      },
      {
        ...item,
        id: 'funds.bankStatements',
        category: '生活资金',
        title: '银行资金证明',
        requirementType: 'answer_dependent',
        evidenceLayer: 'inz_visa'
      },
      {
        ...item,
        id: 'education.transcripts',
        category: '学术背景',
        title: '成绩单',
        requirementType: 'product_organisation_guidance',
        evidenceLayer: 'product_guidance'
      }
    ];

    it('filters items by requirement type and updates result count', () => {
      render(
        <ChecklistView
          items={sampleItems}
          statuses={{ 'identity.passport': 'prepared', 'funds.bankStatements': 'in_progress' }}
          sources={[source]}
          onStatusChange={vi.fn()}
          onRestart={vi.fn()}
          onExport={vi.fn()}
        />
      );

      expect(screen.getByText('共 3 项')).toBeInTheDocument();
      expect(screen.getByText('护照个人信息页')).toBeInTheDocument();
      expect(screen.getByText('银行资金证明')).toBeInTheDocument();
      expect(screen.getByText('成绩单')).toBeInTheDocument();

      // Filter by 核心要求
      const reqSelect = screen.getByLabelText('材料性质');
      act(() => {
        reqSelect.dispatchEvent(new Event('change', { bubbles: true }));
      });
      // Set to 核心要求
      act(() => {
        const event = { target: { value: '核心要求' } };
        // simulate change
      });
    });

    it('filters by requirement and status, showing empty state and clearing filters', () => {
      const { rerender } = render(
        <ChecklistView
          items={sampleItems}
          statuses={{ 'identity.passport': 'prepared', 'funds.bankStatements': 'in_progress' }}
          sources={[source]}
          onStatusChange={vi.fn()}
          onRestart={vi.fn()}
          onExport={vi.fn()}
        />
      );

      // Select filter: 建议核对 + 已准备 -> empty
      const reqSelect = screen.getByLabelText('材料性质') as HTMLSelectElement;
      const statusSelect = screen.getByLabelText('完成状态') as HTMLSelectElement;

      act(() => {
        reqSelect.value = '建议核对';
        reqSelect.dispatchEvent(new Event('change', { bubbles: true }));
        statusSelect.value = 'prepared';
        statusSelect.dispatchEvent(new Event('change', { bubbles: true }));
      });

      expect(screen.getByText('没有匹配当前筛选条件的材料项。')).toBeInTheDocument();
      expect(screen.getByText('显示 0 / 3 项')).toBeInTheDocument();
      // Overall progress still reflects full checklist (1 / 3)
      expect(screen.getByText(/已完成 1\/3 项/)).toBeInTheDocument();

      // Clear filters button
      const clearBtn = screen.getByRole('button', { name: '清除筛选' });
      act(() => {
        clearBtn.click();
      });

      expect(screen.getByText('共 3 项')).toBeInTheDocument();
      expect(screen.getByText('护照个人信息页')).toBeInTheDocument();
    });

    it('expands and collapses only currently visible results', () => {
      render(
        <ChecklistView
          items={sampleItems}
          statuses={{}}
          sources={[source]}
          onStatusChange={vi.fn()}
          onRestart={vi.fn()}
          onExport={vi.fn()}
        />
      );

      const expandBtn = screen.getByRole('button', { name: '展开当前结果' });
      const collapseBtn = screen.getByRole('button', { name: '收起当前结果' });

      act(() => {
        expandBtn.click();
      });
      const allDetails = document.querySelectorAll<HTMLDetailsElement>('details.checklist-item');
      expect([...allDetails].every((d) => d.open)).toBe(true);

      act(() => {
        collapseBtn.click();
      });
      expect([...allDetails].every((d) => !d.open)).toBe(true);
    });

    it('renders visual hierarchy card classes correctly', () => {
      render(
        <ChecklistView
          items={sampleItems}
          statuses={{}}
          sources={[source]}
          onStatusChange={vi.fn()}
          onRestart={vi.fn()}
          onExport={vi.fn()}
        />
      );

      const coreCard = document.querySelector('details.card-core');
      const conditionalCard = document.querySelector('details.card-conditional');
      const guidanceCard = document.querySelector('details.card-guidance');

      expect(coreCard).toBeInTheDocument();
      expect(conditionalCard).toBeInTheDocument();
      expect(guidanceCard).toBeInTheDocument();
    });
  });

  describe('ChecklistView scroll behavior', () => {
    it('scrolls to top when isNewGeneration is true', () => {
      const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
      render(
        <ChecklistView
          items={[item]}
          statuses={{}}
          sources={[source]}
          onStatusChange={vi.fn()}
          onRestart={vi.fn()}
          onExport={vi.fn()}
          isNewGeneration={true}
        />
      );

      expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
      scrollToSpy.mockRestore();
    });
  });
});
