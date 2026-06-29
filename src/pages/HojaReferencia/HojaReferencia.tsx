import React, { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Checkbox,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Typography,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ClearOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  PlusOutlined,
  SaveOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import Swal from 'sweetalert2';
import './HojaReferencia.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

const PACIENTE_ATENCION_STORAGE_KEY = 'paciente_atencion_actual';
const CONSULTA_EXTERNA_ABIERTA_STORAGE_KEY = 'consulta_externa_abierta';

type PacienteData = {
  id?: number;
  nombre?: string;
  primer_apellido?: string;
  segundo_apellido?: string;
  fecha_nacimiento?: string;
  sexo?: string;
  edad?: number;
  expediente?: string;
  numero_expediente?: string;
  lugar_origen?: string;
  escolaridad?: string;
  estado_civil?: string;
  ocupacion?: string;
  curp?: string;
};

type DiagnosticoReferencia = {
  id: string;
  no: number;
  clave: string;
  diagnostico: string;
};

type HojaReferenciaForm = {
  escolaridad?: string;
  estado_civil?: string;
  ocupacion?: string;
  entidad?: string;
  municipio?: string;
  codigo_postal?: string;
  colonia?: string;
  calle?: string;
  numero_ext?: string;
  numero_int?: string;
  unidad_referencia?: string;
  servicio_referencia?: string;
  urgencia?: string;
  medico_nombre?: string;
  medico_cedula?: string;
  medico_universidad?: string;
  medico_unidad?: string;
  medico_direccion?: string;
  peso?: string;
  talla?: string;
  imc?: string;
  temperatura?: string;
  presion_arterial?: string;
  frecuencia_cardiaca?: string;
  frecuencia_respiratoria?: string;
  circunferencia_abdomen?: string;
  spo2?: string;
  motivo_referencia?: string;
  descripcion?: string;
  pronostico?: string;
  diagnostico_select?: string;
  terapeutica_empleada?: string;
  contrarreferencia?: boolean;
  especifique?: string;
};

const escolaridadOptions = [
  'SIN ESCOLARIDAD',
  'PRIMARIA',
  'SECUNDARIA',
  'BACHILLERATO',
  'LICENCIATURA O PROFESIONAL COMPLETA',
  'POSGRADO',
];

const estadoCivilOptions = [
  'SOLTERO(A)',
  'CASADO(A)',
  'UNIÓN LIBRE',
  'DIVORCIADO(A)',
  'VIUDO(A)',
];

const entidadOptions = ['PUEBLA', 'TLAXCALA', 'VERACRUZ', 'OAXACA', 'CDMX'];
const urgenciaOptions = ['NO', 'SÍ'];

const motivoReferenciaOptions = [
  'NO APLICA',
  'VALORACIÓN POR ESPECIALIDAD',
  'URGENCIA',
  'ESTUDIO COMPLEMENTARIO',
  'SEGUIMIENTO',
];

const diagnosticosCatalogo = [
  { clave: 'J00X', diagnostico: 'RINOFARINGITIS AGUDA [RESFRIADO COMÚN]' },
  { clave: 'I10X', diagnostico: 'HIPERTENSIÓN ESENCIAL' },
  { clave: 'E119', diagnostico: 'DIABETES MELLITUS TIPO 2 SIN COMPLICACIONES' },
  { clave: 'A09X', diagnostico: 'DIARREA Y GASTROENTERITIS DE PRESUNTO ORIGEN INFECCIOSO' },
];

const medicoDefault = {
  medico_nombre: 'JANETH GOMEZ RIOS',
  medico_cedula: '14987288',
  medico_universidad: 'BENEMÉRITA UNIVERSIDAD AUTÓNOMA DE PUEBLA',
  medico_unidad: 'TEPEXI DE RODRÍGUEZ 1 PUE. CONSULTORIO A',
  medico_direccion:
    '16 DE SEPTIEMBRE, A, 30, TEPEXI DE RODRÍGUEZ, 74690, TEPEXI DE RODRÍGUEZ, PUEBLA.',
};

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
    .trim()
    .toUpperCase();

const calcularEdad = (paciente?: PacienteData | null) => {
  if (paciente?.edad) return paciente.edad;
  if (!paciente?.fecha_nacimiento) return '—';
  return dayjs().diff(dayjs(paciente.fecha_nacimiento), 'year');
};

const HojaReferencia: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm<HojaReferenciaForm>();

  const [currentStep, setCurrentStep] = useState(0);
  const [pacienteActivo, setPacienteActivo] = useState<PacienteData | null>(() =>
    cargarPacienteActivo(),
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [diagnosticos, setDiagnosticos] = useState<DiagnosticoReferencia[]>([]);

  const nombreCompleto = useMemo(() => getFullName(pacienteActivo), [pacienteActivo]);
  const edadPaciente = useMemo(() => calcularEdad(pacienteActivo), [pacienteActivo]);
  const numeroExpediente =
    pacienteActivo?.numero_expediente || pacienteActivo?.expediente || '—';

  const initialValues: HojaReferenciaForm = {
    escolaridad: pacienteActivo?.escolaridad || undefined,
    estado_civil: pacienteActivo?.estado_civil || undefined,
    ocupacion: pacienteActivo?.ocupacion || '',
    entidad: 'PUEBLA',
    urgencia: 'NO',
    motivo_referencia: 'NO APLICA',
    contrarreferencia: false,
    ...medicoDefault,
  };

  const stepOneFields: (keyof HojaReferenciaForm)[] = [
    'unidad_referencia',
    'servicio_referencia',
    'urgencia',
  ];

  const stepTwoFields: (keyof HojaReferenciaForm)[] = [
    'motivo_referencia',
    'descripcion',
    'pronostico',
    'terapeutica_empleada',
    'contrarreferencia',
    'especifique',
  ];

  const diagnosticoColumns: ColumnsType<DiagnosticoReferencia> = [
    { title: 'No.', dataIndex: 'no', width: 70, align: 'center' },
    { title: 'Clave', dataIndex: 'clave', width: 120 },
    { title: 'Diagnóstico', dataIndex: 'diagnostico' },
  ];

  const handleBack = () => navigate('/hoja-referencia');

  const handleCancel = async () => {
    const result = await Swal.fire({
      title: '¿Cancelar hoja de referencia?',
      text: 'Se perderá la información capturada y regresarás al módulo de hoja de referencia.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'Continuar editando',
      confirmButtonColor: '#ff4d4f',
      cancelButtonColor: '#94a3b8',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    navigate('/hoja-referencia');
  };

  const handleNext = async () => {
    try {
      await form.validateFields(stepOneFields);
      setCurrentStep(1);
    } catch {
      message.warning('Completa los campos obligatorios.');
    }
  };

  const handleAgregarDiagnostico = () => {
    const value = form.getFieldValue('diagnostico_select');

    if (!value) {
      message.warning('Selecciona un diagnóstico.');
      return;
    }

    const selected = diagnosticosCatalogo.find((item) => item.clave === value);
    if (!selected) return;

    if (diagnosticos.some((item) => item.clave === selected.clave)) {
      message.warning('Este diagnóstico ya fue agregado.');
      return;
    }

    setDiagnosticos((prev) => [
      ...prev,
      {
        id: `${selected.clave}-${Date.now()}`,
        no: prev.length + 1,
        clave: selected.clave,
        diagnostico: selected.diagnostico,
      },
    ]);

    form.setFieldValue('diagnostico_select', undefined);
  };

  const handleEliminarDiagnostico = (id: string) => {
    setDiagnosticos((prev) =>
      prev
        .filter((item) => item.id !== id)
        .map((item, index) => ({
          ...item,
          no: index + 1,
        })),
    );
  };

  const validateAll = async () => {
    await form.validateFields([...stepOneFields, ...stepTwoFields]);

    if (!diagnosticos.length) {
      message.warning('Agrega al menos un diagnóstico de referencia.');
      throw new Error('Sin diagnóstico');
    }
  };

  const handlePreview = async () => {
    try {
      await validateAll();
      setPreviewOpen(true);
    } catch {
      message.warning('Completa los campos obligatorios.');
    }
  };

  const handleClear = async () => {
    const result = await Swal.fire({
      title: '¿Limpiar hoja de referencia?',
      text: 'Se borrará la información capturada.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, limpiar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ff4d4f',
      cancelButtonColor: '#94a3b8',
    });

    if (!result.isConfirmed) return;

    form.resetFields();
    form.setFieldsValue(initialValues);
    setDiagnosticos([]);
    setCurrentStep(0);
    message.success('Formulario limpiado correctamente.');
  };

  const handleSave = async () => {
    try {
      if (!pacienteActivo) {
        message.warning('No hay paciente activo.');
        return;
      }

      await validateAll();

      const values = form.getFieldsValue();

      setSaving(true);

      const payload = {
        id: crypto.randomUUID(),
        paciente_id: pacienteActivo.id,
        fecha_elaboracion: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        paciente: {
          id: pacienteActivo.id,
          nombre_completo: nombreCompleto,
          edad: edadPaciente,
          fecha_nacimiento: pacienteActivo.fecha_nacimiento,
          sexo: pacienteActivo.sexo,
          numero_expediente: numeroExpediente,
          lugar_origen: pacienteActivo.lugar_origen,
          curp: pacienteActivo.curp,
        },
        diagnosticos,
        ...values,
      };

      const hojasGuardadas = JSON.parse(
        localStorage.getItem('hojas_referencia_pacientes') || '[]',
      );

      localStorage.setItem(
        'hojas_referencia_pacientes',
        JSON.stringify([payload, ...hojasGuardadas]),
      );

      await Swal.fire({
        title: 'Hoja de referencia guardada',
        text: 'El registro se guardó correctamente.',
        icon: 'success',
        confirmButtonText: 'Aceptar',
        confirmButtonColor: '#159fa3',
      });

      setPreviewOpen(false);
    } catch {
      message.warning('Completa los campos obligatorios.');
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = async () => {
    const result = await Swal.fire({
      title: '¿Finalizar registro?',
      text: 'Se cerrará la hoja de referencia y se liberará el paciente activo.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, finalizar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ff4d4f',
      cancelButtonColor: '#94a3b8',
    });

    if (!result.isConfirmed) return;

    form.resetFields();
    localStorage.removeItem(PACIENTE_ATENCION_STORAGE_KEY);
    localStorage.removeItem(CONSULTA_EXTERNA_ABIERTA_STORAGE_KEY);
    setPacienteActivo(null);

    await Swal.fire({
      title: 'Registro finalizado',
      text: 'La hoja de referencia fue cerrada correctamente.',
      icon: 'success',
      timer: 1500,
      showConfirmButton: false,
    });

    navigate('/hoja-referencia', { replace: true });
  };

  const previewValues = form.getFieldsValue();

  if (!pacienteActivo) {
    return (
      <section className="referencia-page">
        <div className="referencia-shell">
          <div className="referencia-empty-state">
            <div className="referencia-empty-shape referencia-empty-shape-top" />
            <div className="referencia-empty-shape referencia-empty-shape-bottom" />

            <div className="referencia-empty-icon">
              <UserOutlined />
            </div>

            <div className="referencia-empty-badge">Hoja de referencia bloqueada</div>

            <h1>No hay paciente activo</h1>

            <p>
              Para generar una hoja de referencia, primero debes seleccionar un paciente
              desde el módulo de Pacientes.
            </p>

            <Button
              type="primary"
              icon={<UserOutlined />}
              className="referencia-empty-btn"
              onClick={() => navigate('/pacientes')}
            >
              Seleccionar paciente
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="referencia-page">
      <div className="referencia-shell">
        <div className="referencia-main-title">
          <Button icon={<ArrowLeftOutlined />} onClick={handleBack} className="referencia-back-btn">
            Regresar
          </Button>

          <div>
            <Title level={3}>HOJA DE REFERENCIA</Title>
            <Text>
              <strong>FECHA Y HORA DE ELABORACIÓN:</strong>{' '}
              {dayjs().format('YYYY-MM-DD HH:mm')}
            </Text>
          </div>
        </div>

        <Card className="referencia-form-card">
          <div className="referencia-paciente-card">
            <div className="referencia-paciente-badge">PACIENTE</div>

            <div className="referencia-paciente-main">
              <h2>{nombreCompleto}</h2>

              <div className="referencia-paciente-origin">
                <span>Lugar de Origen:</span>
                <strong>{pacienteActivo.lugar_origen || 'PUEBLA'}</strong>
              </div>
            </div>

            <div className="referencia-paciente-bottom">
              <div className="referencia-paciente-meta">
                <div>
                  <span>Edad:</span>
                  <strong>{edadPaciente} años</strong>
                </div>

                <div>
                  <strong>
                    {pacienteActivo.fecha_nacimiento
                      ? dayjs(pacienteActivo.fecha_nacimiento).format('DD/MM/YYYY')
                      : '—'}
                  </strong>
                </div>

                <div>
                  <strong>{pacienteActivo.sexo || '—'}</strong>
                </div>

                <div>
                  <span>No. Expediente:</span>
                  <strong>{numeroExpediente}</strong>
                </div>
              </div>

              <Button
                icon={<CheckCircleOutlined />}
                onClick={handleFinish}
                className="referencia-finalizar-paciente-btn"
              >
                Finalizar atención
              </Button>
            </div>
          </div>

          <Form
            form={form}
            layout="vertical"
            initialValues={initialValues}
            className="referencia-form"
          >
            <div className="referencia-wizard-steps">
              <button
                type="button"
                className={`referencia-wizard-step ${currentStep === 0 ? 'active' : 'done'}`}
                onClick={() => setCurrentStep(0)}
              >
                <span>1</span>
                <div>
                  <strong>Datos de referencia</strong>
                  <small>Paciente, domicilio y unidad</small>
                </div>
              </button>

              <div className={`referencia-step-line ${currentStep === 1 ? 'active' : ''}`} />

              <button
                type="button"
                className={`referencia-wizard-step ${currentStep === 1 ? 'active' : ''}`}
                onClick={handleNext}
              >
                <span>2</span>
                <div>
                  <strong>Médico y resumen clínico</strong>
                  <small>Signos, diagnóstico y contrarreferencia</small>
                </div>
              </button>
            </div>

            {currentStep === 0 && (
              <div className="referencia-wizard-panel">
                <div className="referencia-section-title">DATOS GENERALES</div>

                <Row gutter={[16, 8]}>
                  <Col xs={24} md={8}>
                    <Form.Item name="escolaridad" label="Escolaridad">
                      <Select
                        placeholder="Selecciona"
                        options={escolaridadOptions.map((item) => ({ label: item, value: item }))}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item name="estado_civil" label="Estado civil">
                      <Select
                        placeholder="Selecciona"
                        options={estadoCivilOptions.map((item) => ({ label: item, value: item }))}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item name="ocupacion" label="Ocupación">
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>

                <div className="referencia-section-title">DOMICILIO PACIENTE</div>

                <Row gutter={[16, 8]}>
                  <Col xs={24} md={12}>
                    <Form.Item name="entidad" label="Entidad">
                      <Select
                        placeholder="Selecciona"
                        options={entidadOptions.map((item) => ({ label: item, value: item }))}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item name="municipio" label="Municipio">
                      <Input />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item name="codigo_postal" label="Código postal">
                      <Input maxLength={5} />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item name="colonia" label="Colonia">
                      <Input />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item name="calle" label="Calle">
                      <Input />
                    </Form.Item>
                  </Col>

                  <Col xs={12} md={6}>
                    <Form.Item name="numero_ext" label="Número ext.">
                      <Input />
                    </Form.Item>
                  </Col>

                  <Col xs={12} md={6}>
                    <Form.Item name="numero_int" label="Número int.">
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>

                <div className="referencia-section-title">DATOS DE REFERENCIA</div>

                <Row gutter={[16, 8]}>
                  <Col xs={24} md={10}>
                    <Form.Item
                      name="unidad_referencia"
                      label="*Unidad a la que se refiere"
                      rules={[{ required: true, message: 'Ingresa la unidad a la que se refiere.' }]}
                    >
                      <Input />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={10}>
                    <Form.Item
                      name="servicio_referencia"
                      label="*Servicio al que refiere"
                      rules={[{ required: true, message: 'Ingresa el servicio al que se refiere.' }]}
                    >
                      <Input />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={4}>
                    <Form.Item
                      name="urgencia"
                      label="*Urgencia"
                      rules={[{ required: true, message: 'Selecciona urgencia.' }]}
                    >
                      <Select options={urgenciaOptions.map((item) => ({ label: item, value: item }))} />
                    </Form.Item>
                  </Col>
                </Row>
              </div>
            )}

            {currentStep === 1 && (
              <div className="referencia-wizard-panel">
                <div className="referencia-section-title">DATOS DEL MÉDICO QUE REFIERE</div>

                <div className="referencia-medico-readonly">
                  {[
                    ['Nombre del médico', medicoDefault.medico_nombre],
                    ['Cédula profesional', medicoDefault.medico_cedula],
                    ['Universidad de egreso', medicoDefault.medico_universidad],
                    ['Unidad de la que refiere', medicoDefault.medico_unidad],
                    ['Dirección del consultorio', medicoDefault.medico_direccion],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>

                <Form.Item name="medico_nombre" hidden><Input /></Form.Item>
                <Form.Item name="medico_cedula" hidden><Input /></Form.Item>
                <Form.Item name="medico_universidad" hidden><Input /></Form.Item>
                <Form.Item name="medico_unidad" hidden><Input /></Form.Item>
                <Form.Item name="medico_direccion" hidden><Input /></Form.Item>

                <div className="referencia-section-title">RESUMEN CLÍNICO</div>

                <div className="referencia-resumen-box">
                  <Row gutter={[14, 8]}>
                    {[
                      ['peso', 'Peso', 'Kg'],
                      ['talla', 'Talla', 'm'],
                      ['imc', 'IMC', 'Kg/m²'],
                      ['temperatura', 'Temp.', '°C'],
                      ['presion_arterial', 'T.A.', 'mm/Hg'],
                      ['frecuencia_cardiaca', 'F.C.', 'x min'],
                      ['frecuencia_respiratoria', 'F.R.', 'x min'],
                      ['circunferencia_abdomen', 'C. Abdom.', 'cm'],
                      ['spo2', 'SpO2', '%'],
                    ].map(([name, label, unit]) => (
                      <Col xs={12} sm={8} md={6} key={name}>
                        <Form.Item name={name} label={label}>
                          <Input addonAfter={unit} />
                        </Form.Item>
                      </Col>
                    ))}

                    <Col xs={24} md={10}>
                      <Form.Item
                        name="motivo_referencia"
                        label="*Motivo de referencia"
                        rules={[{ required: true, message: 'Selecciona el motivo de referencia.' }]}
                      >
                        <Select
                          options={motivoReferenciaOptions.map((item) => ({
                            label: item,
                            value: item,
                          }))}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24}>
                      <Form.Item
                        name="descripcion"
                        label="*Descripción"
                        rules={[{ required: true, message: 'Ingresa la descripción clínica.' }]}
                      >
                        <TextArea rows={3} />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item name="pronostico" label="Pronóstico">
                        <TextArea rows={3} />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item name="terapeutica_empleada" label="Terapéutica empleada">
                        <TextArea rows={3} />
                      </Form.Item>
                    </Col>
                  </Row>

                  <div className="referencia-diagnostico-panel">
                    <div className="referencia-diagnostico-area">
                      <Form.Item name="diagnostico_select" label="*Diagnóstico de referencia">
                        <Select
                          showSearch
                          placeholder="Seleccione..."
                          optionFilterProp="label"
                          options={diagnosticosCatalogo.map((item) => ({
                            label: `${item.clave} - ${item.diagnostico}`,
                            value: item.clave,
                          }))}
                        />
                      </Form.Item>

                      <Button
                        icon={<PlusOutlined />}
                        className="referencia-add-btn"
                        onClick={handleAgregarDiagnostico}
                      >
                        Agregar
                      </Button>
                    </div>

                    <Table
                      className="referencia-diagnostico-table"
                      columns={diagnosticoColumns}
                      dataSource={diagnosticos}
                      rowKey="id"
                      pagination={false}
                      locale={{ emptyText: 'Sin diagnósticos agregados' }}
                    />

                    <div className="referencia-diagnostico-cards">
                      {diagnosticos.length === 0 ? (
                        <div className="referencia-mobile-empty">Sin diagnósticos agregados</div>
                      ) : (
                        diagnosticos.map((item) => (
                          <div className="referencia-diagnostico-mobile-card" key={item.id}>
                            <div>
                              <span>No. {item.no}</span>
                              <strong>{item.clave}</strong>
                            </div>

                            <p>{item.diagnostico}</p>

                            <Button size="small" danger onClick={() => handleEliminarDiagnostico(item.id)}>
                              Quitar
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="referencia-contrarreferencia-box">
                    <Form.Item
                      name="contrarreferencia"
                      valuePropName="checked"
                      className="referencia-contrarreferencia-check"
                    >
                      <Checkbox>Contrarreferencia</Checkbox>
                    </Form.Item>

                    <Form.Item name="especifique" label="Especifique">
                      <TextArea rows={3} />
                    </Form.Item>
                  </div>
                </div>
              </div>
            )}

            <div className="referencia-actions">
              <Space wrap>
                <Button icon={<ClearOutlined />} onClick={handleClear}>
                  Limpiar
                </Button>

                {currentStep === 1 && <Button onClick={() => setCurrentStep(0)}>Anterior</Button>}

                {currentStep === 0 && (
                  <Button type="primary" onClick={handleNext} className="referencia-save-btn">
                    Siguiente
                  </Button>
                )}

                {currentStep === 1 && (
                  <>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      loading={saving}
                      onClick={handleSave}
                      className="referencia-save-btn"
                    >
                      Guardar
                    </Button>

                    <Button icon={<EyeOutlined />} onClick={handlePreview}>
                      Vista previa
                    </Button>
                  </>
                )}

                <Button danger onClick={handleCancel}>
                  Cancelar
                </Button>
              </Space>
            </div>
          </Form>
        </Card>
      </div>

      <Modal
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        width={980}
        centered
        className="referencia-preview-modal"
        title="Vista previa de hoja de referencia"
        footer={[
          <Button key="cancel" icon={<CloseCircleOutlined />} onClick={() => setPreviewOpen(false)}>
            Cerrar
          </Button>,
          <Button
            key="save"
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            onClick={handleSave}
            className="referencia-save-btn"
          >
            Guardar
          </Button>,
        ]}
      >
        <div className="referencia-preview">
          <div className="referencia-preview-header">
            <h2>HOJA DE REFERENCIA</h2>
            <span>{dayjs().format('YYYY-MM-DD HH:mm')}</span>
          </div>

          <div className="referencia-preview-patient">
            <strong>{nombreCompleto}</strong>
            <span>Edad: {edadPaciente} años</span>
            <span>Sexo: {pacienteActivo.sexo || '—'}</span>
            <span>Expediente: {numeroExpediente}</span>
          </div>

          <div className="referencia-preview-grid">
            <section>
              <h3>Médico que refiere</h3>
              <p><b>Nombre:</b> {previewValues.medico_nombre || '—'}</p>
              <p><b>Cédula:</b> {previewValues.medico_cedula || '—'}</p>
              <p><b>Unidad:</b> {previewValues.medico_unidad || '—'}</p>
            </section>

            <section>
              <h3>Resumen clínico</h3>
              <p><b>Peso:</b> {previewValues.peso || '—'} Kg</p>
              <p><b>Talla:</b> {previewValues.talla || '—'} m</p>
              <p><b>IMC:</b> {previewValues.imc || '—'}</p>
              <p><b>Temp:</b> {previewValues.temperatura || '—'} °C</p>
              <p><b>T.A.:</b> {previewValues.presion_arterial || '—'}</p>
              <p><b>SpO2:</b> {previewValues.spo2 || '—'} %</p>
            </section>
          </div>

          <section className="referencia-preview-section">
            <h3>Motivo y evolución</h3>
            <p><b>Motivo:</b> {previewValues.motivo_referencia || '—'}</p>
            <p><b>Descripción:</b> {previewValues.descripcion || '—'}</p>
            <p><b>Pronóstico:</b> {previewValues.pronostico || '—'}</p>
            <p><b>Terapéutica empleada:</b> {previewValues.terapeutica_empleada || '—'}</p>
            <p><b>Contrarreferencia:</b> {previewValues.contrarreferencia ? 'Sí' : 'No'}</p>
            <p><b>Especifique:</b> {previewValues.especifique || '—'}</p>
          </section>

          <section className="referencia-preview-section">
            <h3>Diagnósticos</h3>

            <div className="referencia-preview-diagnosticos">
              {diagnosticos.map((item) => (
                <div key={item.id}>
                  <span>{item.no}</span>
                  <strong>{item.clave}</strong>
                  <p>{item.diagnostico}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </Modal>
    </section>
  );
};

export default HojaReferencia;