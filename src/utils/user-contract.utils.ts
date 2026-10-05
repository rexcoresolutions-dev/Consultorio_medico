export function normalizeUserActive(value: unknown): boolean | undefined {
  if (value === true || value === 1 || value === '1' || value === 'true') return true;
  if (value === false || value === 0 || value === '0' || value === 'false') return false;
  return undefined;
}

export function userStatusLabel(value: boolean | undefined): string {
  return value === undefined ? 'Sin información' : value ? 'Activo' : 'Inactivo';
}

export function userApiError(data: { details?: unknown; message?: unknown }, fallback: string): string {
  const messages = Array.isArray(data.details) ? data.details : Array.isArray(data.message) ? data.message : [];
  const detail = messages.filter((item): item is string => typeof item === 'string').join('\n');
  return detail || (typeof data.message === 'string' ? data.message : fallback);
}
