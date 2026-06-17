import React, { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  Checkbox,
  Col,
  Descriptions,
  Divider,
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
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  EyeOutlined,
  FileTextOutlined,
  UserOutlined,
  HeartOutlined,
  ExperimentOutlined,
  MedicineBoxOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  HistoryOutlined,
  WomanOutlined,
  PlusOutlined,
  DeleteOutlined,
  ShareAltOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import Swal from 'sweetalert2';

import type { PacienteData } from '../../services/pacientes/pacientes.service';
import Receta from './Receta';
import './ConsultaExterna.css';

const { Title, Text } = Typography;

const PACIENTE_ATENCION_STORAGE_KEY = 'paciente_atencion_actual';

type ConsultaExternaProps = {
  paciente: PacienteData;
  onBack: () => void;
  onPacienteLiberado?: () => void;
};

export type DiagnosticoItem = {
  key: string;
  no: number;
  clave: string;
  diagnostico: string;
  primeraVez: boolean;
  subsecuente: boolean;
  descripcion: string;
};

type ConsultaStorageState = {
  currentStep: number;
  sinPeso: boolean;
  sinAltura: boolean;
  sinTemperatura: boolean;
  diagnosticos: DiagnosticoItem[];
  mostrarReceta: boolean;
  consultaGuardada: any;
  progress: {
    validacion: boolean;
    signos: boolean;
    antecedentes: boolean;
    diagnostico: boolean;
    guardado: boolean;
  };
  formValues: any;
};

const getConsultaStorageKey = (paciente?: PacienteData) => {
  const pacienteKey =
    paciente?.id ||
    paciente?.numero_expediente ||
    paciente?.curp ||
    `${paciente?.nombre || 'paciente'}-${paciente?.primer_apellido || ''}`;

  return `consulta_externa_estado_${pacienteKey}`;
};

const cargarEstadoConsulta = (key: string): Partial<ConsultaStorageState> | null => {
  if (typeof window === 'undefined') return null;

  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

const guardarEstadoConsulta = (key: string, data: Partial<ConsultaStorageState>) => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Evita romper la pantalla si el navegador bloquea storage.
  }
};

const limpiarPacienteActivo = () => {
  try {
    localStorage.removeItem(PACIENTE_ATENCION_STORAGE_KEY);
  } catch {
    // Evita romper la pantalla si el navegador bloquea storage.
  }
};

const ConsultaExterna: React.FC<ConsultaExternaProps> = ({paciente, onBack, onPacienteLiberado, }) => {
  const [form] = Form.useForm();

  const storageKey = useMemo(() => getConsultaStorageKey(paciente), [paciente]);
  const estadoInicial = useMemo(() => cargarEstadoConsulta(storageKey), [storageKey]);

  const [currentStep, setCurrentStep] = useState(estadoInicial?.currentStep ?? 0);
  const [sinPeso, setSinPeso] = useState(estadoInicial?.sinPeso ?? false);
  const [sinAltura, setSinAltura] = useState(estadoInicial?.sinAltura ?? false);
  const [sinTemperatura, setSinTemperatura] = useState(estadoInicial?.sinTemperatura ?? false);
  const [diagnosticos, setDiagnosticos] = useState<DiagnosticoItem[]>(
    estadoInicial?.diagnosticos ?? [],
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewValues, setPreviewValues] = useState<any>({});

  const [mostrarReceta, setMostrarReceta] = useState(estadoInicial?.mostrarReceta ?? false);
  const [consultaGuardada, setConsultaGuardada] = useState<any>(
    estadoInicial?.consultaGuardada ?? null,
  );

  const [progress, setProgress] = useState(
    estadoInicial?.progress ?? {
      validacion: false,
      signos: false,
      antecedentes: false,
      diagnostico: false,
      guardado: false,
    },
  );

  const imcActual = Form.useWatch('imc', form);
  const alturaActual = Form.useWatch('altura', form);
  const referirPaciente = Form.useWatch('referir_paciente', form);

  const nombreCompleto = useMemo(() => {
    return `${paciente.nombre || ''} ${paciente.primer_apellido || ''} ${
      paciente.segundo_apellido || ''
    }`
      .replace(/\s+/g, ' ')
      .trim();
  }, [paciente]);

  const iniciales = useMemo(() => {
    return nombreCompleto
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((item) => item[0])
      .join('')
      .toUpperCase();
  }, [nombreCompleto]);

  useEffect(() => {
    if (estadoInicial?.formValues) {
      form.setFieldsValue(estadoInicial.formValues);
    }
  }, [estadoInicial, form]);

  useEffect(() => {
    guardarEstadoConsulta(storageKey, {
      currentStep,
      sinPeso,
      sinAltura,
      sinTemperatura,
      diagnosticos,
      mostrarReceta,
      consultaGuardada,
      progress,
      formValues: form.getFieldsValue(true),
    });
  }, [
    storageKey,
    currentStep,
    sinPeso,
    sinAltura,
    sinTemperatura,
    diagnosticos,
    mostrarReceta,
    consultaGuardada,
    progress,
    form,
  ]);

  const guardarEstadoActual = (formValues?: any) => {
    guardarEstadoConsulta(storageKey, {
      currentStep,
      sinPeso,
      sinAltura,
      sinTemperatura,
      diagnosticos,
      mostrarReceta,
      consultaGuardada,
      progress,
      formValues: formValues ?? form.getFieldsValue(true),
    });
  };

  const handleBackPacientes = () => {
    localStorage.removeItem(storageKey);
    onBack();
  };

  const liberarPaciente = async () => {
    const result = await Swal.fire({
      icon: 'question',
      title: 'Finalizar atención',
      text: `El paciente ${nombreCompleto || 'seleccionado'} dejará de estar activo para consulta y procedimientos.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, finalizar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ff4d4f',
      cancelButtonColor: '#94a3b8',
      reverseButtons: true,
      allowOutsideClick: false,
      allowEscapeKey: true,
    });

    if (!result.isConfirmed) return;

    limpiarPacienteActivo();
    localStorage.removeItem(storageKey);
    localStorage.removeItem('consulta_externa_abierta');

    await Swal.fire({
      icon: 'success',
      title: 'Paciente liberado',
      text: 'El paciente activo fue liberado correctamente.',
      timer: 1700,
      showConfirmButton: false,
      confirmButtonColor: '#0f766e',
    });

    onPacienteLiberado?.();
    onBack();
  };

  const opcionesSiNoDesconoce = [
    { value: 'SI', label: 'Sí' },
    { value: 'NO', label: 'No' },
    { value: 'SE DESCONOCE', label: 'Se desconoce' },
  ];

  const opcionesGineco = [
    { value: 'NO APLICA', label: 'No aplica' },
    { value: 'SI', label: 'Sí' },
    { value: 'NO', label: 'No' },
    { value: 'SE DESCONOCE', label: 'Se desconoce' },
  ];

  const opcionesDiagnostico = [
    {
      value: 'J00X',
      label: 'J00X - RINOFARINGITIS AGUDA [RESFRIADO COMÚN]',
      diagnostico: 'RINOFARINGITIS AGUDA [RESFRIADO COMÚN]',
    },
    {
      value: 'H405',
      label: 'H405 - GLAUCOMA SECUNDARIO A OTROS TRASTORNOS DEL OJO',
      diagnostico: 'GLAUCOMA SECUNDARIO A OTROS TRASTORNOS DEL OJO',
    },
    {
      value: 'H493',
      label: 'H493 - OFTALMOPLEJIA TOTAL EXTERNA',
      diagnostico: 'OFTALMOPLEJIA TOTAL EXTERNA',
    },
    {
      value: 'H494',
      label: 'H494 - OFTALMOPLEJIA EXTERNA PROGRESIVA',
      diagnostico: 'OFTALMOPLEJIA EXTERNA PROGRESIVA',
    },
    {
      value: 'H510',
      label: 'H510 - PARÁLISIS DE LA CONJUGACIÓN DE LA MIRADA',
      diagnostico: 'PARÁLISIS DE LA CONJUGACIÓN DE LA MIRADA',
    },
    {
      value: 'H512',
      label: 'H512 - OFTALMOPLEJIA INTERNUCLEAR',
      diagnostico: 'OFTALMOPLEJIA INTERNUCLEAR',
    },
    {
      value: 'H531',
      label: 'H531 - ALTERACIONES VISUALES SUBJETIVAS',
      diagnostico: 'ALTERACIONES VISUALES SUBJETIVAS',
    },
  ];

  const calcularEdad = () => {
    if (!paciente.fecha_nacimiento) return '-';

    const nacimiento = new Date(paciente.fecha_nacimiento);
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

  const getUnidadAltura = (altura?: string | number) => {
    const alturaNum = normalizarNumero(altura);
    if (!alturaNum) return 'm/cm';
    return alturaNum > 3 ? 'cm' : 'm';
  };

  const calcularIMC = (peso?: string | number, altura?: string | number) => {
    const pesoNum = normalizarNumero(peso);
    const alturaMetros = normalizarAlturaMetros(altura);

    if (!pesoNum || !alturaMetros || pesoNum <= 0 || alturaMetros <= 0) return '';

    return (pesoNum / (alturaMetros * alturaMetros)).toFixed(2);
  };

  const getClasificacionIMC = (imc?: string) => {
    const value = Number(imc);

    if (!value) return 'Pendiente';
    if (value < 18.5) return 'Bajo peso';
    if (value < 25) return 'Normal';
    if (value < 30) return 'Sobrepeso';

    return 'Obesidad';
  };

  const handleValuesChange = (_changedValues: any, values: any) => {
    const imc = calcularIMC(values.peso, values.altura);

    form.setFieldsValue({
      imc: imc || undefined,
    });

    setProgress((prev) => ({
      ...prev,
      validacion: Boolean(
        values.primer_consulta_anio ||
          values.diabetes ||
          values.atencion_pregestacional ||
          values.toma_glucosa ||
          values.medicion_ayunas ||
          values.tiras_control,
      ),
      signos: Boolean(
        (values.peso && values.altura) ||
          values.temperatura ||
          values.presion_arterial ||
          values.frecuencia_cardiaca ||
          values.frecuencia_respiratoria ||
          values.spo2 ||
          values.circunferencia_abdomen,
      ),
      antecedentes: Boolean(
        values.tuberculosis_pulmonar ||
          values.infeccion_transmision_sexual ||
          values.patologia_mamaria_benigna ||
          values.terapia_hormonal ||
          values.peri_postmenopausia ||
          values.colposcopia,
      ),
      diagnostico: diagnosticos.length > 0 || Boolean(values.motivo_consulta),
    }));

    guardarEstadoActual({
      ...values,
      imc: imc || undefined,
    });
  };

  const limpiarPeso = (checked: boolean) => {
    setSinPeso(checked);
    if (checked) {
      form.setFieldsValue({ peso: undefined, imc: undefined });
    }
  };

  const limpiarAltura = (checked: boolean) => {
    setSinAltura(checked);
    if (checked) {
      form.setFieldsValue({ altura: undefined, imc: undefined });
    }
  };

  const limpiarTemperatura = (checked: boolean) => {
    setSinTemperatura(checked);
    if (checked) {
      form.setFieldsValue({ temperatura: undefined });
    }
  };

  const agregarDiagnostico = () => {
    const clave = form.getFieldValue('motivo_consulta');
    const descripcion = form.getFieldValue('descripcion_diagnostico') || '';
    const primeraVezValue = form.getFieldValue('primera_vez') ?? true;

    if (!clave) return;

    const seleccionado = opcionesDiagnostico.find((item) => item.value === clave);

    const nuevo: DiagnosticoItem = {
      key: `${clave}-${Date.now()}`,
      no: diagnosticos.length + 1,
      clave,
      diagnostico: seleccionado?.diagnostico || clave,
      primeraVez: primeraVezValue === true,
      subsecuente: primeraVezValue === false,
      descripcion,
    };

    setDiagnosticos((prev) => [...prev, nuevo]);

    form.setFieldsValue({
      motivo_consulta: undefined,
      descripcion_diagnostico: undefined,
      primera_vez: true,
    });

    setProgress((prev) => ({
      ...prev,
      diagnostico: true,
    }));
  };

  const eliminarDiagnostico = (key: string) => {
    setDiagnosticos((prev) =>
      prev
        .filter((item) => item.key !== key)
        .map((item, index) => ({
          ...item,
          no: index + 1,
        })),
    );
  };

  const columnasDiagnostico: ColumnsType<DiagnosticoItem> = [
    {
      title: 'No.',
      dataIndex: 'no',
      key: 'no',
      width: 48,
      align: 'center',
    },
    {
      title: 'Clave',
      dataIndex: 'clave',
      key: 'clave',
      width: 74,
      align: 'center',
      render: (value: string) => <Tag className="consulta-code-tag">{value}</Tag>,
    },
    {
      title: 'Diagnóstico',
      dataIndex: 'diagnostico',
      key: 'diagnostico',
      render: (value: string) => <span className="consulta-table-strong">{value}</span>,
    },
    {
      title: 'Tipo',
      key: 'tipo',
      width: 112,
      align: 'center',
      render: (_, record) => (
        <Tag
          className={record.primeraVez ? 'consulta-type-tag primera' : 'consulta-type-tag subsecuente'}
        >
          {record.primeraVez ? 'Primera vez' : 'Subsecuente'}
        </Tag>
      ),
    },
    {
      title: 'Descripción',
      dataIndex: 'descripcion',
      key: 'descripcion',
      width: 160,
      render: (value: string) => (
        <span className="consulta-table-description">{value || '-'}</span>
      ),
    },
    {
      title: '',
      key: 'acciones',
      width: 44,
      align: 'center',
      render: (_, record) => (
        <Button
          danger
          type="text"
          icon={<DeleteOutlined />}
          onClick={() => eliminarDiagnostico(record.key)}
        />
      ),
    },
  ];

  const columnasVistaPrevia: ColumnsType<DiagnosticoItem> = columnasDiagnostico.filter(
    (col) => col.key !== 'acciones',
  );

  const nextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const abrirVistaPrevia = () => {
    const values = form.getFieldsValue(true);
    const imcCalculado = calcularIMC(values.peso, values.altura);

    const valuesConIMC = {
      ...values,
      imc: values.imc || imcCalculado || undefined,
    };

    form.setFieldsValue({
      imc: valuesConIMC.imc,
    });

    setPreviewValues(valuesConIMC);
    setPreviewOpen(true);
  };

  const guardarHistorialClinico = (payload: any) => {
    const HISTORIAL_CLINICO_STORAGE_KEY = 'historial_clinico_pacientes';

    try {
      const data = localStorage.getItem(HISTORIAL_CLINICO_STORAGE_KEY);
      const historiales = data ? JSON.parse(data) : [];

      const nuevoHistorial = {
        id: `${paciente.id || paciente.numero_expediente || Date.now()}-${Date.now()}`,
        pacienteId: paciente.id,
        paciente: {
          id: paciente.id,
          nombre: nombreCompleto,
          numero_expediente: paciente.numero_expediente,
          curp: paciente.curp,
          sexo: paciente.sexo,
          fecha_nacimiento: paciente.fecha_nacimiento,
        },
        consulta: payload,
        diagnosticos,
        fecha_consulta: payload.fecha_consulta,
      };

      localStorage.setItem(
        HISTORIAL_CLINICO_STORAGE_KEY,
        JSON.stringify([nuevoHistorial, ...historiales]),
      );
    } catch {
      // Evita romper la pantalla si localStorage falla.
    }
  };

  const handleGuardar = async () => {
    const values = await form.validateFields();
    const imcCalculado = calcularIMC(values.peso, values.altura);

    const payload = {
      ...values,
      imc: values.imc || imcCalculado || undefined,
      diagnosticos,
      fecha_consulta: new Date().toISOString(),
    };
    
    guardarHistorialClinico(payload);

    setProgress((prev) => ({
      ...prev,
      guardado: true,
    }));

    setConsultaGuardada(payload);
    setPreviewOpen(false);

    guardarEstadoConsulta(storageKey, {
      currentStep: 3,
      sinPeso,
      sinAltura,
      sinTemperatura,
      diagnosticos,
      mostrarReceta: false,
      consultaGuardada: payload,
      progress: {
        ...progress,
        guardado: true,
      },
      formValues: {
        ...values,
        imc: payload.imc,
      },
    });

    console.log('Consulta externa guardada:', payload);

    const result = await Swal.fire({
      icon: 'success',
      title: 'Consulta guardada',
      text: 'La información clínica se guardó correctamente.',
      showCancelButton: true,
      confirmButtonText: 'Continuar a receta',
      cancelButtonText: 'Seguir editando',
      confirmButtonColor: '#ff4d4f',
      cancelButtonColor: '#94a3b8',
      reverseButtons: true,
      customClass: {
        popup: 'consulta-save-swal',
      },
    });

    if (result.isConfirmed) {
      setMostrarReceta(true);

      guardarEstadoConsulta(storageKey, {
        currentStep: 3,
        sinPeso,
        sinAltura,
        sinTemperatura,
        diagnosticos,
        mostrarReceta: true,
        consultaGuardada: payload,
        progress: {
          ...progress,
          guardado: true,
        },
        formValues: {
          ...values,
          imc: payload.imc,
        },
      });
    }
  };

  const DiagnosticoCards = ({ preview = false }: { preview?: boolean }) => (
    <div className={preview ? 'consulta-mobile-cards preview' : 'consulta-mobile-cards'}>
      {diagnosticos.length === 0 ? (
        <Empty description="Sin diagnósticos agregados" />
      ) : (
        diagnosticos.map((item) => (
          <article className="consulta-diagnostico-card-mobile" key={item.key}>
            <div className="consulta-diagnostico-card-head">
              <div>
                <span>#{item.no}</span>
                <strong>{item.clave}</strong>
              </div>

              {!preview && (
                <Button
                  danger
                  type="text"
                  icon={<DeleteOutlined />}
                  onClick={() => eliminarDiagnostico(item.key)}
                />
              )}
            </div>

            <h4>{item.diagnostico}</h4>

            <div className="consulta-diagnostico-card-grid">
              <div>
                <span>Primera vez</span>
                <strong>{item.primeraVez ? 'Sí' : 'No'}</strong>
              </div>

              <div>
                <span>Subsecuente</span>
                <strong>{item.subsecuente ? 'Sí' : 'No'}</strong>
              </div>
            </div>

            <p>
              <span>Descripción:</span> {item.descripcion || 'Sin descripción'}
            </p>
          </article>
        ))
      )}
    </div>
  );

  if (mostrarReceta) {
    return (
    <Receta
      paciente={paciente}
      consulta={consultaGuardada}
      diagnosticos={diagnosticos}
      onBack={() => {
        setMostrarReceta(false);
        setCurrentStep(3);

        guardarEstadoConsulta(storageKey, {
          currentStep: 3,
          sinPeso,
          sinAltura,
          sinTemperatura,
          diagnosticos,
          mostrarReceta: false,
          consultaGuardada,
          progress,
          formValues: form.getFieldsValue(true),
        });
      }}
      onPacienteLiberado={onPacienteLiberado}
    />
    );
  }

  return (
    <div className="consulta-page">
      <div className="consulta-shell">
        <aside className="consulta-patient-panel">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handleBackPacientes}
            className="consulta-back-btn"
          >
            Volver a pacientes
          </Button>

          <div className="consulta-patient-card">
            <div className="consulta-patient-glow" />

            <Avatar size={78} className="consulta-avatar" icon={!iniciales && <UserOutlined />}>
              {iniciales}
            </Avatar>

            <Title level={4}>{nombreCompleto || 'Paciente sin nombre'}</Title>

            <Text type="secondary">Exp. {paciente.numero_expediente || 'Sin expediente'}</Text>

            <div className="consulta-patient-tags">
              <Tag>{paciente.sexo || 'Sin sexo'}</Tag>
              <Tag>{paciente.tipo_sangre || 'Sin tipo sangre'}</Tag>
            </div>
          </div>

          <div className="consulta-patient-data">
            <div>
              <span>Edad</span>
              <strong>{calcularEdad()}</strong>
            </div>

            <div>
              <span>Nacimiento</span>
              <strong>{paciente.fecha_nacimiento?.split('T')[0] || '-'}</strong>
            </div>

            <div>
              <span>CURP</span>
              <strong>{paciente.curp || '-'}</strong>
            </div>

            <div>
              <span>Origen</span>
              <strong>{paciente.lugar_origen || '-'}</strong>
            </div>
          </div>

          <div className="consulta-date-card">
            <div className="consulta-date-icon">
              <CalendarOutlined />
            </div>

            <div>
              <span>Fecha de elaboración</span>
              <strong>{new Date().toLocaleString('es-MX')}</strong>
            </div>
          </div>

          <div className="consulta-side-status">
            <div>
              <CheckCircleOutlined />
              <span>Expediente activo</span>
            </div>

            <div>
              <SafetyCertificateOutlined />
              <span>Captura segura</span>
            </div>
          </div>

          <Button
            icon={<CheckCircleOutlined />}
            className="consulta-liberar-paciente-btn"
            onClick={liberarPaciente}
            block
          >
            Finalizar atención
          </Button>
        </aside>

        <main className="consulta-main">
          <div className="consulta-header">
            <div className="consulta-header-left">
              <div className="consulta-header-icon">
                <FileTextOutlined />
              </div>

              <div>
                <Text className="consulta-eyebrow">Atención médica</Text>
                <Title level={2}>Consulta externa</Title>
                <Text type="secondary">
                  Captura validación, signos vitales, antecedentes, diagnóstico y referencia.
                </Text>
              </div>
            </div>

            <div className="consulta-service">
              <span>Servicio de atención</span>

              <Select
                defaultValue="CONSULTA EXTERNA"
                options={[
                  { value: 'CONSULTA EXTERNA', label: 'Consulta externa' },
                  { value: 'URGENCIAS', label: 'Urgencias' },
                  { value: 'CONTROL', label: 'Control' },
                ]}
              />
            </div>
          </div>

          <div className="consulta-progress consulta-progress-five">
            <div className={progress.validacion || currentStep >= 0 ? 'active completed' : ''}>
              <ExperimentOutlined />
              <span>Validación</span>
            </div>

            <div className={progress.signos || currentStep >= 0 ? 'active completed' : ''}>
              <HeartOutlined />
              <span>Signos vitales</span>
            </div>

            <div className={progress.antecedentes || currentStep >= 1 ? 'active completed' : ''}>
              <HistoryOutlined />
              <span>Antecedentes</span>
            </div>

            <div className={progress.diagnostico || currentStep >= 2 ? 'active completed' : ''}>
              <MedicineBoxOutlined />
              <span>Diagnóstico</span>
            </div>

            <div className={progress.guardado || currentStep >= 3 ? 'active completed' : ''}>
              <SaveOutlined />
              <span>Guardado</span>
            </div>
          </div>

          <Form
            form={form}
            layout="vertical"
            onValuesChange={handleValuesChange}
            initialValues={{
              primera_vez: true,
              referir_paciente: 'NO',
              referido_por: 'NO APLICA',
              contrarreferencia: 'NO',
            }}
          >
            {currentStep === 0 && (
              <section className="consulta-section consulta-step-section">
                <div className="consulta-section-title">
                  <div>
                    <ThunderboltOutlined />
                    <h3>Valoración inicial</h3>
                  </div>

                  <span>Validación y signos vitales</span>
                </div>

                <div className="consulta-subsection">
                  <div className="consulta-subsection-title">
                    <ExperimentOutlined />
                    <strong>Validación del paciente</strong>
                  </div>

                  <Row gutter={[16, 10]}>
                    <Col xs={24} md={8}>
                      <Form.Item name="primer_consulta_anio" label="Primera consulta del año">
                        <Select
                          placeholder="Seleccionar"
                          options={[
                            { value: 'SI', label: 'Sí' },
                            { value: 'NO', label: 'No' },
                          ]}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={8}>
                      <Form.Item name="diabetes" label="Diabetes" initialValue="NO">
                        <Select
                          options={[
                            { value: 'SI', label: 'Sí' },
                            { value: 'NO', label: 'No' },
                          ]}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={8}>
                      <Form.Item name="atencion_pregestacional" label="Atención pregestacional">
                        <Select
                          placeholder="Seleccionar"
                          options={[
                            { value: 'SI', label: 'Sí' },
                            { value: 'NO', label: 'No' },
                          ]}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={8}>
                      <Form.Item name="toma_glucosa" label="Toma glucosa" initialValue="NO">
                        <Select
                          options={[
                            { value: 'SI', label: 'Sí' },
                            { value: 'NO', label: 'No' },
                          ]}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={8}>
                      <Form.Item name="medicion_ayunas" label="Medición en ayunas">
                        <Input addonAfter="mg/dl" placeholder="Ej. 95" />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={8}>
                      <Form.Item name="tiras_control" label="Tiras de control">
                        <Input placeholder="Cantidad o referencia" />
                      </Form.Item>
                    </Col>
                  </Row>
                </div>

                <div className="consulta-subsection">
                  <div className="consulta-subsection-title">
                    <HeartOutlined />
                    <strong>Signos vitales</strong>
                  </div>

                  <Text className="consulta-help-text">
                    En altura puedes escribir metros o centímetros. Ejemplo: 1.70 o 170.
                  </Text>

                  <div className="consulta-vitals-grid">
                    <div className="consulta-vital-card">
                      <div>
                        <strong>Peso</strong>
                        <Checkbox checked={sinPeso} onChange={(e) => limpiarPeso(e.target.checked)}>
                          No tomado
                        </Checkbox>
                      </div>

                      <Form.Item name="peso">
                        <Input disabled={sinPeso} addonAfter="kg" placeholder="Ej. 70" />
                      </Form.Item>
                    </div>

                    <div className="consulta-vital-card">
                      <div>
                        <strong>Altura</strong>
                        <Checkbox
                          checked={sinAltura}
                          onChange={(e) => limpiarAltura(e.target.checked)}
                        >
                          No tomada
                        </Checkbox>
                      </div>

                      <Form.Item name="altura">
                        <Input
                          disabled={sinAltura}
                          addonAfter={getUnidadAltura(alturaActual)}
                          placeholder="Ej. 1.70 o 170"
                        />
                      </Form.Item>
                    </div>

                    <div className="consulta-vital-card consulta-imc-card">
                      <div>
                        <strong>IMC</strong>
                        <Tag color={imcActual ? 'cyan' : 'default'}>Automático</Tag>
                      </div>

                      <Form.Item name="imc">
                        <Input disabled addonAfter="kg/m²" placeholder="Se calcula solo" />
                      </Form.Item>

                      <div className="consulta-imc-result">
                        <span>Clasificación</span>
                        <strong>{getClasificacionIMC(imcActual)}</strong>
                      </div>
                    </div>

                    <div className="consulta-vital-card">
                      <div>
                        <strong>Temperatura</strong>
                        <Checkbox
                          checked={sinTemperatura}
                          onChange={(e) => limpiarTemperatura(e.target.checked)}
                        >
                          No tomada
                        </Checkbox>
                      </div>

                      <Form.Item name="temperatura">
                        <Input
                          disabled={sinTemperatura}
                          addonAfter="°C"
                          placeholder="Ej. 36.5"
                        />
                      </Form.Item>
                    </div>
                  </div>

                  <Row gutter={[16, 10]} className="consulta-extra-vitals">
                    <Col xs={24} md={8}>
                      <Form.Item name="presion_arterial" label="Presión arterial">
                        <Input addonAfter="mm/Hg" placeholder="Ej. 120/80" />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={8}>
                      <Form.Item name="frecuencia_cardiaca" label="Frecuencia cardiaca">
                        <Input addonAfter="x min" placeholder="Ej. 75" />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={8}>
                      <Form.Item name="frecuencia_respiratoria" label="Frecuencia respiratoria">
                        <Input addonAfter="x min" placeholder="Ej. 18" />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={8}>
                      <Form.Item name="spo2" label="SpO₂">
                        <Input addonAfter="%" placeholder="Ej. 98" />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={8}>
                      <Form.Item name="circunferencia_abdomen" label="Circunferencia abdomen">
                        <Input addonAfter="cm" placeholder="Ej. 85" />
                      </Form.Item>
                    </Col>
                  </Row>
                </div>

                <div className="consulta-step-actions">
                  <Button type="primary" className="consulta-save-btn" onClick={nextStep}>
                    Siguiente
                  </Button>
                </div>
              </section>
            )}

            {currentStep === 1 && (
              <section className="consulta-section consulta-step-section">
                <div className="consulta-section-title">
                  <div>
                    <HistoryOutlined />
                    <h3>Antecedentes</h3>
                  </div>

                  <span>Antecedentes generales y gineco obstétricos</span>
                </div>

                <div className="consulta-subsection consulta-antecedentes-card">
                  <div className="consulta-subsection-title">
                    <HistoryOutlined />
                    <strong>Antecedentes</strong>
                  </div>

                  <Row gutter={[16, 10]} align="middle">
                    <Col xs={24} md={8}>
                      <Form.Item
                        name="tuberculosis_pulmonar"
                        label="Tuberculosis pulmonar"
                        initialValue="SE DESCONOCE"
                      >
                        <Select options={opcionesSiNoDesconoce} />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={16}>
                      <Form.Item name="tuberculosis_observaciones" label="Observaciones">
                        <Input placeholder="Describe observaciones o notas clínicas" />
                      </Form.Item>
                    </Col>
                  </Row>
                </div>

                <div className="consulta-subsection consulta-gineco-card">
                  <div className="consulta-subsection-title">
                    <WomanOutlined />
                    <strong>Antecedentes gineco obstétricos</strong>
                  </div>

                  <Row gutter={[16, 10]}>
                    <Col xs={24} md={8}>
                      <Form.Item
                        name="infeccion_transmision_sexual"
                        label="Infección de transmisión sexual"
                        initialValue="NO APLICA"
                      >
                        <Select options={opcionesGineco} />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={8}>
                      <Form.Item
                        name="patologia_mamaria_benigna"
                        label="Patología mamaria benigna"
                        initialValue="NO APLICA"
                      >
                        <Select options={opcionesGineco} />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={8}>
                      <Form.Item
                        name="terapia_hormonal"
                        label="Terapia hormonal"
                        initialValue="NO APLICA"
                      >
                        <Select options={opcionesGineco} />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={8}>
                      <Form.Item
                        name="peri_postmenopausia"
                        label="Peri postmenopausia"
                        initialValue="NO APLICA"
                      >
                        <Select options={opcionesGineco} />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={8}>
                      <Form.Item name="colposcopia" label="Colposcopía" initialValue="NO APLICA">
                        <Select options={opcionesGineco} />
                      </Form.Item>
                    </Col>
                  </Row>
                </div>

                <div className="consulta-step-actions">
                  <Button onClick={prevStep}>Anterior</Button>
                  <Button type="primary" className="consulta-save-btn" onClick={nextStep}>
                    Siguiente
                  </Button>
                </div>
              </section>
            )}

            {currentStep === 2 && (
              <section className="consulta-section consulta-step-section">
                <div className="consulta-section-title">
                  <div>
                    <MedicineBoxOutlined />
                    <h3>Descripción diagnóstico</h3>
                  </div>

                  <span>Motivo de consulta, diagnóstico y referencia</span>
                </div>

                <div className="consulta-diagnostico-box">
                  <Row gutter={[16, 12]} align="bottom">
                    <Col xs={24} lg={12}>
                      <Form.Item name="motivo_consulta" label="Motivo de consulta">
                        <Select
                          showSearch
                          placeholder="Seleccione..."
                          optionFilterProp="label"
                          options={opcionesDiagnostico}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} lg={8}>
                      <Form.Item name="descripcion_diagnostico" label="Descripción">
                        <Input placeholder="Escribe una descripción" />
                      </Form.Item>
                    </Col>

                    <Col xs={24} lg={4}>
                      <Form.Item label=" ">
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          className="consulta-add-btn"
                          onClick={agregarDiagnostico}
                          block
                        >
                          Agregar
                        </Button>
                      </Form.Item>
                    </Col>

                    <Col xs={24}>
                      <Form.Item name="primera_vez" label="Primera vez">
                        <Radio.Group>
                          <Radio value={true}>Sí</Radio>
                          <Radio value={false}>No</Radio>
                        </Radio.Group>
                      </Form.Item>
                    </Col>
                  </Row>

                  <Table
                    className="consulta-diagnostico-table consulta-desktop-table"
                    columns={columnasDiagnostico}
                    dataSource={diagnosticos}
                    rowKey="key"
                    pagination={false}
                    size="middle"
                    tableLayout="auto"
                    locale={{
                      emptyText: 'Sin diagnósticos agregados',
                    }}
                  />

                  <DiagnosticoCards />
                </div>

                <div className="consulta-subsection consulta-referencia-card">
                  <div className="consulta-subsection-title consulta-left-title">
                    <ShareAltOutlined />
                    <strong>Referencia</strong>
                  </div>

                  <Row gutter={[16, 10]}>
                    <Col xs={24} md={6}>
                      <Form.Item name="referir_paciente" label="Referir paciente">
                        <Select
                          options={[
                            { value: 'SI', label: 'Sí' },
                            { value: 'NO', label: 'No' },
                          ]}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={18}>
                      <Form.Item name="referido_por" label="Referido por">
                        <Input disabled={referirPaciente !== 'SI'} placeholder="NO APLICA" />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={6}>
                      <Form.Item name="contrarreferencia" label="Contrarreferencia">
                        <Select
                          disabled={referirPaciente !== 'SI'}
                          options={[
                            { value: 'SI', label: 'Sí' },
                            { value: 'NO', label: 'No' },
                          ]}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={18}>
                      <Form.Item name="detalle_contrarreferencia" label="Detalle">
                        <Input
                          disabled={referirPaciente !== 'SI'}
                          placeholder="Describe detalle de contrarreferencia"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </div>

                <div className="consulta-step-actions">
                  <Button onClick={prevStep}>Anterior</Button>
                  <Button type="primary" className="consulta-save-btn" onClick={nextStep}>
                    Siguiente
                  </Button>
                </div>
              </section>
            )}

            {currentStep === 3 && (
              <section className="consulta-section consulta-step-section consulta-save-section">
                <div className="consulta-section-title">
                  <div>
                    <SaveOutlined />
                    <h3>Guardar consulta</h3>
                  </div>

                  <span>Revisión final</span>
                </div>

                <div className="consulta-final-card">
                  <CheckCircleOutlined />
                  <h3>Consulta lista para guardar</h3>
                  <p>
                    Revisa la información capturada. Puedes regresar para corregir datos antes de
                    guardar la consulta.
                  </p>
                </div>

                <Divider />

                <div className="consulta-step-actions">
                  <Button onClick={prevStep}>Anterior</Button>

                  <Button icon={<EyeOutlined />} onClick={abrirVistaPrevia}>
                    Vista previa
                  </Button>

                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    className="consulta-save-btn"
                    onClick={handleGuardar}
                  >
                    Guardar consulta
                  </Button>
                </div>
              </section>
            )}
          </Form>
        </main>
      </div>

      <Modal
        className="consulta-preview-modal"
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={[
          <Button key="cerrar" onClick={() => setPreviewOpen(false)}>
            Cerrar
          </Button>,
          <Button
            key="guardar"
            type="primary"
            icon={<SaveOutlined />}
            className="consulta-save-btn"
            onClick={handleGuardar}
          >
            Guardar consulta
          </Button>,
        ]}
        width={980}
        title={
          <div className="consulta-preview-title">
            <FileTextOutlined />
            <span>Vista previa de consulta externa</span>
          </div>
        }
      >
        <div className="consulta-preview">
          <Descriptions bordered column={{ xs: 1, sm: 1, md: 2 }} size="small">
            <Descriptions.Item label="Paciente">{nombreCompleto || '-'}</Descriptions.Item>
            <Descriptions.Item label="Expediente">
              {paciente.numero_expediente || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Edad">{calcularEdad()}</Descriptions.Item>
            <Descriptions.Item label="Fecha">
              {new Date().toLocaleString('es-MX')}
            </Descriptions.Item>
          </Descriptions>

          <div className="consulta-preview-section-title">Signos vitales</div>

          <Descriptions bordered column={{ xs: 1, sm: 1, md: 3 }} size="small">
            <Descriptions.Item label="Peso">
              {sinPeso ? 'No tomado' : previewValues.peso ? `${previewValues.peso} kg` : '-'}
            </Descriptions.Item>

            <Descriptions.Item label="Altura">
              {sinAltura
                ? 'No tomada'
                : previewValues.altura
                  ? `${previewValues.altura} ${getUnidadAltura(previewValues.altura)}`
                  : '-'}
            </Descriptions.Item>

            <Descriptions.Item label="IMC">{previewValues.imc || '-'}</Descriptions.Item>

            <Descriptions.Item label="Temperatura">
              {sinTemperatura
                ? 'No tomada'
                : previewValues.temperatura
                  ? `${previewValues.temperatura} °C`
                  : '-'}
            </Descriptions.Item>

            <Descriptions.Item label="T.A.">
              {previewValues.presion_arterial || '-'}
            </Descriptions.Item>

            <Descriptions.Item label="SpO₂">
              {previewValues.spo2 ? `${previewValues.spo2}%` : '-'}
            </Descriptions.Item>
          </Descriptions>

          <div className="consulta-preview-section-title">Antecedentes</div>

          <Descriptions bordered column={{ xs: 1, sm: 1, md: 2 }} size="small">
            <Descriptions.Item label="Tuberculosis pulmonar">
              {previewValues.tuberculosis_pulmonar || '-'}
            </Descriptions.Item>

            <Descriptions.Item label="Observaciones">
              {previewValues.tuberculosis_observaciones || '-'}
            </Descriptions.Item>

            <Descriptions.Item label="ITS">
              {previewValues.infeccion_transmision_sexual || '-'}
            </Descriptions.Item>

            <Descriptions.Item label="Colposcopía">
              {previewValues.colposcopia || '-'}
            </Descriptions.Item>
          </Descriptions>

          <div className="consulta-preview-section-title">Diagnóstico</div>

          <Table
            columns={columnasVistaPrevia}
            dataSource={diagnosticos}
            rowKey="key"
            pagination={false}
            size="small"
            tableLayout="auto"
            className="consulta-preview-table consulta-desktop-table"
            locale={{ emptyText: 'Sin diagnósticos agregados' }}
          />

          <DiagnosticoCards preview />

          <div className="consulta-preview-section-title">Referencia</div>

          <Descriptions bordered column={{ xs: 1, sm: 1, md: 2 }} size="small">
            <Descriptions.Item label="Referir paciente">
              {previewValues.referir_paciente || '-'}
            </Descriptions.Item>

            <Descriptions.Item label="Referido por">
              {previewValues.referido_por || '-'}
            </Descriptions.Item>

            <Descriptions.Item label="Contrarreferencia">
              {previewValues.contrarreferencia || '-'}
            </Descriptions.Item>

            <Descriptions.Item label="Detalle">
              {previewValues.detalle_contrarreferencia || '-'}
            </Descriptions.Item>
          </Descriptions>
        </div>
      </Modal>
    </div>
  );
};

export default ConsultaExterna;