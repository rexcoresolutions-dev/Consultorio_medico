import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  DatePicker,
  ConfigProvider,
  Input,
  Modal,
  Radio,
  Row,
  Select,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  FileTextOutlined,
  HistoryOutlined,
  IdcardOutlined,
  LogoutOutlined,
  MedicineBoxOutlined,
  PlusOutlined,
  SaveOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import esES from 'antd/locale/es_ES';
import dayjs, { type Dayjs } from 'dayjs';
import Swal from 'sweetalert2';

import type { PacienteData } from '../../services/pacientes/pacientes.service';
import historiaClinicaService, {
  getHistoriaClinicaApiError,
  type HistoriaClinicaItem,
} from '../../services/historia-clinica/historia-clinica.service';
import expedienteClinicoService, {
  type ExpedienteClinicoItem,
} from '../../services/expediente-clinico/expediente-clinico.service';
import './HistorialClinico.css';

const { Title, Text } = Typography;

const parseClinicalDate = (value?: string | null): Dayjs | null => {
  if (!value) return null;

  const text = String(value).trim();
  const mxDate = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mxDate) {
    const [, day, month, year] = mxDate;
    const parsed = dayjs(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    return parsed.isValid() ? parsed : null;
  }

  const parsed = dayjs(text);
  return parsed.isValid() ? parsed : null;
};

const formatClinicalDate = (value?: string | null) => {
  const parsed = parseClinicalDate(value);
  return parsed ? parsed.format('DD/MM/YYYY') : '-';
};

const clinicalDatePickerTheme = {
  token: {
    colorPrimary: '#27c7ca',
    colorPrimaryHover: '#16b9bd',
    borderRadius: 12,
    controlHeight: 42,
  },
};

const disableFutureClinicalDates = (current: Dayjs) =>
  current && current.startOf('day').isAfter(dayjs().startOf('day'));

const unwrapClinicalApiData = (input: any) => {
  let current = input;
  for (let i = 0; i < 5; i += 1) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) break;
    const hasClinicalFields =
      current.signosVitales !== undefined ||
      current.signos_vitales !== undefined ||
      current.peso !== undefined ||
      current.pacienteId !== undefined ||
      current.id !== undefined;
    if (hasClinicalFields) break;
    if (!current.data || typeof current.data !== 'object' || Array.isArray(current.data)) break;
    current = current.data;
  }
  return current ?? input;
};

const PACIENTE_ATENCION_STORAGE_KEY = 'paciente_atencion_actual';
const CONSULTA_EXTERNA_ABIERTA_STORAGE_KEY = 'consulta_externa_abierta';


type HistorialFormValues = {
  peso?: string;
  altura?: string;
  imc?: string;
  temperatura?: string;
  presion_arterial?: string;
  frecuencia_cardiaca?: string;
  frecuencia_respiratoria?: string;
  spo2?: string;
  circunferencia_abdomen?: string;

  diabetes_check?: boolean;
  diabetes_parentesco?: string;
  cardiovascular_check?: boolean;
  cardiovascular_parentesco?: string;
  epilepsias_check?: boolean;
  epilepsias_parentesco?: string;
  neoplasicos_check?: boolean;
  neoplasicos_parentesco?: string;
  lueticos_check?: boolean;
  lueticos_parentesco?: string;
  hipertension_check?: boolean;
  hipertension_parentesco?: string;
  fimicos_check?: boolean;
  fimicos_parentesco?: string;
  dislipidemia_check?: boolean;
  dislipidemia_parentesco?: string;
  otros_check?: boolean;
  otros_antecedentes?: string;
  tipos_antecedentes?: string;

  alimentacion?: string;
  higiene?: string;
  inmunizaciones_incompletas_check?: boolean;
  inmunizaciones_incompletas?: string;
  grupo_sanguineo?: string;
  otros_no_patologicos_check?: boolean;
  otros_no_patologicos?: string;

  enfermedades_infancia?: string;
  alergias?: string;
  cirugias?: string;
  transfusiones?: string;
  fracturas?: string;
  traumatismos?: string;
  hospitalizaciones?: string;
  medicamentos_actuales?: string;
  tabaquismo?: string;
  alcoholismo?: string;
  toxicomanias?: string;
  dislipidemia_patologica?: string;
  tuberculosis_pulmonar?: string;
  otros_patologicos_check?: boolean;
  otros_patologicos?: string;

  ivsa?: string;
  numero_parejas?: string;
  metodo_anticonceptivo?: string;
  gestas?: string;
  partos?: string;
  abortos?: string;
  cesareas?: string;
  fum?: string;
  menarca?: string;
  ritmo?: string;
  ultimo_papanicolaou?: string;
  terapia_hormonal?: string;
  peri_post_menopausia?: string;
  infeccion_transmision_sexual?: string;
  patologia_mamaria_benigna?: string;
  colposcopia?: string;

  motivo_consulta?: string;
  diagnostico?: string;
  descripcion_diagnostico?: string;
  referir_paciente?: string;
  referido_por?: string;
  contrarreferencia?: string;
  detalle_contrarreferencia?: string;

  [key: string]: any;
};

const parentescoOptions = [
  { value: 'Madre', label: 'Madre' },
  { value: 'Padre', label: 'Padre' },
  { value: 'Hermano(a)', label: 'Hermano(a)' },
  { value: 'Abuelo(a)', label: 'Abuelo(a)' },
  { value: 'Tío(a)', label: 'Tío(a)' },
  { value: 'Otro', label: 'Otro' },
];

const grupoSanguineoOptions = [
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
  { value: 'Desconocido', label: 'Desconocido' },
];

const siNoOptions = [
  { value: 'SI', label: 'Sí' },
  { value: 'NO', label: 'No' },
];

const habitosOptions = [
  { value: 'NUNCA', label: 'Nunca' },
  { value: 'ACTUAL', label: 'Actual' },
  { value: 'ANTERIOR', label: 'Anterior' },
  { value: 'DESCONOCIDO', label: 'Desconocido' },
];

const menopausiaOptions = [
  { value: 'PREMENOPAUSIA', label: 'Premenopausia' },
  { value: 'PERIMENOPAUSIA', label: 'Perimenopausia' },
  { value: 'POSTMENOPAUSIA', label: 'Postmenopausia' },
  { value: 'NO_APLICA', label: 'No aplica' },
  { value: 'DESCONOCIDO', label: 'Desconocido' },
];

const noAplicaOptions = [
  { value: 'NO APLICA', label: 'NO APLICA' },
  { value: 'SI', label: 'Sí' },
  { value: 'NO', label: 'No' },
];

const antecedentesFamiliares = [
  ['diabetes', 'Diabetes'],
  ['cardiovascular', 'Cardiovascular'],
  ['epilepsias', 'Epilepsias'],
  ['neoplasicos', 'Neoplásicos'],
  ['lueticos', 'Luéticos'],
  ['hipertension', 'Hipertensión'],
  ['fimicos', 'Fímicos'],
  ['dislipidemia', 'Dislipidemia'],
];

const cargarPacienteActivo = (): PacienteData | null => {
  try {
    const data = localStorage.getItem(PACIENTE_ATENCION_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

const getFullName = (paciente?: Partial<PacienteData> | null) =>
  `${paciente?.nombre || ''} ${paciente?.primer_apellido || ''} ${
    paciente?.segundo_apellido || ''
  }`
    .replace(/\s+/g, ' ')
    .trim();

const formatDateTime = (fecha?: string) => {
  if (!fecha) return '-';

  return new Date(fecha).toLocaleString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const calcularEdad = (fechaNacimiento?: string) => {
  if (!fechaNacimiento) return '-';

  const nacimiento = new Date(fechaNacimiento);
  const hoy = new Date();

  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();

  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }

  return `${edad} años`;
};

const normalizarNumero = (valor?: string | number) => {
  return Number(String(valor ?? '').replace(',', '.'));
};

const normalizarAlturaMetros = (altura?: string | number) => {
  const alturaNum = normalizarNumero(altura);
  if (!alturaNum || alturaNum <= 0) return 0;
  return alturaNum > 3 ? alturaNum / 100 : alturaNum;
};

const calcularIMC = (peso?: string | number, altura?: string | number) => {
  const pesoNum = normalizarNumero(peso);
  const alturaMetros = normalizarAlturaMetros(altura);

  if (!pesoNum || !alturaMetros || pesoNum <= 0 || alturaMetros <= 0) return '';

  return (pesoNum / (alturaMetros * alturaMetros)).toFixed(2);
};

const getPacienteDato = (paciente: PacienteData | null, key: string, fallback = '-') => {
  if (!paciente) return fallback;
  return (paciente as any)?.[key] || fallback;
};

const HistorialClinico: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm<HistorialFormValues>();

  const [pacienteActivo, setPacienteActivo] = useState<PacienteData | null>(() =>
    cargarPacienteActivo(),
  );
  const [historiales, setHistoriales] = useState<HistoriaClinicaItem[]>([]);
  const [expedienteItems, setExpedienteItems] = useState<ExpedienteClinicoItem[]>([]);
  const [ultimaConsultaExterna, setUltimaConsultaExterna] =
    useState<ExpedienteClinicoItem | null>(null);
  const [consultaBasePrecarga, setConsultaBasePrecarga] =
    useState<ExpedienteClinicoItem | null>(null);
  const [loadingHistoriales, setLoadingHistoriales] = useState(false);
  const [historialError, setHistorialError] = useState('');
  const [registroOpen, setRegistroOpen] = useState(false);
  const [registroStep, setRegistroStep] = useState(0);
  const [vistaPreviaOpen, setVistaPreviaOpen] = useState(false);
  const [vistaPreviaData, setVistaPreviaData] = useState<HistorialFormValues | null>(null);
  const [prefillValues, setPrefillValues] = useState<HistorialFormValues | null>(null);

  const pacienteNombre = getFullName(pacienteActivo);

  useEffect(() => {
    let activo = true;

    const cargarExpediente = async () => {
      const pacienteId = Number(pacienteActivo?.id);

      if (!Number.isInteger(pacienteId) || pacienteId <= 0) {
        if (activo) {
          setHistoriales([]);
          setExpedienteItems([]);
          setUltimaConsultaExterna(null);
          setConsultaBasePrecarga(null);
          setHistorialError(
            pacienteActivo
              ? 'No fue posible identificar al paciente para consultar su expediente.'
              : '',
          );
        }
        return;
      }

      try {
        if (activo) {
          setLoadingHistoriales(true);
          setHistorialError('');
        }

        const expediente = await expedienteClinicoService.findByPaciente(
          pacienteId,
          pacienteActivo,
        );

        if (!activo) return;

        setExpedienteItems(expediente.items);
        setHistoriales(
          expediente.items
            .filter((item) => item.sourceType === 'HISTORIA_CLINICA')
            .map((item) => item as HistoriaClinicaItem),
        );
        setUltimaConsultaExterna(expediente.ultimaConsultaExterna);
        setConsultaBasePrecarga(expediente.consultaBasePrecarga);

        if (expediente.warnings.length) {
          setHistorialError(expediente.warnings.join(' '));
        }
      } catch (error) {
        console.error('Error cargando expediente clínico:', error);
        if (activo) {
          setHistoriales([]);
          setExpedienteItems([]);
          setUltimaConsultaExterna(null);
          setConsultaBasePrecarga(null);
          setHistorialError(
            getHistoriaClinicaApiError(
              error,
              'No fue posible consultar el expediente clínico del paciente.',
            ),
          );
        }
      } finally {
        if (activo) setLoadingHistoriales(false);
      }
    };

    void cargarExpediente();

    return () => {
      activo = false;
    };
  }, [pacienteActivo?.id]);

  const historialesPaciente = useMemo(() => {
    if (!pacienteActivo) return [];

    return historiales
      .filter((item) => {
        const sameId =
          pacienteActivo.id &&
          String(item.pacienteId || item.paciente?.id) === String(pacienteActivo.id);

        const sameExpediente =
          pacienteActivo.numero_expediente &&
          item.paciente.numero_expediente === pacienteActivo.numero_expediente;

        const sameCurp = pacienteActivo.curp && item.paciente.curp === pacienteActivo.curp;

        return sameId || sameExpediente || sameCurp;
      })
      .sort(
        (a, b) =>
          new Date(b.fecha_consulta).getTime() - new Date(a.fecha_consulta).getTime(),
      );
  }, [historiales, pacienteActivo]);

  const ultimoHistorial = historialesPaciente[0];
  const totalRegistrosExpediente = expedienteItems.length;

  const consultaBaseTieneDatosClinicos = useMemo(() => {
    if (!consultaBasePrecarga) return false;
    const c = consultaBasePrecarga.consulta || {};
    const raw = unwrapClinicalApiData(consultaBasePrecarga.raw || {});
    const signosRaw =
      unwrapClinicalApiData(
        raw?.signosVitales ??
          raw?.signos_vitales ??
          raw?.consulta?.signosVitales ??
          raw?.consulta?.signos_vitales ??
          {},
      ) || {};

    return [
      c.peso, c.altura, c.imc, c.temperatura, c.presion_arterial,
      c.frecuencia_cardiaca, c.frecuencia_respiratoria, c.spo2,
      c.circunferencia_abdomen, signosRaw?.peso, signosRaw?.altura,
      signosRaw?.imc, signosRaw?.temperatura, signosRaw?.presionArterial,
      signosRaw?.frecuenciaCardiaca, signosRaw?.frecuenciaRespiratoria,
      signosRaw?.spo2, signosRaw?.cinturaAbdominal,
    ].some((value) => value !== undefined && value !== null && value !== '');
  }, [consultaBasePrecarga]);

  useEffect(() => {
    if (!registroOpen || !prefillValues) return;

    // El formulario vive dentro de un Modal. En la primera apertura los campos
    // todavía no están montados cuando se pulsa "Iniciar registro". Aplicamos
    // la precarga después de que el modal ya conectó el Form para que los valores
    // queden realmente visibles en los inputs.
    const frame = window.requestAnimationFrame(() => {
      form.resetFields();
      form.setFieldsValue(prefillValues);

      if (!prefillValues.imc && prefillValues.peso && prefillValues.altura) {
        const imc = calcularIMC(prefillValues.peso, prefillValues.altura);
        if (imc) form.setFieldValue('imc', imc);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [registroOpen, prefillValues, form]);

  const actualizarIMC = () => {
    const peso = form.getFieldValue('peso');
    const altura = form.getFieldValue('altura');
    const imc = calcularIMC(peso, altura);

    form.setFieldValue('imc', imc);
  };

  const renderToggleRadio = (name: string, fieldsToClear: string[] = []) => (
    <Form.Item noStyle shouldUpdate={(prev, current) => prev?.[name] !== current?.[name]}>
      {() => {
        const checked = Boolean(form.getFieldValue(name));

        return (
          <Radio
            checked={checked}
            onClick={() => {
              const nextChecked = !checked;
              form.setFieldValue(name, nextChecked);

              if (!nextChecked && fieldsToClear.length) {
                const clearedValues = fieldsToClear.reduce<Record<string, undefined>>(
                  (acc, fieldName) => {
                    acc[fieldName] = undefined;
                    return acc;
                  },
                  {},
                );
                form.setFieldsValue(clearedValues);
              }
            }}
          />
        );
      }}
    </Form.Item>
  );

  const abrirRegistroHistorial = () => {
    // La historia clínica conserva antecedentes longitudinales del último registro
    // y usa la Consulta Externa más reciente como punto de partida clínico.
    const historiaBase = ultimoHistorial?.consulta || {};
    const consultaReciente = consultaBasePrecarga?.consulta || {};
    const rawConsulta = unwrapClinicalApiData(consultaBasePrecarga?.raw || {});
    const rawConsultaNested = unwrapClinicalApiData(rawConsulta?.consulta || {});
    const rawSignos = unwrapClinicalApiData(
      rawConsulta?.signosVitales ??
        rawConsulta?.signos_vitales ??
        rawConsulta?.signos ??
        rawConsultaNested?.signosVitales ??
        rawConsultaNested?.signos_vitales ??
        rawConsultaNested?.signos ??
        rawConsulta ??
        {},
    );
    const diagnosticoReciente = consultaBasePrecarga?.diagnosticos?.[0];

    const firstValue = (...values: any[]) =>
      values.find((value) => value !== undefined && value !== null && value !== '');

    const values: HistorialFormValues = {
      peso: firstValue(consultaReciente.peso, rawSignos?.peso, rawConsulta?.peso, rawConsultaNested?.peso, historiaBase.peso, ''),
      altura: firstValue(consultaReciente.altura, rawSignos?.altura, rawConsulta?.altura, rawConsultaNested?.altura, historiaBase.altura, ''),
      imc: firstValue(consultaReciente.imc, rawSignos?.imc, rawConsulta?.imc, rawConsultaNested?.imc, historiaBase.imc, ''),
      temperatura: firstValue(
        consultaReciente.temperatura,
        rawSignos?.temperatura,
        historiaBase.temperatura,
        '',
      ),
      presion_arterial: firstValue(
        consultaReciente.presion_arterial,
        rawSignos?.presionArterial,
        rawSignos?.presion_arterial,
        historiaBase.presion_arterial,
        '',
      ),
      frecuencia_cardiaca: firstValue(
        consultaReciente.frecuencia_cardiaca,
        rawSignos?.frecuenciaCardiaca,
        rawSignos?.frecuencia_cardiaca,
        historiaBase.frecuencia_cardiaca,
        '',
      ),
      frecuencia_respiratoria: firstValue(
        consultaReciente.frecuencia_respiratoria,
        rawSignos?.frecuenciaRespiratoria,
        rawSignos?.frecuencia_respiratoria,
        historiaBase.frecuencia_respiratoria,
        '',
      ),
      spo2: firstValue(
        consultaReciente.spo2,
        rawSignos?.spo2,
        rawSignos?.spO2,
        historiaBase.spo2,
        '',
      ),
      circunferencia_abdomen: firstValue(
        consultaReciente.circunferencia_abdomen,
        rawSignos?.cinturaAbdominal,
        rawSignos?.cintura_abdominal,
        rawSignos?.circunferenciaAbdomen,
        historiaBase.circunferencia_abdomen,
        '',
      ),

      diabetes_check: historiaBase.diabetes_check || false,
      diabetes_parentesco: historiaBase.diabetes_parentesco || undefined,
      cardiovascular_check: historiaBase.cardiovascular_check || false,
      cardiovascular_parentesco: historiaBase.cardiovascular_parentesco || undefined,
      epilepsias_check: historiaBase.epilepsias_check || false,
      epilepsias_parentesco: historiaBase.epilepsias_parentesco || undefined,
      neoplasicos_check: historiaBase.neoplasicos_check || false,
      neoplasicos_parentesco: historiaBase.neoplasicos_parentesco || undefined,
      lueticos_check: historiaBase.lueticos_check || false,
      lueticos_parentesco: historiaBase.lueticos_parentesco || undefined,
      hipertension_check: historiaBase.hipertension_check || false,
      hipertension_parentesco: historiaBase.hipertension_parentesco || undefined,
      fimicos_check: historiaBase.fimicos_check || false,
      fimicos_parentesco: historiaBase.fimicos_parentesco || undefined,
      dislipidemia_check: historiaBase.dislipidemia_check || false,
      dislipidemia_parentesco: historiaBase.dislipidemia_parentesco || undefined,
      otros_check: historiaBase.otros_check || false,
      otros_antecedentes: historiaBase.otros_antecedentes || '',
      tipos_antecedentes: historiaBase.tipos_antecedentes || '',

      alimentacion: historiaBase.alimentacion || '',
      higiene: historiaBase.higiene || '',
      inmunizaciones_incompletas_check:
        historiaBase.inmunizaciones_incompletas_check || false,
      inmunizaciones_incompletas: historiaBase.inmunizaciones_incompletas || '',
      grupo_sanguineo: historiaBase.grupo_sanguineo || undefined,
      otros_no_patologicos_check: historiaBase.otros_no_patologicos_check || false,
      otros_no_patologicos: historiaBase.otros_no_patologicos || '',

      enfermedades_infancia: historiaBase.enfermedades_infancia || '',
      alergias: historiaBase.alergias || '',
      cirugias: historiaBase.cirugias || '',
      transfusiones: historiaBase.transfusiones || '',
      fracturas: historiaBase.fracturas || '',
      traumatismos: historiaBase.traumatismos || '',
      hospitalizaciones: historiaBase.hospitalizaciones || '',
      medicamentos_actuales: historiaBase.medicamentos_actuales || '',
      tabaquismo: historiaBase.tabaquismo || '',
      alcoholismo: historiaBase.alcoholismo || '',
      toxicomanias: historiaBase.toxicomanias || '',
      dislipidemia_patologica: historiaBase.dislipidemia_patologica || '',
      tuberculosis_pulmonar:
        consultaReciente.tuberculosis_pulmonar ??
        historiaBase.tuberculosis_pulmonar ??
        '',
      otros_patologicos_check: historiaBase.otros_patologicos_check || false,
      otros_patologicos: historiaBase.otros_patologicos || '',

      ivsa: historiaBase.ivsa || '',
      numero_parejas: historiaBase.numero_parejas || '',
      metodo_anticonceptivo: historiaBase.metodo_anticonceptivo || '',
      gestas: historiaBase.gestas || '',
      partos: historiaBase.partos || '',
      abortos: historiaBase.abortos || '',
      cesareas: historiaBase.cesareas || '',
      fum: historiaBase.fum || '',
      menarca: historiaBase.menarca || '',
      ritmo: historiaBase.ritmo || '',
      ultimo_papanicolaou: historiaBase.ultimo_papanicolaou || '',
      terapia_hormonal:
        consultaReciente.terapia_hormonal ?? historiaBase.terapia_hormonal ?? 'NO APLICA',
      peri_post_menopausia:
        consultaReciente.peri_post_menopausia ??
        historiaBase.peri_post_menopausia ??
        'NO_APLICA',
      infeccion_transmision_sexual:
        consultaReciente.infeccion_transmision_sexual ??
        historiaBase.infeccion_transmision_sexual ??
        'NO APLICA',
      patologia_mamaria_benigna:
        consultaReciente.patologia_mamaria_benigna ??
        historiaBase.patologia_mamaria_benigna ??
        'NO APLICA',
      colposcopia: consultaReciente.colposcopia ?? historiaBase.colposcopia ?? 'NO APLICA',

      motivo_consulta:
        consultaReciente.motivo_consulta ?? historiaBase.motivo_consulta ?? '',
      diagnostico:
        diagnosticoReciente?.diagnostico ??
        ultimoHistorial?.diagnosticos?.[0]?.diagnostico ??
        '',
      descripcion_diagnostico:
        diagnosticoReciente?.descripcion ??
        ultimoHistorial?.diagnosticos?.[0]?.descripcion ??
        '',
      referir_paciente:
        consultaReciente.referir_paciente ?? historiaBase.referir_paciente ?? 'NO',
      referido_por: consultaReciente.referido_por ?? historiaBase.referido_por ?? '',
      contrarreferencia:
        consultaReciente.contrarreferencia === true
          ? 'SI'
          : consultaReciente.contrarreferencia === false
            ? 'NO'
            : historiaBase.contrarreferencia || 'NO',
      detalle_contrarreferencia:
        consultaReciente.detalle_contrarreferencia ??
        historiaBase.detalle_contrarreferencia ??
        '',
    };

    setPrefillValues(values);
    setRegistroStep(0);
    setRegistroOpen(true);
  };

  const cerrarRegistro = () => {
    setRegistroOpen(false);
    setRegistroStep(0);
    setPrefillValues(null);
    form.resetFields();
  };

  const irAPaso = async (paso: number) => {
    actualizarIMC();

    if (registroStep === 0 && paso > 0) {
      try {
        await form.validateFields([
          'peso',
          'altura',
          'temperatura',
          'presion_arterial',
          'frecuencia_cardiaca',
          'frecuencia_respiratoria',
          'spo2',
        ]);
      } catch {
        message.warning('Revisa los datos clínicos antes de continuar.');
        return;
      }
    }

    setRegistroStep(paso);
  };

  const abrirVistaPrevia = () => {
    actualizarIMC();

    const values = form.getFieldsValue(true);

    setVistaPreviaData({
      ...values,
      imc: values.imc || calcularIMC(values.peso, values.altura),
    });

    setVistaPreviaOpen(true);
  };

  const guardarNuevoHistorial = async () => {
    if (!pacienteActivo) return;

    const pacienteId = Number(pacienteActivo.id);
    if (!Number.isInteger(pacienteId) || pacienteId <= 0) {
      message.error('No fue posible identificar al paciente para guardar su historia clínica.');
      return;
    }

    try {
      actualizarIMC();

      await form.validateFields();
      const values = form.getFieldsValue(true);
      const imcCalculado = calcularIMC(values.peso, values.altura);

      const payloadValues: HistorialFormValues = {
        ...values,
        imc: values.imc || imcCalculado || undefined,
      };

      const creado = await historiaClinicaService.create(
        pacienteId,
        payloadValues,
        pacienteActivo,
      );

      setHistoriales((prev) => {
        const sinDuplicado = creado.apiId
          ? prev.filter((item) => item.apiId !== creado.apiId)
          : prev;
        return [creado, ...sinDuplicado].sort(
          (a, b) =>
            new Date(b.fecha_consulta || 0).getTime() -
            new Date(a.fecha_consulta || 0).getTime(),
        );
      });

      const expedienteCreado: ExpedienteClinicoItem = {
        ...creado,
        sourceType: 'HISTORIA_CLINICA',
        sourceId: creado.apiId,
        sourceLabel: 'Historia clínica',
      };
      setExpedienteItems((prev) => [
        expedienteCreado,
        ...prev.filter(
          (item) =>
            !(
              expedienteCreado.sourceId &&
              item.sourceType === 'HISTORIA_CLINICA' &&
              item.sourceId === expedienteCreado.sourceId
            ),
        ),
      ]);

      message.success('Historia clínica guardada correctamente en el servidor.');
      setVistaPreviaOpen(false);
      cerrarRegistro();
    } catch (error: any) {
      if (error?.errorFields) {
        message.warning('Completa la información necesaria de la historia clínica.');
        return;
      }

      console.error('Error guardando historia clínica:', error);
      message.error(
        getHistoriaClinicaApiError(
          error,
          'No fue posible guardar la historia clínica.',
        ),
      );
    }
  };

  const finalizarAtencion = async () => {
    const result = await Swal.fire({
      icon: 'question',
      title: 'Finalizar atención',
      text: `${pacienteNombre || 'El paciente'} dejará de estar activo en consulta, procedimientos e historial.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, finalizar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ff4d4f',
      cancelButtonColor: '#94a3b8',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    localStorage.removeItem(PACIENTE_ATENCION_STORAGE_KEY);
    localStorage.removeItem(CONSULTA_EXTERNA_ABIERTA_STORAGE_KEY);

    await Swal.fire({
      icon: 'success',
      title: 'Atención finalizada',
      text: 'El paciente activo fue liberado correctamente.',
      timer: 1600,
      showConfirmButton: false,
      confirmButtonColor: '#0f766e',
    });

    setPacienteActivo(null);
    navigate('/historial-clinico', { replace: true });
  };

  if (!pacienteActivo) {
    return (
      <div className="historial-page">
        <div className="historial-shell">
          <section className="historial-no-paciente">
            <div className="historial-no-paciente-bg" />

            <div className="historial-no-paciente-icon">
              <HistoryOutlined />
            </div>

            <Tag className="historial-no-paciente-tag">Historial clínico bloqueado</Tag>

            <h1>No hay paciente activo</h1>

            <p>
              Para consultar, crear o administrar un historial clínico, primero debes
              seleccionar un paciente desde el módulo de Pacientes.
            </p>

            <div className="historial-no-paciente-actions">
              <Button
                type="primary"
                size="large"
                icon={<UserOutlined />}
                onClick={() => navigate('/pacientes')}
              >
                Seleccionar paciente
              </Button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="historial-page">
      <div className="historial-shell">
        <header className="historial-hero-card">
          <div className="historial-hero-left">

            <div className="historial-icon">
              <HistoryOutlined />
            </div>
          </div>

          <div className="historial-hero-content">
            <Text className="historial-eyebrow">Expediente electrónico</Text>

            <Title level={2}>Historial clínico</Title>

            <Text type="secondary">
              Consulta el expediente, registra historia clínica y reutiliza los datos más recientes de Consulta Externa.
            </Text>
          </div>

          <Button
            icon={<LogoutOutlined />}
            className="historial-finalizar-btn"
            onClick={finalizarAtencion}
          >
            Finalizar atención
          </Button>
        </header>

        <section className="historial-patient-card">
          <div className="historial-patient-main">
            <Avatar size={72} className="historial-avatar" icon={<UserOutlined />}>
              {pacienteNombre
                .split(' ')
                .slice(0, 2)
                .map((x) => x[0])
                .join('')
                .toUpperCase()}
            </Avatar>

            <div>
              <h2>{pacienteNombre || 'Paciente sin nombre'}</h2>

              <div className="historial-patient-tags">
                <Tag>
                  <IdcardOutlined /> Exp.{' '}
                  {pacienteActivo.numero_expediente || 'Sin expediente'}
                </Tag>
                <Tag>{calcularEdad(pacienteActivo.fecha_nacimiento)}</Tag>
                <Tag>{pacienteActivo.sexo || 'Sin sexo'}</Tag>
              </div>
            </div>
          </div>

          <div className="historial-summary">
            <div>
              <span>Registros clínicos</span>
              <strong>{totalRegistrosExpediente}</strong>
            </div>

            <div>
              <span>Última consulta externa</span>
              <strong>
                {ultimaConsultaExterna
                  ? formatDateTime(ultimaConsultaExterna.fecha_consulta)
                  : '-'}
              </strong>
            </div>
          </div>
        </section>

        {historialError && (
          <Alert
            type="error"
            showIcon
            message="No fue posible cargar la historia clínica"
            description={historialError}
            style={{ marginBottom: 18 }}
          />
        )}

        {loadingHistoriales && !historialError && (
          <Alert
            type="info"
            showIcon
            message="Consultando historia clínica..."
            style={{ marginBottom: 18 }}
          />
        )}

        <Row gutter={[18, 18]} align="stretch" className="historial-actions-row">
          <Col xs={24} lg={8}>
            <Card className="historial-action-card">
              <div className="historial-action-top">
                <div className="historial-action-icon primary">
                  <FileTextOutlined />
                </div>

                <Tag className="historial-action-tag">Consulta</Tag>
              </div>

              <h3>Consultar historiales</h3>

              <p>
                Revisa en un solo lugar las consultas externas y las historias clínicas del paciente seleccionado.
              </p>

              <Button
                type="primary"
                icon={<FileTextOutlined />}
                disabled={loadingHistoriales || !Number(pacienteActivo?.id)}
                onClick={() => navigate('/historiales-disponibles')}
              >
                {loadingHistoriales
                  ? 'Consultando...'
                  : totalRegistrosExpediente > 0
                    ? `Ver ${totalRegistrosExpediente} registro${totalRegistrosExpediente === 1 ? '' : 's'}`
                    : 'Consultar registros'}
              </Button>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card className="historial-action-card">
              <div className="historial-action-top">
                <div className="historial-action-icon success">
                  <PlusOutlined />
                </div>

                <Tag className="historial-action-tag green">Nuevo</Tag>
              </div>

              <h3>Crear historial</h3>

              <p>
                Crea un nuevo registro clínico con datos precargados de la última consulta externa.
              </p>

              <Button icon={<MedicineBoxOutlined />} onClick={abrirRegistroHistorial}>
                Iniciar registro
              </Button>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card className="historial-action-card historial-note-card">
              <h3>Nota</h3>

              <Alert
                type="info"
                showIcon
                message="El historial puede generarse automáticamente"
                description="Los registros de este módulo se guardan mediante la API de historia clínica y permanecen asociados al paciente."
              />
            </Card>
          </Col>
        </Row>

      </div>


      <Modal
        open={registroOpen}
        onCancel={cerrarRegistro}
        footer={null}
        width={1120}
        centered
        forceRender
        className="historial-wizard-modal"
        title={null}
      >
        <Form
          form={form}
          layout="vertical"
          className="historial-wizard-form"
          onValuesChange={(changedValues) => {
            if ('peso' in changedValues || 'altura' in changedValues) {
              actualizarIMC();
            }
          }}
        >
          <div className="historial-wizard-header">
            <div className="historial-wizard-icon">
              {registroStep === 0 && <FileTextOutlined />}
              {registroStep === 1 && <HistoryOutlined />}
              {registroStep === 2 && <MedicineBoxOutlined />}
            </div>

            <div>
              <Text className="historial-eyebrow">Crear historial clínico</Text>

              <h2>
                {registroStep === 0 && 'Historia clínica'}
                {registroStep === 1 && 'Antecedentes personales'}
                {registroStep === 2 && 'Gineco obstétricos'}
              </h2>

              <p>
                {registroStep === 0 &&
                  'Captura datos generales, signos vitales y antecedentes hereditarios familiares.'}
                {registroStep === 1 &&
                  'Registra antecedentes personales no patológicos y patológicos.'}
                {registroStep === 2 && 'Captura gineco obstétricos y revisa la vista previa.'}
              </p>
            </div>
          </div>

          <div className="historial-wizard-steps three">
            <div
              className={`historial-wizard-step ${
                registroStep === 0 ? 'active' : registroStep > 0 ? 'done' : ''
              }`}
            >
              <span>1</span>
              <div>
                <strong>Historia clínica</strong>
                <small>Datos iniciales</small>
              </div>
            </div>

            <div className={`historial-wizard-line ${registroStep > 0 ? 'active' : ''}`} />

            <div
              className={`historial-wizard-step ${
                registroStep === 1 ? 'active' : registroStep > 1 ? 'done' : ''
              }`}
            >
              <span>2</span>
              <div>
                <strong>Antecedentes</strong>
                <small>Personales</small>
              </div>
            </div>

            <div className={`historial-wizard-line ${registroStep > 1 ? 'active' : ''}`} />

            <div className={`historial-wizard-step ${registroStep === 2 ? 'active' : ''}`}>
              <span>3</span>
              <div>
                <strong>Gineco obstétricos</strong>
                <small>Revisión final</small>
              </div>
            </div>
          </div>

          {registroStep === 0 && consultaBasePrecarga && consultaBaseTieneDatosClinicos && (
            <div className="historial-prefill-note">
              <CheckCircleOutlined />
              <span>
                <strong>Datos recientes cargados</strong>
                <span className="historial-prefill-separator">·</span>
                Consulta externa del {formatDateTime(consultaBasePrecarga.fecha_consulta)}.
                Puedes actualizarlos si cambiaron.
              </span>
            </div>
          )}

          {registroStep === 0 && (
            <>
              <section className="historial-wizard-section">
                <div className="historial-clinical-card">
                  <div className="historial-clinical-title">
                    <h2>HISTORIA CLÍNICA</h2>

                    <span>
                      <strong>Fecha y hora de elaboración:</strong>{' '}
                      {new Date().toLocaleString('es-MX', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="historial-clinical-grid">
                    <div className="historial-paciente-box">
                      <span className="historial-box-label">PACIENTE</span>

                      <h3>{pacienteNombre || 'Paciente sin nombre'}</h3>

                      <p>
                        {pacienteActivo.fecha_nacimiento
                          ? new Date(pacienteActivo.fecha_nacimiento).toLocaleDateString('es-MX')
                          : '--/--/----'}{' '}
                        / {pacienteActivo.sexo || 'Sin sexo'}
                      </p>

                      <p>{getPacienteDato(pacienteActivo, 'municipio', 'Puebla')}</p>

                      <p>
                        <strong>No. Expediente:</strong>{' '}
                        {pacienteActivo.numero_expediente || 'Sin expediente'}
                      </p>

                      <p>
                        <strong>CURP:</strong> {pacienteActivo.curp || '-'}
                      </p>

                      <p>
                        <strong>Residencia:</strong>{' '}
                        {getPacienteDato(pacienteActivo, 'direccion', '-') ||
                          getPacienteDato(pacienteActivo, 'colonia', '-')}
                      </p>
                    </div>

                    <div className="historial-signos-box">
                      <span className="historial-box-label">SIGNOS VITALES</span>

                      <div className="historial-signos-grid">
                        <div>
                          <Form.Item name="peso" label="Peso">
                            <Input addonAfter="Kg" placeholder="Ej. 70" />
                          </Form.Item>

                          <Form.Item name="altura" label="Altura">
                            <Input addonAfter="m/cm" placeholder="Ej. 1.70 o 170" />
                          </Form.Item>

                          <Form.Item name="imc" label="IMC">
                            <Input addonAfter="Kg/m²" disabled />
                          </Form.Item>
                        </div>

                        <div>
                          <Form.Item name="temperatura" label="Temperatura">
                            <Input addonAfter="°C" placeholder="Ej. 36.5" />
                          </Form.Item>

                          <Form.Item name="frecuencia_cardiaca" label="Frec. Cardíaca">
                            <Input addonAfter="xmin" placeholder="Ej. 75" />
                          </Form.Item>

                          <Form.Item name="frecuencia_respiratoria" label="Frec. Respiratoria">
                            <Input addonAfter="xmin" placeholder="Ej. 18" />
                          </Form.Item>
                        </div>

                        <div>
                          <Form.Item name="presion_arterial" label="Presión arterial">
                            <Input addonAfter="mm/Hg" placeholder="Ej. 120/80" />
                          </Form.Item>

                          <Form.Item name="circunferencia_abdomen" label="C. Abdomen">
                            <Input addonAfter="cm" placeholder="Ej. 85" />
                          </Form.Item>

                          <Form.Item name="spo2" label="SpO₂">
                            <Input addonAfter="%" placeholder="Ej. 98" />
                          </Form.Item>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="historial-section-block">
                    <div className="historial-antecedentes-title">
                      ANTECEDENTES HEREDITARIOS FAMILIARES
                    </div>

                    <div className="historial-antecedentes-box">
                      <div className="historial-antecedentes-grid">
                        {antecedentesFamiliares.map(([name, label]) => {
                          const checkName = `${name}_check`;
                          const parentescoName = `${name}_parentesco`;

                          return (
                            <div className="historial-antecedente-row" key={name}>
                              {renderToggleRadio(checkName, [parentescoName])}

                              <span>{label}</span>

                              <Form.Item
                                noStyle
                                shouldUpdate={(prev, current) =>
                                  prev?.[checkName] !== current?.[checkName]
                                }
                              >
                                {() => (
                                  <Form.Item name={parentescoName} noStyle>
                                    <Select
                                      placeholder="Seleccione parentesco..."
                                      options={parentescoOptions}
                                      disabled={!Boolean(form.getFieldValue(checkName))}
                                    />
                                  </Form.Item>
                                )}
                              </Form.Item>
                            </div>
                          );
                        })}

                        <div className="historial-antecedente-row">
                          {renderToggleRadio('otros_check', ['otros_antecedentes'])}

                          <span>Otros</span>

                          <Form.Item
                            noStyle
                            shouldUpdate={(prev, current) =>
                              prev?.otros_check !== current?.otros_check
                            }
                          >
                            {() => (
                              <Form.Item name="otros_antecedentes" noStyle>
                                <Input
                                  disabled={!Boolean(form.getFieldValue('otros_check'))}
                                  placeholder="Especifica el antecedente"
                                />
                              </Form.Item>
                            )}
                          </Form.Item>
                        </div>

                        <div className="historial-antecedente-row">
                          <span />
                          <span>Tipos</span>

                          <Form.Item name="tipos_antecedentes" noStyle>
                            <Input />
                          </Form.Item>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <div className="historial-wizard-footer">
                <Button onClick={cerrarRegistro}>Cancelar</Button>

                <div>
                  <Button type="primary" onClick={() => irAPaso(1)}>
                    Siguiente
                  </Button>
                </div>
              </div>
            </>
          )}

          {registroStep === 1 && (
            <>
              <section className="historial-wizard-section">
                <div className="historial-clinical-card">
                  <div className="historial-section-block first">
                    <div className="historial-antecedentes-title">
                      ANTECEDENTES PERSONALES NO PATOLÓGICOS
                    </div>

                    <div className="historial-no-patologicos-box">
                      <Row gutter={[18, 16]}>
                        <Col xs={24} md={12}>
                          <Form.Item name="alimentacion" label="Alimentación">
                            <Input placeholder="Describe alimentación del paciente" />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={12}>
                          <div className="historial-inline-check-field">
                            {renderToggleRadio(
                              'inmunizaciones_incompletas_check',
                              ['inmunizaciones_incompletas'],
                            )}

                            <span>Inmunizaciones incompletas</span>

                            <Form.Item
                              noStyle
                              shouldUpdate={(prev, current) =>
                                prev?.inmunizaciones_incompletas_check !==
                                current?.inmunizaciones_incompletas_check
                              }
                            >
                              {() => (
                                <Form.Item name="inmunizaciones_incompletas" noStyle>
                                  <Input
                                    disabled={
                                      !Boolean(
                                        form.getFieldValue('inmunizaciones_incompletas_check'),
                                      )
                                    }
                                    placeholder="Detalle"
                                  />
                                </Form.Item>
                              )}
                            </Form.Item>
                          </div>
                        </Col>

                        <Col xs={24} md={12}>
                          <Form.Item name="higiene" label="Higiene">
                            <Input placeholder="Describe higiene del paciente" />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={12}>
                          <Form.Item name="grupo_sanguineo" label="Grupo sanguíneo">
                            <Select
                              allowClear
                              placeholder="Seleccione grupo"
                              options={grupoSanguineoOptions}
                            />
                          </Form.Item>
                        </Col>

                        <Col xs={24}>
                          <div className="historial-inline-check-field wide">
                            {renderToggleRadio(
                              'otros_no_patologicos_check',
                              ['otros_no_patologicos'],
                            )}

                            <span>Otros</span>

                            <Form.Item
                              noStyle
                              shouldUpdate={(prev, current) =>
                                prev?.otros_no_patologicos_check !==
                                current?.otros_no_patologicos_check
                              }
                            >
                              {() => (
                                <Form.Item name="otros_no_patologicos" noStyle>
                                  <Input
                                    disabled={
                                      !Boolean(form.getFieldValue('otros_no_patologicos_check'))
                                    }
                                    placeholder="Especifica otros antecedentes no patológicos"
                                  />
                                </Form.Item>
                              )}
                            </Form.Item>
                          </div>
                        </Col>
                      </Row>
                    </div>
                  </div>

                  <div className="historial-section-block">
                    <div className="historial-antecedentes-title">
                      ANTECEDENTES PERSONALES PATOLÓGICOS
                    </div>

                    <div className="historial-patologicos-card">
                      <Row gutter={[18, 16]}>
                        <Col xs={24} md={12}>
                          <Form.Item name="enfermedades_infancia" label="Enfermedades de infancia">
                            <Input placeholder="Ej. varicela, sarampión..." />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={12}>
                          <Form.Item name="alergias" label="Alérgicos">
                            <Input placeholder="Medicamentos, alimentos, etc." />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={12}>
                          <Form.Item name="cirugias" label="Quirúrgicos">
                            <Input placeholder="Antecedentes quirúrgicos" />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={12}>
                          <Form.Item name="transfusiones" label="Transfusiones">
                            <Input placeholder="Antecedentes de transfusiones" />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={12}>
                          <Form.Item name="fracturas" label="Fracturas">
                            <Input placeholder="Fracturas previas" />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={12}>
                          <Form.Item name="traumatismos" label="Traumatismos">
                            <Input placeholder="Traumatismos relevantes" />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={12}>
                          <Form.Item name="hospitalizaciones" label="Hospitalizaciones">
                            <Input placeholder="Hospitalizaciones previas" />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={12}>
                          <Form.Item name="medicamentos_actuales" label="Medicamentos actuales">
                            <Input placeholder="Medicamentos que consume" />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={12}>
                          <Form.Item name="dislipidemia_patologica" label="Dislipidemia">
                            <Input placeholder="Antecedentes de dislipidemia" />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={12}>
                          <Form.Item name="tuberculosis_pulmonar" label="Tuberculosis pulmonar">
                            <Input placeholder="Antecedentes de tuberculosis pulmonar" />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={8}>
                          <Form.Item name="tabaquismo" label="Tabaquismo">
                            <Select allowClear options={habitosOptions} placeholder="Seleccione" />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={8}>
                          <Form.Item name="alcoholismo" label="Alcoholismo">
                            <Select allowClear options={habitosOptions} placeholder="Seleccione" />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={8}>
                          <Form.Item name="toxicomanias" label="Toxicomanías">
                            <Select allowClear options={habitosOptions} placeholder="Seleccione" />
                          </Form.Item>
                        </Col>

                        <Col xs={24}>
                          <div className="historial-inline-check-field wide">
                            {renderToggleRadio(
                              'otros_patologicos_check',
                              ['otros_patologicos'],
                            )}

                            <span>Otros</span>

                            <Form.Item
                              noStyle
                              shouldUpdate={(prev, current) =>
                                prev?.otros_patologicos_check !== current?.otros_patologicos_check
                              }
                            >
                              {() => (
                                <Form.Item name="otros_patologicos" noStyle>
                                  <Input
                                    disabled={!Boolean(form.getFieldValue('otros_patologicos_check'))}
                                    placeholder="Especifique otros antecedentes patológicos"
                                  />
                                </Form.Item>
                              )}
                            </Form.Item>
                          </div>
                        </Col>
                      </Row>
                    </div>
                  </div>
                </div>
              </section>

              <div className="historial-wizard-footer">
                <Button onClick={cerrarRegistro}>Cancelar</Button>

                <div>
                  <Button icon={<ArrowLeftOutlined />} onClick={() => irAPaso(0)}>
                    Anterior
                  </Button>

                  <Button type="primary" onClick={() => irAPaso(2)}>
                    Siguiente
                  </Button>
                </div>
              </div>
            </>
          )}

          {registroStep === 2 && (
            <>
              <section className="historial-wizard-section">
                <div className="historial-clinical-card">
                  <div className="historial-section-block first">
                    <div className="historial-antecedentes-title">
                      ANTECEDENTES GINECO OBSTÉTRICOS
                    </div>

                    <div className="historial-gineco-box">
                      <Row gutter={[18, 16]}>
                        <Col xs={24} md={6}>
                          <Form.Item name="ivsa" label="IVSA">
                            <Input addonAfter="años" />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={6}>
                          <Form.Item name="numero_parejas" label="No. de parejas">
                            <Input />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={6}>
                          <Form.Item name="metodo_anticonceptivo" label="Método anticonceptivo">
                            <Input />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={6}>
                          <Form.Item name="gestas" label="Gestas">
                            <Input />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={6}>
                          <Form.Item name="partos" label="Partos">
                            <Input />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={6}>
                          <Form.Item name="abortos" label="Abortos">
                            <Input />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={6}>
                          <Form.Item name="cesareas" label="Cesáreas">
                            <Input />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={6}>
                          <Form.Item
                            name="fum"
                            label="FUM"
                            getValueProps={(value) => ({ value: parseClinicalDate(value) })}
                            normalize={(value: Dayjs | null) =>
                              value ? value.format('YYYY-MM-DD') : ''
                            }
                          >
                            <ConfigProvider locale={esES} theme={clinicalDatePickerTheme}>
                              <DatePicker
                                className="historia-clinica-datepicker"
                                popupClassName="historia-clinica-calendar-popup"
                                format="DD/MM/YYYY"
                                placeholder="Seleccionar fecha"
                                allowClear
                                inputReadOnly
                                disabledDate={disableFutureClinicalDates}
                                style={{ width: '100%' }}
                              />
                            </ConfigProvider>
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={6}>
                          <Form.Item name="menarca" label="Menarca">
                            <Input />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={12}>
                          <Form.Item name="ritmo" label="Ritmo">
                            <Input />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={6}>
                          <Form.Item
                            name="ultimo_papanicolaou"
                            label="F. Último Papanicolaou"
                            getValueProps={(value) => ({ value: parseClinicalDate(value) })}
                            normalize={(value: Dayjs | null) =>
                              value ? value.format('YYYY-MM-DD') : ''
                            }
                          >
                            <ConfigProvider locale={esES} theme={clinicalDatePickerTheme}>
                              <DatePicker
                                className="historia-clinica-datepicker"
                                popupClassName="historia-clinica-calendar-popup"
                                format="DD/MM/YYYY"
                                placeholder="Seleccionar fecha"
                                allowClear
                                inputReadOnly
                                disabledDate={disableFutureClinicalDates}
                                style={{ width: '100%' }}
                              />
                            </ConfigProvider>
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={6}>
                          <Form.Item name="terapia_hormonal" label="Terapia hormonal">
                            <Select options={noAplicaOptions} />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={6}>
                          <Form.Item name="peri_post_menopausia" label="Estado de menopausia">
                            <Select options={menopausiaOptions} />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={6}>
                          <Form.Item
                            name="infeccion_transmision_sexual"
                            label="I. Transmisión sexual"
                          >
                            <Select options={noAplicaOptions} />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={6}>
                          <Form.Item
                            name="patologia_mamaria_benigna"
                            label="P. Mamaria benigna"
                          >
                            <Select options={noAplicaOptions} />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={6}>
                          <Form.Item name="colposcopia" label="Colposcopia">
                            <Select options={noAplicaOptions} />
                          </Form.Item>
                        </Col>
                      </Row>
                    </div>
                  </div>
                </div>
              </section>

              <div className="historial-wizard-footer">
                <Button onClick={cerrarRegistro}>Cancelar</Button>

                <div>
                  <Button icon={<ArrowLeftOutlined />} onClick={() => irAPaso(1)}>
                    Anterior
                  </Button>

                  <Button icon={<EyeOutlined />} onClick={abrirVistaPrevia}>
                    Vista previa
                  </Button>

                  <Button type="primary" icon={<SaveOutlined />} onClick={guardarNuevoHistorial}>
                    Guardar historial
                  </Button>
                </div>
              </div>
            </>
          )}
        </Form>
      </Modal>

      <Modal
        open={vistaPreviaOpen}
        onCancel={() => setVistaPreviaOpen(false)}
        footer={[
          <Button key="cerrar" onClick={() => setVistaPreviaOpen(false)}>
            Cerrar
          </Button>,
          <Button
            key="guardar"
            type="primary"
            icon={<SaveOutlined />}
            onClick={guardarNuevoHistorial}
          >
            Guardar historial
          </Button>,
        ]}
        width={980}
        centered
        className="historial-preview-modal"
        title={
          <div className="historial-modal-title">
            <EyeOutlined />
            <span>Vista previa del historial clínico</span>
          </div>
        }
      >
        {vistaPreviaData && (
          <div className="historial-preview">
            <div className="historial-preview-section">
              <h3>Paciente</h3>

              <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
                <Descriptions.Item label="Nombre">{pacienteNombre || '-'}</Descriptions.Item>
                <Descriptions.Item label="Expediente">
                  {pacienteActivo.numero_expediente || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Sexo">{pacienteActivo.sexo || '-'}</Descriptions.Item>
                <Descriptions.Item label="Edad">
                  {calcularEdad(pacienteActivo.fecha_nacimiento)}
                </Descriptions.Item>
              </Descriptions>
            </div>

            <div className="historial-preview-section">
              <h3>Signos vitales</h3>

              <Descriptions bordered size="small" column={{ xs: 1, md: 3 }}>
                <Descriptions.Item label="Peso">{vistaPreviaData.peso || '-'}</Descriptions.Item>
                <Descriptions.Item label="Talla">{vistaPreviaData.altura || '-'}</Descriptions.Item>
                <Descriptions.Item label="IMC">{vistaPreviaData.imc || '-'}</Descriptions.Item>
                <Descriptions.Item label="Temperatura">
                  {vistaPreviaData.temperatura || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Presión arterial">
                  {vistaPreviaData.presion_arterial || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="SpO₂">{vistaPreviaData.spo2 || '-'}</Descriptions.Item>
              </Descriptions>
            </div>

            <div className="historial-preview-section">
              <h3>Antecedentes personales</h3>

              <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
                <Descriptions.Item label="Alimentación">
                  {vistaPreviaData.alimentacion || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Higiene">
                  {vistaPreviaData.higiene || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Grupo sanguíneo">
                  {vistaPreviaData.grupo_sanguineo || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Alergias">
                  {vistaPreviaData.alergias || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Tabaquismo">
                  {vistaPreviaData.tabaquismo || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Alcoholismo">
                  {vistaPreviaData.alcoholismo || '-'}
                </Descriptions.Item>
              </Descriptions>
            </div>

            <div className="historial-preview-section">
              <h3>Gineco obstétricos</h3>

              <Descriptions bordered size="small" column={{ xs: 1, md: 3 }}>
                <Descriptions.Item label="IVSA">{vistaPreviaData.ivsa || '-'}</Descriptions.Item>
                <Descriptions.Item label="No. parejas">
                  {vistaPreviaData.numero_parejas || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Método anticonceptivo">
                  {vistaPreviaData.metodo_anticonceptivo || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Gestas">
                  {vistaPreviaData.gestas || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Partos">
                  {vistaPreviaData.partos || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Abortos">
                  {vistaPreviaData.abortos || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Cesáreas">
                  {vistaPreviaData.cesareas || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="FUM">{formatClinicalDate(vistaPreviaData.fum)}</Descriptions.Item>
                <Descriptions.Item label="Menarca">
                  {vistaPreviaData.menarca || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Ritmo">
                  {vistaPreviaData.ritmo || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Último Papanicolaou">
                  {formatClinicalDate(vistaPreviaData.ultimo_papanicolaou)}
                </Descriptions.Item>
                <Descriptions.Item label="Terapia hormonal">
                  {vistaPreviaData.terapia_hormonal || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="PeriPost menopausia">
                  {vistaPreviaData.peri_post_menopausia || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="I. Transmisión sexual">
                  {vistaPreviaData.infeccion_transmision_sexual || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="P. Mamaria benigna">
                  {vistaPreviaData.patologia_mamaria_benigna || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Colposcopia">
                  {vistaPreviaData.colposcopia || '-'}
                </Descriptions.Item>
              </Descriptions>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default HistorialClinico;