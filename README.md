# Visa Prep Checklist

A local-first workspace for preparing visa applications.

It turns route-specific questions into a structured preparation workflow, helping applicants organize application context, track multiple applications, and generate personalized document checklists without sending personal application data to a project backend.

Live Demo:
[https://ragntec.github.io/nz-visa-prep-checklist/](https://ragntec.github.io/nz-visa-prep-checklist/)

> **Disclaimer**
> This is an independent preparation tool, not an official immigration service and not legal or immigration advice.

---

## What it does

- **Guided route-specific questionnaires**: Collects factual background questions tailored to specific visa routes.
- **Personalized checklists**: Generates deterministic, circumstance-dependent preparation checklists using pure rule evaluation.
- **Multiple applicants & multiple applications**: Supports managing multiple applicants and separate applications within a single local workspace.
- **Application Hub**: Provides an overview of all applicants, their associated visa applications, and active preparation progress.
- **Per-application survey resume continuity**: Automatically preserves questionnaire progression per application so you can pick up where you left off.
- **Browser-local storage**: Keeps all user responses and progress strictly inside the browser without requiring an account.

## Current application routes

The public workspace currently includes support for:

- **New Zealand Fee Paying Student Visa** (international fee-paying tertiary students)
- **New Zealand Visitor Visa** (tourism, family visits, and short-term study)
- **Canada Study Permit**

Each route owns its own questionnaire, checklist logic, rules, and official sources. Additional routes can be integrated through the route configuration architecture.

## How it works

1. **Create or select an applicant**: Start by identifying who is applying.
2. **Choose an application route**: Select a supported visa route for that applicant.
3. **Complete the guided questionnaire**: Answer factual questions regarding study, travel dates, funding, and background.
4. **Review and manage the generated preparation checklist**: Track tasks, review official requirements, filter items, and export or print your checklist.

Multiple applications remain separate and distinct even when they belong to the same applicant.

## Privacy by design

- **Local-first storage**: Questionnaire answers and checklist progress are saved exclusively in your browser via IndexedDB (`nzVisaPrepChecklist`) and localStorage.
- **No account or backend**: There are no servers, user accounts, databases, or cloud sync services attached to this project.
- **Zero background tracking**: No analytics, telemetry, or error-reporting beacons are loaded.
- **Data retention**: Because storage is local, clearing your browser or site data will remove your saved progress. You can export a JSON backup at any time.
- **Sanitized public release**: The public repository excludes internal development history, private test fixtures, and administrative tooling.

For details, see [`docs/privacy.md`](docs/privacy.md).

## Current limitations

- **Selected routes only**: Only specific visa routes are currently implemented.
- **Policy changes**: Immigration policies and requirements are subject to change by government authorities. Always verify requirements against live official publications.
- **Not exhaustive for every situation**: While rules cover common and complex scenarios, individual circumstances may require additional evidence or professional guidance.
- **Device-specific**: Progress does not synchronize across devices or browsers unless exported and imported manually.
- **No official submission**: This tool organizes preparation materials but does not submit applications to immigration departments.
- **Not immigration advice**: It does not assess eligibility, recommend routes, predict outcomes, or replace licensed immigration advisers or lawyers.

## Sources and methodology

- [`docs/content_sources.md`](docs/content_sources.md): How official requirements are sourced, verified, and mapped.
- [`docs/product_scope.md`](docs/product_scope.md): Product scope, supported features, and regulatory non-goals.

All route content is derived from documented public first-party government publications (such as Immigration New Zealand and Immigration, Refugees and Citizenship Canada) and implemented as explicit, unit-tested rules.

## Run locally

### Prerequisites

- Node.js 20+ (Node.js 22 recommended)
- npm 10+

### Setup and Development

```bash
npm install
npm run dev
```

Open `http://localhost:5173/` in your browser.

### Build and Verification

```bash
npm run typecheck
npm test
npm run build
```

## Public release provenance

This public demo repository is generated from a sanitized canonical source snapshot.

- Machine-readable release provenance is tracked in [`PUBLIC_RELEASE.json`](PUBLIC_RELEASE.json).
- Maintainer-facing cross-repository compatibility notes are documented in [`DEMO_PROJECT_HANDOFF.md`](DEMO_PROJECT_HANDOFF.md).

## Disclaimer

This tool is an independent, non-governmental preparation aid. It does not provide legal or immigration advice, does not assess visa eligibility, does not guarantee visa outcomes, and is not affiliated with or endorsed by Immigration New Zealand, Immigration, Refugees and Citizenship Canada, or any government agency. For official guidance, refer to government immigration portals or consult a licensed professional.

## License

This project is licensed under the [MIT License](LICENSE). Third-party dependencies and notices are detailed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
