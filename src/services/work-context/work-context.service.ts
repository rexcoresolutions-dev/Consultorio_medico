export type WorkSucursal = { id: number; nombre: string; empresaId?: number };
const KEY = 'sucursal_activa';
const ALL_KEY = 'todas_sucursales_activas';
export const WORK_CONTEXT_CHANGED = 'work-context-changed';

export function getWorkSucursal(): WorkSucursal | null {
  try {
    const value = localStorage.getItem(KEY);
    const parsed = value ? JSON.parse(value) : null;
    return Number(parsed?.id) > 0 ? { ...parsed, id: Number(parsed.id) } : null;
  } catch { return null; }
}
export function setWorkSucursal(value: WorkSucursal): void {
  localStorage.removeItem(ALL_KEY);
  localStorage.setItem(KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(WORK_CONTEXT_CHANGED, { detail: value }));
}
export function isAllBranchesContext(): boolean {
  return localStorage.getItem(ALL_KEY) === 'true';
}
export function setAllBranchesContext(): void {
  localStorage.removeItem(KEY);
  localStorage.setItem(ALL_KEY, 'true');
  window.dispatchEvent(new CustomEvent(WORK_CONTEXT_CHANGED, { detail: { mode: 'all' } }));
}
export function clearWorkSucursal(): void {
  localStorage.removeItem(KEY);
  localStorage.removeItem(ALL_KEY);
  sessionStorage.removeItem('work-context-confirmed');
  window.dispatchEvent(new CustomEvent(WORK_CONTEXT_CHANGED));
}
