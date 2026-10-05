export interface User {
  id: number;
  nombre: string;
  primer_apellido: string;
  segundo_apellido?: string;
  email: string;
  telefono?: string;
  rol_id: number;
  empresa_id: number;
  sucursal_id?: number | null;
  cedula_profesional?: string;
  especialidad?: string;
  activo?: boolean;
  ultimo_acceso?: string;
  created_at?: string;
  updated_at?: string;
  genero?: 'MALE' | 'FEMALE' | 'UNKNOWN';
  debe_cambiar_password?: boolean;
  password_temporal_expira?: string | null;
  // Relaciones
  rol?: Rol;
  empresa?: Empresa;
  sucursal?: Sucursal;
}

export interface Rol {
  id: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

export interface Empresa {
  id: number;
  nombre_comercial: string;
  razon_social?: string;
  rfc?: string;
  telefono?: string;
  correo?: string;
}

export interface Sucursal {
  id: number;
  nombre: string;
  clave?: string;
  telefono?: string;
  correo?: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  data?: {
    user: User;
    token: string;
    refreshToken?: string;
  };
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identificador: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}
