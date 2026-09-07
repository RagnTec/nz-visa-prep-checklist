import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { CURRENT_SAVED_PROJECT_SCHEMA_VERSION, type SavedProject } from '../src/domain/types';
import { prepareSavedWorkspaceForRead, type SavedWorkspace } from '../src/domain/workspacePersistence';
import { prepareSavedProjectForRead } from '../src/storage/projectMigration';
import { clearSavedSurveyPage, getSavedSurveyPage, setSavedSurveyPage } from '../src/storage/uiSurveyPage';
import { setSavedActiveApplicationId } from '../src/storage/uiActiveApplication';

const storage = vi.hoisted(() => ({
  deleteProject: vi.fn(),
  loadProject: vi.fn(),
  loadProjectById: vi.fn(),
  saveProject: vi.fn(),
  loadWorkspace: vi.fn(),
  saveWorkspace: vi.fn(),
  deleteWorkspace: vi.fn(),
  createProjectAndWorkspace: vi.fn(),
  deleteProjectAndSaveWorkspace: vi.fn(),
  loadPersonFactProfile: vi.fn(),
  savePersonFactProfile: vi.fn(),
  deletePersonFactProfile: vi.fn()
}));

const surveyEvents = vi.hoisted(() => ({
  complete: [] as Array<(sender: { data: Record<string, unknown> }) => void>,
  valueChanged: [] as Array<(
    sender: {
      data: Record<string, unknown>;
      getQuestionByName: (name: string) => unknown;
      visiblePages: Array<{ name: string; questions: Array<{ isVisible: boolean; isRequired: boolean; isEmpty: () => boolean }> }>;
      currentPage: { name: string } | null;
      currentPageNo: number;
    },
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

let currentModelInstance: any = null;

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
      { name: 'course-and-tuition', questions: [{ isVisible: true, isRequired: true, isEmpty: () => true }] },
      { name: 'timing', questions: [] },
      { name: 'funding', questions: [] },
      { name: 'background', questions: [] }
    ];
    visiblePages = [
      { name: 'scope', questions: [] },
      { name: 'course-and-tuition', questions: [{ isVisible: true, isRequired: true, isEmpty: () => true }] },
      { name: 'timing', questions: [] },
      { name: 'funding', questions: [] },
      { name: 'background', questions: [] }
    ];
    _currentPage: { name: string } | null = null;
    get currentPage() {
      return this._currentPage || this.visiblePages[this.currentPageNo] || null;
    }
    set currentPage(page: { name: string } | null) {
      this._currentPage = page;
      const idx = this.visiblePages.findIndex((p) => p.name === page?.name);
      if (idx >= 0) this.currentPageNo = idx;
      surveyEvents.pageChanged.forEach((h) => h(this));
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
      currentModelInstance = this;
      this._currentPage = this.visiblePages[0];
    }
  }
}));

vi.mock('survey-react-ui', () => ({
  Survey: () => <div data-testid="survey-container">Survey Form Mock</div>
}));

describe('Slice U1.1 — Survey Resume Continuity and Context Bar Progress', () => {
  const initialWorkspaceRecord: SavedWorkspace = {
    id: 'default',
    schemaVersion: 1,
    workspace: {
      people: [
        { personId: 'person-alice', displayName: 'Alice Smith' },
        { personId: 'person-bob', displayName: 'Bob Jones' }
      ],
      relationships: [],
      applications: [
        {
          applicationId: 'app-alice-student',
          applicantPersonId: 'person-alice',
          routeId: 'nz-student-fee-paying'
        },
        {
          applicationId: 'app-bob-student',
          applicantPersonId: 'person-bob',
          routeId: 'nz-student-fee-paying'
        }
      ]
    },
    updatedAt: '2026-09-03T10:00:00.000Z'
  };

  const projectAliceIncomplete: SavedProject = {
    id: 'app-alice-student',
    routeId: 'nz-student-fee-paying',
    schemaVersion: CURRENT_SAVED_PROJECT_SCHEMA_VERSION,
    surveyCompleted: false,
    answers: { study: { hasOffer: true } },
    statuses: {},
    updatedAt: '2026-09-03T10:00:00.000Z'
  };

  const projectBobIncomplete: SavedProject = {
    id: 'app-bob-student',
    routeId: 'nz-student-fee-paying',
    schemaVersion: CURRENT_SAVED_PROJECT_SCHEMA_VERSION,
    surveyCompleted: false,
    answers: {},
    statuses: {},
    updatedAt: '2026-09-03T10:00:00.000Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    surveyEvents.complete.length = 0;
    surveyEvents.valueChanged.length = 0;
    surveyEvents.pageChanged.length = 0;
    surveyEvents.validateQuestion.length = 0;

    clearSavedSurveyPage('app-alice-student');
    clearSavedSurveyPage('app-bob-student');
    setSavedActiveApplicationId('app-alice-student');

    storage.saveProject.mockResolvedValue(undefined);
    storage.saveWorkspace.mockResolvedValue(undefined);
    storage.deleteProjectAndSaveWorkspace.mockResolvedValue(undefined);

    storage.loadWorkspace.mockResolvedValue(prepareSavedWorkspaceForRead(initialWorkspaceRecord));

    storage.loadProject.mockImplementation(async (id = 'default') => {
      if (id === 'default' || id === 'app-alice-student') {
        return prepareSavedProjectForRead(projectAliceIncomplete);
      }
      if (id === 'app-bob-student') {
        return prepareSavedProjectForRead(projectBobIncomplete);
      }
      return undefined;
    });

    storage.loadProjectById.mockImplementation(async (id: string) => {
      return storage.loadProject(id);
    });
  });

  it('resumes incomplete survey to saved page name and shows progress in ApplicationContextBar', async () => {
    setSavedSurveyPage('funding', 'app-alice-student');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('banner', { name: '当前申请上下文' })).toBeInTheDocument();
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.getByText('新西兰 · 自费学生签证')).toBeInTheDocument();
      expect(screen.getByText('情况问卷 · 4 / 5')).toBeInTheDocument();
    });

    expect(currentModelInstance?.currentPage?.name).toBe('funding');
  });

  it('page change updates saved page in storage and updates progress line', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('banner', { name: '当前申请上下文' })).toBeInTheDocument();
      expect(screen.getByText('情况问卷 · 2 / 5')).toBeInTheDocument();
    });

    expect(getSavedSurveyPage('app-alice-student')).toBe('course-and-tuition');

    // Simulate survey page flip to page 3 (timing)
    if (currentModelInstance) {
      currentModelInstance.currentPage = currentModelInstance.visiblePages[2];
    }

    await waitFor(() => {
      expect(screen.getByText('情况问卷 · 3 / 5')).toBeInTheDocument();
      expect(getSavedSurveyPage('app-alice-student')).toBe('timing');
    });
  });

  it('brand-new application starts on page 1', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('banner', { name: '当前申请上下文' })).toBeInTheDocument();
    });

    // Navigate to Hub and open Bob's brand-new application
    fireEvent.click(screen.getByRole('button', { name: '返回申请中心' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '申请中心' })).toBeInTheDocument();
    });

    const bobSection = screen.getByText('Bob Jones').closest('.hub-person-section');
    expect(bobSection).toBeInstanceOf(HTMLElement);
    if (!(bobSection instanceof HTMLElement)) throw new Error('Expected HTMLElement');
    const openBobBtn = within(bobSection).getByRole('button', { name: '打开申请' });
    fireEvent.click(openBobBtn);

    await waitFor(() => {
      expect(screen.getByRole('banner', { name: '当前申请上下文' })).toBeInTheDocument();
      expect(screen.getByText('情况问卷 · 1 / 5')).toBeInTheDocument();
    });
  });

  it('clears survey page state on project restart', async () => {
    setSavedSurveyPage('funding', 'app-alice-student');
    setSavedSurveyPage('timing', 'app-bob-student');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('banner', { name: '当前申请上下文' })).toBeInTheDocument();
    });

    // Enter hub and delete active application
    fireEvent.click(screen.getByRole('button', { name: '返回申请中心' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '申请中心' })).toBeInTheDocument();
    });

    const aliceSection = screen.getByText('Alice Smith').closest('.hub-person-section');
    expect(aliceSection).toBeInstanceOf(HTMLElement);
    if (!(aliceSection instanceof HTMLElement)) throw new Error('Expected HTMLElement');
    const aliceStudentCard = within(aliceSection).getByText('新西兰 · 自费学生签证').closest('.hub-application-card');
    expect(aliceStudentCard).toBeInstanceOf(HTMLElement);
    if (!(aliceStudentCard instanceof HTMLElement)) throw new Error('Expected HTMLElement');

    // Click "删除申请" on Alice's student application card
    const deleteBtn = within(aliceStudentCard).getByRole('button', { name: '删除申请' });
    fireEvent.click(deleteBtn);

    // Confirm deletion inside the card
    const confirmBtn = within(aliceStudentCard).getByRole('button', { name: '确认删除' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(getSavedSurveyPage('app-alice-student')).toBeNull();
    });

    // Bob's survey page state is preserved
    expect(getSavedSurveyPage('app-bob-student')).toBe('timing');
  });
});
