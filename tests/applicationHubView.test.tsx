import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ApplicationHubReadModel } from '../src/domain/applicationHub';
import { ApplicationHubView } from '../src/components/ApplicationHubView';

describe('ApplicationHubView Component', () => {
  it('renders one Person with one Application correctly', () => {
    const model: ApplicationHubReadModel = {
      people: [
        {
          personId: 'person-alice',
          displayName: 'Alice Smith',
          applications: [
            {
              applicationId: 'app-alice-1',
              applicantPersonId: 'person-alice',
              routeId: 'nz-student-fee-paying',
              routeLabel: '新西兰 · 自费学生签证',
              isRouteAvailable: true,
              isActive: true
            }
          ]
        }
      ],
      activeApplicationId: 'app-alice-1',
      hasActiveApplication: true,
      issues: []
    };

    render(
      <ApplicationHubView
        model={model}
        onBack={vi.fn()}
        onReturnToActiveApplication={vi.fn()}
      />
    );

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('新西兰 · 自费学生签证')).toBeInTheDocument();
    expect(screen.getByText('当前申请')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '返回此申请' })).toBeInTheDocument();
  });

  it('renders one Person with multiple Applications in order', () => {
    const model: ApplicationHubReadModel = {
      people: [
        {
          personId: 'person-alice',
          displayName: 'Alice Smith',
          applications: [
            {
              applicationId: 'app-1',
              applicantPersonId: 'person-alice',
              routeId: 'nz-student-fee-paying',
              routeLabel: '新西兰 · 自费学生签证',
              isRouteAvailable: true,
              isActive: true
            },
            {
              applicationId: 'app-2',
              applicantPersonId: 'person-alice',
              routeId: 'nz-visitor',
              routeLabel: '新西兰 · 访问签证',
              isRouteAvailable: true,
              isActive: false
            }
          ]
        }
      ],
      activeApplicationId: 'app-1',
      hasActiveApplication: true,
      issues: []
    };

    render(
      <ApplicationHubView
        model={model}
        onBack={vi.fn()}
        onReturnToActiveApplication={vi.fn()}
      />
    );

    expect(screen.getByText('新西兰 · 自费学生签证')).toBeInTheDocument();
    expect(screen.getByText('新西兰 · 访问签证')).toBeInTheDocument();
    expect(screen.getAllByText('当前申请')).toHaveLength(1);
  });

  it('renders multiple independent Persons', () => {
    const model: ApplicationHubReadModel = {
      people: [
        {
          personId: 'person-alice',
          displayName: 'Alice Smith',
          applications: [
            {
              applicationId: 'app-1',
              applicantPersonId: 'person-alice',
              routeId: 'nz-student-fee-paying',
              routeLabel: '新西兰 · 自费学生签证',
              isRouteAvailable: true,
              isActive: false
            }
          ]
        },
        {
          personId: 'person-bob',
          displayName: 'Bob Jones',
          applications: [
            {
              applicationId: 'app-2',
              applicantPersonId: 'person-bob',
              routeId: 'ca-study-permit',
              routeLabel: '加拿大 · 学习许可',
              isRouteAvailable: true,
              isActive: false
            }
          ]
        }
      ],
      activeApplicationId: null,
      hasActiveApplication: false,
      issues: []
    };

    render(
      <ApplicationHubView
        model={model}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    expect(screen.getByText('新西兰 · 自费学生签证')).toBeInTheDocument();
    expect(screen.getByText('加拿大 · 学习许可')).toBeInTheDocument();
  });

  it('preserves Person with zero Applications and shows neutral empty state', () => {
    const model: ApplicationHubReadModel = {
      people: [
        {
          personId: 'person-charlie',
          displayName: 'Charlie Brown',
          applications: []
        }
      ],
      activeApplicationId: null,
      hasActiveApplication: false,
      issues: []
    };

    render(
      <ApplicationHubView
        model={model}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText('Charlie Brown')).toBeInTheDocument();
    expect(screen.getByText('暂无申请')).toBeInTheDocument();
  });

  it('marks active Application clearly and does not falsely mark inactive applications as active', () => {
    const model: ApplicationHubReadModel = {
      people: [
        {
          personId: 'person-alice',
          displayName: 'Alice Smith',
          applications: [
            {
              applicationId: 'app-1',
              applicantPersonId: 'person-alice',
              routeId: 'nz-student-fee-paying',
              routeLabel: '新西兰 · 自费学生签证',
              isRouteAvailable: true,
              isActive: true
            },
            {
              applicationId: 'app-2',
              applicantPersonId: 'person-alice',
              routeId: 'nz-visitor',
              routeLabel: '新西兰 · 访问签证',
              isRouteAvailable: true,
              isActive: false
            }
          ]
        }
      ],
      activeApplicationId: 'app-1',
      hasActiveApplication: true,
      issues: []
    };

    render(
      <ApplicationHubView
        model={model}
        onBack={vi.fn()}
        onReturnToActiveApplication={vi.fn()}
      />
    );

    expect(screen.getAllByText('当前申请')).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: '返回此申请' })).toHaveLength(1);
  });

  it('renders unavailable route with protective badge and no open action, and does not render raw routeId', () => {
    const model: ApplicationHubReadModel = {
      people: [
        {
          personId: 'person-alice',
          displayName: 'Alice Smith',
          applications: [
            {
              applicationId: 'app-unknown',
              applicantPersonId: 'person-alice',
              routeId: 'future-visa-pack',
              routeLabel: '暂不可用的申请路线',
              isRouteAvailable: false,
              isActive: false
            }
          ]
        }
      ],
      activeApplicationId: null,
      hasActiveApplication: false,
      issues: []
    };

    render(
      <ApplicationHubView
        model={model}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText('暂不可用的申请路线')).toBeInTheDocument();
    expect(screen.getByText('该申请路线当前版本暂不可用')).toBeInTheDocument();
    expect(screen.queryByText(/future-visa-pack/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /返回此申请|打开/ })).not.toBeInTheDocument();
  });

  it('unavailable active Application does not render "返回此申请" action button', () => {
    const model: ApplicationHubReadModel = {
      people: [
        {
          personId: 'person-alice',
          displayName: 'Alice Smith',
          applications: [
            {
              applicationId: 'app-active-unavailable',
              applicantPersonId: 'person-alice',
              routeId: 'deprecated-route',
              routeLabel: '暂不可用的申请路线',
              isRouteAvailable: false,
              isActive: true
            }
          ]
        }
      ],
      activeApplicationId: 'app-active-unavailable',
      hasActiveApplication: true,
      issues: []
    };

    render(
      <ApplicationHubView
        model={model}
        onBack={vi.fn()}
        onReturnToActiveApplication={vi.fn()}
      />
    );

    expect(screen.getByText('当前申请')).toBeInTheDocument();
    expect(screen.getByText('该申请路线当前版本暂不可用')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '返回此申请' })).not.toBeInTheDocument();
    expect(screen.queryByText(/deprecated-route/)).not.toBeInTheDocument();
  });

  it('renders generic warning rather than internal enum text when integrity issues exist', () => {
    const model: ApplicationHubReadModel = {
      people: [
        {
          personId: 'person-alice',
          displayName: 'Alice Smith',
          applications: []
        }
      ],
      activeApplicationId: null,
      hasActiveApplication: false,
      issues: [
        {
          kind: 'duplicate_application_id',
          applicationId: 'app-dup',
          message: 'Duplicate applicationId "app-dup" found'
        },
        {
          kind: 'missing_person',
          applicationId: 'app-orphan',
          applicantPersonId: 'person-ghost',
          routeId: 'nz-visitor',
          message: 'Application "app-orphan" references non-existent person'
        }
      ]
    };

    render(
      <ApplicationHubView
        model={model}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('部分本地申请记录存在一致性问题，已暂时隐藏以避免误操作。')).toBeInTheDocument();

    // Verify raw enum names are not rendered in user-facing UI
    expect(screen.queryByText(/duplicate_application_id/)).not.toBeInTheDocument();
    expect(screen.queryByText(/missing_person/)).not.toBeInTheDocument();
    expect(screen.queryByText(/malformed_identity/)).not.toBeInTheDocument();
  });

  it('does not display raw internal IDs in the user-facing card content', () => {
    const model: ApplicationHubReadModel = {
      people: [
        {
          personId: 'person-internal-id-9988',
          displayName: 'Alice Smith',
          applications: [
            {
              applicationId: 'app-secret-token-1234',
              applicantPersonId: 'person-internal-id-9988',
              routeId: 'nz-student-fee-paying',
              routeLabel: '新西兰 · 自费学生签证',
              isRouteAvailable: true,
              isActive: false
            }
          ]
        }
      ],
      activeApplicationId: null,
      hasActiveApplication: false,
      issues: []
    };

    render(
      <ApplicationHubView
        model={model}
        onBack={vi.fn()}
      />
    );

    expect(screen.queryByText(/person-internal-id-9988/)).not.toBeInTheDocument();
    expect(screen.queryByText(/app-secret-token-1234/)).not.toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', () => {
    const onBack = vi.fn();
    const model: ApplicationHubReadModel = {
      people: [
        {
          personId: 'person-1',
          displayName: 'Alice',
          applications: [
            {
              applicationId: 'app-active-1',
              applicantPersonId: 'person-1',
              routeId: 'nz-student-fee-paying',
              routeLabel: '新西兰 · 自费学生签证',
              isRouteAvailable: true,
              isActive: true
            }
          ]
        }
      ],
      activeApplicationId: 'app-active-1',
      hasActiveApplication: true,
      issues: []
    };

    render(
      <ApplicationHubView
        model={model}
        onBack={onBack}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '返回当前申请' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('calls onReturnToActiveApplication when return to active button is clicked', () => {
    const onReturn = vi.fn();
    const model: ApplicationHubReadModel = {
      people: [
        {
          personId: 'person-alice',
          displayName: 'Alice Smith',
          applications: [
            {
              applicationId: 'app-active',
              applicantPersonId: 'person-alice',
              routeId: 'nz-student-fee-paying',
              routeLabel: '新西兰 · 自费学生签证',
              isRouteAvailable: true,
              isActive: true
            }
          ]
        }
      ],
      activeApplicationId: 'app-active',
      hasActiveApplication: true,
      issues: []
    };

    render(
      <ApplicationHubView
        model={model}
        onBack={vi.fn()}
        onReturnToActiveApplication={onReturn}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '返回此申请' }));
    expect(onReturn).toHaveBeenCalledTimes(1);
  });

  it('renders "打开申请" button for inactive available Application and calls onOpenApplication with applicationId', () => {
    const onOpen = vi.fn();
    const model: ApplicationHubReadModel = {
      people: [
        {
          personId: 'person-alice',
          displayName: 'Alice Smith',
          applications: [
            {
              applicationId: 'app-target-999',
              applicantPersonId: 'person-alice',
              routeId: 'nz-visitor',
              routeLabel: '新西兰 · 访问签证',
              isRouteAvailable: true,
              isActive: false
            }
          ]
        }
      ],
      activeApplicationId: 'app-active-111',
      hasActiveApplication: true,
      issues: []
    };

    render(
      <ApplicationHubView
        model={model}
        onBack={vi.fn()}
        onOpenApplication={onOpen}
      />
    );

    const openBtn = screen.getByRole('button', { name: '打开申请' });
    expect(openBtn).toBeInTheDocument();
    // Verify applicationId is not displayed in visible text
    expect(screen.queryByText(/app-target-999/)).not.toBeInTheDocument();

    fireEvent.click(openBtn);
    expect(onOpen).toHaveBeenCalledWith('app-target-999');
  });

  it('active Application does not show duplicate "打开申请" action', () => {
    const model: ApplicationHubReadModel = {
      people: [
        {
          personId: 'person-alice',
          displayName: 'Alice Smith',
          applications: [
            {
              applicationId: 'app-active',
              applicantPersonId: 'person-alice',
              routeId: 'nz-student-fee-paying',
              routeLabel: '新西兰 · 自费学生签证',
              isRouteAvailable: true,
              isActive: true
            }
          ]
        }
      ],
      activeApplicationId: 'app-active',
      hasActiveApplication: true,
      issues: []
    };

    render(
      <ApplicationHubView
        model={model}
        onBack={vi.fn()}
        onReturnToActiveApplication={vi.fn()}
        onOpenApplication={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: '返回此申请' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '打开申请' })).not.toBeInTheDocument();
  });

  it('opening state disables and relabels only the target action button', () => {
    const model: ApplicationHubReadModel = {
      people: [
        {
          personId: 'person-alice',
          displayName: 'Alice Smith',
          applications: [
            {
              applicationId: 'app-opening',
              applicantPersonId: 'person-alice',
              routeId: 'nz-visitor',
              routeLabel: '新西兰 · 访问签证',
              isRouteAvailable: true,
              isActive: false
            },
            {
              applicationId: 'app-other',
              applicantPersonId: 'person-alice',
              routeId: 'ca-study-permit',
              routeLabel: '加拿大 · 学习许可',
              isRouteAvailable: true,
              isActive: false
            }
          ]
        }
      ],
      activeApplicationId: 'app-current',
      hasActiveApplication: true,
      issues: []
    };

    render(
      <ApplicationHubView
        model={model}
        onBack={vi.fn()}
        onOpenApplication={vi.fn()}
        openingApplicationId="app-opening"
      />
    );

    const openingBtn = screen.getByRole('button', { name: '正在打开…' });
    expect(openingBtn).toBeDisabled();

    const otherBtn = screen.getByRole('button', { name: '打开申请' });
    expect(otherBtn).toBeDisabled();
  });

  it('renders generic error message when errorMessage prop is supplied', () => {
    const model: ApplicationHubReadModel = {
      people: [],
      activeApplicationId: null,
      hasActiveApplication: false,
      issues: []
    };

    render(
      <ApplicationHubView
        model={model}
        onBack={vi.fn()}
        errorMessage="无法打开该申请，本地申请记录可能不完整或与当前版本不兼容。"
      />
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('无法打开该申请，本地申请记录可能不完整或与当前版本不兼容。')).toBeInTheDocument();
    expect(screen.queryByText(/identity_mismatch|project_future/)).not.toBeInTheDocument();
  });

  it('renders "新增申请" button per Person and calls onCreateApplicationForPerson with personId', () => {
    const onCreate = vi.fn();
    const model: ApplicationHubReadModel = {
      people: [
        {
          personId: 'person-charlie-999',
          displayName: 'Charlie Brown',
          applications: []
        }
      ],
      activeApplicationId: null,
      hasActiveApplication: false,
      issues: []
    };

    render(
      <ApplicationHubView
        model={model}
        onBack={vi.fn()}
        onCreateApplicationForPerson={onCreate}
      />
    );

    const createBtn = screen.getByRole('button', { name: '新增申请' });
    expect(createBtn).toBeInTheDocument();
    expect(screen.queryByText(/person-charlie-999/)).not.toBeInTheDocument();

    fireEvent.click(createBtn);
    expect(onCreate).toHaveBeenCalledWith('person-charlie-999');
  });

  it('renders "删除申请" for both active and inactive applications when onDeleteApplication is passed', () => {
    const onDelete = vi.fn();
    const model: ApplicationHubReadModel = {
      people: [
        {
          personId: 'person-1',
          displayName: 'Alice',
          applications: [
            {
              applicationId: 'app-active',
              applicantPersonId: 'person-1',
              routeId: 'nz-student-fee-paying',
              routeLabel: '新西兰 · 自费学生签证',
              isRouteAvailable: true,
              isActive: true
            },
            {
              applicationId: 'app-inactive',
              applicantPersonId: 'person-1',
              routeId: 'nz-visitor',
              routeLabel: '新西兰 · 访问签证',
              isRouteAvailable: true,
              isActive: false
            }
          ]
        }
      ],
      activeApplicationId: 'app-active',
      hasActiveApplication: true,
      issues: []
    };

    render(
      <ApplicationHubView
        model={model}
        onBack={vi.fn()}
        onDeleteApplication={onDelete}
      />
    );

    const deleteButtons = screen.getAllByRole('button', { name: '删除申请' });
    expect(deleteButtons).toHaveLength(2);
  });

  it('active application delete requires inline confirmation with active-specific explanation', () => {
    const onDelete = vi.fn();
    const model: ApplicationHubReadModel = {
      people: [
        {
          personId: 'person-1',
          displayName: 'Alice',
          applications: [
            {
              applicationId: 'app-active-xyz',
              applicantPersonId: 'person-1',
              routeId: 'nz-student-fee-paying',
              routeLabel: '新西兰 · 自费学生签证',
              isRouteAvailable: true,
              isActive: true
            }
          ]
        }
      ],
      activeApplicationId: 'app-active-xyz',
      hasActiveApplication: true,
      issues: []
    };

    render(
      <ApplicationHubView
        model={model}
        onBack={vi.fn()}
        onDeleteApplication={onDelete}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '删除申请' }));

    expect(
      screen.getByText('确认删除当前申请？删除后将返回申请中心，其他申请和申请人资料不会被删除。')
    ).toBeInTheDocument();
    expect(screen.queryByText('app-active-xyz')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '确认删除' }));
    expect(onDelete).toHaveBeenCalledWith('app-active-xyz');
  });

  it('when no active Application exists (hasActiveApplication: false), "返回当前申请" header button is absent and no active chips are rendered', () => {
    const model: ApplicationHubReadModel = {
      people: [
        {
          personId: 'person-1',
          displayName: 'Alice',
          applications: [
            {
              applicationId: 'app-1',
              applicantPersonId: 'person-1',
              routeId: 'nz-visitor',
              routeLabel: '新西兰 · 访问签证',
              isRouteAvailable: true,
              isActive: false
            }
          ]
        }
      ],
      activeApplicationId: null,
      hasActiveApplication: false,
      issues: []
    };

    render(
      <ApplicationHubView
        model={model}
        onBack={vi.fn()}
        onOpenApplication={vi.fn()}
      />
    );

    // "返回当前申请" header button must be absent
    expect(screen.queryByRole('button', { name: '返回当前申请' })).not.toBeInTheDocument();
    // No "当前申请" chip rendered
    expect(screen.queryByText('当前申请')).not.toBeInTheDocument();
    // Inactive application has "打开申请"
    expect(screen.getByRole('button', { name: '打开申请' })).toBeInTheDocument();
  });

  it('renders "删除申请" for unavailable inactive applications', () => {
    const onDelete = vi.fn();
    const model: ApplicationHubReadModel = {
      people: [
        {
          personId: 'person-1',
          displayName: 'Alice',
          applications: [
            {
              applicationId: 'app-unavailable',
              applicantPersonId: 'person-1',
              routeId: 'future-route-xyz',
              routeLabel: '未来签证路线',
              isRouteAvailable: false,
              isActive: false
            }
          ]
        }
      ],
      activeApplicationId: null,
      hasActiveApplication: false,
      issues: []
    };

    render(
      <ApplicationHubView
        model={model}
        onBack={vi.fn()}
        onDeleteApplication={onDelete}
      />
    );

    expect(screen.getByText('该申请路线当前版本暂不可用')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '打开申请' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '删除申请' })).toBeInTheDocument();
  });

  it('requires explicit confirmation before calling onDeleteApplication and supports cancellation', () => {
    const onDelete = vi.fn();
    const model: ApplicationHubReadModel = {
      people: [
        {
          personId: 'person-1',
          displayName: 'Alice',
          applications: [
            {
              applicationId: 'app-target-secret-id',
              applicantPersonId: 'person-1',
              routeId: 'nz-visitor',
              routeLabel: '新西兰 · 访问签证',
              isRouteAvailable: true,
              isActive: false
            }
          ]
        }
      ],
      activeApplicationId: null,
      hasActiveApplication: false,
      issues: []
    };

    render(
      <ApplicationHubView
        model={model}
        onBack={vi.fn()}
        onDeleteApplication={onDelete}
      />
    );

    expect(screen.queryByText(/确认删除此申请/)).not.toBeInTheDocument();

    // Click "删除申请" to open confirmation
    fireEvent.click(screen.getByRole('button', { name: '删除申请' }));

    expect(screen.getByText('确认删除此申请？此操作会删除该申请在当前浏览器中的保存数据。')).toBeInTheDocument();
    expect(screen.queryByText('app-target-secret-id')).not.toBeInTheDocument();

    // Click "取消"
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    expect(screen.queryByText(/确认删除此申请/)).not.toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();

    // Open confirmation again and click "确认删除"
    fireEvent.click(screen.getByRole('button', { name: '删除申请' }));
    fireEvent.click(screen.getByRole('button', { name: '确认删除' }));

    expect(onDelete).toHaveBeenCalledWith('app-target-secret-id');
  });

  it('disables and displays "正在删除…" when deletingApplicationId matches', () => {
    const model: ApplicationHubReadModel = {
      people: [
        {
          personId: 'person-1',
          displayName: 'Alice',
          applications: [
            {
              applicationId: 'app-deleting-1',
              applicantPersonId: 'person-1',
              routeId: 'nz-visitor',
              routeLabel: '新西兰 · 访问签证',
              isRouteAvailable: true,
              isActive: false
            }
          ]
        }
      ],
      activeApplicationId: null,
      hasActiveApplication: false,
      issues: []
    };

    render(
      <ApplicationHubView
        model={model}
        onBack={vi.fn()}
        onDeleteApplication={vi.fn()}
        deletingApplicationId="app-deleting-1"
      />
    );

    const btn = screen.getByRole('button', { name: '正在删除…' });
    expect(btn).toBeInTheDocument();
    expect(btn).toBeDisabled();
  });

  it('renders progress summary and updated timestamp to disambiguate same-person same-route applications', () => {
    const model: ApplicationHubReadModel = {
      people: [
        {
          personId: 'person-alice',
          displayName: 'Alice Smith',
          applications: [
            {
              applicationId: 'app-student-1',
              applicantPersonId: 'person-alice',
              routeId: 'nz-student-fee-paying',
              routeLabel: '新西兰 · 自费学生签证',
              isRouteAvailable: true,
              isActive: true,
              progressSummary: '情况问卷 · 3 / 7',
              updatedAt: '2026-09-04T10:30:00.000Z',
              formattedUpdatedAt: '更新于 09-04 10:30'
            },
            {
              applicationId: 'app-student-2',
              applicantPersonId: 'person-alice',
              routeId: 'nz-student-fee-paying',
              routeLabel: '新西兰 · 自费学生签证',
              isRouteAvailable: true,
              isActive: false,
              progressSummary: '材料清单 · 5 / 20 已处理',
              updatedAt: '2026-09-02T15:00:00.000Z',
              formattedUpdatedAt: '更新于 09-02 15:00'
            }
          ]
        }
      ],
      activeApplicationId: 'app-student-1',
      hasActiveApplication: true,
      issues: []
    };

    render(
      <ApplicationHubView
        model={model}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText('情况问卷 · 3 / 7')).toBeInTheDocument();
    expect(screen.getByText('更新于 09-04 10:30')).toBeInTheDocument();
    expect(screen.getByText('材料清单 · 5 / 20 已处理')).toBeInTheDocument();
    expect(screen.getByText('更新于 09-02 15:00')).toBeInTheDocument();

    // Ensure raw IDs are not visible
    expect(screen.queryByText('app-student-1')).not.toBeInTheDocument();
    expect(screen.queryByText('app-student-2')).not.toBeInTheDocument();
    expect(screen.queryByText('person-alice')).not.toBeInTheDocument();
  });

  it('renders "‹ 首页" button and invokes onNavigateHome when clicked', () => {
    const onNavigateHome = vi.fn();
    const model: ApplicationHubReadModel = {
      people: [
        {
          personId: 'person-1',
          displayName: 'Alice',
          applications: []
        }
      ],
      activeApplicationId: null,
      hasActiveApplication: false,
      issues: []
    };

    render(
      <ApplicationHubView
        model={model}
        onNavigateHome={onNavigateHome}
      />
    );

    const homeBtn = screen.getByRole('button', { name: '返回首页' });
    expect(homeBtn).toHaveTextContent('‹ 首页');

    fireEvent.click(homeBtn);
    expect(onNavigateHome).toHaveBeenCalledTimes(1);
  });

  it('renders "+ 新增申请人" button and handles inline person creation', async () => {
    const onCreatePerson = vi.fn();
    const model: ApplicationHubReadModel = {
      people: [
        {
          personId: 'person-1',
          displayName: 'Alice',
          applications: []
        }
      ],
      activeApplicationId: null,
      hasActiveApplication: false,
      issues: []
    };

    render(
      <ApplicationHubView
        model={model}
        onCreatePerson={onCreatePerson}
      />
    );

    const addPersonBtn = screen.getByRole('button', { name: '+ 新增申请人' });
    expect(addPersonBtn).toBeInTheDocument();

    fireEvent.click(addPersonBtn);

    // Now inline card is shown
    expect(screen.getByText('新增申请人')).toBeInTheDocument();
    const input = screen.getByPlaceholderText('例如：张三、Alice');
    expect(input).toBeInTheDocument();

    // Try submit empty name
    const submitBtn = screen.getByRole('button', { name: '创建并选择路线' });
    fireEvent.click(submitBtn);
    expect(screen.getByText('请输入申请人的姓名或称呼。')).toBeInTheDocument();
    expect(onCreatePerson).not.toHaveBeenCalled();

    // Type valid name and submit
    fireEvent.change(input, { target: { value: 'Bob Jones' } });
    fireEvent.click(submitBtn);
    expect(onCreatePerson).toHaveBeenCalledWith('Bob Jones');
  });

  it('renders person with zero applications with "暂无申请" and "新增申请" button', () => {
    const onCreateApplicationForPerson = vi.fn();
    const model: ApplicationHubReadModel = {
      people: [
        {
          personId: 'person-charlie',
          displayName: 'Charlie',
          applications: []
        }
      ],
      activeApplicationId: null,
      hasActiveApplication: false,
      issues: []
    };

    render(
      <ApplicationHubView
        model={model}
        onCreateApplicationForPerson={onCreateApplicationForPerson}
      />
    );

    expect(screen.getByText('Charlie')).toBeInTheDocument();
    expect(screen.getByText('暂无申请')).toBeInTheDocument();

    const addAppBtn = screen.getByRole('button', { name: '新增申请' });
    expect(addAppBtn).toBeInTheDocument();

    fireEvent.click(addAppBtn);
    expect(onCreateApplicationForPerson).toHaveBeenCalledWith('person-charlie');
  });
});
