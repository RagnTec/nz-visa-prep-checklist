import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { CURRENT_SAVED_PROJECT_SCHEMA_VERSION, type SavedProject } from '../src/domain/types';

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

const storage = vi.hoisted(() => ({
  deleteProject: vi.fn(),
  loadProject: vi.fn(),
  saveProject: vi.fn()
}));
const surveyEvents = vi.hoisted(() => ({
  complete: [] as Array<(sender: { data: Record<string, unknown> }) => void>,
  validateQuestion: [] as Array<(
    sender: { data: Record<string, unknown> },
    options: {
      name: string;
      error: string;
      errors: Array<{ notificationType: string; text: string }>;
      question: object;
    }
  ) => void>
}));

vi.mock('../src/storage/db', () => storage);

vi.mock('survey-core', () => ({
  SurveyError: class {
    notificationType = 'error';
    constructor(public text: string) {}
  },
  Model: class {
    data: Record<string, unknown> = {};
    currentPageNo = 0;
    pages = [{ name: 'scope' }, { name: 'material-background' }];
    onComplete = {
      add: vi.fn((handler: (typeof surveyEvents.complete)[number]) => {
        surveyEvents.complete.push(handler);
      })
    };
    onValueChanged = { add: vi.fn() };
    onValidateQuestion = {
      add: vi.fn((handler: (typeof surveyEvents.validateQuestion)[number]) => {
        surveyEvents.validateQuestion.push(handler);
      })
    };
    getQuestionByName = vi.fn();
    clear = vi.fn();
  }
}));

vi.mock('survey-react-ui', () => ({
  Survey: () => <div>Survey form</div>
}));

vi.mock('../src/components/ChecklistView', () => ({
  ChecklistView: ({
    onExport,
    onRestart,
    onStatusChange,
    statuses
  }: {
    onExport: () => void;
    onRestart: () => void;
    onStatusChange: (id: string, status: 'in_progress') => void;
    statuses: Record<string, string>;
  }) => (
    <div>
      <span>Checklist view</span>
      <span>Saved status: {statuses['study.offer']}</span>
      <button type="button" onClick={() => onStatusChange('study.offer', 'in_progress')}>Update status</button>
      <button type="button" onClick={onExport}>Export project</button>
      <button type="button" onClick={onRestart}>Restart project</button>
    </div>
  )
}));

const savedProject: SavedProject = {
  id: 'default',
  schemaVersion: CURRENT_SAVED_PROJECT_SCHEMA_VERSION,
  answers: {
    study: { hasOffer: true },
    background: {
      applicantType: 'other_or_unclear',
      studyRelation: 'unclear'
    },
    education: { recordContexts: ['completed_qualification'] },
    english: { providerEvidenceStatus: 'available' },
    documents: {
      originContext: 'other',
      nonEnglishEvidenceStatus: 'none_known'
    },
    family: { linkedApplicationContext: 'none' }
  },
  statuses: { 'study.offer': 'prepared' },
  updatedAt: '2026-07-28T00:00:00.000Z'
};

function currentProject(project = savedProject) {
  return { kind: 'current' as const, project };
}

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(String(reader.result)));
    reader.addEventListener('error', () => reject(reader.error));
    reader.readAsText(blob);
  });
}

describe('App persistence hardening', () => {
  beforeEach(() => {
    surveyEvents.complete.length = 0;
    surveyEvents.validateQuestion.length = 0;
    storage.deleteProject.mockReset();
    storage.loadProject.mockReset();
    storage.saveProject.mockReset();
    storage.deleteProject.mockResolvedValue(undefined);
    storage.loadProject.mockResolvedValue(undefined);
    storage.saveProject.mockResolvedValue(undefined);
  });

  it('shows the persistent trial disclosure in the survey flow', async () => {
    render(<App />);

    expect(await screen.findByText('Survey form')).toBeInTheDocument();
    expect(screen.getByLabelText('测试预览说明')).toHaveTextContent(
      '测试预览版：本工具仅协助整理材料，不是 Immigration New Zealand（INZ）官方产品'
    );
  });

  it('shows the persistent trial disclosure in compatibility read-only mode', async () => {
    storage.loadProject.mockResolvedValue({
      kind: 'future',
      project: { ...savedProject, schemaVersion: 999 },
      schemaVersion: 999
    });

    render(<App />);

    expect(await screen.findByText('本地项目只读保护')).toBeInTheDocument();
    expect(screen.getByLabelText('测试预览说明')).toHaveTextContent(
      '回答仅保存在当前浏览器；测试期间请勿输入不必要的真实敏感信息。'
    );
  });

  it('connects blocking cross-field date validation to the survey model', async () => {
    render(<App />);

    expect(await screen.findByText('Survey form')).toBeInTheDocument();
    expect(surveyEvents.validateQuestion).toHaveLength(1);

    const options = {
      name: 'study.courseEnd',
      error: '',
      errors: [],
      question: {}
    };
    surveyEvents.validateQuestion[0]({
      data: {
        study: {
          courseStart: '2026-08-10',
          courseEnd: '2026-08-09'
        }
      }
    }, options);

    expect(options.error).toBe('课程结束日期不能早于开始日期，请核对这两个日期。');
  });

  it('continues to the survey when the saved project cannot be read', async () => {
    storage.loadProject.mockRejectedValue(new Error('IndexedDB unavailable'));

    render(<App />);

    expect(await screen.findByText('Survey form')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('无法使用浏览器本地存储');
  });

  it('restores valid existing saved project data', async () => {
    storage.loadProject.mockResolvedValue(currentProject());

    render(<App />);

    expect(await screen.findByText('Checklist view')).toBeInTheDocument();
    expect(screen.getByText('Saved status: prepared')).toBeInTheDocument();
    await waitFor(() => expect(storage.saveProject).toHaveBeenCalledWith(expect.objectContaining({
      schemaVersion: CURRENT_SAVED_PROJECT_SCHEMA_VERSION,
      answers: expect.objectContaining({
        background: expect.objectContaining({
          applicantType: 'other_or_unclear',
          studyRelation: 'unclear'
        })
      })
    })));
  });

  it('keeps the checklist usable when autosave fails', async () => {
    storage.loadProject.mockResolvedValue(currentProject());
    storage.saveProject.mockRejectedValue(new Error('IndexedDB write failed'));

    render(<App />);

    expect(await screen.findByText('Checklist view')).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent('无法使用浏览器本地存储');
  });

  it('waits for pending autosave and deletes the saved project before restarting', async () => {
    const pendingSave = deferred<void>();
    storage.loadProject.mockResolvedValue(currentProject());
    storage.saveProject.mockReturnValue(pendingSave.promise);

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Restart project' }));
    expect(storage.deleteProject).not.toHaveBeenCalled();
    expect(screen.getByText('Checklist view')).toBeInTheDocument();

    pendingSave.resolve(undefined);

    await waitFor(() => expect(storage.deleteProject).toHaveBeenCalledWith());
    expect(await screen.findByText('Survey form')).toBeInTheDocument();
    expect(screen.queryByText('Checklist view')).not.toBeInTheDocument();
  });

  it('does not enqueue or complete a save after restart begins', async () => {
    const pendingDelete = deferred<void>();
    storage.loadProject.mockResolvedValue(currentProject());
    storage.deleteProject.mockReturnValue(pendingDelete.promise);

    render(<App />);

    const restartButton = await screen.findByRole('button', { name: 'Restart project' });
    await waitFor(() => expect(storage.saveProject).toHaveBeenCalledTimes(1));

    fireEvent.click(restartButton);
    await waitFor(() => expect(storage.deleteProject).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Update status' }));

    await waitFor(() => expect(screen.getByText('Saved status: in_progress')).toBeInTheDocument());
    expect(storage.saveProject).toHaveBeenCalledTimes(1);

    pendingDelete.resolve(undefined);

    expect(await screen.findByText('Survey form')).toBeInTheDocument();
    await waitFor(() => expect(storage.saveProject).toHaveBeenCalledTimes(1));
  });

  it('keeps the current project when deleting the saved project fails', async () => {
    storage.loadProject.mockResolvedValue(currentProject());
    storage.deleteProject.mockRejectedValue(new Error('IndexedDB delete failed'));

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Restart project' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('无法清除浏览器中的旧项目');
    expect(screen.getByText('Checklist view')).toBeInTheDocument();
    expect(screen.queryByText('Survey form')).not.toBeInTheDocument();
  });

  it('continues the save queue after a failed save', async () => {
    storage.loadProject.mockResolvedValue(currentProject());
    storage.saveProject.mockRejectedValueOnce(new Error('IndexedDB write failed'));

    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent('无法使用浏览器本地存储');
    fireEvent.click(screen.getByRole('button', { name: 'Update status' }));

    await waitFor(() => expect(storage.saveProject).toHaveBeenCalledTimes(2));
    expect(storage.saveProject).toHaveBeenLastCalledWith(expect.objectContaining({
      schemaVersion: CURRENT_SAVED_PROJECT_SCHEMA_VERSION,
      statuses: { 'study.offer': 'in_progress' }
    }));
  });

  it('coalesces repeated restart requests into one delete operation', async () => {
    const pendingDelete = deferred<void>();
    storage.loadProject.mockResolvedValue(currentProject());
    storage.deleteProject.mockReturnValue(pendingDelete.promise);

    render(<App />);

    const restartButton = await screen.findByRole('button', { name: 'Restart project' });
    fireEvent.click(restartButton);
    fireEvent.click(restartButton);

    await waitFor(() => expect(storage.deleteProject).toHaveBeenCalledTimes(1));
    pendingDelete.resolve(undefined);

    expect(await screen.findByText('Survey form')).toBeInTheDocument();
    expect(storage.deleteProject).toHaveBeenCalledTimes(1);
  });

  it('preserves migrated data until the V6 material and family route profile is completed', async () => {
    const migratedV4Project: SavedProject = {
      ...savedProject,
      legacyTopLevel: { preserved: true },
      answers: {
        study: { hasOffer: true },
        unknownSection: { nested: { preserved: true } },
        background: {
          applicantType: 'other_or_unclear',
          studyRelation: 'unclear'
        },
        family: {
          linkedApplicationContext: 'partner',
          childVisaRoute: 'child_student_visitor'
        }
      }
    };
    storage.loadProject.mockResolvedValue(currentProject(migratedV4Project));

    render(<App />);

    expect(await screen.findByText(/请补充以下材料背景信息/)).toBeInTheDocument();
    expect(storage.saveProject).not.toHaveBeenCalled();
    expect(surveyEvents.complete).toHaveLength(1);

    surveyEvents.complete[0]({
      data: {
        'study.hasOffer': true,
        'background.applicantType': 'other_or_unclear',
        'background.studyRelation': 'unclear',
        'education.recordContexts': ['completed_qualification'],
        'english.providerEvidenceStatus': 'available',
        'documents.originContext': 'other',
        'documents.nonEnglishEvidenceStatus': 'none_known',
        'family.linkedApplicationContext': 'partner',
        'family.partnerVisaRoute': 'undecided'
      }
    });

    expect(await screen.findByText('Checklist view')).toBeInTheDocument();
    expect(screen.getByText('Saved status: prepared')).toBeInTheDocument();
    await waitFor(() => expect(storage.saveProject).toHaveBeenCalledWith(
      expect.objectContaining({
        schemaVersion: 6,
        statuses: { 'study.offer': 'prepared' },
        legacyTopLevel: { preserved: true }
      })
    ));
    const savedAfterCompletion = storage.saveProject.mock.calls.at(-1)?.[0];
    expect(savedAfterCompletion?.answers).toEqual(expect.objectContaining({
      unknownSection: { nested: { preserved: true } },
      family: {
        linkedApplicationContext: 'partner',
        partnerVisaRoute: 'undecided'
      }
    }));
    expect(savedAfterCompletion?.answers).not.toHaveProperty('_effects');
  });

  it('exports a normal project as V6 without runtime effects or stale hidden routes', async () => {
    storage.loadProject.mockResolvedValue(currentProject({
      ...savedProject,
      answers: {
        ...savedProject.answers,
        family: {
          linkedApplicationContext: 'none',
          partnerVisaRoute: 'partner_student_work',
          childVisaRoute: 'dependent_child_student'
        }
      }
    }));
    const createObjectURL = vi.fn<(value: Blob) => string>(() => 'blob:test');
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn()
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Export project' }));

    const exportedBlob = createObjectURL.mock.calls[0]?.[0];
    const exported = JSON.parse(await readBlob(exportedBlob)) as SavedProject;
    expect(exported.schemaVersion).toBe(6);
    expect(exported.answers).not.toHaveProperty('_effects');
    expect(exported.answers.family).toEqual({ linkedApplicationContext: 'none' });
    expect(exported.statuses).toEqual(savedProject.statuses);
  });

  it('opens a future project read-only without autosaving and exports the original object', async () => {
    const futureProject = {
      ...savedProject,
      schemaVersion: 7,
      updatedAt: '2027-01-01T00:00:00.000Z',
      futureTopLevel: { preserved: true },
      answers: {
        ...savedProject.answers,
        futureAnswer: { preserved: true }
      },
      statuses: {
        ...savedProject.statuses,
        'future.item': 'needs_review' as const
      }
    };
    storage.loadProject.mockResolvedValue({
      kind: 'future',
      project: futureProject,
      schemaVersion: 7
    });
    const createObjectURL = vi.fn<(value: Blob) => string>(() => 'blob:test');
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn()
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<App />);

    expect(await screen.findByText(/此本地项目由较新版本创建（版本 7）/))
      .toBeInTheDocument();
    expect(screen.queryByText('Survey form')).not.toBeInTheDocument();
    expect(screen.queryByText('Checklist view')).not.toBeInTheDocument();
    expect(storage.saveProject).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '原样导出备份' }));

    const exportedBlob = createObjectURL.mock.calls[0]?.[0];
    expect(exportedBlob).toBeInstanceOf(Blob);
    await expect(readBlob(exportedBlob as Blob)).resolves.toBe(
      JSON.stringify(futureProject, null, 2)
    );
    expect(storage.saveProject).not.toHaveBeenCalled();
  });

  it('keeps a future project visible when protected deletion fails', async () => {
    const futureProject = {
      ...savedProject,
      schemaVersion: 7
    };
    storage.loadProject.mockResolvedValue({
      kind: 'future',
      project: futureProject,
      schemaVersion: 7
    });
    storage.deleteProject.mockRejectedValue(new Error('delete failed'));

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '删除并重新开始' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('无法清除浏览器中的旧项目');
    expect(screen.getByText(/此本地项目由较新版本创建（版本 7）/)).toBeInTheDocument();
    expect(storage.saveProject).not.toHaveBeenCalled();
  });

  it('opens an invalid schema version in the fail-closed read-only state', async () => {
    storage.loadProject.mockResolvedValue({
      kind: 'invalid',
      project: {
        ...savedProject,
        schemaVersion: 0
      },
      schemaVersion: 0
    });

    render(<App />);

    expect(await screen.findByText(/此本地项目的版本信息无效/)).toBeInTheDocument();
    expect(storage.saveProject).not.toHaveBeenCalled();
    expect(screen.queryByText('Survey form')).not.toBeInTheDocument();
  });
});
