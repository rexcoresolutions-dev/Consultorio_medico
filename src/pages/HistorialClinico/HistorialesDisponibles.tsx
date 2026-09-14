import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Empty,
  Input,
  Modal,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  EyeOutlined,
  FileTextOutlined,
  HistoryOutlined,
  IdcardOutlined,
  LogoutOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

import type { PacienteData } from '../../services/pacientes/pacientes.service';
import { getHistoriaClinicaApiError } from '../../services/historia-clinica/historia-clinica.service';
import expedienteClinicoService, {
  type ExpedienteClinicoItem,
} from '../../services/expediente-clinico/expediente-clinico.service';
import './HistorialClinico.css';

const { Title, Text } = Typography;

const PACIENTE_ATENCION_STORAGE_KEY = 'paciente_atencion_actual';
const CONSULTA_EXTERNA_ABIERTA_STORAGE_KEY = 'consulta_externa_abierta';

type DetailField = {
  key: string;
  label: string;
};

type DetailSection = {
  title: string;
  columns?: {
    xs: number;
    md: number;
  };
  fields: DetailField[];
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
    .trim();

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

const formatValue = (value: any) => {
  if (value === true) return 'Sí';
  if (value === false) return 'No';
  if (value === null || value === undefined || value === '') return '-';

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return formatDateTime(value);
  }

  if (Array.isArray(value)) {
    return value.length ? value.join(', ') : '-';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
};

const seccionesWizard: DetailSection[] = [
  {
    title: 'Historia clínica / Signos vitales',
    columns: { xs: 1, md: 3 },
    fields: [
      { key: 'peso', label: 'Peso' },
      { key: 'altura', label: 'Altura' },
      { key: 'imc', label: 'IMC' },
      { key: 'temperatura', label: 'Temperatura' },
      { key: 'presion_arterial', label: 'Presión arterial' },
      { key: 'frecuencia_cardiaca', label: 'Frecuencia cardíaca' },
      { key: 'frecuencia_respiratoria', label: 'Frecuencia respiratoria' },
      { key: 'spo2', label: 'SpO₂' },
      { key: 'circunferencia_abdomen', label: 'Circunferencia abdomen' },
    ],
  },
  {
    title: 'Antecedentes hereditarios familiares',
    columns: { xs: 1, md: 2 },
    fields: [
      { key: 'diabetes_check', label: 'Diabetes' },
      { key: 'diabetes_parentesco', label: 'Parentesco diabetes' },
      { key: 'cardiovascular_check', label: 'Cardiovascular' },
      { key: 'cardiovascular_parentesco', label: 'Parentesco cardiovascular' },
      { key: 'epilepsias_check', label: 'Epilepsias' },
      { key: 'epilepsias_parentesco', label: 'Parentesco epilepsias' },
      { key: 'neoplasicos_check', label: 'Neoplásicos' },
      { key: 'neoplasicos_parentesco', label: 'Parentesco neoplásicos' },
      { key: 'lueticos_check', label: 'Luéticos' },
      { key: 'lueticos_parentesco', label: 'Parentesco luéticos' },
      { key: 'hipertension_check', label: 'Hipertensión' },
      { key: 'hipertension_parentesco', label: 'Parentesco hipertensión' },
      { key: 'fimicos_check', label: 'Fímicos' },
      { key: 'fimicos_parentesco', label: 'Parentesco fímicos' },
      { key: 'dislipidemia_check', label: 'Dislipidemia' },
      { key: 'dislipidemia_parentesco', label: 'Parentesco dislipidemia' },
      { key: 'otros_check', label: 'Otros antecedentes familiares' },
      { key: 'otros_antecedentes', label: 'Detalle otros' },
      { key: 'tipos_antecedentes', label: 'Tipos' },
    ],
  },
  {
    title: 'Antecedentes personales no patológicos',
    columns: { xs: 1, md: 2 },
    fields: [
      { key: 'alimentacion', label: 'Alimentación' },
      { key: 'higiene', label: 'Higiene' },
      { key: 'inmunizaciones_incompletas_check', label: 'Inmunizaciones incompletas' },
      { key: 'inmunizaciones_incompletas', label: 'Detalle inmunizaciones' },
      { key: 'grupo_sanguineo', label: 'Grupo sanguíneo' },
      { key: 'otros_no_patologicos_check', label: 'Otros no patológicos' },
      { key: 'otros_no_patologicos', label: 'Detalle otros no patológicos' },
    ],
  },
  {
    title: 'Antecedentes personales patológicos',
    columns: { xs: 1, md: 2 },
    fields: [
      { key: 'enfermedades_infancia', label: 'Enfermedades de infancia' },
      { key: 'alergias', label: 'Alérgicos' },
      { key: 'cirugias', label: 'Quirúrgicos' },
      { key: 'transfusiones', label: 'Transfusiones' },
      { key: 'fracturas', label: 'Fracturas' },
      { key: 'traumatismos', label: 'Traumatismos' },
      { key: 'hospitalizaciones', label: 'Hospitalizaciones' },
      { key: 'medicamentos_actuales', label: 'Medicamentos actuales' },
      { key: 'dislipidemia_patologica', label: 'Dislipidemia' },
      { key: 'tuberculosis_pulmonar', label: 'Tuberculosis pulmonar' },
      { key: 'tabaquismo', label: 'Tabaquismo' },
      { key: 'alcoholismo', label: 'Alcoholismo' },
      { key: 'toxicomanias', label: 'Toxicomanías' },
      { key: 'otros_patologicos_check', label: 'Otros patológicos' },
      { key: 'otros_patologicos', label: 'Detalle otros patológicos' },
    ],
  },
  {
    title: 'Antecedentes gineco obstétricos',
    columns: { xs: 1, md: 3 },
    fields: [
      { key: 'ivsa', label: 'IVSA' },
      { key: 'numero_parejas', label: 'No. de parejas' },
      { key: 'metodo_anticonceptivo', label: 'Método anticonceptivo' },
      { key: 'gestas', label: 'Gestas' },
      { key: 'partos', label: 'Partos' },
      { key: 'abortos', label: 'Abortos' },
      { key: 'cesareas', label: 'Cesáreas' },
      { key: 'fum', label: 'FUM' },
      { key: 'menarca', label: 'Menarca' },
      { key: 'ritmo', label: 'Ritmo' },
      { key: 'ultimo_papanicolaou', label: 'Fecha último Papanicolaou' },
      { key: 'terapia_hormonal', label: 'Terapia hormonal' },
      { key: 'peri_post_menopausia', label: 'PeriPost menopausia' },
      { key: 'infeccion_transmision_sexual', label: 'I. Transmisión sexual' },
      { key: 'patologia_mamaria_benigna', label: 'P. Mamaria benigna' },
      { key: 'colposcopia', label: 'Colposcopia' },
    ],
  },
  {
    title: 'Motivo / Diagnóstico',
    columns: { xs: 1, md: 2 },
    fields: [
      { key: 'motivo_consulta', label: 'Motivo de consulta' },
      { key: 'diagnostico', label: 'Diagnóstico' },
      { key: 'descripcion_diagnostico', label: 'Descripción diagnóstico' },
    ],
  },
  {
    title: 'Referencia / Contrarreferencia',
    columns: { xs: 1, md: 2 },
    fields: [
      { key: 'referir_paciente', label: 'Referir paciente' },
      { key: 'referido_por', label: 'Referido por' },
      { key: 'contrarreferencia', label: 'Contrarreferencia' },
      { key: 'detalle_contrarreferencia', label: 'Detalle contrarreferencia' },
    ],
  },
];

const clinicalSections = ['Historia clínica / Signos vitales', 'Motivo / Diagnóstico'];

const backgroundSections = [
  'Antecedentes hereditarios familiares',
  'Antecedentes personales no patológicos',
  'Antecedentes personales patológicos',
  'Antecedentes gineco obstétricos',
  'Referencia / Contrarreferencia',
];


const recordSourceText = (record: ExpedienteClinicoItem) =>
  `${record.sourceLabel || ''} ${record.sourceType || ''}`.toLowerCase();

const hasValue = (value: any) =>
  value !== undefined && value !== null && value !== '' && value !== '-';

const countSectionValues = (record: ExpedienteClinicoItem, fields: DetailField[]) =>
  fields.filter((field) => hasValue(record.consulta?.[field.key])).length;



const HistorialesDisponibles: React.FC = () => {
  const navigate = useNavigate();

  const [pacienteActivo, setPacienteActivo] = useState<PacienteData | null>(() =>
    cargarPacienteActivo(),
  );
  const [historiales, setHistoriales] = useState<ExpedienteClinicoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorCarga, setErrorCarga] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [historialSeleccionado, setHistorialSeleccionado] =
    useState<ExpedienteClinicoItem | null>(null);
  const [activeDetailPart, setActiveDetailPart] = useState<'clinico' | 'antecedentes'>(
    'clinico',
  );

  const pacienteNombre = getFullName(pacienteActivo);

  useEffect(() => {
    let activo = true;

    const cargar = async () => {
      const pacienteId = Number(pacienteActivo?.id);

      if (!Number.isInteger(pacienteId) || pacienteId <= 0) {
        if (activo) {
          setHistoriales([]);
          setErrorCarga(
            pacienteActivo
              ? 'No fue posible identificar al paciente para consultar sus historias clínicas.'
              : '',
          );
        }
        return;
      }

      try {
        if (activo) {
          setLoading(true);
          setErrorCarga('');
        }

        const expediente = await expedienteClinicoService.findByPaciente(
          pacienteId,
          pacienteActivo,
        );

        if (activo) {
          setHistoriales(expediente.items);
          setErrorCarga(expediente.warnings.join(' '));
        }
      } catch (error) {
        console.error('Error consultando historia clínica:', error);
        if (activo) {
          setHistoriales([]);
          setErrorCarga(
            getHistoriaClinicaApiError(
              error,
              'No fue posible consultar los registros de historia clínica.',
            ),
          );
        }
      } finally {
        if (activo) setLoading(false);
      }
    };

    void cargar();

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
      .filter((item) => {
        const texto = busqueda.trim().toLowerCase();

        if (!texto) return true;

        const diagnosticosTexto = item.diagnosticos
          .map((d) => `${d.clave || ''} ${d.diagnostico || ''} ${d.descripcion || ''}`)
          .join(' ')
          .toLowerCase();

        const consultaTexto = Object.values(item.consulta || {})
          .map((value) => formatValue(value))
          .join(' ')
          .toLowerCase();

        return (
          diagnosticosTexto.includes(texto) ||
          consultaTexto.includes(texto) ||
          recordSourceText(item).includes(texto) ||
          String(item.paciente.numero_expediente || '').toLowerCase().includes(texto) ||
          formatDateTime(item.fecha_consulta).toLowerCase().includes(texto)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.fecha_consulta).getTime() - new Date(a.fecha_consulta).getTime(),
      );
  }, [historiales, pacienteActivo, busqueda]);



  const openDetalle = async (record: ExpedienteClinicoItem) => {
    setActiveDetailPart('clinico');
    setHistorialSeleccionado(record);

    if (!record.apiId || !pacienteActivo) return;

    try {
      setDetailLoading(true);
      const detalle = await expedienteClinicoService.findOne(record, pacienteActivo);
      setHistorialSeleccionado(detalle);
    } catch (error) {
      console.error('No fue posible cargar el detalle de la historia clínica:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetalle = () => {
    setHistorialSeleccionado(null);
    setActiveDetailPart('clinico');
  };

  const finalizarAtencion = async () => {
    const result = await Swal.fire({
      icon: 'question',
      title: 'Finalizar atención',
      text: `${
        pacienteNombre || 'El paciente'
      } dejará de estar activo en consulta, procedimientos e historial.`,
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
    navigate('/pacientes', { replace: true });
  };

  const columns: ColumnsType<ExpedienteClinicoItem> = [
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
      title: 'Tipo de registro',
      key: 'sourceType',
      width: 170,
      render: (_, record) => (
        <Tag color={record.sourceType === 'CONSULTA_EXTERNA' ? 'cyan' : 'blue'}>
          {record.sourceLabel}
        </Tag>
      ),
    },
    {
      title: 'Diagnóstico principal',
      key: 'diagnosticos',
      render: (_, record) => {
        const diagnostico = record.diagnosticos?.[0];

        return (
          <div className="historial-diagnostico-cell">
            {diagnostico ? (
              <>
                <strong>
                  {diagnostico.clave ? `${diagnostico.clave} - ` : ''}
                  {diagnostico.diagnostico || 'Diagnóstico sin descripción'}
                </strong>
                <span>{diagnostico.descripcion || 'Sin descripción'}</span>
              </>
            ) : (
              <Text type="secondary">Sin diagnósticos registrados</Text>
            )}
          </div>
        );
      },
    },
    {
      title: 'Resumen clínico',
      key: 'signos',
      width: 330,
      render: (_, record) => {
        const signos = [
          record.consulta?.peso ? `Peso ${formatValue(record.consulta.peso)} kg` : null,
          record.consulta?.altura ? `Altura ${formatValue(record.consulta.altura)} m` : null,
          record.consulta?.imc ? `IMC ${formatValue(record.consulta.imc)}` : null,
          record.consulta?.temperatura
            ? `Temp. ${formatValue(record.consulta.temperatura)} °C`
            : null,
        ].filter(Boolean);

        return signos.length ? (
          <div className="historial-tags">
            {signos.map((signo) => (
              <Tag key={String(signo)}>{signo}</Tag>
            ))}
          </div>
        ) : (
          <Text type="secondary">Sin signos vitales registrados</Text>
        );
      },
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
          onClick={() => openDetalle(record)}
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
              <div className="historial-empty-icon">
                  <UserOutlined />
              </div>
              <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No hay paciente activo"
              />
              <p>
                  Primero selecciona un paciente desde el módulo de Pacientes para consultar sus historiales disponibles.
              </p>
              <Button
                  type="primary"
                  icon={<UserOutlined />}
                  onClick={() => navigate('/pacientes')}
              >
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
              onClick={() => navigate('/historial-clinico')}
            >
              Regresar
            </Button>

            <div className="historial-icon">
              <HistoryOutlined />
            </div>
          </div>

          <div className="historial-hero-content">
            <Text className="historial-eyebrow">Historiales disponibles</Text>
            <Title level={2}>Registros clínicos guardados</Title>
            <Text type="secondary">
              Aquí se integran las consultas externas y las historias clínicas registradas para el paciente activo.
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
              <span>Registros</span>
              <strong>{historialesPaciente.length}</strong>
            </div>
          </div>
        </section>

        {errorCarga && (
          <Alert
            type="error"
            showIcon
            message="No fue posible cargar completamente el expediente"
            description={errorCarga}
            style={{ marginBottom: 18 }}
          />
        )}

        <Card className="historial-table-card historial-table-card-full">
          <div className="historial-table-head">
            <div>
              <h3>Registros clínicos del paciente</h3>
              <span>{historialesPaciente.length} registro(s)</span>
            </div>

            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Buscar por diagnóstico, expediente, fecha o dato clínico..."
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
            loading={loading}
            pagination={{
              pageSize: 6,
              showSizeChanger: false,
              position: ['bottomCenter'],
              showTotal: (total, range) => `${range[0]}-${range[1]} de ${total}`,
            }}
            locale={{
              emptyText: (
                <Empty description="Aún no hay consultas externas ni historias clínicas para este paciente" />
              ),
            }}
          />
        </Card>
      </div>

      <Modal
        open={Boolean(historialSeleccionado)}
        onCancel={closeDetalle}
        footer={[
          <Button key="cerrar" onClick={closeDetalle} className="historial-close-btn">
            Cerrar detalle
          </Button>,
        ]}
        width={1180}
        centered
        className="historial-detail-modal historial-full-detail-modal"
        title={
          <div className="historial-modal-title improved">
            <div className="historial-modal-icon">
              <FileTextOutlined />
            </div>

            <div>
              <strong>
                {historialSeleccionado?.sourceType === 'CONSULTA_EXTERNA'
                  ? 'Detalle de consulta externa'
                  : 'Detalle de historia clínica'}
              </strong>
              <span>
                {historialSeleccionado?.sourceType === 'CONSULTA_EXTERNA'
                  ? 'Atención registrada desde Consulta Externa'
                  : 'Historia clínica integral registrada en el expediente'}
              </span>
            </div>
          </div>
        }
      >
        {detailLoading && (
          <Alert
            type="info"
            showIcon
            message="Cargando detalle completo..."
            style={{ marginBottom: 14 }}
          />
        )}

        {historialSeleccionado && (
          <div className="historial-full-detail">
            <div className="historial-detail-switch">
              <button
                type="button"
                className={`historial-switch-card ${
                  activeDetailPart === 'clinico' ? 'active' : ''
                }`}
                onClick={() => setActiveDetailPart('clinico')}
              >
                <span>Parte 1</span>
                <strong>Información clínica</strong>
                <small>Paciente, signos vitales y diagnóstico</small>
              </button>

              <button
                type="button"
                className={`historial-switch-card ${
                  activeDetailPart === 'antecedentes' ? 'active' : ''
                }`}
                onClick={() => setActiveDetailPart('antecedentes')}
              >
                <span>Parte 2</span>
                <strong>Antecedentes</strong>
                <small>Familiares, personales y gineco-obstétricos</small>
              </button>
            </div>

            {activeDetailPart === 'clinico' && (
              <>
                <section className="historial-patient-detail-card">
                  <div className="historial-patient-detail-avatar">
                    <UserOutlined />
                  </div>

                  <div className="historial-patient-detail-info">
                    <span>Paciente</span>
                    <h3>{historialSeleccionado.paciente.nombre || pacienteNombre || '-'}</h3>

                    <div className="historial-patient-detail-tags">
                      <Tag>
                        <IdcardOutlined /> Exp.{' '}
                        {historialSeleccionado.paciente.numero_expediente || '-'}
                      </Tag>

                      <Tag>{historialSeleccionado.paciente.sexo || 'Sin sexo'}</Tag>

                      <Tag>
                        {calcularEdad(historialSeleccionado.paciente.fecha_nacimiento)}
                      </Tag>

                      <Tag>
                        <CalendarOutlined />{' '}
                        {formatDateTime(
                          historialSeleccionado.consulta?.fecha_consulta ||
                            historialSeleccionado.fecha_consulta,
                        )}
                      </Tag>
                    </div>
                  </div>
                </section>

                {seccionesWizard
                  .filter((section) => clinicalSections.includes(section.title))
                  .map((section) => (
                    <section className="historial-detail-card" key={section.title}>
                      <div className="historial-section-header">
                        <div>
                          <span>Registro clínico</span>
                          <h3>{section.title}</h3>
                        </div>

                        <Tag>{countSectionValues(historialSeleccionado, section.fields)} datos</Tag>
                      </div>

                      <div className="historial-info-grid">
                        {section.fields
                          .filter((field) => hasValue(historialSeleccionado.consulta?.[field.key]))
                          .map((field) => (
                          <div className="historial-info-item" key={field.key}>
                            <span>{field.label}</span>
                            <strong>
                              {formatValue(historialSeleccionado.consulta?.[field.key])}
                            </strong>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}

                <section className="historial-detail-card">
                  <div className="historial-section-header">
                    <div>
                      <span>Diagnósticos</span>
                      <h3>Diagnósticos guardados</h3>
                    </div>

                    <Tag>{historialSeleccionado.diagnosticos?.length || 0} registro(s)</Tag>
                  </div>

                  {historialSeleccionado.diagnosticos?.length ? (
                    <div className="historial-diagnosticos-grid">
                      {historialSeleccionado.diagnosticos.map((diag, index) => (
                        <div key={diag.key || index} className="historial-diagnostico-card">
                          <Tag>{diag.clave || 'S/C'}</Tag>

                          <h4>{diag.diagnostico || 'Sin diagnóstico'}</h4>

                          <p>{diag.descripcion || 'Sin descripción'}</p>

                          {(diag.primeraVez || diag.subsecuente) && (
                            <small>
                              {diag.primeraVez ? 'Primera vez' : ''}
                              {diag.subsecuente ? 'Subsecuente' : ''}
                            </small>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Empty description="Sin diagnósticos registrados" />
                  )}
                </section>
              </>
            )}

            {activeDetailPart === 'antecedentes' && (
              <>
                {seccionesWizard
                  .filter((section) => backgroundSections.includes(section.title))
                  .map((section) => (
                    <section className="historial-detail-card" key={section.title}>
                      <div className="historial-section-header">
                        <div>
                          <span>Antecedentes clínicos</span>
                          <h3>{section.title}</h3>
                        </div>

                        <Tag>{countSectionValues(historialSeleccionado, section.fields)} datos</Tag>
                      </div>

                      <div className="historial-info-grid">
                        {section.fields
                          .filter((field) => hasValue(historialSeleccionado.consulta?.[field.key]))
                          .map((field) => (
                          <div className="historial-info-item" key={field.key}>
                            <span>{field.label}</span>
                            <strong>
                              {formatValue(historialSeleccionado.consulta?.[field.key])}
                            </strong>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default HistorialesDisponibles;