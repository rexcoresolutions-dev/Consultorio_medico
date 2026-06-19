import React, { useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Form,
  Input,
  Row,
  Select,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CalendarOutlined,
  CloseOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileTextOutlined,
  HeartOutlined,
  IdcardOutlined,
  LogoutOutlined,
  PlusOutlined,
  SaveOutlined,
  SyncOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

import type { PacienteData } from '../../services/pacientes/pacientes.service';
import './NotaEvolucion.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

const PACIENTE_ATENCION_STORAGE_KEY = 'paciente_atencion_actual';
const CONSULTA_EXTERNA_ABIERTA_STORAGE_KEY = 'consulta_externa_abierta';
const NOTAS_EVOLUCION_STORAGE_KEY = 'notas_evolucion_pacientes';

type DiagnosticoNota = {
  id: string;
  no: number;
  clave: string;
  diagnostico: string;
};

type NotaEvolucionValues = {
  ta?: string;
  fc?: string;
  fr?: string;
  temp?: string;
  peso?: string;
  talla?: string;
  abdomen?: string;
  spo2?: string;
  motivoConsulta?: string;
  exploracionFisica?: string;
  examenesParaclinicos?: string;
  tratamientoActual?: string;
  pronostico?: string;
  diagnosticoSeleccionado?: string;
  proximaCita?: boolean;
  fechaProximaCita?: string;
};

type NotaEvolucionItem = {
  id: string;
  pacienteId?: number | string;
  paciente: Partial<PacienteData> & {
    nombreCompleto?: string;
  };
  fecha_elaboracion: string;
  datos: NotaEvolucionValues;
  diagnosticos: DiagnosticoNota[];
};

const diagnosticosOptions = [
  {
    value: 'J00X|RINOFARINGITIS AGUDA [RESFRIADO COMUN]',
    label: 'J00X - RINOFARINGITIS AGUDA [RESFRIADO COMUN]',
  },
  {
    value: 'J029|FARINGITIS AGUDA, NO ESPECIFICADA',
    label: 'J029 - FARINGITIS AGUDA, NO ESPECIFICADA',
  },
  {
    value: 'A09X|DIARREA Y GASTROENTERITIS DE PRESUNTO ORIGEN INFECCIOSO',
    label: 'A09X - DIARREA Y GASTROENTERITIS',
  },
  {
    value: 'R51X|CEFALEA',
    label: 'R51X - CEFALEA',
  },
  {
    value: 'I10X|HIPERTENSION ESENCIAL',
    label: 'I10X - HIPERTENSION ESENCIAL',
  },
];

const cargarPacienteActivo = (): PacienteData | null => {
  try {
    const data = localStorage.getItem(PACIENTE_ATENCION_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

const cargarNotas = (): NotaEvolucionItem[] => {
  try {
    const data = localStorage.getItem(NOTAS_EVOLUCION_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const guardarNotas = (notas: NotaEvolucionItem[]) => {
  localStorage.setItem(NOTAS_EVOLUCION_STORAGE_KEY, JSON.stringify(notas));
};

const getFullName = (paciente?: Partial<PacienteData> | null) =>
  `${paciente?.nombre || ''} ${paciente?.primer_apellido || ''} ${
    paciente?.segundo_apellido || ''
  }`
    .replace(/\s+/g, ' ')
    .trim();

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

const formatDateTime = (fecha?: string) => {
  if (!fecha) return '-';

  const parsed = new Date(fecha);

  if (Number.isNaN(parsed.getTime())) return fecha;

  return parsed.toLocaleString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const NotaEvolucion: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm<NotaEvolucionValues>();

  const [step, setStep] = useState(0);
  const [pacienteActivo, setPacienteActivo] = useState<PacienteData | null>(() =>
    cargarPacienteActivo(),
  );
  const [notas, setNotas] = useState<NotaEvolucionItem[]>(() => cargarNotas());
  const [diagnosticos, setDiagnosticos] = useState<DiagnosticoNota[]>([]);

  const pacienteNombre = getFullName(pacienteActivo);

  const notaActual = useMemo(() => {
    if (!pacienteActivo) return null;

    return notas.find((nota) => {
      const sameId =
        pacienteActivo.id && String(nota.pacienteId) === String(pacienteActivo.id);

      const sameExpediente =
        pacienteActivo.numero_expediente &&
        nota.paciente.numero_expediente === pacienteActivo.numero_expediente;

      return sameId || sameExpediente;
    });
  }, [notas, pacienteActivo]);

  React.useEffect(() => {
    if (notaActual?.datos) {
      form.setFieldsValue(notaActual.datos);
      setDiagnosticos(notaActual.diagnosticos || []);
    }
  }, [notaActual, form]);

  const agregarDiagnostico = () => {
    const value = form.getFieldValue('diagnosticoSeleccionado');

    if (!value) {
      message.warning('Selecciona un diagnóstico antes de agregar.');
      return;
    }

    const [clave, diagnostico] = value.split('|');

    const existe = diagnosticos.some((item) => item.clave === clave);

    if (existe) {
      message.warning('Este diagnóstico ya fue agregado.');
      return;
    }

    const nuevoDiagnostico: DiagnosticoNota = {
      id: `${clave}-${Date.now()}`,
      no: diagnosticos.length + 1,
      clave,
      diagnostico,
    };

    setDiagnosticos([...diagnosticos, nuevoDiagnostico]);
    form.setFieldValue('diagnosticoSeleccionado', undefined);
  };

  const eliminarDiagnostico = (id: string) => {
    const nuevos = diagnosticos
      .filter((item) => item.id !== id)
      .map((item, index) => ({
        ...item,
        no: index + 1,
      }));

    setDiagnosticos(nuevos);
  };

  const irSiguiente = async () => {
    try {
      await form.validateFields(['motivoConsulta']);
      setStep(1);
    } catch {
      message.warning('Completa el motivo de consulta antes de continuar.');
    }
  };

  const guardarNota = async () => {
    const values = await form.validateFields();

    if (diagnosticos.length === 0) {
      message.warning('Agrega al menos un diagnóstico.');
      return;
    }

    const nuevaNota: NotaEvolucionItem = {
      id: notaActual?.id || `${pacienteActivo?.id || 'paciente'}-${Date.now()}`,
      pacienteId: pacienteActivo?.id,
      paciente: {
        id: pacienteActivo?.id,
        nombreCompleto: pacienteNombre,
        nombre: pacienteActivo?.nombre,
        primer_apellido: pacienteActivo?.primer_apellido,
        segundo_apellido: pacienteActivo?.segundo_apellido,
        fecha_nacimiento: pacienteActivo?.fecha_nacimiento,
        sexo: pacienteActivo?.sexo,
        numero_expediente: pacienteActivo?.numero_expediente,
        curp: pacienteActivo?.curp,
      },
      fecha_elaboracion: new Date().toISOString(),
      datos: values,
      diagnosticos,
    };

    const notasActualizadas = notaActual
      ? notas.map((nota) => (nota.id === notaActual.id ? nuevaNota : nota))
      : [nuevaNota, ...notas];

    setNotas(notasActualizadas);
    guardarNotas(notasActualizadas);

    message.success('Nota de evolución guardada correctamente.');
  };

  const finalizarAtencion = async () => {
    const result = await Swal.fire({
      icon: 'question',
      title: 'Finalizar atención',
      text: `${
        pacienteNombre || 'El paciente'
      } dejará de estar activo en consulta, historial clínico y nota de evolución.`,
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
      timer: 1500,
      showConfirmButton: false,
    });

    setPacienteActivo(null);
    navigate('/pacientes', { replace: true });
  };

  const diagnosticoColumns: ColumnsType<DiagnosticoNota> = [
    {
      title: 'No.',
      dataIndex: 'no',
      width: 70,
      align: 'center',
    },
    {
      title: 'Clave',
      dataIndex: 'clave',
      width: 110,
      align: 'center',
    },
    {
      title: 'Diagnóstico',
      dataIndex: 'diagnostico',
      ellipsis: true,
    },
    {
      title: '',
      key: 'acciones',
      width: 64,
      align: 'center',
      render: (_, record) => (
        <Button
          danger
          type="text"
          icon={<DeleteOutlined />}
          onClick={() => eliminarDiagnostico(record.id)}
        />
      ),
    },
  ];

  if (!pacienteActivo) {
    return (
      <div className="nota-evolucion-page">
        <div className="nota-empty-state">
          <div className="nota-empty-decoration top" />
          <div className="nota-empty-decoration bottom" />

          <div className="nota-empty-icon">
            <SyncOutlined />
          </div>

          <div className="nota-empty-badge">Nota de evolución bloqueada</div>

          <h1>No hay paciente activo</h1>

          <p>
            Para crear o consultar una nota de evolución, primero debes seleccionar un paciente
            desde el módulo de Pacientes.
          </p>

          <Button
            type="primary"
            icon={<UserOutlined />}
            className="nota-empty-button"
            onClick={() => navigate('/pacientes')}
          >
            Seleccionar paciente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="nota-evolucion-page">
      <div className="nota-evolucion-shell">
        <header className="nota-hero-card">
          <div className="nota-hero-icon">
            <FileTextOutlined />
          </div>

          <div>
            <Text className="nota-eyebrow">Expediente clínico</Text>
            <Title level={2}>Nota de evolución</Title>
            <Text type="secondary">
              Registra signos vitales, motivo de consulta, exploración física y tratamiento.
            </Text>
          </div>

          <Tag className="nota-status-tag">
            {notaActual ? 'Nota existente' : 'Nueva nota'}
          </Tag>
        </header>

        <section className="nota-patient-card">
          <div className="nota-patient-main">
            <Avatar size={72} className="nota-avatar" icon={<UserOutlined />}>
              {pacienteNombre
                .split(' ')
                .slice(0, 2)
                .map((x) => x[0])
                .join('')
                .toUpperCase()}
            </Avatar>

            <div className="nota-patient-info">
              <span>Paciente</span>
              <h2>{pacienteNombre || 'Paciente sin nombre'}</h2>

              <div className="nota-patient-tags">
                <Tag>
                  <IdcardOutlined /> Exp. {pacienteActivo.numero_expediente || '-'}
                </Tag>

                <Tag>{calcularEdad(pacienteActivo.fecha_nacimiento)}</Tag>

                <Tag>{pacienteActivo.sexo || '-'}</Tag>

                <Tag>
                  <CalendarOutlined /> {formatDateTime(new Date().toISOString())}
                </Tag>
              </div>
            </div>
          </div>

          <Button
            icon={<LogoutOutlined />}
            className="nota-finalizar-btn"
            onClick={finalizarAtencion}
          >
            Finalizar atención
          </Button>
        </section>

        <Card className="nota-form-card">
          <Form form={form} layout="vertical" className="nota-form">
            <div className="nota-form-header">
              <div>
                <Text className="nota-eyebrow">Registro médico</Text>
                <h3>{step === 0 ? 'Evaluación inicial' : 'Diagnóstico y seguimiento'}</h3>
              </div>

              <Text type="secondary">
                Fecha y hora de elaboración:{' '}
                <strong>{formatDateTime(new Date().toISOString())}</strong>
              </Text>
            </div>

            <div className="nota-wizard-steps">
              <button
                type="button"
                className={`nota-wizard-step ${step === 0 ? 'active' : 'done'}`}
                onClick={() => setStep(0)}
              >
                <span>1</span>
                <div>
                  <strong>Evaluación</strong>
                  <small>Signos, motivo y exploración</small>
                </div>
              </button>

              <div className={`nota-wizard-line ${step === 1 ? 'active' : ''}`} />

              <button
                type="button"
                className={`nota-wizard-step ${step === 1 ? 'active' : ''}`}
                onClick={() => setStep(1)}
              >
                <span>2</span>
                <div>
                  <strong>Diagnóstico</strong>
                  <small>Pronóstico, diagnósticos y próxima cita</small>
                </div>
              </button>
            </div>

            {step === 0 && (
              <div className="nota-body-grid">
                <aside className="nota-signos-card">
                  <div className="nota-section-title">
                    <HeartOutlined />
                    <span>Signos vitales</span>
                  </div>

                  <Form.Item name="ta" label="T.A.">
                    <Input addonAfter="mm/Hg" placeholder="120/80" />
                  </Form.Item>

                  <Form.Item name="fc" label="F.C.">
                    <Input addonAfter="xmin" placeholder="75" />
                  </Form.Item>

                  <Form.Item name="fr" label="F.R.">
                    <Input addonAfter="xmin" placeholder="18" />
                  </Form.Item>

                  <Form.Item name="temp" label="Temp.">
                    <Input addonAfter="°C" placeholder="36.5" />
                  </Form.Item>

                  <Form.Item name="peso" label="Peso">
                    <Input addonAfter="Kg" placeholder="70" />
                  </Form.Item>

                  <Form.Item name="talla" label="Talla">
                    <Input addonAfter="m" placeholder="1.70" />
                  </Form.Item>

                  <Form.Item name="abdomen" label="C. Abdomen">
                    <Input addonAfter="cm" placeholder="85" />
                  </Form.Item>

                  <Form.Item name="spo2" label="SpO₂">
                    <Input addonAfter="%" placeholder="98" />
                  </Form.Item>
                </aside>

                <main className="nota-fields-panel">
                  <Form.Item
                    name="motivoConsulta"
                    label="Motivo de consulta"
                    rules={[{ required: true, message: 'Ingresa el motivo de consulta' }]}
                  >
                    <TextArea rows={4} placeholder="Describe el motivo principal de consulta..." />
                  </Form.Item>

                  <Form.Item name="exploracionFisica" label="Exploración física">
                    <TextArea
                      rows={4}
                      placeholder="Registra hallazgos de la exploración física..."
                    />
                  </Form.Item>

                  <Form.Item name="examenesParaclinicos" label="Exámenes paraclínicos">
                    <TextArea rows={3} placeholder="Anota estudios, laboratorios o gabinete..." />
                  </Form.Item>

                  <Form.Item name="tratamientoActual" label="Tratamiento actual">
                    <TextArea rows={3} placeholder="Describe el tratamiento indicado o actual..." />
                  </Form.Item>
                </main>
              </div>
            )}

            {step === 1 && (
              <section className="nota-fields-panel nota-diagnostico-panel">
                <Form.Item name="pronostico" label="Pronóstico">
                  <TextArea rows={4} placeholder="Pronóstico del paciente..." />
                </Form.Item>

                <div className="nota-diagnostico-title">Diagnóstico</div>

                <div className="nota-diagnostico-row">
                  <Form.Item name="diagnosticoSeleccionado" noStyle>
                    <Select
                      showSearch
                      allowClear
                      placeholder="Seleccione..."
                      options={diagnosticosOptions}
                      optionFilterProp="label"
                    />
                  </Form.Item>

                  <Button
                    icon={<PlusOutlined />}
                    className="nota-add-diagnostico-btn"
                    onClick={agregarDiagnostico}
                  >
                    Agregar
                  </Button>
                </div>

                <Table
                  className="nota-diagnostico-table"
                  columns={diagnosticoColumns}
                  dataSource={diagnosticos}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  scroll={diagnosticos.length > 0 ? { x: 560, y: 220 } : undefined}
                  locale={{
                    emptyText: 'Sin diagnósticos agregados',
                  }}
                />

                <div className="nota-proxima-cita">
                  <Form.Item name="proximaCita" valuePropName="checked" noStyle>
                    <Checkbox>Próxima cita</Checkbox>
                  </Form.Item>

                    <Form.Item name="fechaProximaCita" noStyle>
                    <DatePicker
                        format="DD/MM/YYYY"
                        placeholder="dd/mm/aaaa"
                        className="nota-date-picker"
                    />
                    </Form.Item>
                </div>
              </section>
            )}

            <div className="nota-footer">
              <Button icon={<CloseOutlined />}>Cancelar</Button>

              {step === 1 && (
                <Button icon={<ArrowLeftOutlined />} onClick={() => setStep(0)}>
                  Anterior
                </Button>
              )}

              {step === 0 && (
                <Button
                  type="primary"
                  icon={<ArrowRightOutlined />}
                  className="nota-save-btn"
                  onClick={irSiguiente}
                >
                  Siguiente
                </Button>
              )}

              {step === 1 && (
                <>
                  <Button icon={<EyeOutlined />}>Vista previa</Button>

                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={guardarNota}
                    className="nota-save-btn"
                  >
                    Guardar nota
                  </Button>
                </>
              )}
            </div>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default NotaEvolucion;