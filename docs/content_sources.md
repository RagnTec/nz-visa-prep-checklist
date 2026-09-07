# Official Sources & Content Governance

This document describes how regulatory information and official requirements are sourced, verified, and maintained across all supported routes in the Visa Preparation Checklist.

## First-Party Source Policy

- **Government Authority Exclusivity**: All visa requirements, evidence categories, and condition rules are sourced exclusively from official, first-party publications of government immigration authorities (such as [Immigration New Zealand](https://www.immigration.govt.nz/) for New Zealand routes, and [Immigration, Refugees and Citizenship Canada](https://www.canada.ca/en/immigration-refugees-citizenship.html) for Canada routes).
- **No Secondary Source Reliance**: Commercial blogs, forum posts, or third-party interpretations are not used as authoritative sources.

## Source Metadata & Traceability

Every item in the preparation checklist includes verified source metadata defined in each route's `sources.json` (e.g., `src/content/<jurisdiction>/<route>/sources.json`). Each source entry contains:

- `id`: A unique, stable identifier for the source (e.g., `inz.fee-paying-student` or `ircc.study-permit`);
- `title`: The official title of the published page;
- `publisher`: The official government publisher (e.g., `Immigration New Zealand` or `Immigration, Refugees and Citizenship Canada`);
- `url`: The canonical HTTPS URL on the official government portal;
- `checkedAt`: The ISO date (`YYYY-MM-DD`) on which the source was last reviewed against live official publications.

## Requirement Types & Distinctions

The checklist clearly distinguishes different categories of information:

1. **核心要求 (Core Requirements)**: Central, baseline requirements for the visa subclass (e.g., valid passport, acceptance letter / Offer of Place, tuition receipt).
2. **按情况要求 (Circumstance-Dependent Requirements)**: Official requirements triggered by the applicant's specific situation (e.g., financial supporter evidence, police certificates, medical examinations, accompanying family materials).
3. **建议核对 (Organization & Review Guidance)**: Structured checklist suggestions to assist with document collation, condition review, and chronological organization. These are clearly distinguished from statutory government document mandates.

## Currency of Information

Immigration policies and operational instructions are subject to change by immigration authorities. Users should always check the live official links provided with each item for the most up-to-date requirements before lodging an application.
