import axiosInstance from '../../api/axios.config';

export interface RecetaMedicamentoPayload {
  inventarioId?: number;
  medicamentoNombre: string;
  sustanciaActiva: string;
  concentracion?: string;
  formaFarmaceutica?: string;
  presentacion?: string;
  cantidad: number;
  unidad: string;
  dosis: string;
  frecuencia: string;
  duracion: number;
  unidadTiempo: string;
  viaAdministracion: string;
  indicaciones?: string;
  observaciones?: string;
}

export interface RecetaPayload {
  sucursalId: number;
  consultaId: number;
  fecha: string;
  observaciones?: string;
  programarSeguimiento: boolean;
  fechaSeguimiento?: string;
  solicitarEstudiosClinicos: boolean;
  detalleEstudiosClinicos?: string;
  medicamentos: RecetaMedicamentoPayload[];
}

export interface RecetasQueryParams {
  page?: number;
  limit?: number;
  consultaId?: number;
  pacienteId?: number;
  medicoId?: number;
  sucursalId?: number;
}

export interface RecetasPage<T = any> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const unwrapEntity = (responseData: any): any =>
  responseData?.data?.data ??
  responseData?.data?.receta ??
  responseData?.data?.result ??
  responseData?.data ??
  responseData?.receta ??
  responseData?.result ??
  responseData;

const unwrapPage = (responseData: any) => {
  const root = responseData?.data ?? responseData ?? {};
  const records = Array.isArray(root?.data)
    ? root.data
    : Array.isArray(root?.items)
      ? root.items
      : Array.isArray(root?.results)
        ? root.results
        : Array.isArray(root)
          ? root
          : [];

  return {
    records,
    meta: root?.meta ?? root?.pagination ?? {},
  };
};

export const getRecetaApiError = (
  error: any,
  fallback = 'No fue posible completar la operación con la receta.',
) => {
  const apiMessage = error?.response?.data?.message;
  if (Array.isArray(apiMessage)) return apiMessage.join('. ');
  if (typeof apiMessage === 'string' && apiMessage.trim()) return apiMessage;

  const nested = error?.response?.data?.error?.message;
  if (typeof nested === 'string' && nested.trim()) return nested;

  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

class RecetasService {
  private readonly basePath = '/recetas';

  async create(payload: RecetaPayload): Promise<any> {
    const response = await axiosInstance.post(this.basePath, payload);
    return unwrapEntity(response.data);
  }

  async findAll(params: RecetasQueryParams = {}): Promise<RecetasPage> {
    const response = await axiosInstance.get(this.basePath, { params });
    const { records, meta } = unwrapPage(response.data);

    return {
      data: records,
      meta: {
        total: Number(meta?.total ?? records.length ?? 0),
        page: Number(meta?.page ?? params.page ?? 1),
        limit: Number(meta?.limit ?? params.limit ?? 20),
        totalPages: Number(meta?.totalPages ?? (records.length ? 1 : 0)),
      },
    };
  }

  async findOne(id: number): Promise<any> {
    const response = await axiosInstance.get(`${this.basePath}/${id}`);
    return unwrapEntity(response.data);
  }

  async update(id: number, payload: Partial<RecetaPayload>): Promise<any> {
    const response = await axiosInstance.patch(`${this.basePath}/${id}`, payload);
    return unwrapEntity(response.data);
  }

  async remove(id: number): Promise<any> {
    const response = await axiosInstance.delete(`${this.basePath}/${id}`);
    return unwrapEntity(response.data);
  }

  async findByConsultaId(consultaId: number): Promise<any | null> {
    const result = await this.findAll({ page: 1, limit: 20, consultaId });
    return result.data.find((item: any) => Number(item?.consultaId ?? item?.consulta_id) === consultaId) ?? result.data[0] ?? null;
  }
}

export default new RecetasService();
