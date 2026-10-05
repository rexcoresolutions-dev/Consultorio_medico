import api from '../../api/axios.config';
import { apiData, allPages } from '../operacion/operacion.service';
import dayjs from 'dayjs';
import pacientesService, { type PacienteData } from '../pacientes/pacientes.service';
import recetasService from '../recetas/recetas.service';
import consultasService from '../consultas/consultas.service';
import { queueOfflineRequest } from '../offline/offline-sync.service';

export type CitaOrigen = 'MANUAL' | 'SEGUIMIENTO_RECETA';
export type CitaEstado =
  | 'PROGRAMADA'
  | 'CONFIRMADA'
  | 'EN_ESPERA'
  | 'COMPLETADA'
  | 'CANCELADA';
export type CitaTipo = 'CONSULTA' | 'SEGUIMIENTO' | 'REVISION' | 'PROCEDIMIENTO';

export interface CitaManual {
  id: string;
  pacienteId: number | string;
  fecha: string;
  hora: string;
  duracion: number;
  tipo: CitaTipo;
  motivo: string;
  estado: CitaEstado;
  notas?: string;
  createdAt: string;
  updatedAt: string;
}

interface SeguimientoOverride {
  recetaId: number;
  hora?: string;
  duracion?: number;
  estado?: CitaEstado;
  notas?: string;
  updatedAt: string;
}

export interface CitaAgenda {
  id: string;
  origen: CitaOrigen;
  pacienteId: number;
  paciente: PacienteData | null;
  pacienteNombre: string;
  expediente?: string;
  telefono?: string;
  fecha: string;
  hora: string | null;
  duracion: number;
  tipo: CitaTipo;
  motivo: string;
  estado: CitaEstado;
  notas?: string;
  recetaId?: number;
  consultaId?: number;
  atendidaPorConsulta?: boolean;
}

export interface AgendaCitasData {
  citas: CitaAgenda[];
  pacientes: PacienteData[];
  warnings: string[];
}

export interface CrearCitaManualInput {
  pacienteId: number | string;
  fecha: string;
  hora: string;
  duracion: number;
  tipo: CitaTipo;
  motivo: string;
  estado?: CitaEstado;
  notas?: string;
}

const toDateKey = (value: any): string => {
  if (!value) return '';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : String(value).slice(0, 10);
};

const getPacienteIdFromConsulta = (consulta: any): number | null => {
  const id = Number(
    consulta?.pacienteId ??
      consulta?.paciente_id ??
      consulta?.paciente?.id ??
      consulta?.Paciente?.id,
  );
  return Number.isFinite(id) && id > 0 ? id : null;
};

const fullName = (paciente?: PacienteData | null) => {
  if (!paciente) return 'Paciente no disponible';
  return [paciente.nombre, paciente.primer_apellido, paciente.segundo_apellido]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const getConsultaDate = (consulta: any): string =>
  toDateKey(
    consulta?.fechaHora ?? consulta?.fechaConsulta ??
      consulta?.fecha_consulta ??
      consulta?.fecha ??
      consulta?.createdAt ??
      consulta?.created_at,
  );

class CitasService {
  async getAgenda(): Promise<AgendaCitasData> {
    const warnings: string[] = [];
    const stored = await apiData<(CitaManual & { recetaId?: number })[]>(api.get('/citas'));

    const [pacientesResult, recetasResult, consultasResult] = await Promise.allSettled([
      pacientesService.getPacientes(),
      allPages(page => recetasService.findAll({ page, limit: 100 })),
      allPages(page => consultasService.findAll({ page, limit: 100 })),
    ]);

    const pacientes =
      pacientesResult.status === 'fulfilled' ? pacientesResult.value : [];
    if (pacientesResult.status === 'rejected') {
      warnings.push('No fue posible actualizar el catálogo de pacientes.');
    }

    const recetas =
      recetasResult.status === 'fulfilled' ? recetasResult.value : [];
    if (recetasResult.status === 'rejected') {
      warnings.push('No fue posible cargar los seguimientos registrados en recetas.');
    }

    const consultas =
      consultasResult.status === 'fulfilled' ? consultasResult.value : [];
    if (consultasResult.status === 'rejected') {
      warnings.push('No fue posible validar atenciones realizadas.');
    }

    const pacientesMap = new Map<number, PacienteData>();
    pacientes.forEach((paciente) => {
      const id = Number(paciente.id);
      if (Number.isFinite(id) && id > 0) pacientesMap.set(id, paciente);
    });

    const consultasMap = new Map<number, any>();
    consultas.forEach((consulta: any) => {
      const id = Number(consulta?.id);
      if (Number.isFinite(id) && id > 0) consultasMap.set(id, consulta);
    });

    const consultasAtendidas = new Set<string>();
    consultas.forEach((consulta: any) => {
      const pacienteId = getPacienteIdFromConsulta(consulta);
      const fecha = getConsultaDate(consulta);
      if (pacienteId && fecha) consultasAtendidas.add(`${pacienteId}|${fecha}`);
    });

    const manuales: CitaAgenda[] = stored.filter(item => !item.recetaId).map((item) => {
      const paciente = pacientesMap.get(Number(item.pacienteId)) ?? null;
      const attended = consultasAtendidas.has(`${item.pacienteId}|${item.fecha}`);
      const estado =
        attended && item.estado !== 'CANCELADA' ? 'COMPLETADA' : item.estado;

      return {
        id: item.id,
        origen: 'MANUAL',
        pacienteId: Number(item.pacienteId),
        paciente,
        pacienteNombre: fullName(paciente),
        expediente: paciente?.numero_expediente,
        telefono: paciente?.celular || paciente?.telefono,
        fecha: item.fecha,
        hora: item.hora || null,
        duracion: item.duracion,
        tipo: item.tipo,
        motivo: item.motivo,
        estado,
        notas: item.notas,
        atendidaPorConsulta: attended,
      };
    });

    const overrides = stored.filter(item => item.recetaId) as (CitaManual & SeguimientoOverride)[];
    const overrideMap = new Map<number, SeguimientoOverride>();
    overrides.forEach((item) => overrideMap.set(Number(item.recetaId), item));

    const seguimientos: CitaAgenda[] = recetas
      .filter((receta: any) => {
        const programar = receta?.programarSeguimiento ?? receta?.programar_seguimiento;
        const fecha = receta?.fechaSeguimiento ?? receta?.fecha_seguimiento;
        return Boolean(programar) && Boolean(fecha);
      })
      .map((receta: any) => {
        const recetaId = Number(receta?.id);
        const consultaId = Number(receta?.consultaId ?? receta?.consulta_id);
        const consulta = consultasMap.get(consultaId) ?? receta?.consulta ?? null;
        const pacienteId = Number(
          receta?.pacienteId ??
            receta?.paciente_id ??
            consulta?.pacienteId ??
            consulta?.paciente_id ??
            consulta?.paciente?.id,
        );
        const paciente = pacientesMap.get(pacienteId) ?? null;
        const fecha = toDateKey(receta?.fechaSeguimiento ?? receta?.fecha_seguimiento);
        const override = overrideMap.get(recetaId);
        const attended = Boolean(
          pacienteId && fecha && consultasAtendidas.has(`${pacienteId}|${fecha}`),
        );
        const estado: CitaEstado =
          attended && override?.estado !== 'CANCELADA'
            ? 'COMPLETADA'
            : override?.estado ?? 'PROGRAMADA';

        const diagnostico =
          consulta?.diagnosticos?.[0]?.diagnostico?.descripcion ??
          consulta?.diagnosticos?.[0]?.descripcion ??
          consulta?.motivoConsulta ??
          consulta?.motivo_consulta;

        return {
          id: `seguimiento-receta-${recetaId}`,
          origen: 'SEGUIMIENTO_RECETA',
          pacienteId,
          paciente,
          pacienteNombre: fullName(paciente),
          expediente: paciente?.numero_expediente,
          telefono: paciente?.celular || paciente?.telefono,
          fecha,
          hora: override?.hora || null,
          duracion: Number(override?.duracion ?? 30),
          tipo: 'SEGUIMIENTO',
          motivo: diagnostico
            ? `Seguimiento: ${diagnostico}`
            : 'Seguimiento indicado en receta médica',
          estado,
          notas: override?.notas,
          recetaId,
          consultaId: Number.isFinite(consultaId) ? consultaId : undefined,
          atendidaPorConsulta: attended,
        } as CitaAgenda;
      })
      .filter((item: CitaAgenda) => item.pacienteId > 0 && Boolean(item.fecha));

    const citas = [...manuales, ...seguimientos].sort((a, b) => {
      const byDate = a.fecha.localeCompare(b.fecha);
      if (byDate !== 0) return byDate;
      const aTime = a.hora ?? '99:99';
      const bTime = b.hora ?? '99:99';
      return aTime.localeCompare(bTime);
    });

    return { citas, pacientes, warnings };
  }

  async createManual(input: CrearCitaManualInput): Promise<CitaManual> {
    try { return await apiData(api.post('/citas', input)); }
    catch (error: any) {
      if (error?.response) throw error;
      const dependencies = typeof input.pacienteId === 'string' && input.pacienteId.startsWith('local:') ? [input.pacienteId] : [];
      const queued = await queueOfflineRequest('CITA_CREAR', { method: 'POST', url: '/citas', data: input }, dependencies);
      return { ...input, id: queued.localId, estado: input.estado ?? 'PROGRAMADA', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as CitaManual;
    }
  }
  updateManual(id: string, input: Partial<CrearCitaManualInput>): Promise<CitaManual> {
    return apiData(api.patch('/citas/' + id, input));
  }
  updateSeguimiento(recetaId: number, input: Pick<CrearCitaManualInput, 'hora' | 'duracion' | 'estado' | 'notas'>) {
    return apiData(api.put('/citas/seguimientos/' + recetaId, input));
  }
  clearSeguimiento(recetaId: number) { return api.delete('/citas/seguimientos/' + recetaId); }
  async setStatus(cita: CitaAgenda, estado: CitaEstado) {
    if (cita.origen === 'MANUAL') return this.updateManual(cita.id, { estado });
    if (cita.recetaId) return this.updateSeguimiento(cita.recetaId, { hora: cita.hora ?? '', duracion: cita.duracion, estado, notas: cita.notas });
  }
  hasConflict(
    citas: CitaAgenda[],
    fecha: string,
    hora: string,
    duracion: number,
    excludeId?: string,
    excludeRecetaId?: number | null,
  ): CitaAgenda | null {
    if (!hora) return null;
    const start = dayjs(`${fecha}T${hora}`);
    const end = start.add(Number(duracion || 30), 'minute');

    for (const cita of citas) {
      if (cita.id === excludeId) continue;
      if (excludeRecetaId && Number(cita.recetaId) === Number(excludeRecetaId)) continue;
      if (cita.fecha !== fecha || !cita.hora) continue;
      if (cita.estado === 'CANCELADA' || cita.estado === 'COMPLETADA') continue;

      const otherStart = dayjs(`${cita.fecha}T${cita.hora}`);
      const otherEnd = otherStart.add(cita.duracion || 30, 'minute');
      if (start.isBefore(otherEnd) && end.isAfter(otherStart)) return cita;
    }

    return null;
  }

  /**
   * Configuración compatible con DatePicker/TimePicker de Ant Design.
   * Deshabilita cada inicio de 15 minutos que se empalme con una cita activa.
   * También bloquea horarios que ya quedaron en el pasado cuando la fecha es hoy.
   */
  getDisabledTimeConfig(
    citas: CitaAgenda[],
    fechaValue: any,
    duracion = 30,
    excludeId?: string,
    excludeRecetaId?: number | null,
  ) {
    const selectedDate = dayjs(fechaValue);
    if (!selectedDate.isValid()) return {};

    const fecha = selectedDate.format('YYYY-MM-DD');
    const now = dayjs();
    const disabledByHour = new Map<number, number[]>();

    for (let hour = 0; hour < 24; hour += 1) {
      const disabledMinutes: number[] = [];

      for (const minute of [0, 15, 30, 45]) {
        const candidate = selectedDate
          .hour(hour)
          .minute(minute)
          .second(0)
          .millisecond(0);

        const past = candidate.isBefore(now);
        const conflict = this.hasConflict(
          citas,
          fecha,
          candidate.format('HH:mm'),
          duracion,
          excludeId,
          excludeRecetaId,
        );

        if (past || conflict) disabledMinutes.push(minute);
      }

      disabledByHour.set(hour, disabledMinutes);
    }

    return {
      disabledHours: () =>
        Array.from({ length: 24 }, (_, hour) => hour).filter(
          (hour) => (disabledByHour.get(hour)?.length ?? 0) === 4,
        ),
      disabledMinutes: (hour: number) => disabledByHour.get(hour) ?? [],
    };
  }

  getOccupiedAppointmentsForDate(
    citas: CitaAgenda[],
    fechaValue: any,
    excludeId?: string,
    excludeRecetaId?: number | null,
  ): CitaAgenda[] {
    const selectedDate = dayjs(fechaValue);
    if (!selectedDate.isValid()) return [];
    const fecha = selectedDate.format('YYYY-MM-DD');

    return citas.filter((cita) => {
      if (cita.fecha !== fecha || !cita.hora) return false;
      if (cita.estado === 'CANCELADA' || cita.estado === 'COMPLETADA') return false;
      if (excludeId && cita.id === excludeId) return false;
      if (excludeRecetaId && Number(cita.recetaId) === Number(excludeRecetaId)) return false;
      return true;
    });
  }
}

export default new CitasService();
