import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  SearchOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import './ControlDiarioPacientes.css';

const { Title } = Typography;

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

type ReportPacienteRow = {
  id: string;
  fecha_iso: string;
  hora: string;
  noReceta: string;
  paciente: string;
  edad: string;
  sexo: string;
  diagnostico: string;
  tratamiento: string;
  estudiosClinicos: string;
};

const datosReporte = {
  unidad: 'FC2413 - TEPEXI DE RODRIGUEZ 1 PUE - CONSULTORIO A',
  doctora: 'JANETH GOMEZ RIOS',
  domicilio:
    '16 DE SEPTIEMBRE, A 30, TEPEXI DE RODRIGUEZ, 74690, TEPEXI DE RODRIGUEZ, PUEBLA.',
};

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
  {
    id: '6',
    fecha: '12/05/2026',
    fecha_iso: '2026-05-12',
    tipo_formato: 'HOJA DIARIA',
    total_pacientes: 0,
    total_certificados: 0,
    total_procedimientos: 0,
    total_consultas: 0,
  },
  {
    id: '7',
    fecha: '11/05/2026',
    fecha_iso: '2026-05-11',
    tipo_formato: 'HOJA DIARIA',
    total_pacientes: 0,
    total_certificados: 0,
    total_procedimientos: 0,
    total_consultas: 0,
  },
  {
    id: '8',
    fecha: '10/05/2026',
    fecha_iso: '2026-05-10',
    tipo_formato: 'HOJA DIARIA',
    total_pacientes: 18,
    total_certificados: 1,
    total_procedimientos: 18,
    total_consultas: 17,
  },
  {
    id: '9',
    fecha: '09/05/2026',
    fecha_iso: '2026-05-09',
    tipo_formato: 'HOJA DIARIA',
    total_pacientes: 0,
    total_certificados: 0,
    total_procedimientos: 0,
    total_consultas: 0,
  },
  {
    id: '10',
    fecha: '08/05/2026',
    fecha_iso: '2026-05-08',
    tipo_formato: 'HOJA DIARIA',
    total_pacientes: 0,
    total_certificados: 0,
    total_procedimientos: 0,
    total_consultas: 0,
  },
  {
    id: '11',
    fecha: '07/05/2026',
    fecha_iso: '2026-05-07',
    tipo_formato: 'HOJA DIARIA',
    total_pacientes: 1,
    total_certificados: 0,
    total_procedimientos: 2,
    total_consultas: 1,
  },
  {
    id: '12',
    fecha: '06/05/2026',
    fecha_iso: '2026-05-06',
    tipo_formato: 'HOJA DIARIA',
    total_pacientes: 0,
    total_certificados: 0,
    total_procedimientos: 0,
    total_consultas: 0,
  },
  {
    id: '13',
    fecha: '05/05/2026',
    fecha_iso: '2026-05-05',
    tipo_formato: 'HOJA DIARIA',
    total_pacientes: 0,
    total_certificados: 0,
    total_procedimientos: 0,
    total_consultas: 0,
  },
  {
    id: '14',
    fecha: '07/06/2026',
    fecha_iso: '2026-06-07',
    tipo_formato: 'HOJA DIARIA',
    total_pacientes: 23,
    total_certificados: 0,
    total_procedimientos: 8,
    total_consultas: 23,
  },
  {
    id: '15',
    fecha: '06/06/2026',
    fecha_iso: '2026-06-06',
    tipo_formato: 'HOJA DIARIA',
    total_pacientes: 15,
    total_certificados: 1,
    total_procedimientos: 2,
    total_consultas: 15,
  },
];

const pacientesReporteDemo: ReportPacienteRow[] = [
  {
    id: '1',
    fecha_iso: '2026-05-17',
    hora: '10:42',
    noReceta: '',
    paciente: 'LORENA VERA FLORES',
    edad: '27 años',
    sexo: 'MUJER',
    diagnostico: 'FARINGITIS AGUDA, NO ESPECIFICADA',
    tratamiento: 'Manejo médico indicado en consulta',
    estudiosClinicos: 'NO',
  },
  {
    id: '2',
    fecha_iso: '2026-05-17',
    hora: '10:56',
    noReceta: '',
    paciente: 'HANNA AILYN TOVAR LUNA',
    edad: '1 año',
    sexo: 'MUJER',
    diagnostico: 'RINOFARINGITIS AGUDA [RESFRIADO COMUN]',
    tratamiento: 'Tratamiento sintomático',
    estudiosClinicos: 'NO',
  },
  {
    id: '3',
    fecha_iso: '2026-05-17',
    hora: '11:39',
    noReceta: '',
    paciente: 'JOEL ROMERO HOYOS',
    edad: '69 años',
    sexo: 'HOMBRE',
    diagnostico: 'CERUMEN IMPACTADO',
    tratamiento: 'Limpieza y seguimiento',
    estudiosClinicos: 'NO',
  },
  {
    id: '4',
    fecha_iso: '2026-05-17',
    hora: '11:40',
    noReceta: '',
    paciente: 'ALEJANDRA AVECES HUERTA',
    edad: '24 años',
    sexo: 'MUJER',
    diagnostico: 'TRASTORNOS DEL INICIO Y DEL MANTENIMIENTO DEL SUEÑO [INSOMNIOS]',
    tratamiento: 'Orientación médica',
    estudiosClinicos: 'NO',
  },
  {
    id: '5',
    fecha_iso: '2026-05-17',
    hora: '12:05',
    noReceta: '',
    paciente: 'MIGUEL VILLERALDO MEDEL',
    edad: '48 años',
    sexo: 'HOMBRE',
    diagnostico: 'LUMBAGO CON CIATICA',
    tratamiento: 'Analgésico y reposo relativo',
    estudiosClinicos: 'NO',
  },
  {
    id: '6',
    fecha_iso: '2026-05-17',
    hora: '12:13',
    noReceta: '',
    paciente: 'JANETH GOMEZ RIOS',
    edad: '28 años',
    sexo: 'MUJER',
    diagnostico: 'RINOFARINGITIS AGUDA [RESFRIADO COMUN]',
    tratamiento: 'Tratamiento sintomático',
    estudiosClinicos: 'NO',
  },
  {
    id: '7',
    fecha_iso: '2026-05-10',
    hora: '09:15',
    noReceta: '',
    paciente: 'DANIELA MARTINEZ CRUZ',
    edad: '34 años',
    sexo: 'MUJER',
    diagnostico: 'INFECCION DE VIAS URINARIAS',
    tratamiento: 'Antibiótico según valoración',
    estudiosClinicos: 'NO',
  },
  {
    id: '8',
    fecha_iso: '2026-05-10',
    hora: '09:40',
    noReceta: '',
    paciente: 'ROBERTO HERNANDEZ LOPEZ',
    edad: '52 años',
    sexo: 'HOMBRE',
    diagnostico: 'HIPERTENSION ESENCIAL',
    tratamiento: 'Control y seguimiento',
    estudiosClinicos: 'NO',
  },
];

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const getTotalMovimiento = (record: ControlDiarioRow) =>
  record.total_pacientes +
  record.total_certificados +
  record.total_procedimientos +
  record.total_consultas;

const getStatusInfo = (record: ControlDiarioRow) => {
  const totalMovimiento = getTotalMovimiento(record);

  if (totalMovimiento === 0) {
    return {
      label: 'Sin movimiento',
      className: 'control-status-empty',
    };
  }

  if (record.total_pacientes >= 20) {
    return {
      label: 'Alta afluencia',
      className: 'control-status-high',
    };
  }

  if (record.total_procedimientos > record.total_consultas) {
    return {
      label: 'Procedimientos altos',
      className: 'control-status-warning',
    };
  }

  return {
    label: 'Actividad normal',
    className: 'control-status-normal',
  };
};

const buildPrintableHtml = (reportHtml: string) => `
  <!doctype html>
  <html lang="es">
    <head>
      <meta charset="utf-8" />
      <title>Control de pacientes consultorio</title>

      <style>
        @page {
          size: letter landscape;
          margin: 8mm;
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #ffffff;
          color: #111827;
          font-family: Arial, Helvetica, sans-serif;
        }

        .control-report-page {
          width: 100%;
          min-height: auto;
          padding: 0;
          background: #ffffff;
          color: #111827;
          font-family: Arial, Helvetica, sans-serif;
          box-shadow: none;
        }

        .control-report-header {
          display: grid;
          grid-template-columns: 1fr 150px;
          gap: 18px;
          align-items: end;
          padding-bottom: 12px;
          border-bottom: 2px solid #111827;
        }

        .control-report-brand span {
          display: block;
          margin-bottom: 5px;
          color: #0f766e;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .control-report-brand h1 {
          margin: 0;
          color: #111827;
          font-size: 20px;
          line-height: 1.1;
          font-weight: 950;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .control-report-date {
          padding: 9px 10px;
          border: 1px solid #111827;
          border-radius: 10px;
          text-align: center;
        }

        .control-report-date span {
          display: block;
          margin-bottom: 3px;
          color: #475569;
          font-size: 9px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .control-report-date strong {
          color: #111827;
          font-size: 13px;
          font-weight: 950;
        }

        .control-report-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 14px;
          margin-top: 12px;
          margin-bottom: 14px;
        }

        .control-report-meta div {
          padding: 8px 10px;
          border-radius: 9px;
          background: #ffffff;
          border: 1px solid #111827;
        }

        .control-report-meta-full {
          grid-column: 1 / -1;
        }

        .control-report-meta span,
        .control-report-footer span {
          display: block;
          margin-bottom: 3px;
          color: #475569;
          font-size: 8.5px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .control-report-meta strong,
        .control-report-footer strong {
          color: #111827;
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .control-report-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 8.5px;
        }

        .control-report-table th,
        .control-report-table td {
          border: 1px solid #111827;
          padding: 4px 4px;
          text-align: center;
          vertical-align: middle;
          line-height: 1.18;
          word-break: break-word;
        }

        .control-report-table th {
          color: #111827;
          font-size: 8px;
          font-weight: 950;
          text-transform: uppercase;
          background: #e2e8f0;
        }

        .control-report-table td:nth-child(4),
        .control-report-table td:nth-child(7),
        .control-report-table td:nth-child(8) {
          text-align: left;
        }

        .control-report-empty {
          height: 42px;
          color: #64748b;
          font-weight: 900;
          text-align: center !important;
        }

        .control-report-footer {
          display: grid;
          grid-template-columns: 1fr 230px;
          gap: 20px;
          margin-top: 18px;
          padding-top: 12px;
        }

        .control-report-footer div {
          padding-top: 10px;
          border-top: 1px solid #111827;
        }
      </style>
    </head>

    <body>
      ${reportHtml}
    </body>
  </html>
`;

const ControlDiarioPacientes: React.FC = () => {
  const reportRef = useRef<HTMLElement | null>(null);

  const [mes, setMes] = useState('05');
  const [anio, setAnio] = useState<Dayjs>(dayjs('2026-05-01'));
  const [fechaReporte, setFechaReporte] = useState<Dayjs>(dayjs('2026-05-17'));
  const [searchText, setSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const [selectedRow, setSelectedRow] = useState<ControlDiarioRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchText(searchText.trim());
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchText]);

  const rows = useMemo(() => {
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
      rows.reduce(
        (acc, item) => ({
          pacientes: acc.pacientes + item.total_pacientes,
          certificados: acc.certificados + item.total_certificados,
          procedimientos: acc.procedimientos + item.total_procedimientos,
          consultas: acc.consultas + item.total_consultas,
          diasConMovimiento:
            acc.diasConMovimiento + (getTotalMovimiento(item) > 0 ? 1 : 0),
        }),
        {
          pacientes: 0,
          certificados: 0,
          procedimientos: 0,
          consultas: 0,
          diasConMovimiento: 0,
        },
      ),
    [rows],
  );

  const periodLabel = useMemo(() => {
    const monthLabel = meses.find((item) => item.value === mes)?.label || '';
    return `${monthLabel} ${anio.year()}`;
  }, [mes, anio]);

  const fechaReporteIso = fechaReporte.format('YYYY-MM-DD');
  const fechaReporteTexto = fechaReporte.format('DD/MM/YYYY');

  const pacientesReporte = useMemo(
    () =>
      pacientesReporteDemo.filter((item) => item.fecha_iso === fechaReporteIso),
    [fechaReporteIso],
  );

  const promedioPacientes =
    rows.length > 0 ? Math.round(totals.pacientes / rows.length) : 0;

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
      ? Math.round(
          (selectedRow.total_consultas / selectedRow.total_pacientes) * 100,
        )
      : 0;

  const getReportFileName = () =>
    `control-pacientes-${fechaReporte.format('YYYY-MM-DD')}.pdf`;

  const handleLimpiar = () => {
    setMes('05');
    setAnio(dayjs('2026-05-01'));
    setFechaReporte(dayjs('2026-05-17'));
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
    if (record) {
      setFechaReporte(dayjs(record.fecha_iso));
    }

    setReportOpen(true);
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

    const iframeDocument =
      iframe.contentDocument || iframe.contentWindow?.document;

    if (!iframeDocument) {
      document.body.removeChild(iframe);
      message.warning('No se pudo preparar la impresión.');
      return;
    }

    iframeDocument.open();
    iframeDocument.write(buildPrintableHtml(reportRef.current.outerHTML));
    iframeDocument.close();

    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();

      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    };
  };

  const handleDownloadPdf = async () => {
    if (!reportRef.current) {
      message.warning('No se encontró el reporte para descargar.');
      return;
    }

    try {
      setDownloadingPdf(true);

      if ('fonts' in document) {
        await document.fonts.ready;
      }

      await new Promise((resolve) => setTimeout(resolve, 150));

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: reportRef.current.scrollWidth,
        windowHeight: reportRef.current.scrollHeight,
      });

      if (!canvas.width || !canvas.height) {
        message.warning('No se pudo generar el contenido del PDF.');
        return;
      }

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'letter',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const margin = 6;
      let imageWidth = pageWidth - margin * 2;
      let imageHeight = (canvas.height * imageWidth) / canvas.width;

      if (imageHeight > pageHeight - margin * 2) {
        imageHeight = pageHeight - margin * 2;
        imageWidth = (canvas.width * imageHeight) / canvas.height;
      }

      const x = (pageWidth - imageWidth) / 2;
      const y = margin;

      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        x,
        y,
        imageWidth,
        imageHeight,
      );

      pdf.save(getReportFileName());
    } finally {
      setDownloadingPdf(false);
    }
  };

  const columns: ColumnsType<ControlDiarioRow> = [
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      width: '15%',
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
      render: (value: string) => (
        <Tag className="control-format-tag">{value}</Tag>
      ),
    },
    {
      title: 'Pacientes',
      dataIndex: 'total_pacientes',
      align: 'center',
      width: '10%',
      render: (value: number) => (
        <span className="control-number-cell">{value}</span>
      ),
    },
    {
      title: 'Consultas',
      dataIndex: 'total_consultas',
      align: 'center',
      width: '10%',
      render: (value: number) => (
        <span className="control-number-cell">{value}</span>
      ),
    },
    {
      title: 'Procedimientos',
      dataIndex: 'total_procedimientos',
      align: 'center',
      width: '13%',
      render: (value: number) => (
        <span className="control-number-cell">{value}</span>
      ),
    },
    {
      title: 'Certificados',
      dataIndex: 'total_certificados',
      align: 'center',
      width: '11%',
      render: (value: number) => (
        <span className="control-number-cell">{value}</span>
      ),
    },
    {
      title: 'Estado',
      width: '13%',
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
      title: 'Acciones',
      align: 'center',
      width: '13%',
      render: (_, record) => (
        <div className="control-action-group">
          <Button
            size="small"
            icon={<EyeOutlined />}
            className="control-table-btn"
            onClick={() => openDetail(record)}
          />

          <Button
            size="small"
            icon={<FilePdfOutlined />}
            className="control-table-btn control-print-btn"
            onClick={() => openReport(record)}
          />
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

            <p>
              Pacientes, consultas, procedimientos y certificados registrados por día.
            </p>
          </div>

          <div className="control-title-side">
            <div className="control-title-period">
              <CalendarOutlined />
              <div>
                <small>Periodo</small>
                <strong>{periodLabel}</strong>
              </div>
            </div>

            <Button
              icon={<FilePdfOutlined />}
              className="control-main-export-btn"
              onClick={() => openReport()}
            >
              Generar reporte
            </Button>
          </div>
        </div>

        <Card className="control-card">
          <div className="control-filter-panel">
            <Row gutter={[12, 12]} align="bottom">
              <Col xs={24} sm={12} md={5}>
                <label className="control-label">Mes</label>
                <Select
                  value={mes}
                  onChange={setMes}
                  options={meses}
                  className="control-select"
                />
              </Col>

              <Col xs={24} sm={12} md={5}>
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

              <Col xs={24} sm={12} md={5}>
                <label className="control-label">Fecha del reporte</label>
                <DatePicker
                  value={fechaReporte}
                  allowClear={false}
                  format="DD/MM/YYYY"
                  onChange={(value) => value && setFechaReporte(value)}
                  className="control-year"
                />
              </Col>

              <Col xs={24} md={5}>
                <label className="control-label">Buscar</label>
                <Input
                  value={searchText}
                  allowClear
                  prefix={<SearchOutlined />}
                  placeholder="Fecha, formato o estado..."
                  onChange={(event) => setSearchText(event.target.value)}
                  className="control-search"
                />
              </Col>

              <Col xs={24} md={4}>
                <Button
                  icon={<ClearOutlined />}
                  onClick={handleLimpiar}
                  className="control-clear-btn"
                >
                  Limpiar
                </Button>
              </Col>
            </Row>
          </div>

          <div className="control-summary-grid">
            <div className="control-summary-card control-summary-main">
              <span>Total pacientes</span>
              <strong>{totals.pacientes}</strong>
              <small>{periodLabel}</small>
            </div>

            <div className="control-summary-card">
              <span>Consultas</span>
              <strong>{totals.consultas}</strong>
              <small>Registradas</small>
            </div>

            <div className="control-summary-card">
              <span>Procedimientos</span>
              <strong>{totals.procedimientos}</strong>
              <small>Capturados</small>
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
                <span>
                  <BarChartOutlined />
                  Registros diarios
                </span>
                <p>{rows.length} registros encontrados</p>
              </div>

              <Tag className="control-period-tag">
                <CalendarOutlined />
                {periodLabel}
              </Tag>
            </div>

            <div className="control-table-desktop">
              <Table
                rowKey="id"
                columns={columns}
                dataSource={rows}
                size="middle"
                tableLayout="fixed"
                rowClassName={(record) =>
                  getTotalMovimiento(record) === 0 ? 'control-row-muted' : ''
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
                      description="Sin registros disponibles"
                    />
                  ),
                }}
              />
            </div>

            <div className="control-mobile-list">
              {rows.length === 0 ? (
                <div className="control-mobile-empty">
                  Sin registros disponibles.
                </div>
              ) : (
                rows.map((item) => {
                  const status = getStatusInfo(item);

                  return (
                    <div className="control-mobile-card" key={item.id}>
                      <div className="control-mobile-head">
                        <div>
                          <strong>{item.fecha}</strong>
                          <span>{item.tipo_formato}</span>
                        </div>

                        <Tag className={`control-status-tag ${status.className}`}>
                          {status.label}
                        </Tag>
                      </div>

                      <div className="control-mobile-grid">
                        <div>
                          <span>Pacientes</span>
                          <b>{item.total_pacientes}</b>
                        </div>

                        <div>
                          <span>Consultas</span>
                          <b>{item.total_consultas}</b>
                        </div>

                        <div>
                          <span>Procedimientos</span>
                          <b>{item.total_procedimientos}</b>
                        </div>

                        <div>
                          <span>Certificados</span>
                          <b>{item.total_certificados}</b>
                        </div>
                      </div>

                      <div className="control-mobile-actions">
                        <Button
                          icon={<EyeOutlined />}
                          onClick={() => openDetail(item)}
                        >
                          Ver detalle
                        </Button>

                        <Button
                          icon={<FilePdfOutlined />}
                          onClick={() => openReport(item)}
                        >
                          Generar reporte
                        </Button>
                      </div>
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
        width={760}
        centered
        className="control-detail-modal"
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
                <span>Registro seleccionado</span>
                <h2>{selectedRow.fecha}</h2>
                <p>{selectedRow.tipo_formato}</p>
              </div>

              <Tag className={`control-status-tag ${selectedStatus.className}`}>
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
                <span>Consulta / paciente</span>
                <strong>{selectedConsultasRate}%</strong>
                <small>Relación del día seleccionado</small>
              </div>
            </div>

            <div className="control-detail-grid">
              <div>
                <span>Pacientes</span>
                <strong>{selectedRow.total_pacientes}</strong>
              </div>

              <div>
                <span>Consultas</span>
                <strong>{selectedRow.total_consultas}</strong>
              </div>

              <div>
                <span>Procedimientos</span>
                <strong>{selectedRow.total_procedimientos}</strong>
              </div>

              <div>
                <span>Certificados</span>
                <strong>{selectedRow.total_certificados}</strong>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={reportOpen}
        onCancel={() => setReportOpen(false)}
        width="96vw"
        centered
        className="control-report-modal"
        title="Vista previa del reporte"
        footer={[
          <Button key="close" onClick={() => setReportOpen(false)}>
            Cerrar
          </Button>,

          <Button
            key="print"
            icon={<PrinterOutlined />}
            className="control-report-print-btn"
            onClick={handlePrintReport}
          >
            Imprimir
          </Button>,

          <Button
            key="download"
            icon={<DownloadOutlined />}
            loading={downloadingPdf}
            className="control-report-download-btn"
            onClick={handleDownloadPdf}
          >
            Descargar PDF
          </Button>,
        ]}
      >
        <div className="control-report-preview-shell">
          <div className="control-report-print-area">
            <main className="control-report-page" ref={reportRef}>
              <header className="control-report-header">
                <div className="control-report-brand">
                  <span>Reporte clínico administrativo</span>
                  <h1>Control de pacientes consultorio</h1>
                </div>

                <div className="control-report-date">
                  <span>Fecha</span>
                  <strong>{fechaReporteTexto}</strong>
                </div>
              </header>

              <section className="control-report-meta">
                <div>
                  <span>Unidad médica</span>
                  <strong>{datosReporte.unidad}</strong>
                </div>

                <div>
                  <span>Médico responsable</span>
                  <strong>Dra. {datosReporte.doctora}</strong>
                </div>

                <div className="control-report-meta-full">
                  <span>Domicilio</span>
                  <strong>{datosReporte.domicilio}</strong>
                </div>
              </section>

              <table className="control-report-table">
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Hora</th>
                    <th>No. Receta</th>
                    <th>Paciente</th>
                    <th>Edad</th>
                    <th>Sexo</th>
                    <th>Diagnóstico</th>
                    <th>Tratamiento</th>
                    <th>Estudios clínicos</th>
                  </tr>
                </thead>

                <tbody>
                  {pacientesReporte.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="control-report-empty">
                        Sin pacientes registrados para la fecha seleccionada.
                      </td>
                    </tr>
                  ) : (
                    pacientesReporte.map((item, index) => (
                      <tr key={item.id}>
                        <td>{index + 1}</td>
                        <td>{item.hora}</td>
                        <td>{item.noReceta || '-'}</td>
                        <td>{item.paciente}</td>
                        <td>{item.edad}</td>
                        <td>{item.sexo}</td>
                        <td>{item.diagnostico}</td>
                        <td>{item.tratamiento || '-'}</td>
                        <td>{item.estudiosClinicos}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <footer className="control-report-footer">
                <div>
                  <span>Elaboró</span>
                  <strong>Dra. {datosReporte.doctora}</strong>
                </div>

                <div>
                  <span>Firma</span>
                  <strong>____________________________</strong>
                </div>
              </footer>
            </main>
          </div>
        </div>
      </Modal>
    </section>
  );
};

export default ControlDiarioPacientes;