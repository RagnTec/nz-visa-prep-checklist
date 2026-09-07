import React, { useEffect, useMemo, useRef } from 'react';
import 'survey-core/survey-core.min.css';
import { Model, SurveyError } from 'survey-core';
import { Survey } from 'survey-react-ui';
import type { RoutePack } from '../domain/route';
import { normalizeSurveyAnswers } from '../domain/answers';
import { getSavedSurveyPage, setSavedSurveyPage } from '../storage/uiSurveyPage';

export interface SurveyProgress {
  readonly currentStep: number;
  readonly totalSteps: number;
  readonly summary: string;
}

export interface SurveyWorkflowViewProps {
  readonly activeRoutePack: RoutePack;
  readonly activeProjectId: string | null;
  readonly answers: Record<string, unknown> | null;
  readonly surveyCompleted: boolean;
  readonly materialProfileIncomplete?: boolean;
  readonly onAnswersChange: (draftAnswers: Record<string, unknown>) => void;
  readonly onSurveyComplete: (completedAnswers: Record<string, unknown>) => void;
  readonly onProgressChange: (progress: SurveyProgress | null) => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

function calculateSurveyStepProgress(model: Model | null): SurveyProgress | null {
  if (!model) return null;
  const visiblePages = model.visiblePages;
  if (!visiblePages || visiblePages.length === 0) return null;
  const currentPage = model.currentPage;
  const currentIndex = currentPage ? visiblePages.indexOf(currentPage) : model.currentPageNo;
  const currentStep = currentIndex >= 0 ? currentIndex + 1 : 1;
  return {
    currentStep,
    totalSteps: visiblePages.length,
    summary: `情况问卷 · ${currentStep} / ${visiblePages.length}`
  };
}

export default function SurveyWorkflowView({
  activeRoutePack,
  activeProjectId,
  answers,
  surveyCompleted,
  materialProfileIncomplete,
  onAnswersChange,
  onSurveyComplete,
  onProgressChange
}: SurveyWorkflowViewProps) {
  const initializedSurveyRef = useRef<Model | null>(null);
  const answersRef = useRef<Record<string, unknown> | null>(answers);
  answersRef.current = answers;

  const onAnswersChangeRef = useRef(onAnswersChange);
  onAnswersChangeRef.current = onAnswersChange;

  const onSurveyCompleteRef = useRef(onSurveyComplete);
  onSurveyCompleteRef.current = onSurveyComplete;

  const onProgressChangeRef = useRef(onProgressChange);
  onProgressChangeRef.current = onProgressChange;

  const activeProjectIdRef = useRef(activeProjectId);
  activeProjectIdRef.current = activeProjectId;

  const survey = useMemo(() => {
    const model = new Model(activeRoutePack.questions);
    model.showProgressBar = 'off';
    const immediateFields = activeRoutePack.immediateEffectFields ?? [];
    const cleanAnswers = activeRoutePack.cleanStaleAnswers ?? ((a) => a);

    if (answersRef.current) {
      model.data = flattenSurveyAnswers(answersRef.current);
    }

    if (!surveyCompleted) {
      const savedPageName = activeProjectIdRef.current
        ? getSavedSurveyPage(activeProjectIdRef.current)
        : null;
      const visiblePages = model.visiblePages ?? [];

      const targetPage = savedPageName && typeof model.getPageByName === 'function'
        ? model.getPageByName(savedPageName)
        : null;
      if (targetPage && visiblePages.includes(targetPage)) {
        model.currentPage = targetPage;
      } else if (answersRef.current && Object.keys(answersRef.current).length > 0) {
        const incompletePage = visiblePages.find((page) => {
          return (page.questions ?? []).some((q) => {
            if (!q.isVisible || !q.isRequired) return false;
            return typeof q.isEmpty === 'function' ? q.isEmpty() : false;
          });
        });
        if (incompletePage) {
          model.currentPage = incompletePage;
        } else {
          model.currentPageNo = 0;
        }
      } else {
        model.currentPageNo = 0;
      }
    }

    model.onValidateQuestion.add((sender, options) => {
      const { validationErrors, warnings } = activeRoutePack.evaluateEffects(
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
      const normalized = normalizeSurveyAnswers(sender.data as Record<string, unknown>);
      const draftAnswers = cleanAnswers(normalized);
      onAnswersChangeRef.current(draftAnswers);

      if (!immediateFields.some((field) => field === options.name)) return;

      const { validationErrors, warnings } = activeRoutePack.evaluateEffects(normalized);
      immediateFields.forEach((name) => {
        const question = sender.getQuestionByName(name);
        if (!question) return;

        const message = validationErrors[name];
        const warning = warnings[name];
        const immediateError = new SurveyError(message ?? warning ?? '', question);
        if (!message && warning) immediateError.notificationType = 'warning';
        question.errors = message || warning ? [immediateError] : [];
      });

      const stepProgress = calculateSurveyStepProgress(sender);
      onProgressChangeRef.current(stepProgress);
    });

    if (model.onCurrentPageChanged && typeof model.onCurrentPageChanged.add === 'function') {
      model.onCurrentPageChanged.add((sender) => {
        const currentPage = sender.currentPage;
        const currentProjectId = activeProjectIdRef.current;
        if (currentPage && currentProjectId) {
          setSavedSurveyPage(currentPage.name, currentProjectId);
        }
        const stepProgress = calculateSurveyStepProgress(sender);
        onProgressChangeRef.current(stepProgress);
      });
    }

    model.onComplete.add((sender) => {
      const completedAnswers = cleanAnswers(
        normalizeSurveyAnswers(sender.data as Record<string, unknown>)
      );
      onSurveyCompleteRef.current(completedAnswers);
    });

    return model;
  }, [activeRoutePack, activeProjectId, surveyCompleted]);

  useEffect(() => {
    if (survey && initializedSurveyRef.current !== survey) {
      initializedSurveyRef.current = survey;
      if (answers) {
        survey.data = flattenSurveyAnswers(answers);
      }

      if (!surveyCompleted) {
        const savedPageName = activeProjectIdRef.current
          ? getSavedSurveyPage(activeProjectIdRef.current)
          : null;
        const visiblePages = survey.visiblePages ?? [];

        const targetPage = savedPageName && typeof survey.getPageByName === 'function'
          ? survey.getPageByName(savedPageName)
          : null;
        if (targetPage && visiblePages.includes(targetPage)) {
          survey.currentPage = targetPage;
        } else if (answers && Object.keys(answers).length > 0) {
          const incompletePage = visiblePages.find((page) => {
            return (page.questions ?? []).some((q) => {
              if (!q.isVisible || !q.isRequired) return false;
              return typeof q.isEmpty === 'function' ? q.isEmpty() : false;
            });
          });
          if (incompletePage) {
            survey.currentPage = incompletePage;
          } else {
            survey.currentPageNo = 0;
          }
        } else {
          survey.currentPageNo = 0;
        }
      }

      const initialProgress = calculateSurveyStepProgress(survey);
      onProgressChangeRef.current(initialProgress);

      if (activeRoutePack && answers && Object.keys(answers).length > 0 && surveyCompleted) {
        const effects = activeRoutePack.evaluateEffects(answers);
        const derived = isRecord(effects.answersForChecklist._effects)
          ? (effects.answersForChecklist._effects as Record<string, unknown>)
          : null;
        if (derived?.materialProfileIncomplete === true) {
          const pageIndex = survey.pages.findIndex((page) => page.name === 'material-background');
          if (pageIndex >= 0) {
            survey.currentPageNo = pageIndex;
            const updatedProgress = calculateSurveyStepProgress(survey);
            onProgressChangeRef.current(updatedProgress);
          }
        }
      }
    }
  }, [survey, answers, activeRoutePack, surveyCompleted]);

  useEffect(() => {
    if (materialProfileIncomplete && surveyCompleted && survey) {
      const pageIndex = survey.pages.findIndex((page) => page.name === 'material-background');
      if (pageIndex >= 0 && survey.currentPageNo !== pageIndex) {
        survey.currentPageNo = pageIndex;
        const updatedProgress = calculateSurveyStepProgress(survey);
        onProgressChangeRef.current(updatedProgress);
      }
    }
  }, [materialProfileIncomplete, surveyCompleted, survey]);

  useEffect(() => {
    return () => {
      onProgressChangeRef.current(null);
    };
  }, []);

  return <Survey model={survey} />;
}
