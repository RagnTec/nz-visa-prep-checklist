import React, { useState } from 'react';
import type { RouteJurisdictionGroup } from '../content/registry';

export interface RouteSelectionGroupsProps {
  readonly groups: readonly RouteJurisdictionGroup[];
  readonly onSelectRoute: (routeId: string) => void;
  readonly disabled?: boolean;
}

export function RouteSelectionGroups({
  groups,
  onSelectRoute,
  disabled = false
}: RouteSelectionGroupsProps) {
  const [expandedJurisdiction, setExpandedJurisdiction] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const toggleJurisdiction = (jurisdiction: string) => {
    if (expandedJurisdiction === jurisdiction) {
      setExpandedJurisdiction(null);
      setExpandedCategory(null);
    } else {
      setExpandedJurisdiction(jurisdiction);
      setExpandedCategory(null);
    }
  };

  const toggleCategory = (category: string) => {
    if (expandedCategory === category) {
      setExpandedCategory(null);
    } else {
      setExpandedCategory(category);
    }
  };

  const activeGroup = groups.find((g) => g.jurisdiction === expandedJurisdiction);
  const activeCategoryGroup = activeGroup?.categories.find(
    (c) => c.routeCategory === expandedCategory
  );

  return (
    <div className="route-selection-groups">
      <div className="route-jurisdiction-grid" role="group" aria-label="按国家或地区选择">
        {groups.map((group) => {
          const isJurisdictionExpanded = expandedJurisdiction === group.jurisdiction;
          const jurisdictionTriggerId = `jurisdiction-trigger-${group.jurisdiction}`;
          const jurisdictionPanelId = `jurisdiction-panel-${group.jurisdiction}`;

          return (
            <button
              key={group.jurisdiction}
              type="button"
              id={jurisdictionTriggerId}
              className={`route-disclosure-trigger route-jurisdiction-trigger ${
                isJurisdictionExpanded ? 'is-expanded' : ''
              }`}
              aria-expanded={isJurisdictionExpanded}
              aria-controls={jurisdictionPanelId}
              disabled={disabled}
              onClick={() => toggleJurisdiction(group.jurisdiction)}
            >
              <span className="route-disclosure-label">{group.jurisdictionLabel}</span>
              <span className="route-disclosure-chevron" aria-hidden="true">
                {isJurisdictionExpanded ? '▾' : '›'}
              </span>
            </button>
          );
        })}
      </div>

      {activeGroup ? (
        <div
          key={activeGroup.jurisdiction}
          id={`jurisdiction-panel-${activeGroup.jurisdiction}`}
          role="region"
          aria-labelledby={`jurisdiction-trigger-${activeGroup.jurisdiction}`}
          className="route-jurisdiction-panel"
        >
          <div className="route-active-jurisdiction-header">
            <span className="route-active-jurisdiction-title">{activeGroup.jurisdictionLabel}</span>
          </div>

          <div
            className="route-category-grid"
            role="group"
            aria-label={`${activeGroup.jurisdictionLabel} 路线分类`}
          >
            {activeGroup.categories.map((catGroup) => {
              const isCategoryExpanded = expandedCategory === catGroup.routeCategory;
              const categoryTriggerId = `category-trigger-${activeGroup.jurisdiction}-${catGroup.routeCategory}`;
              const categoryPanelId = `category-panel-${activeGroup.jurisdiction}-${catGroup.routeCategory}`;

              return (
                <button
                  key={catGroup.routeCategory}
                  type="button"
                  id={categoryTriggerId}
                  className={`route-disclosure-trigger route-category-trigger ${
                    isCategoryExpanded ? 'is-expanded' : ''
                  }`}
                  aria-expanded={isCategoryExpanded}
                  aria-controls={categoryPanelId}
                  disabled={disabled}
                  onClick={() => toggleCategory(catGroup.routeCategory)}
                >
                  <span className="route-disclosure-label">{catGroup.categoryLabel}</span>
                  <span className="route-disclosure-chevron" aria-hidden="true">
                    {isCategoryExpanded ? '▾' : '›'}
                  </span>
                </button>
              );
            })}
          </div>

          {activeCategoryGroup ? (
            <div
              id={`category-panel-${activeGroup.jurisdiction}-${activeCategoryGroup.routeCategory}`}
              role="region"
              aria-labelledby={`category-trigger-${activeGroup.jurisdiction}-${activeCategoryGroup.routeCategory}`}
              className="route-category-panel"
            >
              <div className="route-options">
                {activeCategoryGroup.options.map((option) => {
                  const accessibleName = `${activeGroup.jurisdictionLabel} · ${activeCategoryGroup.categoryLabel} · ${option.displayName}${
                    option.eyebrow ? ` · ${option.eyebrow}` : ''
                  }`;

                  return (
                    <button
                      key={option.routeId}
                      type="button"
                      className="route-option-btn"
                      aria-label={accessibleName}
                      disabled={disabled}
                      onClick={() => onSelectRoute(option.routeId)}
                    >
                      <span className="route-option-title">{option.displayName}</span>
                      {option.eyebrow ? (
                        <span className="route-option-official">{option.eyebrow}</span>
                      ) : null}
                      <span className="route-option-desc">{option.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
