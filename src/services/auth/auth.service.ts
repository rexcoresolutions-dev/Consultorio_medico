import axios from 'axios';
import type { LoginResponse, User } from '../../types/auth/auth.types';
import axiosInstance from '../../api/axios.config';
import { detectGender } from '../../utils/genderDetector';

const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:3000/api/v1' : 'https://api-medica.rexcoresolutions.com/api/v1');

const decodeToken = (token: string): any => {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
};

class AuthService {
  private static instance: AuthService;
  private refreshTokenTimeout: number | null = null;

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }

    return AuthService.instance;
  }

  private extractUserData(rawData: any): any {
    if (!rawData) return {};

    if (rawData?.data?.user) return rawData.data.user;
    if (rawData?.data?.usuario) return rawData.data.usuario;
    if (rawData?.data?.data) return rawData.data.data;
    if (rawData?.data?.id || rawData?.data?.correo || rawData?.data?.email) {
      return rawData.data;
    }

    if (rawData?.user) return rawData.user;
    if (rawData?.usuario) return rawData.usuario;

    return rawData;
  }

  private normalizeUser(userData: any, tokenData?: any): User {
    const cleanUserData = this.extractUserData(userData);

    const nombre =
      cleanUserData?.nombre ||
      cleanUserData?.name ||
      cleanUserData?.firstName ||
      '';

    const primerApellido =
      cleanUserData?.primerApellido ||
      cleanUserData?.primer_apellido ||
      cleanUserData?.apellidoPaterno ||
      cleanUserData?.lastName ||
      '';

    const segundoApellido =
      cleanUserData?.segundoApellido ||
      cleanUserData?.segundo_apellido ||
      cleanUserData?.apellidoMaterno ||
      '';

    const email =
      cleanUserData?.correo ||
      cleanUserData?.email ||
      tokenData?.correo ||
      tokenData?.email ||
      '';

    const rolId =
      cleanUserData?.rolId ||
      cleanUserData?.rol_id ||
      tokenData?.rolId ||
      tokenData?.rol_id ||
      1;

    const empresaId =
      cleanUserData?.empresaId ||
      cleanUserData?.empresa_id ||
      tokenData?.empresaId ||
      tokenData?.empresa_id ||
      null;

    const sucursalId =
      cleanUserData?.sucursalId ??
      cleanUserData?.sucursal_id ??
      tokenData?.sucursalId ??
      tokenData?.sucursal_id ??
      null;

    const gender = detectGender(nombre, primerApellido);

    return {
      id:
        cleanUserData?.id ||
        cleanUserData?.userId ||
        cleanUserData?.usuarioId ||
        cleanUserData?.usuario_id ||
        tokenData?.userId ||
        tokenData?.sub ||
        tokenData?.id,

      nombre,
      primer_apellido: primerApellido,
      segundo_apellido: segundoApellido,

      email,
      telefono: cleanUserData?.telefono || '',

      rol_id: Number(rolId),
      empresa_id: empresaId,
      sucursal_id: sucursalId,

      cedula_profesional:
        cleanUserData?.cedulaProfesional ||
        cleanUserData?.cedula_profesional ||
        '',

      especialidad: cleanUserData?.especialidad || '',

      activo:
        cleanUserData?.activo === undefined
          ? true
          : cleanUserData?.activo === true || cleanUserData?.activo === 1,

      ultimo_acceso:
        cleanUserData?.ultimoAcceso ||
        cleanUserData?.ultimo_acceso ||
        undefined,

      created_at:
        cleanUserData?.createdAt ||
        cleanUserData?.created_at,

      updated_at:
        cleanUserData?.updatedAt ||
        cleanUserData?.updated_at,

      genero: gender,
      debe_cambiar_password: Boolean(cleanUserData?.debeCambiarPassword ?? tokenData?.debeCambiarPassword),
      password_temporal_expira: cleanUserData?.passwordTemporalExpira ?? tokenData?.passwordTemporalExpira ?? null,
    };
  }

  async changeInitialPassword(newPassword: string): Promise<void> {
    const response = await axiosInstance.post('/auth/cambiar-password-inicial', { newPassword });
    const payload = response.data?.data ?? response.data;
    const accessToken = payload?.accessToken ?? payload?.token;

    if (!accessToken) {
      throw new Error('La contraseña cambió, pero no fue posible renovar la sesión');
    }

    localStorage.setItem('access_token', accessToken);
    axiosInstance.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

    const currentUser = this.getUser();
    if (currentUser) {
      localStorage.setItem('user', JSON.stringify({
        ...currentUser,
        debe_cambiar_password: false,
        password_temporal_expira: null,
      }));
    }

    this.startRefreshTokenTimer();
  }

  private hasValidName(user: User | null): boolean {
    return !!user?.nombre && user.nombre.trim() !== '';
  }

  async login(identificador: string, password: string): Promise<LoginResponse> {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        identificador,
        password,
      });

      if (!response.data?.success || !response.data?.data) {
        throw new Error('No se encontraron datos de usuario en la respuesta');
      }

      const accessToken =
        response.data.data.accessToken ||
        response.data.data.token ||
        response.data.accessToken ||
        response.data.token;

      if (!accessToken) {
        throw new Error('No se recibió token de acceso');
      }

      localStorage.setItem('access_token', accessToken);
      axiosInstance.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

      const decodedToken = decodeToken(accessToken);

      const loginUserRaw =
        response.data.data.user ||
        response.data.data.usuario ||
        response.data.data;

      const loginUserNormalized = this.normalizeUser(loginUserRaw, decodedToken);

      let meUserNormalized: User | null = null;

      try {
        meUserNormalized = await this.getMe(accessToken, decodedToken);
      } catch {
        meUserNormalized = null;
      }

      const userId =
        decodedToken?.userId ||
        decodedToken?.sub ||
        decodedToken?.id ||
        loginUserNormalized?.id ||
        meUserNormalized?.id;

      let usuarioById: User | null = null;

      if (userId) {
        usuarioById = await this.getUsuarioById(
          accessToken,
          Number(userId),
          decodedToken
        );
      }

      let completeUser: User;

      if (this.hasValidName(usuarioById)) {
        completeUser = usuarioById as User;
      } else if (this.hasValidName(meUserNormalized)) {
        completeUser = meUserNormalized as User;
      } else if (this.hasValidName(loginUserNormalized)) {
        completeUser = loginUserNormalized;
      } else {
        completeUser = {
          ...loginUserNormalized,
          ...meUserNormalized,
          ...usuarioById,

          id:
            usuarioById?.id ||
            meUserNormalized?.id ||
            loginUserNormalized?.id ||
            decodedToken?.userId,

          nombre:
            usuarioById?.nombre ||
            meUserNormalized?.nombre ||
            loginUserNormalized?.nombre ||
            '',

          primer_apellido:
            usuarioById?.primer_apellido ||
            meUserNormalized?.primer_apellido ||
            loginUserNormalized?.primer_apellido ||
            '',

          segundo_apellido:
            usuarioById?.segundo_apellido ||
            meUserNormalized?.segundo_apellido ||
            loginUserNormalized?.segundo_apellido ||
            '',

          email:
            usuarioById?.email ||
            meUserNormalized?.email ||
            loginUserNormalized?.email ||
            decodedToken?.email ||
            identificador,

          rol_id: Number(
            usuarioById?.rol_id ||
              meUserNormalized?.rol_id ||
              loginUserNormalized?.rol_id ||
              decodedToken?.rolId ||
              1
          ),
        };
      }

      const allowedRoles = [1, 2, 3, 4];

      if (!allowedRoles.includes(Number(completeUser.rol_id))) {
        this.logout();
        throw new Error('Rol no autorizado para iniciar sesión');
      }

      localStorage.setItem('user', JSON.stringify(completeUser));

      if (!completeUser.debe_cambiar_password && Number(completeUser.rol_id) !== 4) {
        const { refreshOfflineAuthorization } = await import('../offline/offline-sync.service');
        await refreshOfflineAuthorization().catch(() => undefined);
      }

      this.startRefreshTokenTimer();

      return {
        success: true,
        data: {
          user: completeUser,
          token: accessToken,
          refreshToken: undefined,
        },
      };
    } catch (error: any) {
      if (error.response) {
        throw {
          response: {
            status: error.response.status,
            data: {
              message:
                error.response.data?.message ||
                'Credenciales incorrectas',
            },
          },
        };
      }

      throw error;
    }
  }

  private async getMe(token: string, tokenData?: any): Promise<User | null> {
    try {
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const userData = this.extractUserData(response.data);

      if (!userData) return null;

      return this.normalizeUser(userData, tokenData);
    } catch {
      return null;
    }
  }

  private async getUsuarioById(
    token: string,
    userId: number,
    tokenData?: any
  ): Promise<User | null> {
    try {
      const response = await axios.get(`${API_URL}/usuarios/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const userData = this.extractUserData(response.data);

      if (!userData) return null;

      return this.normalizeUser(userData, tokenData);
    } catch {
      return null;
    }
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('effective_permissions');
    sessionStorage.removeItem('empresa_contexto_id');

    this.stopRefreshTokenTimer();

    delete axiosInstance.defaults.headers.common.Authorization;
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  getUser(): User | null {
    const userStr = localStorage.getItem('user');

    if (!userStr) return null;

    try {
      return JSON.parse(userStr) as User;
    } catch {
      return null;
    }
  }

  async refreshToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) return null;

    try {
      const response = await axios.post(`${API_URL}/auth/refresh`, {
        refresh_token: refreshToken,
      });

      const newToken =
        response.data.token ||
        response.data.data?.accessToken ||
        response.data.data?.token;

      if (!newToken) return null;

      localStorage.setItem('access_token', newToken);
      axiosInstance.defaults.headers.common.Authorization = `Bearer ${newToken}`;

      this.startRefreshTokenTimer();

      return newToken;
    } catch {
      this.logout();
      return null;
    }
  }

  private startRefreshTokenTimer(): void {
    this.stopRefreshTokenTimer();

    this.refreshTokenTimeout = window.setTimeout(() => {
      this.refreshToken();
    }, 50 * 60 * 1000);
  }

  private stopRefreshTokenTimer(): void {
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
      this.refreshTokenTimeout = null;
    }
  }
}

export default AuthService.getInstance();
