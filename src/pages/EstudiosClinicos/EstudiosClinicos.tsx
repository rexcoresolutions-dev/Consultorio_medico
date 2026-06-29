import React, { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Typography,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ClearOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EyeOutlined,
  PlusOutlined,
  SaveOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import Swal from 'sweetalert2';
import './EstudiosClinicos.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

const PACIENTE_ATENCION_STORAGE_KEY = 'paciente_atencion_actual';
const CONSULTA_EXTERNA_ABIERTA_STORAGE_KEY = 'consulta_externa_abierta';
const ESTUDIOS_CLINICOS_STORAGE_KEY = 'estudios_clinicos_pacientes';

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
  curp?: string;
};

type CatalogoItem = {
  clave: string;
  nombre: string;
};

type ItemSeleccionado = CatalogoItem & {
  id: string;
  no: number;
};

type EstudiosForm = {
  estudio_select?: string;
  otras_pruebas?: string;
  diagnostico_select?: string;
};

const catalogoEstudios: CatalogoItem[] = [
  { clave: '4', nombre: 'ALBÚMINA' },
  { clave: '26', nombre: 'AC. ANTI RUBEOLA IgG' },
  { clave: '27', nombre: 'AC. ANTI RUBEOLA IgM' },
  { clave: '31', nombre: 'AC. ANTIHELICOBACTER PYLORI IgA' },
  { clave: '37', nombre: 'ANTÍGENO CARCINOEMBRIONARIO' },
  { clave: '39', nombre: 'ANTÍGENO AUSTRALIA (ANTI HEPATITIS B)' },
  { clave: '40', nombre: 'BAAR 3 MUESTRA (EXPECTORACIÓN)' },
  { clave: '41', nombre: 'BILIRRUBINA DIRECTA' },
  { clave: '42', nombre: 'BILIRRUBINA INDIRECTA' },
  { clave: '43', nombre: 'BILIRRUBINA TOTAL' },
  { clave: '44', nombre: 'BILIRRUBINAS (TOTAL, DIRECTA, INDIRECTA)' },
  { clave: '45', nombre: 'BIOMETRÍA HEMÁTICA' },
  { clave: '52', nombre: 'QUÍMICA SANGUÍNEA' },
  { clave: '61', nombre: 'EXAMEN GENERAL DE ORINA' },
  { clave: '72', nombre: 'GLUCOSA EN SANGRE' },
  { clave: '90', nombre: 'PERFIL LIPÍDICO' },
  { clave: '101', nombre: 'PRUEBAS DE FUNCIÓN HEPÁTICA' },
  { clave: '118', nombre: 'RADIOGRAFÍA DE TÓRAX' },
  { clave: '135', nombre: 'ULTRASONIDO ABDOMINAL' },
  { clave: '150', nombre: 'ELECTROCARDIOGRAMA' },
];

const catalogoDiagnosticos: CatalogoItem[] = [
  { clave: 'J00X', nombre: 'RINOFARINGITIS AGUDA [RESFRIADO COMÚN]' },
  { clave: 'I10X', nombre: 'HIPERTENSIÓN ESENCIAL' },
  { clave: 'E119', nombre: 'DIABETES MELLITUS TIPO 2 SIN COMPLICACIONES' },
  { clave: 'A09X', nombre: 'DIARREA Y GASTROENTERITIS DE PRESUNTO ORIGEN INFECCIOSO' },
  { clave: 'K297', nombre: 'GASTRITIS NO ESPECIFICADA' },
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
    .trim()
    .toUpperCase();

const calcularEdad = (paciente?: PacienteData | null) => {
  if (paciente?.edad) return paciente.edad;
  if (!paciente?.fecha_nacimiento) return '—';
  return dayjs().diff(dayjs(paciente.fecha_nacimiento), 'year');
};

const EstudiosClinicos: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm<EstudiosForm>();

  const [pacienteActivo, setPacienteActivo] = useState<PacienteData | null>(() =>
    cargarPacienteActivo(),
  );
  const [estudios, setEstudios] = useState<ItemSeleccionado[]>([]);
  const [diagnosticos, setDiagnosticos] = useState<ItemSeleccionado[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const nombreCompleto = useMemo(() => getFullName(pacienteActivo), [pacienteActivo]);
  const edadPaciente = useMemo(() => calcularEdad(pacienteActivo), [pacienteActivo]);
  const numeroExpediente =
    pacienteActivo?.numero_expediente || pacienteActivo?.expediente || '—';

  const handleBack = () => navigate('/historico-paciente');

  const handleCancel = async () => {
    const result = await Swal.fire({
      title: '¿Cancelar estudios clínicos?',
      text: 'Se perderá la información capturada.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'Continuar editando',
      confirmButtonColor: '#ff4d4f',
      cancelButtonColor: '#94a3b8',
      reverseButtons: true,
    });

    if (result.isConfirmed) navigate('/historico-paciente');
  };

  const agregarItem = (
    value: string | undefined,
    catalogo: CatalogoItem[],
    actual: ItemSeleccionado[],
    setter: React.Dispatch<React.SetStateAction<ItemSeleccionado[]>>,
    fieldName: keyof EstudiosForm,
    mensaje: string,
  ) => {
    if (!value) {
      message.warning(mensaje);
      return;
    }

    const selected = catalogo.find((item) => item.clave === value);
    if (!selected) return;

    if (actual.some((item) => item.clave === selected.clave)) {
      message.warning('Este elemento ya fue agregado.');
      return;
    }

    setter((prev) => [
      ...prev,
      {
        ...selected,
        id: `${selected.clave}-${Date.now()}`,
        no: prev.length + 1,
      },
    ]);

    form.setFieldValue(fieldName, undefined);
  };

  const eliminarItem = (
    id: string,
    setter: React.Dispatch<React.SetStateAction<ItemSeleccionado[]>>,
  ) => {
    setter((prev) =>
      prev
        .filter((item) => item.id !== id)
        .map((item, index) => ({ ...item, no: index + 1 })),
    );
  };

  const handleAgregarEstudio = () => {
    agregarItem(
      form.getFieldValue('estudio_select'),
      catalogoEstudios,
      estudios,
      setEstudios,
      'estudio_select',
      'Selecciona un estudio.',
    );
  };

  const handleAgregarDiagnostico = () => {
    agregarItem(
      form.getFieldValue('diagnostico_select'),
      catalogoDiagnosticos,
      diagnosticos,
      setDiagnosticos,
      'diagnostico_select',
      'Selecciona un diagnóstico.',
    );
  };

  const validateAll = async () => {
    await form.validateFields();

    if (!estudios.length) {
      message.warning('Agrega al menos un estudio clínico.');
      throw new Error('Sin estudios');
    }

    if (!diagnosticos.length) {
      message.warning('Agrega al menos un diagnóstico.');
      throw new Error('Sin diagnósticos');
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
      title: '¿Limpiar estudios clínicos?',
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
    setEstudios([]);
    setDiagnosticos([]);
    message.success('Formulario limpiado correctamente.');
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
          curp: pacienteActivo.curp,
        },
        estudios,
        diagnosticos,
        ...values,
      };

      const guardados = JSON.parse(
        localStorage.getItem(ESTUDIOS_CLINICOS_STORAGE_KEY) || '[]',
      );

      localStorage.setItem(
        ESTUDIOS_CLINICOS_STORAGE_KEY,
        JSON.stringify([payload, ...guardados]),
      );

      await Swal.fire({
        title: 'Estudios clínicos guardados',
        text: 'La solicitud se guardó correctamente.',
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

    navigate('/estudios-clinicos', { replace: true });
  };

  const previewValues = form.getFieldsValue();

  if (!pacienteActivo) {
    return (
      <section className="estudios-page">
        <div className="estudios-shell">
          <div className="estudios-empty-state">
            <div className="estudios-empty-shape estudios-empty-shape-top" />
            <div className="estudios-empty-shape estudios-empty-shape-bottom" />

            <div className="estudios-empty-icon">
              <UserOutlined />
            </div>

            <div className="estudios-empty-badge">Estudios clínicos bloqueados</div>

            <h1>No hay paciente activo</h1>

            <p>
              Para solicitar estudios clínicos y de gabinete, primero debes seleccionar
              un paciente desde el módulo de Pacientes.
            </p>

            <Button
              type="primary"
              icon={<UserOutlined />}
              className="estudios-empty-btn"
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
    <section className="estudios-page">
      <div className="estudios-shell">
        <div className="estudios-main-title">

          <div>
            <Title level={3}>ESTUDIOS CLÍNICOS Y DE GABINETE</Title>
            <Text>
              <strong>FECHA Y HORA DE ELABORACIÓN:</strong>{' '}
              {dayjs().format('YYYY-MM-DD HH:mm')}
            </Text>
          </div>
        </div>

        <Card className="estudios-form-card">
          <div className="estudios-paciente-card">
            <div className="estudios-paciente-badge">PACIENTE</div>

            <div className="estudios-paciente-main">
              <h2>{nombreCompleto}</h2>

              <div className="estudios-paciente-origin">
                <span>Lugar de Origen:</span>
                <strong>{pacienteActivo.lugar_origen || 'PUEBLA'}</strong>
              </div>
            </div>

            <div className="estudios-paciente-bottom">
              <div className="estudios-paciente-meta">
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
                className="estudios-finalizar-btn"
              >
                Finalizar atención
              </Button>
            </div>
          </div>

          <Form form={form} layout="vertical" className="estudios-form">
            <div className="estudios-panel">
              <div className="estudios-section-title">SELECCIÓN DE ESTUDIOS</div>

              <div className="estudios-selector">
                <Form.Item name="estudio_select" label="*Estudios">
                  <Select
                    showSearch
                    placeholder="Busca por clave o nombre del estudio..."
                    optionFilterProp="label"
                    options={catalogoEstudios.map((item) => ({
                      label: `${item.clave} - ${item.nombre}`,
                      value: item.clave,
                    }))}
                  />
                </Form.Item>

                <Button
                  icon={<PlusOutlined />}
                  className="estudios-add-btn"
                  onClick={handleAgregarEstudio}
                >
                  Agregar
                </Button>
              </div>

              <div className="estudios-list-desktop">
                <div className="estudios-table-head">
                  <span>No.</span>
                  <span>Clave</span>
                  <span>Estudio</span>
                  <span>Acción</span>
                </div>

                {estudios.length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Sin estudios agregados"
                  />
                ) : (
                  estudios.map((item) => (
                    <div className="estudios-table-row" key={item.id}>
                      <span>{item.no}</span>
                      <strong>{item.clave}</strong>
                      <p>{item.nombre}</p>
                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => eliminarItem(item.id, setEstudios)}
                      >
                        Quitar
                      </Button>
                    </div>
                  ))
                )}
              </div>

              <div className="estudios-list-mobile">
                {estudios.length === 0 ? (
                  <div className="estudios-mobile-empty">Sin estudios agregados</div>
                ) : (
                  estudios.map((item) => (
                    <div className="estudios-mobile-card" key={item.id}>
                      <div>
                        <span>No. {item.no}</span>
                        <strong>{item.clave}</strong>
                      </div>

                      <p>{item.nombre}</p>

                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => eliminarItem(item.id, setEstudios)}
                      >
                        Quitar
                      </Button>
                    </div>
                  ))
                )}
              </div>

              <div className="estudios-section-title">OTRAS PRUEBAS</div>

              <Form.Item name="otras_pruebas" label="Otras pruebas">
                <TextArea
                  rows={3}
                  placeholder="Agrega estudios adicionales no encontrados en el catálogo..."
                />
              </Form.Item>

              <div className="estudios-section-title">DIAGNÓSTICO</div>

              <div className="estudios-selector estudios-diagnostico-selector">
                <Form.Item name="diagnostico_select" label="Diagnóstico">
                  <Select
                    showSearch
                    placeholder="Seleccione..."
                    optionFilterProp="label"
                    options={catalogoDiagnosticos.map((item) => ({
                      label: `${item.clave} - ${item.nombre}`,
                      value: item.clave,
                    }))}
                  />
                </Form.Item>

                <Button
                  icon={<PlusOutlined />}
                  className="estudios-add-btn"
                  onClick={handleAgregarDiagnostico}
                >
                  Agregar
                </Button>
              </div>

              <div className="estudios-list-desktop estudios-diagnostico-table">
                <div className="estudios-table-head estudios-diagnostico-head">
                  <span>No.</span>
                  <span>Clave</span>
                  <span>Diagnóstico</span>
                  <span>Acción</span>
                </div>

                {diagnosticos.length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Sin diagnósticos agregados"
                  />
                ) : (
                  diagnosticos.map((item) => (
                    <div className="estudios-table-row" key={item.id}>
                      <span>{item.no}</span>
                      <strong>{item.clave}</strong>
                      <p>{item.nombre}</p>
                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => eliminarItem(item.id, setDiagnosticos)}
                      >
                        Quitar
                      </Button>
                    </div>
                  ))
                )}
              </div>

              <div className="estudios-list-mobile">
                {diagnosticos.length === 0 ? (
                  <div className="estudios-mobile-empty">Sin diagnósticos agregados</div>
                ) : (
                  diagnosticos.map((item) => (
                    <div className="estudios-mobile-card" key={item.id}>
                      <div>
                        <span>No. {item.no}</span>
                        <strong>{item.clave}</strong>
                      </div>

                      <p>{item.nombre}</p>

                      <Button
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => eliminarItem(item.id, setDiagnosticos)}
                      >
                        Quitar
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="estudios-actions">
              <Space wrap>
                <Button icon={<ClearOutlined />} onClick={handleClear}>
                  Limpiar
                </Button>

                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={saving}
                  onClick={handleSave}
                  className="estudios-save-btn"
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
        className="estudios-preview-modal"
        title="Vista previa de estudios clínicos"
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
            className="estudios-save-btn"
          >
            Guardar
          </Button>,
        ]}
      >
        <div className="estudios-preview">
          <div className="estudios-preview-header">
            <h2>ESTUDIOS CLÍNICOS Y DE GABINETE</h2>
            <span>{dayjs().format('YYYY-MM-DD HH:mm')}</span>
          </div>

          <div className="estudios-preview-patient">
            <strong>{nombreCompleto}</strong>
            <span>Edad: {edadPaciente} años</span>
            <span>Sexo: {pacienteActivo.sexo || '—'}</span>
            <span>Expediente: {numeroExpediente}</span>
          </div>

          <section className="estudios-preview-section">
            <h3>Estudios solicitados</h3>
            <div className="estudios-preview-list">
              {estudios.map((item) => (
                <div key={item.id}>
                  <span>{item.no}</span>
                  <strong>{item.clave}</strong>
                  <p>{item.nombre}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="estudios-preview-section">
            <h3>Otras pruebas</h3>
            <p>{previewValues.otras_pruebas || '—'}</p>
          </section>

          <section className="estudios-preview-section">
            <h3>Diagnósticos</h3>
            <div className="estudios-preview-list">
              {diagnosticos.map((item) => (
                <div key={item.id}>
                  <span>{item.no}</span>
                  <strong>{item.clave}</strong>
                  <p>{item.nombre}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </Modal>
    </section>
  );
};

export default EstudiosClinicos;