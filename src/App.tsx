import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_ROUTE_ID,
  SUPPORTED_ROUTE_OPTIONS,
  getRoutePack,
  isRegisteredRouteId
} from './content/registry';
import { generateChecklist } from './domain/checklist';
import { normalizeSurveyAnswers } from './domain/answers';
import type { RoutePack } from './domain/route';
import {
  CURRENT_SAVED_PROJECT_SCHEMA_VERSION,
  type ChecklistItem,
  type ChecklistRule,
  type ChecklistStatus,
  type OfficialSource,
  type SavedProject
} from './domain/types';
import type { Workspace } from './domain/workspace';
import { addPersonToWorkspace } from './domain/workspace';
import {
  createWorkspaceApplication,
  type ApplicantSelection
} from './domain/workspaceApplicationCreation';
import { deleteWorkspaceApplication } from './domain/workspaceApplicationDeletion';
import {
  type SavedWorkspace,
  type SavedWorkspaceReadResult,
  createSavedWorkspace
} from './domain/workspacePersistence';
import { deleteProject, loadProject, loadWorkspace, saveProject, saveWorkspace } from './storage/db';
import type { SavedProjectReadResult } from './storage/projectMigration';
import { clearSavedScrollPosition } from './storage/uiScroll';
import { clearSavedSurveyPage } from './storage/uiSurveyPage';
import {
  clearSavedActiveApplicationId,
  getSavedActiveApplicationId,
  setSavedActiveApplicationId
} from './storage/uiActiveApplication';
import {
  clearSavedWorkspaceView,
  getSavedWorkspaceView,
  setSavedWorkspaceView
} from './storage/uiWorkspaceView';
import { ApplicantSelectionView } from './components/ApplicantSelectionView';
import { ApplicationContextBar } from './components/ApplicationContextBar';
import { ApplicationHubView } from './components/ApplicationHubView';
import { ChecklistView } from './components/ChecklistView';
import { PersonApplicationRouteView } from './components/PersonApplicationRouteView';
import { PersonProfileView } from './components/PersonProfileView';
import { RetryableSurveyView } from './components/RetryableSurveyView';
import { SurveyErrorBoundary } from './components/SurveyErrorBoundary';
import type { SurveyProgress } from './components/SurveyWorkflowView';
import { TrialDisclosure } from './components/TrialDisclosure';
import { buildApplicationHubReadModel } from './domain/applicationHub';
import { loadWorkspaceApplicationForSwitch } from './domain/workspaceApplicationRuntime';

const storageUnavailableMessage = '无法使用浏览器本地存储。你仍可继续使用，但本次内容可能无法自动保存。';
const restartFailedMessage = '无法清除浏览器中的旧项目。请检查浏览器存储设置后重试。';
const materialProfileMessage = '请补充以下材料背景信息，以生成完整清单。已有答案和清单状态会保留。';
const defaultFooterDisclaimer =
  '本工具不评估签证资格或申请风险，不预测申请结果，不判断哪些信息应披露或省略，也不会替你生成说明信。请以当前官方指引和在线申请要求为准；如需结合个人情况获得移民建议，请咨询持牌移民顾问或依法可提供相关建议人士。';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function generateApplicationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `app-${crypto.randomUUID()}`;
  }
  return `app-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function generatePersonId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `person-${crypto.randomUUID()}`;
  }
  return `person-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function mergeAnswerRecords(
  current: Record<string, unknown>,
  updates: Record<string, unknown>
): Record<string, unknown> {
  const merged = { ...current };
  for (const [key, value] of Object.entries(updates)) {
    merged[key] = isRecord(value) && isRecord(current[key])
      ? mergeAnswerRecords(current[key] as Record<string, unknown>, value)
      : value;
  }
  return merged;
}

function downloadProject(project: SavedProject, fileName: string) {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [pendingRouteId, setPendingRouteId] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>('default');
  const [answers, setAnswers] = useState<Record<string, unknown> | null>(null);
  const [statuses, setStatuses] = useState<Record<string, ChecklistStatus>>({});
  const [surveyCompleted, setSurveyCompleted] = useState<boolean>(false);
  const [surveyProgressSummary, setSurveyProgressSummary] = useState<string | null>(null);
  const [surveyStepProgress, setSurveyStepProgress] = useState<{ currentStep: number; totalSteps: number } | null>(null);
  const [hubProjects, setHubProjects] = useState<Record<string, SavedProject>>({});
  const [compatibilityProject, setCompatibilityProject] = useState<
    Extract<SavedProjectReadResult, { kind: 'future' | 'unknown_route' | 'invalid' }> | null
  >(null);
  const [workspaceReadResult, setWorkspaceReadResult] = useState<SavedWorkspaceReadResult | null>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [applicantErrorMessage, setApplicantErrorMessage] = useState<string | null>(null);
  const [isViewingPersonProfile, setIsViewingPersonProfile] = useState<boolean>(false);
  const [isViewingApplicationHub, setIsViewingApplicationHub] = useState<boolean>(false);
  const [switchingApplicationId, setSwitchingApplicationId] = useState<string | null>(null);
  const [applicationSwitchError, setApplicationSwitchError] = useState<string | null>(null);
  const isSwitchingRef = useRef(false);
  const [creatingForPersonId, setCreatingForPersonId] = useState<string | null>(null);
  const [personRouteCreationError, setPersonRouteCreationError] = useState<string | null>(null);
  const [isCreatingForPerson, setIsCreatingForPerson] = useState<boolean>(false);
  const [deletingApplicationId, setDeletingApplicationId] = useState<string | null>(null);
  const isDeletingRef = useRef(false);
  const [restored, setRestored] = useState(false);
  const [storageMessage, setStorageMessage] = useState<string | null>(null);

  const pendingSave = useRef<Promise<void>>(Promise.resolve());
  const pendingSaveErrorRef = useRef<unknown>(null);
  const persistedProjectBase = useRef<Record<string, unknown>>({});
  const activeProjectIdRef = useRef<string | null>(activeProjectId);
  activeProjectIdRef.current = activeProjectId;
  const statusesRef = useRef(statuses);
  statusesRef.current = statuses;
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const restartActive = useRef(false);
  const restartOperation = useRef<Promise<void> | null>(null);
  const isNewGenerationRef = useRef(false);
  const mounted = useRef(true);
  const [surveyRetryKey, setSurveyRetryKey] = useState<number>(0);

  const queueProjectSave = useCallback((project: SavedProject) => {
    pendingSave.current = pendingSave.current
      .then(() => saveProject(project))
      .then(() => {
        pendingSaveErrorRef.current = null;
      })
      .catch((error) => {
        pendingSaveErrorRef.current = error ?? new Error('Save project failed');
        if (mounted.current) setStorageMessage(storageUnavailableMessage);
      });
  }, []);

  const activeRoutePack: RoutePack | null = useMemo(() => {
    if (!selectedRouteId) return null;
    return getRoutePack(selectedRouteId);
  }, [selectedRouteId]);

  const handleAnswersDraftChange = useCallback(
    (draftAnswers: Record<string, unknown>) => {
      answersRef.current = draftAnswers;
      setAnswers(draftAnswers);

      const currentProjectId = activeProjectIdRef.current;
      if (!restartActive.current && currentProjectId && activeRoutePack) {
        const project: SavedProject = {
          ...persistedProjectBase.current,
          id: currentProjectId,
          routeId: activeRoutePack.id,
          schemaVersion: CURRENT_SAVED_PROJECT_SCHEMA_VERSION,
          surveyCompleted: false,
          answers: draftAnswers,
          statuses: statusesRef.current,
          updatedAt: new Date().toISOString()
        };
        queueProjectSave(project);
      }
    },
    [activeRoutePack, queueProjectSave]
  );

  const handleSurveyComplete = useCallback(
    (completedAnswers: Record<string, unknown>) => {
      if (!activeRoutePack) return;
      isNewGenerationRef.current = true;
      const cleanAnswers = activeRoutePack.cleanStaleAnswers ?? ((a) => a);
      const currentAnswers = answersRef.current;
      const mergedAnswers = cleanAnswers(
        currentAnswers ? mergeAnswerRecords(currentAnswers, completedAnswers) : completedAnswers
      );
      answersRef.current = mergedAnswers;
      setAnswers(mergedAnswers);
      setSurveyCompleted(true);

      const currentProjectId = activeProjectIdRef.current;
      if (!restartActive.current && currentProjectId) {
        const project: SavedProject = {
          ...persistedProjectBase.current,
          id: currentProjectId,
          routeId: activeRoutePack.id,
          schemaVersion: CURRENT_SAVED_PROJECT_SCHEMA_VERSION,
          surveyCompleted: true,
          answers: mergedAnswers,
          statuses: statusesRef.current,
          updatedAt: new Date().toISOString()
        };
        queueProjectSave(project);
      }
    },
    [activeRoutePack, queueProjectSave]
  );

  const handleProgressChange = useCallback((progress: SurveyProgress | null) => {
    if (progress) {
      setSurveyProgressSummary(progress.summary);
      setSurveyStepProgress({
        currentStep: progress.currentStep,
        totalSteps: progress.totalSteps
      });
    } else {
      setSurveyProgressSummary(null);
      setSurveyStepProgress(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    mounted.current = true;

    void (async () => {
      let loadedWorkspaceRecord: SavedWorkspaceReadResult | null = null;
      try {
        loadedWorkspaceRecord = await loadWorkspace('default');
        if (active) {
          setWorkspaceReadResult(loadedWorkspaceRecord);
          if (loadedWorkspaceRecord.kind === 'current' || loadedWorkspaceRecord.kind === 'empty') {
            setActiveWorkspace(loadedWorkspaceRecord.workspace);
          }
        }
      } catch {
        if (active) {
          setWorkspaceReadResult({
            kind: 'invalid',
            errors: ['无法读取本地工作区存储。'],
            rawData: null
          });
        }
      }

      const workspace =
        loadedWorkspaceRecord && (loadedWorkspaceRecord.kind === 'current' || loadedWorkspaceRecord.kind === 'empty')
          ? loadedWorkspaceRecord.workspace
          : null;

      const savedView = getSavedWorkspaceView();
      const savedActiveAppId = getSavedActiveApplicationId();
      const workspaceApps = workspace?.applications ?? [];
      const hasWorkspaceContent = Boolean(
        workspace && (workspace.people.length > 0 || workspace.applications.length > 0)
      );
      const matchingActiveApp = savedActiveAppId
        ? workspaceApps.find((a) => a.applicationId === savedActiveAppId)
        : null;

      let targetAppIdToLoad: string | null = null;
      if (matchingActiveApp) {
        targetAppIdToLoad = matchingActiveApp.applicationId;
      }

      // Explicit view resolution based on savedView
      if (savedView === 'hub' && hasWorkspaceContent) {
        if (targetAppIdToLoad) {
          setActiveProjectId(targetAppIdToLoad);
          activeProjectIdRef.current = targetAppIdToLoad;
        }
        setIsViewingApplicationHub(true);
        if (active) {
          setRestored(true);
        }
        return;
      }

      if (savedView === 'route-selection' && hasWorkspaceContent) {
        if (targetAppIdToLoad) {
          setActiveProjectId(targetAppIdToLoad);
          activeProjectIdRef.current = targetAppIdToLoad;
        }
        setIsViewingApplicationHub(false);
        setSelectedRouteId(null);
        if (active) {
          setRestored(true);
        }
        return;
      }

      let projectLoadedSuccessfully = false;

      if (targetAppIdToLoad) {
        try {
          const loadedProject = await loadProject(targetAppIdToLoad);
          if (active && loadedProject) {
            if (loadedProject.kind === 'current') {
              const routeId = loadedProject.project.routeId ?? DEFAULT_ROUTE_ID;
              if (isRegisteredRouteId(routeId)) {
                const pack = getRoutePack(routeId);
                const cleanAnswers = pack.cleanStaleAnswers ?? ((a) => a);
                persistedProjectBase.current = loadedProject.project;
                setActiveProjectId(loadedProject.project.id);
                activeProjectIdRef.current = loadedProject.project.id;
                setSavedActiveApplicationId(loadedProject.project.id);
                setSavedWorkspaceView('application');
                const normalizedAnswers = cleanAnswers(
                  normalizeSurveyAnswers(loadedProject.project.answers)
                );
                const isCompleted = typeof loadedProject.project.surveyCompleted === 'boolean'
                  ? loadedProject.project.surveyCompleted
                  : Object.keys(normalizedAnswers).length > 0;
                setSelectedRouteId(routeId);
                setAnswers(normalizedAnswers);
                setStatuses(loadedProject.project.statuses);
                setSurveyCompleted(isCompleted);
                setIsViewingApplicationHub(false);
                projectLoadedSuccessfully = true;
              }
            } else {
              setCompatibilityProject(loadedProject);
              projectLoadedSuccessfully = true;
            }
          }
        } catch {
          if (active) setStorageMessage(storageUnavailableMessage);
        }
      }

      // If no valid active application was loaded above, try legacy/fallback 'default'
      if (!projectLoadedSuccessfully && active) {
        try {
          const legacyProject = await loadProject('default');
          if (legacyProject && legacyProject.kind === 'current') {
            const routeId = legacyProject.project.routeId ?? DEFAULT_ROUTE_ID;
            if (isRegisteredRouteId(routeId)) {
              const pack = getRoutePack(routeId);
              const cleanAnswers = pack.cleanStaleAnswers ?? ((a) => a);
              persistedProjectBase.current = legacyProject.project;
              setActiveProjectId(legacyProject.project.id);
              activeProjectIdRef.current = legacyProject.project.id;
              if (legacyProject.project.id !== 'default') {
                setSavedActiveApplicationId(legacyProject.project.id);
                setSavedWorkspaceView('application');
              }
              const normalizedAnswers = cleanAnswers(
                normalizeSurveyAnswers(legacyProject.project.answers)
              );
              const isCompleted = typeof legacyProject.project.surveyCompleted === 'boolean'
                ? legacyProject.project.surveyCompleted
                : Object.keys(normalizedAnswers).length > 0;
              setSelectedRouteId(routeId);
              setAnswers(normalizedAnswers);
              setStatuses(legacyProject.project.statuses);
              setSurveyCompleted(isCompleted);
              setIsViewingApplicationHub(false);
              projectLoadedSuccessfully = true;
            }
          } else if (legacyProject && (legacyProject.kind === 'future' || legacyProject.kind === 'unknown_route' || legacyProject.kind === 'invalid')) {
            setCompatibilityProject(legacyProject);
            projectLoadedSuccessfully = true;
          }
        } catch {
          if (active) setStorageMessage(storageUnavailableMessage);
        }
      }

      if (!projectLoadedSuccessfully && active) {
        clearSavedActiveApplicationId();
        setActiveProjectId(null);
        activeProjectIdRef.current = null;
        setSelectedRouteId(null);
        setAnswers(null);
        setStatuses({});
        setSurveyCompleted(false);

        if (workspaceApps.length > 0) {
          // A2: Workspace contains applications, open Hub directly
          setIsViewingApplicationHub(true);
          setSavedWorkspaceView('hub');
        } else {
          // A3 or A4: Route selection
          setIsViewingApplicationHub(false);
          setSavedWorkspaceView('route-selection');
        }
      }

      if (active) {
        setRestored(true);
      }
    })();

    return () => {
      active = false;
      mounted.current = false;
    };
  }, []);



  const materialProfileIncomplete = useMemo(() => {
    if (!activeRoutePack || !answers || !surveyCompleted) return false;
    const effects = activeRoutePack.evaluateEffects(answers);
    const derived = isRecord(effects.answersForChecklist._effects)
      ? (effects.answersForChecklist._effects as Record<string, unknown>)
      : null;
    return derived?.materialProfileIncomplete === true;
  }, [activeRoutePack, answers, surveyCompleted]);

  const checklistAvailable = useMemo(() => {
    if (!activeRoutePack || !answers || !surveyCompleted) return false;
    return !materialProfileIncomplete;
  }, [activeRoutePack, answers, surveyCompleted, materialProfileIncomplete]);

  const items = useMemo(() => {
    if (!activeRoutePack || !answers || !checklistAvailable) return [];
    return generateChecklist(
      activeRoutePack.evaluateEffects(normalizeSurveyAnswers(answers), {
        checklistGenerated: true
      }).answersForChecklist,
      activeRoutePack.items as ChecklistItem[],
      activeRoutePack.rules as ChecklistRule[]
    );
  }, [activeRoutePack, answers, checklistAvailable]);

  useEffect(() => {
    const currentProjectId = activeProjectIdRef.current;
    if (
      !activeRoutePack
      || !answers
      || !checklistAvailable
      || compatibilityProject
      || restartActive.current
      || !currentProjectId
    ) return;
    const project: SavedProject = {
      ...persistedProjectBase.current,
      id: currentProjectId,
      routeId: activeRoutePack.id,
      schemaVersion: CURRENT_SAVED_PROJECT_SCHEMA_VERSION,
      surveyCompleted: true,
      answers,
      statuses,
      updatedAt: new Date().toISOString()
    };
    queueProjectSave(project);
  }, [activeRoutePack, answers, checklistAvailable, compatibilityProject, queueProjectSave, statuses]);

  function selectRoute(routeId: string) {
    setPendingRouteId(routeId);
    setApplicantErrorMessage(null);
  }

  async function handleConfirmApplicant(applicant: ApplicantSelection) {
    if (!pendingRouteId) return;

    if (!workspaceReadResult || (workspaceReadResult.kind !== 'current' && workspaceReadResult.kind !== 'empty')) {
      setApplicantErrorMessage('无法读取本地工作区，无法创建新申请。');
      return;
    }

    const currentWorkspace = workspaceReadResult.workspace;
    const applicationId = generateApplicationId();

    try {
      const creationResult = await createWorkspaceApplication(currentWorkspace, {
        applicationId,
        routeId: pendingRouteId,
        applicant
      });

      if (!creationResult.success) {
        setApplicantErrorMessage(creationResult.error);
        return;
      }

      persistedProjectBase.current = creationResult.project;
      setActiveProjectId(creationResult.project.id);
      activeProjectIdRef.current = creationResult.project.id;
      setSavedActiveApplicationId(creationResult.project.id);
      setSavedWorkspaceView('application');
      setActiveWorkspace(creationResult.workspace);
      setWorkspaceReadResult({
        kind: 'current',
        workspace: creationResult.workspace,
        savedWorkspace: creationResult.savedWorkspace
      });
      setSelectedRouteId(pendingRouteId);
      setAnswers({});
      setStatuses({});
      setSurveyCompleted(false);
      setPendingRouteId(null);
      setApplicantErrorMessage(null);
      isNewGenerationRef.current = false;
      setSurveyProgressSummary(null);
      setSurveyStepProgress(null);
    } catch {
      setApplicantErrorMessage('保存申请与工作区失败，请检查浏览器存储设置后重试。');
    }
  }

  function restartProject(): Promise<void> {
    if (restartOperation.current) return restartOperation.current;

    const deletingProjectId = activeProjectIdRef.current;
    if (!deletingProjectId) return Promise.resolve();

    restartActive.current = true;
    const queuedSaves = pendingSave.current;

    const operation = (async () => {
      await queuedSaves;

      let nextWorkspaceState: {
        workspace: Workspace;
        savedWorkspace: SavedWorkspace;
      } | null = null;

      const currentWorkspace =
        workspaceReadResult?.kind === 'current'
          ? workspaceReadResult.workspace
          : null;
      const isWorkspaceBacked =
        currentWorkspace !== null &&
        currentWorkspace.applications.some(
          (app) => app.applicationId === deletingProjectId
        );

      try {
        if (isWorkspaceBacked && currentWorkspace) {
          const deletionResult = await deleteWorkspaceApplication(
            currentWorkspace,
            deletingProjectId
          );
          if (!deletionResult.success) {
            if (mounted.current) setStorageMessage(restartFailedMessage);
            return;
          }
          nextWorkspaceState = {
            workspace: deletionResult.workspace,
            savedWorkspace: deletionResult.savedWorkspace
          };
        } else {
          await deleteProject(deletingProjectId);
        }
      } catch {
        if (mounted.current) setStorageMessage(restartFailedMessage);
        return;
      }

      if (mounted.current) {
        if (nextWorkspaceState) {
          setActiveWorkspace(nextWorkspaceState.workspace);
          setWorkspaceReadResult({
            kind: 'current',
            workspace: nextWorkspaceState.workspace,
            savedWorkspace: nextWorkspaceState.savedWorkspace
          });
        }
        persistedProjectBase.current = {};
        setActiveProjectId('default');
        activeProjectIdRef.current = 'default';
        setAnswers(null);
        setStatuses({});
        setSelectedRouteId(null);
        setPendingRouteId(null);
        setSurveyCompleted(false);
        setCompatibilityProject(null);
        setIsViewingPersonProfile(false);
        setIsViewingApplicationHub(false);
        setSwitchingApplicationId(null);
        setApplicationSwitchError(null);
        setCreatingForPersonId(null);
        setPersonRouteCreationError(null);
        setIsCreatingForPerson(false);
        setDeletingApplicationId(null);
        pendingSaveErrorRef.current = null;
        setStorageMessage(null);
        setApplicantErrorMessage(null);
        clearSavedScrollPosition(deletingProjectId);
        clearSavedSurveyPage(deletingProjectId);
        clearSavedActiveApplicationId();
        clearSavedWorkspaceView();
        isNewGenerationRef.current = false;
        setSurveyProgressSummary(null);
        setSurveyStepProgress(null);
      }
    })().finally(() => {
      restartActive.current = false;
      restartOperation.current = null;
    });

    restartOperation.current = operation;
    return operation;
  }

  function exportProject() {
    if (compatibilityProject) {
      const fileName = activeRoutePack?.defaultExportFileName ?? 'visa-project-backup.json';
      downloadProject(compatibilityProject.project, fileName);
      return;
    }
    const currentProjectId = activeProjectIdRef.current;
    if (!activeRoutePack || !answers || !checklistAvailable || !currentProjectId) return;
    const project: SavedProject = {
      ...persistedProjectBase.current,
      id: currentProjectId,
      routeId: activeRoutePack.id,
      schemaVersion: CURRENT_SAVED_PROJECT_SCHEMA_VERSION,
      surveyCompleted: true,
      answers,
      statuses,
      updatedAt: new Date().toISOString()
    };
    downloadProject(project, activeRoutePack.defaultExportFileName);
  }

  const effectiveWorkspace: Workspace | null =
    workspaceReadResult && (workspaceReadResult.kind === 'current' || workspaceReadResult.kind === 'empty')
      ? workspaceReadResult.workspace
      : activeWorkspace;

  const currentAppIdentity = effectiveWorkspace?.applications.find(
    (app) => app.applicationId === activeProjectId
  );

  const currentPerson = currentAppIdentity && effectiveWorkspace
    ? effectiveWorkspace.people.find((p) => p.personId === currentAppIdentity.applicantPersonId) ?? null
    : null;

  const handleOpenApplication = useCallback(async (targetApplicationId: string) => {
    if (!targetApplicationId || typeof targetApplicationId !== 'string') return;
    const trimmedTargetAppId = targetApplicationId.trim();
    if (!trimmedTargetAppId) return;

    if (trimmedTargetAppId === activeProjectIdRef.current) {
      setIsViewingApplicationHub(false);
      setApplicationSwitchError(null);
      return;
    }

    if (isSwitchingRef.current) return;
    isSwitchingRef.current = true;
    setSwitchingApplicationId(trimmedTargetAppId);
    setApplicationSwitchError(null);

    try {
      try {
        await pendingSave.current;
      } catch {
        setApplicationSwitchError('保存当前申请失败，已取消切换以防止数据丢失。');
        return;
      }

      if (pendingSaveErrorRef.current) {
        setApplicationSwitchError('保存当前申请失败，已取消切换以防止数据丢失。');
        return;
      }

      if (!effectiveWorkspace) {
        setApplicationSwitchError('未找到有效的工作区信息，无法切换申请。');
        return;
      }

      const result = await loadWorkspaceApplicationForSwitch({
        workspace: effectiveWorkspace,
        targetApplicationId: trimmedTargetAppId
      });

      if (result.kind !== 'success') {
        if (result.kind === 'storage_error') {
          setApplicationSwitchError(storageUnavailableMessage);
        } else {
          setApplicationSwitchError('无法打开该申请，本地申请记录可能不完整或与当前版本不兼容。');
        }
        return;
      }

      const targetProject = result.project;
      const targetRouteId = result.routeId;
      const pack = getRoutePack(targetRouteId);
      const cleanAnswers = pack.cleanStaleAnswers ?? ((a) => a);
      const normalizedAnswers = cleanAnswers(
        normalizeSurveyAnswers(targetProject.answers)
      );
      const isCompleted = typeof targetProject.surveyCompleted === 'boolean'
        ? targetProject.surveyCompleted
        : Object.keys(normalizedAnswers).length > 0;

      persistedProjectBase.current = targetProject;
      activeProjectIdRef.current = targetProject.id;
      setActiveProjectId(targetProject.id);
      setSavedActiveApplicationId(targetProject.id);
      setSavedWorkspaceView('application');
      setSelectedRouteId(targetRouteId);
      answersRef.current = normalizedAnswers;
      setAnswers(normalizedAnswers);
      statusesRef.current = targetProject.statuses;
      setStatuses(targetProject.statuses);
      setSurveyCompleted(isCompleted);

      isNewGenerationRef.current = false;
      pendingSaveErrorRef.current = null;

      setIsViewingApplicationHub(false);
      setIsViewingPersonProfile(false);
      setApplicationSwitchError(null);
    } catch {
      setApplicationSwitchError('无法打开该申请，发生未知错误。');
    } finally {
      isSwitchingRef.current = false;
      setSwitchingApplicationId(null);
    }
  }, [effectiveWorkspace]);

  const handleStartCreateApplicationForPerson = useCallback((personId: string) => {
    if (!personId || typeof personId !== 'string') return;
    const trimmedPersonId = personId.trim();
    if (!trimmedPersonId) return;

    if (!effectiveWorkspace) {
      setApplicationSwitchError('未找到有效的工作区信息。');
      return;
    }

    const matchingPeople = effectiveWorkspace.people.filter(
      (p) => p.personId === trimmedPersonId && p.personId === p.personId.trim()
    );

    if (matchingPeople.length !== 1) {
      setApplicationSwitchError('未找到指定的申请人信息或该申请人记录存在歧义。');
      return;
    }

    setCreatingForPersonId(matchingPeople[0].personId);
    setPersonRouteCreationError(null);
    setApplicationSwitchError(null);
  }, [effectiveWorkspace]);

  const handleCreatePersonFromHub = useCallback(async (displayName: string) => {
    if (!displayName || typeof displayName !== 'string') return;
    const trimmedName = displayName.trim();
    if (!trimmedName) return;

    if (!effectiveWorkspace) {
      setApplicationSwitchError('未找到有效的工作区信息，无法创建申请人。');
      return;
    }

    setIsCreatingForPerson(true);
    setApplicationSwitchError(null);

    try {
      const personId = generatePersonId();
      const addResult = addPersonToWorkspace(effectiveWorkspace, {
        personId,
        displayName: trimmedName
      });

      if (!addResult.success) {
        setApplicationSwitchError(addResult.error);
        return;
      }

      const updatedWorkspace = addResult.workspace;
      const now = new Date().toISOString();
      const savedWorkspace = createSavedWorkspace(updatedWorkspace, {
        id: 'default',
        updatedAt: now
      });

      await saveWorkspace(savedWorkspace);

      setActiveWorkspace(updatedWorkspace);
      setWorkspaceReadResult({
        kind: 'current',
        workspace: updatedWorkspace,
        savedWorkspace
      });

      setCreatingForPersonId(personId);
      setPersonRouteCreationError(null);
    } catch {
      setApplicationSwitchError('保存申请人失败，请检查浏览器存储设置后重试。');
    } finally {
      setIsCreatingForPerson(false);
    }
  }, [effectiveWorkspace]);

  const handleSelectRouteForPerson = useCallback(async (routeId: string) => {
    if (!routeId || typeof routeId !== 'string') return;
    const trimmedRouteId = routeId.trim();
    if (!trimmedRouteId) return;

    if (!creatingForPersonId) return;

    if (isCreatingForPerson) return;
    setIsCreatingForPerson(true);
    setPersonRouteCreationError(null);

    try {
      try {
        await pendingSave.current;
      } catch {
        setPersonRouteCreationError('保存当前申请失败，已取消创建以防止数据丢失。');
        return;
      }

      if (pendingSaveErrorRef.current) {
        setPersonRouteCreationError('保存当前申请失败，已取消创建以防止数据丢失。');
        return;
      }

      if (!effectiveWorkspace) {
        setPersonRouteCreationError('未找到有效的工作区信息，无法创建新申请。');
        return;
      }

      const matchingPeople = effectiveWorkspace.people.filter(
        (p) => p.personId === creatingForPersonId && p.personId === p.personId.trim()
      );

      if (matchingPeople.length !== 1) {
        setPersonRouteCreationError('未找到指定的申请人信息或该申请人记录存在歧义。');
        return;
      }

      const targetPerson = matchingPeople[0];
      const applicationId = generateApplicationId();

      const creationResult = await createWorkspaceApplication(effectiveWorkspace, {
        applicationId,
        routeId: trimmedRouteId,
        applicant: { kind: 'existing', personId: targetPerson.personId }
      });

      if (!creationResult.success) {
        setPersonRouteCreationError('创建新申请失败，本地数据未更新。');
        return;
      }

      persistedProjectBase.current = creationResult.project;
      setActiveProjectId(creationResult.project.id);
      activeProjectIdRef.current = creationResult.project.id;
      setSavedActiveApplicationId(creationResult.project.id);
      setSavedWorkspaceView('application');
      setActiveWorkspace(creationResult.workspace);
      setWorkspaceReadResult({
        kind: 'current',
        workspace: creationResult.workspace,
        savedWorkspace: creationResult.savedWorkspace
      });
      setSelectedRouteId(routeId);
      answersRef.current = {};
      setAnswers({});
      statusesRef.current = {};
      setStatuses({});
      setSurveyCompleted(false);
      isNewGenerationRef.current = false;
      pendingSaveErrorRef.current = null;

      setCreatingForPersonId(null);
      setPersonRouteCreationError(null);
      setIsViewingApplicationHub(false);
      setIsViewingPersonProfile(false);
      setSurveyProgressSummary(null);
      setSurveyStepProgress(null);
    } catch {
      setPersonRouteCreationError('创建新申请失败，请检查浏览器存储设置后重试。');
    } finally {
      setIsCreatingForPerson(false);
    }
  }, [creatingForPersonId, effectiveWorkspace, isCreatingForPerson]);

  const handleDeleteApplication = useCallback(async (targetApplicationId: string) => {
    if (!targetApplicationId || typeof targetApplicationId !== 'string') return;
    const trimmedTargetId = targetApplicationId.trim();
    if (!trimmedTargetId) return;

    if (isDeletingRef.current || isSwitchingRef.current || isCreatingForPerson) return;
    isDeletingRef.current = true;
    setDeletingApplicationId(trimmedTargetId);
    setApplicationSwitchError(null);

    const isDeletingActive = trimmedTargetId === activeProjectIdRef.current;

    try {
      if (isDeletingActive) {
        try {
          await pendingSave.current;
        } catch {
          setApplicationSwitchError('保存当前申请失败，已取消删除以防止数据丢失。');
          return;
        }

        if (pendingSaveErrorRef.current) {
          setApplicationSwitchError('保存当前申请失败，已取消删除以防止数据丢失。');
          return;
        }
      }

      if (!effectiveWorkspace) {
        setApplicationSwitchError('未找到有效的工作区信息，无法删除申请。');
        return;
      }

      const matchingApps = effectiveWorkspace.applications.filter(
        (app) => app.applicationId === trimmedTargetId && app.applicationId === app.applicationId.trim()
      );

      if (matchingApps.length !== 1) {
        setApplicationSwitchError('未找到指定的申请记录或该记录存在歧义。');
        return;
      }

      const deletionResult = await deleteWorkspaceApplication(effectiveWorkspace, trimmedTargetId);

      if (!deletionResult.success) {
        setApplicationSwitchError('删除申请失败，本地数据未发生变更。');
        return;
      }

      setActiveWorkspace(deletionResult.workspace);
      setWorkspaceReadResult({
        kind: 'current',
        workspace: deletionResult.workspace,
        savedWorkspace: deletionResult.savedWorkspace
      });

      clearSavedScrollPosition(trimmedTargetId);
      clearSavedSurveyPage(trimmedTargetId);

      if (isDeletingActive) {
        persistedProjectBase.current = {};
        activeProjectIdRef.current = null;
        setActiveProjectId(null);
        setSelectedRouteId(null);
        answersRef.current = null;
        setAnswers(null);
        statusesRef.current = {};
        setStatuses({});
        setSurveyCompleted(false);
        setCompatibilityProject(null);
        isNewGenerationRef.current = false;
        pendingSaveErrorRef.current = null;
        clearSavedActiveApplicationId();
        setIsViewingApplicationHub(true);
        setSavedWorkspaceView('hub');
        setSurveyProgressSummary(null);
        setSurveyStepProgress(null);
      }

      setApplicationSwitchError(null);
    } catch {
      setApplicationSwitchError('删除申请失败，本地数据未发生变更。');
    } finally {
      isDeletingRef.current = false;
      setDeletingApplicationId(null);
    }
  }, [effectiveWorkspace, isCreatingForPerson]);

  useEffect(() => {
    if (!isViewingApplicationHub || !effectiveWorkspace) return;
    let active = true;
    const apps = effectiveWorkspace.applications;
    if (apps.length === 0) return;

    void (async () => {
      try {
        const loaded = await Promise.all(
          apps.map(async (app) => {
            const currentProj = persistedProjectBase.current as SavedProject | undefined;
            if (app.applicationId === activeProjectIdRef.current && currentProj && currentProj.id === app.applicationId) {
              return currentProj;
            }
            const res = await loadProject(app.applicationId);
            if (res && res.kind === 'current') return res.project;
            return null;
          })
        );
        if (active) {
          const map: Record<string, SavedProject> = {};
          loaded.forEach((proj) => {
            if (proj && proj.id) {
              map[proj.id] = proj;
            }
          });
          setHubProjects(map);
        }
      } catch {}
    })();

    return () => {
      active = false;
    };
  }, [isViewingApplicationHub, effectiveWorkspace]);

  if (!restored) return <p className="loading">正在读取本地项目…</p>;

  if (compatibilityProject) {
    let message: string;
    if (compatibilityProject.kind === 'future') {
      message = `此本地项目由较新版本创建（版本 ${compatibilityProject.schemaVersion}），当前版本最多支持版本 ${CURRENT_SAVED_PROJECT_SCHEMA_VERSION}。为避免覆盖数据，本项目已以只读方式打开。`;
    } else if (compatibilityProject.kind === 'unknown_route') {
      message = `此本地项目属于当前未支持的路线（路线 ID：“${compatibilityProject.routeId}”）。为避免覆盖数据，本项目已以只读方式打开。`;
    } else {
      message = '此本地项目的版本或路线信息无效。为避免覆盖数据，本项目已以只读方式打开。';
    }
    return (
      <main className="app-shell">
        <TrialDisclosure />
        <section className="compatibility-card">
          <h1>本地项目只读保护</h1>
          <p>{message}</p>
          {storageMessage ? <p role="alert">{storageMessage}</p> : null}
          <div className="actions">
            <button type="button" onClick={exportProject}>原样导出备份</button>
            <button type="button" className="secondary" onClick={restartProject}>删除并重新开始</button>
          </div>
        </section>
      </main>
    );
  }

  const creatingPerson = creatingForPersonId && effectiveWorkspace
    ? effectiveWorkspace.people.find((p) => p.personId === creatingForPersonId) ?? null
    : null;

  if (creatingPerson && effectiveWorkspace) {
    return (
      <main className="app-shell">
        <TrialDisclosure />
        <PersonApplicationRouteView
          person={creatingPerson}
          onSelectRoute={handleSelectRouteForPerson}
          onBack={() => {
            setCreatingForPersonId(null);
            setPersonRouteCreationError(null);
            setIsViewingApplicationHub(true);
          }}
          isCreating={isCreatingForPerson}
          errorMessage={personRouteCreationError}
        />
        <footer>{defaultFooterDisclaimer}</footer>
      </main>
    );
  }

  if (isViewingPersonProfile && currentPerson && effectiveWorkspace) {
    return (
      <main className="app-shell">
        <TrialDisclosure />
        <PersonProfileView
          workspace={effectiveWorkspace}
          person={currentPerson}
          onBack={() => setIsViewingPersonProfile(false)}
        />
        <footer>{defaultFooterDisclaimer}</footer>
      </main>
    );
  }

  if (isViewingApplicationHub && effectiveWorkspace) {
    const hubModel = buildApplicationHubReadModel({
      workspace: effectiveWorkspace,
      activeApplicationId: activeProjectId ?? undefined,
      projects: hubProjects
    });

    return (
      <main className="app-shell">
        <TrialDisclosure />
        <ApplicationHubView
          model={hubModel}
          onBack={() => {
            setIsViewingApplicationHub(false);
            setApplicationSwitchError(null);
            setCreatingForPersonId(null);
            setPersonRouteCreationError(null);
            if (activeProjectId) {
              setSavedWorkspaceView('application');
            } else {
              setSavedWorkspaceView('route-selection');
            }
          }}
          onReturnToActiveApplication={() => {
            setIsViewingApplicationHub(false);
            setApplicationSwitchError(null);
            setCreatingForPersonId(null);
            setPersonRouteCreationError(null);
            setSavedWorkspaceView('application');
          }}
          onNavigateHome={() => {
            setIsViewingApplicationHub(false);
            setSelectedRouteId(null);
            setPendingRouteId(null);
            setApplicationSwitchError(null);
            setCreatingForPersonId(null);
            setPersonRouteCreationError(null);
            setSavedWorkspaceView('route-selection');
          }}
          onOpenApplication={handleOpenApplication}
          onCreateApplicationForPerson={handleStartCreateApplicationForPerson}
          onCreatePerson={handleCreatePersonFromHub}
          onDeleteApplication={handleDeleteApplication}
          openingApplicationId={switchingApplicationId}
          deletingApplicationId={deletingApplicationId}
          isCreatingPerson={isCreatingForPerson}
          errorMessage={applicationSwitchError}
        />
        <footer>{defaultFooterDisclaimer}</footer>
      </main>
    );
  }

  if (!selectedRouteId || !activeRoutePack) {
    if (pendingRouteId) {
      const routeOption = SUPPORTED_ROUTE_OPTIONS.find((o) => o.routeId === pendingRouteId);
      return (
        <main className="app-shell">
          <TrialDisclosure />
          <ApplicantSelectionView
            routeLabel={routeOption?.label ?? pendingRouteId}
            routeDescription={routeOption?.description}
            workspaceReadResult={workspaceReadResult}
            onConfirmApplicant={handleConfirmApplicant}
            onBack={() => {
              setPendingRouteId(null);
              setApplicantErrorMessage(null);
            }}
            errorMessage={applicantErrorMessage}
          />
          <footer>{defaultFooterDisclaimer}</footer>
        </main>
      );
    }

    const hasExistingWorkspaceData = Boolean(
      effectiveWorkspace &&
      (effectiveWorkspace.people.length > 0 || effectiveWorkspace.applications.length > 0)
    );

    return (
      <main className="app-shell">
        <TrialDisclosure />
        <section className="hero">
          <p className="eyebrow">本地优先 · 官方来源可追溯</p>
          <h1>签证材料准备清单</h1>
          <p>请选择你计划准备的签证或许可类型。回答少量关键问题，生成针对你个人情况的材料准备任务。你的答案只保存在当前浏览器。</p>
        </section>
        <section className="route-choice-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '.5rem' }}>
            <h2 style={{ margin: 0 }}>选择申请路线</h2>
            {hasExistingWorkspaceData ? (
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setIsViewingApplicationHub(true);
                  setSavedWorkspaceView('hub');
                }}
              >
                申请中心
              </button>
            ) : null}
          </div>
          {storageMessage ? <p role="alert">{storageMessage}</p> : null}
          <div className="route-options">
            {SUPPORTED_ROUTE_OPTIONS.map((option) => (
              <button
                key={option.routeId}
                type="button"
                className="route-option-btn"
                onClick={() => selectRoute(option.routeId)}
              >
                <span className="route-option-title">{option.label}</span>
                <span className="route-option-desc">{option.description}</span>
              </button>
            ))}
          </div>
        </section>
        <footer>{defaultFooterDisclaimer}</footer>
      </main>
    );
  }

  const activeRouteOption = SUPPORTED_ROUTE_OPTIONS.find((o) => o.routeId === selectedRouteId);
  const currentRouteLabel = activeRouteOption?.label ?? activeRoutePack.title ?? selectedRouteId ?? '';

  if (checklistAvailable) {
    const checklistCompleteCount = items.filter((item) =>
      ['prepared', 'not_applicable'].includes(statuses[item.id] ?? 'not_started')
    ).length;
    const checklistProgressSummary = `材料清单 · ${checklistCompleteCount} / ${items.length} 已处理`;

    return (
      <>
        {currentPerson ? (
          <ApplicationContextBar
            applicantDisplayName={currentPerson.displayName}
            routeLabel={currentRouteLabel}
            onViewHub={() => {
              setIsViewingApplicationHub(true);
              setSavedWorkspaceView('hub');
            }}
            onViewProfile={() => setIsViewingPersonProfile(true)}
            progressSummary={checklistProgressSummary}
          />
        ) : null}
        {storageMessage ? <p role="alert">{storageMessage}</p> : null}
        <ChecklistView
          items={items}
          statuses={statuses}
          sources={activeRoutePack.sources as OfficialSource[]}
          onStatusChange={(id, status) => setStatuses((current) => ({ ...current, [id]: status }))}
          onRestart={restartProject}
          onExport={exportProject}
          isNewGeneration={isNewGenerationRef.current}
          projectId={activeProjectId ?? undefined}
          eyebrow={activeRoutePack.eyebrow}
          authorityName={activeRoutePack.authorityName}
          disclaimerFooter={activeRoutePack.disclaimerFooter}
          applicantDisplayName={currentPerson ? undefined : undefined}
          onViewProfile={undefined}
          onViewHub={undefined}
        />
      </>
    );
  }

  return (
    <>
      {currentPerson ? (
        <ApplicationContextBar
          applicantDisplayName={currentPerson.displayName}
          routeLabel={currentRouteLabel}
          onViewHub={() => {
            setIsViewingApplicationHub(true);
            setSavedWorkspaceView('hub');
          }}
          onViewProfile={() => setIsViewingPersonProfile(true)}
          progressSummary={surveyProgressSummary}
          surveyStepProgress={surveyStepProgress}
        />
      ) : null}
      <main className="app-shell">
        <TrialDisclosure />
        <section className="hero">
          <p className="eyebrow">{activeRoutePack.eyebrow ?? '本地优先 · 官方来源可追溯'}</p>
          <h1>{activeRoutePack.title}</h1>
          <p>{activeRoutePack.description ?? '回答少量关键问题，生成与你情况相关的准备任务。你的答案只保存在当前浏览器。'}</p>
        </section>
        <section className="survey-card">
          {storageMessage ? <p role="alert">{storageMessage}</p> : null}
          {materialProfileIncomplete ? <p role="status">{materialProfileMessage}</p> : null}
          <SurveyErrorBoundary
            key={`${surveyRetryKey}:${activeProjectId ?? selectedRouteId ?? 'survey'}`}
            onRetry={() => setSurveyRetryKey((k) => k + 1)}
          >
            <RetryableSurveyView
              retryKey={surveyRetryKey}
              activeRoutePack={activeRoutePack}
              activeProjectId={activeProjectId}
              answers={answers}
              surveyCompleted={surveyCompleted}
              materialProfileIncomplete={materialProfileIncomplete}
              onAnswersChange={handleAnswersDraftChange}
              onSurveyComplete={handleSurveyComplete}
              onProgressChange={handleProgressChange}
            />
          </SurveyErrorBoundary>
        </section>
        <footer>{activeRoutePack.disclaimerFooter ?? defaultFooterDisclaimer}</footer>
      </main>
    </>
  );
}
