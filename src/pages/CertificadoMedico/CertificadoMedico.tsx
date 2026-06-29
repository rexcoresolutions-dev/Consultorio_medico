import React, { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Space,
  Typography,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ClearOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  SaveOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import Swal from 'sweetalert2';
import './CertificadoMedico.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

const PACIENTE_ATENCION_STORAGE_KEY = 'paciente_atencion_actual';
const CONSULTA_EXTERNA_ABIERTA_STORAGE_KEY = 'consulta_externa_abierta';
const CERTIFICADOS_MEDICOS_STORAGE_KEY = 'certificados_medicos_pacientes';

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
};

type CertificadoMedicoForm = {
  presion_arterial?: string;
  frecuencia_cardiaca?: string;
  frecuencia_respiratoria?: string;
  temperatura?: string;
  peso?: string;
  talla?: string;
  circunferencia_abdomen?: string;
  spo2?: string;
  detalle?: string;
  ciudad?: string;
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

const CertificadoMedico: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm<CertificadoMedicoForm>();

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

  const initialValues: CertificadoMedicoForm = {
    ciudad: 'TEPEXI DE RODRÍGUEZ, PUEBLA.',
  };

  const handleBack = () => {
    navigate('/historico-paciente');
  };

  const handleCancel = async () => {
    const result = await Swal.fire({
      title: '¿Cancelar certificado médico?',
      text: 'Se perderá la información capturada.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'Continuar editando',
      confirmButtonColor: '#ff4d4f',
      cancelButtonColor: '#94a3b8',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    navigate('/historico-paciente');
  };

  const handleClear = async () => {
    const result = await Swal.fire({
      title: '¿Limpiar certificado médico?',
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
    message.success('Formulario limpiado correctamente.');
  };

  const validateAll = async () => {
    await form.validateFields(['detalle']);
  };

  const handlePreview = async () => {
    try {
      await validateAll();
      setPreviewOpen(true);
    } catch {
      message.warning('Completa los campos obligatorios.');
    }
  };

  const handleSave = async () => {
    try {
      if (!pacienteActivo) {
        message.warning('No hay paciente activo.');
        return;
      }

      await validateAll();

      setSaving(true);

      const values = form.getFieldsValue();

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
        },
        ...values,
      };

      const guardados = JSON.parse(
        localStorage.getItem(CERTIFICADOS_MEDICOS_STORAGE_KEY) || '[]',
      );

      localStorage.setItem(
        CERTIFICADOS_MEDICOS_STORAGE_KEY,
        JSON.stringify([payload, ...guardados]),
      );

      await Swal.fire({
        title: 'Certificado médico guardado',
        text: 'El certificado se guardó correctamente.',
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
      title: '¿Finalizar atención?',
      text: 'Se cerrará el registro y se liberará el paciente activo.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, finalizar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ff4d4f',
      cancelButtonColor: '#94a3b8',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    form.resetFields();
    localStorage.removeItem(PACIENTE_ATENCION_STORAGE_KEY);
    localStorage.removeItem(CONSULTA_EXTERNA_ABIERTA_STORAGE_KEY);
    setPacienteActivo(null);

    await Swal.fire({
      title: 'Atención finalizada',
      text: 'El paciente activo fue liberado correctamente.',
      icon: 'success',
      timer: 1500,
      showConfirmButton: false,
    });

    navigate('/certificado-medico', { replace: true });
  };

  const previewValues = form.getFieldsValue();

  if (!pacienteActivo) {
    return (
      <section className="certificado-page">
        <div className="certificado-shell">
          <div className="certificado-empty-state">
            <div className="certificado-empty-shape certificado-empty-shape-top" />
            <div className="certificado-empty-shape certificado-empty-shape-bottom" />

            <div className="certificado-empty-icon">
              <UserOutlined />
            </div>

            <div className="certificado-empty-badge">
              Certificado médico bloqueado
            </div>

            <h1>No hay paciente activo</h1>

            <p>
              Para generar un certificado médico, primero debes seleccionar un
              paciente desde el módulo de Pacientes.
            </p>

            <Button
              type="primary"
              icon={<UserOutlined />}
              className="certificado-empty-btn"
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
    <section className="certificado-page">
      <div className="certificado-shell">
        <div className="certificado-main-title">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
            className="certificado-back-btn"
          >
            Regresar
          </Button>

          <div>
            <Title level={3}>CERTIFICADO MÉDICO</Title>
            <Text>
              <strong>FECHA Y HORA DE ELABORACIÓN:</strong>{' '}
              {dayjs().format('YYYY-MM-DD HH:mm')}
            </Text>
          </div>
        </div>

        <Card className="certificado-form-card">
          <div className="certificado-paciente-card">
            <div className="certificado-paciente-badge">PACIENTE</div>

            <div className="certificado-paciente-main">
              <h2>{nombreCompleto}</h2>
            </div>

            <div className="certificado-paciente-bottom">
              <div className="certificado-paciente-meta">
                <div>
                  <span>Edad:</span>
                  <strong>{edadPaciente} años</strong>
                </div>

                <div>
                  <strong>
                    {pacienteActivo.fecha_nacimiento
                      ? dayjs(pacienteActivo.fecha_nacimiento).format(
                          'DD/MM/YYYY',
                        )
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
                className="certificado-finalizar-btn"
              >
                Finalizar atención
              </Button>
            </div>
          </div>

          <Form
            form={form}
            layout="vertical"
            initialValues={initialValues}
            className="certificado-form"
          >
            <div className="certificado-panel">
              <div className="certificado-layout">
                <aside className="certificado-signos-card">
                  <div className="certificado-section-title mini">
                    SIGNOS VITALES
                  </div>

                  <Form.Item name="presion_arterial" label="T.A.">
                    <Input addonAfter="mm/Hg" />
                  </Form.Item>

                  <Form.Item name="frecuencia_cardiaca" label="F.C.">
                    <Input addonAfter="x min" />
                  </Form.Item>

                  <Form.Item name="frecuencia_respiratoria" label="F.R.">
                    <Input addonAfter="x min" />
                  </Form.Item>

                  <Form.Item name="temperatura" label="Temp.">
                    <Input addonAfter="°C" />
                  </Form.Item>

                  <Form.Item name="peso" label="Peso">
                    <Input addonAfter="Kg" />
                  </Form.Item>

                  <Form.Item name="talla" label="Talla">
                    <Input addonAfter="m" />
                  </Form.Item>

                  <Form.Item name="circunferencia_abdomen" label="C. Abdomen">
                    <Input addonAfter="cm" />
                  </Form.Item>

                  <Form.Item name="spo2" label="SpO2">
                    <Input addonAfter="%" />
                  </Form.Item>
                </aside>

                <main className="certificado-detalle-card">
                  <div className="certificado-section-title">
                    DETALLE DEL CERTIFICADO
                  </div>

                  <Form.Item
                    name="detalle"
                    label="*Detalle"
                    rules={[
                      {
                        required: true,
                        message: 'Ingresa el detalle del certificado.',
                      },
                    ]}
                  >
                    <TextArea
                      rows={14}
                      placeholder="Escribe aquí el contenido del certificado médico..."
                    />
                  </Form.Item>

                  <div className="certificado-leyenda">
                    <span>
                      *Se extiende el presente certificado para los fines que al
                      interesado convengan, en la ciudad de:
                    </span>

                    <Form.Item name="ciudad">
                      <Input />
                    </Form.Item>
                  </div>
                </main>
              </div>
            </div>

            <div className="certificado-actions">
              <Space wrap>
                <Button icon={<ClearOutlined />} onClick={handleClear}>
                  Limpiar
                </Button>

                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={saving}
                  onClick={handleSave}
                  className="certificado-save-btn"
                >
                  Guardar
                </Button>

                <Button icon={<EyeOutlined />} onClick={handlePreview}>
                  Vista previa
                </Button>

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
        className="certificado-preview-modal"
        title="Vista previa de certificado médico"
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
            className="certificado-save-btn"
          >
            Guardar
          </Button>,
        ]}
      >
        <div className="certificado-preview">
          <div className="certificado-preview-header">
            <h2>CERTIFICADO MÉDICO</h2>
            <span>{dayjs().format('YYYY-MM-DD HH:mm')}</span>
          </div>

          <div className="certificado-preview-patient">
            <strong>{nombreCompleto}</strong>
            <span>Edad: {edadPaciente} años</span>
            <span>Sexo: {pacienteActivo.sexo || '—'}</span>
            <span>Expediente: {numeroExpediente}</span>
          </div>

          <section className="certificado-preview-grid">
            <div>
              <h3>Signos vitales</h3>
              <p><b>T.A.:</b> {previewValues.presion_arterial || '—'} mm/Hg</p>
              <p><b>F.C.:</b> {previewValues.frecuencia_cardiaca || '—'} x min</p>
              <p><b>F.R.:</b> {previewValues.frecuencia_respiratoria || '—'} x min</p>
              <p><b>Temp.:</b> {previewValues.temperatura || '—'} °C</p>
              <p><b>Peso:</b> {previewValues.peso || '—'} Kg</p>
              <p><b>Talla:</b> {previewValues.talla || '—'} m</p>
              <p><b>C. Abdomen:</b> {previewValues.circunferencia_abdomen || '—'} cm</p>
              <p><b>SpO2:</b> {previewValues.spo2 || '—'} %</p>
            </div>

            <div>
              <h3>Detalle</h3>
              <p>{previewValues.detalle || '—'}</p>
            </div>
          </section>

          <section className="certificado-preview-footer">
            <p>
              *Se extiende el presente certificado para los fines que al
              interesado convengan, en la ciudad de:{' '}
              <b>{previewValues.ciudad || '—'}</b>
            </p>
          </section>
        </div>
      </Modal>
    </section>
  );
};

export default CertificadoMedico;