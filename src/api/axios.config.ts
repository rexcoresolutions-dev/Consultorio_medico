import axios from 'axios';
import createAuthRefreshInterceptor from 'axios-auth-refresh';
import authService from '../services/auth/auth.service';
import { getWorkSucursal } from '../services/work-context/work-context.service';
import { readOfflineCache, saveOfflineCache } from '../services/offline/offline-store';

const offlineReadable = (config: any) => {
  if (String(config?.method || 'get').toLowerCase() !== 'get' || config?.skipOfflineCache) return false;
  const url = String(config?.url || '');
  return !['/auth', '/usuarios', '/permisos', '/configuracion-empresa', '/plataforma', '/auditoria', '/notificaciones/envios'].some((path) => url.includes(path));
};
const offlineCacheKey = (config: any) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const branch = JSON.parse(localStorage.getItem('sucursal_activa') || '{}');
  const company = sessionStorage.getItem('empresa_contexto_id') || user.empresa_id || user.empresaId || '';
  return ['http', user.id || '', company, branch.id || 'all', config.url || '', JSON.stringify(config.params || {})].join(':');
};

const axiosInstance = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? 'http://localhost:3000/api/v1' : 'https://api-medica.rexcoresolutions.com/api/v1'),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = authService.getToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const workSucursal = getWorkSucursal();
    if (workSucursal && !(config as any).skipWorkContext) {
      config.headers['X-Sucursal-Id'] = String(workSucursal.id);
    }
    const empresaId = sessionStorage.getItem('empresa_contexto_id');
    if (empresaId && !(config as any).skipWorkContext) {
      config.headers['X-Empresa-Id'] = empresaId;
    }

    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => {
    if (offlineReadable(response.config)) void saveOfflineCache(offlineCacheKey(response.config), response.data);
    return response;
  },
  async (error) => {
    if (!error.response && offlineReadable(error.config)) {
      const cached = await readOfflineCache(offlineCacheKey(error.config)).catch(() => null);
      if (cached) return { data: cached.value, status: 200, statusText: 'OFFLINE_CACHE', headers: { 'x-offline-cache': 'true', 'x-offline-updated-at': cached.updatedAt }, config: error.config };
    }
    if (error.response) {
      console.error('❌ Response status:', error.response.status);
      console.error('❌ Response data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('❌ No response from server:', error.request);
    } else {
      console.error('❌ Request error:', error.message);
    }

    return Promise.reject(error);
  }
);

const refreshAuthLogic = async (failedRequest: any) => {
  const newToken = await authService.refreshToken();

  if (newToken) {
    failedRequest.response.config.headers.Authorization = `Bearer ${newToken}`;
    return Promise.resolve();
  }

  return Promise.reject();
};

createAuthRefreshInterceptor(axiosInstance, refreshAuthLogic);

export default axiosInstance;
