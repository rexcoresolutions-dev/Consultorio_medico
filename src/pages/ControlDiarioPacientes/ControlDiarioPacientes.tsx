import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
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
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  BarChartOutlined,
  CalendarOutlined,
  ClearOutlined,
  DownloadOutlined,
  EyeOutlined,
  FilePdfOutlined,
  PrinterOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import controlDiarioService, {
  type ControlDiarioRow,
  type ControlDiarioSnapshot,
  type ReportPacienteRow,
} from '../../services/control-diario/control-diario.service';
import './ControlDiarioPacientes.css';

const { Title } = Typography;

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

const getTotalMovimiento = (record: ControlDiarioRow) =>
  record.total_pacientes + record.total_consultas + record.total_recetas;

const getStatusInfo = (record: ControlDiarioRow) => {
  const totalMovimiento = getTotalMovimiento(record);

  if (totalMovimiento === 0) {
    return { label: 'Sin movimiento', className: 'control-status-empty' };
  }
  if (record.total_pacientes >= 20) {
    return { label: 'Alta afluencia', className: 'control-status-high' };
  }
  if (record.total_recetas > record.total_consultas) {
    return { label: 'Revisar registros', className: 'control-status-warning' };
  }
  return { label: 'Actividad normal', className: 'control-status-normal' };
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>'"]/g, (char) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#039;',
      '"': '&quot;',
    };
    return map[char] ?? char;
  });

const buildPrintableHtml = (reportHtml: string, title: string) => `
  <!doctype html>
  <html lang="es">
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(title)}</title>
      <style>
        @page { size: letter landscape; margin: 8mm; }
        * { box-sizing: border-box; }
        body { margin: 0; background: #fff; color: #111827; font-family: Arial, Helvetica, sans-serif; }
        .control-report-page { width: 100%; min-height: auto; padding: 0; background: #fff; color: #111827; box-shadow: none; }
        .control-report-header { display: grid; grid-template-columns: 1fr 150px; gap: 18px; align-items: end; padding-bottom: 12px; border-bottom: 2px solid #111827; }
        .control-report-brand span { display: block; margin-bottom: 5px; color: #0f766e; font-size: 10px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
        .control-report-brand h1 { margin: 0; color: #111827; font-size: 20px; line-height: 1.1; font-weight: 950; text-transform: uppercase; }
        .control-report-date { padding: 9px 10px; border: 1px solid #111827; border-radius: 10px; text-align: center; }
        .control-report-date span { display: block; margin-bottom: 3px; color: #475569; font-size: 9px; font-weight: 900; text-transform: uppercase; }
        .control-report-date strong { color: #111827; font-size: 13px; font-weight: 950; }
        .control-report-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 14px; margin: 12px 0 14px; }
        .control-report-meta div { padding: 8px 10px; border-radius: 9px; background: #fff; border: 1px solid #111827; }
        .control-report-meta-full { grid-column: 1 / -1; }
        .control-report-meta span, .control-report-footer span { display: block; margin-bottom: 3px; color: #475569; font-size: 8.5px; font-weight: 900; text-transform: uppercase; letter-spacing: .04em; }
        .control-report-meta strong, .control-report-footer strong { color: #111827; font-size: 10px; font-weight: 900; text-transform: uppercase; }
        .control-report-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 8.2px; }
        .control-report-table th, .control-report-table td { border: 1px solid #111827; padding: 4px; text-align: center; vertical-align: middle; line-height: 1.18; word-break: break-word; }
        .control-report-table th { font-size: 7.8px; font-weight: 950; text-transform: uppercase; background: #e2e8f0; }
        .control-report-table td:nth-child(4), .control-report-table td:nth-child(7), .control-report-table td:nth-child(8) { text-align: left; }
        .control-report-empty { height: 42px; color: #64748b; font-weight: 900; text-align: center !important; }
        .control-report-footer { display: grid; grid-template-columns: 1fr 230px; gap: 20px; margin-top: 18px; padding-top: 12px; }
        .control-report-footer div { padding-top: 10px; border-top: 1px solid #111827; }
      </style>
    </head>
    <body>${reportHtml}</body>
  </html>
`;

const ControlDiarioPacientes: React.FC = () => {
  const reportRef = useRef<HTMLElement | null>(null);
  const today = dayjs();

  const [mes, setMes] = useState(today.format('MM'));
  const [anio, setAnio] = useState<Dayjs>(today.startOf('year'));
  const [fechaReporte, setFechaReporte] = useState<Dayjs>(today);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const [snapshot, setSnapshot] = useState<ControlDiarioSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRow, setSelectedRow] = useState<ControlDiarioRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearchText(searchText.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchText]);

  const cargarDatos = async (silent = false) => {
    try {
      setLoading(true);
      const next = await controlDiarioService.loadSnapshot();
      setSnapshot(next);

      const fuentesNoDisponibles = Object.entries(next.sourceStatus)
        .filter(([, ok]) => !ok)
        .map(([name]) => name);

      if (!silent) {
        if (fuentesNoDisponibles.length > 0) {
          message.warning(`Control diario actualizado con información parcial. No respondió: ${fuentesNoDisponibles.join(', ')}.`);
        } else {
          message.success('Control diario actualizado.');
        }
      }
    } catch (error: any) {
      console.error('Error cargando control diario:', error);
      const apiMessage = error?.response?.data?.message;
      if (!silent) {
        message.error(
          Array.isArray(apiMessage)
            ? apiMessage.join('. ')
            : apiMessage || 'No fue posible cargar consultas, recetas ni pacientes.',
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargarDatos(true);
  }, []);

  const baseRows = useMemo(
    () => (snapshot ? controlDiarioService.buildRows(snapshot, mes, anio.year()) : []),
    [snapshot, mes, anio],
  );

  const rows = useMemo(() => {
    const query = normalizeText(debouncedSearchText);
    if (!query) return baseRows;
    return baseRows.filter((item) => {
      const status = getStatusInfo(item);
      return normalizeText(`${item.fecha} ${item.tipo_formato} ${status.label}`).includes(query);
    });
  }, [baseRows, debouncedSearchText]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, item) => ({
          pacientes: acc.pacientes + item.total_pacientes,
          consultas: acc.consultas + item.total_consultas,
          recetas: acc.recetas + item.total_recetas,
          diasConMovimiento: acc.diasConMovimiento + (getTotalMovimiento(item) > 0 ? 1 : 0),
        }),
        { pacientes: 0, consultas: 0, recetas: 0, diasConMovimiento: 0 },
      ),
    [rows],
  );

  const periodLabel = useMemo(() => {
    const monthLabel = meses.find((item) => item.value === mes)?.label || '';
    return `${monthLabel} ${anio.year()}`;
  }, [mes, anio]);

  useEffect(() => {
    const reportInPeriod = fechaReporte.format('MM') === mes && fechaReporte.year() === anio.year();
    if (reportInPeriod) return;

    const fallback = baseRows[0]?.fecha_iso
      ? dayjs(baseRows[0].fecha_iso)
      : dayjs(`${anio.year()}-${mes}-01`);
    setFechaReporte(fallback);
  }, [mes, anio, baseRows, fechaReporte]);

  const fechaReporteIso = fechaReporte.format('YYYY-MM-DD');
  const fechaReporteTexto = fechaReporte.format('DD/MM/YYYY');
  const pacientesReporte: ReportPacienteRow[] = useMemo(
    () => (snapshot ? controlDiarioService.buildReportRows(snapshot, fechaReporteIso) : []),
    [snapshot, fechaReporteIso],
  );

  const promedioPacientes = rows.length > 0 ? Math.round(totals.pacientes / rows.length) : 0;
  const selectedStatus = selectedRow ? getStatusInfo(selectedRow) : null;
  const selectedServices = selectedRow
    ? selectedRow.total_consultas + selectedRow.total_recetas
    : 0;
  const selectedShare =
    selectedRow && totals.pacientes > 0
      ? Math.round((selectedRow.total_pacientes / totals.pacientes) * 100)
      : 0;
  const selectedConsultasRate =
    selectedRow && selectedRow.total_pacientes > 0
      ? Math.round((selectedRow.total_consultas / selectedRow.total_pacientes) * 100)
      : 0;

  const handleLimpiar = () => {
    const now = dayjs();
    setMes(now.format('MM'));
    setAnio(now.startOf('year'));
    setFechaReporte(now);
    setSearchText('');
    setDebouncedSearchText('');
    setSelectedRow(null);
    setDetailOpen(false);
  };

  const openDetail = (record: ControlDiarioRow) => {
    setSelectedRow(record);
    setDetailOpen(true);
  };

  const openReport = (record?: ControlDiarioRow) => {
    if (record) setFechaReporte(dayjs(record.fecha_iso));
    setReportOpen(true);
  };

  const getReportFileName = () => {
    const pacientePart = snapshot?.meta.medicoNombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
    return `control-pacientes-${fechaReporteIso}${pacientePart ? `-${pacientePart}` : ''}.pdf`;
  };

  const handlePrintReport = () => {
    if (!reportRef.current) {
      message.warning('No se encontró el reporte para imprimir.');
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDocument) {
      document.body.removeChild(iframe);
      message.warning('No se pudo preparar la impresión.');
      return;
    }

    iframeDocument.open();
    iframeDocument.write(
      buildPrintableHtml(reportRef.current.outerHTML, `Control de pacientes ${fechaReporteTexto}`),
    );
    iframeDocument.close();

    window.setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      window.setTimeout(() => iframe.remove(), 1000);
    }, 120);
  };

  const handleDownloadPdf = async () => {
    if (!reportRef.current) {
      message.warning('No se encontró el reporte para descargar.');
      return;
    }

    try {
      setDownloadingPdf(true);
      if ('fonts' in document) await document.fonts.ready;
      await new Promise((resolve) => window.setTimeout(resolve, 120));

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: reportRef.current.scrollWidth,
        windowHeight: reportRef.current.scrollHeight,
      });

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 6;
      let imageWidth = pageWidth - margin * 2;
      let imageHeight = (canvas.height * imageWidth) / canvas.width;

      if (imageHeight > pageHeight - margin * 2) {
        imageHeight = pageHeight - margin * 2;
        imageWidth = (canvas.width * imageHeight) / canvas.height;
      }

      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        (pageWidth - imageWidth) / 2,
        margin,
        imageWidth,
        imageHeight,
      );
      pdf.save(getReportFileName());
    } catch (error) {
      console.error('Error generando PDF:', error);
      message.error('No fue posible generar el PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const columns: ColumnsType<ControlDiarioRow> = [
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      width: '17%',
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
      width: '15%',
      render: (value: string) => <Tag className="control-format-tag">{value}</Tag>,
    },
    {
      title: 'Pacientes',
      dataIndex: 'total_pacientes',
      align: 'center',
      width: '11%',
      render: (value: number) => <span className="control-number-cell">{value}</span>,
    },
    {
      title: 'Consultas',
      dataIndex: 'total_consultas',
      align: 'center',
      width: '11%',
      render: (value: number) => <span className="control-number-cell">{value}</span>,
    },
    {
      title: 'Recetas',
      dataIndex: 'total_recetas',
      align: 'center',
      width: '11%',
      render: (value: number) => <span className="control-number-cell">{value}</span>,
    },
    {
      title: 'Estado',
      width: '14%',
      render: (_, record) => {
        const status = getStatusInfo(record);
        return <Tag className={`control-status-tag ${status.className}`}>{status.label}</Tag>;
      },
    },
    {
      title: 'Acciones',
      align: 'center',
      width: '14%',
      render: (_, record) => (
        <div className="control-action-group">
          <Button size="small" icon={<EyeOutlined />} className="control-table-btn" onClick={() => openDetail(record)} />
          <Button size="small" icon={<FilePdfOutlined />} className="control-table-btn control-print-btn" onClick={() => openReport(record)} />
        </div>
      ),
    },
  ];

  return (
    <section className="control-page">
      <div className="control-shell">
        <div className="control-title-panel">
          <div className="control-title-accent" />
          <div className="control-title-content">
            <span>Módulo de control</span>
            <Title level={1}>Control diario de pacientes</Title>
            <p>Consolida pacientes, consultas y recetas usando únicamente las APIs clínicas disponibles.</p>
          </div>
          <div className="control-title-side">
            <div className="control-title-period">
              <CalendarOutlined />
              <div>
                <small>Periodo</small>
                <strong>{periodLabel}</strong>
              </div>
            </div>
            <div className="control-title-buttons">
              <Button icon={<ReloadOutlined />} className="control-refresh-btn" loading={loading} onClick={() => void cargarDatos()}>
                Actualizar
              </Button>
              <Button icon={<FilePdfOutlined />} className="control-main-export-btn" disabled={!snapshot} onClick={() => openReport()}>
                Generar reporte
              </Button>
            </div>
          </div>
        </div>

        {snapshot && (!snapshot.sourceStatus.consultas || !snapshot.sourceStatus.recetas || !snapshot.sourceStatus.pacientes) && (
          <Alert
            className="control-source-alert"
            type="warning"
            showIcon
            message="Información parcial"
            description="El control diario muestra únicamente las fuentes que respondieron correctamente. No se inventan datos faltantes."
          />
        )}

        <Card className="control-card">
          <div className="control-filter-panel">
            <Row gutter={[12, 12]} align="bottom">
              <Col xs={24} sm={12} md={5}>
                <label className="control-label">Mes</label>
                <Select value={mes} onChange={setMes} options={meses} className="control-select" />
              </Col>
              <Col xs={24} sm={12} md={5}>
                <label className="control-label">Año</label>
                <DatePicker picker="year" value={anio} allowClear={false} format="YYYY" onChange={(value) => value && setAnio(value)} className="control-year" />
              </Col>
              <Col xs={24} sm={12} md={5}>
                <label className="control-label">Fecha del reporte</label>
                <DatePicker value={fechaReporte} allowClear={false} format="DD/MM/YYYY" onChange={(value) => value && setFechaReporte(value)} className="control-year" />
              </Col>
              <Col xs={24} md={5}>
                <label className="control-label">Buscar</label>
                <Input value={searchText} allowClear prefix={<SearchOutlined />} placeholder="Fecha, formato o estado..." onChange={(event) => setSearchText(event.target.value)} className="control-search" />
              </Col>
              <Col xs={24} md={4}>
                <Button icon={<ClearOutlined />} onClick={handleLimpiar} className="control-clear-btn">Limpiar</Button>
              </Col>
            </Row>
          </div>

          <div className="control-summary-grid">
            <div className="control-summary-card control-summary-main">
              <span>Pacientes atendidos</span>
              <strong>{totals.pacientes}</strong>
              <small>{periodLabel}</small>
            </div>
            <div className="control-summary-card">
              <span>Consultas</span>
              <strong>{totals.consultas}</strong>
              <small>Registros clínicos del periodo</small>
            </div>
            <div className="control-summary-card">
              <span>Recetas emitidas</span>
              <strong>{totals.recetas}</strong>
              <small>Recetas registradas en la API</small>
            </div>
            <div className="control-summary-card">
              <span>Días con movimiento</span>
              <strong>{totals.diasConMovimiento}</strong>
              <small>Promedio: {promedioPacientes} pacientes</small>
            </div>
          </div>

          <div className="control-table-card">
            <div className="control-table-toolbar">
              <div>
                <span><BarChartOutlined />Registros diarios</span>
                <p>{rows.length} jornada(s) con actividad en el periodo</p>
              </div>
              <Tag className="control-period-tag"><CalendarOutlined />{periodLabel}</Tag>
            </div>

            <div className="control-table-desktop">
              <Table
                rowKey="id"
                columns={columns}
                dataSource={rows}
                size="middle"
                tableLayout="fixed"
                loading={loading}
                rowClassName={(record) => (getTotalMovimiento(record) === 0 ? 'control-row-muted' : '')}
                pagination={{ pageSize: 8, showSizeChanger: false, showTotal: (total) => `${total} registros` }}
                locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={loading ? 'Cargando información...' : 'Sin actividad registrada en este periodo'} /> }}
              />
            </div>

            <div className="control-mobile-list">
              {rows.length === 0 ? (
                <div className="control-mobile-empty">{loading ? 'Cargando información...' : 'Sin actividad registrada en este periodo.'}</div>
              ) : (
                rows.map((item) => {
                  const status = getStatusInfo(item);
                  return (
                    <div className="control-mobile-card" key={item.id}>
                      <div className="control-mobile-head">
                        <div><strong>{item.fecha}</strong><span>{item.tipo_formato}</span></div>
                        <Tag className={`control-status-tag ${status.className}`}>{status.label}</Tag>
                      </div>
                      <div className="control-mobile-grid">
                        <div><span>Pacientes</span><b>{item.total_pacientes}</b></div>
                        <div><span>Consultas</span><b>{item.total_consultas}</b></div>
                        <div><span>Recetas</span><b>{item.total_recetas}</b></div>
                      </div>
                      <div className="control-mobile-actions">
                        <Button icon={<EyeOutlined />} onClick={() => openDetail(item)}>Ver detalle</Button>
                        <Button icon={<FilePdfOutlined />} onClick={() => openReport(item)}>Generar reporte</Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Card>
      </div>

      <Modal open={detailOpen} onCancel={() => setDetailOpen(false)} width={760} centered className="control-detail-modal" title="Detalle del registro diario" footer={[<Button key="close" onClick={() => setDetailOpen(false)}>Cerrar</Button>]}>
        {selectedRow && selectedStatus && (
          <div className="control-detail">
            <div className="control-detail-header">
              <div><span>Registro seleccionado</span><h2>{selectedRow.fecha}</h2><p>{selectedRow.tipo_formato}</p></div>
              <Tag className={`control-status-tag ${selectedStatus.className}`}>{selectedStatus.label}</Tag>
            </div>
            <div className="control-detail-overview">
              <div><span>Participación del periodo</span><strong>{selectedShare}%</strong><Progress percent={selectedShare} showInfo={false} strokeWidth={8} /></div>
              <div><span>Servicios registrados</span><strong>{selectedServices}</strong><small>Consultas y recetas reales</small></div>
              <div><span>Consulta / paciente</span><strong>{selectedConsultasRate}%</strong><small>Relación del día seleccionado</small></div>
            </div>
            <div className="control-detail-grid">
              <div><span>Pacientes</span><strong>{selectedRow.total_pacientes}</strong></div>
              <div><span>Consultas</span><strong>{selectedRow.total_consultas}</strong></div>
              <div><span>Recetas</span><strong>{selectedRow.total_recetas}</strong></div>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={reportOpen} onCancel={() => setReportOpen(false)} width="96vw" centered className="control-report-modal" title="Vista previa del reporte" footer={[
        <Button key="close" onClick={() => setReportOpen(false)}>Cerrar</Button>,
        <Button key="print" icon={<PrinterOutlined />} className="control-report-print-btn" onClick={handlePrintReport}>Imprimir</Button>,
        <Button key="download" icon={<DownloadOutlined />} loading={downloadingPdf} className="control-report-download-btn" onClick={handleDownloadPdf}>Descargar PDF</Button>,
      ]}>
        <div className="control-report-preview-shell">
          <div className="control-report-print-area">
            <main className="control-report-page" ref={reportRef}>
              <header className="control-report-header">
                <div className="control-report-brand"><span>Reporte clínico administrativo</span><h1>Control de pacientes consultorio</h1></div>
                <div className="control-report-date"><span>Fecha</span><strong>{fechaReporteTexto}</strong></div>
              </header>

              <section className="control-report-meta">
                <div><span>Unidad médica</span><strong>{snapshot?.meta.unidad || 'Consultorio médico'}</strong></div>
                <div>
                  <span>Médico responsable</span>
                  <strong>
                    {snapshot
                      ? `${snapshot.meta.medicoTitulo} ${snapshot.meta.medicoNombre}${
                          snapshot.meta.especialidad ? ` · ${snapshot.meta.especialidad}` : ''
                        }${snapshot.meta.cedulaProfesional ? ` · Céd. ${snapshot.meta.cedulaProfesional}` : ''}`
                      : '-'}
                  </strong>
                </div>
                <div className="control-report-meta-full"><span>Domicilio</span><strong>{snapshot?.meta.domicilio || 'Domicilio no registrado'}</strong></div>
              </section>

              <table className="control-report-table">
                <thead><tr><th>No.</th><th>Hora</th><th>No. Receta</th><th>Paciente</th><th>Edad</th><th>Sexo</th><th>Diagnóstico</th><th>Tratamiento</th><th>Estudios clínicos</th></tr></thead>
                <tbody>
                  {pacientesReporte.length === 0 ? (
                    <tr><td colSpan={9} className="control-report-empty">Sin consultas registradas para la fecha seleccionada.</td></tr>
                  ) : (
                    pacientesReporte.map((item, index) => (
                      <tr key={item.id}>
                        <td>{index + 1}</td><td>{item.hora}</td><td>{item.noReceta}</td><td>{item.paciente}</td><td>{item.edad}</td><td>{item.sexo}</td><td>{item.diagnostico}</td><td>{item.tratamiento}</td><td>{item.estudiosClinicos}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <footer className="control-report-footer">
                <div><span>Elaboró</span><strong>{snapshot ? `${snapshot.meta.medicoTitulo} ${snapshot.meta.medicoNombre}` : '-'}</strong></div>
                <div><span>Firma</span><strong>____________________________</strong></div>
              </footer>
            </main>
          </div>
        </div>
      </Modal>
    </section>
  );
};

export default ControlDiarioPacientes;
