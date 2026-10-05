import axiosInstance from '../../api/axios.config';
import { decryptOfflinePayload, getOfflineMapping, listOfflineOperations, removeOfflineOperation, saveOfflineMapping, saveOfflineOperation, updateOfflineOperation } from './offline-store';

const DEVICE_KEY = 'consultorio_device_id';
const AUTH_KEY = 'consultorio_offline_authorization';
export const getDeviceId = () => { let value = localStorage.getItem(DEVICE_KEY); if (!value) { value = `device_${crypto.randomUUID()}`; localStorage.setItem(DEVICE_KEY, value); } return value; };
export const refreshOfflineAuthorization = async () => { const { data } = await axiosInstance.post('/auth/offline-authorization', { deviceId: getDeviceId() }); const value = data?.data ?? data; localStorage.setItem(AUTH_KEY, JSON.stringify(value)); return value; };
export const getOfflineAuthorization = () => { try { const value = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); const scope = getOfflineScope(); if (!value?.authorization || !value?.expiresAt || Date.parse(value.expiresAt) <= Date.now()) return null; const payload = JSON.parse(atob(value.authorization.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); if (payload.deviceId !== getDeviceId() || Number(payload.userId) !== scope.usuarioId || Number(payload.empresaId) !== scope.empresaId) return null; if (scope.sucursalId && !value.allowedSucursalIds?.includes(scope.sucursalId)) return null; return value; } catch { return null; } };
export const canWorkOffline = () => Boolean(getOfflineAuthorization());

export const getOfflineScope = () => { try { const user = JSON.parse(localStorage.getItem('user') || '{}'); const branch = JSON.parse(localStorage.getItem('sucursal_activa') || '{}'); return { usuarioId: Number(user.id), empresaId: Number(sessionStorage.getItem('empresa_contexto_id') || user.empresa_id || user.empresaId), sucursalId: Number(branch.id || user.sucursal_id || user.sucursalId) || null }; } catch { return { usuarioId: 0, empresaId: 0, sucursalId: null }; } };
export const pendingOfflineCount = async () => { const scope = getOfflineScope(); return (await listOfflineOperations()).filter((item) => item.usuarioId === scope.usuarioId && item.empresaId === scope.empresaId).length; };
export const synchronizeOffline = async () => {
  if (!navigator.onLine) throw new Error('Sin conexión');
  await refreshOfflineAuthorization();
  const execute = async () => {
  const scope = getOfflineScope(); const rows = (await listOfflineOperations()).filter((item) => item.usuarioId === scope.usuarioId && item.empresaId === scope.empresaId && ['PENDING', 'ERROR'].includes(item.state));
  for (const row of rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    try {
      const mappings = new Map<string, string | number>();
      for (const dependency of row.dependencies ?? []) { const value = await getOfflineMapping(dependency); if (value === undefined) throw new Error(`Dependencia pendiente: ${dependency}`); mappings.set(dependency, value); }
      const replaceReferences = (value: any): any => { if (typeof value === 'string') { if (mappings.has(value)) return mappings.get(value); let replaced = value; mappings.forEach((serverId, localId) => { replaced = replaced.replaceAll(localId, String(serverId)); }); return replaced; } if (Array.isArray(value)) return value.map(replaceReferences); if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, replaceReferences(child)])); return value; };
      row.state = 'SYNCING'; row.attempts += 1; await updateOfflineOperation(row);
      const request = replaceReferences(await decryptOfflinePayload(row));
      const response = await axiosInstance.request({ ...request, headers: { ...(request.headers || {}), 'X-Idempotency-Key': row.id } });
      const body: any = response.data?.data ?? response.data; const entity = body?.data ?? body?.paciente ?? body?.consulta ?? body?.receta ?? body;
      if (entity?.id !== undefined) await saveOfflineMapping(row.localId, entity.id);
      await removeOfflineOperation(row.id);
    }
    catch (error: any) { row.state = error?.response?.status === 409 ? 'CONFLICT' : 'ERROR'; row.error = String(error?.response?.data?.message || error?.message || 'Error de sincronización').slice(0, 300); await updateOfflineOperation(row); }
  }
  localStorage.setItem('offline_last_sync', new Date().toISOString()); window.dispatchEvent(new Event('offline-sync-finished'));
  };
  if ('locks' in navigator) return (navigator as any).locks.request('consultorio-offline-sync', { mode: 'exclusive' }, execute);
  const lockKey = 'consultorio_offline_sync_lock'; const owner = crypto.randomUUID(); const current = JSON.parse(localStorage.getItem(lockKey) || 'null');
  if (current && Date.now() - current.at < 120000) return;
  localStorage.setItem(lockKey, JSON.stringify({ owner, at: Date.now() }));
  try { return await execute(); } finally { const last = JSON.parse(localStorage.getItem(lockKey) || 'null'); if (last?.owner === owner) localStorage.removeItem(lockKey); }
};

export const queueOfflineRequest = async (type: string, request: { method: string; url: string; data?: unknown; headers?: Record<string, string> }, dependencies: string[] = []) => {
  const scope = getOfflineScope();
  if (!scope.usuarioId || !scope.empresaId) throw new Error('La sesión no está habilitada para trabajar sin conexión');
  if (!navigator.onLine && !canWorkOffline()) throw new Error('La autorización offline venció. Conéctate para revalidar el acceso.');
  if (!scope.sucursalId) throw new Error('Selecciona una sucursal concreta antes de registrar información sin conexión');
  return saveOfflineOperation({ type, payload: request, dependencies, deviceId: getDeviceId(), ...scope });
};
