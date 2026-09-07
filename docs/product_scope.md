# Product Scope & Boundaries

This document defines the scope, user personas, capabilities, and explicit non-goals for the Visa Preparation Checklist.

## Intended Users

This tool is designed for adult applicants preparing materials for supported visa routes who have already independently selected their application route.

Currently supported routes:
- **New Zealand Fee Paying Student Visa** (subclass for international fee-paying students)
- **New Zealand Visitor Visa** (general visitor subclass for tourism, visits, and short courses)
- **Canada Study Permit**

## Product Scope

The workspace helps applicants systematically prepare, organize, and track factual information and required evidence before submitting an application.

### Supported Capabilities

1. **Multi-Applicant & Multi-Application Organization**:
   - Organize multiple applicants within a shared local workspace;
   - Manage multiple separate visa applications per applicant;
   - Application Hub view providing status overviews and active application switching.
2. **Route-Specific Circumstance Collection**:
   - Gathers factual answers tailored to each route's legal requirements;
   - Examples include course dates, tuition, and living funding for student routes; travel plans and maintenance for visitor routes; DLI and tuition details for Canadian permits.
3. **Per-Application Survey Continuity**:
   - Automatically persists the active questionnaire page per application;
   - Seamlessly restores question progression when switching between applications or reopening the browser.
4. **Deterministic Checklist Generation**:
   - Pure, unit-tested rule engines that generate tailored preparation items based on questionnaire answers;
   - Route packs maintain independent, isolated rules and question sets.
5. **Structured Material Reminders**:
   - Identity and passport requirements;
   - Academic transcripts, diplomas, and enrollment evidence;
   - Financial maintenance proof (own funds, sponsorship, financial guarantors, loans, or scholarships);
   - Genuine intention, study plans, and ties to home country;
   - Police certificates, medical examinations, and certified translations.
6. **Local Tracking & Organization**:
   - Status tracking (`未开始`, `准备中`, `需要复查`, `已准备`, `不适用`);
   - Progress calculation and category-based groupings;
   - Dual filtering by necessity class and completion status.
7. **Local Export & Print**:
   - JSON backup export for offline storage;
   - Clean, print-optimized stylesheet for paper or PDF generation.

## Non-Goals and Regulatory Boundaries

This tool is **not** an immigration adviser, legal counsel, decision maker, visa application portal, or document processor.

To maintain strict regulatory compliance and protect applicant safety, this tool strictly adheres to the following boundaries:

- **No Eligibility Assessment**: Does not assess whether an applicant is eligible or recommend visa types.
- **No Outcome Prediction**: Does not predict approval, refusal, risk levels, or processing timelines.
- **No Sufficiency Decisions**: Does not determine whether submitted or prepared evidence is sufficient or guaranteed to satisfy immigration authorities.
- **No Tailored Advice**: Does not provide personalised legal, disclosure, or document submission strategies.
- **No Statement Generation**: Does not generate cover letters, personal statements, declarations, or explanation letters presented as tailored advice.
- **No Form Submission**: Does not autofill or submit applications to Immigration New Zealand, Immigration, Refugees and Citizenship Canada, or any government portal.
- **No Government Impersonation**: Does not represent or impersonate any government agency, visa department, or licensed immigration professional.

When individual judgment or immigration strategy is required, applicants must consult current official government instructions or a licensed immigration professional.
