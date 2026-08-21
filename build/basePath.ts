export function resolveBasePath(value: unknown): string {
  if (value === undefined) return '/';
  if (typeof value !== 'string' || !value.startsWith('/') || !value.endsWith('/')) {
    throw new Error('VITE_BASE_PATH must be a string that begins and ends with "/".');
  }
  return value;
}
