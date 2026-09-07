import type { Workspace, Person } from './workspace';
import type { ChecklistItem, ChecklistRule, SavedProject } from './types';
import {
  isRegisteredRouteId,
  getRoutePack,
  SUPPORTED_ROUTE_OPTIONS
} from '../content/registry';
import { normalizeSurveyAnswers } from './answers';
import { generateChecklist } from './checklist';
import { getSavedSurveyPage } from '../storage/uiSurveyPage';
import type { RoutePack } from './route';

export interface HubApplicationSummary {
  readonly applicationId: string;
  readonly applicantPersonId: string;
  readonly routeId: string;
  readonly routeLabel: string;
  readonly isRouteAvailable: boolean;
  readonly isActive: boolean;
  readonly progressSummary?: string;
  readonly updatedAt?: string;
  readonly formattedUpdatedAt?: string;
}

export interface HubPerson {
  readonly personId: string;
  readonly displayName: string;
  readonly applications: readonly HubApplicationSummary[];
}

export interface HubIntegrityIssue {
  readonly kind: 'missing_person' | 'malformed_identity' | 'duplicate_application_id';
  readonly applicationId?: string;
  readonly applicantPersonId?: string;
  readonly routeId?: string;
  readonly message: string;
}

export interface ApplicationHubReadModel {
  readonly people: readonly HubPerson[];
  readonly activeApplicationId: string | null;
  readonly hasActiveApplication: boolean;
  readonly issues: readonly HubIntegrityIssue[];
}

export interface RouteResolution {
  readonly label: string;
  readonly isAvailable: boolean;
}

export interface ApplicationProjectData {
  readonly progressSummary?: string;
  readonly updatedAt?: string;
  readonly formattedUpdatedAt?: string;
}

export interface BuildApplicationHubInput {
  readonly workspace: Workspace;
  readonly activeApplicationId?: string | null;
  readonly resolveRoute?: (routeId: string) => RouteResolution;
  readonly resolveRoutePack?: (routeId: string) => RoutePack;
  readonly projects?: ReadonlyMap<string, SavedProject> | Record<string, SavedProject> | readonly SavedProject[];
  readonly resolveProjectSummary?: (applicationId: string) => ApplicationProjectData | undefined;
}

export function formatApplicationTimestamp(isoString?: string | null): string | undefined {
  if (!isoString || typeof isoString !== 'string') return undefined;
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return undefined;
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `更新于 ${month}-${day} ${hours}:${minutes}`;
  } catch {
    return undefined;
  }
}

export function deriveApplicationProgress(
  project: SavedProject,
  resolveRoutePack: (routeId: string) => RoutePack = getRoutePack
): string | undefined {
  if (!project || typeof project !== 'object') return undefined;

  const routeId = project.routeId;
  if (!routeId) {
    return undefined;
  }

  if (resolveRoutePack === getRoutePack && !isRegisteredRouteId(routeId)) {
    return undefined;
  }

  let routePack: RoutePack;
  try {
    routePack = resolveRoutePack(routeId);
  } catch {
    return undefined;
  }

  const isCompleted = typeof project.surveyCompleted === 'boolean'
    ? project.surveyCompleted
    : Object.keys(project.answers ?? {}).length > 0;

  if (isCompleted) {
    try {
      const answers = project.answers ?? {};
      const effects = routePack.evaluateEffects(normalizeSurveyAnswers(answers), {
        checklistGenerated: true
      });
      const items = generateChecklist(
        effects.answersForChecklist,
        routePack.items as ChecklistItem[],
        routePack.rules as ChecklistRule[]
      );
      const statuses = project.statuses ?? {};
      const completeCount = items.filter((item) =>
        ['prepared', 'not_applicable'].includes(statuses[item.id] ?? 'not_started')
      ).length;
      return `材料清单 · ${completeCount} / ${items.length} 已处理`;
    } catch {
      return undefined;
    }
  }

  // Incomplete survey progress
  const pages = Array.isArray(routePack.questions?.pages)
    ? (routePack.questions.pages as readonly unknown[])
    : [];

  if (pages.length === 0) {
    return undefined;
  }

  const hasConditionalPage = pages.some((p) => {
    if (!p || typeof p !== 'object') return false;
    const pageObj = p as Record<string, unknown>;
    const visibleIf = pageObj.visibleIf;
    if (typeof visibleIf === 'string' && visibleIf.trim().length > 0) {
      return true;
    }
    if (pageObj.visible === false) {
      return true;
    }
    return false;
  });

  if (hasConditionalPage) {
    return '情况问卷进行中';
  }

  const totalPages = pages.length;
  const hasAnswers = Boolean(project.answers && Object.keys(project.answers).length > 0);
  const savedPageName = getSavedSurveyPage(project.id);

  if (savedPageName) {
    const pageIndex = pages.findIndex(
      (p) => p && typeof p === 'object' && (p as Record<string, unknown>).name === savedPageName
    );
    if (pageIndex >= 0) {
      return `情况问卷 · ${pageIndex + 1} / ${totalPages}`;
    }
    // Invalid saved page
    return hasAnswers ? '情况问卷进行中' : `情况问卷 · 1 / ${totalPages}`;
  }

  // No saved page
  return hasAnswers ? '情况问卷进行中' : `情况问卷 · 1 / ${totalPages}`;
}

export function defaultRouteResolver(routeId: string): RouteResolution {
  const option = SUPPORTED_ROUTE_OPTIONS.find((o) => o.routeId === routeId);
  if (option) {
    return { label: option.label, isAvailable: true };
  }
  if (isRegisteredRouteId(routeId)) {
    try {
      const pack = getRoutePack(routeId);
      return { label: pack.title, isAvailable: true };
    } catch {
      // ignore
    }
  }
  return {
    label: '暂不可用的申请路线',
    isAvailable: false
  };
}

export function buildApplicationHubReadModel(
  input: BuildApplicationHubInput
): ApplicationHubReadModel {
  const { workspace } = input;
  const resolver = input.resolveRoute ?? defaultRouteResolver;
  const trimmedActiveId =
    typeof input.activeApplicationId === 'string' && input.activeApplicationId.trim()
      ? input.activeApplicationId.trim()
      : null;

  const personMap = new Map<string, { person: Person; apps: HubApplicationSummary[] }>();
  const peopleOrder: string[] = [];

  for (const person of workspace.people) {
    if (!person.personId || typeof person.personId !== 'string' || !person.personId.trim()) {
      continue;
    }
    const trimmedId = person.personId.trim();
    if (!personMap.has(trimmedId)) {
      personMap.set(trimmedId, {
        person: {
          personId: trimmedId,
          displayName: person.displayName
        },
        apps: []
      });
      peopleOrder.push(trimmedId);
    }
  }

  const issues: HubIntegrityIssue[] = [];

  // Detect duplicate normalized applicationId values across Workspace
  const appIdCounts = new Map<string, number>();
  for (const app of workspace.applications) {
    const trimmedAppId = typeof app.applicationId === 'string' ? app.applicationId.trim() : '';
    if (trimmedAppId) {
      appIdCounts.set(trimmedAppId, (appIdCounts.get(trimmedAppId) ?? 0) + 1);
    }
  }

  const duplicateAppIds = new Set<string>();
  for (const [appId, count] of appIdCounts.entries()) {
    if (count > 1) {
      duplicateAppIds.add(appId);
      issues.push({
        kind: 'duplicate_application_id',
        applicationId: appId,
        message: `Duplicate applicationId "${appId}" found (${count} occurrences). Ambiguous application identity is excluded.`
      });
    }
  }

  let foundActiveAppId: string | null = null;

  for (const app of workspace.applications) {
    const trimmedAppId = typeof app.applicationId === 'string' ? app.applicationId.trim() : '';
    const trimmedPersonId = typeof app.applicantPersonId === 'string' ? app.applicantPersonId.trim() : '';
    const trimmedRouteId = typeof app.routeId === 'string' ? app.routeId.trim() : '';

    if (!trimmedAppId || !trimmedPersonId || !trimmedRouteId) {
      issues.push({
        kind: 'malformed_identity',
        applicationId: trimmedAppId || undefined,
        applicantPersonId: trimmedPersonId || undefined,
        routeId: trimmedRouteId || undefined,
        message: 'ApplicationIdentity has missing or malformed identifier(s).'
      });
      continue;
    }

    // Fail closed for ambiguous duplicate applicationId: do not attach to any Person or mark active
    if (duplicateAppIds.has(trimmedAppId)) {
      continue;
    }

    const personEntry = personMap.get(trimmedPersonId);
    if (!personEntry) {
      issues.push({
        kind: 'missing_person',
        applicationId: trimmedAppId,
        applicantPersonId: trimmedPersonId,
        routeId: trimmedRouteId,
        message: `Application "${trimmedAppId}" references non-existent person "${trimmedPersonId}".`
      });
      continue;
    }

    const { label, isAvailable } = resolver(trimmedRouteId);
    const isActive = trimmedActiveId !== null && trimmedAppId === trimmedActiveId;
    if (isActive) {
      foundActiveAppId = trimmedAppId;
    }

    let progressSummary: string | undefined;
    let updatedAt: string | undefined;
    let formattedUpdatedAt: string | undefined;

    if (input.resolveProjectSummary) {
      const customSummary = input.resolveProjectSummary(trimmedAppId);
      if (customSummary) {
        progressSummary = customSummary.progressSummary;
        updatedAt = customSummary.updatedAt;
        formattedUpdatedAt = customSummary.formattedUpdatedAt ?? formatApplicationTimestamp(customSummary.updatedAt);
      }
    } else if (input.projects) {
      let project: SavedProject | undefined;
      if (input.projects instanceof Map || (typeof (input.projects as any).get === 'function')) {
        project = (input.projects as ReadonlyMap<string, SavedProject>).get(trimmedAppId);
      } else if (Array.isArray(input.projects)) {
        project = (input.projects as readonly SavedProject[]).find((p) => p.id === trimmedAppId);
      } else if (typeof input.projects === 'object') {
        project = (input.projects as Record<string, SavedProject>)[trimmedAppId];
      }
      if (project) {
        progressSummary = deriveApplicationProgress(project, input.resolveRoutePack);
        updatedAt = project.updatedAt;
        formattedUpdatedAt = formatApplicationTimestamp(project.updatedAt);
      }
    }

    const summary: HubApplicationSummary = {
      applicationId: trimmedAppId,
      applicantPersonId: trimmedPersonId,
      routeId: trimmedRouteId,
      routeLabel: label,
      isRouteAvailable: isAvailable,
      isActive,
      progressSummary,
      updatedAt,
      formattedUpdatedAt
    };

    personEntry.apps.push(summary);
  }

  const people: HubPerson[] = peopleOrder.map((id) => {
    const entry = personMap.get(id)!;
    return {
      personId: entry.person.personId,
      displayName: entry.person.displayName,
      applications: entry.apps
    };
  });

  return {
    people,
    activeApplicationId: foundActiveAppId,
    hasActiveApplication: foundActiveAppId !== null,
    issues
  };
}

export function findApplicationHubPerson(
  model: ApplicationHubReadModel,
  personId: string
): HubPerson | undefined {
  if (!personId || typeof personId !== 'string') return undefined;
  const trimmed = personId.trim();
  return model.people.find((p) => p.personId === trimmed);
}

export function findApplicationSummary(
  model: ApplicationHubReadModel,
  applicationId: string
): HubApplicationSummary | undefined {
  if (!applicationId || typeof applicationId !== 'string') return undefined;
  const trimmed = applicationId.trim();
  for (const person of model.people) {
    const found = person.applications.find((app) => app.applicationId === trimmed);
    if (found) return found;
  }
  return undefined;
}

export function getApplicationsForPerson(
  model: ApplicationHubReadModel,
  personId: string
): readonly HubApplicationSummary[] {
  const person = findApplicationHubPerson(model, personId);
  return person ? person.applications : [];
}
