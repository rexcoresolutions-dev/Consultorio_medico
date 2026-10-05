import axiosInstance from '../../api/axios.config';
import { normalizeUserActive, userApiError } from '../../utils/user-contract.utils';

export interface UserData {
  id?: number;
  nombre: string;
  primer_apellido: string;
  segundo_apellido?: string;
  email: string;
  telefono?: string;
  rol_id?: number;
  empresa_id?: number;
  sucursal_id?: number | null;
  empresa_nombre?: string;
  sucursal_nombre?: string;
  activo?: boolean;
  password?: string;
  cedula_profesional?: string;
  especialidad?: string;
  username?: string;
  correo_estado?: string;
  username_propuesto?: string;
  debe_cambiar_password?: boolean;
  password_temporal_expira?: string | null;
}


export interface ChangePasswordData {
  newPassword: string;
}

class UserService {
  private static instance: UserService;

  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }

    return UserService.instance;
  }

  private getResponseData(responseData: any): any {
    return (
      responseData?.data ||
      responseData?.user ||
      responseData?.usuario ||
      responseData
    );
  }

  private normalizeUser(user: any): UserData {
    const pendingPasswordChange = user?.debeCambiarPassword ?? user?.debe_cambiar_password;
    return {
      id: user?.id,
      nombre: user?.nombre || '',
      primer_apellido: user?.primerApellido || user?.primer_apellido || '',
      segundo_apellido: user?.segundoApellido || user?.segundo_apellido || '',
      email: user?.correo || user?.email || '',
      telefono: user?.telefono || '',
      rol_id:
        Number(
          user?.rolId ??
            user?.rol_id ??
            user?.roleId ??
            user?.role_id ??
            user?.rol?.id ??
            user?.role?.id ??
            0
        ) || undefined,

      empresa_id: user?.empresaId || user?.empresa_id || user?.empresa?.id,
      sucursal_id: user?.sucursalId ?? user?.sucursal_id ?? user?.sucursal?.id ?? null,

      empresa_nombre:
        user?.empresaNombre ||
        user?.empresa_nombre ||
        user?.nombreEmpresa ||
        user?.nombre_empresa ||
        user?.empresa?.nombre ||
        user?.empresa?.nombreEmpresa ||
        user?.empresa?.nombre_empresa ||
        '',

      sucursal_nombre:
        user?.sucursalNombre ||
        user?.sucursal_nombre ||
        user?.nombreSucursal ||
        user?.nombre_sucursal ||
        user?.sucursal?.nombre ||
        user?.sucursal?.nombreSucursal ||
        user?.sucursal?.nombre_sucursal ||
        '',

      activo: normalizeUserActive(user?.activo),
      cedula_profesional: user?.cedulaProfesional || user?.cedula_profesional || '',
      especialidad: user?.especialidad || '',
      username: user?.username || '',
      correo_estado: user?.correoEstado || user?.correo_estado || '',
      debe_cambiar_password: pendingPasswordChange === undefined ? undefined : Boolean(pendingPasswordChange),
      password_temporal_expira: user?.passwordTemporalExpira ?? user?.password_temporal_expira ?? null,
    };
  }

  private buildUserPayload(userData: Partial<UserData>): any {
    const payload: any = {};

    if (userData.nombre !== undefined) {
      payload.nombre = userData.nombre;
    }

    if (userData.primer_apellido !== undefined) {
      payload.primerApellido = userData.primer_apellido;
    }

    if (userData.segundo_apellido !== undefined) {
      payload.segundoApellido = userData.segundo_apellido;
    }

    if (userData.email !== undefined) {
      payload.correo = userData.email;
    }

    if (userData.telefono !== undefined) {
      payload.telefono = userData.telefono;
    }

    if (userData.rol_id !== undefined) {
      payload.rolId = userData.rol_id;
    }

    if (userData.sucursal_id !== undefined) {
      payload.sucursalId =
        userData.sucursal_id === null ? null : Number(userData.sucursal_id);
    }

    if (userData.cedula_profesional !== undefined) {
      payload.cedulaProfesional = userData.cedula_profesional;
    }

    if (userData.especialidad !== undefined) {
      payload.especialidad = userData.especialidad;
    }

    if (userData.activo !== undefined) {
      payload.activo = userData.activo;
    }

    if (userData.password !== undefined) {
      payload.password = userData.password;
    }

    return payload;
  }

  async getMe(): Promise<UserData> {
    try {
      const response = await axiosInstance.get('/usuarios/me');
      const user = this.getResponseData(response.data);

      return this.normalizeUser(user);
    } catch (error) {
      console.error('Error fetching current user:', error);
      throw error;
    }
  }

  async updateMe(userData: Partial<UserData>): Promise<UserData> {
    try {
      const payload = this.buildUserPayload(userData);

      delete payload.rolId;
      delete payload.empresaId;
      delete payload.sucursalId;
      delete payload.activo;
      delete payload.password;

      if (Object.keys(payload).length === 0) {
        throw new Error('No hay campos para actualizar');
      }

      const response = await axiosInstance.patch('/usuarios/me', payload);
      const updatedUser = this.getResponseData(response.data);

      return this.normalizeUser(updatedUser);
    } catch (error: any) {
      console.error('Error updating current user:', error);

      if (error.response?.data?.message) {
        throw new Error(userApiError(error.response.data, 'No se pudo actualizar el usuario'));
      }

      throw error;
    }
  }

  async getUsuarios(page: number = 1, limit: number = 100): Promise<UserData[]> {
    try {
      const response = await axiosInstance.get(`/usuarios?page=${page}&limit=${limit}`);
      const responseData = response.data;

      let usersArray: any[] = [];

      if (responseData?.data?.data && Array.isArray(responseData.data.data)) {
        usersArray = responseData.data.data;
      } else if (responseData?.data && Array.isArray(responseData.data)) {
        usersArray = responseData.data;
      } else if (Array.isArray(responseData)) {
        usersArray = responseData;
      }

      return usersArray.map((user) => this.normalizeUser(user));
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  async getUsuarioById(id: number): Promise<UserData> {
    try {
      const response = await axiosInstance.get(`/usuarios/${id}`);
      const user = this.getResponseData(response.data);

      return this.normalizeUser(user);
    } catch (error) {
      console.error(`Error fetching user ${id}:`, error);
      throw error;
    }
  }

  async createUsuario(userData: UserData): Promise<UserData> {
    try {
      if (!userData.nombre?.trim()) {
        throw new Error('El nombre es obligatorio');
      }

      if (!userData.primer_apellido?.trim()) {
        throw new Error('El primer apellido es obligatorio');
      }

      if (!userData.email?.trim()) {
        throw new Error('El correo es obligatorio');
      }

      const payload: any = {
        nombre: userData.nombre.trim(),
        primerApellido: userData.primer_apellido.trim(),
        correo: userData.email.trim(),
        rolId: userData.rol_id || 2,
      };
      if (userData.password?.trim()) payload.password = userData.password;
      if (userData.username_propuesto?.trim()) payload.usernamePropuesto = userData.username_propuesto.trim();

      if (userData.segundo_apellido?.trim()) {
        payload.segundoApellido = userData.segundo_apellido.trim();
      }

      if (userData.telefono?.trim()) {
        payload.telefono = userData.telefono.trim();
      }

      if (
        userData.sucursal_id !== undefined &&
        userData.sucursal_id !== null &&
        userData.sucursal_id !== 0
      ) {
        payload.sucursalId = Number(userData.sucursal_id);
      }

      if (userData.cedula_profesional?.trim()) {
        payload.cedulaProfesional = userData.cedula_profesional.trim();
      }

      if (userData.especialidad?.trim()) {
        payload.especialidad = userData.especialidad.trim();
      }

      const response = await axiosInstance.post('/usuarios', payload);
      const newUser = this.getResponseData(response.data);

      return this.normalizeUser(newUser);
    } catch (error: any) {
      console.error('Error creating user:', error);

      if (error.response?.data) {
        console.error('Error response:', JSON.stringify(error.response.data, null, 2));
        throw new Error(userApiError(error.response.data, 'Error al crear usuario'));
      }

      throw error;
    }
  }

  async updateUsuario(id: number, userData: Partial<UserData>): Promise<UserData> {
    try {
      const payload = this.buildUserPayload(userData);

      if (Object.keys(payload).length === 0) {
        throw new Error('No hay campos para actualizar');
      }

      const response = await axiosInstance.patch(`/usuarios/${id}`, payload);
      const updatedUser = this.getResponseData(response.data);

      return this.normalizeUser(updatedUser);
    } catch (error: any) {
      console.error(`Error updating user ${id}:`, error);

      if (error.response?.data?.message) {
        throw new Error(userApiError(error.response.data, 'No se pudo actualizar el usuario'));
      }

      throw error;
    }
  }

  async changePassword(id: number, passwords: ChangePasswordData): Promise<void> {
    try {
      void passwords;
      await axiosInstance.post(`/usuarios/${id}/restablecer-acceso`);
    } catch (error) {
      console.error(`Error changing password for user ${id}:`, error);
      throw error;
    }
  }

  async deleteUsuario(id: number): Promise<void> {
    try {
      await axiosInstance.delete(`/usuarios/${id}`);
    } catch (error) {
      console.error(`Error deleting user ${id}:`, error);
      throw error;
    }
  }
}

export default UserService.getInstance();
