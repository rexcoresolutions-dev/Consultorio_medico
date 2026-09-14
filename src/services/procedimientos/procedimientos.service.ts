export type EstadoProcedimiento = 'activo' | 'inactivo';
export type TipoMovimientoProcedimiento = 'registro' | 'correccion' | 'saldo_inicial';

export type ProcedimientoCatalogo = {
  id: number;
  nombre: string;
  descripcion: string;
  estado: EstadoProcedimiento;
  creado_en: string;
  actualizado_en: string;
};

export type MovimientoProcedimiento = {
  id: string;
  procedimiento_id: number;
  procedimiento_nombre: string;
  tipo: TipoMovimientoProcedimiento;
  cantidad: number;
  /** Total del procedimiento dentro de la jornada del movimiento. */
  total_anterior: number;
  /** Total del procedimiento dentro de la jornada del movimiento. */
  total_nuevo: number;
  motivo: string;
  fecha: string;
  usuario_nombre: string;
  sucursal_nombre: string;
};

export type ProcedimientoInput = {
  nombre: string;
  descripcion?: string;
  estado?: EstadoProcedimiento;
};

export type ResumenProcedimientoDia = {
  procedimiento_id: number;
  procedimiento_nombre: string;
  total: number;
  registros: number;
  correcciones: number;
};

export type ResumenDiarioProcedimientos = {
  fecha: string; // YYYY-MM-DD local
  total: number;
  registros: number;
  correcciones: number;
  tipos_utilizados: number;
  procedimiento_principal: string;
  procedimiento_principal_total: number;
  detalle: ResumenProcedimientoDia[];
  movimientos: number;
};

export const PROCEDIMIENTOS_UPDATED_EVENT = 'consultorio-procedimientos-updated';

const CATALOGO_KEY = 'consultorio_procedimientos_catalogo_v2';
const MOVIMIENTOS_KEY = 'consultorio_procedimientos_movimientos_v2';
const MIGRACION_KEY = 'consultorio_procedimientos_migracion_v2';
const LEGACY_KEY = 'procedimientos_globales_v1';

const PROCEDIMIENTOS_BASE: ProcedimientoCatalogo[] = [
  { id: 1, nombre: 'APLICACIÓN DE INYECCIÓN', descripcion: 'Aplicación de medicamento por vía inyectable.', estado: 'activo', creado_en: '', actualizado_en: '' },
  { id: 2, nombre: 'COLOCACIÓN Y RETIRO DE IMPLANTES', descripcion: 'Colocación o retiro de implantes en consultorio.', estado: 'activo', creado_en: '', actualizado_en: '' },
  { id: 3, nombre: 'CONTROL DE EMBARAZO', descripcion: 'Atención y seguimiento general de embarazo.', estado: 'activo', creado_en: '', actualizado_en: '' },
  { id: 4, nombre: 'CONTROL DE NIÑO SANO', descripcion: 'Control preventivo y seguimiento del niño sano.', estado: 'activo', creado_en: '', actualizado_en: '' },
  { id: 5, nombre: 'CURACIÓN', descripcion: 'Curación y manejo básico de heridas.', estado: 'activo', creado_en: '', actualizado_en: '' },
  { id: 6, nombre: 'EXTRACCIÓN DE CUERPO EXTRAÑO', descripcion: 'Extracción de cuerpo extraño de baja complejidad.', estado: 'activo', creado_en: '', actualizado_en: '' },
  { id: 7, nombre: 'GLUCOMETRÍA', descripcion: 'Medición capilar de glucosa.', estado: 'activo', creado_en: '', actualizado_en: '' },
  { id: 8, nombre: 'LAVADO NASAL', descripcion: 'Lavado y aseo de cavidad nasal.', estado: 'activo', creado_en: '', actualizado_en: '' },
  { id: 9, nombre: 'LAVADO ÓTICO', descripcion: 'Lavado y limpieza del conducto auditivo.', estado: 'activo', creado_en: '', actualizado_en: '' },
  { id: 10, nombre: 'MEDICINA PREVENTIVA', descripcion: 'Intervención o actividad preventiva realizada en consultorio.', estado: 'activo', creado_en: '', actualizado_en: '' },
  { id: 11, nombre: 'NEBULIZACIÓN', descripcion: 'Administración de tratamiento mediante nebulización.', estado: 'activo', creado_en: '', actualizado_en: '' },
  { id: 12, nombre: 'ONICOCRIPTOSIS', descripcion: 'Atención de uña encarnada u onicocriptosis.', estado: 'activo', creado_en: '', actualizado_en: '' },
];

const nowIso = () => new Date().toISOString();
const normalizeText = (value: unknown) => String(value ?? '').trim();

export const getLocalDayKey = (value: Date | string = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const parseJson = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const notifyUpdated = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PROCEDIMIENTOS_UPDATED_EVENT));
  }
};

const getUserContext = () => {
  const user = parseJson<any>('user', null);
  const authUser = parseJson<any>('auth_user', null);
  const sessionUser = parseJson<any>('currentUser', null);
  const resolved = user ?? authUser ?? sessionUser ?? {};

  const fullName = [
    resolved?.nombre,
    resolved?.primerApellido ?? resolved?.primer_apellido,
    resolved?.segundoApellido ?? resolved?.segundo_apellido,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  const usuarioNombre =
    fullName ||
    normalizeText(resolved?.name) ||
    normalizeText(resolved?.nombreCompleto) ||
    normalizeText(resolved?.email) ||
    'Usuario del sistema';

  const sucursalActiva =
    parseJson<any>('sucursal_activa', null) ??
    parseJson<any>('sucursalActiva', null) ??
    parseJson<any>('selectedSucursal', null);

  const sucursalNombre =
    normalizeText(sucursalActiva?.nombre) ||
    normalizeText(resolved?.sucursal?.nombre) ||
    normalizeText(resolved?.consultorio?.nombre) ||
    'Consultorio actual';

  return { usuarioNombre, sucursalNombre };
};

const buildBaseCatalog = (): ProcedimientoCatalogo[] => {
  const fecha = nowIso();
  return PROCEDIMIENTOS_BASE.map((item) => ({ ...item, creado_en: fecha, actualizado_en: fecha }));
};

const initializeCatalog = () => {
  const saved = parseJson<any[]>(CATALOGO_KEY, []);
  if (Array.isArray(saved) && saved.length > 0) return;
  writeJson(CATALOGO_KEY, buildBaseCatalog());
};

const migrateLegacyCountsOnce = () => {
  if (localStorage.getItem(MIGRACION_KEY) === '1') return;

  const legacy = parseJson<any[]>(LEGACY_KEY, []);
  const existingMovements = parseJson<MovimientoProcedimiento[]>(MOVIMIENTOS_KEY, []);

  if (existingMovements.length === 0 && Array.isArray(legacy) && legacy.length > 0) {
    const { sucursalNombre } = getUserContext();
    const migrated: MovimientoProcedimiento[] = legacy
      .map((item) => ({
        id: `mig-${Number(item?.id) || 0}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        procedimiento_id: Number(item?.id) || 0,
        procedimiento_nombre: normalizeText(item?.nombre) || 'Procedimiento',
        tipo: 'saldo_inicial' as const,
        cantidad: Math.max(0, Number(item?.cantidad) || 0),
        total_anterior: 0,
        total_nuevo: Math.max(0, Number(item?.cantidad) || 0),
        motivo: 'Conteo previo migrado al historial simulado',
        fecha: nowIso(),
        usuario_nombre: 'Sistema',
        sucursal_nombre: sucursalNombre,
      }))
      .filter((item) => item.procedimiento_id > 0 && item.cantidad > 0);

    if (migrated.length > 0) writeJson(MOVIMIENTOS_KEY, migrated);
  }

  localStorage.setItem(MIGRACION_KEY, '1');
};

const ensureInitialized = () => {
  initializeCatalog();
  migrateLegacyCountsOnce();
};

const movementsForDay = (movements: MovimientoProcedimiento[], dayKey: string) =>
  movements.filter((item) => getLocalDayKey(item.fecha) === dayKey);

const totalForProcedureInDay = (
  procedimientoId: number,
  movements: MovimientoProcedimiento[],
  dayKey: string,
) =>
  movementsForDay(movements, dayKey)
    .filter((item) => item.procedimiento_id === procedimientoId)
    .reduce((total, item) => total + item.cantidad, 0);

const buildDailySummary = (
  dayKey: string,
  movements: MovimientoProcedimiento[],
): ResumenDiarioProcedimientos => {
  const dayMovements = movementsForDay(movements, dayKey);
  const byProcedure = new Map<number, ResumenProcedimientoDia>();

  dayMovements.forEach((item) => {
    const current = byProcedure.get(item.procedimiento_id) ?? {
      procedimiento_id: item.procedimiento_id,
      procedimiento_nombre: item.procedimiento_nombre,
      total: 0,
      registros: 0,
      correcciones: 0,
    };

    current.total += item.cantidad;
    if (item.cantidad > 0) current.registros += item.cantidad;
    if (item.cantidad < 0) current.correcciones += Math.abs(item.cantidad);
    byProcedure.set(item.procedimiento_id, current);
  });

  const detalle = [...byProcedure.values()]
    .map((item) => ({ ...item, total: Math.max(0, item.total) }))
    .filter((item) => item.total > 0 || item.registros > 0 || item.correcciones > 0)
    .sort((a, b) => b.total - a.total || a.procedimiento_nombre.localeCompare(b.procedimiento_nombre));

  const principal = detalle.find((item) => item.total > 0);
  const registros = dayMovements
    .filter((item) => item.cantidad > 0)
    .reduce((sum, item) => sum + item.cantidad, 0);
  const correcciones = dayMovements
    .filter((item) => item.cantidad < 0)
    .reduce((sum, item) => sum + Math.abs(item.cantidad), 0);
  const total = detalle.reduce((sum, item) => sum + Math.max(0, item.total), 0);

  return {
    fecha: dayKey,
    total,
    registros,
    correcciones,
    tipos_utilizados: detalle.filter((item) => item.total > 0).length,
    procedimiento_principal: principal?.procedimiento_nombre ?? 'Sin procedimientos',
    procedimiento_principal_total: principal?.total ?? 0,
    detalle,
    movimientos: dayMovements.length,
  };
};

class ProcedimientosService {
  constructor() {
    if (typeof window !== 'undefined') ensureInitialized();
  }

  getCatalogo(): ProcedimientoCatalogo[] {
    ensureInitialized();
    const saved = parseJson<ProcedimientoCatalogo[]>(CATALOGO_KEY, []);
    return [...saved].sort((a, b) => a.id - b.id);
  }

  getMovimientos(): MovimientoProcedimiento[] {
    ensureInitialized();
    const saved = parseJson<MovimientoProcedimiento[]>(MOVIMIENTOS_KEY, []);
    return [...saved].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }

  getMovimientosPorDia(dayKey: string): MovimientoProcedimiento[] {
    return movementsForDay(this.getMovimientos(), dayKey);
  }

  getCantidadDia(procedimientoId: number, dayKey = getLocalDayKey()): number {
    return Math.max(0, totalForProcedureInDay(procedimientoId, this.getMovimientos(), dayKey));
  }

  getCantidadesDia(dayKey = getLocalDayKey()): Record<number, number> {
    const catalogo = this.getCatalogo();
    const movimientos = this.getMovimientos();
    return Object.fromEntries(
      catalogo.map((item) => [
        item.id,
        Math.max(0, totalForProcedureInDay(item.id, movimientos, dayKey)),
      ]),
    );
  }

  getTotalHistorico(procedimientoId?: number): number {
    return this.getMovimientos()
      .filter((item) => procedimientoId === undefined || item.procedimiento_id === procedimientoId)
      .reduce((sum, item) => sum + item.cantidad, 0);
  }

  getResumenDia(dayKey = getLocalDayKey()): ResumenDiarioProcedimientos {
    return buildDailySummary(dayKey, this.getMovimientos());
  }

  getResumenesDiarios(): ResumenDiarioProcedimientos[] {
    const movimientos = this.getMovimientos();
    const days = [...new Set(movimientos.map((item) => getLocalDayKey(item.fecha)).filter(Boolean))];
    return days
      .map((dayKey) => buildDailySummary(dayKey, movimientos))
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }

  createProcedimiento(input: ProcedimientoInput): ProcedimientoCatalogo {
    const catalogo = this.getCatalogo();
    const fecha = nowIso();
    const nombre = normalizeText(input.nombre).toUpperCase();

    if (!nombre) throw new Error('Captura el nombre del procedimiento.');
    if (catalogo.some((item) => item.nombre.toUpperCase() === nombre)) {
      throw new Error('Ya existe un procedimiento con ese nombre.');
    }

    const procedimiento: ProcedimientoCatalogo = {
      id: Math.max(0, ...catalogo.map((item) => Number(item.id) || 0)) + 1,
      nombre,
      descripcion: normalizeText(input.descripcion),
      estado: input.estado ?? 'activo',
      creado_en: fecha,
      actualizado_en: fecha,
    };

    writeJson(CATALOGO_KEY, [...catalogo, procedimiento]);
    notifyUpdated();
    return procedimiento;
  }

  updateProcedimiento(id: number, input: Partial<ProcedimientoInput>): ProcedimientoCatalogo {
    const catalogo = this.getCatalogo();
    const current = catalogo.find((item) => item.id === id);
    if (!current) throw new Error('No se encontró el procedimiento.');

    const nombre = input.nombre !== undefined ? normalizeText(input.nombre).toUpperCase() : current.nombre;
    if (!nombre) throw new Error('Captura el nombre del procedimiento.');

    if (catalogo.some((item) => item.id !== id && item.nombre.toUpperCase() === nombre)) {
      throw new Error('Ya existe otro procedimiento con ese nombre.');
    }

    const updated: ProcedimientoCatalogo = {
      ...current,
      nombre,
      descripcion: input.descripcion !== undefined ? normalizeText(input.descripcion) : current.descripcion,
      estado: input.estado ?? current.estado,
      actualizado_en: nowIso(),
    };

    writeJson(CATALOGO_KEY, catalogo.map((item) => (item.id === id ? updated : item)));
    notifyUpdated();
    return updated;
  }

  registrarMovimiento(args: {
    procedimientoId: number;
    cantidad: number;
    tipo: TipoMovimientoProcedimiento;
    motivo?: string;
  }): MovimientoProcedimiento {
    const catalogo = this.getCatalogo();
    const procedimiento = catalogo.find((item) => item.id === args.procedimientoId);
    if (!procedimiento) throw new Error('No se encontró el procedimiento.');

    const delta = Math.trunc(Number(args.cantidad));
    if (!Number.isFinite(delta) || delta === 0) {
      throw new Error('La cantidad del movimiento no es válida.');
    }

    const movimientos = this.getMovimientos();
    const dayKey = getLocalDayKey();
    const totalAnterior = Math.max(
      0,
      totalForProcedureInDay(procedimiento.id, movimientos, dayKey),
    );
    const totalNuevo = totalAnterior + delta;

    if (totalNuevo < 0) {
      throw new Error('No puedes corregir más procedimientos de los registrados hoy.');
    }

    if (args.tipo === 'correccion' && !normalizeText(args.motivo)) {
      throw new Error('Captura el motivo de la corrección.');
    }

    const { usuarioNombre, sucursalNombre } = getUserContext();
    const movimiento: MovimientoProcedimiento = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      procedimiento_id: procedimiento.id,
      procedimiento_nombre: procedimiento.nombre,
      tipo: args.tipo,
      cantidad: delta,
      total_anterior: totalAnterior,
      total_nuevo: totalNuevo,
      motivo:
        normalizeText(args.motivo) ||
        (args.tipo === 'registro' ? 'Procedimiento realizado' : 'Movimiento de procedimiento'),
      fecha: nowIso(),
      usuario_nombre: usuarioNombre,
      sucursal_nombre: sucursalNombre,
    };

    writeJson(MOVIMIENTOS_KEY, [movimiento, ...movimientos]);
    notifyUpdated();
    return movimiento;
  }

  clearSimulation(): void {
    localStorage.removeItem(CATALOGO_KEY);
    localStorage.removeItem(MOVIMIENTOS_KEY);
    localStorage.removeItem(MIGRACION_KEY);
    ensureInitialized();
    notifyUpdated();
  }
}

export const procedimientosService = new ProcedimientosService();
