import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Input,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  ClearOutlined,
  DatabaseOutlined,
  EyeOutlined,
  FileTextOutlined,
  LineChartOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import './ControlDiarioPacientes.css';

const { Title, Text } = Typography;

type ControlDiarioRow = {
  id: string;
  fecha: string;
  fecha_iso: string;
  tipo_formato: string;
  total_pacientes: number;
  total_certificados: number;
  total_procedimientos: number;
  total_consultas: number;
};

type ControlStatus = {
  label: string;
  className: string;
};

const DEFAULT_MONTH = '05';
const DEFAULT_YEAR = dayjs('2026-01-01');

const dataDemo: ControlDiarioRow[] = [
  {
    id: '1',
    fecha: '17/05/2026',
    fecha_iso: '2026-05-17',
    tipo_formato: 'HOJA DIARIA',
    total_pacientes: 6,
    total_certificados: 0,
    total_procedimientos: 2,
    total_consultas: 6,
  },
  {
    id: '2',
    fecha: '16/05/2026',
    fecha_iso: '2026-05-16',
    tipo_formato: 'HOJA DIARIA',
    total_pacientes: 27,
    total_certificados: 0,
    total_procedimientos: 3,
    total_consultas: 27,
  },
  {
    id: '3',
    fecha: '15/05/2026',
    fecha_iso: '2026-05-15',
    tipo_formato: 'HOJA DIARIA',
    total_pacientes: 0,
    total_certificados: 0,
    total_procedimientos: 0,
    total_consultas: 0,
  },
  {
    id: '4',
    fecha: '14/05/2026',
    fecha_iso: '2026-05-14',
    tipo_formato: 'HOJA DIARIA',
    total_pacientes: 12,
    total_certificados: 0,
    total_procedimientos: 14,
    total_consultas: 12,
  },
  {
    id: '5',
    fecha: '13/05/2026',
    fecha_iso: '2026-05-13',
    tipo_formato: 'HOJA DIARIA',
    total_pacientes: 5,
    total_certificados: 0,
    total_procedimientos: 7,
    total_consultas: 5,
  },
];

const meses = [
  { label: 'Enero', value: '01' },
  { label: 'Febrero', value: '02' },
  { label: 'Marzo', value: '03' },
  { label: 'Abril', value: '04' },
  { label: 'Mayo', value: '05' },
  { label: 'Junio', value: '06' },
  { label: 'Julio', value: '07' },
  { label: 'Agosto', value: '08' },
  { label: 'Septiembre', value: '09' },
  { label: 'Octubre', value: '10' },
  { label: 'Noviembre', value: '11' },
  { label: 'Diciembre', value: '12' },
];

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const getStatusInfo = (record: ControlDiarioRow): ControlStatus => {
  const totalActividad =
    record.total_pacientes +
    record.total_certificados +
    record.total_procedimientos +
    record.total_consultas;

  if (totalActividad === 0) {
    return {
      label: 'Sin movimiento',
      className: 'control-status--empty',
    };
  }

  if (record.total_pacientes >= 20) {
    return {
      label: 'Mayor afluencia',
      className: 'control-status--high',
    };
  }

  if (record.total_procedimientos > record.total_consultas) {
    return {
      label: 'Alta actividad',
      className: 'control-status--active',
    };
  }

  return {
    label: 'Normal',
    className: 'control-status--normal',
  };
};

const ControlDiarioPacientes: React.FC = () => {
  const navigate = useNavigate();

  const [mes, setMes] = useState(DEFAULT_MONTH);
  const [anio, setAnio] = useState<Dayjs>(DEFAULT_YEAR);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const [selectedRow, setSelectedRow] = useState<ControlDiarioRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 280);

    return () => window.clearTimeout(timer);
  }, [searchText]);

  const filteredRows = useMemo(() => {
    const query = normalizeText(debouncedSearchText);
    const selectedYear = anio.year();

    return dataDemo.filter((item) => {
      const itemDate = dayjs(item.fecha_iso);
      const status = getStatusInfo(item);

      const matchMonth = itemDate.format('MM') === mes;
      const matchYear = itemDate.year() === selectedYear;

      const searchableText = normalizeText(
        `${item.fecha} ${item.tipo_formato} ${status.label}`,
      );

      const matchSearch = !query || searchableText.includes(query);

      return matchMonth && matchYear && matchSearch;
    });
  }, [mes, anio, debouncedSearchText]);

  const totals = useMemo(
    () =>
      filteredRows.reduce(
        (acc, item) => ({
          pacientes: acc.pacientes + item.total_pacientes,
          certificados: acc.certificados + item.total_certificados,
          procedimientos: acc.procedimientos + item.total_procedimientos,
          consultas: acc.consultas + item.total_consultas,
        }),
        {
          pacientes: 0,
          certificados: 0,
          procedimientos: 0,
          consultas: 0,
        },
      ),
    [filteredRows],
  );

  const periodLabel = useMemo(() => {
    const monthLabel = meses.find((item) => item.value === mes)?.label || '';
    return `${monthLabel} ${anio.year()}`;
  }, [mes, anio]);

  const selectedStatus = selectedRow ? getStatusInfo(selectedRow) : null;

  const selectedServices = selectedRow
    ? selectedRow.total_certificados +
      selectedRow.total_procedimientos +
      selectedRow.total_consultas
    : 0;

  const selectedShare =
    selectedRow && totals.pacientes > 0
      ? Math.round((selectedRow.total_pacientes / totals.pacientes) * 100)
      : 0;

  const selectedConsultasRate =
    selectedRow && selectedRow.total_pacientes > 0
      ? Math.round((selectedRow.total_consultas / selectedRow.total_pacientes) * 100)
      : 0;

  const openDetail = (record: ControlDiarioRow) => {
    setSelectedRow(record);
    setDetailOpen(true);
  };

  const handleLimpiar = () => {
    setMes(DEFAULT_MONTH);
    setAnio(DEFAULT_YEAR);
    setSearchText('');
    setDebouncedSearchText('');
    setSelectedRow(null);
    setDetailOpen(false);
  };

  const columns: ColumnsType<ControlDiarioRow> = [
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      width: 150,
      render: (_, record) => (
        <div className="control-date-cell">
          <strong>{record.fecha}</strong>
          <span>Registro diario</span>
        </div>
      ),
    },
    {
      title: 'Formato',
      dataIndex: 'tipo_formato',
      width: 170,
      render: (value: string) => (
        <Tag className="control-format-tag">{value}</Tag>
      ),
    },
    {
      title: 'Pacientes',
      dataIndex: 'total_pacientes',
      align: 'right',
      width: 130,
      render: (value: number) => (
        <div className="control-number-cell">
          <strong>{value}</strong>
        </div>
      ),
    },
    {
      title: 'Certificados',
      dataIndex: 'total_certificados',
      align: 'right',
      width: 145,
      render: (value: number) => (
        <div className="control-number-cell">
          <strong>{value}</strong>
        </div>
      ),
    },
    {
      title: 'Procedimientos',
      dataIndex: 'total_procedimientos',
      align: 'right',
      width: 165,
      render: (value: number) => (
        <div className="control-number-cell">
          <strong>{value}</strong>
        </div>
      ),
    },
    {
      title: 'Consultas',
      dataIndex: 'total_consultas',
      align: 'right',
      width: 130,
      render: (value: number) => (
        <div className="control-number-cell">
          <strong>{value}</strong>
        </div>
      ),
    },
    {
      title: 'Estado',
      width: 160,
      render: (_, record) => {
        const status = getStatusInfo(record);

        return (
          <Tag className={`control-status-tag ${status.className}`}>
            {status.label}
          </Tag>
        );
      },
    },
    {
      title: 'Detalle',
      width: 130,
      align: 'center',
      render: (_, record) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          className="control-table-btn"
          onClick={() => openDetail(record)}
        >
          Ver
        </Button>
      ),
    },
  ];

  return (
    <section className="control-page">
      <div className="control-shell">
        <div className="control-hero">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/historico-paciente')}
            className="control-back-btn"
          >
            Regresar
          </Button>

          <div className="control-hero-title">
            <span className="control-eyebrow">
              <FileTextOutlined />
              Reporte operativo
            </span>

            <Title level={3}>Control diario de pacientes</Title>

            <Text>
              Consulta los registros diarios por mes y año. Los datos se
              actualizan automáticamente al cambiar los filtros.
            </Text>
          </div>

          <div className="control-live-pill">
            <span className="control-live-dot" />
            <div>
              <strong>Datos en tiempo real</strong>
              <small>Filtros aplicados automáticamente</small>
            </div>
          </div>
        </div>

        <Card className="control-card">
          <div className="control-filter-box">
            <div className="control-filter-head">
              <div>
                <span className="control-filter-title">
                  <CalendarOutlined />
                  Filtros de consulta
                </span>

                <Text>
                  Selecciona el periodo o escribe una fecha, formato o estado.
                  No es necesario presionar buscar.
                </Text>
              </div>

              <Button
                icon={<ClearOutlined />}
                onClick={handleLimpiar}
                className="control-clear-btn"
              >
                Limpiar filtros
              </Button>
            </div>

            <Row gutter={[14, 12]} align="bottom">
              <Col xs={24} sm={12} lg={6}>
                <label className="control-label">Mes</label>
                <Select
                  value={mes}
                  onChange={setMes}
                  options={meses}
                  className="control-select"
                />
              </Col>

              <Col xs={24} sm={12} lg={6}>
                <label className="control-label">Año</label>
                <DatePicker
                  picker="year"
                  value={anio}
                  allowClear={false}
                  format="YYYY"
                  onChange={(value) => value && setAnio(value)}
                  className="control-year"
                />
              </Col>

              <Col xs={24} lg={12}>
                <label className="control-label">Búsqueda rápida</label>
                <Input
                  value={searchText}
                  allowClear
                  prefix={<SearchOutlined />}
                  placeholder="Buscar por fecha, formato o estado..."
                  onChange={(event) => setSearchText(event.target.value)}
                  className="control-search"
                />
              </Col>
            </Row>

            <div className="control-applied-row">
              <Tag className="control-applied-tag">
                Periodo: <strong>{periodLabel}</strong>
              </Tag>

              <Tag className="control-applied-tag">
                Registros encontrados: <strong>{filteredRows.length}</strong>
              </Tag>
            </div>
          </div>

          <div className="control-summary-grid">
            <div className="control-summary-card">
              <span>Total pacientes</span>
              <strong>{totals.pacientes}</strong>
              <small>Pacientes atendidos en el periodo</small>
            </div>

            <div className="control-summary-card">
              <span>Total certificados</span>
              <strong>{totals.certificados}</strong>
              <small>Certificados registrados</small>
            </div>

            <div className="control-summary-card">
              <span>Total procedimientos</span>
              <strong>{totals.procedimientos}</strong>
              <small>Procedimientos capturados</small>
            </div>

            <div className="control-summary-card">
              <span>Total consultas</span>
              <strong>{totals.consultas}</strong>
              <small>Consultas realizadas</small>
            </div>
          </div>

          <div className="control-table-section">
            <div className="control-table-heading">
              <div>
                <span>
                  <DatabaseOutlined />
                  Registros diarios
                </span>
                <p>Información resumida del control diario seleccionado.</p>
              </div>

              <div className="control-table-counter">
                {filteredRows.length} registro
                {filteredRows.length === 1 ? '' : 's'}
              </div>
            </div>

            <div className="control-table-desktop">
              <Table
                rowKey="id"
                columns={columns}
                dataSource={filteredRows}
                size="middle"
                scroll={{ x: 1050 }}
                rowClassName={(record) =>
                  record.total_pacientes === 0 ? 'control-row-muted' : ''
                }
                pagination={{
                  pageSize: 8,
                  showSizeChanger: false,
                  showTotal: (total) => `${total} registros`,
                }}
                locale={{
                  emptyText: (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="Sin registros disponibles para los filtros seleccionados"
                    />
                  ),
                }}
              />
            </div>

            <div className="control-mobile-list">
              {filteredRows.length === 0 ? (
                <div className="control-mobile-empty">
                  Sin registros disponibles para los filtros seleccionados.
                </div>
              ) : (
                filteredRows.map((item) => {
                  const status = getStatusInfo(item);

                  return (
                    <div className="control-mobile-card" key={item.id}>
                      <div className="control-mobile-top">
                        <div>
                          <strong>{item.fecha}</strong>
                          <span>{item.tipo_formato}</span>
                        </div>

                        <Tag
                          className={`control-status-tag ${status.className}`}
                        >
                          {status.label}
                        </Tag>
                      </div>

                      <div className="control-mobile-stats">
                        <div>
                          <span>Pacientes</span>
                          <b>{item.total_pacientes}</b>
                        </div>

                        <div>
                          <span>Certificados</span>
                          <b>{item.total_certificados}</b>
                        </div>

                        <div>
                          <span>Procedimientos</span>
                          <b>{item.total_procedimientos}</b>
                        </div>

                        <div>
                          <span>Consultas</span>
                          <b>{item.total_consultas}</b>
                        </div>
                      </div>

                      <Button icon={<EyeOutlined />} onClick={() => openDetail(item)}>
                        Ver detalle
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Card>
      </div>

      <Modal
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        width={820}
        centered
        className="control-preview-modal"
        title="Detalle del registro diario"
        footer={[
          <Button key="close" onClick={() => setDetailOpen(false)}>
            Cerrar
          </Button>,
        ]}
      >
        {selectedRow && selectedStatus && (
          <div className="control-detail">
            <div className="control-detail-header">
              <div>
                <span>Control diario</span>
                <h2>{selectedRow.fecha}</h2>
                <p>{selectedRow.tipo_formato}</p>
              </div>

              <Tag
                className={`control-status-tag ${selectedStatus.className}`}
              >
                {selectedStatus.label}
              </Tag>
            </div>

            <div className="control-detail-overview">
              <div>
                <span>Participación del periodo</span>
                <strong>{selectedShare}%</strong>
                <Progress
                  percent={selectedShare}
                  showInfo={false}
                  strokeWidth={8}
                />
              </div>

              <div>
                <span>Servicios registrados</span>
                <strong>{selectedServices}</strong>
                <small>Consultas, certificados y procedimientos</small>
              </div>

              <div>
                <span>Relación consulta / paciente</span>
                <strong>{selectedConsultasRate}%</strong>
                <small>Comparación del día seleccionado</small>
              </div>
            </div>

            <div className="control-detail-grid">
              <div>
                <span>Total pacientes</span>
                <strong>{selectedRow.total_pacientes}</strong>
              </div>

              <div>
                <span>Total certificados</span>
                <strong>{selectedRow.total_certificados}</strong>
              </div>

              <div>
                <span>Total procedimientos</span>
                <strong>{selectedRow.total_procedimientos}</strong>
              </div>

              <div>
                <span>Total consultas</span>
                <strong>{selectedRow.total_consultas}</strong>
              </div>
            </div>

            <div className="control-detail-note">
              <LineChartOutlined />
              <span>
                Este detalle permite revisar rápidamente si el día tuvo
                movimiento, alta carga de pacientes o actividad relevante en
                procedimientos.
              </span>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
};

export default ControlDiarioPacientes;