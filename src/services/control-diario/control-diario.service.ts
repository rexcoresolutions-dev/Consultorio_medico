import dayjs from 'dayjs';
import axiosInstance from '../../api/axios.config';
import consultasService from '../consultas/consultas.service';
import recetasService from '../recetas/recetas.service';

export type ControlDiarioRow = {
  id: string;
  fecha: string;
  fecha_iso: string;
  tipo_formato: string;
  total_pacientes: number;
  total_consultas: number;
  total_recetas: number;
};

export type ReportPacienteRow = {
  id: string;
  fecha_iso: string;
  hora: string;
  noReceta: string;
  paciente: string;
  edad: string;
  sexo: string;
  diagnostico: string;
  tratamiento: string;
  estudiosClinicos: string;
};

export type ControlReporteMeta = {
  medicoId?: number;
  sucursalId?: number;
  medicoNombre: string;
  medicoTitulo: 'Dr.' | 'Dra.' | 'Méd.';
  cedulaProfesional: string;
  especialidad: string;
  unidad: string;
  domicilio: string;
};

export type ControlDiarioSourceStatus = {
  consultas: boolean;
  recetas: boolean;
  pacientes: boolean;
};

export type ControlDiarioSnapshot = {
  consultas: any[];
  recetas: any[];
  pacientes: Map<string, any>;
  meta: ControlReporteMeta;
  sourceStatus: ControlDiarioSourceStatus;
  loadedAt: string;
};

const firstText = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
};

const toNumber = (value: unknown): number | undefined => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : undefined;
};

const getEntityDate = (entity: any): string =>
  firstText(
    entity?.fecha,
    entity?.fechaHora ?? entity?.fechaConsulta,
    entity?.fecha_consulta,
    entity?.fechaElaboracion,
    entity?.fecha_elaboracion,
    entity?.createdAt,
    entity?.created_at,
    entity?.updatedAt,
    entity?.updated_at,
  );

const getDayKey = (entity: any): string => {
  const raw = getEntityDate(entity);
  const parsed = dayjs(raw);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : '';
};

const getConsultaPacienteId = (consulta: any): string =>
  String(
    consulta?.pacienteId ??
      consulta?.paciente_id ??
      consulta?.paciente?.id ??
      consulta?.paciente?.pacienteId ??
      '',
  );

const getRecetaConsultaId = (receta: any): string =>
  String(receta?.consultaId ?? receta?.consulta_id ?? receta?.consulta?.id ?? '');

const getConsultaId = (consulta: any): string =>
  String(consulta?.id ?? consulta?.consultaId ?? consulta?.consulta_id ?? '');

const getFullName = (person: any): string =>
  [
    person?.nombre,
    person?.primerApellido ?? person?.primer_apellido,
    person?.segundoApellido ?? person?.segundo_apellido,
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

const getPacienteBirthDate = (paciente: any): string =>
  firstText(
    paciente?.fechaNacimiento,
    paciente?.fecha_nacimiento,
    paciente?.fechaNacimientoPaciente,
    paciente?.fecha_nacimiento_paciente,
  );

const formatAge = (paciente: any, atDate: string): string => {
  const nacimiento = getPacienteBirthDate(paciente);
  if (!nacimiento) return '-';
  const birth = dayjs(nacimiento);
  const reference = dayjs(atDate);
  if (!birth.isValid() || !reference.isValid()) return '-';
  const years = reference.diff(birth, 'year');
  return `${years} ${years === 1 ? 'año' : 'años'}`;
};

const normalizeSexo = (value: unknown): string => {
  const sexo = String(value ?? '').trim().toUpperCase();
  if (!sexo) return '-';
  if (['F', 'FEMENINO', 'MUJER'].includes(sexo)) return 'MUJER';
  if (['M', 'MASCULINO', 'HOMBRE'].includes(sexo)) return 'HOMBRE';
  return sexo;
};

const getDiagnosticoLabel = (consulta: any): string => {
  const diagnosticos = Array.isArray(consulta?.diagnosticos) ? consulta.diagnosticos : [];
  const diag = diagnosticos[0];

  if (!diag) {
    return firstText(
      consulta?.diagnostico,
      consulta?.diagnosticoPrincipal,
      consulta?.diagnostico_principal,
      consulta?.motivoConsulta,
      consulta?.motivo_consulta,
      'Sin diagnóstico registrado',
    );
  }

  const clave = firstText(
    diag?.clave,
    diag?.catalogKey,
    diag?.catalog_key,
    diag?.cie10?.catalogKey,
    diag?.cie10?.clave,
    diag?.diagnostico?.catalogKey,
    diag?.diagnostico?.clave,
  );

  const nombre = firstText(
    diag?.nombre,
    diag?.diagnosticoNombre,
    diag?.diagnostico_nombre,
    diag?.diagnostico?.nombre,
    diag?.diagnostico?.text,
    diag?.cie10?.nombre,
    diag?.cie10?.text,
    diag?.text,
    diag?.descripcion,
  );

  if (clave && nombre) return `${clave} - ${nombre}`;
  return nombre || clave || 'Diagnóstico registrado';
};

const getRecipeNumber = (receta: any): string => {
  const explicit = firstText(
    receta?.folio,
    receta?.numeroReceta,
    receta?.numero_receta,
    receta?.folioReceta,
  );
  if (explicit) return explicit;
  const id = receta?.id;
  return id !== undefined && id !== null ? `#${id}` : '-';
};

const getTreatmentSummary = (consulta: any, receta?: any): string => {
  const medicamentos = Array.isArray(receta?.medicamentos) ? receta.medicamentos : [];

  if (medicamentos.length > 0) {
    return medicamentos
      .map((med: any) => {
        const nombre = firstText(
          med?.medicamentoNombre,
          med?.medicamento_nombre,
          med?.nombre,
          med?.sustanciaActiva,
          med?.sustancia_activa,
        );
        const dosis = firstText(med?.dosis);
        const frecuencia = firstText(med?.frecuencia);
        return [nombre, dosis, frecuencia].filter(Boolean).join(' · ');
      })
      .filter(Boolean)
      .join('; ');
  }

  return (
    firstText(
      consulta?.terapeuticaEmpleada,
      consulta?.terapeutica_empleada,
      consulta?.tratamientoActual,
      consulta?.tratamiento_actual,
    ) || '-'
  );
};

const getStudiesLabel = (receta?: any): string => {
  if (!receta) return 'NO';
  const requested =
    receta?.solicitarEstudiosClinicos ??
    receta?.solicitar_estudios_clinicos ??
    receta?.estudiosClinicos ??
    false;
  return requested ? 'SÍ' : 'NO';
};

const normalizeArray = (responseData: any): any[] => {
  const root = responseData?.data ?? responseData ?? {};
  const records =
    root?.data ??
    root?.items ??
    root?.results ??
    responseData?.items ??
    responseData?.results ??
    root;
  return Array.isArray(records) ? records : [];
};

const getPageMeta = (responseData: any) => {
  const root = responseData?.data ?? responseData ?? {};
  return root?.meta ?? root?.pagination ?? {};
};

const uniqueById = (items: any[]): any[] => {
  const map = new Map<string, any>();
  items.forEach((item, index) => {
    const id = String(item?.id ?? `row-${index}`);
    map.set(id, item);
  });
  return [...map.values()];
};

const readStoredUser = (): any => {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const doctorTitleFromStoredUser = (user: any): 'Dr.' | 'Dra.' | 'Méd.' => {
  const genero = String(user?.genero ?? user?.sexo ?? '').trim().toUpperCase();
  const tratamiento = String(user?.tratamiento ?? user?.titulo ?? '').trim().toLowerCase();

  if (tratamiento.includes('dra') || tratamiento.includes('doctora')) return 'Dra.';
  if (tratamiento.includes('dr') || tratamiento.includes('doctor')) return 'Dr.';
  if (['F', 'FEMALE', 'FEMENINO', 'MUJER'].includes(genero)) return 'Dra.';
  if (['M', 'MALE', 'MASCULINO', 'HOMBRE'].includes(genero)) return 'Dr.';
  return 'Méd.';
};

const getStoredBranch = (user: any) => user?.sucursal ?? user?.branch ?? {};

const buildStoredAddress = (user: any): string => {
  const sucursal = getStoredBranch(user);
  const calle = firstText(sucursal?.calle);
  const exterior = firstText(sucursal?.numeroExterior, sucursal?.numero_exterior);
  const interior = firstText(sucursal?.numeroInterior, sucursal?.numero_interior);
  const colonia = firstText(sucursal?.colonia);
  const municipio = firstText(sucursal?.municipio);
  const entidad = firstText(sucursal?.entidad);
  const cp = firstText(sucursal?.codigoPostal, sucursal?.codigo_postal);

  const calleNumero = [calle, exterior].filter(Boolean).join(' ');
  const interiorText = interior ? `Int. ${interior}` : '';
  const location = [calleNumero, interiorText, colonia, municipio, entidad]
    .filter(Boolean)
    .join(', ');

  return `${location}${cp ? `, C.P. ${cp}` : ''}` || 'No disponible con las APIs actuales';
};

class ControlDiarioService {
  private async getAllConsultas(): Promise<any[]> {
    const first = await consultasService.findAll({ page: 1, limit: 100 });
    const pages = Math.max(1, Math.min(first.meta.totalPages || 1, 100));
    const records = [...first.data];

    for (let page = 2; page <= pages; page += 1) {
      const response = await consultasService.findAll({ page, limit: 100 });
      records.push(...response.data);
    }

    return uniqueById(records);
  }

  private async getAllRecetas(): Promise<any[]> {
    const first = await recetasService.findAll({ page: 1, limit: 100 });
    const pages = Math.max(1, Math.min(first.meta.totalPages || 1, 100));
    const records = [...first.data];

    for (let page = 2; page <= pages; page += 1) {
      const response = await recetasService.findAll({ page, limit: 100 });
      records.push(...response.data);
    }

    return uniqueById(records);
  }

  private async getAllPacientes(): Promise<any[]> {
    const records: any[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const response = await axiosInstance.get('/pacientes', { params: { page, limit: 100 } });
      const current = normalizeArray(response.data);
      records.push(...current);
      const meta = getPageMeta(response.data);
      totalPages = Math.max(1, Math.min(Number(meta?.totalPages ?? 1), 100));
      page += 1;
    } while (page <= totalPages);

    return uniqueById(records);
  }

  async loadSnapshot(): Promise<ControlDiarioSnapshot> {
    // IMPORTANTE: por ahora Control diario usa únicamente APIs ya confirmadas:
    // GET /consultas, GET /recetas y GET /pacientes.
    // No consulta sucursales, procedimientos, certificados ni usuarios.
    const [consultasResult, recetasResult, pacientesResult] = await Promise.allSettled([
      this.getAllConsultas(),
      this.getAllRecetas(),
      this.getAllPacientes(),
    ]);

    const sourceStatus: ControlDiarioSourceStatus = {
      consultas: consultasResult.status === 'fulfilled',
      recetas: recetasResult.status === 'fulfilled',
      pacientes: pacientesResult.status === 'fulfilled',
    };

    if (!sourceStatus.consultas && !sourceStatus.recetas && !sourceStatus.pacientes) {
      const firstError =
        consultasResult.status === 'rejected'
          ? consultasResult.reason
          : recetasResult.status === 'rejected'
            ? recetasResult.reason
            : pacientesResult.status === 'rejected'
              ? pacientesResult.reason
              : new Error('No fue posible consultar las APIs disponibles.');
      throw firstError;
    }

    const consultas = consultasResult.status === 'fulfilled' ? consultasResult.value : [];
    const recetas = recetasResult.status === 'fulfilled' ? recetasResult.value : [];
    const pacientes = pacientesResult.status === 'fulfilled' ? pacientesResult.value : [];

    const pacientesMap = new Map<string, any>();
    pacientes.forEach((paciente) => pacientesMap.set(String(paciente?.id ?? ''), paciente));

    const user = readStoredUser();
    const medicoNombre = getFullName(user) || firstText(user?.email, 'Médico responsable');
    const sucursal = getStoredBranch(user);

    return {
      consultas,
      recetas,
      pacientes: pacientesMap,
      sourceStatus,
      meta: {
        medicoId: toNumber(user?.id),
        sucursalId: toNumber(user?.sucursal_id ?? user?.sucursalId ?? sucursal?.id),
        medicoNombre,
        medicoTitulo: doctorTitleFromStoredUser(user),
        cedulaProfesional: firstText(user?.cedula_profesional, user?.cedulaProfesional),
        especialidad: firstText(user?.especialidad, 'Médico'),
        unidad: firstText(
          user?.sucursal_nombre,
          user?.sucursalNombre,
          sucursal?.nombre,
          'Consultorio médico',
        ),
        domicilio: buildStoredAddress(user),
      },
      loadedAt: new Date().toISOString(),
    };
  }

  buildRows(snapshot: ControlDiarioSnapshot, month: string, year: number): ControlDiarioRow[] {
    const byDay = new Map<string, ControlDiarioRow>();

    const ensure = (dayKey: string) => {
      let row = byDay.get(dayKey);
      if (!row) {
        row = {
          id: dayKey,
          fecha: dayjs(dayKey).format('DD/MM/YYYY'),
          fecha_iso: dayKey,
          tipo_formato: 'HOJA DIARIA',
          total_pacientes: 0,
          total_consultas: 0,
          total_recetas: 0,
        };
        byDay.set(dayKey, row);
      }
      return row;
    };

    const pacientesPorDia = new Map<string, Set<string>>();

    snapshot.consultas.forEach((consulta) => {
      const dayKey = getDayKey(consulta);
      if (!dayKey) return;
      const parsed = dayjs(dayKey);
      if (parsed.format('MM') !== month || parsed.year() !== year) return;

      const row = ensure(dayKey);
      row.total_consultas += 1;

      if (!pacientesPorDia.has(dayKey)) pacientesPorDia.set(dayKey, new Set());
      const patientKey =
        getConsultaPacienteId(consulta) ||
        firstText(consulta?.paciente?.curp, consulta?.paciente?.numeroExpediente) ||
        `consulta-${getConsultaId(consulta)}`;
      pacientesPorDia.get(dayKey)?.add(patientKey);
    });

    snapshot.recetas.forEach((receta) => {
      const dayKey = getDayKey(receta);
      if (!dayKey) return;
      const parsed = dayjs(dayKey);
      if (parsed.format('MM') !== month || parsed.year() !== year) return;
      ensure(dayKey).total_recetas += 1;
    });

    pacientesPorDia.forEach((ids, dayKey) => {
      ensure(dayKey).total_pacientes = ids.size;
    });

    return [...byDay.values()].sort((a, b) => b.fecha_iso.localeCompare(a.fecha_iso));
  }

  buildReportRows(snapshot: ControlDiarioSnapshot, dayKey: string): ReportPacienteRow[] {
    const recipesByConsult = new Map<string, any[]>();

    snapshot.recetas.forEach((receta) => {
      const consultaId = getRecetaConsultaId(receta);
      if (!consultaId) return;
      const list = recipesByConsult.get(consultaId) ?? [];
      list.push(receta);
      recipesByConsult.set(consultaId, list);
    });

    return snapshot.consultas
      .filter((consulta) => getDayKey(consulta) === dayKey)
      .sort((a, b) => getEntityDate(a).localeCompare(getEntityDate(b)))
      .map((consulta, index) => {
        const consultaId = getConsultaId(consulta);
        const recetas = recipesByConsult.get(consultaId) ?? [];
        const receta = [...recetas].sort((a, b) =>
          getEntityDate(b).localeCompare(getEntityDate(a)),
        )[0];
        const pacienteId = getConsultaPacienteId(consulta);

        // La relación correcta del control diario es consulta.pacienteId -> /pacientes.
        // Algunas respuestas de /consultas incluyen un objeto `paciente` resumido
        // (por ejemplo sólo id/nombre). Si usamos ese objeto directamente se pierden
        // fechaNacimiento y sexo aunque sí existan en el catálogo de pacientes.
        // El registro proveniente de /pacientes tiene prioridad y el objeto embebido
        // de la consulta queda únicamente como respaldo.
        const pacienteEnConsulta = consulta?.paciente ?? {};
        const pacienteEnCatalogo = snapshot.pacientes.get(pacienteId) ?? {};
        const paciente = {
          ...pacienteEnConsulta,
          ...pacienteEnCatalogo,
        };

        const fecha = getEntityDate(consulta);
        const parsedDate = dayjs(fecha);

        return {
          id: consultaId || `${dayKey}-${index}`,
          fecha_iso: dayKey,
          hora: parsedDate.isValid() ? parsedDate.format('HH:mm') : '-',
          noReceta: receta ? getRecipeNumber(receta) : '-',
          paciente: (getFullName(paciente) || `Paciente #${pacienteId || '-'}`).toUpperCase(),
          edad: formatAge(paciente, fecha || dayKey),
          sexo: normalizeSexo(
            paciente?.sexo ??
              paciente?.genero ??
              paciente?.género ??
              consulta?.paciente?.sexo,
          ),
          diagnostico: getDiagnosticoLabel(consulta).toUpperCase(),
          tratamiento: getTreatmentSummary(consulta, receta),
          estudiosClinicos: getStudiesLabel(receta),
        };
      });
  }
}

export const controlDiarioService = new ControlDiarioService();
export default controlDiarioService;
