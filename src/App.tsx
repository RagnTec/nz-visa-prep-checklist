import { useEffect, useMemo, useRef, useState } from 'react';
import { Model, SurveyError } from 'survey-core';
import { Survey } from 'survey-react-ui';
import questions from './content/nz/student-fee-paying/questions.zh-CN.json';
import checklistItemsJson from './content/nz/student-fee-paying/checklist-items.zh-CN.json';
import rulesJson from './content/nz/student-fee-paying/rules.json';
import sourcesJson from './content/nz/student-fee-paying/sources.json';
import {
  evaluateQuestionEffects,
  immediateQuestionEffectFields,
  removeHiddenFamilyRouteAnswers
} from './content/nz/student-fee-paying/questionEffects';
import { generateChecklist } from './domain/checklist';
import { normalizeSurveyAnswers } from './domain/answers';
import {
  CURRENT_SAVED_PROJECT_SCHEMA_VERSION,
  type ChecklistItem,
  type ChecklistRule,
  type ChecklistStatus,
  type OfficialSource,
  type SavedProject
} from './domain/types';
import { deleteProject, loadProject, saveProject } from './storage/db';
import type { SavedProjectReadResult } from './storage/projectMigration';
import { clearSavedScrollPosition } from './storage/uiScroll';
import { ChecklistView } from './components/ChecklistView';
import { TrialDisclosure } from './components/TrialDisclosure';

const checklistItems = checklistItemsJson as ChecklistItem[];
const rules = rulesJson as ChecklistRule[];
const sources = sourcesJson as OfficialSource[];
const storageUnavailableMessage = '无法使用浏览器本地存储。你仍可继续使用，但本次内容可能无法自动保存。';
const restartFailedMessage = '无法清除浏览器中的旧项目。请检查浏览器存储设置后重试。';
const materialProfileMessage = '请补充以下材料背景信息，以生成完整清单。已有答案和清单状态会保留。';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function flattenSurveyAnswers(
  answers: Record<string, unknown>,
  prefix = ''
): Record<string, unknown> {
  const flattened: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(answers)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isRecord(value)) {
      Object.assign(flattened, flattenSurveyAnswers(value, path));
    } else {
      flattened[path] = value;
    }
  }
  return flattened;
}

function mergeAnswerRecords(
  current: Record<string, unknown>,
  updates: Record<string, unknown>
): Record<string, unknown> {
  const merged = { ...current };
  for (const [key, value] of Object.entries(updates)) {
    merged[key] = isRecord(value) && isRecord(current[key])
      ? mergeAnswerRecords(current[key] as Record<string, unknown>, value)
      : value;
  }
  return merged;
}

function downloadProject(project: SavedProject) {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'nz-student-visa-checklist.json';
  link.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [answers, setAnswers] = useState<Record<string, unknown> | null>(null);
  const [statuses, setStatuses] = useState<Record<string, ChecklistStatus>>({});
  const [compatibilityProject, setCompatibilityProject] = useState<
    Extract<SavedProjectReadResult, { kind: 'future' | 'invalid' }> | null
  >(null);
  const [restored, setRestored] = useState(false);
  const [storageMessage, setStorageMessage] = useState<string | null>(null);
  const pendingSave = useRef<Promise<void>>(Promise.resolve());
  const persistedProjectBase = useRef<Record<string, unknown>>({});
  const restartActive = useRef(false);
  const restartOperation = useRef<Promise<void> | null>(null);
  const isNewGenerationRef = useRef(false);
  const mounted = useRef(true);

  const survey = useMemo(() => {
    const model = new Model(questions);
    model.onValidateQuestion.add((sender, options) => {
      const { validationErrors, warnings } = evaluateQuestionEffects(
        normalizeSurveyAnswers(sender.data as Record<string, unknown>)
      );
      options.error = validationErrors[options.name] ?? '';
      const warning = warnings[options.name];
      if (warning && !options.error) {
        const surveyWarning = new SurveyError(warning, options.question);
        surveyWarning.notificationType = 'warning';
        options.errors.push(surveyWarning);
      }
    });
    model.onValueChanged.add((sender, options) => {
      if (!immediateQuestionEffectFields.some((field) => field === options.name)) return;

      const { validationErrors, warnings } = evaluateQuestionEffects(
        normalizeSurveyAnswers(sender.data as Record<string, unknown>)
      );
      immediateQuestionEffectFields.forEach((name) => {
        const question = sender.getQuestionByName(name);
        if (!question) return;

        const message = validationErrors[name];
        const warning = warnings[name];
        const immediateError = new SurveyError(message ?? warning ?? '', question);
        if (!message && warning) immediateError.notificationType = 'warning';
        question.errors = message || warning ? [immediateError] : [];
      });
    });
    model.onComplete.add((sender) => {
      isNewGenerationRef.current = true;
      const completedAnswers = removeHiddenFamilyRouteAnswers(
        normalizeSurveyAnswers(sender.data as Record<string, unknown>)
      );
      setAnswers((current) => removeHiddenFamilyRouteAnswers(
        current ? mergeAnswerRecords(current, completedAnswers) : completedAnswers
      ));
    });
    return model;
  }, []);

  useEffect(() => {
    let active = true;
    mounted.current = true;

    void (async () => {
      try {
        const loaded = await loadProject();
        if (active && loaded) {
          if (loaded.kind === 'current') {
            persistedProjectBase.current = loaded.project;
            const normalizedAnswers = removeHiddenFamilyRouteAnswers(
              normalizeSurveyAnswers(loaded.project.answers)
            );
            setAnswers(normalizedAnswers);
            setStatuses(loaded.project.statuses);
            survey.data = flattenSurveyAnswers(normalizedAnswers);
            const effects = evaluateQuestionEffects(normalizedAnswers);
            const derived = effects.answersForChecklist._effects as Record<string, unknown>;
            if (derived.materialProfileIncomplete === true) {
              const pageIndex = survey.pages.findIndex((page) => page.name === 'material-background');
              if (pageIndex >= 0) survey.currentPageNo = pageIndex;
            }
          } else {
            setCompatibilityProject(loaded);
          }
        }
      } catch {
        if (active) setStorageMessage(storageUnavailableMessage);
      } finally {
        if (active) setRestored(true);
      }
    })();

    return () => {
      active = false;
      mounted.current = false;
    };
  }, [survey]);

  const materialProfileIncomplete = useMemo(() => {
    if (!answers) return false;
    const effects = evaluateQuestionEffects(answers);
    const derived = effects.answersForChecklist._effects as Record<string, unknown>;
    return derived.materialProfileIncomplete === true;
  }, [answers]);

  const items = useMemo(() => {
    if (!answers || materialProfileIncomplete) return [];
    return generateChecklist(
      evaluateQuestionEffects(normalizeSurveyAnswers(answers), {
        checklistGenerated: true
      }).answersForChecklist,
      checklistItems,
      rules
    );
  }, [answers, materialProfileIncomplete]);

  useEffect(() => {
    if (
      !answers
      || materialProfileIncomplete
      || compatibilityProject
      || restartActive.current
    ) return;
    const project: SavedProject = {
      ...persistedProjectBase.current,
      id: 'default',
      schemaVersion: CURRENT_SAVED_PROJECT_SCHEMA_VERSION,
      answers,
      statuses,
      updatedAt: new Date().toISOString()
    };
    pendingSave.current = pendingSave.current
      .then(() => saveProject(project))
      .catch(() => {
        if (mounted.current) setStorageMessage(storageUnavailableMessage);
      });
  }, [answers, compatibilityProject, materialProfileIncomplete, statuses]);

  function restartProject(): Promise<void> {
    if (restartOperation.current) return restartOperation.current;

    restartActive.current = true;
    const queuedSaves = pendingSave.current;

    const operation = (async () => {
      await queuedSaves;

      try {
        await deleteProject();
      } catch {
        if (mounted.current) setStorageMessage(restartFailedMessage);
        return;
      }

      if (mounted.current) {
        persistedProjectBase.current = {};
        setAnswers(null);
        setStatuses({});
        setCompatibilityProject(null);
        setStorageMessage(null);
        clearSavedScrollPosition('default');
        isNewGenerationRef.current = false;
        survey.clear();
        survey.currentPageNo = 0;
      }
    })().finally(() => {
      restartActive.current = false;
      restartOperation.current = null;
    });

    restartOperation.current = operation;
    return operation;
  }

  function exportProject() {
    if (compatibilityProject) {
      downloadProject(compatibilityProject.project);
      return;
    }
    if (!answers || materialProfileIncomplete) return;
    const project: SavedProject = {
      ...persistedProjectBase.current,
      id: 'default',
      schemaVersion: CURRENT_SAVED_PROJECT_SCHEMA_VERSION,
      answers,
      statuses,
      updatedAt: new Date().toISOString()
    };
    downloadProject(project);
  }

  if (!restored) return <p className="loading">正在读取本地项目…</p>;

  if (compatibilityProject) {
    const message = compatibilityProject.kind === 'future'
      ? `此本地项目由较新版本创建（版本 ${compatibilityProject.schemaVersion}），当前版本最多支持版本 ${CURRENT_SAVED_PROJECT_SCHEMA_VERSION}。为避免覆盖数据，本项目已以只读方式打开。`
      : '此本地项目的版本信息无效。为避免覆盖数据，本项目已以只读方式打开。';
    return (
      <main className="app-shell">
        <TrialDisclosure />
        <section className="compatibility-card">
          <h1>本地项目只读保护</h1>
          <p>{message}</p>
          {storageMessage ? <p role="alert">{storageMessage}</p> : null}
          <div className="actions">
            <button type="button" onClick={exportProject}>原样导出备份</button>
            <button type="button" className="secondary" onClick={restartProject}>删除并重新开始</button>
          </div>
        </section>
      </main>
    );
  }

  if (answers && !materialProfileIncomplete) {
    return (
      <>
        {storageMessage ? <p role="alert">{storageMessage}</p> : null}
        <ChecklistView
          items={items}
          statuses={statuses}
          sources={sources}
          onStatusChange={(id, status) => setStatuses((current) => ({ ...current, [id]: status }))}
          onRestart={restartProject}
          onExport={exportProject}
          isNewGeneration={isNewGenerationRef.current}
          projectId="default"
        />
      </>
    );
  }

  return (
    <main className="app-shell">
      <TrialDisclosure />
      <section className="hero">
        <p className="eyebrow">本地优先 · 官方来源可追溯</p>
        <h1>新西兰学签材料准备清单</h1>
        <p>回答少量关键问题，生成与你情况相关的Fee Paying Student Visa准备任务。你的答案只保存在当前浏览器。</p>
      </section>
      <section className="survey-card">
        {storageMessage ? <p role="alert">{storageMessage}</p> : null}
        {materialProfileIncomplete ? <p role="status">{materialProfileMessage}</p> : null}
        <Survey model={survey} />
      </section>
      <footer>本工具不评估签证资格或申请风险，不预测申请结果，不判断哪些信息应披露或省略，也不会替你生成说明信。请以当前 INZ 官方指引和在线申请要求为准；如需结合个人情况获得移民建议，请咨询新西兰持牌移民顾问或依法可提供相关建议的人士。</footer>
    </main>
  );
}
