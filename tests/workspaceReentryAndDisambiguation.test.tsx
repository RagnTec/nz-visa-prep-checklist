import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { CURRENT_SAVED_PROJECT_SCHEMA_VERSION, type SavedProject } from '../src/domain/types';
import { prepareSavedWorkspaceForRead, type SavedWorkspace } from '../src/domain/workspacePersistence';
import { prepareSavedProjectForRead } from '../src/storage/projectMigration';
import { clearSavedActiveApplicationId, setSavedActiveApplicationId } from '../src/storage/uiActiveApplication';
import { clearSavedSurveyPage, setSavedSurveyPage } from '../src/storage/uiSurveyPage';

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
    showProgressBar = 'off';
    pages = [
      { name: 'scope', questions: [] },
      { name: 'course-and-tuition', questions: [] },
      { name: 'timing', questions: [] },
      { name: 'funding', questions: [] },
      { name: 'background', questions: [] }
    ];
    visiblePages = [
      { name: 'scope', questions: [] },
      { name: 'course-and-tuition', questions: [] },
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

describe('Slice U1.2 — Workspace Re-entry and Application Disambiguation', () => {
  const multiAppWorkspace: SavedWorkspace = {
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
          applicationId: 'app-alice-student-1',
          applicantPersonId: 'person-alice',
          routeId: 'nz-student-fee-paying'
        },
        {
          applicationId: 'app-alice-student-2',
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
    updatedAt: '2026-09-04T10:00:00.000Z'
  };

  const projectAlice1Incomplete: SavedProject = {
    id: 'app-alice-student-1',
    routeId: 'nz-student-fee-paying',
    schemaVersion: CURRENT_SAVED_PROJECT_SCHEMA_VERSION,
    surveyCompleted: false,
    answers: { study: { hasOffer: true } },
    statuses: {},
    updatedAt: '2026-09-04T09:00:00.000Z'
  };

  const projectAlice2Complete: SavedProject = {
    id: 'app-alice-student-2',
    routeId: 'nz-student-fee-paying',
    schemaVersion: CURRENT_SAVED_PROJECT_SCHEMA_VERSION,
    surveyCompleted: true,
    answers: {
      study: { hasOffer: true, tuitionPaid: 'full' },
      funds: { fundingType: 'self' },
      identity: { passportCurrent: true },
      background: { applicantType: 'other_or_unclear', studyRelation: 'unclear' },
      education: { recordContexts: ['completed_qualification'] },
      english: { providerEvidenceStatus: 'available' },
      documents: { originContext: 'other', nonEnglishEvidenceStatus: 'none_known' },
      family: { linkedApplicationContext: 'none' }
    },
    statuses: {
      'identity.passport': 'prepared',
      'study.offer': 'in_progress'
    },
    updatedAt: '2026-09-03T15:30:00.000Z'
  };

  const projectBobIncomplete: SavedProject = {
    id: 'app-bob-student',
    routeId: 'nz-student-fee-paying',
    schemaVersion: CURRENT_SAVED_PROJECT_SCHEMA_VERSION,
    surveyCompleted: false,
    answers: {},
    statuses: {},
    updatedAt: '2026-09-02T08:00:00.000Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    surveyEvents.complete.length = 0;
    surveyEvents.valueChanged.length = 0;
    surveyEvents.pageChanged.length = 0;
    surveyEvents.validateQuestion.length = 0;

    clearSavedActiveApplicationId();
    clearSavedSurveyPage('app-alice-student-1');
    clearSavedSurveyPage('app-alice-student-2');
    clearSavedSurveyPage('app-bob-student');

    storage.saveProject.mockResolvedValue(undefined);
    storage.saveWorkspace.mockResolvedValue(undefined);
    storage.deleteProjectAndSaveWorkspace.mockResolvedValue(undefined);

    storage.loadWorkspace.mockResolvedValue(prepareSavedWorkspaceForRead(multiAppWorkspace));

    storage.loadProject.mockImplementation(async (id = 'default') => {
      if (id === 'app-alice-student-1') return prepareSavedProjectForRead(projectAlice1Incomplete);
      if (id === 'app-alice-student-2') return prepareSavedProjectForRead(projectAlice2Complete);
      if (id === 'app-bob-student') return prepareSavedProjectForRead(projectBobIncomplete);
      return undefined;
    });

    storage.loadProjectById.mockImplementation(async (id: string) => {
      return storage.loadProject(id);
    });
  });

  it('A1: Startup with active incomplete application opens Survey directly on resumed page', async () => {
    setSavedActiveApplicationId('app-alice-student-1');
    setSavedSurveyPage('funding', 'app-alice-student-1');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('banner', { name: '当前申请上下文' })).toBeInTheDocument();
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.getByText('新西兰 · 自费学生签证')).toBeInTheDocument();
      expect(screen.getByText('情况问卷 · 4 / 5')).toBeInTheDocument();
    });

    expect(screen.getByTestId('survey-container')).toBeInTheDocument();

    // Verify stepper segments: 5 steps total, 4th is current
    const stepper = screen.getByRole('list', { name: '问卷进度' });
    expect(stepper).toBeInTheDocument();
    const segments = stepper.querySelectorAll('.context-step-segment');
    expect(segments).toHaveLength(5);
    expect(segments[3]).toHaveClass('step-current');
  });

  it('A1: Startup with active completed application opens Checklist directly', async () => {
    setSavedActiveApplicationId('app-alice-student-2');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('banner', { name: '当前申请上下文' })).toBeInTheDocument();
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.getByText('新西兰 · 自费学生签证')).toBeInTheDocument();
      expect(screen.getByText(/材料清单 ·/)).toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: '你的材料准备清单' })).toBeInTheDocument();
  });

  it('A2: Startup with no active application but existing workspace applications opens Application Hub directly', async () => {
    clearSavedActiveApplicationId();

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '申请中心' })).toBeInTheDocument();
    });

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
  });

  it('A3: Route selection screen with existing workspace data displays "‹ 申请中心" button and navigates to Hub', async () => {
    // Workspace with a person but no applications
    const emptyAppsWorkspace: SavedWorkspace = {
      id: 'default',
      schemaVersion: 1,
      workspace: {
        people: [{ personId: 'person-charlie', displayName: 'Charlie' }],
        relationships: [],
        applications: []
      },
      updatedAt: '2026-09-04T10:00:00.000Z'
    };
    storage.loadWorkspace.mockResolvedValue(prepareSavedWorkspaceForRead(emptyAppsWorkspace));
    clearSavedActiveApplicationId();

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('选择申请路线')).toBeInTheDocument();
    });

    const hubBtn = screen.getByRole('button', { name: '申请中心' });
    expect(hubBtn).toBeInTheDocument();

    fireEvent.click(hubBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '申请中心' })).toBeInTheDocument();
    });
  });

  it('Hub disambiguates same-person same-route applications with progress summary and update timestamp', async () => {
    clearSavedActiveApplicationId();
    setSavedSurveyPage('study', 'app-alice-student-1');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '申请中心' })).toBeInTheDocument();
    });

    const aliceSection = screen.getByText('Alice Smith').closest('.hub-person-section');
    expect(aliceSection).toBeInstanceOf(HTMLElement);
    if (!(aliceSection instanceof HTMLElement)) throw new Error('Expected HTMLElement');

    await waitFor(() => {
      // Both applications should be present under Alice
      const cards = within(aliceSection).getAllByText('新西兰 · 自费学生签证');
      expect(cards).toHaveLength(2);

      // Verify progress metadata exists on the cards
      expect(within(aliceSection).getByText('情况问卷 · 2 / 7')).toBeInTheDocument();
      expect(within(aliceSection).getByText(/材料清单 ·/)).toBeInTheDocument();
      expect(within(aliceSection).getByText(/更新于 09-04/)).toBeInTheDocument();
      expect(within(aliceSection).getByText(/更新于 09-03/)).toBeInTheDocument();
    });

    // Verify internal raw IDs are NOT rendered
    expect(within(aliceSection).queryByText('app-alice-student-1')).not.toBeInTheDocument();
    expect(within(aliceSection).queryByText('app-alice-student-2')).not.toBeInTheDocument();
  });

  it('Hub refresh with savedView="hub" remains in Hub even when activeApplicationId is set', async () => {
    setSavedActiveApplicationId('app-alice-student-1');
    window.localStorage.setItem('nzVisaPrepChecklist.ui.workspaceView', 'hub');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '申请中心' })).toBeInTheDocument();
    });

    // Alice Smith has the active application chip
    expect(screen.getByText('当前申请')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '返回此申请' })).toBeInTheDocument();

    // Verify it stayed in Hub and did NOT redirect to Survey
    expect(screen.queryByTestId('survey-container')).not.toBeInTheDocument();
  });

  it('Survey refresh with savedView="application" restores active application', async () => {
    setSavedActiveApplicationId('app-alice-student-1');
    window.localStorage.setItem('nzVisaPrepChecklist.ui.workspaceView', 'application');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('banner', { name: '当前申请上下文' })).toBeInTheDocument();
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });

    expect(await screen.findByTestId('survey-container')).toBeInTheDocument();
  });

  it('Hub navigation to "‹ 首页" transitions to route selection without deleting data', async () => {
    clearSavedActiveApplicationId();
    window.localStorage.setItem('nzVisaPrepChecklist.ui.workspaceView', 'hub');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '申请中心' })).toBeInTheDocument();
    });

    const homeBtn = screen.getByRole('button', { name: '返回首页' });
    fireEvent.click(homeBtn);

    await waitFor(() => {
      expect(screen.getByText('选择申请路线')).toBeInTheDocument();
    });

    // Ensure deleteProject was NOT called
    expect(storage.deleteProject).not.toHaveBeenCalled();
    expect(storage.deleteWorkspace).not.toHaveBeenCalled();

    // Route selection screen still exposes "申请中心" button
    expect(screen.getByRole('button', { name: '申请中心' })).toBeInTheDocument();
  });

  it('Hub allows creating a new Person and transitions to route selection for that Person', async () => {
    clearSavedActiveApplicationId();
    window.localStorage.setItem('nzVisaPrepChecklist.ui.workspaceView', 'hub');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: '申请中心' })).toBeInTheDocument();
    });

    const addPersonBtn = screen.getByRole('button', { name: '+ 新增申请人' });
    fireEvent.click(addPersonBtn);

    const input = screen.getByPlaceholderText('例如：张三、Alice');
    fireEvent.change(input, { target: { value: 'David Miller' } });

    const submitBtn = screen.getByRole('button', { name: '创建并选择路线' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(storage.saveWorkspace).toHaveBeenCalled();
      expect(screen.getByRole('heading', { name: '选择申请路线' })).toBeInTheDocument();
      expect(screen.getByText('David Miller')).toBeInTheDocument();
    });
  });
});
