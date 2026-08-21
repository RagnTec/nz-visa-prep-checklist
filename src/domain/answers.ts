function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cloneAnswerValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cloneAnswerValue);
  if (!isRecord(value)) return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [key, cloneAnswerValue(nestedValue)])
  );
}

function isSafePath(path: string[]): boolean {
  return path.length > 1
    && path.every((key) =>
      key.length > 0 && !['__proto__', 'constructor', 'prototype'].includes(key)
    );
}

export function normalizeSurveyAnswers(
  answers: Record<string, unknown>
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(answers)) {
    if (!key.includes('.')) normalized[key] = cloneAnswerValue(value);
  }

  for (const [key, value] of Object.entries(answers)) {
    const path = key.split('.');
    if (!isSafePath(path)) continue;

    let current = normalized;
    for (const segment of path.slice(0, -1)) {
      const existing = current[segment];
      if (!isRecord(existing)) current[segment] = {};
      current = current[segment] as Record<string, unknown>;
    }
    current[path[path.length - 1]] = cloneAnswerValue(value);
  }

  return normalized;
}
