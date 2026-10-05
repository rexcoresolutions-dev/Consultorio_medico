import { documentosService, allPages, apiData } from '../../services/operacion/operacion.service';
import DocumentoDetalle from '../../components/DocumentoDetalle/DocumentoDetalle';
import api from '../../api/axios.config';
import authService from '../../services/auth/auth.service';
import { getUserRoleId } from '../../utils/role.utils';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Input,
  Modal,
  Row,
  Select,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  CalendarOutlined,
  ClearOutlined,
  EyeOutlined,
  FileDoneOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import './Documentos.css';

const { Title } = Typography;

type TipoDocumento =
  | 'TODOS'
  | 'CONSULTA EXTERNA'
  | 'HOJA DE REFERENCIA'
  | 'RECETA'
  | 'ESTUDIOS CLÍNICOS'
  | 'CERTIFICADO MÉDICO';

type DocumentoRow = {
  contenido?: unknown;
  id: string;
  documento: Exclude<TipoDocumento, 'TODOS'>;
  nombre_paciente: string;
  curp: string;
  fecha_hora: string;
  fecha_iso: string;
  nombre_medico: string;
  descripcion: string;
};

const tiposDocumento: { label: string; value: TipoDocumento }[] = [
  { label: 'Todos', value: 'TODOS' },
  { label: 'Certificado médico', value: 'CERTIFICADO MÉDICO' },
  { label: 'Consulta externa', value: 'CONSULTA EXTERNA' },
  { label: 'Hoja de referencia', value: 'HOJA DE REFERENCIA' },
  { label: 'Receta', value: 'RECETA' },
  { label: 'Estudios clínicos', value: 'ESTUDIOS CLÍNICOS' },
];


const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const getDocumentoClass = (documento: DocumentoRow['documento']) => {
  if (documento === 'CONSULTA EXTERNA') return 'documentos-tag-consulta';
  if (documento === 'HOJA DE REFERENCIA') return 'documentos-tag-referencia';
  if (documento === 'RECETA') return 'documentos-tag-receta';

  return 'documentos-tag-estudios';
};

const getOrderedDateRange = (start: Dayjs, end: Dayjs) => {
  if (start.isAfter(end)) {
    return {
      inicio: end.startOf('day'),
      fin: start.endOf('day'),
    };
  }

  return {
    inicio: start.startOf('day'),
    fin: end.endOf('day'),
  };
};

const Documentos: React.FC = () => {
  const [documentos, setDocumentos] = useState<DocumentoRow[]>([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    const name = (p: any) => p?.nombre_completo || [p?.nombre, p?.primerApellido ?? p?.primer_apellido, p?.segundoApellido ?? p?.segundo_apellido].filter(Boolean).join(' ') || 'No disponible';
    const row = (id: string, documento: DocumentoRow['documento'], fecha: string, paciente: any, medico: any, descripcion: string): DocumentoRow => ({ id, documento, fecha_iso: fecha, fecha_hora: dayjs(fecha).format('DD/MM/YYYY HH:mm'), nombre_paciente: name(paciente), curp: paciente?.curp ?? '', nombre_medico: name(medico), descripcion });
    const list = (path: string) => allPages<any>(page => apiData(api.get(path, { params: { page, limit: 100 } })));
    Promise.allSettled([documentosService.list(), getUserRoleId(authService.getUser()) === 3 ? Promise.resolve([]) : list('/consultas'), list('/recetas')]).then(results => {
      if (!active) return;
      const [docs, consultas, recetas] = results.map(r => r.status === 'fulfilled' ? r.value : []);
      const labels: Record<string, DocumentoRow['documento']> = { CERTIFICADO_MEDICO: 'CERTIFICADO MÉDICO', ESTUDIOS_CLINICOS: 'ESTUDIOS CLÍNICOS', HOJA_REFERENCIA: 'HOJA DE REFERENCIA' };
      setDocumentos([
        ...docs.map((d: any) => ({ ...row('doc-' + d.id, labels[d.tipo], d.createdAt, d.datos?.paciente, d.usuario, d.datos?.detalle || d.datos?.motivo || labels[d.tipo]), contenido: d.datos })),
        ...consultas.map((d: any) => ({ ...row('consulta-' + d.id, 'CONSULTA EXTERNA', d.fechaHora || d.createdAt, d.paciente, d.medico, d.motivoConsulta || 'Consulta externa'), contenido: d })),
        ...recetas.map((d: any) => ({ ...row('receta-' + d.id, 'RECETA', d.fecha || d.createdAt, d.consulta?.paciente, d.consulta?.medico, d.observaciones || 'Receta médica'), contenido: { medicamentos: d.medicamentos, observaciones: d.observaciones, fechaSeguimiento: d.fechaSeguimiento } })),
      ]);
      if (results.some(r => r.status === 'rejected')) setLoadError('No se pudieron cargar todos los documentos del servidor.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const [fechaInicial, setFechaInicial] = useState<Dayjs>(dayjs());
  const [fechaFinal, setFechaFinal] = useState<Dayjs>(dayjs());
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>('TODOS');
  const [searchText, setSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');

  const [selectedDocumento, setSelectedDocumento] =
    useState<DocumentoRow | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchText(searchText.trim());
    }, 420);

    return () => window.clearTimeout(timer);
  }, [searchText]);

  const documentosFiltrados = useMemo(() => {
    const { inicio, fin } = getOrderedDateRange(fechaInicial, fechaFinal);
    const query = normalizeText(debouncedSearchText);

    return documentos.filter((item) => {
      const fecha = dayjs(item.fecha_iso);

      const matchDate =
        fecha.isSame(inicio) ||
        fecha.isSame(fin) ||
        (fecha.isAfter(inicio) && fecha.isBefore(fin));

      const matchTipo =
        tipoDocumento === 'TODOS' || item.documento === tipoDocumento;

      const matchSearch =
        !query ||
        normalizeText(
          `${item.documento} ${item.nombre_paciente} ${item.curp} ${item.fecha_hora} ${item.nombre_medico}`,
        ).includes(query);

      return matchDate && matchTipo && matchSearch;
    });
  }, [documentos, fechaInicial, fechaFinal, tipoDocumento, debouncedSearchText]);

  useEffect(() => {
    if (!selectedDocumento) return;

    const exists = documentosFiltrados.some(
      (item) => item.id === selectedDocumento.id,
    );

    if (!exists) {
      setSelectedDocumento(null);
      setPreviewOpen(false);
    }
  }, [documentosFiltrados, selectedDocumento]);

  const resumen = useMemo(() => {
    return documentosFiltrados.reduce(
      (acc, item) => ({
        total: acc.total + 1,
        consultas:
          acc.consultas + (item.documento === 'CONSULTA EXTERNA' ? 1 : 0),
        recetas: acc.recetas + (item.documento === 'RECETA' ? 1 : 0),
        referencias:
          acc.referencias +
          (item.documento === 'HOJA DE REFERENCIA' ? 1 : 0),
      }),
      {
        total: 0,
        consultas: 0,
        recetas: 0,
        referencias: 0,
      },
    );
  }, [documentosFiltrados]);

  const handleLimpiar = () => {
    const defaultDate = dayjs();

    setFechaInicial(defaultDate);
    setFechaFinal(defaultDate);
    setTipoDocumento('TODOS');
    setSearchText('');
    setDebouncedSearchText('');
    setSelectedDocumento(null);
    setPreviewOpen(false);
  };

  const openPreview = (record: DocumentoRow) => {
    setSelectedDocumento(record);
    setPreviewOpen(true);
  };

  const columns: ColumnsType<DocumentoRow> = [
    {
      title: 'Documento',
      dataIndex: 'documento',
      width: '17%',
      render: (value: DocumentoRow['documento']) => (
        <Tag className={`documentos-doc-tag ${getDocumentoClass(value)}`}>
          {value}
        </Tag>
      ),
    },
    {
      title: 'Nombre paciente',
      dataIndex: 'nombre_paciente',
      width: '22%',
      render: (value: string) => (
        <div className="documentos-paciente-cell">
          <strong>{value}</strong>
          <span>Paciente registrado</span>
        </div>
      ),
    },
    {
      title: 'CURP',
      dataIndex: 'curp',
      width: '18%',
      render: (value: string) => (
        <span className="documentos-curp">{value}</span>
      ),
    },
    {
      title: 'Fecha/Hora generación',
      dataIndex: 'fecha_hora',
      width: '18%',
      render: (value: string) => {
        const [fecha, hora] = value.split(' ');

        return (
          <div className="documentos-date-cell">
            <strong>{fecha}</strong>
            <span>{hora}</span>
          </div>
        );
      },
    },
    {
      title: 'Nombre médico',
      dataIndex: 'nombre_medico',
      width: '17%',
      render: (value: string) => (
        <div className="documentos-medico-cell">
          <strong>{value}</strong>
        </div>
      ),
    },
    {
      title: '',
      align: 'center',
      width: '8%',
      render: (_, record) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          className="documentos-table-btn"
          onClick={() => openPreview(record)}
        />
      ),
    },
  ];

  return (
    <section className="documentos-page">
      {loadError && <Alert type="error" title={loadError} showIcon />}
      <div className="documentos-shell">
        <div className="documentos-header">
          <div className="documentos-header-accent" />

          <div className="documentos-header-content">
            <span>Módulo documental</span>
            <Title level={1}>Documentos</Title>
            <p>
              Consulta documentos generados por paciente, fecha, tipo de
              documento y médico responsable.
            </p>
          </div>

          <div className="documentos-header-card">
            <FileDoneOutlined />
            <div>
              <span>Total encontrados</span>
              <strong>{documentosFiltrados.length}</strong>
            </div>
          </div>
        </div>

        <Card className="documentos-card">
          <div className="documentos-filter-panel">
            <Row gutter={[12, 12]} align="bottom">
              <Col xs={24} sm={12} lg={5}>
                <label className="documentos-label">Fecha inicial</label>
                <DatePicker
                  value={fechaInicial}
                  allowClear={false}
                  format="DD/MM/YYYY"
                  onChange={(value) => value && setFechaInicial(value)}
                  className="documentos-date-picker"
                />
              </Col>

              <Col xs={24} sm={12} lg={5}>
                <label className="documentos-label">Fecha final</label>
                <DatePicker
                  value={fechaFinal}
                  allowClear={false}
                  format="DD/MM/YYYY"
                  onChange={(value) => value && setFechaFinal(value)}
                  className="documentos-date-picker"
                />
              </Col>

              <Col xs={24} sm={12} lg={5}>
                <label className="documentos-label">Tipo documento</label>
                <Select<TipoDocumento>
                  value={tipoDocumento}
                  options={tiposDocumento}
                  onChange={setTipoDocumento}
                  className="documentos-select"
                />
              </Col>

              <Col xs={24} lg={5}>
                <label className="documentos-label">Buscar</label>
                <Input
                  value={searchText}
                  allowClear
                  prefix={<SearchOutlined />}
                  placeholder="Paciente, CURP o médico..."
                  onChange={(event) => setSearchText(event.target.value)}
                  className="documentos-search"
                />
              </Col>

              <Col xs={24} lg={4}>
                <div className="documentos-actions">
                  <Button
                    icon={<ClearOutlined />}
                    className="documentos-clear-btn"
                    onClick={handleLimpiar}
                  >
                    Limpiar
                  </Button>
                </div>
              </Col>
            </Row>
          </div>

          <div className="documentos-summary-grid">
            <div className="documentos-summary-card documentos-summary-main">
              <span>Total documentos</span>
              <strong>{resumen.total}</strong>
              <small>
                {fechaInicial.format('DD/MM/YYYY')} -{' '}
                {fechaFinal.format('DD/MM/YYYY')}
              </small>
            </div>

            <div className="documentos-summary-card">
              <span>Consultas externas</span>
              <strong>{resumen.consultas}</strong>
              <small>Documentos generados</small>
            </div>

            <div className="documentos-summary-card">
              <span>Recetas</span>
              <strong>{resumen.recetas}</strong>
              <small>Indicaciones médicas</small>
            </div>

            <div className="documentos-summary-card">
              <span>Referencias</span>
              <strong>{resumen.referencias}</strong>
              <small>Hojas emitidas</small>
            </div>
          </div>

          <div className="documentos-table-card">
            <div className="documentos-table-toolbar">
              <div>
                <span>
                  <CalendarOutlined />
                  Documentos generados
                </span>
                <p>{documentosFiltrados.length} registros encontrados</p>
              </div>

              <Button
                icon={<EyeOutlined />}
                disabled={!selectedDocumento}
                className="documentos-preview-btn"
                onClick={() => selectedDocumento && setPreviewOpen(true)}
              >
                Vista previa
              </Button>
            </div>

            <div className="documentos-table-desktop">
              <Table loading={loading}
                rowKey="id"
                columns={columns}
                dataSource={documentosFiltrados}
                size="middle"
                tableLayout="fixed"
                rowClassName={(record) =>
                  selectedDocumento?.id === record.id
                    ? 'documentos-row-selected'
                    : ''
                }
                onRow={(record) => ({
                  onClick: () => setSelectedDocumento(record),
                  onDoubleClick: () => openPreview(record),
                })}
                pagination={{
                  pageSize: 9,
                  showSizeChanger: false,
                  showTotal: (total) => `${total} documentos`,
                }}
                locale={{
                  emptyText: (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="Sin documentos disponibles"
                    />
                  ),
                }}
              />
            </div>

            <div className="documentos-mobile-list">
              {documentosFiltrados.length === 0 ? (
                <div className="documentos-mobile-empty">
                  Sin documentos disponibles.
                </div>
              ) : (
                documentosFiltrados.map((item) => (
                  <div className="documentos-mobile-card" key={item.id}>
                    <div className="documentos-mobile-head">
                      <Tag
                        className={`documentos-doc-tag ${getDocumentoClass(
                          item.documento,
                        )}`}
                      >
                        {item.documento}
                      </Tag>

                      <span>{item.fecha_hora}</span>
                    </div>

                    <strong>{item.nombre_paciente}</strong>

                    <div className="documentos-mobile-info">
                      <div>
                        <span>CURP</span>
                        <b>{item.curp}</b>
                      </div>

                      <div>
                        <span>Médico</span>
                        <b>{item.nombre_medico}</b>
                      </div>
                    </div>

                    <Button
                      icon={<EyeOutlined />}
                      onClick={() => openPreview(item)}
                    >
                      Vista previa
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>
      </div>

      <Modal
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        width={820}
        centered
        className="documentos-preview-modal"
        title="Vista previa del documento"
        footer={[
          <Button key="close" onClick={() => setPreviewOpen(false)}>
            Cerrar
          </Button>,
        ]}
      >
        {selectedDocumento && (
          <div className="documentos-preview">
            <div className="documentos-preview-header">
              <div>
                <span>{selectedDocumento.documento}</span>
                <h2>{selectedDocumento.nombre_paciente}</h2>
                <p>{selectedDocumento.descripcion}</p>
              </div>

              <Tag
                className={`documentos-doc-tag ${getDocumentoClass(
                  selectedDocumento.documento,
                )}`}
              >
                {selectedDocumento.documento}
              </Tag>
            </div>

            <div className="documentos-preview-grid">
              <div>
                <span>Paciente</span>
                <strong>{selectedDocumento.nombre_paciente}</strong>
              </div>

              <div>
                <span>CURP</span>
                <strong>{selectedDocumento.curp}</strong>
              </div>

              <div>
                <span>Fecha/Hora generación</span>
                <strong>{selectedDocumento.fecha_hora}</strong>
              </div>

              <div>
                <span>Médico responsable</span>
                <strong>{selectedDocumento.nombre_medico}</strong>
              </div>
            </div>

            <div className="documentos-preview-paper">
              <h3>{selectedDocumento.documento}</h3>
              <DocumentoDetalle datos={selectedDocumento.contenido} />

              <p>
                Documento generado dentro del expediente clínico del paciente{' '}
                <strong>{selectedDocumento.nombre_paciente}</strong>.
              </p>

              <p>
                Fecha de generación:{' '}
                <strong>{selectedDocumento.fecha_hora}</strong>.
              </p>

              <p>
                Médico responsable:{' '}
                <strong>{selectedDocumento.nombre_medico}</strong>.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
};

export default Documentos;
