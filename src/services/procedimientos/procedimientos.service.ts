import api from '../../api/axios.config';
import { apiData } from '../operacion/operacion.service';
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

export const getLocalDayKey = (value: Date | string = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
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
  private catalogo: ProcedimientoCatalogo[] = [];
  private movimientos: MovimientoProcedimiento[] = [];
  async load() {
    this.catalogo = []; this.movimientos = [];
    const [catalogo, movimientos] = await Promise.all([
      apiData<ProcedimientoCatalogo[]>(api.get('/procedimientos')),
      apiData<MovimientoProcedimiento[]>(api.get('/procedimientos/movimientos')),
    ]);
    this.catalogo = catalogo; this.movimientos = movimientos;
  }
  getCatalogo() { return this.catalogo; }
  getMovimientos() { return this.movimientos; }
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

  createProcedimiento(input: ProcedimientoInput): Promise<ProcedimientoCatalogo> {
    return apiData(api.post('/procedimientos', input));
  }
  updateProcedimiento(id: number, input: ProcedimientoInput): Promise<ProcedimientoCatalogo> {
    return apiData(api.patch('/procedimientos/' + id, input));
  }
  registrarMovimiento(input: { procedimientoId: number; cantidad: number; tipo: TipoMovimientoProcedimiento; motivo?: string }): Promise<MovimientoProcedimiento> {
    return apiData(api.post('/procedimientos/movimientos', input));
  }
}

export const procedimientosService = new ProcedimientosService();
