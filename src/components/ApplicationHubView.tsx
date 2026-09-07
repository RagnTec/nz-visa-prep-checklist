import { useState } from 'react';
import type { ApplicationHubReadModel } from '../domain/applicationHub';

export interface ApplicationHubViewProps {
  readonly model: ApplicationHubReadModel;
  readonly onBack?: () => void;
  readonly onReturnToActiveApplication?: () => void;
  readonly onNavigateHome?: () => void;
  readonly onOpenApplication?: (applicationId: string) => void;
  readonly onCreateApplicationForPerson?: (personId: string) => void;
  readonly onCreatePerson?: (displayName: string) => Promise<void> | void;
  readonly onDeleteApplication?: (applicationId: string) => void;
  readonly openingApplicationId?: string | null;
  readonly deletingApplicationId?: string | null;
  readonly isCreatingPerson?: boolean;
  readonly errorMessage?: string | null;
}

export function ApplicationHubView({
  model,
  onBack,
  onReturnToActiveApplication,
  onNavigateHome,
  onOpenApplication,
  onCreateApplicationForPerson,
  onCreatePerson,
  onDeleteApplication,
  openingApplicationId,
  deletingApplicationId,
  isCreatingPerson = false,
  errorMessage
}: ApplicationHubViewProps) {
  const { people, issues, hasActiveApplication } = model;
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [isAddingPerson, setIsAddingPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [addPersonError, setAddPersonError] = useState<string | null>(null);

  return (
    <section className="hub-card">
      <div className="hub-header">
        <div className="hub-header-title-group" style={{ display: 'flex', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap' }}>
          {onNavigateHome ? (
            <button
              type="button"
              className="secondary hub-home-btn"
              onClick={onNavigateHome}
              aria-label="返回首页"
            >
              ‹ 首页
            </button>
          ) : null}
          <div>
            <h2 style={{ margin: 0 }}>申请中心</h2>
            <p style={{ margin: 0, color: '#4b6269', fontSize: '0.95rem' }}>
              工作区申请概览（仅保存在当前浏览器）
            </p>
          </div>
        </div>
        <div className="hub-header-actions" style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {onCreatePerson && !isAddingPerson ? (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setIsAddingPerson(true);
                setAddPersonError(null);
                setNewPersonName('');
              }}
            >
              + 新增申请人
            </button>
          ) : null}
          {hasActiveApplication && onReturnToActiveApplication ? (
            <button type="button" className="secondary" onClick={onReturnToActiveApplication}>
              返回当前申请
            </button>
          ) : hasActiveApplication && onBack ? (
            <button type="button" className="secondary" onClick={onBack}>
              返回当前申请
            </button>
          ) : null}
        </div>
      </div>

      {isAddingPerson ? (
        <div className="hub-add-person-card">
          <h4 style={{ margin: '0 0 .5rem 0', color: '#1f2933' }}>新增申请人</h4>
          <p style={{ color: '#52666d', fontSize: '.9rem', margin: '0 0 .75rem 0' }}>
            输入新申请人的姓名或称呼（仅保存在当前浏览器）：
          </p>
          <input
            type="text"
            className="new-person-input"
            placeholder="例如：张三、Alice"
            value={newPersonName}
            onChange={(e) => {
              setNewPersonName(e.target.value);
              setAddPersonError(null);
            }}
            disabled={isCreatingPerson}
            autoFocus
          />
          {addPersonError ? (
            <p className="warning" role="alert" style={{ margin: '.5rem 0' }}>
              {addPersonError}
            </p>
          ) : null}
          <div style={{ display: 'flex', gap: '.5rem', marginTop: '.75rem' }}>
            <button
              type="button"
              disabled={isCreatingPerson}
              onClick={async () => {
                const trimmed = newPersonName.trim();
                if (!trimmed) {
                  setAddPersonError('请输入申请人的姓名或称呼。');
                  return;
                }
                if (onCreatePerson) {
                  await onCreatePerson(trimmed);
                  setIsAddingPerson(false);
                  setNewPersonName('');
                }
              }}
            >
              {isCreatingPerson ? '正在创建…' : '创建并选择路线'}
            </button>
            <button
              type="button"
              className="secondary"
              disabled={isCreatingPerson}
              onClick={() => {
                setIsAddingPerson(false);
                setNewPersonName('');
                setAddPersonError(null);
              }}
            >
              取消
            </button>
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <div role="alert" className="hub-error-alert">
          <p>{errorMessage}</p>
        </div>
      ) : null}

      {issues.length > 0 ? (
        <div role="alert" className="warning" style={{ marginBottom: '1.25rem' }}>
          <p>部分本地申请记录存在一致性问题，已暂时隐藏以避免误操作。</p>
        </div>
      ) : null}

      <div className="hub-people-list">
        {people.map((person) => (
          <div key={person.personId} className="hub-person-section">
            <div className="hub-person-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.75rem' }}>
              <h3 className="hub-person-title" style={{ margin: 0 }}>{person.displayName}</h3>
              {onCreateApplicationForPerson ? (
                <button
                  type="button"
                  className="secondary small-btn"
                  onClick={() => onCreateApplicationForPerson(person.personId)}
                >
                  新增申请
                </button>
              ) : null}
            </div>

            {person.applications.length === 0 ? (
              <p className="hub-empty-state">暂无申请</p>
            ) : (
              <div className="hub-application-list">
                {person.applications.map((app) => (
                  <div
                    key={app.applicationId}
                    className={`hub-application-card${app.isActive ? ' active' : ''}`}
                  >
                    <div className="hub-application-card-main">
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '.4rem' }}>
                        <span className="hub-application-title">{app.routeLabel}</span>
                        {app.isActive ? (
                          <span className="hub-active-chip">当前申请</span>
                        ) : null}
                        {!app.isRouteAvailable ? (
                          <span className="hub-unavailable-badge">该申请路线当前版本暂不可用</span>
                        ) : null}
                      </div>

                      {(app.progressSummary || app.formattedUpdatedAt) ? (
                        <div className="hub-application-meta">
                          {app.progressSummary ? (
                            <span className="hub-application-progress">{app.progressSummary}</span>
                          ) : null}
                          {app.progressSummary && app.formattedUpdatedAt ? (
                            <span className="hub-application-meta-sep" aria-hidden="true">·</span>
                          ) : null}
                          {app.formattedUpdatedAt ? (
                            <span className="hub-application-updated">{app.formattedUpdatedAt}</span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    <div className="hub-application-actions">
                      {app.isActive && app.isRouteAvailable && onReturnToActiveApplication ? (
                        <button
                          type="button"
                          onClick={onReturnToActiveApplication}
                        >
                          返回此申请
                        </button>
                      ) : null}

                      {!app.isActive && app.isRouteAvailable && onOpenApplication ? (
                        <button
                          type="button"
                          className="secondary"
                          disabled={Boolean(openingApplicationId || deletingApplicationId || confirmingDeleteId === app.applicationId)}
                          onClick={() => onOpenApplication(app.applicationId)}
                        >
                          {openingApplicationId === app.applicationId ? '正在打开…' : '打开申请'}
                        </button>
                      ) : null}

                      {onDeleteApplication ? (
                        <button
                          type="button"
                          className="secondary"
                          disabled={Boolean(openingApplicationId || deletingApplicationId || confirmingDeleteId === app.applicationId)}
                          onClick={() => setConfirmingDeleteId(app.applicationId)}
                        >
                          {deletingApplicationId === app.applicationId ? '正在删除…' : '删除申请'}
                        </button>
                      ) : null}
                    </div>

                    {confirmingDeleteId === app.applicationId && onDeleteApplication ? (
                      <div className="hub-delete-confirm">
                        <p>
                          {app.isActive
                            ? '确认删除当前申请？删除后将返回申请中心，其他申请和申请人资料不会被删除。'
                            : '确认删除此申请？此操作会删除该申请在当前浏览器中的保存数据。'}
                        </p>
                        <div style={{ display: 'flex', gap: '.5rem' }}>
                          <button
                            type="button"
                            className="danger small-btn"
                            disabled={deletingApplicationId === app.applicationId}
                            onClick={() => {
                              onDeleteApplication(app.applicationId);
                              setConfirmingDeleteId(null);
                            }}
                          >
                            {deletingApplicationId === app.applicationId ? '正在删除…' : '确认删除'}
                          </button>
                          <button
                            type="button"
                            className="secondary small-btn"
                            disabled={deletingApplicationId === app.applicationId}
                            onClick={() => setConfirmingDeleteId(null)}
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
