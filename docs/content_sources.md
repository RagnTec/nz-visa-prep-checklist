# Official Sources & Content Governance

This document describes how regulatory information and official requirements are sourced, verified, and maintained in the New Zealand Fee Paying Student Visa Preparation Checklist.

## First-Party Source Policy

- **Immigration New Zealand Exclusivity**: All visa requirements, evidence categories, and condition rules are sourced exclusively from official, first-party publications of [Immigration New Zealand (INZ)](https://www.immigration.govt.nz/).
- **No Secondary Source Reliance**: Commercial blogs, forum posts, or third-party interpretations are not used as authoritative sources.

## Source Metadata & Traceability

Every item in the preparation checklist includes verified source metadata defined in `src/content/nz/student-fee-paying/sources.json`. Each source entry contains:

- `id`: A unique, stable identifier for the source (e.g., `inz.fee-paying-student`);
- `title`: The official title of the published page;
- `publisher`: `Immigration New Zealand`;
- `url`: The canonical HTTPS URL on `immigration.govt.nz`;
- `checkedAt`: The ISO date (`YYYY-MM-DD`) on which the source was last reviewed against live INZ publications.

## Requirement Types & Distinctions

The checklist clearly distinguishes different categories of information:

1. **核心要求 (Core Requirements)**: Central, baseline requirements for the Fee Paying Student Visa (e.g., valid passport, Offer of Place, tuition receipt).
2. **按情况要求 (Circumstance-Dependent Requirements)**: Official requirements triggered by the applicant's specific situation (e.g., financial supporter evidence, police certificates, health examinations, family visa materials).
3. **建议核对 (Product Organisation Guidance)**: Structured checklist suggestions to assist with document collation, provider-condition review, and chronological organisation. These are clearly distinguished from statutory INZ document mandates.

## Currency of Information

Immigration policies and operational instructions are subject to change by Immigration New Zealand. Users should always check the live official links provided with each item for the most up-to-date requirements before lodging an application.
