import axiosInstance from '../../api/axios.config';

export type EmpresaConfig = {
  smtpHabilitado: boolean; smtpHost: string; smtpPuerto: number; smtpSeguridad: 'TLS' | 'STARTTLS' | 'NINGUNA';
  smtpUsuario: string; smtpPasswordConfigurado: boolean; smtpRemitenteNombre: string; smtpRemitenteCorreo: string;
  smtpResponderA: string; generarPasswordTemporal: boolean; passwordTemporalConfigurada: boolean;
  passwordTemporalHoras: number; passwordTemporalDias: number; cambioPasswordObligatorio: boolean; notificarAltaUsuario: boolean;
  notificarCambiosAcceso: boolean; notificarCitas: boolean;
};

const unwrap = (response: any) => response?.data?.data ?? response?.data;
export const loadEmpresaConfig = async (): Promise<EmpresaConfig> => unwrap(await axiosInstance.get('/configuracion-empresa'));
export const saveEmpresaConfig = async (values: Record<string, unknown>): Promise<EmpresaConfig> => unwrap(await axiosInstance.patch('/configuracion-empresa', values));
export const revealEmpresaTemporaryPassword = async (): Promise<{ passwordTemporal: string; utilizadaEnNuevasCuentas: boolean }> => unwrap(await axiosInstance.post('/configuracion-empresa/password-temporal/revelar'));
export const testEmpresaSmtp = async (destinatario: string) => unwrap(await axiosInstance.post('/configuracion-empresa/smtp/probar', { destinatario }));
