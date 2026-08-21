import {
  CURRENT_SAVED_PROJECT_SCHEMA_VERSION,
  type ChecklistStatus,
  type SavedProject
} from '../domain/types';

const LEGACY_STUDY_CONNECTION_ID = 'employment.courseConnection';
const STUDY_CONNECTION_ID = 'background.studyConnection';
const V2_SCHEMA_VERSION = 2;
const V3_SCHEMA_VERSION = 3;
const V4_SCHEMA_VERSION = 4;
const V5_SCHEMA_VERSION = 5;
const validHealthEvidenceStatuses = new Set([
  'not_provided',
  'previously_submitted',
  'new_exam_completed',
  'unclear'
]);

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function migrateApplicantType(employment: Record<string, unknown>): string {
  return employment.hasWorkExperience === true
    ? 'employed_or_previously_employed'
    : 'other_or_unclear';
}

function migrateStudyRelation(employment: Record<string, unknown>): string {
  switch (employment.courseRelation) {
    case 'direct': return 'continuation';
    case 'partial': return 'adjacent_capability';
    case 'change': return 'significant_transition';
    default: return 'unclear';
  }
}

function migrateStatuses(
  statuses: Record<string, ChecklistStatus>
): Record<string, ChecklistStatus> {
  const migrated = { ...statuses };
  if (!(STUDY_CONNECTION_ID in migrated) && LEGACY_STUDY_CONNECTION_ID in migrated) {
    migrated[STUDY_CONNECTION_ID] = migrated[LEGACY_STUDY_CONNECTION_ID];
  }
  return migrated;
}

export function migrateSavedProject(project: SavedProject): SavedProject {
  const version = project.schemaVersion === undefined ? 1 : project.schemaVersion;
  if (!Number.isInteger(version) || version < 1) return project;
  if (version > CURRENT_SAVED_PROJECT_SCHEMA_VERSION) return project;

  const v2Project = version === 1 ? migrateV1ToV2(project) : project;
  const v3Project = v2Project.schemaVersion === V2_SCHEMA_VERSION
    ? migrateV2ToV3(v2Project)
    : v2Project;
  const v4Project = v3Project.schemaVersion === V3_SCHEMA_VERSION
    ? migrateV3ToV4(v3Project)
    : v3Project;
  const v5Project = v4Project.schemaVersion === V4_SCHEMA_VERSION
    ? migrateV4ToV5(v4Project)
    : v4Project;
  return v5Project.schemaVersion === V5_SCHEMA_VERSION
    ? migrateV5ToV6(v5Project)
    : v5Project;
}

export type SavedProjectReadResult =
  | { kind: 'current'; project: SavedProject }
  | { kind: 'future'; project: SavedProject; schemaVersion: number }
  | { kind: 'invalid'; project: SavedProject; schemaVersion: unknown };

export function prepareSavedProjectForRead(project: SavedProject): SavedProjectReadResult {
  const version = project.schemaVersion === undefined ? 1 : project.schemaVersion;
  if (!Number.isInteger(version) || typeof version !== 'number' || version < 1) {
    return { kind: 'invalid', project, schemaVersion: project.schemaVersion };
  }
  if (version > CURRENT_SAVED_PROJECT_SCHEMA_VERSION) {
    return { kind: 'future', project, schemaVersion: version };
  }
  return { kind: 'current', project: migrateSavedProject(project) };
}

function migrateV1ToV2(project: SavedProject): SavedProject {
  const employment = asRecord(project.answers.employment);
  const background = asRecord(project.answers.background);
  const migratedBackground = {
    ...background,
    applicantType: background.applicantType ?? migrateApplicantType(employment),
    studyRelation: background.studyRelation ?? migrateStudyRelation(employment)
  };

  return {
    ...project,
    schemaVersion: V2_SCHEMA_VERSION,
    answers: {
      ...project.answers,
      background: migratedBackground
    },
    statuses: migrateStatuses(project.statuses)
  };
}

function migrateFundingArrangement(funding: Record<string, unknown>): string {
  switch (funding.source) {
    case 'self': return 'own_funds';
    case 'scholarship': return 'scholarship';
    case 'mixed': return 'mixed';
    default: return 'other_or_unclear';
  }
}

function migrateV2ToV3(project: SavedProject): SavedProject {
  const study = asRecord(project.answers.study);
  const travel = asRecord(project.answers.travel);
  const application = asRecord(project.answers.application);
  const funding = asRecord(project.answers.funding);

  return {
    ...project,
    schemaVersion: V3_SCHEMA_VERSION,
    answers: {
      ...project.answers,
      study: {
        ...study,
        courseStatus: study.courseStatus ?? 'unclear'
      },
      travel: {
        ...travel,
        locationContext: travel.locationContext ?? 'unclear'
      },
      application: {
        ...application,
        stage: application.stage ?? 'unclear'
      },
      funding: {
        ...funding,
        arrangementType: funding.arrangementType ?? migrateFundingArrangement(funding)
      }
    },
    statuses: { ...project.statuses }
  };
}

function migrateHealthEvidenceStatus(health: Record<string, unknown>): string {
  if (
    typeof health.evidenceStatus === 'string'
    && validHealthEvidenceStatuses.has(health.evidenceStatus)
  ) {
    return health.evidenceStatus;
  }
  if (health.hasXrayOrMedical === true) return 'previously_submitted';
  if (health.hasXrayOrMedical === false) return 'not_provided';
  return 'unclear';
}

function migrateV3ToV4(project: SavedProject): SavedProject {
  const health = asRecord(project.answers.health);

  return {
    ...project,
    schemaVersion: V4_SCHEMA_VERSION,
    answers: {
      ...project.answers,
      health: {
        ...health,
        evidenceStatus: migrateHealthEvidenceStatus(health)
      }
    },
    statuses: { ...project.statuses }
  };
}

function migrateV4ToV5(project: SavedProject): SavedProject {
  return {
    ...project,
    schemaVersion: V5_SCHEMA_VERSION,
    answers: { ...project.answers },
    statuses: { ...project.statuses }
  };
}

function migrateV5ToV6(project: SavedProject): SavedProject {
  return {
    ...project,
    schemaVersion: CURRENT_SAVED_PROJECT_SCHEMA_VERSION,
    answers: { ...project.answers },
    statuses: { ...project.statuses }
  };
}
