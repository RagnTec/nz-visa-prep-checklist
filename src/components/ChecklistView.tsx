import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  ChecklistItem,
  ChecklistStatus,
  EvidenceLayer,
  OfficialSource,
  RequirementType
} from '../domain/types';
import { getSavedScrollPosition, setSavedScrollPosition } from '../storage/uiScroll';
import { TrialDisclosure } from './TrialDisclosure';

export const statusLabels: Record<ChecklistStatus, string> = {
  not_started: '未开始',
  in_progress: '准备中',
  prepared: '已准备',
  needs_review: '需要复查',
  not_applicable: '不适用'
};

export const requirementLabels: Record<RequirementType, string> = {
  usually_required: '通常需要',
  answer_dependent: '根据回答需要',
  may_be_requested: '可能被要求',
  genuine_intentions_support: '用于支持真实学习意图',
  product_organisation_guidance: '产品整理建议'
};

export const evidenceLayerLabels: Record<EvidenceLayer, string> = {
  inz_visa: 'INZ 官方要求或指引',
  product_guidance: '整理与核对建议'
};

export type PrimaryRequirementLabel = '核心要求' | '按情况要求' | '建议核对';

export function getPrimaryRequirementLabel(item: ChecklistItem): PrimaryRequirementLabel {
  if (item.evidenceLayer === 'product_guidance') {
    return '建议核对';
  }
  if (
    item.requirementType === 'usually_required' ||
    item.id === 'study.offer.pending' ||
    item.id === 'study.tuitionReceipt'
  ) {
    return '核心要求';
  }
  return '按情况要求';
}

function getCardVisualClass(primaryLabel: PrimaryRequirementLabel): string {
  switch (primaryLabel) {
    case '核心要求':
      return 'card-core';
    case '按情况要求':
      return 'card-conditional';
    case '建议核对':
      return 'card-guidance';
  }
}

function getChipVisualClass(primaryLabel: PrimaryRequirementLabel): string {
  switch (primaryLabel) {
    case '核心要求':
      return 'chip-core';
    case '按情况要求':
      return 'chip-conditional';
    case '建议核对':
      return 'chip-guidance';
  }
}

export function getStatusVisualClass(status: ChecklistStatus): string {
  switch (status) {
    case 'not_started':
      return 'status-not-started';
    case 'in_progress':
      return 'status-in-progress';
    case 'needs_review':
      return 'status-needs-review';
    case 'prepared':
      return 'status-prepared';
    case 'not_applicable':
      return 'status-not-applicable';
  }
}

interface Props {
  items: ChecklistItem[];
  statuses: Record<string, ChecklistStatus>;
  sources: OfficialSource[];
  onStatusChange: (id: string, status: ChecklistStatus) => void;
  onRestart: () => void;
  onExport: () => void;
  isNewGeneration?: boolean;
  projectId?: string;
}

export function ChecklistView({
  items,
  statuses,
  sources,
  onStatusChange,
  onRestart,
  onExport,
  isNewGeneration = false,
  projectId = 'default'
}: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const printStateRef = useRef<Array<{ element: HTMLDetailsElement; open: boolean }> | null>(null);
  const hasInitializedScroll = useRef(false);

  const [selectedRequirement, setSelectedRequirement] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const complete = items.filter((item) =>
    ['prepared', 'not_applicable'].includes(statuses[item.id] ?? 'not_started')
  ).length;
  const sourceMap = new Map(sources.map((source) => [source.id, source]));

  // 1. Initial scroll positioning & scroll restoration
  useEffect(() => {
    if (hasInitializedScroll.current) return;
    hasInitializedScroll.current = true;

    if (isNewGeneration) {
      if (typeof window !== 'undefined') {
        try {
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        } catch {
          window.scrollTo(0, 0);
        }
      }
    } else {
      const savedTop = getSavedScrollPosition(projectId);
      if (savedTop !== null && savedTop > 0 && typeof window !== 'undefined') {
        window.requestAnimationFrame(() => {
          try {
            window.scrollTo({ top: savedTop, left: 0, behavior: 'instant' });
          } catch {
            window.scrollTo(0, savedTop);
          }
        });
      }
    }
  }, [isNewGeneration, projectId]);

  // 2. Continuous scroll position persistence (throttled)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let frameId: number | null = null;
    const handleScroll = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        setSavedScrollPosition(window.scrollY, projectId);
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
    };
  }, [projectId]);

  // 3. Print expansion & restoration
  useEffect(() => {
    const expandDetailsForPrint = () => {
      if (!rootRef.current || printStateRef.current) return;
      const details = Array.from(
        rootRef.current.querySelectorAll<HTMLDetailsElement>('details.checklist-item')
      );
      printStateRef.current = details.map((element) => ({ element, open: element.open }));
      details.forEach((element) => {
        element.open = true;
      });
    };
    const restoreDetailsAfterPrint = () => {
      printStateRef.current?.forEach(({ element, open }) => {
        element.open = open;
      });
      printStateRef.current = null;
    };

    window.addEventListener('beforeprint', expandDetailsForPrint);
    window.addEventListener('afterprint', restoreDetailsAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', expandDetailsForPrint);
      window.removeEventListener('afterprint', restoreDetailsAfterPrint);
      restoreDetailsAfterPrint();
    };
  }, []);

  // 4. Filtering visible items
  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      const primaryLabel = getPrimaryRequirementLabel(item);
      if (selectedRequirement !== 'all' && primaryLabel !== selectedRequirement) {
        return false;
      }
      const status = statuses[item.id] ?? 'not_started';
      if (selectedStatus !== 'all' && status !== selectedStatus) {
        return false;
      }
      return true;
    });
  }, [items, statuses, selectedRequirement, selectedStatus]);

  const groupedVisible = useMemo(() => {
    return visibleItems.reduce<Record<string, ChecklistItem[]>>((groups, item) => {
      (groups[item.category] ??= []).push(item);
      return groups;
    }, {});
  }, [visibleItems]);

  const hasActiveFilter = selectedRequirement !== 'all' || selectedStatus !== 'all';

  const expandAllVisible = () => {
    if (!rootRef.current) return;
    const details = rootRef.current.querySelectorAll<HTMLDetailsElement>('details.checklist-item');
    details.forEach((el) => {
      el.open = true;
    });
  };

  const collapseAllVisible = () => {
    if (!rootRef.current) return;
    const details = rootRef.current.querySelectorAll<HTMLDetailsElement>('details.checklist-item');
    details.forEach((el) => {
      el.open = false;
    });
  };

  const clearFilters = () => {
    setSelectedRequirement('all');
    setSelectedStatus('all');
  };

  return (
    <main ref={rootRef} className="app-shell">
      <TrialDisclosure />
      <section className="hero compact">
        <p className="eyebrow">Fee Paying Student Visa</p>
        <h1>你的材料准备清单</h1>
        <p>
          已完成 {complete}/{items.length} 项。这里记录准备进度，不代表材料已被 INZ 认定为充分。
        </p>
        <div className="progress">
          <span style={{ width: `${items.length ? (complete / items.length) * 100 : 0}%` }} />
        </div>
        <div className="actions no-print">
          <button type="button" onClick={onExport}>
            导出项目JSON
          </button>
          <button type="button" className="secondary" onClick={() => window.print()}>
            打印或保存PDF
          </button>
          <button type="button" className="secondary" onClick={onRestart}>
            重新回答
          </button>
        </div>
      </section>

      {/* Checklist Toolbar: Filters and Expand/Collapse Controls */}
      <section className="checklist-toolbar no-print" aria-label="清单筛选与视图控制">
        <div className="filter-group">
          <label htmlFor="filter-requirement">
            材料性质
            <select
              id="filter-requirement"
              value={selectedRequirement}
              onChange={(e) => setSelectedRequirement(e.target.value)}
            >
              <option value="all">全部性质</option>
              <option value="核心要求">核心要求</option>
              <option value="按情况要求">按情况要求</option>
              <option value="建议核对">建议核对</option>
            </select>
          </label>

          <label htmlFor="filter-status">
            完成状态
            <select
              id="filter-status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">全部状态</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="toolbar-actions">
          <span className="result-count" aria-live="polite">
            {hasActiveFilter
              ? `显示 ${visibleItems.length} / ${items.length} 项`
              : `共 ${items.length} 项`}
          </span>
          <button type="button" className="secondary small-btn" onClick={expandAllVisible}>
            展开当前结果
          </button>
          <button type="button" className="secondary small-btn" onClick={collapseAllVisible}>
            收起当前结果
          </button>
        </div>
      </section>

      {/* Filtered Checklist Sections */}
      {visibleItems.length === 0 ? (
        <section className="checklist-section empty-state" aria-label="未找到匹配项">
          <p>没有匹配当前筛选条件的材料项。</p>
          <button type="button" className="secondary" onClick={clearFilters}>
            清除筛选
          </button>
        </section>
      ) : (
        Object.entries(groupedVisible).map(([category, categoryItems]) => (
          <section key={category} className="checklist-section">
            <h2>{category}</h2>
            {(categoryItems ?? []).map((item) => {
              const primaryLabel = getPrimaryRequirementLabel(item);
              const cardClass = getCardVisualClass(primaryLabel);
              const chipClass = getChipVisualClass(primaryLabel);
              const itemStatus = statuses[item.id] ?? 'not_started';
              const statusClass = getStatusVisualClass(itemStatus);

              return (
                <details key={item.id} className={`checklist-item ${cardClass}`}>
                  <summary>
                    <span className="item-title">{item.title}</span>
                    <span className="item-labels">
                      <span className={`primary-label-chip ${chipClass}`}>{primaryLabel}</span>
                      <span className={`status-chip ${statusClass}`}>{statusLabels[itemStatus]}</span>
                    </span>
                  </summary>
                  <div className="detail-body">
                    <p className="item-nature">
                      <strong>{item.evidenceLayer === 'inz_visa' ? '要求性质：' : '信息性质：'}</strong>
                      {evidenceLayerLabels[item.evidenceLayer]}
                    </p>
                    <p>
                      <strong>为什么需要：</strong>
                      {item.why}
                    </p>
                    <h3>如何准备</h3>
                    <ol>
                      {item.steps.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                    {item.requiredFields?.length ? (
                      <>
                        <h3>应能看见的信息</h3>
                        <ul>
                          {item.requiredFields.map((field) => (
                            <li key={field}>{field}</li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                    {item.preferredFormat ? (
                      <p>
                        <strong>推荐格式：</strong>
                        {item.preferredFormat}
                      </p>
                    ) : null}
                    {item.commonMistakes?.length ? (
                      <>
                        <h3>常见问题</h3>
                        <ul>
                          {item.commonMistakes.map((mistake) => (
                            <li key={mistake}>{mistake}</li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                    {item.warnings?.length ? (
                      <div className="warning">
                        {item.warnings.map((warning) => (
                          <p key={warning}>{warning}</p>
                        ))}
                      </div>
                    ) : null}
                    {item.guidanceBlocks?.length ? (
                      <div className="guidance">
                        {item.guidanceDisclaimer ? <p>{item.guidanceDisclaimer}</p> : null}
                        {item.guidanceBlocks.map((block) => (
                          <section key={block.id}>
                            <h3>{block.title}</h3>
                            <ul>
                              {block.steps.map((step) => (
                                <li key={step}>{step}</li>
                              ))}
                            </ul>
                          </section>
                        ))}
                      </div>
                    ) : null}
                    <label className="status-select no-print">
                      当前状态
                      <select
                        value={statuses[item.id] ?? 'not_started'}
                        onChange={(event) =>
                          onStatusChange(item.id, event.target.value as ChecklistStatus)
                        }
                      >
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="sources">
                      {item.sourceIds.map((sourceId) => {
                        const source = sourceMap.get(sourceId);
                        const sourcePrefix =
                          item.evidenceLayer === 'product_guidance' ? '参考官方信息：' : '依据来源：';
                        return source ? (
                          <a key={sourceId} href={source.url} target="_blank" rel="noreferrer">
                            {sourcePrefix}
                            {source.publisher} · {source.title}（核验于 {source.checkedAt}）
                            <span className="source-url">{source.url}</span>
                          </a>
                        ) : null;
                      })}
                    </div>
                  </div>
                </details>
              );
            })}
          </section>
        ))
      )}
      <footer>
        本工具不评估签证资格或申请风险，不预测申请结果，不判断哪些信息应披露或省略，也不会替你生成说明信。请以当前 INZ 官方指引和在线申请要求为准；如需结合个人情况获得移民建议，请咨询新西兰持牌移民顾问或依法可提供相关建议的人士。
      </footer>
    </main>
  );
}
