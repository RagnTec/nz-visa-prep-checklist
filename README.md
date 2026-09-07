# Visa Prep Checklist

[English](#english) · [中文](#中文)

---

## English

A local-first workspace for preparing visa applications.

It turns route-specific questions into a structured preparation workflow, helping applicants organize application context, track multiple applications, and generate personalized document checklists without sending personal application data to a project backend.

Live Demo:
[https://ragntec.github.io/nz-visa-prep-checklist/](https://ragntec.github.io/nz-visa-prep-checklist/)

> **Disclaimer**
> This is an independent preparation tool, not an official immigration service and not legal or immigration advice.

---

### What it does

- **Guided route-specific questionnaires**: Collects factual background questions tailored to specific visa routes.
- **Personalized checklists**: Generates deterministic, circumstance-dependent preparation checklists using pure rule evaluation.
- **Multiple applicants & multiple applications**: Supports managing multiple applicants and separate applications within a single local workspace.
- **Application Hub**: Provides an overview of all applicants, their associated visa applications, and active preparation progress.
- **Per-application survey resume continuity**: Automatically preserves questionnaire progression per application so you can pick up where you left off.
- **Browser-local storage**: Keeps all user responses and progress strictly inside the browser without requiring an account.

### Current application routes

The public workspace currently includes support for:

- **New Zealand Fee Paying Student Visa**
- **New Zealand Visitor Visa** (tourism, family visits, and short-term study)
- **Canada Study Permit**

Each route owns its own questionnaire, checklist logic, rules, and official sources. Additional routes can be integrated through the route configuration architecture.

### How it works

1. **Create or select an applicant**: Start by identifying who is applying.
2. **Choose an application route**: Select a supported visa route for that applicant.
3. **Complete the guided questionnaire**: Answer factual questions regarding study, travel dates, funding, and background.
4. **Review and manage the generated preparation checklist**: Track tasks, review official requirements, filter items, and export or print your checklist.

Multiple applications remain separate and distinct even when they belong to the same applicant.

### Privacy by design

- **Local-first storage**: Questionnaire answers and checklist progress are saved exclusively in your browser via IndexedDB (`nzVisaPrepChecklist`) and localStorage.
- **No account or backend**: There are no servers, user accounts, databases, or cloud sync services attached to this project.
- **Zero background tracking**: No analytics, telemetry, or error-reporting beacons are loaded.
- **Data retention**: Because storage is local, clearing this site's browser data or local storage may remove saved progress. You can export a JSON backup at any time.
- **Sanitized public release**: The public repository excludes internal development history, private test fixtures, and administrative tooling.

For details, see [`docs/privacy.md`](docs/privacy.md).

### Current limitations

- **Selected routes only**: Only specific visa routes are currently implemented.
- **Policy changes**: Immigration policies and requirements are subject to change by government authorities. Always verify requirements against live official publications.
- **Not exhaustive for every situation**: While rules cover common and complex scenarios, individual circumstances may require additional evidence or professional guidance.
- **Device-specific**: Progress does not synchronize across devices or browsers unless exported and imported manually.
- **No official submission**: This tool organizes preparation materials but does not submit applications to immigration departments.
- **Not immigration advice**: It does not assess eligibility, recommend routes, predict outcomes, or replace licensed immigration advisers or lawyers.

### Sources and methodology

- [`docs/content_sources.md`](docs/content_sources.md): How official requirements are sourced, verified, and mapped.
- [`docs/product_scope.md`](docs/product_scope.md): Product scope, supported features, and regulatory non-goals.

All route content is derived from documented public first-party government publications (such as Immigration New Zealand and Immigration, Refugees and Citizenship Canada) and implemented as explicit, unit-tested rules.

### Run locally

#### Prerequisites

- Node.js 20+ (Node.js 22 recommended)
- npm 10+

#### Setup and Development

```bash
npm install
npm run dev
```

Open `http://localhost:5173/` in your browser.

#### Build and Verification

```bash
npm run typecheck
npm test
npm run build
```

### Public release provenance

This public demo repository is generated from a sanitized canonical source snapshot.

- Machine-readable release provenance is tracked in [`PUBLIC_RELEASE.json`](PUBLIC_RELEASE.json).
- Maintainer-facing cross-repository compatibility notes are documented in [`DEMO_PROJECT_HANDOFF.md`](DEMO_PROJECT_HANDOFF.md).

### Disclaimer

This tool is an independent, non-governmental preparation aid. It does not provide legal or immigration advice, does not assess visa eligibility, does not guarantee visa outcomes, and is not affiliated with or endorsed by Immigration New Zealand, Immigration, Refugees and Citizenship Canada, or any government agency. For official guidance, refer to government immigration portals or consult a licensed professional.

### License

This project is licensed under the [MIT License](LICENSE). Third-party dependencies and notices are detailed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

---

## 中文

一个面向签证材料准备的本地优先工作区。

它将特定路线的背景问答转化为结构化的材料准备流程，帮助申请人管理申请背景、追踪多份申请，并生成个性化材料清单，全程无需向项目后端传输个人申请数据。

在线演示：
[https://ragntec.github.io/nz-visa-prep-checklist/](https://ragntec.github.io/nz-visa-prep-checklist/)

> **免责声明**
> 本项目为独立的签证材料准备辅助工具，并非官方移民机构，亦不提供法律或移民建议。

---

### 功能特性

- **路线专属引导式问卷**：收集针对具体签证路线的事实性背景信息。
- **个性化材料清单**：基于纯函数规则计算，根据问卷答案确定性生成针对具体情况的材料清单。
- **多申请人与多申请管理**：支持在单个本地工作区中管理多个申请人及其各自独立的签证申请。
- **申请中心**：集中展示所有申请人、名下签证申请及其材料准备进度的全局概览。
- **问卷断点续答**：按申请自动保存问卷作答进度，重新打开或切换申请时即可无缝恢复。
- **浏览器本地存储**：所有问答与清单进度严格保存在浏览器本地，无需注册或登录账户。

### 当前支持路线

公开工作区目前支持以下申请路线：

- **新西兰自费学生签证（Fee Paying Student Visa）**
- **新西兰访问签证（Visitor Visa）**（旅游、探亲与短期进修）
- **加拿大 Study Permit**

每条路线拥有独立的问卷配置、清单逻辑、判定规则与官方信息源。系统架构支持通过路线配置持续扩展新路线。

### 使用流程

1. **创建或选择申请人**：确定申请主体身份。
2. **选择申请路线**：为该申请人指定适用的签证路线。
3. **完成引导式问卷**：根据实际情况如实填写学习、旅行日期、资金来源等背景信息。
4. **管理与对照材料清单**：逐项核对官方要求、筛选任务、标记状态，并支持导出或打印材料清单。

同一申请人名下的多份申请相互独立，互不干扰。

### 隐私设计

- **本地优先存储**：问卷答案与清单进度均保存在本地浏览器中（通过 IndexedDB 的 `nzVisaPrepChecklist` 数据库及 localStorage）。
- **无账户与后端服务**：本项目不设后端服务器、用户账户系统、云端数据库或同步服务。
- **零后台追踪**：不加载任何数据统计、遥测打点或错误收集探针。
- **数据保留与清理**：由于数据存储于本地，清除该站点的浏览器数据或本地存储后，已保存的本地进度可能被删除。用户可随时导出 JSON 备份。
- **公开版本脱敏发布**：公开演示仓库已剔除内部开发记录、私有测试用例与管理脚本。

更多详情请参阅 [`docs/privacy.md`](docs/privacy.md)。

### 当前局限

- **仅限指定路线**：目前仅支持已实现的签证路线。
- **政策时效变动**：移民部门政策与法规可能动态调整，递签前请务必对照官方最新公布要求进行核对。
- **无法穷尽所有特例**：规则引擎覆盖了常见与复合场景，但个案特殊情况可能需要额外证明文件或专业指导。
- **设备局限**：进度保存在当前浏览器内，跨设备或跨浏览器需通过手动导出与导入。
- **不负责官方递交**：本工具仅协助整理材料，不代为向移民部门递交申请。
- **不构成移民建议**：不评估签证获批概率、不推荐签证种类、不预测审核结果，亦不能替代持牌移民顾问或专业律师的法律服务。

### 资料来源与编制方法

- [`docs/content_sources.md`](docs/content_sources.md)：官方要求的引用、核实与映射机制说明。
- [`docs/product_scope.md`](docs/product_scope.md)：产品边界、支持能力与合规非目标。

各路线内容均基于主管政府部门的第一方公开资料整理，并通过显式规则实现。

### 本地运行

#### 环境要求

- Node.js 20+（推荐 Node.js 22）
- npm 10+

#### 安装与启动

```bash
npm install
npm run dev
```

在浏览器中打开 `http://localhost:5173/`。

#### 构建与测试验证

```bash
npm run typecheck
npm test
npm run build
```

### 公开版本溯源

本公开演示仓库由脱敏后的标准开发分支快照自动生成。

- 机器可读的发布溯源信息请查看 [`PUBLIC_RELEASE.json`](PUBLIC_RELEASE.json)。
- 维护者维度的跨仓库兼容性说明请参阅 [`DEMO_PROJECT_HANDOFF.md`](DEMO_PROJECT_HANDOFF.md)。

### 免责声明

本工具为独立的非官方材料准备辅助工具，不提供法律或移民建议，不评估申请人资格，不担保签证结果，亦与新西兰移民局、加拿大移民、难民及公民部或任何政府机构无隶属或背书关系。如需权威信息，请访问政府移民官网或咨询持牌专业人士。

### 开源许可

本项目遵循 [MIT License](LICENSE)。第三方依赖与声明详见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
