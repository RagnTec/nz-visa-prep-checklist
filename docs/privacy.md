# Privacy & Data Architecture

This document describes the privacy architecture and data handling practices of the New Zealand Fee Paying Student Visa Preparation Checklist.

## Core Privacy Principle: Local-First

The application is built on a strict **local-first** architecture. All user data, questionnaire responses, and checklist progress remain exclusively on the user's local device.

## Data Storage

- **Questionnaire & Checklist Statuses**: Persisted locally in the user's browser using **IndexedDB** (`nzVisaPrepChecklist` database).
- **UI State**: Ephemeral UI preferences (such as the last reading scroll position) are stored in `localStorage` under the namespace `nzVisaPrepChecklist.ui.scroll.<projectId>`.
- **No Cloud Storage**: The application has no backend servers, databases, or cloud synchronisation services.

## Network & External Communications

- **Zero Background Network Requests**: Answering questions, updating checklist statuses, navigating the UI, exporting JSON, and printing produce zero background network requests.
- **No Telemetry / Analytics**: There are no tracking scripts, third-party analytics (e.g., Google Analytics), error reporting beacons (e.g., Sentry), or session recorders.
- **No AI API Calls**: All rule evaluations and checklist calculations are executed by pure TypeScript functions in the local browser runtime. No external LLMs or cloud AI services are invoked.
- **Official Source Navigation**: Outbound network requests occur only when a user explicitly clicks an official Immigration New Zealand external link.
- **Asset Privacy**: Production builds do not load external fonts or assets from third-party CDNs (such as Google Fonts). All styles and scripts are bundled locally.

## Data Export & Deletion

- **Local Export**: Users can download a full backup of their project data at any time via the "导出项目 (JSON)" button. The export is generated locally via `Blob` and downloaded directly by the browser.
- **Local Deletion**: Clicking "重新回答" completely deletes the current project from the local IndexedDB database and clears the corresponding UI scroll cache.
