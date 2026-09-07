# Privacy & Data Architecture

This document describes the privacy architecture and data handling practices of the Visa Preparation Checklist.

## Core Privacy Principle: Local-First

The application is built on a strict **local-first** architecture. All user data, questionnaire responses, applicant profiles, and checklist statuses remain exclusively on the user's local device.

## Data Storage

- **Applications & Checklist Statuses**: Persisted locally in the user's browser using **IndexedDB** (`nzVisaPrepChecklist` database).
- **UI State & Preferences**: Ephemeral UI preferences (active application ID, active workspace view, per-application questionnaire page, and checklist scroll position) are stored in `localStorage` under the namespace `nzVisaPrepChecklist.ui.*`.
- **No Cloud Storage**: The application has no backend servers, databases, or cloud synchronisation services.
- **Data Retention & Clearing**: Because data is stored locally, clearing this site's browser data or local storage may remove locally stored projects. You can export a JSON backup at any time.

## Network & External Communications

- **Zero Background Network Requests**: Answering questions, managing applications, updating checklist statuses, navigating the UI, exporting JSON, and printing produce zero background network requests.
- **No Telemetry / Analytics**: There are no tracking scripts, third-party analytics (e.g., Google Analytics), error reporting beacons (e.g., Sentry), or session recorders.
- **Official Source Navigation**: Outbound network requests occur only when a user explicitly clicks an official external government link (e.g., Immigration New Zealand or Immigration, Refugees and Citizenship Canada).
- **Asset Privacy**: Production builds do not load external fonts or assets from third-party CDNs (such as Google Fonts). All styles and scripts are bundled locally.

## Data Export & Deletion

- **Local Export**: Users can download a full backup of their project data at any time via the "导出项目 (JSON)" button. The export is generated locally via `Blob` and downloaded directly by the browser.
- **Local Deletion**: Restarting an application or clearing projects removes the data from local IndexedDB and clears the associated localStorage keys.
