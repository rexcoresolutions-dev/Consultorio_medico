import axiosInstance from '../../api/axios.config';

export type EstadoMedicamento = 'activo' | 'inactivo';
export type TipoMovimientoInventario = 'entrada' | 'salida' | 'ajuste';

export type MedicamentoInventario = {
  id: number | string;
  sucursal_id?: number;
  nombre_comercial: string;
  sustancia_activa: string;
  concentracion: string;
  forma_farmaceutica: string;
  presentacion: string;
  via_administracion: string;
  laboratorio: string;
  lote: string;
  fecha_caducidad: string;
  stock_actual: number;
  stock_minimo: number;
  unidad_stock: string;
  ubicacion: string;
  observaciones: string;
  estado: EstadoMedicamento;
  creado_en: string;
  actualizado_en: string;
};

export type MovimientoInventario = {
  id: number | string;
  medicamento_id: number | string;
  medicamento_nombre: string;
  tipo: TipoMovimientoInventario;
  cantidad: number;
  stock_anterior: number;
  stock_nuevo: number;
  motivo: string;
  fecha: string;
};

export type MedicamentoInventarioInput = Omit<
  MedicamentoInventario,
  'id' | 'sucursal_id' | 'creado_en' | 'actualizado_en'
>;

export type InventarioQuery = {
  page?: number;
  limit?: number;
  sucursalId?: number;
  activo?: boolean;
  search?: string;
};

export type MovimientoQuery = {
  page?: number;
  limit?: number;
  sucursalId?: number;
  tipo?: TipoMovimientoInventario;
};

export type PaginatedResult<T> = {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export const INVENTARIO_UPDATED_EVENT = 'consultorio-inventario-updated';

const numberValue = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const stringValue = (value: unknown, fallback = '') => {
  if (value === null || value === undefined) return fallback;
  return String(value);
};

const firstDefined = (...values: any[]) => values.find((value) => value !== undefined && value !== null);

const unwrapEntity = (responseData: any): any => {
  return (
    responseData?.data?.data ??
    responseData?.data?.inventario ??
    responseData?.data?.movimiento ??
    responseData?.data?.result ??
    responseData?.data ??
    responseData?.inventario ??
    responseData?.movimiento ??
    responseData?.result ??
    responseData
  );
};

const unwrapPage = (responseData: any): { records: any[]; meta: any } => {
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

const normalizeEstado = (raw: any): EstadoMedicamento => {
  const activo = firstDefined(raw?.activo, raw?.estado, raw?.status);

  if (typeof activo === 'boolean') return activo ? 'activo' : 'inactivo';

  const text = String(activo ?? 'activo').toLowerCase();
  return ['false', '0', 'inactivo', 'inactive', 'deshabilitado'].includes(text)
    ? 'inactivo'
    : 'activo';
};

const normalizeMedicamento = (raw: any): MedicamentoInventario => ({
  id: firstDefined(raw?.id, raw?.inventarioId, raw?.inventario_id, ''),
  sucursal_id: numberValue(
    firstDefined(raw?.sucursalId, raw?.sucursal_id, raw?.sucursal?.id),
    0,
  ) || undefined,
  nombre_comercial: stringValue(
    firstDefined(raw?.nombre, raw?.nombreComercial, raw?.nombre_comercial),
  ),
  sustancia_activa: stringValue(
    firstDefined(raw?.sustanciaActiva, raw?.sustancia_activa),
  ),
  concentracion: stringValue(raw?.concentracion),
  forma_farmaceutica: stringValue(
    firstDefined(raw?.formaFarmaceutica, raw?.forma_farmaceutica),
  ),
  presentacion: stringValue(raw?.presentacion),
  via_administracion: stringValue(
    firstDefined(raw?.viaAdministracion, raw?.via_administracion),
  ),
  laboratorio: stringValue(raw?.laboratorio),
  lote: stringValue(raw?.lote),
  fecha_caducidad: stringValue(
    firstDefined(raw?.fechaCaducidad, raw?.fecha_caducidad),
  ).slice(0, 10),
  stock_actual: numberValue(
    firstDefined(
      raw?.existenciaActual,
      raw?.existencia,
      raw?.stockActual,
      raw?.stock_actual,
      raw?.existenciaInicial,
    ),
  ),
  stock_minimo: numberValue(firstDefined(raw?.stockMinimo, raw?.stock_minimo)),
  unidad_stock: stringValue(firstDefined(raw?.unidadStock, raw?.unidad_stock), 'piezas'),
  ubicacion: stringValue(raw?.ubicacion),
  observaciones: stringValue(raw?.observaciones),
  estado: normalizeEstado(raw),
  creado_en: stringValue(firstDefined(raw?.createdAt, raw?.creadoEn, raw?.creado_en)),
  actualizado_en: stringValue(firstDefined(raw?.updatedAt, raw?.actualizadoEn, raw?.actualizado_en)),
});

const normalizeTipoMovimiento = (value: unknown): TipoMovimientoInventario => {
  const text = String(value ?? '').toLowerCase();
  if (text.includes('salida')) return 'salida';
  if (text.includes('ajuste')) return 'ajuste';
  return 'entrada';
};

const normalizeMovimiento = (raw: any): MovimientoInventario => {
  const inventario = raw?.inventario ?? raw?.medicamento ?? {};
  const stockAnterior = numberValue(
    firstDefined(raw?.stockAntes, raw?.stockAnterior, raw?.existenciaAnterior, raw?.stock_anterior),
  );
  const stockNuevo = numberValue(
    firstDefined(raw?.stockDespues, raw?.stockNuevo, raw?.existenciaNueva, raw?.existenciaPosterior, raw?.stock_nuevo),
    stockAnterior,
  );

  return {
    id: firstDefined(raw?.id, raw?.movimientoId, raw?.movimiento_id, ''),
    medicamento_id: firstDefined(
      raw?.inventarioId,
      raw?.inventario_id,
      raw?.medicamentoId,
      raw?.medicamento_id,
      inventario?.id,
      '',
    ),
    medicamento_nombre: stringValue(
      firstDefined(
        raw?.medicamentoNombre,
        raw?.medicamento_nombre,
        raw?.nombreMedicamento,
        inventario?.nombre,
        inventario?.nombreComercial,
        inventario?.nombre_comercial,
      ),
      'Medicamento',
    ),
    tipo: normalizeTipoMovimiento(firstDefined(raw?.tipo, raw?.tipoMovimiento, raw?.movimiento)),
    cantidad: Math.abs(numberValue(raw?.cantidad)),
    stock_anterior: stockAnterior,
    stock_nuevo: stockNuevo,
    motivo: stringValue(firstDefined(raw?.motivo, raw?.observaciones, raw?.referencia), 'Movimiento sin observaciones'),
    fecha: stringValue(firstDefined(raw?.createdAt, raw?.fecha, raw?.fechaMovimiento, raw?.creadoEn)),
  };
};

const toCreatePayload = (input: MedicamentoInventarioInput, sucursalId: number) => ({
  sucursalId,
  nombre: input.nombre_comercial.trim(),
  sustanciaActiva: input.sustancia_activa.trim(),
  concentracion: input.concentracion?.trim() || '',
  formaFarmaceutica: input.forma_farmaceutica || '',
  viaAdministracion: input.via_administracion || '',
  presentacion: input.presentacion?.trim() || '',
  laboratorio: input.laboratorio?.trim() || '',
  lote: input.lote?.trim() || '',
  fechaCaducidad: input.fecha_caducidad || '',
  ubicacion: input.ubicacion?.trim() || '',
  existenciaInicial: Math.max(0, numberValue(input.stock_actual)),
  stockMinimo: Math.max(0, numberValue(input.stock_minimo)),
  unidadStock: input.unidad_stock || 'piezas',
  activo: input.estado === 'activo',
  observaciones: input.observaciones?.trim() || '',
});

const toUpdatePayload = (input: Partial<MedicamentoInventarioInput>) => {
  const payload: Record<string, unknown> = {};

  if (input.nombre_comercial !== undefined) payload.nombre = input.nombre_comercial.trim();
  if (input.sustancia_activa !== undefined) payload.sustanciaActiva = input.sustancia_activa.trim();
  if (input.concentracion !== undefined) payload.concentracion = input.concentracion.trim();
  if (input.forma_farmaceutica !== undefined) payload.formaFarmaceutica = input.forma_farmaceutica;
  if (input.via_administracion !== undefined) payload.viaAdministracion = input.via_administracion;
  if (input.presentacion !== undefined) payload.presentacion = input.presentacion.trim();
  if (input.laboratorio !== undefined) payload.laboratorio = input.laboratorio.trim();
  if (input.lote !== undefined) payload.lote = input.lote.trim();
  if (input.fecha_caducidad !== undefined) payload.fechaCaducidad = input.fecha_caducidad;
  if (input.ubicacion !== undefined) payload.ubicacion = input.ubicacion.trim();
  if (input.stock_minimo !== undefined) payload.stockMinimo = Math.max(0, numberValue(input.stock_minimo));
  if (input.unidad_stock !== undefined) payload.unidadStock = input.unidad_stock;
  if (input.estado !== undefined) payload.activo = input.estado === 'activo';
  if (input.observaciones !== undefined) payload.observaciones = input.observaciones.trim();

  return payload;
};

export const getInventoryApiError = (error: any, fallback = 'No fue posible completar la operación.') => {
  const apiMessage = error?.response?.data?.message;

  if (Array.isArray(apiMessage)) return apiMessage.join('. ');
  if (typeof apiMessage === 'string' && apiMessage.trim()) return apiMessage;

  const nested = error?.response?.data?.error?.message;
  if (typeof nested === 'string' && nested.trim()) return nested;

  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

const parseStoredJson = (key: string) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const resolveSucursalIdFromSession = (): number | undefined => {
  if (typeof window === 'undefined') return undefined;

  const user = parseStoredJson('user');
  const sucursalActiva =
    parseStoredJson('sucursal_activa') ??
    parseStoredJson('sucursalActiva') ??
    parseStoredJson('selectedSucursal');

  const candidates = [
    sucursalActiva?.id,
    sucursalActiva?.sucursalId,
    sucursalActiva?.sucursal_id,
    localStorage.getItem('sucursalId'),
    localStorage.getItem('sucursal_id'),
    user?.sucursalId,
    user?.sucursal_id,
    user?.sucursal?.id,
    user?.consultorioId,
    user?.consultorio_id,
    user?.consultorio?.id,
  ];

  for (const candidate of candidates) {
    const id = Number(candidate);
    if (Number.isInteger(id) && id > 0) return id;
  }

  return undefined;
};

const notifyUpdated = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(INVENTARIO_UPDATED_EVENT));
  }
};

class InventoryService {
  private readonly basePath = '/inventario';

  async findAll(params: InventarioQuery = {}): Promise<PaginatedResult<MedicamentoInventario>> {
    const response = await axiosInstance.get(this.basePath, { params });
    const { records, meta } = unwrapPage(response.data);
    const data = records.map(normalizeMedicamento);

    return {
      data,
      meta: {
        total: numberValue(meta?.total, data.length),
        page: numberValue(meta?.page, params.page ?? 1),
        limit: numberValue(meta?.limit, params.limit ?? 20),
        totalPages: numberValue(meta?.totalPages, data.length ? 1 : 0),
      },
    };
  }

  async getMedicamentos(): Promise<MedicamentoInventario[]> {
    const sucursalId = resolveSucursalIdFromSession();
    const first = await this.findAll({ page: 1, limit: 100, sucursalId });
    const all = [...first.data];

    if (first.meta.totalPages > 1) {
      for (let page = 2; page <= first.meta.totalPages; page += 1) {
        const next = await this.findAll({ page, limit: first.meta.limit || 100, sucursalId });
        all.push(...next.data);
      }
    }

    return all.sort((a, b) => a.nombre_comercial.localeCompare(b.nombre_comercial, 'es'));
  }

  async getMedicamentosActivos(): Promise<MedicamentoInventario[]> {
    const medicamentos = await this.getMedicamentos();
    return medicamentos.filter((item) => item.estado === 'activo');
  }

  async getMedicamentoById(id: number | string): Promise<MedicamentoInventario> {
    const response = await axiosInstance.get(`${this.basePath}/${id}`);
    return normalizeMedicamento(unwrapEntity(response.data));
  }

  async createMedicamento(
    input: MedicamentoInventarioInput,
    explicitSucursalId?: number,
  ): Promise<MedicamentoInventario> {
    const sucursalId = explicitSucursalId ?? resolveSucursalIdFromSession();

    if (!sucursalId) {
      throw new Error('No se pudo identificar la sucursal activa del usuario. Selecciona una sucursal o vuelve a iniciar sesión.');
    }

    const response = await axiosInstance.post(this.basePath, toCreatePayload(input, sucursalId));
    notifyUpdated();
    return normalizeMedicamento(unwrapEntity(response.data));
  }

  async updateMedicamento(
    id: number | string,
    changes: Partial<MedicamentoInventarioInput>,
  ): Promise<MedicamentoInventario> {
    const response = await axiosInstance.patch(`${this.basePath}/${id}`, toUpdatePayload(changes));
    notifyUpdated();
    return normalizeMedicamento(unwrapEntity(response.data));
  }

  async deleteMedicamento(id: number | string): Promise<void> {
    await axiosInstance.delete(`${this.basePath}/${id}`);
    notifyUpdated();
  }

  private async getMovimientosPage(
    path: string,
    params: MovimientoQuery = {},
  ): Promise<PaginatedResult<MovimientoInventario>> {
    const response = await axiosInstance.get(path, { params });
    const { records, meta } = unwrapPage(response.data);
    const data = records.map(normalizeMovimiento);

    return {
      data,
      meta: {
        total: numberValue(meta?.total, data.length),
        page: numberValue(meta?.page, params.page ?? 1),
        limit: numberValue(meta?.limit, params.limit ?? 20),
        totalPages: numberValue(meta?.totalPages, data.length ? 1 : 0),
      },
    };
  }

  async getMovimientos(): Promise<MovimientoInventario[]> {
    const sucursalId = resolveSucursalIdFromSession();
    const first = await this.getMovimientosPage(`${this.basePath}/movimientos`, {
      page: 1,
      limit: 100,
      sucursalId,
    });
    const all = [...first.data];

    if (first.meta.totalPages > 1) {
      for (let page = 2; page <= first.meta.totalPages; page += 1) {
        const next = await this.getMovimientosPage(`${this.basePath}/movimientos`, {
          page,
          limit: first.meta.limit || 100,
          sucursalId,
        });
        all.push(...next.data);
      }
    }

    return all.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }

  async getMovimientosByMedicamento(id: number | string): Promise<MovimientoInventario[]> {
    const path = `${this.basePath}/${id}/movimientos`;
    const first = await this.getMovimientosPage(path, { page: 1, limit: 100 });
    const all = [...first.data];

    if (first.meta.totalPages > 1) {
      for (let page = 2; page <= first.meta.totalPages; page += 1) {
        const next = await this.getMovimientosPage(path, {
          page,
          limit: first.meta.limit || 100,
        });
        all.push(...next.data);
      }
    }

    return all.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }

  async registrarMovimiento(params: {
    medicamentoId: number | string;
    tipo: TipoMovimientoInventario;
    cantidad: number;
    motivo: string;
  }): Promise<MovimientoInventario> {
    const cantidad = numberValue(params.cantidad);

    if (params.tipo === 'ajuste') {
      if (cantidad < 0) throw new Error('La existencia ajustada no puede ser negativa.');
    } else if (cantidad <= 0) {
      throw new Error('La cantidad debe ser mayor a cero.');
    }

    const response = await axiosInstance.post(
      `${this.basePath}/${params.medicamentoId}/movimientos`,
      {
        tipo: params.tipo.toUpperCase(),
        cantidad,
        motivo: params.motivo.trim() || 'Movimiento sin observaciones',
      },
    );

    notifyUpdated();
    return normalizeMovimiento(unwrapEntity(response.data));
  }
}

export default new InventoryService();
