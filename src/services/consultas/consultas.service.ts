import axiosInstance from '../../api/axios.config';
import { queueOfflineRequest } from '../offline/offline-sync.service';

export interface ConsultaSignosVitalesPayload {
  peso?: number;
  altura?: number;
  imc?: number;
  temperatura?: number;
  presionArterial?: string;
  frecuenciaCardiaca?: number;
  frecuenciaRespiratoria?: number;
  spo2?: number;
  cinturaAbdominal?: number;
  motivoReferencia?: string;
  descripcionReferencia?: string;
}

export interface ConsultaAntecedentePayload {
  tuberculosisPulmonar: boolean;
  observaciones?: string;
  infeccionTransmisionSexual: boolean;
  patologiaMamariaBenigna: boolean;
  terapiaHormonal: boolean;
  periPostmenopausia: boolean;
  colposcopia: boolean;
}

export interface ConsultaDiagnosticoPayload {
  diagnosticoId: number;
  primeraVez: boolean;
  subsecuente: boolean;
  descripcion?: string;
}

export interface ConsultaPayload {
  pacienteId: number | string;
  tipoConsulta: string;
  primeraConsultaAnio: boolean;
  diabetes: boolean;
  tomaGlucosa: boolean;
  medicionAyunas?: number;
  tirasControl?: string;
  atencionPregestacional: boolean;
  motivoConsulta?: string;
  descripcion?: string;
  tratamientoActual?: string;
  terapeuticaEmpleada?: string;
  contrarreferencia: boolean;
  estatus: string;
  signosVitales: ConsultaSignosVitalesPayload;
  antecedente: ConsultaAntecedentePayload;
  diagnosticos: ConsultaDiagnosticoPayload[];
}

export interface ConsultasQueryParams {
  page?: number;
  limit?: number;
  pacienteId?: number;
  medicoId?: number;
  sucursalId?: number;
}

export interface ConsultasMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ConsultasPage<T = any> {
  data: T[];
  meta: ConsultasMeta;
}

class ConsultasService {
  private readonly basePath = '/consultas';

  private unwrapEntity(responseData: any): any {
    return (
      responseData?.data?.data ??
      responseData?.data?.consulta ??
      responseData?.data?.result ??
      responseData?.data ??
      responseData?.consulta ??
      responseData?.result ??
      responseData
    );
  }

  async create(payload: ConsultaPayload): Promise<any> {
    try {
      const response = await axiosInstance.post(this.basePath, payload);
      return this.unwrapEntity(response.data);
    } catch (error: any) {
      if (error?.response) throw error;
      const dependencies = typeof payload.pacienteId === 'string' && payload.pacienteId.startsWith('local:') ? [payload.pacienteId] : [];
      const queued = await queueOfflineRequest('CONSULTA_CREAR', { method: 'POST', url: this.basePath, data: payload }, dependencies);
      return { ...payload, id: queued.localId, offlinePending: true };
    }
  }

  async findAll(params: ConsultasQueryParams = {}): Promise<ConsultasPage> {
    const response = await axiosInstance.get(this.basePath, { params });

    const root = response.data?.data ?? response.data ?? {};
    const records = Array.isArray(root?.data)
      ? root.data
      : Array.isArray(root)
        ? root
        : [];

    const metaRaw = root?.meta ?? {};

    return {
      data: records,
      meta: {
        total: Number(metaRaw.total ?? records.length ?? 0),
        page: Number(metaRaw.page ?? params.page ?? 1),
        limit: Number(metaRaw.limit ?? params.limit ?? 20),
        totalPages: Number(metaRaw.totalPages ?? (records.length > 0 ? 1 : 0)),
      },
    };
  }

  async findOne(id: number): Promise<any> {
    const response = await axiosInstance.get(`${this.basePath}/${id}`);
    return this.unwrapEntity(response.data);
  }

  async update(id: number, payload: Partial<ConsultaPayload>): Promise<any> {
    const response = await axiosInstance.patch(`${this.basePath}/${id}`, payload);
    return this.unwrapEntity(response.data);
  }

  async remove(id: number): Promise<any> {
    const response = await axiosInstance.delete(`${this.basePath}/${id}`);
    return this.unwrapEntity(response.data);
  }
}

export default new ConsultasService();
