import consultasService from '../consultas/consultas.service';
import historiaClinicaService, {
  type DiagnosticoHistoriaClinica,
  type HistoriaClinicaItem,
} from '../historia-clinica/historia-clinica.service';
import type { PacienteData } from '../pacientes/pacientes.service';

export type ExpedienteSourceType = 'CONSULTA_EXTERNA' | 'HISTORIA_CLINICA';

export type ExpedienteClinicoItem = HistoriaClinicaItem & {
  sourceType: ExpedienteSourceType;
  sourceId?: number;
  sourceLabel: string;
};

export type ExpedientePacienteResult = {
  items: ExpedienteClinicoItem[];
  ultimaConsultaExterna: ExpedienteClinicoItem | null;
  ultimaHistoriaClinica: ExpedienteClinicoItem | null;
  consultaBasePrecarga: ExpedienteClinicoItem | null;
  warnings: string[];
};

const firstDefined = (...values: any[]) =>
  values.find((value) => value !== undefined && value !== null && value !== '');

/**
 * Los endpoints del backend pueden regresar el registro directo o dentro de
 * uno o varios envoltorios `data`. Normalizamos aquí para que Consulta Externa
 * se lea igual desde GET listado y GET /{id}.
 */
const unwrapApiRecord = (input: any) => {
  let current = input;

  for (let i = 0; i < 5; i += 1) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) break;

    const hasClinicalIdentity =
      current.id !== undefined ||
      current.consultaId !== undefined ||
      current.consulta_id !== undefined ||
      current.pacienteId !== undefined ||
      current.paciente_id !== undefined ||
      current.signosVitales !== undefined ||
      current.signos_vitales !== undefined ||
      current.motivoConsulta !== undefined ||
      current.tipoConsulta !== undefined;

    if (hasClinicalIdentity) break;

    const nested = current.data;
    if (!nested || typeof nested !== 'object' || Array.isArray(nested)) break;
    current = nested;
  }

  return current ?? input;
};

const toNumber = (value: any): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const toBoolean = (value: any): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  const normalized = String(value ?? '').trim().toUpperCase();
  if (['TRUE', '1', 'SI', 'SÍ'].includes(normalized)) return true;
  if (['FALSE', '0', 'NO'].includes(normalized)) return false;
  return undefined;
};

const siNo = (value: any): string | undefined => {
  const parsed = toBoolean(value);
  if (parsed === undefined) return undefined;
  return parsed ? 'SI' : 'NO';
};

const getPatientName = (raw: any, fallback?: Partial<PacienteData> | null) => {
  const consultaNested = raw?.consulta;
  const paciente = raw?.paciente ?? raw?.patient ?? consultaNested?.paciente ?? consultaNested?.patient ?? {};
  const direct = firstDefined(paciente?.nombreCompleto, paciente?.nombre_completo);
  if (direct) return String(direct);

  return [
    paciente?.nombre ?? fallback?.nombre,
    paciente?.primerApellido ?? paciente?.primer_apellido ?? fallback?.primer_apellido,
    paciente?.segundoApellido ?? paciente?.segundo_apellido ?? fallback?.segundo_apellido,
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Paciente sin nombre';
};

const normalizeConsultaDiagnosticos = (raw: any): DiagnosticoHistoriaClinica[] => {
  const source = Array.isArray(raw?.diagnosticos) ? raw.diagnosticos : [];

  return source.map((item: any, index: number) => {
    const catalogo =
      item?.diagnostico && typeof item.diagnostico === 'object'
        ? item.diagnostico
        : item?.cie10 && typeof item.cie10 === 'object'
          ? item.cie10
          : item?.catalogo && typeof item.catalogo === 'object'
            ? item.catalogo
            : {};

    return {
      key: String(item?.id ?? `consulta-${raw?.id ?? 'x'}-${index}`),
      no: index + 1,
      clave: String(
        firstDefined(
          item?.clave,
          item?.codigo,
          item?.diagnosticoClave,
          catalogo?.clave,
          catalogo?.codigo,
          catalogo?.cie10,
          '',
        ) ?? '',
      ) || undefined,
      diagnostico: String(
        firstDefined(
          typeof item?.diagnostico === 'string' ? item.diagnostico : undefined,
          item?.nombre,
          item?.descripcionDiagnostico,
          catalogo?.nombre,
          catalogo?.descripcion,
          catalogo?.diagnostico,
          'Diagnóstico registrado',
        ),
      ),
      descripcion: firstDefined(item?.descripcion, item?.detalle, item?.observaciones),
      primeraVez: toBoolean(firstDefined(item?.primeraVez, item?.primera_vez)),
      subsecuente: toBoolean(item?.subsecuente),
    };
  });
};

const getConsultaDate = (raw: any) =>
  String(
    firstDefined(
      raw?.fechaHora ?? raw?.fechaConsulta,
      raw?.fecha_consulta,
      raw?.fecha,
      raw?.createdAt,
      raw?.created_at,
      raw?.updatedAt,
      raw?.updated_at,
      '',
    ),
  );

export const normalizeConsultaExterna = (
  rawInput: any,
  fallbackPaciente?: Partial<PacienteData> | null,
): ExpedienteClinicoItem => {
  const raw = unwrapApiRecord(rawInput);
  const consultaNested = unwrapApiRecord(raw?.consulta);

  const signosSource =
    raw?.signosVitales ??
    raw?.signos_vitales ??
    raw?.signos ??
    raw?.vitales ??
    consultaNested?.signosVitales ??
    consultaNested?.signos_vitales ??
    consultaNested?.signos ??
    consultaNested?.vitales ??
    // Algunas respuestas históricas devuelven los signos a nivel raíz.
    raw ??
    {};
  const signosCandidate = Array.isArray(signosSource)
    ? signosSource[0] ?? {}
    : signosSource;
  const signos = unwrapApiRecord(signosCandidate?.data ?? signosCandidate) ?? {};

  const antecedenteSource =
    raw?.antecedente ??
    raw?.antecedentes ??
    consultaNested?.antecedente ??
    consultaNested?.antecedentes ??
    {};
  const antecedenteCandidate = Array.isArray(antecedenteSource)
    ? antecedenteSource[0] ?? {}
    : antecedenteSource;
  const antecedente = unwrapApiRecord(antecedenteCandidate?.data ?? antecedenteCandidate) ?? {};
  const paciente = raw?.paciente ?? raw?.patient ?? {};
  const sourceId = toNumber(firstDefined(raw?.id, raw?.consultaId, raw?.consulta_id));
  const pacienteId = firstDefined(
    raw?.pacienteId,
    raw?.paciente_id,
    paciente?.id,
    fallbackPaciente?.id,
  );
  const fecha = getConsultaDate(raw);
  const diagnosticos = normalizeConsultaDiagnosticos(raw);

  const motivoReferencia = firstDefined(
    signos?.motivoReferencia,
    signos?.motivo_referencia,
    raw?.motivoReferencia,
    raw?.motivo_referencia,
  );

  const descripcionReferencia = firstDefined(
    signos?.descripcionReferencia,
    signos?.descripcion_referencia,
    raw?.descripcionReferencia,
    raw?.descripcion_referencia,
  );

  const consulta: Record<string, any> = {
    fecha_consulta: fecha,
    tipo_consulta: firstDefined(raw?.tipoConsulta, raw?.tipo_consulta, 'CONSULTA EXTERNA'),
    estatus: raw?.estatus,
    primera_consulta_anio: firstDefined(raw?.primeraConsultaAnio, raw?.primera_consulta_anio),
    diabetes: raw?.diabetes,
    toma_glucosa: firstDefined(raw?.tomaGlucosa, raw?.toma_glucosa),
    medicion_ayunas: firstDefined(raw?.medicionAyunas, raw?.medicion_ayunas),
    tiras_control: firstDefined(raw?.tirasControl, raw?.tiras_control),
    atencion_pregestacional: firstDefined(
      raw?.atencionPregestacional,
      raw?.atencion_pregestacional,
    ),
    motivo_consulta: firstDefined(raw?.motivoConsulta, raw?.motivo_consulta),
    descripcion_consulta: raw?.descripcion,
    descripcion: raw?.descripcion,
    tratamiento_actual: firstDefined(raw?.tratamientoActual, raw?.tratamiento_actual),
    terapeutica_empleada: firstDefined(
      raw?.terapeuticaEmpleada,
      raw?.terapeutica_empleada,
    ),
    contrarreferencia: raw?.contrarreferencia,

    peso: firstDefined(signos?.peso, raw?.peso, consultaNested?.peso),
    altura: firstDefined(signos?.altura, raw?.altura, consultaNested?.altura),
    imc: firstDefined(signos?.imc, raw?.imc, consultaNested?.imc),
    temperatura: firstDefined(signos?.temperatura, raw?.temperatura, consultaNested?.temperatura),
    presion_arterial: firstDefined(signos?.presionArterial, signos?.presion_arterial, raw?.presionArterial, raw?.presion_arterial, consultaNested?.presionArterial, consultaNested?.presion_arterial),
    frecuencia_cardiaca: firstDefined(
      signos?.frecuenciaCardiaca,
      signos?.frecuencia_cardiaca,
      raw?.frecuenciaCardiaca,
      raw?.frecuencia_cardiaca,
      consultaNested?.frecuenciaCardiaca,
      consultaNested?.frecuencia_cardiaca,
    ),
    frecuencia_respiratoria: firstDefined(
      signos?.frecuenciaRespiratoria,
      signos?.frecuencia_respiratoria,
      raw?.frecuenciaRespiratoria,
      raw?.frecuencia_respiratoria,
      consultaNested?.frecuenciaRespiratoria,
      consultaNested?.frecuencia_respiratoria,
    ),
    spo2: firstDefined(signos?.spo2, signos?.spO2, raw?.spo2, raw?.spO2, consultaNested?.spo2, consultaNested?.spO2),
    circunferencia_abdomen: firstDefined(
      signos?.cinturaAbdominal,
      signos?.cintura_abdominal,
      signos?.circunferenciaAbdomen,
      signos?.circunferencia_abdomen,
      raw?.cinturaAbdominal,
      raw?.cintura_abdominal,
      raw?.circunferenciaAbdomen,
      raw?.circunferencia_abdomen,
      consultaNested?.cinturaAbdominal,
      consultaNested?.cintura_abdominal,
      consultaNested?.circunferenciaAbdomen,
      consultaNested?.circunferencia_abdomen,
    ),

    motivo_referencia: motivoReferencia,
    descripcion_referencia: descripcionReferencia,
    referir_paciente: motivoReferencia ? 'SI' : 'NO',
    referido_por: motivoReferencia,
    detalle_contrarreferencia: descripcionReferencia,

    tuberculosis_pulmonar: siNo(
      firstDefined(antecedente?.tuberculosisPulmonar, antecedente?.tuberculosis_pulmonar),
    ),
    observaciones_antecedentes: antecedente?.observaciones,
    infeccion_transmision_sexual: siNo(
      firstDefined(
        antecedente?.infeccionTransmisionSexual,
        antecedente?.infeccion_transmision_sexual,
      ),
    ),
    patologia_mamaria_benigna: siNo(
      firstDefined(
        antecedente?.patologiaMamariaBenigna,
        antecedente?.patologia_mamaria_benigna,
      ),
    ),
    terapia_hormonal: siNo(
      firstDefined(antecedente?.terapiaHormonal, antecedente?.terapia_hormonal),
    ),
    peri_post_menopausia: siNo(
      firstDefined(antecedente?.periPostmenopausia, antecedente?.peri_postmenopausia),
    ),
    colposcopia: siNo(antecedente?.colposcopia),
  };

  const diagnosticoPrincipal = diagnosticos[0];
  if (diagnosticoPrincipal) {
    consulta.diagnostico = diagnosticoPrincipal.diagnostico;
    consulta.descripcion_diagnostico = diagnosticoPrincipal.descripcion;
    consulta.clave_diagnostico = diagnosticoPrincipal.clave;
  }

  return {
    id: `consulta-api-${sourceId ?? fecha ?? Date.now()}`,
    apiId: sourceId,
    sourceId,
    sourceType: 'CONSULTA_EXTERNA',
    sourceLabel: 'Consulta externa',
    pacienteId,
    paciente: {
      id: pacienteId,
      nombre: getPatientName(raw, fallbackPaciente),
      numero_expediente:
        String(
          firstDefined(
            paciente?.numeroExpediente,
            paciente?.numero_expediente,
            fallbackPaciente?.numero_expediente,
            '',
          ),
        ) || undefined,
      curp: String(firstDefined(paciente?.curp, fallbackPaciente?.curp, '')) || undefined,
      sexo: String(firstDefined(paciente?.sexo, fallbackPaciente?.sexo, '')) || undefined,
      fecha_nacimiento:
        String(
          firstDefined(
            paciente?.fechaNacimiento,
            paciente?.fecha_nacimiento,
            fallbackPaciente?.fecha_nacimiento,
            '',
          ),
        ) || undefined,
    },
    consulta,
    diagnosticos,
    fecha_consulta: fecha,
    raw,
  };
};

const normalizeHistoria = (item: HistoriaClinicaItem): ExpedienteClinicoItem => ({
  ...item,
  sourceType: 'HISTORIA_CLINICA',
  sourceId: item.apiId,
  sourceLabel: 'Historia clínica',
});

const getAllConsultasPaciente = async (
  pacienteId: number,
  pacienteFallback?: Partial<PacienteData> | null,
): Promise<ExpedienteClinicoItem[]> => {
  const first = await consultasService.findAll({ page: 1, limit: 20, pacienteId });
  const records = [...first.data];

  if (first.meta.totalPages > 1) {
    for (let page = 2; page <= first.meta.totalPages; page += 1) {
      const next = await consultasService.findAll({
        page,
        limit: first.meta.limit || 20,
        pacienteId,
      });
      records.push(...next.data);
    }
  }

  return records.map((item) => normalizeConsultaExterna(item, pacienteFallback));
};

class ExpedienteClinicoService {
  async findByPaciente(
    pacienteId: number,
    pacienteFallback?: Partial<PacienteData> | null,
  ): Promise<ExpedientePacienteResult> {
    const [historiasResult, consultasResult] = await Promise.allSettled([
      historiaClinicaService.findByPaciente(pacienteId, pacienteFallback),
      getAllConsultasPaciente(pacienteId, pacienteFallback),
    ]);

    const warnings: string[] = [];

    const historias =
      historiasResult.status === 'fulfilled'
        ? historiasResult.value.map(normalizeHistoria)
        : [];

    if (historiasResult.status === 'rejected') {
      warnings.push('No fue posible consultar temporalmente las historias clínicas completas.');
    }

    const consultas = consultasResult.status === 'fulfilled' ? consultasResult.value : [];

    if (consultasResult.status === 'rejected') {
      warnings.push('No fue posible consultar temporalmente las consultas externas.');
    }

    if (historiasResult.status === 'rejected' && consultasResult.status === 'rejected') {
      throw consultasResult.reason ?? historiasResult.reason;
    }

    let items = [...historias, ...consultas].sort(
      (a, b) =>
        new Date(b.fecha_consulta || 0).getTime() -
        new Date(a.fecha_consulta || 0).getTime(),
    );

    // Los listados de la API pueden venir resumidos y omitir signos vitales /
    // antecedentes. Hidratamos por id el registro más reciente de cada fuente
    // antes de usarlo como base del formulario.
    const latestConsultaSummary =
      items.find((item) => item.sourceType === 'CONSULTA_EXTERNA') ?? null;
    const latestHistoriaSummary =
      items.find((item) => item.sourceType === 'HISTORIA_CLINICA') ?? null;

    let ultimaConsultaExterna = latestConsultaSummary;
    let ultimaHistoriaClinica = latestHistoriaSummary;

    if (latestConsultaSummary?.sourceId) {
      try {
        const raw = await consultasService.findOne(Number(latestConsultaSummary.sourceId));
        ultimaConsultaExterna = normalizeConsultaExterna(raw, pacienteFallback);
      } catch {
        warnings.push('La última consulta externa se cargó en modo resumido.');
      }
    }

    if (latestHistoriaSummary?.sourceId) {
      try {
        const historia = await historiaClinicaService.findOne(
          Number(latestHistoriaSummary.sourceId),
          pacienteFallback,
        );
        ultimaHistoriaClinica = normalizeHistoria(historia);
      } catch {
        warnings.push('La última historia clínica se cargó en modo resumido.');
      }
    }

    const hasClinicalValues = (item: ExpedienteClinicoItem | null) => {
      const c = item?.consulta || {};
      return [
        c.peso,
        c.altura,
        c.imc,
        c.temperatura,
        c.presion_arterial,
        c.frecuencia_cardiaca,
        c.frecuencia_respiratoria,
        c.spo2,
        c.circunferencia_abdomen,
      ].some((value) => value !== undefined && value !== null && value !== '');
    };

    // Si la consulta más nueva no tiene signos (por ejemplo, un registro antiguo
    // guardado durante una versión anterior), buscamos la consulta anterior más
    // reciente que sí tenga datos clínicos para usarla como precarga.
    let consultaBasePrecarga = ultimaConsultaExterna;
    if (!hasClinicalValues(consultaBasePrecarga)) {
      const candidates = items.filter(
        (item) => item.sourceType === 'CONSULTA_EXTERNA' && item.sourceId,
      );

      for (const candidate of candidates.slice(1, 10)) {
        try {
          const raw = await consultasService.findOne(Number(candidate.sourceId));
          const hydrated = normalizeConsultaExterna(raw, pacienteFallback);
          if (hasClinicalValues(hydrated)) {
            consultaBasePrecarga = hydrated;
            break;
          }
        } catch {
          // Continuamos con la siguiente consulta disponible.
        }
      }
    }

    // Reemplazamos los resúmenes por sus versiones completas cuando fue posible.
    items = items.map((item) => {
      if (
        ultimaConsultaExterna?.sourceId &&
        item.sourceType === 'CONSULTA_EXTERNA' &&
        item.sourceId === ultimaConsultaExterna.sourceId
      ) {
        return ultimaConsultaExterna;
      }
      if (
        ultimaHistoriaClinica?.sourceId &&
        item.sourceType === 'HISTORIA_CLINICA' &&
        item.sourceId === ultimaHistoriaClinica.sourceId
      ) {
        return ultimaHistoriaClinica;
      }
      return item;
    });

    return {
      items,
      ultimaConsultaExterna,
      ultimaHistoriaClinica,
      consultaBasePrecarga,
      warnings,
    };
  }

  async findOne(
    record: ExpedienteClinicoItem,
    pacienteFallback?: Partial<PacienteData> | null,
  ): Promise<ExpedienteClinicoItem> {
    const id = Number(record.sourceId ?? record.apiId);
    if (!Number.isInteger(id) || id <= 0) return record;

    if (record.sourceType === 'CONSULTA_EXTERNA') {
      const raw = await consultasService.findOne(id);
      return normalizeConsultaExterna(raw, pacienteFallback);
    }

    const historia = await historiaClinicaService.findOne(id, pacienteFallback);
    return normalizeHistoria(historia);
  }
}

export default new ExpedienteClinicoService();
