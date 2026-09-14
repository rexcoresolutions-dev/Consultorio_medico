import axiosInstance from '../../api/axios.config';
import type { PacienteData } from '../pacientes/pacientes.service';

export type HistoriaClinicaQuery = {
  page?: number;
  limit?: number;
  pacienteId?: number;
  medicoId?: number;
  sucursalId?: number;
};

export type DiagnosticoHistoriaClinica = {
  key?: string;
  no?: number;
  clave?: string;
  diagnostico?: string;
  descripcion?: string;
  primeraVez?: boolean;
  subsecuente?: boolean;
};

export type HistoriaClinicaItem = {
  id: string;
  apiId?: number;
  pacienteId?: number | string;
  paciente: {
    id?: number | string;
    nombre: string;
    numero_expediente?: string;
    curp?: string;
    sexo?: string;
    fecha_nacimiento?: string;
  };
  consulta: Record<string, any>;
  diagnosticos: DiagnosticoHistoriaClinica[];
  fecha_consulta: string;
  raw?: any;
};

export type HistoriaClinicaPage = {
  data: HistoriaClinicaItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

const unwrapEntity = (responseData: any): any =>
  responseData?.data?.data ??
  responseData?.data?.historiaClinica ??
  responseData?.data?.historia_clinica ??
  responseData?.data?.result ??
  responseData?.data ??
  responseData?.historiaClinica ??
  responseData?.historia_clinica ??
  responseData?.result ??
  responseData;

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

const firstDefined = (...values: any[]) =>
  values.find((value) => value !== undefined && value !== null && value !== '');

const numberValue = (value: any): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const booleanValue = (value: any): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  const normalized = String(value ?? '').trim().toUpperCase();
  if (['1', 'SI', 'SÍ', 'TRUE'].includes(normalized)) return true;
  if (['0', 'NO', 'FALSE'].includes(normalized)) return false;
  return undefined;
};

const snakeize = (key: string) =>
  key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .toLowerCase();

const cleanValue = (value: any) => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }
  return value;
};

const normalizeHeight = (value: any) => {
  const parsed = numberValue(value);
  if (parsed === undefined || parsed <= 0) return undefined;
  return parsed > 3 ? Number((parsed / 100).toFixed(2)) : parsed;
};

const parseStoredJson = (key: string) => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const resolveHistoriaClinicaSucursalId = (): number | undefined => {
  if (typeof window === 'undefined') return undefined;

  const user =
    parseStoredJson('user') ??
    parseStoredJson('usuario') ??
    parseStoredJson('auth_user') ??
    {};

  const sucursalActiva =
    parseStoredJson('sucursal_activa') ??
    parseStoredJson('sucursalActiva') ??
    parseStoredJson('selectedSucursal') ??
    {};

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

const toText = (value: any): string | undefined => {
  const cleaned = cleanValue(value);
  if (cleaned === undefined || cleaned === null) return undefined;
  return String(cleaned);
};

const toInteger = (value: any): number | undefined => {
  const numeric = numberValue(value);
  if (numeric === undefined) return undefined;
  return Math.trunc(numeric);
};

const toBoolean = (value: any, fallback = false): boolean => {
  const parsed = booleanValue(value);
  return parsed === undefined ? fallback : parsed;
};

const normalizeEnumText = (value: any): string | undefined => {
  const text = toText(value);
  if (!text) return undefined;
  return text.trim().toUpperCase().replace(/\s+/g, '_');
};

type HabitoEnum = 'NUNCA' | 'ACTUAL' | 'ANTERIOR' | 'DESCONOCIDO';
type MenopausiaEnum =
  | 'PREMENOPAUSIA'
  | 'PERIMENOPAUSIA'
  | 'POSTMENOPAUSIA'
  | 'NO_APLICA'
  | 'DESCONOCIDO';

/**
 * El formulario histórico usaba SI/NO para estos hábitos, mientras que el DTO
 * real exige NUNCA/ACTUAL/ANTERIOR/DESCONOCIDO. Esta función mantiene
 * compatibilidad con registros/formularios anteriores y garantiza que nunca
 * salga un valor inválido hacia el API.
 */
const normalizeHabitoEnum = (value: any): HabitoEnum => {
  const normalized = normalizeEnumText(value);

  if (!normalized) return 'DESCONOCIDO';

  if (['NUNCA', 'NO', 'NO_APLICA', 'NINGUNO', 'NIEGA'].includes(normalized)) {
    return 'NUNCA';
  }

  if (['ACTUAL', 'SI', 'SÍ', 'POSITIVO', 'PRESENTE'].includes(normalized)) {
    return 'ACTUAL';
  }

  if (
    [
      'ANTERIOR',
      'EX',
      'EXFUMADOR',
      'EX_FUMADOR',
      'EXCONSUMIDOR',
      'EX_CONSUMIDOR',
      'PREVIO',
      'ANTECEDENTE',
    ].includes(normalized)
  ) {
    return 'ANTERIOR';
  }

  if (['DESCONOCIDO', 'NO_SABE', 'SIN_DATO'].includes(normalized)) {
    return 'DESCONOCIDO';
  }

  return 'DESCONOCIDO';
};

/**
 * El backend valida estrictamente el estado menopáusico. Normalizamos tanto
 * los nuevos valores como el antiguo "NO APLICA" del formulario.
 */
const normalizeMenopausiaEnum = (value: any): MenopausiaEnum => {
  const normalized = normalizeEnumText(value);

  if (!normalized) return 'DESCONOCIDO';
  if (normalized === 'PREMENOPAUSIA') return 'PREMENOPAUSIA';
  if (normalized === 'PERIMENOPAUSIA') return 'PERIMENOPAUSIA';
  if (normalized === 'POSTMENOPAUSIA') return 'POSTMENOPAUSIA';

  if (['NO_APLICA', 'NO', 'NA', 'N/A'].includes(normalized)) {
    return 'NO_APLICA';
  }

  if (['DESCONOCIDO', 'NO_SABE', 'SIN_DATO', 'SI'].includes(normalized)) {
    return 'DESCONOCIDO';
  }

  return 'DESCONOCIDO';
};

/**
 * IDs del catálogo heredofamiliar usados por el formulario actual.
 * El ejemplo oficial del API confirma Diabetes = 1. Los siguientes IDs
 * conservan el mismo orden del catálogo visual del sistema.
 */
const HEREDOFAMILIAR_TYPES = [
  { key: 'diabetes', id: 1, label: 'Diabetes' },
  { key: 'cardiovascular', id: 2, label: 'Cardiovascular' },
  { key: 'epilepsias', id: 3, label: 'Epilepsias' },
  { key: 'neoplasicos', id: 4, label: 'Neoplásicos' },
  { key: 'lueticos', id: 5, label: 'Luéticos' },
  { key: 'hipertension', id: 6, label: 'Hipertensión' },
  { key: 'fimicos', id: 7, label: 'Fímicos' },
  { key: 'dislipidemia', id: 8, label: 'Dislipidemia' },
] as const;

const buildHeredofamiliares = (values: Record<string, any>) => {
  const detalles = HEREDOFAMILIAR_TYPES.flatMap((item) => {
    if (!toBoolean(values[`${item.key}_check`])) return [];

    const parentesco = toText(values[`${item.key}_parentesco`]);
    if (!parentesco) return [];

    // El campo "Tipos" del formulario corresponde al detalle de diabetes;
    // para los demás antecedentes conservamos una descripción legible.
    const detalle =
      item.key === 'diabetes'
        ? toText(values.tipos_antecedentes) || item.label
        : item.label;

    return [
      {
        tipoAntecedenteId: item.id,
        parentesco,
        detalle,
      },
    ];
  });

  return {
    otros: toBoolean(values.otros_check)
      ? toText(values.otros_antecedentes) || 'Otros antecedentes familiares'
      : 'Sin otros antecedentes familiares',
    detalles,
  };
};

/**
 * DTO REAL de POST/PATCH /api/v1/historia-clinica.
 * No agregar campos planos aquí: el backend usa whitelist estricto y responde
 * 400 cuando recibe propiedades fuera de estos objetos.
 */
export const buildHistoriaClinicaPayload = (
  pacienteId: number,
  values: Record<string, any>,
  explicitSucursalId?: number,
) => {
  const sucursalId = explicitSucursalId ?? resolveHistoriaClinicaSucursalId();

  if (!Number.isInteger(sucursalId) || Number(sucursalId) <= 0) {
    throw new Error('No fue posible determinar la sucursal activa para guardar la historia clínica.');
  }

  const peso = numberValue(values.peso);
  const altura = normalizeHeight(values.altura);
  const imc = numberValue(values.imc);
  const temperatura = numberValue(values.temperatura);
  const frecuenciaCardiaca = numberValue(values.frecuencia_cardiaca);
  const frecuenciaRespiratoria = numberValue(values.frecuencia_respiratoria);
  const spo2 = numberValue(values.spo2);
  const cinturaAbdominal = numberValue(values.circunferencia_abdomen);

  return {
    pacienteId,
    sucursalId: Number(sucursalId),
    fechaElaboracion: new Date().toISOString(),

    signosVitales: {
      peso,
      altura,
      imc,
      temperatura,
      presionArterial: toText(values.presion_arterial),
      frecuenciaCardiaca,
      frecuenciaRespiratoria,
      spo2,
      cinturaAbdominal,
      motivoReferencia:
        toText(values.motivo_referencia) ??
        (toBoolean(values.referir_paciente) ? toText(values.referido_por) : undefined),
      descripcionReferencia:
        toText(values.descripcion_referencia) ??
        toText(values.detalle_contrarreferencia),
    },

    antecedentesHeredofamiliares: buildHeredofamiliares(values),

    antecedenteNoPatologico: {
      alimentacion: toText(values.alimentacion),
      higiene: toText(values.higiene),
      inmunizacionesIncompletas: toBoolean(values.inmunizaciones_incompletas_check),
      detalleInmunizaciones: toBoolean(values.inmunizaciones_incompletas_check)
        ? toText(values.inmunizaciones_incompletas)
        : undefined,
      grupoSanguineo: toText(values.grupo_sanguineo),
      otros: toBoolean(values.otros_no_patologicos_check)
        ? toText(values.otros_no_patologicos)
        : undefined,
    },

    antecedentePatologico: {
      enfermedadesInfancia: toText(values.enfermedades_infancia),
      alergias: toText(values.alergias),
      quirurgicos: toText(values.cirugias),
      transfusiones: toText(values.transfusiones),
      fracturas: toText(values.fracturas),
      traumatismos: toText(values.traumatismos),
      hospitalizaciones: toText(values.hospitalizaciones),
      medicamentosActuales: toText(values.medicamentos_actuales),
      dislipidemia: toText(values.dislipidemia_patologica),
      tuberculosisPulmonar: toBoolean(values.tuberculosis_pulmonar),
      tabaquismo: normalizeHabitoEnum(values.tabaquismo),
      alcoholismo: normalizeHabitoEnum(values.alcoholismo),
      toxicomanias: normalizeHabitoEnum(values.toxicomanias),
      otros: toBoolean(values.otros_patologicos_check)
        ? toText(values.otros_patologicos)
        : undefined,
    },

    antecedenteGinecoObstetrico: {
      ivsaEdad: toInteger(values.ivsa),
      numeroParejas: toInteger(values.numero_parejas),
      metodoAnticonceptivo: toText(values.metodo_anticonceptivo),
      gestas: toInteger(values.gestas),
      partos: toInteger(values.partos),
      abortos: toInteger(values.abortos),
      cesareas: toInteger(values.cesareas),
      fum: toText(values.fum),
      menarcaEdad: toInteger(values.menarca),
      ritmo: toText(values.ritmo),
      fechaUltimoPapanicolaou: toText(values.ultimo_papanicolaou),
      terapiaHormonal: normalizeEnumText(values.terapia_hormonal),
      estadoMenopausia: normalizeMenopausiaEnum(values.peri_post_menopausia),
      infeccionTransmisionSexual: toBoolean(values.infeccion_transmision_sexual),
      patologiaMamariaBenigna: normalizeEnumText(values.patologia_mamaria_benigna),
      colposcopia: normalizeEnumText(values.colposcopia),
    },
  };
};

const enumToUi = (value: any): any => {
  if (value === undefined || value === null || value === '') return value;
  if (typeof value === 'boolean') return value ? 'SI' : 'NO';
  return String(value).replace(/_/g, ' ');
};

const hasMeaningfulOther = (value: any) => {
  const text = String(value ?? '').trim();
  if (!text) return false;
  return !/^sin\s+otros?/i.test(text);
};

const normalizeConsultaValues = (raw: any): Record<string, any> => {
  const root =
    raw?.datos ??
    raw?.datosClinicos ??
    raw?.datos_clinicos ??
    raw?.historia ??
    raw?.contenido ??
    raw ??
    {};

  const values: Record<string, any> = {};

  // Compatibilidad con respuestas antiguas/planas.
  if (root && typeof root === 'object' && !Array.isArray(root)) {
    Object.entries(root).forEach(([key, value]) => {
      if (
        [
          'paciente',
          'usuario',
          'medico',
          'sucursal',
          'empresa',
          'diagnosticos',
          'signosVitales',
          'antecedentesHeredofamiliares',
          'antecedenteNoPatologico',
          'antecedentePatologico',
          'antecedenteGinecoObstetrico',
          'createdAt',
          'updatedAt',
          'created_at',
          'updated_at',
        ].includes(key)
      ) {
        return;
      }

      if (value !== null && typeof value === 'object' && !Array.isArray(value)) return;
      values[snakeize(key)] = value;
    });
  }

  const signos =
    raw?.signosVitales ??
    raw?.signos_vitales ??
    root?.signosVitales ??
    root?.signos_vitales ??
    {};

  Object.assign(values, {
    peso: firstDefined(signos?.peso, values.peso),
    altura: firstDefined(signos?.altura, values.altura),
    imc: firstDefined(signos?.imc, values.imc),
    temperatura: firstDefined(signos?.temperatura, values.temperatura),
    presion_arterial: firstDefined(
      signos?.presionArterial,
      signos?.presion_arterial,
      values.presion_arterial,
    ),
    frecuencia_cardiaca: firstDefined(
      signos?.frecuenciaCardiaca,
      signos?.frecuencia_cardiaca,
      values.frecuencia_cardiaca,
    ),
    frecuencia_respiratoria: firstDefined(
      signos?.frecuenciaRespiratoria,
      signos?.frecuencia_respiratoria,
      values.frecuencia_respiratoria,
    ),
    spo2: firstDefined(signos?.spo2, signos?.spO2, values.spo2),
    circunferencia_abdomen: firstDefined(
      signos?.cinturaAbdominal,
      signos?.circunferenciaAbdomen,
      signos?.circunferencia_abdomen,
      values.circunferencia_abdomen,
    ),
    motivo_referencia: firstDefined(signos?.motivoReferencia, signos?.motivo_referencia),
    descripcion_referencia: firstDefined(
      signos?.descripcionReferencia,
      signos?.descripcion_referencia,
    ),
  });

  const heredo =
    raw?.antecedentesHeredofamiliares ??
    raw?.antecedentes_heredofamiliares ??
    root?.antecedentesHeredofamiliares ??
    root?.antecedentes_heredofamiliares ??
    {};

  const detalles = Array.isArray(heredo?.detalles) ? heredo.detalles : [];
  detalles.forEach((detalle: any) => {
    const tipoId = Number(
      firstDefined(detalle?.tipoAntecedenteId, detalle?.tipo_antecedente_id, detalle?.tipo?.id),
    );
    const config = HEREDOFAMILIAR_TYPES.find((item) => item.id === tipoId);
    if (!config) return;

    values[`${config.key}_check`] = true;
    values[`${config.key}_parentesco`] = firstDefined(detalle?.parentesco, detalle?.relacion);

    if (config.key === 'diabetes') {
      const detailText = toText(detalle?.detalle);
      if (detailText && normalizeEnumText(detailText) !== normalizeEnumText(config.label)) {
        values.tipos_antecedentes = detailText;
      }
    }
  });

  if (hasMeaningfulOther(heredo?.otros)) {
    values.otros_check = true;
    values.otros_antecedentes = heredo.otros;
  }

  const noPat =
    raw?.antecedenteNoPatologico ??
    raw?.antecedente_no_patologico ??
    root?.antecedenteNoPatologico ??
    root?.antecedente_no_patologico ??
    raw?.antecedentesPersonalesNoPatologicos ??
    {};

  values.alimentacion = firstDefined(noPat?.alimentacion, values.alimentacion);
  values.higiene = firstDefined(noPat?.higiene, values.higiene);
  values.grupo_sanguineo = firstDefined(
    noPat?.grupoSanguineo,
    noPat?.grupo_sanguineo,
    values.grupo_sanguineo,
  );

  const inmunizacionesIncompletas = booleanValue(
    firstDefined(noPat?.inmunizacionesIncompletas, noPat?.inmunizaciones_incompletas),
  );
  if (inmunizacionesIncompletas !== undefined) {
    values.inmunizaciones_incompletas_check = inmunizacionesIncompletas;
    if (inmunizacionesIncompletas) {
      values.inmunizaciones_incompletas = firstDefined(
        noPat?.detalleInmunizaciones,
        noPat?.detalle_inmunizaciones,
      );
    }
  }

  if (hasMeaningfulOther(noPat?.otros)) {
    values.otros_no_patologicos_check = true;
    values.otros_no_patologicos = noPat.otros;
  }

  const pat =
    raw?.antecedentePatologico ??
    raw?.antecedente_patologico ??
    root?.antecedentePatologico ??
    root?.antecedente_patologico ??
    raw?.antecedentesPersonalesPatologicos ??
    {};

  Object.assign(values, {
    enfermedades_infancia: firstDefined(
      pat?.enfermedadesInfancia,
      pat?.enfermedades_infancia,
      values.enfermedades_infancia,
    ),
    alergias: firstDefined(pat?.alergias, values.alergias),
    cirugias: firstDefined(pat?.quirurgicos, pat?.cirugias, values.cirugias),
    transfusiones: firstDefined(pat?.transfusiones, values.transfusiones),
    fracturas: firstDefined(pat?.fracturas, values.fracturas),
    traumatismos: firstDefined(pat?.traumatismos, values.traumatismos),
    hospitalizaciones: firstDefined(pat?.hospitalizaciones, values.hospitalizaciones),
    medicamentos_actuales: firstDefined(
      pat?.medicamentosActuales,
      pat?.medicamentos_actuales,
      values.medicamentos_actuales,
    ),
    dislipidemia_patologica: firstDefined(pat?.dislipidemia, values.dislipidemia_patologica),
    tuberculosis_pulmonar:
      booleanValue(firstDefined(pat?.tuberculosisPulmonar, pat?.tuberculosis_pulmonar)) === true
        ? 'SI'
        : booleanValue(firstDefined(pat?.tuberculosisPulmonar, pat?.tuberculosis_pulmonar)) === false
          ? 'NO'
          : values.tuberculosis_pulmonar,
    tabaquismo: firstDefined(pat?.tabaquismo, values.tabaquismo),
    alcoholismo: firstDefined(pat?.alcoholismo, values.alcoholismo),
    toxicomanias: firstDefined(pat?.toxicomanias, values.toxicomanias),
  });

  if (hasMeaningfulOther(pat?.otros)) {
    values.otros_patologicos_check = true;
    values.otros_patologicos = pat.otros;
  }

  const gineco =
    raw?.antecedenteGinecoObstetrico ??
    raw?.antecedente_gineco_obstetrico ??
    root?.antecedenteGinecoObstetrico ??
    root?.antecedente_gineco_obstetrico ??
    raw?.antecedentesGinecoObstetricos ??
    {};

  Object.assign(values, {
    ivsa: firstDefined(gineco?.ivsaEdad, gineco?.ivsa_edad, values.ivsa),
    numero_parejas: firstDefined(gineco?.numeroParejas, gineco?.numero_parejas, values.numero_parejas),
    metodo_anticonceptivo: firstDefined(
      gineco?.metodoAnticonceptivo,
      gineco?.metodo_anticonceptivo,
      values.metodo_anticonceptivo,
    ),
    gestas: firstDefined(gineco?.gestas, values.gestas),
    partos: firstDefined(gineco?.partos, values.partos),
    abortos: firstDefined(gineco?.abortos, values.abortos),
    cesareas: firstDefined(gineco?.cesareas, values.cesareas),
    fum: firstDefined(gineco?.fum, values.fum),
    menarca: firstDefined(gineco?.menarcaEdad, gineco?.menarca_edad, values.menarca),
    ritmo: firstDefined(gineco?.ritmo, values.ritmo),
    ultimo_papanicolaou: firstDefined(
      gineco?.fechaUltimoPapanicolaou,
      gineco?.fecha_ultimo_papanicolaou,
      values.ultimo_papanicolaou,
    ),
    terapia_hormonal: enumToUi(firstDefined(gineco?.terapiaHormonal, gineco?.terapia_hormonal)),
    peri_post_menopausia: normalizeMenopausiaEnum(
      firstDefined(gineco?.estadoMenopausia, gineco?.estado_menopausia),
    ),
    infeccion_transmision_sexual: enumToUi(
      firstDefined(
        gineco?.infeccionTransmisionSexual,
        gineco?.infeccion_transmision_sexual,
      ),
    ),
    patologia_mamaria_benigna: enumToUi(
      firstDefined(gineco?.patologiaMamariaBenigna, gineco?.patologia_mamaria_benigna),
    ),
    colposcopia: enumToUi(gineco?.colposcopia),
  });

  return values;
};

const getPatientName = (paciente: any, fallback?: Partial<PacienteData> | null) => {
  const direct = firstDefined(paciente?.nombreCompleto, paciente?.nombre_completo);
  if (direct) return String(direct);

  const parts = [
    paciente?.nombre ?? fallback?.nombre,
    paciente?.primerApellido ?? paciente?.primer_apellido ?? fallback?.primer_apellido,
    paciente?.segundoApellido ?? paciente?.segundo_apellido ?? fallback?.segundo_apellido,
  ].filter(Boolean);

  return parts.join(' ').replace(/\s+/g, ' ').trim() || 'Paciente sin nombre';
};

const normalizeDiagnosticos = (
  raw: any,
  consulta: Record<string, any>,
): DiagnosticoHistoriaClinica[] => {
  const source = Array.isArray(raw?.diagnosticos)
    ? raw.diagnosticos
    : Array.isArray(raw?.diagnosticoHistorias)
      ? raw.diagnosticoHistorias
      : [];

  if (source.length) {
    return source.map((item: any, index: number) => {
      const catalogo =
        item?.diagnostico && typeof item.diagnostico === 'object'
          ? item.diagnostico
          : item?.cie10 && typeof item.cie10 === 'object'
            ? item.cie10
            : {};

      return {
        key: String(item?.id ?? `${raw?.id ?? 'historia'}-${index}`),
        no: index + 1,
        clave: String(
          firstDefined(item?.clave, item?.codigo, catalogo?.clave, catalogo?.codigo, '') ?? '',
        ) || undefined,
        diagnostico: String(
          firstDefined(
            typeof item?.diagnostico === 'string' ? item.diagnostico : undefined,
            item?.nombre,
            catalogo?.nombre,
            catalogo?.descripcion,
            'Diagnóstico registrado',
          ),
        ),
        descripcion: firstDefined(item?.descripcion, item?.detalle, catalogo?.text),
        primeraVez: booleanValue(firstDefined(item?.primeraVez, item?.primera_vez)),
        subsecuente: booleanValue(item?.subsecuente),
      };
    });
  }

  const diagnostico = firstDefined(
    consulta?.diagnostico,
    raw?.diagnostico,
    raw?.diagnosticoNombre,
    raw?.diagnostico_nombre,
  );

  if (!diagnostico) return [];

  return [
    {
      key: `historia-${raw?.id ?? Date.now()}-diagnostico`,
      no: 1,
      clave: firstDefined(
        consulta?.clave_diagnostico,
        raw?.diagnosticoClave,
        raw?.diagnostico_clave,
      ),
      diagnostico: String(diagnostico),
      descripcion: firstDefined(
        consulta?.descripcion_diagnostico,
        raw?.descripcionDiagnostico,
        raw?.descripcion_diagnostico,
      ),
      primeraVez: booleanValue(firstDefined(raw?.primeraVez, raw?.primera_vez)),
      subsecuente: booleanValue(firstDefined(raw?.subsecuente, true)),
    },
  ];
};

export const normalizeHistoriaClinica = (
  raw: any,
  fallbackPaciente?: Partial<PacienteData> | null,
): HistoriaClinicaItem => {
  const consulta = normalizeConsultaValues(raw);
  const pacienteApi = raw?.paciente ?? raw?.patient ?? {};
  const apiId = numberValue(firstDefined(raw?.id, raw?.historiaClinicaId, raw?.historia_clinica_id));
  const pacienteId = firstDefined(
    raw?.pacienteId,
    raw?.paciente_id,
    pacienteApi?.id,
    fallbackPaciente?.id,
  );

  const fecha = String(
    firstDefined(
      raw?.fecha,
      raw?.fechaElaboracion,
      raw?.fecha_elaboracion,
      raw?.fechaHistoria,
      raw?.fechaHistoriaClinica,
      raw?.fecha_historia_clinica,
      raw?.createdAt,
      raw?.created_at,
      consulta?.fecha_consulta,
      '',
    ),
  );

  consulta.fecha_consulta = fecha;

  return {
    id: apiId ? `historia-api-${apiId}` : `historia-${fecha || Date.now()}`,
    apiId,
    pacienteId,
    paciente: {
      id: pacienteId,
      nombre: getPatientName(pacienteApi, fallbackPaciente),
      numero_expediente: String(
        firstDefined(
          pacienteApi?.numeroExpediente,
          pacienteApi?.numero_expediente,
          fallbackPaciente?.numero_expediente,
          '',
        ),
      ) || undefined,
      curp: String(firstDefined(pacienteApi?.curp, fallbackPaciente?.curp, '')) || undefined,
      sexo: String(firstDefined(pacienteApi?.sexo, fallbackPaciente?.sexo, '')) || undefined,
      fecha_nacimiento:
        String(
          firstDefined(
            pacienteApi?.fechaNacimiento,
            pacienteApi?.fecha_nacimiento,
            fallbackPaciente?.fecha_nacimiento,
            '',
          ),
        ) || undefined,
    },
    consulta,
    diagnosticos: normalizeDiagnosticos(raw, consulta),
    fecha_consulta: fecha,
    raw,
  };
};

export const getHistoriaClinicaApiError = (
  error: any,
  fallback = 'No fue posible completar la operación con la historia clínica.',
) => {
  const details = error?.response?.data?.details;
  if (Array.isArray(details) && details.length) return details.join('. ');

  const apiMessage = error?.response?.data?.message;
  if (Array.isArray(apiMessage)) return apiMessage.join('. ');
  if (typeof apiMessage === 'string' && apiMessage.trim()) return apiMessage;

  const nested = error?.response?.data?.error?.message;
  if (typeof nested === 'string' && nested.trim()) return nested;

  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

class HistoriaClinicaService {
  private readonly basePath = '/historia-clinica';

  async create(
    pacienteId: number,
    values: Record<string, any>,
    pacienteFallback?: Partial<PacienteData> | null,
  ): Promise<HistoriaClinicaItem> {
    const payload = buildHistoriaClinicaPayload(pacienteId, values);
    const response = await axiosInstance.post(this.basePath, payload);
    return normalizeHistoriaClinica(unwrapEntity(response.data), pacienteFallback);
  }

  async findAll(
    params: HistoriaClinicaQuery = {},
    pacienteFallback?: Partial<PacienteData> | null,
  ): Promise<HistoriaClinicaPage> {
    const response = await axiosInstance.get(this.basePath, { params });
    const { records, meta } = unwrapPage(response.data);
    const data = records.map((item) => normalizeHistoriaClinica(item, pacienteFallback));

    return {
      data,
      meta: {
        total: Number(meta?.total ?? data.length ?? 0),
        page: Number(meta?.page ?? params.page ?? 1),
        limit: Number(meta?.limit ?? params.limit ?? 20),
        totalPages: Number(meta?.totalPages ?? (data.length ? 1 : 0)),
      },
    };
  }

  async findByPaciente(
    pacienteId: number,
    pacienteFallback?: Partial<PacienteData> | null,
  ): Promise<HistoriaClinicaItem[]> {
    const first = await this.findAll(
      { page: 1, limit: 20, pacienteId },
      pacienteFallback,
    );
    const all = [...first.data];

    if (first.meta.totalPages > 1) {
      for (let page = 2; page <= first.meta.totalPages; page += 1) {
        const next = await this.findAll(
          { page, limit: first.meta.limit || 20, pacienteId },
          pacienteFallback,
        );
        all.push(...next.data);
      }
    }

    return all.sort(
      (a, b) =>
        new Date(b.fecha_consulta || 0).getTime() -
        new Date(a.fecha_consulta || 0).getTime(),
    );
  }

  async findOne(
    id: number,
    pacienteFallback?: Partial<PacienteData> | null,
  ): Promise<HistoriaClinicaItem> {
    const response = await axiosInstance.get(`${this.basePath}/${id}`);
    return normalizeHistoriaClinica(unwrapEntity(response.data), pacienteFallback);
  }

  async update(
    id: number,
    pacienteId: number,
    values: Record<string, any>,
    pacienteFallback?: Partial<PacienteData> | null,
  ): Promise<HistoriaClinicaItem> {
    const payload = buildHistoriaClinicaPayload(pacienteId, values);
    const response = await axiosInstance.patch(`${this.basePath}/${id}`, payload);
    return normalizeHistoriaClinica(unwrapEntity(response.data), pacienteFallback);
  }

  async remove(id: number): Promise<any> {
    const response = await axiosInstance.delete(`${this.basePath}/${id}`);
    return unwrapEntity(response.data);
  }
}

export default new HistoriaClinicaService();
