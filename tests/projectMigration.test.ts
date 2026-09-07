import { describe, expect, it } from 'vitest';
import { CURRENT_SAVED_PROJECT_SCHEMA_VERSION, type SavedProject } from '../src/domain/types';
import {
  migrateSavedProject,
  prepareSavedProjectForRead
} from '../src/storage/projectMigration';

function v1Project(overrides: Partial<SavedProject> = {}): SavedProject {
  return {
    id: 'default',
    answers: {
      employment: {
        hasWorkExperience: true,
        currentlyEmployed: false,
        courseRelation: 'direct',
        legacyNote: 'synthetic'
      },
      background: {
        hasGap: true
      },
      unknownSection: {
        preserved: true
      }
    },
    statuses: {
      'employment.courseConnection': 'prepared',
      'unknown.synthetic': 'needs_review'
    },
    updatedAt: '2026-07-29T00:00:00.000Z',
    ...overrides
  };
}

describe('saved project migration through V7', () => {
  it('migrates employed applicant answers and preserves legacy and unknown data', () => {
    const project = v1Project();
    const migrated = migrateSavedProject(project);

    expect(migrated.schemaVersion).toBe(CURRENT_SAVED_PROJECT_SCHEMA_VERSION);
    expect(migrated.answers).toEqual(expect.objectContaining({
      employment: project.answers.employment,
      background: {
        hasGap: true,
        applicantType: 'employed_or_previously_employed',
        studyRelation: 'continuation'
      },
      unknownSection: {
        preserved: true
      }
    }));
    expect(migrated.statuses).toEqual(expect.objectContaining({
      'employment.courseConnection': 'prepared',
      'background.studyConnection': 'prepared',
      'unknown.synthetic': 'needs_review'
    }));
  });

  it('maps V1 applicants without formal work experience to other or unclear', () => {
    const project = v1Project({
      answers: {
        employment: {
          hasWorkExperience: false
        },
        background: {
          hasGap: false
        }
      }
    });

    expect(migrateSavedProject(project).answers.background).toEqual({
      hasGap: false,
      applicantType: 'other_or_unclear',
      studyRelation: 'unclear'
    });
  });

  it('treats an explicit schema version 1 as V1', () => {
    const migrated = migrateSavedProject(v1Project({ schemaVersion: 1 }));

    expect(migrated.schemaVersion).toBe(CURRENT_SAVED_PROJECT_SCHEMA_VERSION);
    expect((migrated.answers.background as Record<string, unknown>).applicantType)
      .toBe('employed_or_previously_employed');
  });

  it.each([
    ['direct', 'continuation'],
    ['partial', 'adjacent_capability'],
    ['change', 'significant_transition'],
    ['unknown-value', 'unclear']
  ])('maps legacy course relation %s to %s', (legacyValue, expected) => {
    const project = v1Project({
      answers: {
        employment: {
          hasWorkExperience: true,
          courseRelation: legacyValue
        }
      }
    });

    expect((migrateSavedProject(project).answers.background as Record<string, unknown>).studyRelation)
      .toBe(expected);
  });

  it('does not overwrite an existing new status or new answer field', () => {
    const project = v1Project({
      answers: {
        employment: {
          hasWorkExperience: true,
          courseRelation: 'direct'
        },
        background: {
          applicantType: 'other_or_unclear',
          studyRelation: 'unclear'
        }
      },
      statuses: {
        'employment.courseConnection': 'prepared',
        'background.studyConnection': 'in_progress'
      }
    });

    const migrated = migrateSavedProject(project);
    expect(migrated.answers.background).toEqual({
      applicantType: 'other_or_unclear',
      studyRelation: 'unclear'
    });
    expect(migrated.statuses['background.studyConnection']).toBe('in_progress');
  });

  it('is pure, deterministic and idempotent', () => {
    const project = v1Project();
    const original = JSON.parse(JSON.stringify(project)) as SavedProject;

    const first = migrateSavedProject(project);
    const second = migrateSavedProject(first);

    expect(project).toEqual(original);
    expect(first).toEqual(second);
  });

  it('migrates V2 answers through V3, V4, V5 and V6 without adding legacy employment fields', () => {
    const project = v1Project({
      schemaVersion: 2,
      answers: {
        background: {
          applicantType: 'recent_graduate_no_formal_work',
          studyRelation: 'continuation',
          hasGap: false
        }
      },
      statuses: {
        'background.studyConnection': 'not_started'
      }
    });

    const migrated = migrateSavedProject(project);
    expect(migrated).not.toBe(project);
    expect(migrated.schemaVersion).toBe(CURRENT_SAVED_PROJECT_SCHEMA_VERSION);
    expect(migrated.answers).not.toHaveProperty('employment');
    expect(migrated.answers).toEqual(expect.objectContaining({
      background: project.answers.background,
      study: { courseStatus: 'unclear' },
      travel: { locationContext: 'unclear' },
      application: { stage: 'unclear' },
      funding: { arrangementType: 'other_or_unclear' },
      health: { evidenceStatus: 'unclear' }
    }));
  });

  it('leaves future schema versions unchanged', () => {
    const futureVersion = CURRENT_SAVED_PROJECT_SCHEMA_VERSION + 1;
    const project = v1Project({ schemaVersion: futureVersion });

    expect(migrateSavedProject(project)).toBe(project);
    expect(prepareSavedProjectForRead(project)).toEqual({
      kind: 'future',
      project,
      schemaVersion: futureVersion
    });
  });

  it.each([null, 0, -1, 1.5, Number.NaN, '2'])(
    'fails closed for invalid schema version %s',
    (schemaVersion) => {
      const project = v1Project({
        schemaVersion: schemaVersion as number
      });

      expect(migrateSavedProject(project)).toBe(project);
      expect(prepareSavedProjectForRead(project)).toEqual({
        kind: 'invalid',
        project,
        schemaVersion
      });
    }
  );

  it.each([
    ['self', 'own_funds'],
    ['scholarship', 'scholarship'],
    ['mixed', 'mixed'],
    ['parent', 'other_or_unclear'],
    ['relative', 'other_or_unclear'],
    ['synthetic-unknown', 'other_or_unclear'],
    [undefined, 'other_or_unclear']
  ])('maps V2 funding source %s to %s while preserving the legacy value', (source, expected) => {
    const project = v1Project({
      schemaVersion: 2,
      answers: {
        funding: {
          source,
          legacyNote: 'synthetic'
        },
        unknownSection: {
          preserved: true
        }
      }
    });

    const migrated = migrateSavedProject(project);
    expect(migrated.answers.funding).toEqual({
      source,
      legacyNote: 'synthetic',
      arrangementType: expected
    });
    expect(migrated.answers.unknownSection).toEqual({ preserved: true });
  });

  it('does not overwrite existing V3 fields or infer an intended arrival date', () => {
    const project = v1Project({
      schemaVersion: 2,
      answers: {
        study: {
          courseStatus: 'already_started',
          courseStart: '2026-01-15'
        },
        travel: {
          locationContext: 'offshore'
        },
        application: {
          stage: 'submitted'
        },
        funding: {
          source: 'self',
          arrangementType: 'education_loan'
        }
      }
    });

    const migrated = migrateSavedProject(project);
    expect(migrated.answers).toEqual({
      study: {
        courseStatus: 'already_started',
        courseStart: '2026-01-15'
      },
      travel: {
        locationContext: 'offshore'
      },
      application: {
        stage: 'submitted'
      },
      funding: {
        source: 'self',
        arrangementType: 'education_loan'
      },
      health: {
        evidenceStatus: 'unclear'
      }
    });
    expect(migrated.answers.travel).not.toHaveProperty('intendedArrivalDate');
  });

  it('preserves unknown status keys and copies the status map', () => {
    const project = v1Project({
      schemaVersion: 2,
      answers: {},
      statuses: {
        'background.studyConnection': 'prepared',
        'unknown.synthetic': 'needs_review'
      }
    });

    const migrated = migrateSavedProject(project);
    expect(migrated.statuses).toEqual(project.statuses);
    expect(migrated.statuses).not.toBe(project.statuses);
  });

  it.each([
    [true, 'previously_submitted'],
    [false, 'not_provided'],
    [undefined, 'unclear'],
    ['invalid', 'unclear']
  ])(
    'maps the retired health boolean %s while preserving it',
    (legacyValue, expected) => {
      const project = v1Project({
        schemaVersion: 3,
        answers: {
          health: {
            hasXrayOrMedical: legacyValue,
            legacyNote: 'synthetic'
          },
          unknownSection: {
            preserved: true
          }
        }
      });

      const migrated = migrateSavedProject(project);
      expect(migrated.schemaVersion).toBe(CURRENT_SAVED_PROJECT_SCHEMA_VERSION);
      expect(migrated.answers.health).toEqual({
        hasXrayOrMedical: legacyValue,
        legacyNote: 'synthetic',
        evidenceStatus: expected
      });
      expect(migrated.answers.unknownSection).toEqual({ preserved: true });
    }
  );

  it('does not overwrite a valid new health status during V3-to-V4 migration', () => {
    const project = v1Project({
      schemaVersion: 3,
      answers: {
        health: {
          hasXrayOrMedical: false,
          evidenceStatus: 'new_exam_completed'
        }
      }
    });

    expect(migrateSavedProject(project).answers.health).toEqual({
      hasXrayOrMedical: false,
      evidenceStatus: 'new_exam_completed'
    });
  });

  it('migrates V4 through V5 and V6 to current schema without inferring material or family-route fields', () => {
    const project = v1Project({
      schemaVersion: 4,
      answers: {
        funding: {
          arrangementType: 'own_funds',
          unknownNested: { preserved: true }
        },
        unknownSection: { preserved: true }
      },
      statuses: {
        'funds.ownFunds': 'prepared',
        'unknown.synthetic': 'needs_review'
      },
      updatedAt: '2026-07-31T00:00:00.000Z'
    });

    const original = structuredClone(project);
    const migrated = migrateSavedProject(project);

    expect(project).toEqual(original);
    expect(migrated).toEqual({ ...project, schemaVersion: CURRENT_SAVED_PROJECT_SCHEMA_VERSION });
    expect(migrated.answers).not.toHaveProperty('education.recordContexts');
    expect(migrated.answers).not.toHaveProperty('education');
    expect(migrated.answers).not.toHaveProperty('english');
    expect(migrated.answers).not.toHaveProperty('documents');
    expect(migrated.answers).not.toHaveProperty('family');
  });

  it('migrates V5 to current schema without inferring routes and preserves unknown data', () => {
    const project: SavedProject & { syntheticTopLevel: unknown } = {
      ...v1Project(),
      schemaVersion: 5,
      answers: {
        family: {
          linkedApplicationContext: 'partner_and_child',
          partnerVisaRoute: 'partner_student_visitor',
          childVisaRoute: 'undecided',
          unknownNested: { preserved: true }
        },
        unknownSection: { preserved: true }
      },
      statuses: {
        'family.partnerRelationship': 'prepared',
        'unknown.synthetic': 'needs_review'
      },
      syntheticTopLevel: { preserved: true }
    };
    const original = structuredClone(project);

    const migrated = migrateSavedProject(project);

    expect(project).toEqual(original);
    expect(migrated).toEqual({ ...project, schemaVersion: CURRENT_SAVED_PROJECT_SCHEMA_VERSION });
    expect(migrateSavedProject(migrated)).toBe(migrated);
  });

  it('does not infer partner or child routes when migrating V5', () => {
    const migrated = migrateSavedProject(v1Project({
      schemaVersion: 5,
      answers: {
        family: { linkedApplicationContext: 'partner_and_child' }
      }
    }));

    expect(migrated.schemaVersion).toBe(CURRENT_SAVED_PROJECT_SCHEMA_VERSION);
    expect(migrated.answers.family).toEqual({
      linkedApplicationContext: 'partner_and_child'
    });
  });

  it('migrates V6 to V7 and preserves answers, statuses, and existing data without inventing reusable-fact metadata', () => {
    const v6Project: SavedProject = {
      ...v1Project(),
      schemaVersion: 6,
      answers: {
        background: { applicantType: 'employed_or_previously_employed' },
        study: { hasOffer: true }
      },
      statuses: {
        'funds.ownFunds': 'prepared'
      },
      updatedAt: '2026-08-15T00:00:00.000Z'
    };
    const original = structuredClone(v6Project);
    const migrated = migrateSavedProject(v6Project);

    expect(v6Project).toEqual(original);
    expect(migrated.schemaVersion).toBe(CURRENT_SAVED_PROJECT_SCHEMA_VERSION);
    expect(migrated.answers).toEqual(v6Project.answers);
    expect(migrated.statuses).toEqual(v6Project.statuses);
    expect(migrated.reusedFactStates).toBeUndefined();
  });

  it('leaves a native current-version project data unchanged and normalizes legacy missing routeId to NZ', () => {
    const project = v1Project({
      schemaVersion: CURRENT_SAVED_PROJECT_SCHEMA_VERSION,
      answers: {
        education: { recordContexts: ['currently_enrolled'] },
        unknownSection: { preserved: true }
      }
    });

    expect(migrateSavedProject(project)).toBe(project);
    expect(prepareSavedProjectForRead(project)).toEqual({
      kind: 'current',
      project: {
        ...project,
        routeId: 'nz-student-fee-paying'
      }
    });
  });

  describe('route identity and legacy fallback in prepareSavedProjectForRead', () => {
    it('normalizes legacy projects without routeId (V1 through V6) to default NZ route without mutation', () => {
      const legacyProject = v1Project({
        schemaVersion: 6,
        answers: { study: { hasOffer: true } }
      });
      delete legacyProject.routeId;
      const original = structuredClone(legacyProject);

      const result = prepareSavedProjectForRead(legacyProject);
      expect(legacyProject).toEqual(original);
      expect(result).toEqual({
        kind: 'current',
        project: expect.objectContaining({
          schemaVersion: CURRENT_SAVED_PROJECT_SCHEMA_VERSION,
          routeId: 'nz-student-fee-paying'
        })
      });
    });

    it('accepts explicit known NZ routeId', () => {
      const project = v1Project({
        schemaVersion: 6,
        routeId: 'nz-student-fee-paying'
      });

      const result = prepareSavedProjectForRead(project);
      expect(result).toEqual({
        kind: 'current',
        project: expect.objectContaining({
          schemaVersion: CURRENT_SAVED_PROJECT_SCHEMA_VERSION,
          routeId: 'nz-student-fee-paying'
        })
      });
    });

    it('accepts explicit known CA routeId', () => {
      const caProject = v1Project({
        schemaVersion: 6,
        routeId: 'ca-study-permit'
      });

      const result = prepareSavedProjectForRead(caProject);
      expect(result).toEqual({
        kind: 'current',
        project: expect.objectContaining({
          schemaVersion: CURRENT_SAVED_PROJECT_SCHEMA_VERSION,
          routeId: 'ca-study-permit'
        })
      });
    });

    it('fails closed with unknown_route when project contains explicit unregistered routeId', () => {
      const unknownProject = v1Project({
        schemaVersion: 6,
        routeId: 'unregistered-route-xyz'
      });

      const result = prepareSavedProjectForRead(unknownProject);
      expect(result).toEqual({
        kind: 'unknown_route',
        project: unknownProject,
        routeId: 'unregistered-route-xyz'
      });
    });

    it.each([
      ['empty string', ''],
      ['whitespace only', '   '],
      ['null', null as unknown as string],
      ['number', 123 as unknown as string],
      ['object', {} as unknown as string]
    ])('fails closed with invalid when routeId is malformed (%s)', (_label, invalidRouteId) => {
      const malformedProject = v1Project({
        schemaVersion: 6,
        routeId: invalidRouteId
      });

      const result = prepareSavedProjectForRead(malformedProject);
      expect(result).toEqual({
        kind: 'invalid',
        project: malformedProject,
        schemaVersion: 6,
        routeId: invalidRouteId
      });
    });
  });
});
