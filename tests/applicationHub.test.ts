import { describe, expect, it, beforeEach } from 'vitest';
import type { Workspace } from '../src/domain/workspace';
import type { SavedProject } from '../src/domain/types';
import type { RoutePack } from '../src/domain/route';
import {
  buildApplicationHubReadModel,
  deriveApplicationProgress,
  findApplicationHubPerson,
  findApplicationSummary,
  getApplicationsForPerson
} from '../src/domain/applicationHub';
import { setSavedSurveyPage, clearSavedSurveyPage } from '../src/storage/uiSurveyPage';

describe('Application Hub Read Model Foundation', () => {
  it('groups one Person with one Application correctly', () => {
    const workspace: Workspace = {
      people: [{ personId: 'person-alice', displayName: 'Alice' }],
      relationships: [],
      applications: [
        {
          applicationId: 'app-alice-1',
          applicantPersonId: 'person-alice',
          routeId: 'nz-student-fee-paying'
        }
      ]
    };

    const model = buildApplicationHubReadModel({
      workspace,
      activeApplicationId: 'app-alice-1'
    });

    expect(model.people).toHaveLength(1);
    const alice = model.people[0];
    expect(alice.personId).toBe('person-alice');
    expect(alice.displayName).toBe('Alice');
    expect(alice.applications).toHaveLength(1);

    const app = alice.applications[0];
    expect(app).toEqual({
      applicationId: 'app-alice-1',
      applicantPersonId: 'person-alice',
      routeId: 'nz-student-fee-paying',
      routeLabel: '新西兰 · 自费学生签证',
      isRouteAvailable: true,
      isActive: true
    });

    expect(model.hasActiveApplication).toBe(true);
    expect(model.activeApplicationId).toBe('app-alice-1');
    expect(model.issues).toHaveLength(0);
  });

  it('groups one Person with multiple Applications in deterministic order', () => {
    const workspace: Workspace = {
      people: [{ personId: 'person-alice', displayName: 'Alice' }],
      relationships: [],
      applications: [
        {
          applicationId: 'app-alice-student',
          applicantPersonId: 'person-alice',
          routeId: 'nz-student-fee-paying'
        },
        {
          applicationId: 'app-alice-visitor',
          applicantPersonId: 'person-alice',
          routeId: 'nz-visitor'
        }
      ]
    };

    const model = buildApplicationHubReadModel({
      workspace,
      activeApplicationId: 'app-alice-visitor'
    });

    const alice = model.people[0];
    expect(alice.applications).toHaveLength(2);
    expect(alice.applications[0].applicationId).toBe('app-alice-student');
    expect(alice.applications[0].isActive).toBe(false);
    expect(alice.applications[1].applicationId).toBe('app-alice-visitor');
    expect(alice.applications[1].isActive).toBe(true);
  });

  it('groups multiple independent Persons in Workspace.people order', () => {
    const workspace: Workspace = {
      people: [
        { personId: 'person-bob', displayName: 'Bob' },
        { personId: 'person-charlie', displayName: 'Charlie' },
        { personId: 'person-alice', displayName: 'Alice' }
      ],
      relationships: [],
      applications: [
        {
          applicationId: 'app-charlie-1',
          applicantPersonId: 'person-charlie',
          routeId: 'ca-study-permit'
        },
        {
          applicationId: 'app-alice-1',
          applicantPersonId: 'person-alice',
          routeId: 'nz-visitor'
        }
      ]
    };

    const model = buildApplicationHubReadModel({ workspace });

    expect(model.people.map((p) => p.personId)).toEqual([
      'person-bob',
      'person-charlie',
      'person-alice'
    ]);

    expect(model.people[0].applications).toHaveLength(0); // Bob has 0 apps
    expect(model.people[1].applications).toHaveLength(1); // Charlie has 1 app
    expect(model.people[2].applications).toHaveLength(1); // Alice has 1 app
  });

  it('preserves Person with zero Applications as visible with empty applications list', () => {
    const workspace: Workspace = {
      people: [
        { personId: 'person-empty', displayName: 'Empty Person' }
      ],
      relationships: [],
      applications: []
    };

    const model = buildApplicationHubReadModel({ workspace });

    expect(model.people).toHaveLength(1);
    expect(model.people[0].personId).toBe('person-empty');
    expect(model.people[0].applications).toEqual([]);
  });

  it('does not group by relationships (Hub groups strictly by Person -> Applications)', () => {
    const workspace: Workspace = {
      people: [
        { personId: 'person-parent', displayName: 'Parent' },
        { personId: 'person-child', displayName: 'Child' }
      ],
      relationships: [
        {
          kind: 'parent_child',
          relationshipId: 'rel-1',
          parentPersonId: 'person-parent',
          childPersonId: 'person-child'
        }
      ],
      applications: [
        {
          applicationId: 'app-parent',
          applicantPersonId: 'person-parent',
          routeId: 'nz-student-fee-paying'
        },
        {
          applicationId: 'app-child',
          applicantPersonId: 'person-child',
          routeId: 'nz-visitor'
        }
      ]
    };

    const model = buildApplicationHubReadModel({ workspace });

    // Both appear at top level as independent Person entries
    expect(model.people).toHaveLength(2);
    expect(model.people[0].personId).toBe('person-parent');
    expect(model.people[0].applications[0].applicationId).toBe('app-parent');
    expect(model.people[1].personId).toBe('person-child');
    expect(model.people[1].applications[0].applicationId).toBe('app-child');
  });

  it('marks exactly the active application and ignores non-matching activeApplicationId', () => {
    const workspace: Workspace = {
      people: [{ personId: 'person-alice', displayName: 'Alice' }],
      relationships: [],
      applications: [
        {
          applicationId: 'app-1',
          applicantPersonId: 'person-alice',
          routeId: 'nz-visitor'
        }
      ]
    };

    const modelUnknownActive = buildApplicationHubReadModel({
      workspace,
      activeApplicationId: 'non-existent-app-id'
    });

    expect(modelUnknownActive.hasActiveApplication).toBe(false);
    expect(modelUnknownActive.activeApplicationId).toBeNull();
    expect(modelUnknownActive.people[0].applications[0].isActive).toBe(false);

    const modelMatchedActive = buildApplicationHubReadModel({
      workspace,
      activeApplicationId: 'app-1'
    });

    expect(modelMatchedActive.hasActiveApplication).toBe(true);
    expect(modelMatchedActive.activeApplicationId).toBe('app-1');
    expect(modelMatchedActive.people[0].applications[0].isActive).toBe(true);
  });

  it('fails closed and records issue when Application references non-existent Person', () => {
    const workspace: Workspace = {
      people: [{ personId: 'person-alice', displayName: 'Alice' }],
      relationships: [],
      applications: [
        {
          applicationId: 'app-orphan',
          applicantPersonId: 'person-ghost',
          routeId: 'nz-student-fee-paying'
        }
      ]
    };

    const model = buildApplicationHubReadModel({ workspace });

    // Alice has 0 applications; orphan is not reassigned
    expect(model.people[0].applications).toHaveLength(0);
    expect(model.issues).toHaveLength(1);
    expect(model.issues[0]).toEqual({
      kind: 'missing_person',
      applicationId: 'app-orphan',
      applicantPersonId: 'person-ghost',
      routeId: 'nz-student-fee-paying',
      message: expect.stringContaining('references non-existent person')
    });
  });

  it('preserves unknown routeId, marks route as unavailable, and does not fall back to default route', () => {
    const workspace: Workspace = {
      people: [{ personId: 'person-alice', displayName: 'Alice' }],
      relationships: [],
      applications: [
        {
          applicationId: 'app-unknown',
          applicantPersonId: 'person-alice',
          routeId: 'custom-future-visa-route'
        }
      ]
    };

    const model = buildApplicationHubReadModel({ workspace });

    const app = model.people[0].applications[0];
    expect(app.routeId).toBe('custom-future-visa-route');
    expect(app.isRouteAvailable).toBe(false);
    expect(app.routeLabel).toBe('暂不可用的申请路线');
    expect(app.routeLabel).not.toMatch(/custom-future-visa-route/);
    expect(app.routeLabel).not.toBe('新西兰 · 自费学生签证');
  });

  it('resolves registered routes to readable human-friendly labels', () => {
    const workspace: Workspace = {
      people: [{ personId: 'person-alice', displayName: 'Alice' }],
      relationships: [],
      applications: [
        { applicationId: 'app-1', applicantPersonId: 'person-alice', routeId: 'nz-student-fee-paying' },
        { applicationId: 'app-2', applicantPersonId: 'person-alice', routeId: 'nz-visitor' },
        { applicationId: 'app-3', applicantPersonId: 'person-alice', routeId: 'ca-study-permit' }
      ]
    };

    const model = buildApplicationHubReadModel({ workspace });

    const labels = model.people[0].applications.map((a) => a.routeLabel);
    expect(labels).toEqual([
      '新西兰 · 自费学生签证',
      '新西兰 · 访问签证',
      '加拿大 · 学习许可'
    ]);
  });

  it('helper query functions locate people and applications accurately', () => {
    const workspace: Workspace = {
      people: [
        { personId: 'person-alice', displayName: 'Alice' },
        { personId: 'person-bob', displayName: 'Bob' }
      ],
      relationships: [],
      applications: [
        { applicationId: 'app-a1', applicantPersonId: 'person-alice', routeId: 'nz-visitor' },
        { applicationId: 'app-b1', applicantPersonId: 'person-bob', routeId: 'ca-study-permit' }
      ]
    };

    const model = buildApplicationHubReadModel({ workspace });

    expect(findApplicationHubPerson(model, 'person-alice')?.displayName).toBe('Alice');
    expect(findApplicationHubPerson(model, 'person-nonexistent')).toBeUndefined();

    expect(findApplicationSummary(model, 'app-b1')?.routeLabel).toBe('加拿大 · 学习许可');
    expect(findApplicationSummary(model, 'app-nonexistent')).toBeUndefined();

    expect(getApplicationsForPerson(model, 'person-alice')).toHaveLength(1);
    expect(getApplicationsForPerson(model, 'person-nonexistent')).toHaveLength(0);
  });

  it('detects duplicate applicationId under the same Person, excludes them from Hub, and reports issue', () => {
    const workspace: Workspace = {
      people: [{ personId: 'person-alice', displayName: 'Alice' }],
      relationships: [],
      applications: [
        {
          applicationId: 'app-duplicate',
          applicantPersonId: 'person-alice',
          routeId: 'nz-student-fee-paying'
        },
        {
          applicationId: 'app-duplicate',
          applicantPersonId: 'person-alice',
          routeId: 'nz-visitor'
        },
        {
          applicationId: 'app-valid-unique',
          applicantPersonId: 'person-alice',
          routeId: 'ca-study-permit'
        }
      ]
    };

    const model = buildApplicationHubReadModel({ workspace });

    const alice = model.people[0];
    // Both duplicate instances are excluded; only the valid unique application remains
    expect(alice.applications).toHaveLength(1);
    expect(alice.applications[0].applicationId).toBe('app-valid-unique');

    expect(model.issues).toHaveLength(1);
    expect(model.issues[0]).toEqual({
      kind: 'duplicate_application_id',
      applicationId: 'app-duplicate',
      message: expect.stringContaining('Duplicate applicationId "app-duplicate" found')
    });

    expect(findApplicationSummary(model, 'app-duplicate')).toBeUndefined();
    expect(findApplicationSummary(model, 'app-valid-unique')?.applicationId).toBe('app-valid-unique');
  });

  it('detects duplicate applicationId across different Persons, excludes them from all Persons, and preserves unrelated applications', () => {
    const workspace: Workspace = {
      people: [
        { personId: 'person-alice', displayName: 'Alice' },
        { personId: 'person-bob', displayName: 'Bob' }
      ],
      relationships: [],
      applications: [
        {
          applicationId: 'app-shared-dup',
          applicantPersonId: 'person-alice',
          routeId: 'nz-student-fee-paying'
        },
        {
          applicationId: 'app-shared-dup',
          applicantPersonId: 'person-bob',
          routeId: 'nz-visitor'
        },
        {
          applicationId: 'app-alice-good',
          applicantPersonId: 'person-alice',
          routeId: 'ca-study-permit'
        }
      ]
    };

    const model = buildApplicationHubReadModel({
      workspace,
      activeApplicationId: 'app-alice-good'
    });

    const alice = model.people[0];
    const bob = model.people[1];

    expect(alice.applications).toHaveLength(1);
    expect(alice.applications[0].applicationId).toBe('app-alice-good');
    expect(alice.applications[0].isActive).toBe(true);

    expect(bob.applications).toHaveLength(0); // Bob's only application was duplicated, so excluded

    expect(model.hasActiveApplication).toBe(true);
    expect(model.activeApplicationId).toBe('app-alice-good');

    expect(model.issues).toHaveLength(1);
    expect(model.issues[0].kind).toBe('duplicate_application_id');
  });

  it('when activeApplicationId points to a duplicated applicationId, no application is marked active', () => {
    const workspace: Workspace = {
      people: [{ personId: 'person-alice', displayName: 'Alice' }],
      relationships: [],
      applications: [
        {
          applicationId: 'app-collision',
          applicantPersonId: 'person-alice',
          routeId: 'nz-student-fee-paying'
        },
        {
          applicationId: 'app-collision',
          applicantPersonId: 'person-alice',
          routeId: 'nz-visitor'
        },
        {
          applicationId: 'app-unrelated',
          applicantPersonId: 'person-alice',
          routeId: 'ca-study-permit'
        }
      ]
    };

    const model = buildApplicationHubReadModel({
      workspace,
      activeApplicationId: 'app-collision'
    });

    expect(model.hasActiveApplication).toBe(false);
    expect(model.activeApplicationId).toBeNull();
    expect(model.people[0].applications[0].isActive).toBe(false);
  });

  it('leaves input Workspace completely immutable', () => {
    const workspace: Workspace = {
      people: [{ personId: 'person-alice', displayName: 'Alice' }],
      relationships: [],
      applications: [
        {
          applicationId: 'app-1',
          applicantPersonId: 'person-alice',
          routeId: 'nz-visitor'
        }
      ]
    };

    const snapshot = JSON.stringify(workspace);

    buildApplicationHubReadModel({
      workspace,
      activeApplicationId: 'app-1'
    });

    expect(JSON.stringify(workspace)).toBe(snapshot);
  });
});

describe('deriveApplicationProgress', () => {
  beforeEach(() => {
    clearSavedSurveyPage('app-test');
    clearSavedSurveyPage('app-new');
    clearSavedSurveyPage('app-historical');
    clearSavedSurveyPage('app-invalid');
    clearSavedSurveyPage('app-synth');
  });

  it('preserves Checklist progress for completed Applications', () => {
    const project: SavedProject = {
      id: 'app-test',
      routeId: 'nz-student-fee-paying',
      schemaVersion: 1,
      surveyCompleted: true,
      answers: {
        'study.hasOffer': true,
        'study.tuitionPaid': true
      },
      statuses: {
        'identity.passport': 'prepared'
      },
      updatedAt: '2026-09-01T10:00:00.000Z'
    };

    const progress = deriveApplicationProgress(project);
    expect(progress).toBeDefined();
    expect(progress).toMatch(/^材料清单 · 1 \/ \d+ 已处理$/);
  });

  it('maps valid saved Survey page to exact static page index', () => {
    setSavedSurveyPage('study', 'app-test');

    const project: SavedProject = {
      id: 'app-test',
      routeId: 'nz-student-fee-paying',
      schemaVersion: 1,
      surveyCompleted: false,
      answers: {
        'study.hasOffer': true
      },
      statuses: {},
      updatedAt: '2026-09-01T10:00:00.000Z'
    };

    expect(deriveApplicationProgress(project)).toBe('情况问卷 · 2 / 7');

    setSavedSurveyPage('identity-health', 'app-test');
    expect(deriveApplicationProgress(project)).toBe('情况问卷 · 7 / 7');
  });

  it('shows 1 / N for brand-new empty Application without saved page', () => {
    const project: SavedProject = {
      id: 'app-new',
      routeId: 'nz-student-fee-paying',
      schemaVersion: 1,
      surveyCompleted: false,
      answers: {},
      statuses: {},
      updatedAt: '2026-09-01T10:00:00.000Z'
    };

    expect(deriveApplicationProgress(project)).toBe('情况问卷 · 1 / 7');
  });

  it('returns generic "情况问卷进行中" for historical incomplete Application with answers but no saved page', () => {
    const project: SavedProject = {
      id: 'app-historical',
      routeId: 'nz-student-fee-paying',
      schemaVersion: 1,
      surveyCompleted: false,
      answers: {
        'study.hasOffer': true
      },
      statuses: {},
      updatedAt: '2026-09-01T10:00:00.000Z'
    };

    expect(deriveApplicationProgress(project)).toBe('情况问卷进行中');
  });

  it('handles invalid saved page name safely', () => {
    setSavedSurveyPage('non-existent-page', 'app-invalid');

    // With answers: degrades to generic in-progress label
    const projectWithAnswers: SavedProject = {
      id: 'app-invalid',
      routeId: 'nz-student-fee-paying',
      schemaVersion: 1,
      surveyCompleted: false,
      answers: {
        'study.hasOffer': true
      },
      statuses: {},
      updatedAt: '2026-09-01T10:00:00.000Z'
    };
    expect(deriveApplicationProgress(projectWithAnswers)).toBe('情况问卷进行中');

    // Without answers: safe fallback remains 1 / N
    const emptyProject: SavedProject = {
      id: 'app-invalid',
      routeId: 'nz-student-fee-paying',
      schemaVersion: 1,
      surveyCompleted: false,
      answers: {},
      statuses: {},
      updatedAt: '2026-09-01T10:00:00.000Z'
    };
    expect(deriveApplicationProgress(emptyProject)).toBe('情况问卷 · 1 / 7');
  });

  it('returns undefined for unknown or unregistered route without fabricating progress', () => {
    const project: SavedProject = {
      id: 'app-test',
      routeId: 'unregistered-custom-route',
      schemaVersion: 1,
      surveyCompleted: false,
      answers: {},
      statuses: {},
      updatedAt: '2026-09-01T10:00:00.000Z'
    };

    expect(deriveApplicationProgress(project)).toBeUndefined();
  });

  it('fails closed to generic "情况问卷进行中" for route with page-level conditional visibility, while completed keeps checklist progress', () => {
    const syntheticConditionalRoutePack: RoutePack = {
      id: 'synthetic-conditional-route',
      jurisdiction: 'nz',
      title: 'Synthetic Conditional Route',
      defaultExportFileName: 'synthetic',
      questions: {
        pages: [
          { name: 'page-1', title: 'Page 1' },
          { name: 'page-2', title: 'Page 2', visibleIf: '{study.hasOffer} = true' }
        ]
      },
      items: [
        {
          id: 'synth-item-1',
          category: 'General',
          title: 'Synthetic Item 1',
          requirementType: 'usually_required',
          evidenceLayer: 'inz_visa',
          why: 'Reason',
          steps: ['Step 1'],
          sourceIds: ['source-1'],
          defaultIncluded: true
        }
      ],
      rules: [],
      sources: [
        {
          id: 'source-1',
          title: 'Source 1',
          url: 'https://example.com',
          publisher: 'Publisher',
          checkedAt: '2026-09-01'
        }
      ],
      evaluateEffects: (answers) => ({
        answersForChecklist: answers,
        validationErrors: {},
        warnings: {}
      })
    };

    const resolver = () => syntheticConditionalRoutePack;

    // Incomplete application with saved page on conditional route -> fails closed to generic label
    setSavedSurveyPage('page-1', 'app-synth');
    const incompleteProject: SavedProject = {
      id: 'app-synth',
      routeId: 'synthetic-conditional-route',
      schemaVersion: 1,
      surveyCompleted: false,
      answers: { 'study.hasOffer': true },
      statuses: {},
      updatedAt: '2026-09-01T10:00:00.000Z'
    };
    expect(deriveApplicationProgress(incompleteProject, resolver)).toBe('情况问卷进行中');

    // Completed application on conditional route -> Checklist progress operates normally
    const completedProject: SavedProject = {
      id: 'app-synth',
      routeId: 'synthetic-conditional-route',
      schemaVersion: 1,
      surveyCompleted: true,
      answers: { 'study.hasOffer': true },
      statuses: { 'synth-item-1': 'prepared' },
      updatedAt: '2026-09-01T10:00:00.000Z'
    };
    expect(deriveApplicationProgress(completedProject, resolver)).toBe('材料清单 · 1 / 1 已处理');
  });

  it('integrates cleanly into buildApplicationHubReadModel', () => {
    setSavedSurveyPage('study', 'app-incomplete');

    const workspace: Workspace = {
      people: [{ personId: 'person-alice', displayName: 'Alice' }],
      relationships: [],
      applications: [
        {
          applicationId: 'app-completed',
          applicantPersonId: 'person-alice',
          routeId: 'nz-student-fee-paying'
        },
        {
          applicationId: 'app-incomplete',
          applicantPersonId: 'person-alice',
          routeId: 'nz-student-fee-paying'
        }
      ]
    };

    const projects: Record<string, SavedProject> = {
      'app-completed': {
        id: 'app-completed',
        routeId: 'nz-student-fee-paying',
        schemaVersion: 1,
        surveyCompleted: true,
        answers: { 'study.hasOffer': true },
        statuses: {},
        updatedAt: '2026-09-01T10:00:00.000Z'
      },
      'app-incomplete': {
        id: 'app-incomplete',
        routeId: 'nz-student-fee-paying',
        schemaVersion: 1,
        surveyCompleted: false,
        answers: { 'study.hasOffer': true },
        statuses: {},
        updatedAt: '2026-09-01T10:00:00.000Z'
      }
    };

    const model = buildApplicationHubReadModel({ workspace, projects });
    const aliceApps = model.people[0].applications;

    expect(aliceApps[0].progressSummary).toMatch(/^材料清单 · 0 \/ \d+ 已处理$/);
    expect(aliceApps[1].progressSummary).toBe('情况问卷 · 2 / 7');
  });
});
