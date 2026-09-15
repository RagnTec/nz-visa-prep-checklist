import { zhCNMessages } from './messages.zh-CN';
import type { RouteCategory } from '../domain/route';
import type { AvailableLocale, LocaleMessages } from './types';

export const DEFAULT_LOCALE: AvailableLocale = 'zh-CN';

const messageRegistries: Record<AvailableLocale, LocaleMessages> = {
  'zh-CN': zhCNMessages
};

export function getMessages(locale: AvailableLocale = DEFAULT_LOCALE): LocaleMessages {
  return messageRegistries[locale] ?? zhCNMessages;
}

// Convenience direct exports for the current active locale (zh-CN)
export const statusLabels = zhCNMessages.checklistStatus;
export const requirementLabels = zhCNMessages.requirementType;
export const evidenceLayerLabels = zhCNMessages.evidenceLayer;
export const REUSED_FACT_LABELS = zhCNMessages.reusedFact;
export const routeCategoryLabels = zhCNMessages.routeCategory;
export const routeCategorySectionLabels = zhCNMessages.routeCategorySection;
export const routeDisplayNameLabels = zhCNMessages.routeDisplayName;
export const jurisdictionLabels = zhCNMessages.jurisdiction;

export function formatRoutePrimaryLabel(
  jurisdiction: string,
  routeCategory: RouteCategory,
  locale: AvailableLocale = DEFAULT_LOCALE
): string {
  const msgs = getMessages(locale);
  const jName = msgs.jurisdiction[jurisdiction] ?? jurisdiction;
  const cName = msgs.routeCategory[routeCategory] ?? routeCategory;
  return `${jName} · ${cName}`;
}

export function formatRouteCategoryLabel(
  routeCategory: RouteCategory,
  locale: AvailableLocale = DEFAULT_LOCALE
): string {
  const msgs = getMessages(locale);
  return msgs.routeCategory[routeCategory] ?? routeCategory;
}

export function formatRouteCategorySectionLabel(
  routeCategory: RouteCategory,
  locale: AvailableLocale = DEFAULT_LOCALE
): string {
  const msgs = getMessages(locale);
  return msgs.routeCategorySection[routeCategory] ?? routeCategory;
}

export function formatRouteDisplayName(
  routeId: string,
  locale: AvailableLocale = DEFAULT_LOCALE
): string {
  const msgs = getMessages(locale);
  return msgs.routeDisplayName[routeId] ?? routeId;
}

export function formatJurisdictionLabel(
  jurisdiction: string,
  locale: AvailableLocale = DEFAULT_LOCALE
): string {
  const msgs = getMessages(locale);
  return msgs.jurisdiction[jurisdiction] ?? jurisdiction;
}

export * from './types';
