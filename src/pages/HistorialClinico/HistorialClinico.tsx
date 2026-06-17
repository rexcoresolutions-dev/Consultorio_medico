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
  FileTextOutlined,
  HistoryOutlined,
  PlusOutlined,
  SearchOutlined,
  UserOutlined,
  EyeOutlined,
  CalendarOutlined,
  IdcardOutlined,
  SaveOutlined,
  HeartOutlined,
  MedicineBoxOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';

import type { PacienteData } from '../../services/pacientes/pacientes.service';
import './HistorialClinico.css';

const { Title, Text } = Typography;

const PACIENTE_ATENCION_STORAGE_KEY = 'paciente_atencion_actual';
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

type WizardHistorialValues = {
  peso?: string;
  altura?: string;
  imc?: string;
  temperatura?: string;
  presion_arterial?: string;
  frecuencia_cardiaca?: string;
  frecuencia_respiratoria?: string;
  spo2?: string;
  circunferencia_abdomen?: string;
  motivo_consulta?: string;
  diagnostico?: string;
  descripcion_diagnostico?: string;
  referir_paciente?: string;
  referido_por?: string;
  contrarreferencia?: string;
  detalle_contrarreferencia?: string;
};

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

const HistorialClinico: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm<WizardHistorialValues>();

  const [pacienteActivo] = useState<PacienteData | null>(() => cargarPacienteActivo());
  const [historiales, setHistoriales] = useState<HistorialClinicoItem[]>(() =>
    cargarHistoriales(),
  );
  const [busqueda, setBusqueda] = useState('');
  const [historialSeleccionado, setHistorialSeleccionado] =
    useState<HistorialClinicoItem | null>(null);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);

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

  const abrirWizardHistorial = () => {
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
      motivo_consulta: consultaBase.motivo_consulta || '',
      diagnostico: ultimoHistorial?.diagnosticos?.[0]?.diagnostico || '',
      descripcion_diagnostico: ultimoHistorial?.diagnosticos?.[0]?.descripcion || '',
      referir_paciente: consultaBase.referir_paciente || 'NO',
      referido_por: consultaBase.referido_por || '',
      contrarreferencia: consultaBase.contrarreferencia || 'NO',
      detalle_contrarreferencia: consultaBase.detalle_contrarreferencia || '',
    });

    setWizardStep(0);
    setWizardOpen(true);
  };

  const cerrarWizard = () => {
    setWizardOpen(false);
    setWizardStep(0);
    form.resetFields();
  };

  const siguienteWizard = async () => {
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

      setWizardStep(1);
    } catch {
      message.warning('Revisa los datos clínicos antes de continuar.');
    }
  };

  const guardarNuevoHistorial = async () => {
    if (!pacienteActivo) return;

    try {
      const values = await form.validateFields();
      const imcCalculado = calcularIMC(values.peso, values.altura);

      const diagnosticoNuevo: DiagnosticoHistorial = {
        key: `manual-${Date.now()}`,
        no: 1,
        clave: values.motivo_consulta || 'S/C',
        diagnostico: values.diagnostico || 'Historial clínico manual',
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
      cerrarWizard();
    } catch {
      message.warning('Completa la información necesaria del historial.');
    }
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

            <Space>
              <Button type="primary" icon={<UserOutlined />} onClick={() => navigate('/pacientes')}>
                Ir a pacientes
              </Button>
            </Space>
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
            <div className="historial-icon">
            <HistoryOutlined />
            </div>
        </div>

        <div className="historial-hero-content">
            <Text className="historial-eyebrow">
            Expediente electrónico
            </Text>

            <Title level={2}>
            Historial clínico
            </Title>

            <Text type="secondary">
            Consulta, crea y administra los registros clínicos del paciente activo.
            </Text>
        </div>
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

                <Tag className="historial-action-tag green">Wizard</Tag>
              </div>

              <h3>Crear historial</h3>

              <p>
                Crea un nuevo historial clínico con datos precargados de la última consulta externa.
              </p>

              <Button icon={<MedicineBoxOutlined />} onClick={abrirWizardHistorial}>
                Abrir wizard
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
                description="Cada consulta guardada se agrega al historial, pero también puedes crear un historial manual desde el wizard."
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
        open={wizardOpen}
        onCancel={cerrarWizard}
        footer={null}
        width={980}
        centered
        className="historial-wizard-modal"
        title={null}
      >
        <div className="historial-wizard-header">
          <div className="historial-wizard-icon">
            {wizardStep === 0 ? <HeartOutlined /> : <MedicineBoxOutlined />}
          </div>

          <div>
            <Text className="historial-eyebrow">Crear historial clínico</Text>
            <h2>Wizard de historial</h2>
            <p>
              {wizardStep === 0
                ? 'Revisa o actualiza los signos vitales del paciente.'
                : 'Completa diagnóstico, motivo de consulta y referencia.'}
            </p>
          </div>
        </div>

        <div className="historial-wizard-steps">
          <div className={`historial-wizard-step ${wizardStep === 0 ? 'active' : 'done'}`}>
            <span>1</span>
            <div>
              <strong>Signos vitales</strong>
              <small>Datos clínicos</small>
            </div>
          </div>

          <div className="historial-wizard-line" />

          <div className={`historial-wizard-step ${wizardStep === 1 ? 'active' : ''}`}>
            <span>2</span>
            <div>
              <strong>Diagnóstico</strong>
              <small>Resumen clínico</small>
            </div>
          </div>
        </div>

        <Form form={form} layout="vertical" className="historial-wizard-form">
          {wizardStep === 0 && (
            <section className="historial-wizard-section">
              <Row gutter={[16, 8]}>
                <Col xs={24} md={8}>
                  <Form.Item name="peso" label="Peso">
                    <Input addonAfter="kg" placeholder="Ej. 70" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item name="altura" label="Altura">
                    <Input addonAfter="m/cm" placeholder="Ej. 1.70 o 170" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item name="imc" label="IMC">
                    <Input disabled placeholder="Se calcula si está vacío" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item name="temperatura" label="Temperatura">
                    <Input addonAfter="°C" placeholder="Ej. 36.5" />
                  </Form.Item>
                </Col>

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
            </section>
          )}

          {wizardStep === 1 && (
            <section className="historial-wizard-section">
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
                    <Input.TextArea rows={4} placeholder="Descripción clínica del historial" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item name="referir_paciente" label="Referir paciente">
                    <Select
                      options={[
                        { value: 'SI', label: 'Sí' },
                        { value: 'NO', label: 'No' },
                      ]}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={16}>
                  <Form.Item name="referido_por" label="Referido por">
                    <Input placeholder="Área o médico de referencia" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item name="contrarreferencia" label="Contrarreferencia">
                    <Select
                      options={[
                        { value: 'SI', label: 'Sí' },
                        { value: 'NO', label: 'No' },
                      ]}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={16}>
                  <Form.Item name="detalle_contrarreferencia" label="Detalle">
                    <Input placeholder="Detalle de contrarreferencia" />
                  </Form.Item>
                </Col>
              </Row>
            </section>
          )}

          <div className="historial-wizard-footer">
            <Button onClick={cerrarWizard}>Cancelar</Button>

            <div>
              {wizardStep === 1 && (
                <Button icon={<ArrowLeftOutlined />} onClick={() => setWizardStep(0)}>
                  Anterior
                </Button>
              )}

              {wizardStep === 0 && (
                <Button type="primary" onClick={siguienteWizard}>
                  Siguiente
                </Button>
              )}

              {wizardStep === 1 && (
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={guardarNuevoHistorial}
                >
                  Guardar historial
                </Button>
              )}
            </div>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default HistorialClinico;