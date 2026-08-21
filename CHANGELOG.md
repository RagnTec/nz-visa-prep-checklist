# Changelog

All notable changes to this project are documented in this file.

The format follows Keep a Changelog principles. The project is currently in Early Public Trial and does not yet claim semantic-versioning stability.

## Early Public Trial

### Included

- **Guided questionnaire**: Factual questions covering study, tuition, funding, identity, health/character background, education history, and family visa pathways.
- **Deterministic checklist generation**: Conditional checklist calculation based on pure, unit-tested deterministic rules.
- **Three-label necessity architecture**: Items categorised into `核心要求` (core visa requirements), `按情况要求` (circumstance-dependent requirements), and `建议核对` (product organisation and review guidance).
- **Family pathway comparison & materials**: Conditional questions and tailored checklist items for Partner of a Student Work/Visitor Visa, Dependent Child Student Visa, and Child of a Student Visitor Visa.
- **Dual filtering & search toolbar**: Filter checklist items by material necessity and completion status, with bulk expand/collapse controls for visible results.
- **Cross-session scroll restoration**: Restores reading scroll position across browser sessions using local storage.
- **Local persistence & migration**: Client-side storage via IndexedDB with automatic schema version migration.
- **Export & print support**: Local JSON backup export and styled browser print / PDF output.
- **Verified official sources**: Traceable first-party Immigration New Zealand source links with verified dates (`checkedAt`).

### Known non-blocking limitations

- Visual hierarchy between material necessity classes is functional but planned for further perceptual refinement.
- Spouse and child visa route comparison tables are readable on desktop; responsive border and horizontal-scroll treatment on mobile viewports will be further refined in upcoming updates.
