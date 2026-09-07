import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { CURRENT_SAVED_PROJECT_SCHEMA_VERSION, type SavedProject } from '../src/domain/types';
import {
  clearSavedScrollPosition,
  getSavedScrollPosition,
  setSavedScrollPosition
} from '../src/storage/uiScroll';

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
  loadProjectById: vi.fn((id: string) => storage.loadProject(id)),
  saveProject: vi.fn(),
  loadWorkspace: vi.fn(),
  saveWorkspace: vi.fn(),
  deleteWorkspace: vi.fn(),
  createProjectAndWorkspace: vi.fn(),
  deleteProjectAndSaveWorkspace: vi.fn()
}));
const surveyEvents = vi.hoisted(() => ({
  complete: [] as Array<(sender: { data: Record<string, unknown> }) => void>,
  valueChanged: [] as Array<(
    sender: { data: Record<string, unknown>; getQuestionByName: (name: string) => unknown },
    options: { name: string; question: object }
  ) => void>,
  pageChanged: [] as Array<(
    sender: {
      currentPage: { name: string } | null;
      visiblePages: Array<{ name: string; questions: Array<{ isVisible: boolean; isRequired: boolean; isEmpty: () => boolean }> }>;
      currentPageNo: number;
    }
  ) => void>,
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
    pages = [
      { name: 'scope', questions: [] },
      { name: 'material-background', questions: [] }
    ];
    visiblePages = [
      { name: 'scope', questions: [] },
      { name: 'material-background', questions: [] }
    ];
    _currentPage: { name: string; questions?: unknown[] } | null = null;
    get currentPage() {
      return this._currentPage || this.visiblePages[this.currentPageNo] || null;
    }
    set currentPage(page: { name: string; questions?: unknown[] } | null) {
      this._currentPage = page;
      const idx = this.visiblePages.findIndex((p) => p.name === page?.name);
      if (idx >= 0) this.currentPageNo = idx;
      surveyEvents.pageChanged.forEach((h) => h(this as any));
    }
    getPageByName(name: string) {
      return this.visiblePages.find((p) => p.name === name) || null;
    }
    onComplete = {
      add: vi.fn((handler: (typeof surveyEvents.complete)[number]) => {
        surveyEvents.complete.push(handler);
      })
    };
    onValueChanged = {
      add: vi.fn((handler: (typeof surveyEvents.valueChanged)[number]) => {
        surveyEvents.valueChanged.push(handler);
      })
    };
    onCurrentPageChanged = {
      add: vi.fn((handler: (typeof surveyEvents.pageChanged)[number]) => {
        surveyEvents.pageChanged.push(handler);
      })
    };
    onValidateQuestion = {
      add: vi.fn((handler: (typeof surveyEvents.validateQuestion)[number]) => {
        surveyEvents.validateQuestion.push(handler);
      })
    };
    getQuestionByName = vi.fn();
    clear = vi.fn();
    constructor() {
      this._currentPage = this.visiblePages[0];
    }
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
    statuses,
    authorityName,
    disclaimerFooter,
    onViewHub
  }: {
    onExport: () => void;
    onRestart: () => void;
    onStatusChange: (id: string, status: 'in_progress') => void;
    statuses: Record<string, string>;
    authorityName?: string;
    disclaimerFooter?: string;
    onViewHub?: () => void;
  }) => (
    <div>
      <span>Checklist view</span>
      <span>Saved status: {statuses['study.offer']}</span>
      <span>Authority: {authorityName}</span>
      <footer>{disclaimerFooter}</footer>
      <button type="button" onClick={() => onStatusChange('study.offer', 'in_progress')}>Update status</button>
      <button type="button" onClick={onExport}>Export project</button>
      <button type="button" onClick={onRestart}>Restart project</button>
      {onViewHub ? <button type="button" onClick={onViewHub}>申请中心</button> : null}
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

async function confirmNewApplicantAndEnterSurvey(displayName = 'Test Applicant') {
  expect(await screen.findByText('选择或创建申请人')).toBeInTheDocument();
  fireEvent.change(screen.getByPlaceholderText('例如：张三、Alice'), {
    target: { value: displayName }
  });
  fireEvent.click(screen.getByRole('button', { name: '创建并开始准备' }));
  expect(await screen.findByText('Survey form')).toBeInTheDocument();
}

describe('App persistence hardening', () => {
  beforeEach(() => {
    window.localStorage.clear();
    surveyEvents.complete.length = 0;
    surveyEvents.valueChanged.length = 0;
    surveyEvents.pageChanged.length = 0;
    surveyEvents.validateQuestion.length = 0;
    storage.deleteProject.mockReset();
    storage.loadProject.mockReset();
    storage.saveProject.mockReset();
    storage.loadWorkspace.mockReset();
    storage.saveWorkspace.mockReset();
    storage.deleteWorkspace.mockReset();
    storage.createProjectAndWorkspace.mockReset();
    storage.deleteProjectAndSaveWorkspace.mockReset();

    storage.deleteProject.mockResolvedValue(undefined);
    storage.loadProject.mockResolvedValue(undefined);
    storage.saveProject.mockResolvedValue(undefined);
    storage.loadWorkspace.mockResolvedValue({
      kind: 'empty',
      workspace: {
        people: [],
        relationships: [],
        applications: []
      }
    });
    storage.saveWorkspace.mockResolvedValue(undefined);
    storage.deleteWorkspace.mockResolvedValue(undefined);
    storage.createProjectAndWorkspace.mockResolvedValue(undefined);
    storage.deleteProjectAndSaveWorkspace.mockResolvedValue(undefined);
  });

  it('shows the persistent trial disclosure in the survey flow', async () => {
    render(<App />);

    expect(await screen.findByText('选择申请路线')).toBeInTheDocument();
    expect(screen.getByLabelText('测试预览说明')).toHaveTextContent(
      '测试预览版：本工具仅协助整理签证或许可申请材料，不是政府官方申请产品'
    );
    fireEvent.click(screen.getByRole('button', { name: /新西兰 · 自费学生签证/ }));
    await confirmNewApplicantAndEnterSurvey();
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

    fireEvent.click(await screen.findByRole('button', { name: /新西兰 · 自费学生签证/ }));
    await confirmNewApplicantAndEnterSurvey();
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

    expect(await screen.findByText('选择申请路线')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('无法使用浏览器本地存储');
    fireEvent.click(screen.getByRole('button', { name: /新西兰 · 自费学生签证/ }));
    await confirmNewApplicantAndEnterSurvey();
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
          applicantType: 'other_or_unclear'
        })
      })
    })));
  });

  it('restores valid legacy saved project with missing originContext and prompts for material completion without showing checklist', async () => {
    const { documents: _ignored, ...answersWithoutOriginContext } = savedProject.answers;
    const legacyProject: SavedProject = {
      ...savedProject,
      answers: {
        ...answersWithoutOriginContext,
        documents: {
          nonEnglishEvidenceStatus: 'none_known'
        }
      }
    };
    storage.loadProject.mockResolvedValue(currentProject(legacyProject));

    render(<App />);

    expect(await screen.findByText('Survey form')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('请补充以下材料背景信息，以生成完整清单');
    expect(screen.queryByText('Checklist view')).not.toBeInTheDocument();
    expect(screen.queryByText('选择申请路线')).not.toBeInTheDocument();
  });

  it('restores valid legacy saved project with missing family block and prompts for material completion without showing checklist', async () => {
    const { family: _ignored, ...answersWithoutFamily } = savedProject.answers;
    const legacyProject: SavedProject = {
      ...savedProject,
      answers: answersWithoutFamily
    };
    storage.loadProject.mockResolvedValue(currentProject(legacyProject));

    render(<App />);

    expect(await screen.findByText('Survey form')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('请补充以下材料背景信息，以生成完整清单');
    expect(screen.queryByText('Checklist view')).not.toBeInTheDocument();
    expect(screen.queryByText('选择申请路线')).not.toBeInTheDocument();
  });

  it('keeps restart queued behind an in-flight save and ignores late save completion', async () => {
    const saveDeferred = deferred<void>();
    const deleteDeferred = deferred<void>();

    storage.loadProject.mockResolvedValue(currentProject());
    storage.saveProject.mockReturnValue(saveDeferred.promise);
    storage.deleteProject.mockReturnValue(deleteDeferred.promise);

    render(<App />);

    expect(await screen.findByText('Checklist view')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Restart project' }));

    expect(storage.deleteProject).not.toHaveBeenCalled();

    saveDeferred.resolve();
    await waitFor(() => expect(storage.deleteProject).toHaveBeenCalledTimes(1));

    expect(screen.getByText('Checklist view')).toBeInTheDocument();

    deleteDeferred.resolve();
    expect(await screen.findByText('选择申请路线')).toBeInTheDocument();
    expect(screen.queryByText('Checklist view')).not.toBeInTheDocument();
  });

  it('drops subsequent edits when restart has been requested', async () => {
    const saveDeferred = deferred<void>();
    const deleteDeferred = deferred<void>();

    storage.loadProject.mockResolvedValue(currentProject());
    storage.saveProject.mockReturnValue(saveDeferred.promise);
    storage.deleteProject.mockReturnValue(deleteDeferred.promise);

    render(<App />);

    expect(await screen.findByText('Checklist view')).toBeInTheDocument();
    const restartButton = await screen.findByRole('button', { name: 'Restart project' });
    fireEvent.click(restartButton);

    fireEvent.click(screen.getByRole('button', { name: 'Update status' }));
    await waitFor(() => expect(screen.getByText('Saved status: in_progress')).toBeInTheDocument());

    expect(storage.saveProject).toHaveBeenCalledTimes(1);

    saveDeferred.resolve();
    deleteDeferred.resolve();

    expect(await screen.findByText('选择申请路线')).toBeInTheDocument();
    expect(storage.saveProject).toHaveBeenCalledTimes(1);
  });

  it('preserves current state when restart delete fails and permits later retry', async () => {
    const firstDelete = deferred<void>();
    const retryDelete = deferred<void>();

    storage.loadProject.mockResolvedValue(currentProject());
    storage.deleteProject
      .mockReturnValueOnce(firstDelete.promise)
      .mockReturnValueOnce(retryDelete.promise);

    render(<App />);

    expect(await screen.findByText('Checklist view')).toBeInTheDocument();
    const restartButton = await screen.findByRole('button', { name: 'Restart project' });
    fireEvent.click(restartButton);

    firstDelete.reject(new Error('delete failed'));
    expect(await screen.findByRole('alert')).toHaveTextContent('无法清除浏览器中的旧项目');
    expect(screen.getByText('Checklist view')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Update status' }));
    await waitFor(() => expect(screen.getByText('Saved status: in_progress')).toBeInTheDocument());
    await waitFor(() => expect(storage.saveProject).toHaveBeenCalledTimes(2));

    fireEvent.click(restartButton);
    retryDelete.resolve();

    expect(await screen.findByText('选择申请路线')).toBeInTheDocument();
    expect(screen.queryByText('Checklist view')).not.toBeInTheDocument();
  });

  it('prevents overlapping duplicate restart operations while one is active', async () => {
    const deleteDeferred = deferred<void>();

    storage.loadProject.mockResolvedValue(currentProject());
    storage.deleteProject.mockReturnValue(deleteDeferred.promise);

    render(<App />);

    expect(await screen.findByText('Checklist view')).toBeInTheDocument();
    const restartButton = await screen.findByRole('button', { name: 'Restart project' });
    fireEvent.click(restartButton);
    await waitFor(() => expect(storage.deleteProject).toHaveBeenCalledTimes(1));

    fireEvent.click(restartButton);
    expect(storage.deleteProject).toHaveBeenCalledTimes(1);

    deleteDeferred.resolve();
    expect(await screen.findByText('选择申请路线')).toBeInTheDocument();
  });

  it('shows save failure alert and retains in-memory checklist edits if autosave rejects', async () => {
    storage.loadProject.mockResolvedValue(currentProject());
    storage.saveProject
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Quota exceeded'));

    render(<App />);

    expect(await screen.findByText('Checklist view')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Update status' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('无法使用浏览器本地存储');
    expect(screen.getByText('Saved status: in_progress')).toBeInTheDocument();
  });

  it('exports JSON payload with exact project data and timestamps', async () => {
    let exportedBlob: Blob | null = null;
    const createObjectURL = vi.fn((blob: Blob) => {
      exportedBlob = blob;
      return 'blob:mock-url';
    });
    const revokeObjectURL = vi.fn();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, writable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, writable: true });

    storage.loadProject.mockResolvedValue(currentProject());

    render(<App />);

    expect(await screen.findByText('Checklist view')).toBeInTheDocument();
    expect(screen.getByText('Saved status: prepared')).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: 'Export project' }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(exportedBlob).not.toBeNull();

    const exportedText = await readBlob(exportedBlob!);
    const exportedJson = JSON.parse(exportedText);

    expect(exportedJson.id).toBe('default');
    expect(exportedJson.schemaVersion).toBe(CURRENT_SAVED_PROJECT_SCHEMA_VERSION);
    expect(exportedJson.answers).toEqual(savedProject.answers);
    expect(exportedJson.statuses).toEqual({ 'study.offer': 'prepared' });
    expect(typeof exportedJson.updatedAt).toBe('string');
    expect(Number.isNaN(Date.parse(exportedJson.updatedAt))).toBe(false);

    clickSpy.mockRestore();
  });

  it('exports unchanged raw payload from read-only future schema version project', async () => {
    let exportedBlob: Blob | null = null;
    const createObjectURL = vi.fn((blob: Blob) => {
      exportedBlob = blob;
      return 'blob:mock-url';
    });
    const revokeObjectURL = vi.fn();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, writable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, writable: true });

    const rawFuturePayload: SavedProject = {
      ...savedProject,
      schemaVersion: 999,
      futureField: 'strictly-preserved'
    } as SavedProject;

    storage.loadProject.mockResolvedValue({
      kind: 'future',
      project: rawFuturePayload,
      schemaVersion: 999
    });

    render(<App />);

    expect(await screen.findByText('本地项目只读保护')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '原样导出备份' }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(exportedBlob).not.toBeNull();

    const exportedText = await readBlob(exportedBlob!);
    const exportedJson = JSON.parse(exportedText);

    expect(exportedJson.schemaVersion).toBe(999);
    expect(exportedJson.futureField).toBe('strictly-preserved');
    expect(storage.saveProject).not.toHaveBeenCalled();

    clickSpy.mockRestore();
  });

  it('opens project in read-only compatibility card when schemaVersion is higher than current', async () => {
    const rawFuturePayload: SavedProject = {
      ...savedProject,
      schemaVersion: CURRENT_SAVED_PROJECT_SCHEMA_VERSION + 1,
      extraNewFeature: 'do-not-overwrite'
    } as SavedProject;

    storage.loadProject.mockResolvedValue({
      kind: 'future',
      project: rawFuturePayload,
      schemaVersion: CURRENT_SAVED_PROJECT_SCHEMA_VERSION + 1
    });

    render(<App />);

    expect(await screen.findByText('本地项目只读保护')).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`此本地项目由较新版本创建（版本 ${CURRENT_SAVED_PROJECT_SCHEMA_VERSION + 1}）`))).toBeInTheDocument();
    expect(screen.queryByText('Checklist view')).not.toBeInTheDocument();
    expect(screen.queryByText('选择申请路线')).not.toBeInTheDocument();
    expect(storage.saveProject).not.toHaveBeenCalled();

    fireEvent.click(await screen.findByRole('button', { name: '删除并重新开始' }));
    await waitFor(() => expect(storage.deleteProject).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('选择申请路线')).toBeInTheDocument();
  });

  it('exports unchanged raw payload from read-only unknown route project', async () => {
    let exportedBlob: Blob | null = null;
    const createObjectURL = vi.fn((blob: Blob) => {
      exportedBlob = blob;
      return 'blob:mock-url';
    });
    const revokeObjectURL = vi.fn();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, writable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, writable: true });

    const rawUnknownRoutePayload: SavedProject = {
      ...savedProject,
      routeId: 'future-visa-stream-xyz',
      someFutureField: 'preserve-me'
    } as SavedProject;

    storage.loadProject.mockResolvedValue({
      kind: 'unknown_route',
      project: rawUnknownRoutePayload,
      routeId: 'future-visa-stream-xyz'
    });

    render(<App />);

    expect(await screen.findByText('本地项目只读保护')).toBeInTheDocument();
    expect(screen.getByText(/此本地项目属于当前未支持的路线（路线 ID：“future-visa-stream-xyz”）/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '原样导出备份' }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(exportedBlob).not.toBeNull();

    const exportedText = await readBlob(exportedBlob!);
    const exportedJson = JSON.parse(exportedText);

    expect(exportedJson.routeId).toBe('future-visa-stream-xyz');
    expect(exportedJson.someFutureField).toBe('preserve-me');
    expect(storage.saveProject).not.toHaveBeenCalled();

    clickSpy.mockRestore();
  });

  describe('Candidate 3 Slice 5B route selection and isolation', () => {
    it('shows route selection on clean startup without stored project', async () => {
      render(<App />);

      expect(await screen.findByText('选择申请路线')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /新西兰 · 自费学生签证/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /加拿大 · 学习许可/ })).toBeInTheDocument();

      // Ensure internal route IDs are NOT rendered to applicant
      expect(screen.queryByText('nz-student-fee-paying')).not.toBeInTheDocument();
      expect(screen.queryByText('ca-study-permit')).not.toBeInTheDocument();
    });

    it('selecting Canada creates a project with routeId: ca-study-permit and resolves Canada RoutePack', async () => {
      render(<App />);

      fireEvent.click(await screen.findByRole('button', { name: /加拿大 · 学习许可/ }));
      await confirmNewApplicantAndEnterSurvey('Canada Applicant');
      expect(screen.getByText('加拿大学习许可（Study Permit）材料准备清单')).toBeInTheDocument();

      surveyEvents.complete[0]({
        data: {
          'admission.dliStatus': 'confirmed_dli',
          'admission.hasLetterOfAcceptance': 'yes_unconditional'
        }
      });

      expect(await screen.findByText('Checklist view')).toBeInTheDocument();
      await waitFor(() => expect(storage.saveProject).toHaveBeenCalledWith(
        expect.objectContaining({
          routeId: 'ca-study-permit',
          schemaVersion: CURRENT_SAVED_PROJECT_SCHEMA_VERSION,
          answers: expect.objectContaining({
            admission: expect.objectContaining({
              dliStatus: 'confirmed_dli'
            })
          })
        })
      ));

      // Canada disclaimer attribution checks
      expect(screen.getAllByText(/IRCC/).length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText(/INZ/)).not.toBeInTheDocument();
    });

    it('restoring an explicit Canada project resolves CA content and IRCC disclaimer', async () => {
      const caProject: SavedProject = {
        id: 'default',
        routeId: 'ca-study-permit',
        schemaVersion: CURRENT_SAVED_PROJECT_SCHEMA_VERSION,
        answers: {
          admission: { dliStatus: 'confirmed_dli' }
        },
        statuses: { 'ca.admission.loa': 'prepared' },
        updatedAt: '2026-08-25T00:00:00.000Z'
      };
      storage.loadProject.mockResolvedValue({
        kind: 'current',
        project: caProject
      });

      render(<App />);

      expect(await screen.findByText('Checklist view')).toBeInTheDocument();
      expect(screen.queryByText('选择申请路线')).not.toBeInTheDocument();
      expect(screen.getAllByText(/IRCC/).length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText(/INZ/)).not.toBeInTheDocument();
    });

    it('restoring legacy project without routeId normalizes to NZ without exposing route choice', async () => {
      const legacyProject: SavedProject = {
        id: 'default',
        schemaVersion: CURRENT_SAVED_PROJECT_SCHEMA_VERSION,
        answers: savedProject.answers,
        statuses: { 'study.offer': 'prepared' },
        updatedAt: '2026-08-25T00:00:00.000Z'
      };
      storage.loadProject.mockResolvedValue({
        kind: 'current',
        project: {
          ...legacyProject,
          routeId: 'nz-student-fee-paying'
        }
      });

      render(<App />);

      expect(await screen.findByText('Checklist view')).toBeInTheDocument();
      expect(screen.queryByText('选择申请路线')).not.toBeInTheDocument();
      expect(screen.getAllByText(/INZ/).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Candidate 3 Slice 5C-1 application creation persistence', () => {
    it('selecting Canada creates an initial application with routeId: ca-study-permit and empty answers/statuses', async () => {
      render(<App />);

      fireEvent.click(await screen.findByRole('button', { name: /加拿大 · 学习许可/ }));
      await confirmNewApplicantAndEnterSurvey('Canada Applicant');

      await waitFor(() => expect(storage.createProjectAndWorkspace).toHaveBeenCalledWith(
        expect.objectContaining({
          routeId: 'ca-study-permit',
          schemaVersion: CURRENT_SAVED_PROJECT_SCHEMA_VERSION,
          surveyCompleted: false,
          answers: {},
          statuses: {}
        }),
        expect.any(Object)
      ));
    });

    it('selecting NZ creates an initial application with routeId: nz-student-fee-paying and empty answers/statuses', async () => {
      render(<App />);

      fireEvent.click(await screen.findByRole('button', { name: /新西兰 · 自费学生签证/ }));
      await confirmNewApplicantAndEnterSurvey('NZ Student Applicant');

      await waitFor(() => expect(storage.createProjectAndWorkspace).toHaveBeenCalledWith(
        expect.objectContaining({
          routeId: 'nz-student-fee-paying',
          schemaVersion: CURRENT_SAVED_PROJECT_SCHEMA_VERSION,
          surveyCompleted: false,
          answers: {},
          statuses: {}
        }),
        expect.any(Object)
      ));
    });

    it('restoring an incomplete CA project opens the CA survey rather than route selection and does not render checklist', async () => {
      const incompleteCaProject: SavedProject = {
        id: 'default',
        routeId: 'ca-study-permit',
        schemaVersion: CURRENT_SAVED_PROJECT_SCHEMA_VERSION,
        answers: {},
        statuses: {},
        updatedAt: '2026-08-25T00:00:00.000Z'
      };
      storage.loadProject.mockResolvedValue({
        kind: 'current',
        project: incompleteCaProject
      });

      render(<App />);

      expect(await screen.findByText('Survey form')).toBeInTheDocument();
      expect(screen.getByText('加拿大学习许可（Study Permit）材料准备清单')).toBeInTheDocument();
      expect(screen.queryByText('选择申请路线')).not.toBeInTheDocument();
      expect(screen.queryByText('Checklist view')).not.toBeInTheDocument();
    });

    it('restoring an incomplete NZ project opens the NZ survey rather than route selection and does not render checklist', async () => {
      const incompleteNzProject: SavedProject = {
        id: 'default',
        routeId: 'nz-student-fee-paying',
        schemaVersion: CURRENT_SAVED_PROJECT_SCHEMA_VERSION,
        answers: {},
        statuses: {},
        updatedAt: '2026-08-25T00:00:00.000Z'
      };
      storage.loadProject.mockResolvedValue({
        kind: 'current',
        project: incompleteNzProject
      });

      render(<App />);

      expect(await screen.findByText('Survey form')).toBeInTheDocument();
      expect(screen.getByText('新西兰自费学生签证材料准备清单')).toBeInTheDocument();
      expect(screen.queryByText('选择申请路线')).not.toBeInTheDocument();
      expect(screen.queryByText('Checklist view')).not.toBeInTheDocument();
    });

    it('restarting an application deletes it and resets to route selection', async () => {
      const incompleteCaProject: SavedProject = {
        id: 'default',
        routeId: 'ca-study-permit',
        schemaVersion: CURRENT_SAVED_PROJECT_SCHEMA_VERSION,
        answers: {
          admission: { dliStatus: 'confirmed_dli' }
        },
        statuses: { 'ca.admission.loa': 'prepared' },
        updatedAt: '2026-08-25T00:00:00.000Z'
      };
      storage.loadProject.mockResolvedValue({
        kind: 'current',
        project: incompleteCaProject
      });

      render(<App />);

      expect(await screen.findByText('Checklist view')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Restart project' }));
      await waitFor(() => expect(storage.deleteProject).toHaveBeenCalledTimes(1));
      expect(await screen.findByText('选择申请路线')).toBeInTheDocument();
      expect(screen.queryByText('Checklist view')).not.toBeInTheDocument();
    });
  });

  describe('Candidate 3 Slice 5C-2 survey draft persistence', () => {
    it('selecting CA creates an initial project with surveyCompleted: false', async () => {
      render(<App />);

      fireEvent.click(await screen.findByRole('button', { name: /加拿大 · 学习许可/ }));
      await confirmNewApplicantAndEnterSurvey();

      await waitFor(() => expect(storage.createProjectAndWorkspace).toHaveBeenCalledWith(
        expect.objectContaining({
          routeId: 'ca-study-permit',
          surveyCompleted: false,
          answers: {}
        }),
        expect.any(Object)
      ));
    });

    it('selecting NZ creates an initial project with surveyCompleted: false', async () => {
      render(<App />);

      fireEvent.click(await screen.findByRole('button', { name: /新西兰 · 自费学生签证/ }));
      await confirmNewApplicantAndEnterSurvey();

      await waitFor(() => expect(storage.createProjectAndWorkspace).toHaveBeenCalledWith(
        expect.objectContaining({
          routeId: 'nz-student-fee-paying',
          surveyCompleted: false,
          answers: {}
        }),
        expect.any(Object)
      ));
    });

    it('entering partial CA survey answers persists real draft answers with surveyCompleted: false', async () => {
      render(<App />);

      fireEvent.click(await screen.findByRole('button', { name: /加拿大 · 学习许可/ }));
      await confirmNewApplicantAndEnterSurvey();
      expect(surveyEvents.valueChanged).toHaveLength(1);

      surveyEvents.valueChanged[0]({
        data: {
          'admission.dliStatus': 'confirmed_dli',
          'admission.hasLetterOfAcceptance': 'yes_unconditional'
        },
        getQuestionByName: vi.fn()
      }, { name: 'admission.dliStatus', question: {} });

      await waitFor(() => expect(storage.saveProject).toHaveBeenCalledWith(
        expect.objectContaining({
          routeId: 'ca-study-permit',
          surveyCompleted: false,
          answers: {
            admission: {
              dliStatus: 'confirmed_dli',
              hasLetterOfAcceptance: 'yes_unconditional'
            }
          }
        })
      ));
    });

    it('entering partial NZ survey answers persists real draft answers with surveyCompleted: false', async () => {
      render(<App />);

      fireEvent.click(await screen.findByRole('button', { name: /新西兰 · 自费学生签证/ }));
      await confirmNewApplicantAndEnterSurvey();
      expect(surveyEvents.valueChanged).toHaveLength(1);

      surveyEvents.valueChanged[0]({
        data: {
          'study.hasOffer': true,
          'study.tuitionPaid': false
        },
        getQuestionByName: vi.fn()
      }, { name: 'study.hasOffer', question: {} });

      await waitFor(() => expect(storage.saveProject).toHaveBeenCalledWith(
        expect.objectContaining({
          routeId: 'nz-student-fee-paying',
          surveyCompleted: false,
          answers: {
            study: {
              hasOffer: true,
              tuitionPaid: false
            }
          }
        })
      ));
    });

    it('restoring partial CA answers opens CA survey and does not render checklist', async () => {
      const draftCaProject: SavedProject = {
        id: 'default',
        routeId: 'ca-study-permit',
        schemaVersion: CURRENT_SAVED_PROJECT_SCHEMA_VERSION,
        surveyCompleted: false,
        answers: {
          admission: {
            dliStatus: 'confirmed_dli',
            hasLetterOfAcceptance: 'yes_unconditional'
          }
        },
        statuses: {},
        updatedAt: '2026-08-25T00:00:00.000Z'
      };
      storage.loadProject.mockResolvedValue({
        kind: 'current',
        project: draftCaProject
      });

      render(<App />);

      expect(await screen.findByText('Survey form')).toBeInTheDocument();
      expect(screen.getByText('加拿大学习许可（Study Permit）材料准备清单')).toBeInTheDocument();
      expect(screen.queryByText('Checklist view')).not.toBeInTheDocument();
    });

    it('restoring partial NZ answers opens NZ survey and does not render checklist', async () => {
      const draftNzProject: SavedProject = {
        id: 'default',
        routeId: 'nz-student-fee-paying',
        schemaVersion: CURRENT_SAVED_PROJECT_SCHEMA_VERSION,
        surveyCompleted: false,
        answers: {
          study: {
            hasOffer: true,
            tuitionPaid: false
          }
        },
        statuses: {},
        updatedAt: '2026-08-25T00:00:00.000Z'
      };
      storage.loadProject.mockResolvedValue({
        kind: 'current',
        project: draftNzProject
      });

      render(<App />);

      expect(await screen.findByText('Survey form')).toBeInTheDocument();
      expect(screen.getByText('新西兰自费学生签证材料准备清单')).toBeInTheDocument();
      expect(screen.queryByText('Checklist view')).not.toBeInTheDocument();
    });

    it('completing survey marks surveyCompleted: true and persists merged answers preserving pre-existing draft answers', async () => {
      render(<App />);

      fireEvent.click(await screen.findByRole('button', { name: /加拿大 · 学习许可/ }));
      await confirmNewApplicantAndEnterSurvey();
      expect(surveyEvents.valueChanged).toHaveLength(1);
      expect(surveyEvents.complete).toHaveLength(1);

      // Pre-existing draft answer
      surveyEvents.valueChanged[0]({
        data: {
          'admission.dliStatus': 'confirmed_dli',
          'admission.hasLetterOfAcceptance': 'yes_unconditional'
        },
        getQuestionByName: vi.fn()
      }, { name: 'admission.dliStatus', question: {} });

      // Completion payload with additional scope fields
      surveyEvents.complete[0]({
        data: {
          'scope.applicationLocation': 'outside_canada',
          'scope.destinationProvince': 'ontario',
          'scope.studyType': 'post_secondary'
        }
      });

      expect(await screen.findByText('Checklist view')).toBeInTheDocument();
      await waitFor(() => expect(storage.saveProject).toHaveBeenLastCalledWith(
        expect.objectContaining({
          routeId: 'ca-study-permit',
          surveyCompleted: true,
          answers: {
            admission: {
              dliStatus: 'confirmed_dli',
              hasLetterOfAcceptance: 'yes_unconditional'
            },
            scope: {
              applicationLocation: 'outside_canada',
              destinationProvince: 'ontario',
              studyType: 'post_secondary'
            }
          }
        })
      ));
    });

    it('non-empty partial answers never make checklist available while surveyCompleted is false', async () => {
      const draftProject: SavedProject = {
        id: 'default',
        routeId: 'ca-study-permit',
        schemaVersion: CURRENT_SAVED_PROJECT_SCHEMA_VERSION,
        surveyCompleted: false,
        answers: {
          admission: { dliStatus: 'confirmed_dli' },
          scope: { applicationLocation: 'outside_canada', destinationProvince: 'ontario', studyType: 'post_secondary' },
          funding: { peopleComingToCanadaStatus: 'known', peopleComingToCanadaCount: 1, programDuration: 'one_year' }
        },
        statuses: {},
        updatedAt: '2026-08-25T00:00:00.000Z'
      };
      storage.loadProject.mockResolvedValue({
        kind: 'current',
        project: draftProject
      });

      render(<App />);

      expect(await screen.findByText('Survey form')).toBeInTheDocument();
      expect(screen.queryByText('Checklist view')).not.toBeInTheDocument();
    });

    it('opens legacy project without surveyCompleted in checklist mode if answers exist', async () => {
      const legacyProject: SavedProject = {
        id: 'default',
        routeId: 'nz-student-fee-paying',
        schemaVersion: CURRENT_SAVED_PROJECT_SCHEMA_VERSION,
        // surveyCompleted is intentionally undefined
        answers: savedProject.answers,
        statuses: { 'study.offer': 'prepared' },
        updatedAt: '2026-08-25T00:00:00.000Z'
      };
      storage.loadProject.mockResolvedValue({
        kind: 'current',
        project: legacyProject
      });

      render(<App />);

      expect(await screen.findByText('Checklist view')).toBeInTheDocument();
      expect(screen.queryByText('选择申请路线')).not.toBeInTheDocument();
    });

    it('selecting NZ Visitor opens NZ Visitor survey, persists routeId nz-visitor, and does not resolve NZ Student content', async () => {
      render(<App />);

      fireEvent.click(await screen.findByRole('button', { name: /新西兰 · 访问签证/ }));
      await confirmNewApplicantAndEnterSurvey('NZ Visitor Applicant');

      expect(screen.getByText('新西兰访问签证材料准备清单')).toBeInTheDocument();
      expect(screen.queryByText('新西兰自费学生签证材料准备清单')).not.toBeInTheDocument();
      expect(screen.queryByText('Checklist view')).not.toBeInTheDocument();

      await waitFor(() => expect(storage.createProjectAndWorkspace).toHaveBeenCalledWith(
        expect.objectContaining({
          routeId: 'nz-visitor',
          surveyCompleted: false,
          answers: {}
        }),
        expect.any(Object)
      ));
    });

    it('restoring partial NZ Visitor answers opens NZ Visitor survey without route selection, NZ Student content, or premature checklist', async () => {
      const draftVisitorProject: SavedProject = {
        id: 'default',
        routeId: 'nz-visitor',
        schemaVersion: CURRENT_SAVED_PROJECT_SCHEMA_VERSION,
        surveyCompleted: false,
        answers: {
          scope: {
            isAdultApplicant: 'yes'
          },
          visit: {
            primaryPurpose: 'tourism_holiday'
          }
        },
        statuses: {},
        updatedAt: '2026-08-25T00:00:00.000Z'
      };
      storage.loadProject.mockResolvedValue({
        kind: 'current',
        project: draftVisitorProject
      });

      render(<App />);

      expect(await screen.findByText('Survey form')).toBeInTheDocument();
      expect(screen.getByText('新西兰访问签证材料准备清单')).toBeInTheDocument();
      expect(screen.queryByText('选择申请路线')).not.toBeInTheDocument();
      expect(screen.queryByText('新西兰自费学生签证材料准备清单')).not.toBeInTheDocument();
      expect(screen.queryByText('Checklist view')).not.toBeInTheDocument();
    });
  });

  describe('Candidate 5 Slice 5C1 — Applicant Selection Flow and Bootstrap Isolation', () => {
    it('1. route selection alone does not persist an application or workspace', async () => {
      render(<App />);

      fireEvent.click(await screen.findByRole('button', { name: /新西兰 · 自费学生签证/ }));

      expect(await screen.findByText('选择或创建申请人')).toBeInTheDocument();
      expect(storage.saveProject).not.toHaveBeenCalled();
      expect(storage.saveWorkspace).not.toHaveBeenCalled();
      expect(storage.createProjectAndWorkspace).not.toHaveBeenCalled();
    });

    it('2. empty Workspace: route -> applicant page -> new Person -> create -> enters Survey', async () => {
      render(<App />);

      fireEvent.click(await screen.findByRole('button', { name: /加拿大 · 学习许可/ }));

      expect(await screen.findByText('选择或创建申请人')).toBeInTheDocument();
      expect(screen.getByText(/工作区中尚无人员记录/)).toBeInTheDocument();

      fireEvent.change(screen.getByPlaceholderText('例如：张三、Alice'), {
        target: { value: 'Dan New Applicant' }
      });
      fireEvent.click(screen.getByRole('button', { name: '创建并开始准备' }));

      expect(await screen.findByText('Survey form')).toBeInTheDocument();
      expect(screen.getByText('加拿大学习许可（Study Permit）材料准备清单')).toBeInTheDocument();

      expect(storage.createProjectAndWorkspace).toHaveBeenCalledTimes(1);
      const [persistedProject, persistedWorkspace] = storage.createProjectAndWorkspace.mock.calls[0];
      expect(persistedProject.routeId).toBe('ca-study-permit');
      expect(persistedProject.id).not.toBe('default');
      expect(persistedWorkspace.workspace.people).toEqual([
        expect.objectContaining({ displayName: 'Dan New Applicant' })
      ]);
      expect(persistedWorkspace.workspace.applications).toEqual([
        expect.objectContaining({
          applicationId: persistedProject.id,
          routeId: 'ca-study-permit'
        })
      ]);
    });

    it('3. existing Workspace Person: route -> applicant page -> select existing Person -> create -> enters Survey', async () => {
      storage.loadWorkspace.mockResolvedValue({
        kind: 'current',
        workspace: {
          people: [
            { personId: 'person-existing-1', displayName: 'Alice Existing' },
            { personId: 'person-existing-2', displayName: 'Bob Existing' }
          ],
          relationships: [],
          applications: []
        },
        savedWorkspace: {
          id: 'default',
          schemaVersion: 1,
          workspace: {
            people: [
              { personId: 'person-existing-1', displayName: 'Alice Existing' },
              { personId: 'person-existing-2', displayName: 'Bob Existing' }
            ],
            relationships: [],
            applications: []
          },
          updatedAt: '2026-08-27T10:00:00.000Z'
        }
      });

      render(<App />);

      fireEvent.click(await screen.findByRole('button', { name: /新西兰 · 访问签证/ }));

      expect(await screen.findByText('选择或创建申请人')).toBeInTheDocument();
      expect(screen.getByText('Alice Existing')).toBeInTheDocument();
      expect(screen.getByText('Bob Existing')).toBeInTheDocument();

      // Select Bob
      fireEvent.click(screen.getByLabelText('Bob Existing'));
      fireEvent.click(screen.getByRole('button', { name: '创建并开始准备' }));

      expect(await screen.findByText('Survey form')).toBeInTheDocument();
      expect(screen.getByText('新西兰访问签证材料准备清单')).toBeInTheDocument();

      expect(storage.createProjectAndWorkspace).toHaveBeenCalledTimes(1);
      const [persistedProject, persistedWorkspace] = storage.createProjectAndWorkspace.mock.calls[0];
      expect(persistedProject.routeId).toBe('nz-visitor');
      expect(persistedWorkspace.workspace.applications[0]).toEqual({
        applicationId: persistedProject.id,
        applicantPersonId: 'person-existing-2',
        routeId: 'nz-visitor'
      });
    });

    it('4. back from applicant selection returns to route selection without creating any records', async () => {
      render(<App />);

      fireEvent.click(await screen.findByRole('button', { name: /加拿大 · 学习许可/ }));
      expect(await screen.findByText('选择或创建申请人')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: '返回选择路线' }));

      expect(await screen.findByText('选择申请路线')).toBeInTheDocument();
      expect(screen.queryByText('选择或创建申请人')).not.toBeInTheDocument();
      expect(storage.saveProject).not.toHaveBeenCalled();
      expect(storage.saveWorkspace).not.toHaveBeenCalled();
      expect(storage.createProjectAndWorkspace).not.toHaveBeenCalled();
    });

    it('5. workspace load failure does not prevent an existing legacy SavedProject from restoring', async () => {
      storage.loadProject.mockResolvedValue(currentProject());
      storage.loadWorkspace.mockRejectedValue(new Error('Workspace DB corrupt'));

      render(<App />);

      expect(await screen.findByText('Checklist view')).toBeInTheDocument();
      expect(screen.getByText('Saved status: prepared')).toBeInTheDocument();
    });

    it('6. workspace load failure with no existing project causes applicant creation to fail closed', async () => {
      storage.loadProject.mockResolvedValue(undefined);
      storage.loadWorkspace.mockRejectedValue(new Error('Workspace DB unreadable'));

      render(<App />);

      fireEvent.click(await screen.findByRole('button', { name: /新西兰 · 自费学生签证/ }));
      expect(await screen.findByText('选择或创建申请人')).toBeInTheDocument();
      expect(screen.getByText(/无法读取本地工作区数据/)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '创建并开始准备' })).not.toBeInTheDocument();
      expect(storage.createProjectAndWorkspace).not.toHaveBeenCalled();
    });

    it('7. invalid or future Workspace read results remain fail closed for new application creation', async () => {
      storage.loadWorkspace.mockResolvedValue({
        kind: 'future',
        schemaVersion: 42,
        rawData: {}
      });

      render(<App />);

      fireEvent.click(await screen.findByRole('button', { name: /新西兰 · 自费学生签证/ }));
      expect(await screen.findByText('选择或创建申请人')).toBeInTheDocument();
      expect(screen.getByText(/此本地工作区由较新版本创建（版本 42）/)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '创建并开始准备' })).not.toBeInTheDocument();
      expect(storage.createProjectAndWorkspace).not.toHaveBeenCalled();
    });
  });

  describe('Candidate 5 Slice 5C2 — Application Restart / Delete Consistency', () => {
    it('Workspace-backed application restart uses atomic deleteProjectAndSaveWorkspace and leaves Person reusable in updated workspace', async () => {
      const workspaceData = {
        people: [{ personId: 'p-1', displayName: 'Alice' }],
        relationships: [],
        applications: [
          {
            applicationId: 'app-ws-1',
            applicantPersonId: 'p-1',
            routeId: 'nz-student-fee-paying'
          }
        ]
      };

      storage.loadWorkspace.mockResolvedValue({
        kind: 'current',
        workspace: workspaceData,
        savedWorkspace: {
          id: 'default',
          schemaVersion: 1,
          workspace: workspaceData,
          updatedAt: '2026-09-01T00:00:00.000Z'
        }
      });

      storage.loadProject.mockResolvedValue(
        currentProject({
          ...savedProject,
          id: 'app-ws-1',
          routeId: 'nz-student-fee-paying'
        })
      );

      render(<App />);

      expect(await screen.findByText('Checklist view')).toBeInTheDocument();

      fireEvent.click(await screen.findByRole('button', { name: 'Restart project' }));

      await waitFor(() =>
        expect(storage.deleteProjectAndSaveWorkspace).toHaveBeenCalledTimes(1)
      );
      const [deletedId, savedWorkspace] =
        storage.deleteProjectAndSaveWorkspace.mock.calls[0];
      expect(deletedId).toBe('app-ws-1');
      expect(savedWorkspace.workspace.applications).toEqual([]);
      expect(savedWorkspace.workspace.people).toEqual([
        { personId: 'p-1', displayName: 'Alice' }
      ]);
      expect(storage.deleteProject).not.toHaveBeenCalled();

      // Successfully returned to route selection
      expect(await screen.findByText('选择申请路线')).toBeInTheDocument();
      expect(screen.queryByText('Checklist view')).not.toBeInTheDocument();

      // Alice is still available in the workspace when picking a route again
      fireEvent.click(screen.getByRole('button', { name: /加拿大 · 学习许可/ }));
      expect(await screen.findByText('选择或创建申请人')).toBeInTheDocument();
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    it('atomic deletion failure keeps the active project visible and displays storage error message', async () => {
      const workspaceData = {
        people: [{ personId: 'p-1', displayName: 'Alice' }],
        relationships: [],
        applications: [
          {
            applicationId: 'app-ws-2',
            applicantPersonId: 'p-1',
            routeId: 'ca-study-permit'
          }
        ]
      };

      storage.loadWorkspace.mockResolvedValue({
        kind: 'current',
        workspace: workspaceData,
        savedWorkspace: {
          id: 'default',
          schemaVersion: 1,
          workspace: workspaceData,
          updatedAt: '2026-09-01T00:00:00.000Z'
        }
      });

      storage.loadProject.mockResolvedValue(
        currentProject({
          ...savedProject,
          id: 'app-ws-2',
          routeId: 'ca-study-permit'
        })
      );

      storage.deleteProjectAndSaveWorkspace.mockRejectedValue(
        new Error('IndexedDB transaction abort')
      );

      render(<App />);

      expect(await screen.findByText('Checklist view')).toBeInTheDocument();
      fireEvent.click(await screen.findByRole('button', { name: 'Restart project' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('无法清除浏览器中的旧项目');
      expect(screen.getByText('Checklist view')).toBeInTheDocument();
      expect(screen.queryByText('选择申请路线')).not.toBeInTheDocument();
    });

    it('cleans saved scroll position using the active project ID rather than defaulting to default', async () => {
      const workspaceData = {
        people: [{ personId: 'p-1', displayName: 'Alice' }],
        relationships: [],
        applications: [
          {
            applicationId: 'app-custom-scroll-99',
            applicantPersonId: 'p-1',
            routeId: 'nz-student-fee-paying'
          }
        ]
      };

      storage.loadWorkspace.mockResolvedValue({
        kind: 'current',
        workspace: workspaceData,
        savedWorkspace: {
          id: 'default',
          schemaVersion: 1,
          workspace: workspaceData,
          updatedAt: '2026-09-01T00:00:00.000Z'
        }
      });

      storage.loadProject.mockResolvedValue(
        currentProject({
          ...savedProject,
          id: 'app-custom-scroll-99',
          routeId: 'nz-student-fee-paying'
        })
      );

      setSavedScrollPosition(300, 'app-custom-scroll-99');
      setSavedScrollPosition(150, 'default');

      render(<App />);

      expect(await screen.findByText('Checklist view')).toBeInTheDocument();
      fireEvent.click(await screen.findByRole('button', { name: 'Restart project' }));

      await waitFor(() =>
        expect(storage.deleteProjectAndSaveWorkspace).toHaveBeenCalledTimes(1)
      );

      expect(getSavedScrollPosition('app-custom-scroll-99')).toBeNull();
      expect(getSavedScrollPosition('default')).toBe(150);

      clearSavedScrollPosition('default');
    });

    it('legacy project restart without workspace application identity still uses deleteProject and leaves workspace untouched', async () => {
      storage.loadWorkspace.mockResolvedValue({
        kind: 'empty',
        workspace: {
          people: [],
          relationships: [],
          applications: []
        }
      });

      storage.loadProject.mockResolvedValue(
        currentProject({
          ...savedProject,
          id: 'default',
          routeId: 'nz-student-fee-paying'
        })
      );

      render(<App />);

      expect(await screen.findByText('Checklist view')).toBeInTheDocument();
      fireEvent.click(await screen.findByRole('button', { name: 'Restart project' }));

      await waitFor(() => expect(storage.deleteProject).toHaveBeenCalledWith('default'));
      expect(storage.deleteProjectAndSaveWorkspace).not.toHaveBeenCalled();
      expect(await screen.findByText('选择申请路线')).toBeInTheDocument();
    });
  });
});
