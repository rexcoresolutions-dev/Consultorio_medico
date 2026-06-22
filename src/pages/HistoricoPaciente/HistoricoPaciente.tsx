import React, { useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  Card,
  Checkbox,
  Col,
  Empty,
  Input,
  Row,
  Select,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  HistoryOutlined,
  IdcardOutlined,
  LogoutOutlined,
  SearchOutlined,
  SyncOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

import type { PacienteData } from '../../services/pacientes/pacientes.service';
import './HistoricoPaciente.css';

const { Title, Text } = Typography;

const PACIENTE_ATENCION_STORAGE_KEY = 'paciente_atencion_actual';
const CONSULTA_EXTERNA_ABIERTA_STORAGE_KEY = 'consulta_externa_abierta';
const HISTORIAL_CLINICO_STORAGE_KEY = 'historial_clinico_pacientes';
const NOTAS_EVOLUCION_STORAGE_KEY = 'notas_evolucion_pacientes';

type DocumentoHistorico = {
  id: string;
  tipo: string;
  fecha: string;
  descripcion: string;
};

const cargarPacienteActivo = (): PacienteData | null => {
  try {
    const data = localStorage.getItem(PACIENTE_ATENCION_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

const cargarStorageArray = <T,>(key: string): T[] => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
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

const formatDate = (fecha?: string) => {
  if (!fecha) return '-';

  const parsed = new Date(fecha);

  if (Number.isNaN(parsed.getTime())) return fecha;

  return parsed.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const formatTime = (fecha?: string) => {
  if (!fecha) return '-';

  const parsed = new Date(fecha);

  if (Number.isNaN(parsed.getTime())) return '-';

  return parsed.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatValue = (value: any) => {
  if (value === true) return 'Sí';
  if (value === false) return 'No';
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
};

const HistoricoPaciente: React.FC = () => {
  const navigate = useNavigate();

  const [pacienteActivo, setPacienteActivo] = useState<PacienteData | null>(() =>
    cargarPacienteActivo(),
  );
  const [tipoDocumento, setTipoDocumento] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [verOtrosConsultorios, setVerOtrosConsultorios] = useState(false);

  const pacienteNombre = getFullName(pacienteActivo);

  const historiales = cargarStorageArray<any>(HISTORIAL_CLINICO_STORAGE_KEY);
  const notas = cargarStorageArray<any>(NOTAS_EVOLUCION_STORAGE_KEY);

  const finalizarAtencion = async () => {
    const result = await Swal.fire({
      icon: 'question',
      title: 'Finalizar atención',
      text: `${
        pacienteNombre || 'El paciente'
      } dejará de estar activo en consulta, historial clínico, nota de evolución e histórico.`,
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
    navigate('/historico-paciente', { replace: true });
  };

  const historialesPaciente = useMemo(() => {
    if (!pacienteActivo) return [];

    const filtrarPorPaciente = (item: any) => {
      const sameId =
        pacienteActivo.id &&
        String(item.pacienteId || item.paciente?.id) === String(pacienteActivo.id);

      const sameExpediente =
        pacienteActivo.numero_expediente &&
        item.paciente?.numero_expediente === pacienteActivo.numero_expediente;

      const sameCurp = pacienteActivo.curp && item.paciente?.curp === pacienteActivo.curp;

      return sameId || sameExpediente || sameCurp;
    };

    const docsHistorial: DocumentoHistorico[] = historiales
      .filter(filtrarPorPaciente)
      .map((item: any) => ({
        id: `historial-${item.id}`,
        tipo: 'Historial clínico',
        fecha: item.fecha_consulta || item.consulta?.fecha_consulta || '',
        descripcion:
          item.diagnosticos?.[0]?.diagnostico ||
          item.consulta?.diagnostico ||
          'Historial clínico registrado',
      }));

    const docsNotas: DocumentoHistorico[] = notas
      .filter(filtrarPorPaciente)
      .map((item: any) => ({
        id: `nota-${item.id}`,
        tipo: 'Nota de evolución',
        fecha: item.fecha_elaboracion || '',
        descripcion:
          item.diagnosticos?.[0]?.diagnostico ||
          item.datos?.motivoConsulta ||
          'Nota de evolución registrada',
      }));

    return [...docsHistorial, ...docsNotas]
      .filter((doc) => {
        if (tipoDocumento !== 'todos' && doc.tipo !== tipoDocumento) return false;

        const texto = busqueda.trim().toLowerCase();

        if (!texto) return true;

        return `${doc.tipo} ${doc.descripcion} ${formatDate(doc.fecha)}`
          .toLowerCase()
          .includes(texto);
      })
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [historiales, notas, pacienteActivo, tipoDocumento, busqueda]);

  const ultimaVisita = historialesPaciente[0];

  const ultimoHistorial = useMemo(() => {
    if (!pacienteActivo) return null;

    return historiales
      .filter((item: any) => {
        const sameId =
          pacienteActivo.id &&
          String(item.pacienteId || item.paciente?.id) === String(pacienteActivo.id);

        const sameExpediente =
          pacienteActivo.numero_expediente &&
          item.paciente?.numero_expediente === pacienteActivo.numero_expediente;

        return sameId || sameExpediente;
      })
      .sort(
        (a: any, b: any) =>
          new Date(b.fecha_consulta || b.consulta?.fecha_consulta).getTime() -
          new Date(a.fecha_consulta || a.consulta?.fecha_consulta).getTime(),
      )[0];
  }, [historiales, pacienteActivo]);

  const columns: ColumnsType<DocumentoHistorico> = [
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      width: 150,
      render: (fecha) => (
        <span className="historico-date-cell">
          <CalendarOutlined /> {formatDate(fecha)}
        </span>
      ),
    },
    {
      title: 'Hora',
      dataIndex: 'fecha',
      width: 110,
      render: (fecha) => (
        <span className="historico-date-cell">
          <ClockCircleOutlined /> {formatTime(fecha)}
        </span>
      ),
    },
    {
      title: 'Documento',
      dataIndex: 'tipo',
      width: 180,
      render: (tipo) => <Tag className="historico-doc-tag">{tipo}</Tag>,
    },
    {
      title: 'Descripción',
      dataIndex: 'descripcion',
      ellipsis: true,
    },
  ];

  if (!pacienteActivo) {
    return (
      <div className="historico-page">
        <div className="historico-empty-state">
          <div className="historico-empty-decoration top" />
          <div className="historico-empty-decoration bottom" />

          <div className="historico-empty-icon">
            <SyncOutlined />
          </div>

          <div className="historico-empty-badge">Histórico por paciente bloqueado</div>

          <h1>No hay paciente activo</h1>

          <p>
            Para consultar el histórico clínico, primero debes seleccionar un paciente desde el
            módulo de Pacientes.
          </p>

          <Button
            type="primary"
            icon={<UserOutlined />}
            className="historico-empty-button"
            onClick={() => navigate('/pacientes')}
          >
            Seleccionar paciente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="historico-page">
      <div className="historico-shell">
        <header className="historico-hero-card">
          <div className="historico-hero-icon">
            <HistoryOutlined />
          </div>

          <div>
            <Text className="historico-eyebrow">Expediente clínico</Text>
            <Title level={2}>Histórico por paciente</Title>
            <Text type="secondary">
              Consulta la última visita, revisión clínica y documentos registrados del paciente.
            </Text>
          </div>

          <Tag className="historico-status-tag">{historialesPaciente.length} documento(s)</Tag>
        </header>

        <Row gutter={[16, 16]} className="historico-main-row">
          <Col xs={24} lg={7}>
            <Card className="historico-patient-card">
              <div className="historico-patient-title">Paciente</div>

              <div className="historico-patient-main">
                <Avatar size={72} className="historico-avatar" icon={<UserOutlined />} />

                <div className="historico-patient-info">
                  <h2>{pacienteNombre || 'Paciente sin nombre'}</h2>

                  <p>
                    {pacienteActivo.fecha_nacimiento
                      ? formatDate(pacienteActivo.fecha_nacimiento)
                      : '-'}{' '}
                    | {pacienteActivo.sexo || '-'}
                  </p>
                </div>
              </div>

              <Button
                icon={<LogoutOutlined />}
                className="historico-finalizar-btn"
                onClick={finalizarAtencion}
              >
                Finalizar atención
              </Button>

              <div className="historico-patient-data">
                <div>
                  <span>Edad</span>
                  <strong>{calcularEdad(pacienteActivo.fecha_nacimiento)}</strong>
                </div>

                <div>
                  <span>Origen</span>
                  <strong>{pacienteActivo.lugar_origen || '-'}</strong>
                </div>

                <div>
                  <span>No. expediente</span>
                  <strong>
                    <IdcardOutlined /> {pacienteActivo.numero_expediente || '-'}
                  </strong>
                </div>
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={17}>
            <Card className="historico-last-card">
              <div className="historico-card-title">Última visita</div>

              <div className="historico-last-grid">
                <div>
                  <span>Fecha</span>
                  <strong>{formatDate(ultimaVisita?.fecha)}</strong>
                </div>

                <div>
                  <span>Hora</span>
                  <strong>{formatTime(ultimaVisita?.fecha)}</strong>
                </div>

                <div>
                  <span>Cuenta con historia clínica</span>
                  <strong>{ultimoHistorial ? 'Sí' : 'No'}</strong>
                </div>

                <div>
                  <span>Consulta externa específica</span>
                  <strong>{ultimaVisita ? 'Sí' : 'No'}</strong>
                </div>

                <div>
                  <span>Peso</span>
                  <strong>{formatValue(ultimoHistorial?.consulta?.peso)} Kg</strong>
                </div>

                <div>
                  <span>Talla</span>
                  <strong>{formatValue(ultimoHistorial?.consulta?.altura)} m</strong>
                </div>

                <div>
                  <span>IMC</span>
                  <strong>{formatValue(ultimoHistorial?.consulta?.imc)} Kg/m²</strong>
                </div>

                <div>
                  <span>Diabetes</span>
                  <strong>{formatValue(ultimoHistorial?.consulta?.diabetes_check)}</strong>
                </div>

                <div>
                  <span>Temperatura</span>
                  <strong>{formatValue(ultimoHistorial?.consulta?.temperatura)} °C</strong>
                </div>

                <div>
                  <span>Frec. cardíaca</span>
                  <strong>
                    {formatValue(ultimoHistorial?.consulta?.frecuencia_cardiaca)} xmin
                  </strong>
                </div>

                <div>
                  <span>Presión arterial</span>
                  <strong>
                    {formatValue(ultimoHistorial?.consulta?.presion_arterial)} mm/Hg
                  </strong>
                </div>

                <div>
                  <span>SpO₂</span>
                  <strong>{formatValue(ultimoHistorial?.consulta?.spo2)} %</strong>
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        <Card className="historico-review-card">
          <div className="historico-review-header">Última revisión</div>

          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <div className="historico-review-box">
                <span>Diagnóstico</span>
                <strong>
                  {ultimoHistorial?.diagnosticos?.[0]?.diagnostico ||
                    ultimoHistorial?.consulta?.diagnostico ||
                    '-'}
                </strong>
              </div>
            </Col>

            <Col xs={24} md={12}>
              <div className="historico-review-box">
                <span>Alergias</span>
                <strong>{formatValue(ultimoHistorial?.consulta?.alergias)}</strong>
              </div>
            </Col>
          </Row>
        </Card>

        <Card className="historico-documents-card">
          <div className="historico-documents-header">
            <div>
              <Text className="historico-eyebrow">Documentos</Text>
              <h3>Selecciona un documento</h3>
            </div>

            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Buscar documento..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="historico-search"
            />
          </div>

          <div className="historico-filters">
            <Select
              value={tipoDocumento}
              onChange={setTipoDocumento}
              className="historico-select"
              options={[
                { value: 'todos', label: 'Todos' },
                { value: 'Historial clínico', label: 'Historial clínico' },
                { value: 'Nota de evolución', label: 'Nota de evolución' },
              ]}
            />

            <Checkbox
              checked={verOtrosConsultorios}
              onChange={(e) => setVerOtrosConsultorios(e.target.checked)}
            >
              Ver documentos de otros consultorios
            </Checkbox>
          </div>

          <Table
            className="historico-table"
            columns={columns}
            dataSource={historialesPaciente}
            rowKey="id"
            pagination={{
              pageSize: 6,
              showSizeChanger: false,
              position: ['bottomCenter'],
            }}
            scroll={historialesPaciente.length > 0 ? { x: 760 } : undefined}
            locale={{
              emptyText: <Empty description="No hay documentos registrados para este paciente" />,
            }}
          />
        </Card>
      </div>
    </div>
  );
};

export default HistoricoPaciente;