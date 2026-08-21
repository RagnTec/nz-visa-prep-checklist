import type {
  AtomicRuleCondition,
  ChecklistItem,
  ChecklistRule,
  RuleEvaluation,
  RuleExpression
} from './types';

interface PathResult {
  found: boolean;
  value?: unknown;
}

interface ExpressionResult {
  valid: boolean;
  value: RuleEvaluation;
}

const invalidExpression: ExpressionResult = { valid: false, value: 'unknown' };

function isRulePrimitive(value: unknown): value is string | number | boolean {
  return typeof value === 'string'
    || typeof value === 'boolean'
    || (typeof value === 'number' && Number.isFinite(value));
}

function readPath(data: Record<string, unknown>, path: string): PathResult {
  if (!path) return { found: false };

  let current: unknown = data;
  for (const key of path.split('.')) {
    if (!current || typeof current !== 'object' || !Object.prototype.hasOwnProperty.call(current, key)) {
      return { found: false };
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current === undefined ? { found: false } : { found: true, value: current };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function evaluateAtomic(condition: AtomicRuleCondition, answers: Record<string, unknown>): ExpressionResult {
  if (!['equals', 'not_equals', 'in', 'truthy', 'contains'].includes(condition.operator)) {
    return invalidExpression;
  }
  if (condition.operator === 'in' && !Array.isArray(condition.value)) {
    return invalidExpression;
  }
  if (condition.operator === 'contains' && !isRulePrimitive(condition.value)) {
    return { valid: true, value: false };
  }

  const result = readPath(answers, condition.field);
  if (!result.found) {
    return { valid: true, value: condition.operator === 'contains' ? false : 'unknown' };
  }

  switch (condition.operator) {
    case 'equals': return { valid: true, value: result.value === condition.value };
    case 'not_equals': return { valid: true, value: result.value !== condition.value };
    case 'in': return {
      valid: true,
      value: Array.isArray(condition.value) && condition.value.includes(result.value)
    };
    case 'truthy': return { valid: true, value: Boolean(result.value) };
    case 'contains': {
      if (
        !Array.isArray(result.value)
        || !result.value.every(isRulePrimitive)
        || !isRulePrimitive(condition.value)
      ) {
        return { valid: true, value: false };
      }
      return { valid: true, value: result.value.includes(condition.value) };
    }
  }
}

function evaluateAll(expressions: unknown, answers: Record<string, unknown>): ExpressionResult {
  if (!Array.isArray(expressions) || expressions.length === 0) return invalidExpression;

  const results = expressions.map((expression) => evaluateExpression(expression, answers));
  if (results.some((result) => !result.valid)) return invalidExpression;
  let hasUnknown = false;
  for (const result of results) {
    if (result.value === false) return { valid: true, value: false };
    if (result.value === 'unknown') hasUnknown = true;
  }
  return { valid: true, value: hasUnknown ? 'unknown' : true };
}

function evaluateAny(expressions: unknown, answers: Record<string, unknown>): ExpressionResult {
  if (!Array.isArray(expressions) || expressions.length === 0) return invalidExpression;

  const results = expressions.map((expression) => evaluateExpression(expression, answers));
  if (results.some((result) => !result.valid)) return invalidExpression;
  let hasUnknown = false;
  for (const result of results) {
    if (result.value === true) return { valid: true, value: true };
    if (result.value === 'unknown') hasUnknown = true;
  }
  return { valid: true, value: hasUnknown ? 'unknown' : false };
}

function evaluateExpression(
  expression: unknown,
  answers: Record<string, unknown>
): ExpressionResult {
  if (!isRecord(expression)) return invalidExpression;

  const expressionKinds = ['all', 'any', 'not'].filter((key) =>
    Object.prototype.hasOwnProperty.call(expression, key)
  );
  const isAtomic = typeof expression.field === 'string'
    && expression.field.length > 0
    && typeof expression.operator === 'string';

  if (Number(isAtomic) + expressionKinds.length !== 1) return invalidExpression;
  if (isAtomic) return evaluateAtomic(expression as unknown as AtomicRuleCondition, answers);

  const kind = expressionKinds[0];
  if (kind === 'all') return evaluateAll(expression.all, answers);
  if (kind === 'any') return evaluateAny(expression.any, answers);
  if (kind === 'not') {
    const result = evaluateExpression(expression.not, answers);
    if (!result.valid) return invalidExpression;
    return {
      valid: true,
      value: result.value === 'unknown' ? 'unknown' : !result.value
    };
  }
  return invalidExpression;
}

export function evaluateRuleExpression(
  expression: unknown,
  answers: Record<string, unknown>
): RuleEvaluation {
  return evaluateExpression(expression, answers).value;
}

export function conditionMatches(expression: RuleExpression, answers: Record<string, unknown>): boolean {
  return evaluateRuleExpression(expression, answers) === true;
}

export function generateChecklist(
  answers: Record<string, unknown>,
  items: ChecklistItem[],
  rules: ChecklistRule[]
): ChecklistItem[] {
  const included = new Set(items.filter((item) => item.defaultIncluded).map((item) => item.id));
  for (const rule of rules) {
    if (conditionMatches(rule.when, answers)) {
      rule.addChecklistItems.forEach((id) => included.add(id));
    }
  }
  return items
    .filter((item) => included.has(item.id))
    .map((item) => {
      const { conditionalGuidanceBlocks, ...baseItem } = item;
      if (!conditionalGuidanceBlocks) return baseItem;

      const guidanceBlocks = conditionalGuidanceBlocks
        .filter((block) => conditionMatches(block.when, answers))
        .map(({ when: _when, ...block }) => block);

      return guidanceBlocks.length ? { ...baseItem, guidanceBlocks } : baseItem;
    });
}
