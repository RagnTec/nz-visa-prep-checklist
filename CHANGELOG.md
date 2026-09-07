# Changelog

All notable changes to this project are documented in this file.

The format follows Keep a Changelog principles. The project is currently in development and does not yet claim semantic-versioning stability.

## Current

### Added

- **Multi-applicant & application management**: Application Hub to create, switch between, and track preparation progress across multiple applicants and separate applications.
- **Expanded route support**: Added route packs for New Zealand Visitor Visa and Canada Study Permit alongside New Zealand Fee Paying Student Visa.
- **Per-application survey continuity**: Automatic saving and restoration of questionnaire progression per application across browser sessions.
- **Lazy-loaded survey boundary**: Code-split SurveyJS runtime and styling for rapid initial application shell loading.
- **Three-label necessity architecture**: Tasks classified into `核心要求` (core requirements), `按情况要求` (circumstance-dependent requirements), and `建议核对` (organization and review suggestions).

### Known non-blocking limitations

- Visual hierarchy between material necessity classes continues to be refined.
- Mobile viewport adaptations for comparison tables and complex layouts are undergoing ongoing ergonomic improvements.

## Early Public Trial

### Included

- **Deterministic checklist generation**: Configuration-driven checklist preparation aid for the New Zealand Fee Paying Student Visa.
- **Guided questionnaire**: Factual circumstance collection to generate conditional preparation items.
- **Local persistence**: Browser-local storage via IndexedDB and localStorage without requiring an account or backend.
- **Local export & print**: Offline JSON backup export and browser print/PDF styling.
- **Verified first-party sources**: Official Immigration New Zealand source links with verified review dates (`checkedAt`).
