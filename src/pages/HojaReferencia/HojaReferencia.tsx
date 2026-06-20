import React, { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  Row,
  Select,
  Space,
  Typography,
  Modal,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  EyeOutlined,
  ClearOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  CloseCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import Swal from 'sweetalert2';
import './HojaReferencia.css';

const { Title, Text } = Typography;

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
  medico_especialidad?: string;
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

  const [pacienteActivo, setPacienteActivo] = useState<PacienteData | null>(() =>
    cargarPacienteActivo(),
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const nombreCompleto = useMemo(
    () => getFullName(pacienteActivo),
    [pacienteActivo],
  );

  const edadPaciente = useMemo(
    () => calcularEdad(pacienteActivo),
    [pacienteActivo],
  );

  const numeroExpediente =
    pacienteActivo?.numero_expediente || pacienteActivo?.expediente || '—';

  const initialValues: HojaReferenciaForm = {
    escolaridad: pacienteActivo?.escolaridad || undefined,
    estado_civil: pacienteActivo?.estado_civil || undefined,
    ocupacion: pacienteActivo?.ocupacion || '',
    entidad: undefined,
    municipio: undefined,
    urgencia: undefined,
  };

  const handleBack = () => {
    navigate('/historico-paciente');
  };

  const handlePreview = async () => {
    try {
      await form.validateFields();
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
      confirmButtonColor: '#159fa3',
      cancelButtonColor: '#8b98a8',
    });

    if (!result.isConfirmed) return;

    form.resetFields();
    form.setFieldsValue(initialValues);
    message.success('Formulario limpiado correctamente.');
  };

  const handleSave = async () => {
    try {
      if (!pacienteActivo) {
        message.warning('No hay paciente activo.');
        return;
      }

      const values = await form.validateFields();

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
      confirmButtonColor: '#159fa3',
      cancelButtonColor: '#8b98a8',
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

    navigate('/pacientes', { replace: true });
  };

  const previewValues = form.getFieldsValue();

  if (!pacienteActivo) {
    return (
      <section className="referencia-page">
        <div className="referencia-shell">
          <Card className="referencia-form-card">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No hay paciente activo para generar la hoja de referencia."
            />

            <div className="referencia-actions">
              <Button
                type="primary"
                icon={<UserOutlined />}
                className="referencia-save-btn"
                onClick={() => navigate('/pacientes')}
              >
                Seleccionar paciente
              </Button>
            </div>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className="referencia-page">
      <div className="referencia-shell">
        <div className="referencia-main-title">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
            className="referencia-back-btn"
          >
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

<div className="referencia-paciente-content">

  <div className="referencia-paciente-top">
    <div className="referencia-paciente-main">
      <h2>{nombreCompleto}</h2>

      <div className="referencia-paciente-origin">
        <span>Lugar de Origen:</span>
        <strong>{pacienteActivo.lugar_origen || 'PUEBLA'}</strong>
      </div>
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
          {dayjs(pacienteActivo.fecha_nacimiento).format('DD/MM/YYYY')}
        </strong>
      </div>

      <div>
        <strong>{pacienteActivo.sexo}</strong>
      </div>

      <div>
        <span>No. Expediente:</span>
        <strong>{numeroExpediente}</strong>
      </div>

    </div>

    <div className="referencia-finalizar-wrapper">
      <Button
        icon={<CheckCircleOutlined />}
        onClick={handleFinish}
        className="referencia-finalizar-paciente-btn"
      >
        Finalizar atención
      </Button>
    </div>
  </div>

</div>
        </div>

          <Form
            form={form}
            layout="vertical"
            initialValues={initialValues}
            className="referencia-form"
          >
            <Row gutter={[20, 10]} className="referencia-general-row">
              <Col xs={24} md={8}>
                <Form.Item name="escolaridad" label="Escolaridad">
                  <Select
                    placeholder="Selecciona"
                    options={escolaridadOptions.map((item) => ({
                      label: item,
                      value: item,
                    }))}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item name="estado_civil" label="Estado civil">
                  <Select
                    placeholder="Selecciona"
                    options={estadoCivilOptions.map((item) => ({
                      label: item,
                      value: item,
                    }))}
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

            <Row gutter={[22, 8]}>
              <Col xs={24} md={12}>
                <Form.Item name="entidad" label="Entidad">
                  <Select
                    placeholder="Selecciona"
                    options={entidadOptions.map((item) => ({
                      label: item,
                      value: item,
                    }))}
                  />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item name="municipio" label="Municipio">
                  <Input />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item name="codigo_postal" label="Código postal">
                  <Input maxLength={5} />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
                <Form.Item name="colonia" label="Colonia">
                  <Input />
                </Form.Item>
              </Col>

              <Col xs={24} md={12}>
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

            <div className="referencia-separator" />

            <Row gutter={[16, 8]}>
              <Col xs={24}>
                <Form.Item
                  name="unidad_referencia"
                  label="*Unidad a la que se refiere"
                  rules={[
                    {
                      required: true,
                      message: 'Ingresa la unidad a la que se refiere.',
                    },
                  ]}
                >
                  <Input />
                </Form.Item>
              </Col>

              <Col xs={24}>
                <Form.Item
                  name="servicio_referencia"
                  label="*Servicio al que refiere"
                  rules={[
                    {
                      required: true,
                      message: 'Ingresa el servicio al que se refiere.',
                    },
                  ]}
                >
                  <Input />
                </Form.Item>
              </Col>

              <Col xs={24} sm={8} md={4}>
                <Form.Item
                  name="urgencia"
                  label="*Urgencia"
                  rules={[
                    {
                      required: true,
                      message: 'Selecciona urgencia.',
                    },
                  ]}
                >
                  <Select
                    options={urgenciaOptions.map((item) => ({
                      label: item,
                      value: item,
                    }))}
                  />
                </Form.Item>
              </Col>
            </Row>

            <div className="referencia-section-title referencia-medico-title">
              DATOS DEL MÉDICO QUE REFIERE
            </div>

            <Row gutter={[16, 8]}>
              <Col xs={24} md={8}>
                <Form.Item name="medico_nombre" label="Nombre del médico">
                  <Input />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item name="medico_cedula" label="Cédula profesional">
                  <Input />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item name="medico_especialidad" label="Especialidad">
                  <Input />
                </Form.Item>
              </Col>
            </Row>

            <div className="referencia-actions">
              <Space wrap>
                <Button icon={<ClearOutlined />} onClick={handleClear}>
                  Limpiar
                </Button>

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

                <Button danger onClick={handleBack}>
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
        width={900}
        centered
        title="Vista previa de hoja de referencia"
        footer={[
          <Button
            key="cancel"
            icon={<CloseCircleOutlined />}
            onClick={() => setPreviewOpen(false)}
          >
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
          <div className="preview-title">HOJA DE REFERENCIA</div>

          <div className="preview-patient">
            <strong>{nombreCompleto}</strong>
            <span>Edad: {edadPaciente}</span>
            <span>Sexo: {pacienteActivo.sexo || '—'}</span>
            <span>Expediente: {numeroExpediente}</span>
          </div>

          <p><b>Escolaridad:</b> {previewValues.escolaridad || '—'}</p>
          <p><b>Estado civil:</b> {previewValues.estado_civil || '—'}</p>
          <p><b>Ocupación:</b> {previewValues.ocupacion || '—'}</p>
          <p><b>Entidad:</b> {previewValues.entidad || '—'}</p>
          <p><b>Municipio:</b> {previewValues.municipio || '—'}</p>
          <p><b>Código postal:</b> {previewValues.codigo_postal || '—'}</p>
          <p><b>Colonia:</b> {previewValues.colonia || '—'}</p>
          <p><b>Calle:</b> {previewValues.calle || '—'}</p>
          <p><b>Número ext.:</b> {previewValues.numero_ext || '—'}</p>
          <p><b>Número int.:</b> {previewValues.numero_int || '—'}</p>
          <p><b>Unidad a la que se refiere:</b> {previewValues.unidad_referencia || '—'}</p>
          <p><b>Servicio al que refiere:</b> {previewValues.servicio_referencia || '—'}</p>
          <p><b>Urgencia:</b> {previewValues.urgencia || '—'}</p>
          <p><b>Médico:</b> {previewValues.medico_nombre || '—'}</p>
          <p><b>Cédula:</b> {previewValues.medico_cedula || '—'}</p>
          <p><b>Especialidad:</b> {previewValues.medico_especialidad || '—'}</p>
        </div>
      </Modal>
    </section>
  );
};

export default HojaReferencia;