import { SUPPORTED_ROUTE_OPTIONS, type RouteOption } from '../content/registry';
import type { Person } from '../domain/workspace';

export interface PersonApplicationRouteViewProps {
  readonly person: Person;
  readonly onSelectRoute: (routeId: string) => void;
  readonly onBack: () => void;
  readonly isCreating?: boolean;
  readonly errorMessage?: string | null;
  readonly routeOptions?: readonly RouteOption[];
}

export function PersonApplicationRouteView({
  person,
  onSelectRoute,
  onBack,
  isCreating = false,
  errorMessage,
  routeOptions = SUPPORTED_ROUTE_OPTIONS
}: PersonApplicationRouteViewProps) {
  return (
    <section className="route-choice-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ margin: 0, marginBottom: '.35rem' }}>选择申请路线</h2>
          <p style={{ margin: 0, color: '#4b6269', fontSize: '0.95rem' }}>
            为申请人 <strong>{person.displayName}</strong> 创建新的签证申请
          </p>
        </div>
        <button type="button" className="secondary" onClick={onBack} disabled={isCreating}>
          返回申请中心
        </button>
      </div>

      {errorMessage ? (
        <div role="alert" className="hub-error-alert">
          <p>{errorMessage}</p>
        </div>
      ) : null}

      <div className="route-options">
        {routeOptions.map((option) => (
          <button
            key={option.routeId}
            type="button"
            className="route-option-btn"
            disabled={isCreating}
            onClick={() => onSelectRoute(option.routeId)}
          >
            <span className="route-option-title">{option.label}</span>
            <span className="route-option-desc">{option.description}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
