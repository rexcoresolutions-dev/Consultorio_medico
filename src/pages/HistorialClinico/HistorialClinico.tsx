// src/pages/HistorialClinico/HistorialClinico.tsx

import React, { useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Form,
  Input,
  Modal,
  Radio,
  Row,
  Select,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  EyeOutlined,
  FileTextOutlined,
  HistoryOutlined,
  IdcardOutlined,
  LogoutOutlined,
  MedicineBoxOutlined,
  PlusOutlined,
  SaveOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

import type { PacienteData } from '../../services/pacientes/pacientes.service';
import './HistorialClinico.css';

const { Title, Text } = Typography;

const PACIENTE_ATENCION_STORAGE_KEY = 'paciente_atencion_actual';
const CONSULTA_EXTERNA_ABIERTA_STORAGE_KEY = 'consulta_externa_abierta';
const HISTORIAL_CLINICO_STORAGE_KEY = 'historial_clinico_pacientes';

type DiagnosticoHistorial = {
  key?: string;
  no?: number;
  clave?: string;
  diagnostico?: string;
  descripcion?: string;
  primeraVez?: boolean;
  subsecuente?: boolean;
};

type HistorialClinicoItem = {
  id: string;
  pacienteId?: number | string;
  paciente: {
    id?: number | string;
    nombre: string;
    numero_expediente?: string;
    curp?: string;
    sexo?: string;
    fecha_nacimiento?: string;
  };
  consulta: any;
  diagnosticos: DiagnosticoHistorial[];
  fecha_consulta: string;
};

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

const cargarHistoriales = (): HistorialClinicoItem[] => {
  try {
    const data = localStorage.getItem(HISTORIAL_CLINICO_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const guardarHistoriales = (historiales: HistorialClinicoItem[]) => {
  try {
    localStorage.setItem(HISTORIAL_CLINICO_STORAGE_KEY, JSON.stringify(historiales));
  } catch {
    message.error('No fue posible guardar el historial clínico.');
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
  const [historiales, setHistoriales] = useState<HistorialClinicoItem[]>(() =>
    cargarHistoriales(),
  );
  const [busqueda, setBusqueda] = useState('');
  const [historialSeleccionado, setHistorialSeleccionado] =
    useState<HistorialClinicoItem | null>(null);

  const [registroOpen, setRegistroOpen] = useState(false);
  const [registroStep, setRegistroStep] = useState(0);
  const [vistaPreviaOpen, setVistaPreviaOpen] = useState(false);
  const [vistaPreviaData, setVistaPreviaData] = useState<HistorialFormValues | null>(null);

  const pacienteNombre = getFullName(pacienteActivo);

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
      .filter((item) => {
        const texto = busqueda.trim().toLowerCase();

        if (!texto) return true;

        const diagnosticosTexto = item.diagnosticos
          .map((d) => `${d.clave || ''} ${d.diagnostico || ''} ${d.descripcion || ''}`)
          .join(' ')
          .toLowerCase();

        return (
          diagnosticosTexto.includes(texto) ||
          String(item.paciente.numero_expediente || '').toLowerCase().includes(texto) ||
          formatDateTime(item.fecha_consulta).toLowerCase().includes(texto)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.fecha_consulta).getTime() - new Date(a.fecha_consulta).getTime(),
      );
  }, [historiales, pacienteActivo, busqueda]);

  const ultimoHistorial = historialesPaciente[0];

  const actualizarIMC = () => {
    const peso = form.getFieldValue('peso');
    const altura = form.getFieldValue('altura');
    const imc = calcularIMC(peso, altura);

    form.setFieldValue('imc', imc);
  };

  const renderToggleRadio = (name: string) => (
    <Form.Item noStyle shouldUpdate>
      {() => (
        <Radio
          checked={Boolean(form.getFieldValue(name))}
          onClick={() => form.setFieldValue(name, !form.getFieldValue(name))}
        />
      )}
    </Form.Item>
  );

  const abrirRegistroHistorial = () => {
    const consultaBase = ultimoHistorial?.consulta || {};

    form.setFieldsValue({
      peso: consultaBase.peso || '',
      altura: consultaBase.altura || '',
      imc: consultaBase.imc || '',
      temperatura: consultaBase.temperatura || '',
      presion_arterial: consultaBase.presion_arterial || '',
      frecuencia_cardiaca: consultaBase.frecuencia_cardiaca || '',
      frecuencia_respiratoria: consultaBase.frecuencia_respiratoria || '',
      spo2: consultaBase.spo2 || '',
      circunferencia_abdomen: consultaBase.circunferencia_abdomen || '',

      diabetes_check: consultaBase.diabetes_check || false,
      diabetes_parentesco: consultaBase.diabetes_parentesco || undefined,
      cardiovascular_check: consultaBase.cardiovascular_check || false,
      cardiovascular_parentesco: consultaBase.cardiovascular_parentesco || undefined,
      epilepsias_check: consultaBase.epilepsias_check || false,
      epilepsias_parentesco: consultaBase.epilepsias_parentesco || undefined,
      neoplasicos_check: consultaBase.neoplasicos_check || false,
      neoplasicos_parentesco: consultaBase.neoplasicos_parentesco || undefined,
      lueticos_check: consultaBase.lueticos_check || false,
      lueticos_parentesco: consultaBase.lueticos_parentesco || undefined,
      hipertension_check: consultaBase.hipertension_check || false,
      hipertension_parentesco: consultaBase.hipertension_parentesco || undefined,
      fimicos_check: consultaBase.fimicos_check || false,
      fimicos_parentesco: consultaBase.fimicos_parentesco || undefined,
      dislipidemia_check: consultaBase.dislipidemia_check || false,
      dislipidemia_parentesco: consultaBase.dislipidemia_parentesco || undefined,
      otros_check: consultaBase.otros_check || false,
      otros_antecedentes: consultaBase.otros_antecedentes || '',
      tipos_antecedentes: consultaBase.tipos_antecedentes || '',

      alimentacion: consultaBase.alimentacion || '',
      higiene: consultaBase.higiene || '',
      inmunizaciones_incompletas_check:
        consultaBase.inmunizaciones_incompletas_check || false,
      inmunizaciones_incompletas: consultaBase.inmunizaciones_incompletas || '',
      grupo_sanguineo: consultaBase.grupo_sanguineo || undefined,
      otros_no_patologicos_check: consultaBase.otros_no_patologicos_check || false,
      otros_no_patologicos: consultaBase.otros_no_patologicos || '',

      enfermedades_infancia: consultaBase.enfermedades_infancia || '',
      alergias: consultaBase.alergias || '',
      cirugias: consultaBase.cirugias || '',
      transfusiones: consultaBase.transfusiones || '',
      fracturas: consultaBase.fracturas || '',
      traumatismos: consultaBase.traumatismos || '',
      hospitalizaciones: consultaBase.hospitalizaciones || '',
      medicamentos_actuales: consultaBase.medicamentos_actuales || '',
      tabaquismo: consultaBase.tabaquismo || '',
      alcoholismo: consultaBase.alcoholismo || '',
      toxicomanias: consultaBase.toxicomanias || '',
      dislipidemia_patologica: consultaBase.dislipidemia_patologica || '',
      tuberculosis_pulmonar: consultaBase.tuberculosis_pulmonar || '',
      otros_patologicos_check: consultaBase.otros_patologicos_check || false,
      otros_patologicos: consultaBase.otros_patologicos || '',

      ivsa: consultaBase.ivsa || '',
      numero_parejas: consultaBase.numero_parejas || '',
      metodo_anticonceptivo: consultaBase.metodo_anticonceptivo || '',
      gestas: consultaBase.gestas || '',
      partos: consultaBase.partos || '',
      abortos: consultaBase.abortos || '',
      cesareas: consultaBase.cesareas || '',
      fum: consultaBase.fum || '',
      menarca: consultaBase.menarca || '',
      ritmo: consultaBase.ritmo || '',
      ultimo_papanicolaou: consultaBase.ultimo_papanicolaou || '',
      terapia_hormonal: consultaBase.terapia_hormonal || 'NO APLICA',
      peri_post_menopausia: consultaBase.peri_post_menopausia || 'NO APLICA',
      infeccion_transmision_sexual:
        consultaBase.infeccion_transmision_sexual || 'NO APLICA',
      patologia_mamaria_benigna:
        consultaBase.patologia_mamaria_benigna || 'NO APLICA',
      colposcopia: consultaBase.colposcopia || 'NO APLICA',

      motivo_consulta: consultaBase.motivo_consulta || '',
      diagnostico: ultimoHistorial?.diagnosticos?.[0]?.diagnostico || '',
      descripcion_diagnostico: ultimoHistorial?.diagnosticos?.[0]?.descripcion || '',
      referir_paciente: consultaBase.referir_paciente || 'NO',
      referido_por: consultaBase.referido_por || '',
      contrarreferencia: consultaBase.contrarreferencia || 'NO',
      detalle_contrarreferencia: consultaBase.detalle_contrarreferencia || '',
    });

    setRegistroStep(0);
    setRegistroOpen(true);
  };

  const cerrarRegistro = () => {
    setRegistroOpen(false);
    setRegistroStep(0);
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

    try {
      actualizarIMC();

      const values = await form.validateFields();
      const imcCalculado = calcularIMC(values.peso, values.altura);

      const diagnosticoNuevo: DiagnosticoHistorial = {
        key: `manual-${Date.now()}`,
        no: 1,
        clave: values.motivo_consulta || 'S/C',
        diagnostico: values.diagnostico || 'Historial clínico',
        descripcion: values.descripcion_diagnostico || '',
        primeraVez: false,
        subsecuente: true,
      };

      const nuevoHistorial: HistorialClinicoItem = {
        id: `${pacienteActivo.id || pacienteActivo.numero_expediente || 'paciente'}-${Date.now()}`,
        pacienteId: pacienteActivo.id,
        paciente: {
          id: pacienteActivo.id,
          nombre: pacienteNombre || 'Paciente sin nombre',
          numero_expediente: pacienteActivo.numero_expediente,
          curp: pacienteActivo.curp,
          sexo: pacienteActivo.sexo,
          fecha_nacimiento: pacienteActivo.fecha_nacimiento,
        },
        consulta: {
          ...values,
          imc: values.imc || imcCalculado || undefined,
          fecha_consulta: new Date().toISOString(),
          origen_historial: 'manual',
        },
        diagnosticos: [diagnosticoNuevo],
        fecha_consulta: new Date().toISOString(),
      };

      const nuevosHistoriales = [nuevoHistorial, ...historiales];

      setHistoriales(nuevosHistoriales);
      guardarHistoriales(nuevosHistoriales);

      message.success('Historial clínico creado correctamente.');
      setVistaPreviaOpen(false);
      cerrarRegistro();
    } catch {
      message.warning('Completa la información necesaria del historial.');
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
      confirmButtonColor: '#0f766e',
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
    navigate('/pacientes', { replace: true });
  };

  const columns: ColumnsType<HistorialClinicoItem> = [
    {
      title: 'Fecha',
      dataIndex: 'fecha_consulta',
      width: 190,
      render: (fecha) => (
        <div className="historial-date-cell">
          <CalendarOutlined />
          <span>{formatDateTime(fecha)}</span>
        </div>
      ),
    },
    {
      title: 'Diagnósticos',
      key: 'diagnosticos',
      render: (_, record) => (
        <div className="historial-diagnostico-cell">
          {record.diagnosticos.length ? (
            <>
              <strong>
                {record.diagnosticos[0]?.clave
                  ? `${record.diagnosticos[0].clave} - `
                  : ''}
                {record.diagnosticos[0]?.diagnostico || 'Diagnóstico sin descripción'}
              </strong>

              <span>{record.diagnosticos.length} diagnóstico(s)</span>
            </>
          ) : (
            <Text type="secondary">Sin diagnósticos registrados</Text>
          )}
        </div>
      ),
    },
    {
      title: 'Signos vitales',
      key: 'signos',
      width: 280,
      render: (_, record) => (
        <div className="historial-tags">
          <Tag>Peso: {record.consulta?.peso || '-'}</Tag>
          <Tag>Temp: {record.consulta?.temperatura || '-'}</Tag>
          <Tag>SpO₂: {record.consulta?.spo2 || '-'}</Tag>
        </div>
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: 130,
      align: 'center',
      render: (_, record) => (
        <Button
          icon={<EyeOutlined />}
          className="historial-view-btn"
          onClick={() => setHistorialSeleccionado(record)}
        >
          Ver
        </Button>
      ),
    },
  ];

  if (!pacienteActivo) {
    return (
      <div className="historial-page">
        <div className="historial-shell">
          <Card className="historial-empty-card">
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No hay paciente activo" />

            <p>
              Primero selecciona un paciente desde el módulo de Pacientes para desbloquear su
              historial clínico.
            </p>

            <Button type="primary" icon={<UserOutlined />} onClick={() => navigate('/pacientes')}>
              Ir a pacientes
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="historial-page">
      <div className="historial-shell">
        <header className="historial-hero-card">
          <div className="historial-hero-left">
            <Button
              icon={<ArrowLeftOutlined />}
              className="historial-back-btn"
              onClick={() => navigate('/confirmar-atencion')}
            >
              Regresar
            </Button>

            <div className="historial-icon">
              <HistoryOutlined />
            </div>
          </div>

          <div className="historial-hero-content">
            <Text className="historial-eyebrow">Expediente electrónico</Text>

            <Title level={2}>Historial clínico</Title>

            <Text type="secondary">
              Consulta, crea y administra los registros clínicos del paciente activo.
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
              <span>Historiales</span>
              <strong>{historialesPaciente.length}</strong>
            </div>

            <div>
              <span>Última consulta</span>
              <strong>
                {ultimoHistorial ? formatDateTime(ultimoHistorial.fecha_consulta) : '-'}
              </strong>
            </div>
          </div>
        </section>

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
                Revisa todas las consultas externas guardadas para el paciente seleccionado.
              </p>

              <Button
                type="primary"
                icon={<SearchOutlined />}
                disabled={historialesPaciente.length === 0}
              >
                {historialesPaciente.length ? 'Historial disponible' : 'Sin historiales'}
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
                description="Cada consulta guardada se agrega al historial, pero también puedes crear un registro clínico manual."
              />
            </Card>
          </Col>
        </Row>

        <Card className="historial-table-card">
          <div className="historial-table-head">
            <div>
              <h3>Historiales registrados</h3>
              <span>{historialesPaciente.length} registro(s)</span>
            </div>

            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Buscar por diagnóstico, expediente o fecha..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="historial-search"
            />
          </div>

          <Table
            className="historial-table"
            columns={columns}
            dataSource={historialesPaciente}
            rowKey="id"
            pagination={{
              pageSize: 5,
              showSizeChanger: false,
              position: ['bottomCenter'],
              showTotal: (total, range) => `${range[0]}-${range[1]} de ${total}`,
            }}
            scroll={{ x: 900 }}
            locale={{
              emptyText: (
                <Empty description="Aún no hay historiales clínicos para este paciente" />
              ),
            }}
          />
        </Card>
      </div>

      <Modal
        open={Boolean(historialSeleccionado)}
        onCancel={() => setHistorialSeleccionado(null)}
        footer={[
          <Button key="cerrar" onClick={() => setHistorialSeleccionado(null)}>
            Cerrar
          </Button>,
        ]}
        width={920}
        centered
        className="historial-detail-modal"
        title={
          <div className="historial-modal-title">
            <FileTextOutlined />
            <span>Detalle del historial clínico</span>
          </div>
        }
      >
        {historialSeleccionado && (
          <div className="historial-detail">
            <Descriptions bordered column={{ xs: 1, md: 2 }} size="small">
              <Descriptions.Item label="Paciente">
                {historialSeleccionado.paciente.nombre}
              </Descriptions.Item>

              <Descriptions.Item label="Expediente">
                {historialSeleccionado.paciente.numero_expediente || '-'}
              </Descriptions.Item>

              <Descriptions.Item label="Fecha consulta">
                {formatDateTime(historialSeleccionado.fecha_consulta)}
              </Descriptions.Item>

              <Descriptions.Item label="CURP">
                {historialSeleccionado.paciente.curp || '-'}
              </Descriptions.Item>
            </Descriptions>

            <div className="historial-detail-title">Signos vitales</div>

            <Descriptions bordered column={{ xs: 1, md: 3 }} size="small">
              <Descriptions.Item label="Peso">
                {historialSeleccionado.consulta?.peso || '-'}
              </Descriptions.Item>

              <Descriptions.Item label="Altura">
                {historialSeleccionado.consulta?.altura || '-'}
              </Descriptions.Item>

              <Descriptions.Item label="IMC">
                {historialSeleccionado.consulta?.imc || '-'}
              </Descriptions.Item>

              <Descriptions.Item label="Temperatura">
                {historialSeleccionado.consulta?.temperatura || '-'}
              </Descriptions.Item>

              <Descriptions.Item label="T.A.">
                {historialSeleccionado.consulta?.presion_arterial || '-'}
              </Descriptions.Item>

              <Descriptions.Item label="SpO₂">
                {historialSeleccionado.consulta?.spo2 || '-'}
              </Descriptions.Item>
            </Descriptions>

            <div className="historial-detail-title">Diagnósticos</div>

            {historialSeleccionado.diagnosticos.length ? (
              <div className="historial-diagnosticos-list">
                {historialSeleccionado.diagnosticos.map((diag, index) => (
                  <div key={diag.key || index} className="historial-diagnostico-item">
                    <Tag>{diag.clave || 'S/C'}</Tag>

                    <div>
                      <strong>{diag.diagnostico || 'Sin diagnóstico'}</strong>
                      <span>{diag.descripcion || 'Sin descripción'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty description="Sin diagnósticos registrados" />
            )}

            <div className="historial-detail-title">Referencia</div>

            <Descriptions bordered column={{ xs: 1, md: 2 }} size="small">
              <Descriptions.Item label="Referir paciente">
                {historialSeleccionado.consulta?.referir_paciente || '-'}
              </Descriptions.Item>

              <Descriptions.Item label="Referido por">
                {historialSeleccionado.consulta?.referido_por || '-'}
              </Descriptions.Item>

              <Descriptions.Item label="Contrarreferencia">
                {historialSeleccionado.consulta?.contrarreferencia || '-'}
              </Descriptions.Item>

              <Descriptions.Item label="Detalle">
                {historialSeleccionado.consulta?.detalle_contrarreferencia || '-'}
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>

      <Modal
        open={registroOpen}
        onCancel={cerrarRegistro}
        footer={null}
        width={1180}
        centered
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
                {registroStep === 2 && 'Gineco obstétricos y diagnóstico'}
              </h2>

              <p>
                {registroStep === 0 &&
                  'Captura datos generales, signos vitales y antecedentes hereditarios familiares.'}
                {registroStep === 1 &&
                  'Registra antecedentes personales no patológicos y patológicos.'}
                {registroStep === 2 &&
                  'Completa los antecedentes gineco obstétricos, diagnóstico y revisa la vista previa.'}
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
                <strong>Gineco / diagnóstico</strong>
                <small>Vista previa</small>
              </div>
            </div>
          </div>

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

                          <Form.Item name="altura" label="Talla">
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
                        {antecedentesFamiliares.map(([name, label]) => (
                          <div className="historial-antecedente-row" key={name}>
                            {renderToggleRadio(`${name}_check`)}

                            <span>{label}</span>

                            <Form.Item name={`${name}_parentesco`} noStyle>
                              <Select
                                placeholder="Seleccione parentesco..."
                                options={parentescoOptions}
                              />
                            </Form.Item>
                          </div>
                        ))}

                        <div className="historial-antecedente-row">
                          {renderToggleRadio('otros_check')}

                          <span>Otros</span>

                          <Form.Item name="otros_antecedentes" noStyle>
                            <Input />
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
                            {renderToggleRadio('inmunizaciones_incompletas_check')}

                            <span>Inmunizaciones incompletas</span>

                            <Form.Item name="inmunizaciones_incompletas" noStyle>
                              <Input placeholder="Detalle" />
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
                            {renderToggleRadio('otros_no_patologicos_check')}

                            <span>Otros</span>

                            <Form.Item name="otros_no_patologicos" noStyle>
                              <Input placeholder="Especifica otros antecedentes no patológicos" />
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
                            <Select allowClear options={siNoOptions} placeholder="Seleccione" />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={8}>
                          <Form.Item name="alcoholismo" label="Alcoholismo">
                            <Select allowClear options={siNoOptions} placeholder="Seleccione" />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={8}>
                          <Form.Item name="toxicomanias" label="Toxicomanías">
                            <Select allowClear options={siNoOptions} placeholder="Seleccione" />
                          </Form.Item>
                        </Col>

                        <Col xs={24}>
                          <div className="historial-inline-check-field wide">
                            {renderToggleRadio('otros_patologicos_check')}

                            <span>Otros</span>

                            <Form.Item name="otros_patologicos" noStyle>
                              <Input placeholder="Especifique otros antecedentes patológicos" />
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
                          <Form.Item name="fum" label="FUM">
                            <Input placeholder="dd/mm/aaaa" />
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
                          <Form.Item name="ultimo_papanicolaou" label="F. Último Papanicolaou">
                            <Input placeholder="dd/mm/aaaa" />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={6}>
                          <Form.Item name="terapia_hormonal" label="Terapia hormonal">
                            <Select options={noAplicaOptions} />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={6}>
                          <Form.Item name="peri_post_menopausia" label="PeriPost menopausia">
                            <Select options={noAplicaOptions} />
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

                  <div className="historial-section-block">
                    <div className="historial-antecedentes-title">
                      DIAGNÓSTICO Y REFERENCIA
                    </div>

                    <div className="historial-no-patologicos-box">
                      <Row gutter={[16, 8]}>
                        <Col xs={24} md={8}>
                          <Form.Item name="motivo_consulta" label="Clave / motivo">
                            <Input placeholder="Ej. J00X" />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={16}>
                          <Form.Item
                            name="diagnostico"
                            label="Diagnóstico"
                            rules={[{ required: true, message: 'Ingresa el diagnóstico' }]}
                          >
                            <Input placeholder="Diagnóstico principal" />
                          </Form.Item>
                        </Col>

                        <Col xs={24}>
                          <Form.Item name="descripcion_diagnostico" label="Descripción">
                            <Input.TextArea
                              rows={4}
                              placeholder="Descripción clínica del historial"
                            />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={8}>
                          <Form.Item name="referir_paciente" label="Referir paciente">
                            <Select options={siNoOptions} />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={16}>
                          <Form.Item name="referido_por" label="Referido por">
                            <Input placeholder="Área o médico de referencia" />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={8}>
                          <Form.Item name="contrarreferencia" label="Contrarreferencia">
                            <Select options={siNoOptions} />
                          </Form.Item>
                        </Col>

                        <Col xs={24} md={16}>
                          <Form.Item name="detalle_contrarreferencia" label="Detalle">
                            <Input placeholder="Detalle de contrarreferencia" />
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
                <Descriptions.Item label="FUM">{vistaPreviaData.fum || '-'}</Descriptions.Item>
                <Descriptions.Item label="Menarca">
                  {vistaPreviaData.menarca || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Ritmo">
                  {vistaPreviaData.ritmo || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Último Papanicolaou">
                  {vistaPreviaData.ultimo_papanicolaou || '-'}
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

            <div className="historial-preview-section">
              <h3>Diagnóstico</h3>

              <Descriptions bordered size="small" column={{ xs: 1, md: 2 }}>
                <Descriptions.Item label="Clave / motivo">
                  {vistaPreviaData.motivo_consulta || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Diagnóstico">
                  {vistaPreviaData.diagnostico || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Descripción" span={2}>
                  {vistaPreviaData.descripcion_diagnostico || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Referir paciente">
                  {vistaPreviaData.referir_paciente || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Referido por">
                  {vistaPreviaData.referido_por || '-'}
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