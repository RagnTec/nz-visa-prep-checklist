# Changelog

All notable changes to this project are documented in this file.

The format follows Keep a Changelog principles. The project is currently in development and does not yet claim semantic-versioning stability.

## Current

### Added

- **Multi-applicant & application management**: Application Center to create, switch between, and track preparation progress across multiple applicants and separate applications.
- **Expanded route coverage**: Support for 11 visa routes across New Zealand, Canada, Australia, and the United States, covering Study, Visit, and Work categories.
- **Hierarchical route selection**: Progressive disclosure workflow navigating smoothly by jurisdiction, route category, and specific visa route.
- **Per-application survey continuity**: Automatic saving and restoration of questionnaire progression per application across browser sessions.
- **Deterministic checklist generation**: Configuration-driven, pure-rule checklist engines tailored to factual circumstances for each supported route.
- **Material necessity & layer presentation**: Clear presentation distinguishing official-source requirements and guidance, conditional or potentially requested evidence, and VisaHelper product-organisation guidance.
- **Lazy-loaded survey boundary**: Code-split SurveyJS runtime and styling for rapid initial application shell loading.

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
