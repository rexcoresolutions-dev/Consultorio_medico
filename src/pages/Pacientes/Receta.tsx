import React, { useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  Checkbox,
  Col,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileDoneOutlined,
  HeartOutlined,
  MedicineBoxOutlined,
  PlusOutlined,
  PrinterOutlined,
  SaveOutlined,
  UserOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import Swal from 'sweetalert2';

import type { PacienteData } from '../../services/pacientes/pacientes.service';
import './Receta.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

const PACIENTE_ATENCION_STORAGE_KEY = 'paciente_atencion_actual';
const CONSULTA_EXTERNA_ABIERTA_STORAGE_KEY = 'consulta_externa_abierta';

type DiagnosticoResumen = {
  key?: string;
  no?: number;
  clave?: string;
  diagnostico?: string;
  descripcion?: string;
};

type RecetaProps = {
  paciente: PacienteData;
  consulta?: any;
  diagnosticos?: DiagnosticoResumen[];
  onBack: () => void;
  onPacienteLiberado?: () => void;
};

type TratamientoItem = {
  key: string;
  no: number;
  sustancia: string;
  cantidadNumero: number;
  cantidadUnidad: string;
  frecuenciaNumero: number;
  frecuenciaUnidad: string;
  duracionNumero: number;
  duracionUnidad: string;
  indicacion: string;
  via: string;
  observaciones: string;
};

const opcionesSustancias = [
  { value: 'PARACETAMOL', label: 'Paracetamol' },
  { value: 'IBUPROFENO', label: 'Ibuprofeno' },
  { value: 'LORATADINA', label: 'Loratadina' },
  { value: 'AMOXICILINA', label: 'Amoxicilina' },
  { value: 'OMEPRAZOL', label: 'Omeprazol' },
  { value: 'SALBUTAMOL', label: 'Salbutamol' },
  { value: 'METFORMINA', label: 'Metformina' },
  { value: 'OTRO', label: 'Otro / escribir en observaciones' },
];

const opcionesUnidadCantidad = [
  { value: 'tableta', label: 'Tableta' },
  { value: 'cápsula', label: 'Cápsula' },
  { value: 'ml', label: 'ml' },
  { value: 'gota', label: 'Gota' },
  { value: 'aplicación', label: 'Aplicación' },
  { value: 'inhalación', label: 'Inhalación' },
];

const opcionesUnidadFrecuencia = [
  { value: 'horas', label: 'Horas' },
  { value: 'días', label: 'Días' },
];

const opcionesUnidadDuracion = [
  { value: 'días', label: 'Días' },
  { value: 'semanas', label: 'Semanas' },
  { value: 'meses', label: 'Meses' },
];

const opcionesVia = [
  { value: 'ORAL', label: 'Oral' },
  { value: 'SUBLINGUAL', label: 'Sublingual' },
  { value: 'INTRAMUSCULAR', label: 'Intramuscular' },
  { value: 'INTRAVENOSA', label: 'Intravenosa' },
  { value: 'TÓPICA', label: 'Tópica' },
  { value: 'OFTÁLMICA', label: 'Oftálmica' },
  { value: 'ÓTICA', label: 'Ótica' },
  { value: 'INHALADA', label: 'Inhalada' },
];

const pluralizar = (numero: number, palabra: string) => {
  if (numero === 1) return palabra;
  if (palabra === 'mes') return 'meses';
  if (palabra.endsWith('s')) return palabra;
  if (palabra.endsWith('z')) return `${palabra.slice(0, -1)}ces`;
  return `${palabra}s`;
};

const construirIndicacion = (
  cantidadNumero: number,
  cantidadUnidad: string,
  frecuenciaNumero: number,
  frecuenciaUnidad: string,
  duracionNumero: number,
  duracionUnidad: string,
) => {
  return `${cantidadNumero} ${pluralizar(
    cantidadNumero,
    cantidadUnidad,
  )} cada ${frecuenciaNumero} ${pluralizar(
    frecuenciaNumero,
    frecuenciaUnidad,
  )} durante ${duracionNumero} ${pluralizar(duracionNumero, duracionUnidad)}`;
};

const Receta: React.FC<RecetaProps> = ({
  paciente,
  consulta,
  diagnosticos = [],
  onBack,
  onPacienteLiberado,
}) => {
  const [form] = Form.useForm();
  const [tratamientos, setTratamientos] = useState<TratamientoItem[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewValues, setPreviewValues] = useState<any>({});

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

  const fechaElaboracion = useMemo(() => new Date().toLocaleString('es-MX'), []);

  const calcularEdad = () => {
    if (!paciente.fecha_nacimiento) return '-';

    const nacimiento = new Date(paciente.fecha_nacimiento);
    const hoy = new Date();
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();

    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--;

    return `${edad} años`;
  };

  const diagnosticoPrincipal = useMemo(() => {
    if (!diagnosticos.length) return 'Sin diagnóstico capturado';

    const primero = diagnosticos[0];

    return `${primero.clave ? `${primero.clave} - ` : ''}${
      primero.diagnostico || primero.descripcion || '-'
    }`;
  }, [diagnosticos]);

  const progresoReceta = useMemo(() => {
    let puntos = 20;
    if (diagnosticoPrincipal !== 'Sin diagnóstico capturado') puntos += 25;
    if (consulta?.alergias) puntos += 20;
    if (tratamientos.length > 0) puntos += 35;
    return Math.min(puntos, 100);
  }, [consulta?.alergias, diagnosticoPrincipal, tratamientos.length]);

  const agregarTratamiento = async () => {
    try {
      const values = await form.validateFields([
        'sustancia',
        'cantidad_numero',
        'cantidad_unidad',
        'frecuencia_numero',
        'frecuencia_unidad',
        'duracion_numero',
        'duracion_unidad',
        'via_administracion',
      ]);

      const sustanciaLabel =
        opcionesSustancias.find((item) => item.value === values.sustancia)?.label ||
        values.sustancia;

      const indicacion = construirIndicacion(
        Number(values.cantidad_numero),
        values.cantidad_unidad,
        Number(values.frecuencia_numero),
        values.frecuencia_unidad,
        Number(values.duracion_numero),
        values.duracion_unidad,
      );

      const nuevo: TratamientoItem = {
        key: `${values.sustancia}-${Date.now()}`,
        no: tratamientos.length + 1,
        sustancia: sustanciaLabel,
        cantidadNumero: Number(values.cantidad_numero),
        cantidadUnidad: values.cantidad_unidad,
        frecuenciaNumero: Number(values.frecuencia_numero),
        frecuenciaUnidad: values.frecuencia_unidad,
        duracionNumero: Number(values.duracion_numero),
        duracionUnidad: values.duracion_unidad,
        indicacion,
        via: values.via_administracion,
        observaciones:
          form.getFieldValue('observaciones_tratamiento') || 'Sin observaciones',
      };

      setTratamientos((prev) => [...prev, nuevo]);

      form.setFieldsValue({
        sustancia: undefined,
        cantidad_numero: 1,
        cantidad_unidad: 'tableta',
        frecuencia_numero: 8,
        frecuencia_unidad: 'horas',
        duracion_numero: 6,
        duracion_unidad: 'días',
        via_administracion: undefined,
        observaciones_tratamiento: undefined,
      });

      message.success('Tratamiento agregado.');
    } catch {
      message.warning('Completa los campos obligatorios del tratamiento.');
    }
  };

  const eliminarTratamiento = (key: string) => {
    setTratamientos((prev) =>
      prev
        .filter((item) => item.key !== key)
        .map((item, index) => ({ ...item, no: index + 1 })),
    );
  };

  const abrirVistaPrevia = () => {
    setPreviewValues(form.getFieldsValue(true));
    setPreviewOpen(true);
  };

  const imprimirReceta = () => {
    setPreviewValues(form.getFieldsValue(true));
    setTimeout(() => window.print(), 180);
  };

  const guardarReceta = async () => {
    try {
      const values = await form.validateFields();

      if (tratamientos.length === 0) {
        message.warning('Agrega al menos un tratamiento antes de guardar la receta.');
        return;
      }

      const payload = {
        paciente,
        consulta,
        diagnosticos,
        receta: values,
        tratamientos,
        fecha_elaboracion: new Date().toISOString(),
      };

      console.log('Receta simulada:', payload);
      message.success('Receta guardada correctamente.');
    } catch {
      message.warning('Revisa los campos pendientes antes de guardar.');
    }
  };

  const getConsultaStorageKey = (paciente?: PacienteData) => {
    const pacienteKey =
      paciente?.id ||
      paciente?.numero_expediente ||
      paciente?.curp ||
      `${paciente?.nombre || 'paciente'}-${paciente?.primer_apellido || ''}`;

    return `consulta_externa_estado_${pacienteKey}`;
  };

  const finalizarAtencion = async () => {
    const result = await Swal.fire({
      icon: 'question',
      title: 'Finalizar atención',
      text: `${nombreCompleto || 'El paciente'} dejará de estar activo para consulta, procedimientos y receta.`,
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

    localStorage.removeItem(PACIENTE_ATENCION_STORAGE_KEY);
    localStorage.removeItem(CONSULTA_EXTERNA_ABIERTA_STORAGE_KEY);
    localStorage.removeItem(getConsultaStorageKey(paciente));

    await Swal.fire({
      icon: 'success',
      title: 'Atención finalizada',
      text: 'El paciente activo fue liberado correctamente.',
      timer: 1700,
      showConfirmButton: false,
      confirmButtonColor: '#0f766e',
    });

    onPacienteLiberado?.();
  };

  const columnasTratamientos: ColumnsType<TratamientoItem> = [
    {
      title: '#',
      dataIndex: 'no',
      width: 58,
      align: 'center',
      render: (value) => <span className="rx-table-index">{value}</span>,
    },
    {
      title: 'Medicamento',
      dataIndex: 'sustancia',
      render: (_, record) => (
        <div className="rx-med-info">
          <strong>{record.sustancia}</strong>
          <span>{record.indicacion}</span>
          <small>{record.observaciones}</small>
        </div>
      ),
    },
    {
      title: 'Vía',
      dataIndex: 'via',
      width: 150,
      align: 'center',
      render: (value) => <Tag className="rx-via-tag">{value}</Tag>,
    },
    {
      title: 'Acciones',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Button
          danger
          type="text"
          icon={<DeleteOutlined />}
          onClick={() => eliminarTratamiento(record.key)}
        />
      ),
    },
  ];

  const renderPrintableRecipe = () => (
    <section className="rx-print-template" id="rx-print-template">
      <div className="rx-print-watermark">MediSys</div>

      <header className="rx-template-header">
        <div className="rx-template-brand">
          <div className="rx-template-logo">
            <MedicineBoxOutlined />
          </div>

          <div>
            <h1>MediSys</h1>
            <p>Receta médica</p>
          </div>
        </div>

        <div className="rx-template-date">
          <span>Fecha de elaboración</span>
          <strong>{fechaElaboracion}</strong>
        </div>
      </header>

      <section className="rx-print-layout">
        <aside className="rx-print-sidebar">
          <div className="rx-template-doctor">
            <span>Médico tratante</span>
            <strong>Janeth Gomez</strong>
            <small>Médico</small>
          </div>

          <div className="rx-template-doctor">
            <span>Cédula profesional</span>
            <strong>__________________</strong>
          </div>

          <div className="rx-template-section">
            <h2>Paciente</h2>

            <div className="rx-template-box">
              <span>Nombre</span>
              <p>{nombreCompleto || 'Paciente sin nombre'}</p>
            </div>

            <div className="rx-template-mini-grid">
              <div>
                <span>Expediente</span>
                <strong>{paciente.numero_expediente || '-'}</strong>
              </div>

              <div>
                <span>Edad</span>
                <strong>{calcularEdad()}</strong>
              </div>

              <div>
                <span>Sexo</span>
                <strong>{paciente.sexo || '-'}</strong>
              </div>
            </div>
          </div>

          <div className="rx-template-section">
            <h2>Antecedentes</h2>

            <div className="rx-template-box">
              <span>Alergias</span>
              <p>{previewValues.alergias || 'NO REFIERE'}</p>
            </div>
          </div>
        </aside>

        <main className="rx-print-body">
          <section className="rx-template-section">
            <h2>Diagnóstico</h2>

            <div className="rx-template-box rx-template-box--diagnostic">
              <p>{previewValues.diagnostico || diagnosticoPrincipal}</p>
            </div>
          </section>

          <section className="rx-template-section rx-template-rx">
            <h2>Rp.</h2>

            {tratamientos.length === 0 ? (
              <div className="rx-template-empty">Sin tratamientos agregados.</div>
            ) : (
              <ol className="rx-template-treatment-list">
                {tratamientos.slice(0, 10).map((item) => (
                  <li key={item.key}>
                    <div>
                      <strong>{item.sustancia}</strong>
                      <p>{item.indicacion}</p>
                    </div>

                    <div>
                      <small>Vía: {item.via}</small>
                      {item.observaciones && item.observaciones !== 'Sin observaciones' && (
                        <em>{item.observaciones}</em>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="rx-template-section">
            <h2>Indicaciones generales</h2>

            <div className="rx-template-note">
              {previewValues.indicaciones_generales || 'Sin indicaciones generales.'}
            </div>
          </section>

          <section className="rx-template-follow">
            <div>
              <span>Próxima cita</span>
              <strong>{previewValues.requiere_proxima_cita ? 'Sí' : 'No'}</strong>
            </div>

            <div>
              <span>Estudios clínicos</span>
              <strong>{previewValues.estudios_clinicos ? 'Sí' : 'No'}</strong>
            </div>

            <div>
              <span>Detalle de estudios</span>
              <strong>{previewValues.detalle_estudios || '-'}</strong>
            </div>
          </section>
        </main>
      </section>

      <footer className="rx-template-footer">
        <div>
          <div className="rx-sign-line" />
          <strong>Firma del médico</strong>
        </div>

        <p>
          Esta receta es válida únicamente con firma del médico tratante. Acuda a revisión si
          presenta datos de alarma o reacción adversa al tratamiento.
        </p>
      </footer>
    </section>
  );

  const renderTratamientoCard = (item: TratamientoItem) => (
    <article className="rx-treatment-card" key={item.key}>
      <div className="rx-treatment-card__top">
        <div className="rx-treatment-card__number">{item.no}</div>

        <div className="rx-treatment-card__main">
          <strong>{item.sustancia}</strong>
          <span>{item.indicacion}</span>
        </div>

        <Button
          danger
          type="text"
          icon={<DeleteOutlined />}
          onClick={() => eliminarTratamiento(item.key)}
        />
      </div>

      <div className="rx-treatment-card__meta">
        <Tag className="rx-via-tag">{item.via}</Tag>
        <p>{item.observaciones}</p>
      </div>
    </article>
  );

  return (
    <div className="receta-page">
      <main className="rx-main">
        <header className="rx-hero">
          <div className="rx-hero__top">
            <Button icon={<ArrowLeftOutlined />} onClick={onBack} className="rx-back-btn">
              Volver
            </Button>

            <div className="rx-title-block">
              <div className="rx-hero__icon">
                <MedicineBoxOutlined />
              </div>

              <Title level={2}>Receta médica</Title>
            </div>

            <div className="rx-date-card">
              <CalendarOutlined />

              <div>
                <span>Fecha y hora de elaboración</span>
                <strong>{fechaElaboracion}</strong>
              </div>
            </div>
          </div>

          <section className="rx-patient-panel">
            <div className="rx-patient-header">
              <div className="rx-avatar-frame">
                <Avatar
                  size={70}
                  className="rx-avatar"
                  icon={!iniciales && <UserOutlined />}
                >
                  {iniciales}
                </Avatar>
              </div>

              <div className="rx-patient-data">
                <h2>{nombreCompleto || 'Paciente sin nombre'}</h2>

                <div className="rx-patient-meta">
                  <span>Expediente: {paciente.numero_expediente || 'Sin expediente'}</span>
                  <span>{calcularEdad()}</span>
                  <span>{paciente.sexo || '-'}</span>
                </div>

                <div className="rx-diagnostico-box">
                  <label>Diagnóstico</label>
                  <p>{diagnosticoPrincipal}</p>
                </div>

                <div className="rx-alergias-box">
                  <label>Alergias</label>
                  <p>{consulta?.alergias || 'No registradas'}</p>
                </div>
              </div>

              <div className="rx-status-card">
                <div
                  className="rx-progress-ring"
                  style={{ ['--rx-progress' as any]: `${progresoReceta}%` }}
                >
                  <span>{progresoReceta}%</span>
                </div>

                <div className="rx-status-content">
                  <span>Estado</span>
                  <strong>{tratamientos.length} medicamento(s)</strong>
                </div>

                <Button
                  icon={<CheckCircleOutlined />}
                  className="rx-finalizar-btn"
                  onClick={finalizarAtencion}
                >
                  Finalizar atención
                </Button>
              </div>
            </div>
          </section>
        </header>

        <Form
          form={form}
          layout="vertical"
          initialValues={{
            diagnostico: diagnosticoPrincipal,
            alergias: consulta?.alergias || 'NO REFIERE',
            cantidad_numero: 1,
            cantidad_unidad: 'tableta',
            frecuencia_numero: 8,
            frecuencia_unidad: 'horas',
            duracion_numero: 6,
            duracion_unidad: 'días',
            requiere_proxima_cita: false,
            estudios_clinicos: false,
          }}
        >
          <section className="rx-content-grid">
            <div className="rx-card rx-card--clinical">
              <div className="rx-card-title">
                <div>
                  <HeartOutlined />
                  <h3>Datos clínicos</h3>
                </div>
                <span>Signos y diagnóstico</span>
              </div>

              <Row gutter={[16, 10]}>
                <Col xs={24}>
                  <Form.Item name="diagnostico" label="Diagnóstico relacionado">
                    <Input.TextArea
                      autoSize={{ minRows: 2, maxRows: 4 }}
                      placeholder="Diagnóstico principal"
                    />
                  </Form.Item>
                </Col>

                <Col xs={24}>
                  <Form.Item name="alergias" label="Alergias">
                    <Input placeholder="Ej. Penicilina / No refiere" />
                  </Form.Item>
                </Col>

                <Col xs={24}>
                  <div className="rx-vitals-grid">
                    <Form.Item name="ta" label="T.A." initialValue={consulta?.presion_arterial}>
                      <Input addonAfter="mm/Hg" placeholder="120/80" />
                    </Form.Item>

                    <Form.Item name="fc" label="F.C." initialValue={consulta?.frecuencia_cardiaca}>
                      <Input addonAfter="xmin" placeholder="80" />
                    </Form.Item>

                    <Form.Item name="fr" label="F.R." initialValue={consulta?.frecuencia_respiratoria}>
                      <Input addonAfter="xmin" placeholder="18" />
                    </Form.Item>

                    <Form.Item name="temperatura" label="Temperatura" initialValue={consulta?.temperatura}>
                      <Input addonAfter="°C" placeholder="36.5" />
                    </Form.Item>

                    <Form.Item name="peso" label="Peso" initialValue={consulta?.peso}>
                      <Input addonAfter="Kg" placeholder="70" />
                    </Form.Item>

                    <Form.Item name="talla" label="Talla" initialValue={consulta?.talla}>
                      <Input addonAfter="m" placeholder="1.70" />
                    </Form.Item>

                    <Form.Item
                      name="abdomen"
                      label="C. abdomen"
                      initialValue={consulta?.circunferencia_abdomen}
                    >
                      <Input addonAfter="cm" placeholder="80" />
                    </Form.Item>

                    <Form.Item name="spo2" label="SpO₂" initialValue={consulta?.spo2}>
                      <Input addonAfter="%" placeholder="98" />
                    </Form.Item>
                  </div>
                </Col>
              </Row>
            </div>

            <div className="rx-card rx-card--treatment">
              <div className="rx-card-title">
                <div>
                  <MedicineBoxOutlined />
                  <h3>Tratamiento</h3>
                </div>
                <span>{tratamientos.length} medicamento(s)</span>
              </div>

              <div className="rx-builder">
                <div className="rx-builder-grid">
                  <Form.Item
                    name="sustancia"
                    label="Sustancia activa"
                    rules={[{ required: true, message: 'Selecciona la sustancia' }]}
                    className="rx-field-medicine"
                  >
                    <Select
                      showSearch
                      placeholder="Seleccione medicamento"
                      optionFilterProp="label"
                      options={opcionesSustancias}
                    />
                  </Form.Item>

                  <Form.Item
                    name="cantidad_numero"
                    label="Cantidad"
                    rules={[{ required: true, message: 'Cantidad' }]}
                  >
                    <InputNumber min={1} className="rx-number" />
                  </Form.Item>

                  <Form.Item name="cantidad_unidad" label="Unidad">
                    <Select options={opcionesUnidadCantidad} />
                  </Form.Item>

                  <Form.Item
                    name="frecuencia_numero"
                    label="Cada"
                    rules={[{ required: true, message: 'Frecuencia' }]}
                  >
                    <InputNumber min={1} className="rx-number" />
                  </Form.Item>

                  <Form.Item
                    className="rx-field-duracion-unidad"
                    name="frecuencia_unidad"
                    label="Unidad"
                  >
                    <Select options={opcionesUnidadFrecuencia} />
                  </Form.Item>

                  <Form.Item
                    name="duracion_numero"
                    label="Durante"
                    rules={[{ required: true, message: 'Duración' }]}
                  >
                    <InputNumber min={1} className="rx-number" />
                  </Form.Item>

                  <Form.Item name="duracion_unidad" label="Unidad">
                    <Select options={opcionesUnidadDuracion} />
                  </Form.Item>

                  <Form.Item
                    className="rx-field-via"
                    name="via_administracion"
                    label="Vía de administración"
                    rules={[{ required: true, message: 'Selecciona vía' }]}
                  >
                    <Select placeholder="Seleccione" options={opcionesVia} />
                  </Form.Item>

                  <Form.Item
                    name="observaciones_tratamiento"
                    label="Observaciones"
                    className="rx-field-notes"
                  >
                    <Input placeholder="Ej. Tomar después de alimentos" />
                  </Form.Item>

                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    className="rx-primary-btn rx-add-treatment-btn"
                    onClick={agregarTratamiento}
                  >
                    Agregar
                  </Button>
                </div>
              </div>

              <Table
                className="rx-treatment-table"
                columns={columnasTratamientos}
                dataSource={tratamientos}
                pagination={false}
                rowKey="key"
                locale={{
                  emptyText: <Empty description="Sin tratamientos agregados" />,
                }}
              />

              <div className="rx-treatment-cards">
                {tratamientos.length === 0 ? (
                  <div className="rx-empty-box">
                    <Empty description="Sin tratamientos agregados" />
                  </div>
                ) : (
                  tratamientos.map(renderTratamientoCard)
                )}
              </div>
            </div>
          </section>

          <section className="rx-card rx-follow-card">
            <div className="rx-card-title">
              <div>
                <FileDoneOutlined />
                <h3>Indicaciones y seguimiento</h3>
              </div>
              <span>Notas finales para el paciente</span>
            </div>

            <Row gutter={[16, 10]}>
              <Col xs={24} lg={16}>
                <Form.Item name="indicaciones_generales" label="Indicaciones generales">
                  <TextArea
                    rows={5}
                    placeholder="Ej. Reposo, hidratación, signos de alarma, medidas generales..."
                  />
                </Form.Item>
              </Col>

              <Col xs={24} lg={8}>
                <div className="rx-check-panel">
                  <Form.Item name="requiere_proxima_cita" valuePropName="checked">
                    <Checkbox>Programar próxima cita</Checkbox>
                  </Form.Item>

                  <Form.Item name="fecha_proxima_cita" label="Fecha próxima cita">
                    <DatePicker className="rx-full" placeholder="Seleccionar fecha" />
                  </Form.Item>

                  <Form.Item name="estudios_clinicos" valuePropName="checked">
                    <Checkbox>Solicitar estudios clínicos</Checkbox>
                  </Form.Item>
                </div>
              </Col>

              <Col xs={24}>
                <Form.Item name="detalle_estudios" label="Detalle de estudios clínicos">
                  <Input placeholder="Ej. Biometría hemática, química sanguínea, examen general de orina..." />
                </Form.Item>
              </Col>
            </Row>
          </section>

          <div className="rx-actions">
            <Space wrap>
              <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
                Regresar
              </Button>

              <Button icon={<EyeOutlined />} onClick={abrirVistaPrevia}>
                Vista previa
              </Button>

              <Button icon={<PrinterOutlined />} onClick={imprimirReceta}>
                Imprimir
              </Button>

              <Button
                type="primary"
                icon={<SaveOutlined />}
                className="rx-primary-btn"
                onClick={guardarReceta}
              >
                Guardar receta
              </Button>
            </Space>
          </div>
        </Form>
      </main>

      <div className="rx-print-only">{renderPrintableRecipe()}</div>

      <Modal
        className="rx-preview-modal"
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        width="82vw"
        centered={false}
        title={
          <div className="rx-preview-title">
            <MedicineBoxOutlined />
            <span>Vista previa de receta</span>
          </div>
        }
        footer={[
          <Button key="cerrar" onClick={() => setPreviewOpen(false)}>
            Cerrar
          </Button>,
          <Button key="imprimir" icon={<PrinterOutlined />} onClick={imprimirReceta}>
            Imprimir
          </Button>,
          <Button
            key="guardar"
            type="primary"
            icon={<SaveOutlined />}
            className="rx-primary-btn"
            onClick={guardarReceta}
          >
            Guardar receta
          </Button>,
        ]}
      >
        {renderPrintableRecipe()}
      </Modal>
    </div>
  );
};

export default Receta;