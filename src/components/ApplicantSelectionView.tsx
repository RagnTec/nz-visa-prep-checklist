import { useState } from 'react';
import type { ApplicantSelection } from '../domain/workspaceApplicationCreation';
import type { SavedWorkspaceReadResult } from '../domain/workspacePersistence';

interface ApplicantSelectionViewProps {
  readonly routeLabel: string;
  readonly routeDescription?: string;
  readonly workspaceReadResult: SavedWorkspaceReadResult | null;
  readonly onConfirmApplicant: (applicant: ApplicantSelection) => Promise<void>;
  readonly onBack: () => void;
  readonly errorMessage?: string | null;
}

function generatePersonId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `person-${crypto.randomUUID()}`;
  }
  return `person-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function ApplicantSelectionView({
  routeLabel,
  routeDescription,
  workspaceReadResult,
  onConfirmApplicant,
  onBack,
  errorMessage
}: ApplicantSelectionViewProps) {
  const isInvalid = workspaceReadResult?.kind === 'invalid';
  const isFuture = workspaceReadResult?.kind === 'future';
  const people =
    workspaceReadResult?.kind === 'current' || workspaceReadResult?.kind === 'empty'
      ? workspaceReadResult.workspace.people
      : [];

  const [selectionMode, setSelectionMode] = useState<'existing' | 'new'>(
    people.length > 0 ? 'existing' : 'new'
  );
  const [selectedPersonId, setSelectedPersonId] = useState<string>(
    people[0]?.personId ?? ''
  );
  const [newPersonName, setNewPersonName] = useState<string>('');
  const [localValidation, setLocalValidation] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isInvalid) {
    return (
      <section className="applicant-card">
        <h2>选择或创建申请人</h2>
        <div className="route-badge">申请路线：{routeLabel}</div>
        <p className="warning" role="alert">
          无法读取本地工作区数据（格式或引用无效）。为避免损坏数据，暂无法在此工作区创建新申请。
        </p>
        <div className="actions">
          <button type="button" className="secondary" onClick={onBack}>
            返回选择路线
          </button>
        </div>
      </section>
    );
  }

  if (isFuture) {
    return (
      <section className="applicant-card">
        <h2>选择或创建申请人</h2>
        <div className="route-badge">申请路线：{routeLabel}</div>
        <p className="warning" role="alert">
          此本地工作区由较新版本创建（版本 {workspaceReadResult.schemaVersion}），当前版本无法在此工作区创建新申请。
        </p>
        <div className="actions">
          <button type="button" className="secondary" onClick={onBack}>
            返回选择路线
          </button>
        </div>
      </section>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalValidation(null);

    let applicant: ApplicantSelection;

    if (selectionMode === 'existing') {
      if (!selectedPersonId) {
        setLocalValidation('请选择一位已有的申请人。');
        return;
      }
      applicant = { kind: 'existing', personId: selectedPersonId };
    } else {
      const trimmedName = newPersonName.trim();
      if (!trimmedName) {
        setLocalValidation('请输入申请人的姓名或称呼。');
        return;
      }
      applicant = {
        kind: 'new',
        person: {
          personId: generatePersonId(),
          displayName: trimmedName
        }
      };
    }

    try {
      setSubmitting(true);
      await onConfirmApplicant(applicant);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="applicant-card">
      <h2>选择或创建申请人</h2>
      <div className="route-badge">申请路线：{routeLabel}</div>
      {routeDescription ? <p className="route-option-desc">{routeDescription}</p> : null}

      {errorMessage ? (
        <p className="warning" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {localValidation ? (
        <p className="warning" role="alert">
          {localValidation}
        </p>
      ) : null}

      <form onSubmit={handleSubmit}>
        {people.length > 0 ? (
          <div className="applicant-section">
            <h3>选择申请人</h3>
            <div className="people-options">
              <label className="person-option-label">
                <input
                  type="radio"
                  name="applicantMode"
                  value="existing"
                  checked={selectionMode === 'existing'}
                  onChange={() => {
                    setSelectionMode('existing');
                    setLocalValidation(null);
                  }}
                />
                <span>选择已有申请人</span>
              </label>

              {selectionMode === 'existing' ? (
                <div style={{ marginLeft: '1.8rem', display: 'grid', gap: '.5rem' }}>
                  {people.map((person) => (
                    <label key={person.personId} className="person-option-label">
                      <input
                        type="radio"
                        name="existingPerson"
                        value={person.personId}
                        checked={selectedPersonId === person.personId}
                        onChange={() => {
                          setSelectedPersonId(person.personId);
                          setLocalValidation(null);
                        }}
                      />
                      <span>{person.displayName}</span>
                    </label>
                  ))}
                </div>
              ) : null}

              <label className="person-option-label">
                <input
                  type="radio"
                  name="applicantMode"
                  value="new"
                  checked={selectionMode === 'new'}
                  onChange={() => {
                    setSelectionMode('new');
                    setLocalValidation(null);
                  }}
                />
                <span>添加新申请人</span>
              </label>
            </div>
          </div>
        ) : null}

        {selectionMode === 'new' ? (
          <div className="applicant-section">
            <h3>{people.length === 0 ? '填写申请人信息' : '新申请人姓名或称呼'}</h3>
            <p style={{ color: '#52666d', fontSize: '.9rem', margin: '.25rem 0 .75rem' }}>
              {people.length === 0
                ? '工作区中尚无人员记录。请填写第一位申请人的姓名或称呼：'
                : '输入新申请人的姓名或称呼（仅保存在当前浏览器）：'}
            </p>
            <input
              type="text"
              className="new-person-input"
              placeholder="例如：张三、Alice"
              value={newPersonName}
              onChange={(e) => {
                setNewPersonName(e.target.value);
                setLocalValidation(null);
              }}
              disabled={submitting}
              autoFocus
            />
          </div>
        ) : null}

        <div className="actions">
          <button type="submit" disabled={submitting}>
            {submitting ? '正在创建申请…' : '创建并开始准备'}
          </button>
          <button type="button" className="secondary" onClick={onBack} disabled={submitting}>
            返回选择路线
          </button>
        </div>
      </form>
    </section>
  );
}
