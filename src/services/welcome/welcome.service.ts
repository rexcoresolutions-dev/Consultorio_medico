import consultasService from '../consultas/consultas.service';
import recetasService from '../recetas/recetas.service';

export interface WelcomeMetrics {
  pacientesHoy: number;
  proximasCitas: number;
  pendientes: number;
  consultasHoy: number;
  recetasHoy: number;
}

export interface WelcomeData extends WelcomeMetrics {
  pacientes_hoy: number;
  proximas_citas: number;
  consultasPendientes: number;
  consultas_pendientes: number;
}

const parseStoredJson = (key: string) => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const getSessionUser = () =>
  parseStoredJson('user') ??
  parseStoredJson('usuario') ??
  parseStoredJson('auth_user') ??
  {};

const getSucursalId = (user: any): number | undefined => {
  const sucursalActiva =
    parseStoredJson('sucursal_activa') ??
    parseStoredJson('sucursalActiva') ??
    parseStoredJson('selectedSucursal');

  const candidates = [
    sucursalActiva?.id,
    sucursalActiva?.sucursalId,
    sucursalActiva?.sucursal_id,
    user?.sucursalId,
    user?.sucursal_id,
    user?.sucursal?.id,
    user?.consultorioId,
    user?.consultorio_id,
    user?.consultorio?.id,
  ];

  for (const candidate of candidates) {
    const parsed = Number(candidate);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }

  return undefined;
};

const extractFecha = (item: any): string =>
  String(
    item?.fecha ??
      item?.fechaConsulta ??
      item?.fecha_consulta ??
      item?.createdAt ??
      item?.created_at ??
      item?.updatedAt ??
      item?.updated_at ??
      '',
  );

const toDate = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const sameLocalDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const startOfLocalDay = (date: Date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const getConsultaId = (consulta: any): number | null => {
  const parsed = Number(
    consulta?.id ??
      consulta?.consultaId ??
      consulta?.consulta_id ??
      consulta?.consulta?.id ??
      0,
  );

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const getConsultaPacienteKey = (consulta: any): string | null => {
  const pacienteId = Number(
    consulta?.pacienteId ??
      consulta?.paciente_id ??
      consulta?.paciente?.id ??
      0,
  );

  if (Number.isInteger(pacienteId) && pacienteId > 0) {
    return `id:${pacienteId}`;
  }

  const paciente = consulta?.paciente ?? {};
  const nombre = [
    paciente?.nombre ?? consulta?.pacienteNombre ?? consulta?.paciente_nombre,
    paciente?.primerApellido ?? paciente?.primer_apellido,
    paciente?.segundoApellido ?? paciente?.segundo_apellido,
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return nombre ? `nombre:${nombre.toLowerCase()}` : null;
};

const getConsultaMedicoId = (consulta: any): number | null => {
  const parsed = Number(
    consulta?.medicoId ??
      consulta?.medico_id ??
      consulta?.medico?.id ??
      consulta?.usuarioId ??
      consulta?.usuario_id ??
      consulta?.usuario?.id ??
      0,
  );

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const getRecetaConsultaId = (receta: any): number | null => {
  const parsed = Number(
    receta?.consultaId ??
      receta?.consulta_id ??
      receta?.consulta?.id ??
      0,
  );

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const getRecetaSeguimiento = (receta: any): Date | null => {
  const programada = Boolean(
    receta?.programarSeguimiento ?? receta?.programar_seguimiento,
  );

  if (!programada) return null;

  return toDate(
    String(receta?.fechaSeguimiento ?? receta?.fecha_seguimiento ?? ''),
  );
};

const isPendiente = (consulta: any) => {
  const estado = String(
    consulta?.estatus ?? consulta?.estado ?? '',
  ).toUpperCase();

  return ['ABIERTA', 'PENDIENTE', 'EN CONSULTA', 'EN_CONSULTA'].includes(estado);
};

const loadAllConsultas = async (params: Record<string, any>) => {
  const first = await consultasService.findAll({ ...params, page: 1, limit: 100 });
  let items = [...first.data];
  const totalPages = Math.max(1, Number(first.meta.totalPages || 1));

  if (totalPages > 1) {
    const pages = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        consultasService.findAll({ ...params, page: index + 2, limit: 100 }),
      ),
    );
    items = items.concat(...pages.flatMap((page) => page.data));
  }

  return items;
};

const loadAllRecetas = async (params: Record<string, any>) => {
  const first = await recetasService.findAll({ ...params, page: 1, limit: 100 });
  let items = [...first.data];
  const totalPages = Math.max(1, Number(first.meta.totalPages || 1));

  if (totalPages > 1) {
    const pages = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        recetasService.findAll({ ...params, page: index + 2, limit: 100 }),
      ),
    );
    items = items.concat(...pages.flatMap((page) => page.data));
  }

  return items;
};

export type WelcomeStats = WelcomeData;

export class WelcomeService {
  async getMetrics(userOverride?: any): Promise<WelcomeMetrics> {
    const user = userOverride ?? getSessionUser();
    const medicoId = Number(user?.id ?? user?.usuarioId ?? user?.usuario_id ?? 0);
    const sucursalId = getSucursalId(user);

    const consultaParams: Record<string, any> = {};
    if (Number.isInteger(medicoId) && medicoId > 0) consultaParams.medicoId = medicoId;
    if (sucursalId) consultaParams.sucursalId = sucursalId;

    const [consultasResult, recetasResult] = await Promise.all([
      loadAllConsultas(consultaParams),
      loadAllRecetas(sucursalId ? { sucursalId } : {}),
    ]);

    let consultas = consultasResult;

    // Si la API no filtra por médico, conservamos únicamente las consultas que
    // sabemos que pertenecen al usuario actual. Cuando la API no devuelve médico,
    // no descartamos el registro para no ocultar información válida.
    if (Number.isInteger(medicoId) && medicoId > 0) {
      consultas = consultas.filter((consulta) => {
        const consultaMedicoId = getConsultaMedicoId(consulta);
        return consultaMedicoId === null || consultaMedicoId === medicoId;
      });
    }

    const consultaIds = new Set(
      consultas
        .map(getConsultaId)
        .filter((id): id is number => id !== null),
    );

    const recetas = recetasResult.filter((receta) => {
      const consultaId = getRecetaConsultaId(receta);
      return consultaId !== null && consultaIds.has(consultaId);
    });

    const now = new Date();
    const todayStart = startOfLocalDay(now);

    const consultasHoy = consultas.filter((consulta) => {
      const fecha = toDate(extractFecha(consulta));
      return fecha ? sameLocalDay(fecha, now) : false;
    });

    const pacientesHoy = new Set(
      consultasHoy
        .map(getConsultaPacienteKey)
        .filter((key): key is string => Boolean(key)),
    ).size;

    const consultasConReceta = new Set(
      recetas
        .map(getRecetaConsultaId)
        .filter((id): id is number => id !== null),
    );

    const pendientes = consultasHoy.filter((consulta) => {
      if (!isPendiente(consulta)) return false;
      const consultaId = getConsultaId(consulta);
      return consultaId === null || !consultasConReceta.has(consultaId);
    }).length;

    const proximasCitas = recetas.filter((receta) => {
      const fecha = getRecetaSeguimiento(receta);
      return fecha ? startOfLocalDay(fecha).getTime() >= todayStart.getTime() : false;
    }).length;

    const recetasHoy = recetas.filter((receta) => {
      const fecha = toDate(extractFecha(receta));
      return fecha ? sameLocalDay(fecha, now) : false;
    }).length;

    return {
      pacientesHoy,
      proximasCitas,
      pendientes,
      consultasHoy: consultasHoy.length,
      recetasHoy,
    };
  }

  async getWelcomeData(userOverride?: any): Promise<WelcomeData> {
    const metrics = await this.getMetrics(userOverride);

    return {
      ...metrics,
      pacientes_hoy: metrics.pacientesHoy,
      proximas_citas: metrics.proximasCitas,
      consultasPendientes: metrics.pendientes,
      consultas_pendientes: metrics.pendientes,
    };
  }

  async getStats(userOverride?: any) {
    return this.getWelcomeData(userOverride);
  }

  async obtenerMetricas(userOverride?: any) {
    return this.getWelcomeData(userOverride);
  }
}

export const welcomeService = new WelcomeService();

export const getWelcomeMetrics = (userOverride?: any) =>
  welcomeService.getMetrics(userOverride);

export const getWelcomeData = (userOverride?: any) =>
  welcomeService.getWelcomeData(userOverride);

export const getWelcomeStats = (userOverride?: any) =>
  welcomeService.getWelcomeData(userOverride);

export const obtenerMetricasBienvenida = (userOverride?: any) =>
  welcomeService.getWelcomeData(userOverride);

export default welcomeService;
