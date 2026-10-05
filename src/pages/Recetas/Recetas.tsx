import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  DatePicker,
  Empty,
  Input,
  Modal,
  Pagination,
  Select,
  Spin,
  Tag,
  message,
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  FileTextOutlined,
  FilterOutlined,
  MedicineBoxOutlined,
  PrinterOutlined,
  ReloadOutlined,
  SearchOutlined,
  SolutionOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

import recetasService, { getRecetaApiError } from '../../services/recetas/recetas.service';
import consultasService from '../../services/consultas/consultas.service';
import pacientesService, { type PacienteData } from '../../services/pacientes/pacientes.service';
import citasService, { type CitaAgenda } from '../../services/citas/citas.service';
import RecetaDocumento from '../../components/RecetaDocumento/RecetaDocumento';
import { ROUTES } from '../../router/routes';
import './Recetas.css';

const { RangePicker } = DatePicker;

type EstadoReceta =
  | 'EMITIDA'
  | 'CON_SEGUIMIENTO'
  | 'SEGUIMIENTO_VENCIDO'
  | 'ATENDIDA'
  | 'CANCELADA';

type FiltroRapido =
  | 'TODAS'
  | 'CON_SEGUIMIENTO'
  | 'SIN_SEGUIMIENTO'
  | 'CON_ESTUDIOS'
  | 'INVENTARIO'
  | 'RECETA_LIBRE';

interface RecetaVista {
  id: number;
  receta: any;
  consulta: any | null;
  paciente: PacienteData | null;
  pacienteId: number | null;
  pacienteNombre: string;
  expediente: string;
  fechaIso: string;
  diagnostico: string;
  medicamentos: any[];
  medicamentoResumen: string;
  tieneInventario: boolean;
  tieneRecetaLibre: boolean;
  tieneSeguimiento: boolean;
  seguimientoFecha?: string;
  seguimientoHora?: string | null;
  seguimientoTexto: string;
  estudios: boolean;
  estado: EstadoReceta;
  cita?: CitaAgenda;
}

interface DocumentoSeleccionado {
  receta: any;
  consulta: any | null;
  paciente: PacienteData | null;
  record: RecetaVista;
}

const normalizeText = (value: any) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const firstDefined = (...values: any[]) =>
  values.find((value) => value !== undefined && value !== null && value !== '');

const fullName = (person?: any) =>
  [
    person?.nombre ?? person?.name,
    person?.primer_apellido ?? person?.primerApellido,
    person?.segundo_apellido ?? person?.segundoApellido,
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

const getPacienteId = (receta: any, consulta?: any): number | null => {
  const id = Number(
    receta?.pacienteId ??
      receta?.paciente_id ??
      receta?.paciente?.id ??
      receta?.consulta?.pacienteId ??
      receta?.consulta?.paciente_id ??
      receta?.consulta?.paciente?.id ??
      consulta?.pacienteId ??
      consulta?.paciente_id ??
      consulta?.paciente?.id,
  );
  return Number.isFinite(id) && id > 0 ? id : null;
};

const getConsultaId = (receta: any): number | null => {
  const id = Number(receta?.consultaId ?? receta?.consulta_id ?? receta?.consulta?.id);
  return Number.isFinite(id) && id > 0 ? id : null;
};

const getRecetaDate = (receta: any): string =>
  firstDefined(receta?.fecha, receta?.createdAt, receta?.created_at, '') || '';

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = dayjs(value);
  return date.isValid() ? date.format('DD/MM/YYYY') : String(value);
};

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const date = dayjs(value);
  if (!date.isValid()) return String(value);
  return date.format('DD/MM/YYYY · hh:mm A');
};

const formatTime12 = (value?: string | null) => {
  if (!value) return 'Horario por definir';
  const [hourRaw, minuteRaw = '00'] = String(value).split(':');
  const hour = Number(hourRaw);
  if (!Number.isFinite(hour)) return String(value);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${minuteRaw.slice(0, 2)} ${suffix}`;
};

const getMedicamentos = (receta: any): any[] => {
  const list =
    receta?.medicamentos ??
    receta?.detalleMedicamentos ??
    receta?.detalle_medicamentos ??
    receta?.items ??
    [];
  return Array.isArray(list) ? list : [];
};

const getMedicamentoNombre = (item: any) =>
  firstDefined(
    item?.medicamentoNombre,
    item?.medicamento_nombre,
    item?.nombre,
    item?.sustanciaActiva,
    item?.sustancia_activa,
    'Medicamento',
  );

const getMedicamentoDetalle = (item: any) => {
  const nombre = getMedicamentoNombre(item);
  const concentracion = firstDefined(item?.concentracion, '');
  const dosis = firstDefined(item?.dosis, '');
  const frecuencia = firstDefined(item?.frecuencia, '');
  const duracion = firstDefined(item?.duracion, '');
  const unidadTiempo = firstDefined(item?.unidadTiempo, item?.unidad_tiempo, '');

  const pauta = [dosis, frecuencia, duracion ? `${duracion} ${unidadTiempo}`.trim() : '']
    .filter(Boolean)
    .join(' · ');

  return {
    nombre: [nombre, concentracion].filter(Boolean).join(' '),
    pauta,
  };
};

const getDiagnostico = (consulta: any, receta: any) => {
  const diagnosticos =
    consulta?.diagnosticos ?? receta?.consulta?.diagnosticos ?? receta?.diagnosticos ?? [];
  const principal = Array.isArray(diagnosticos) ? diagnosticos[0] : null;
  const catalogo = principal?.diagnostico ?? principal?.catalogo ?? principal?.cie10;
  const clave = firstDefined(catalogo?.clave, principal?.clave, principal?.codigo);
  const nombre = firstDefined(
    catalogo?.nombre,
    catalogo?.descripcion,
    principal?.nombre,
    principal?.diagnostico,
    principal?.descripcion,
  );

  if (clave && nombre && !normalizeText(nombre).startsWith(normalizeText(clave))) {
    return `${clave} - ${nombre}`;
  }

  return firstDefined(
    nombre,
    consulta?.descripcion,
    consulta?.motivoConsulta,
    consulta?.motivo_consulta,
    receta?.consulta?.descripcion,
    receta?.consulta?.motivoConsulta,
    'Sin diagnóstico relacionado',
  );
};

const recetaTieneInventario = (medicamentos: any[]) =>
  medicamentos.some((item) => Number(item?.inventarioId ?? item?.inventario_id) > 0);

const recetaTieneLibre = (medicamentos: any[]) =>
  medicamentos.some((item) => !Number(item?.inventarioId ?? item?.inventario_id));

const estadoLabel: Record<EstadoReceta, string> = {
  EMITIDA: 'Emitida',
  CON_SEGUIMIENTO: 'Seguimiento programado',
  SEGUIMIENTO_VENCIDO: 'Seguimiento pendiente',
  ATENDIDA: 'Seguimiento atendido',
  CANCELADA: 'Seguimiento cancelado',
};

const loadAllRecetas = async () => {
  const first = await recetasService.findAll({ page: 1, limit: 100 });
  const result = [...first.data];
  const pages = Math.min(Math.max(first.meta.totalPages || 1, 1), 50);

  for (let page = 2; page <= pages; page += 1) {
    const response = await recetasService.findAll({ page, limit: 100 });
    result.push(...response.data);
  }
  return result;
};

const loadAllConsultas = async () => {
  const first = await consultasService.findAll({ page: 1, limit: 100 });
  const result = [...first.data];
  const pages = Math.min(Math.max(first.meta.totalPages || 1, 1), 50);

  for (let page = 2; page <= pages; page += 1) {
    const response = await consultasService.findAll({ page, limit: 100 });
    result.push(...response.data);
  }
  return result;
};

const Recetas: React.FC = () => {
  const navigate = useNavigate();
  const documentRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [records, setRecords] = useState<RecetaVista[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  const [search, setSearch] = useState('');
  const [quickFilter, setQuickFilter] = useState<FiltroRapido>('TODAS');
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const [documentOpen, setDocumentOpen] = useState(false);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [documentData, setDocumentData] = useState<DocumentoSeleccionado | null>(null);
  const [pendingPrint, setPendingPrint] = useState(false);

  const [consultaOpen, setConsultaOpen] = useState(false);
  const [consultaLoading, setConsultaLoading] = useState(false);
  const [consultaDetalle, setConsultaDetalle] = useState<any | null>(null);
  const [consultaPaciente, setConsultaPaciente] = useState<PacienteData | null>(null);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const nextWarnings: string[] = [];
      const [recetasResult, consultasResult, pacientesResult, agendaResult] =
        await Promise.allSettled([
          loadAllRecetas(),
          loadAllConsultas(),
          pacientesService.getPacientes(),
          citasService.getAgenda(),
        ]);

      if (recetasResult.status !== 'fulfilled') {
        throw recetasResult.reason;
      }

      const recetas = recetasResult.value;
      const consultas = consultasResult.status === 'fulfilled' ? consultasResult.value : [];
      const pacientesIniciales =
        pacientesResult.status === 'fulfilled' ? pacientesResult.value : [];
      const agenda = agendaResult.status === 'fulfilled' ? agendaResult.value.citas : [];

      if (consultasResult.status === 'rejected') {
        nextWarnings.push('No fue posible cargar todas las consultas de origen.');
      }
      if (pacientesResult.status === 'rejected') {
        nextWarnings.push('No fue posible cargar el catálogo completo de pacientes.');
      }
      if (agendaResult.status === 'rejected') {
        nextWarnings.push('No fue posible validar los horarios de seguimiento.');
      }

      const consultaMap = new Map<number, any>();
      consultas.forEach((consulta: any) => {
        const id = Number(consulta?.id);
        if (Number.isFinite(id) && id > 0) consultaMap.set(id, consulta);
      });

      const pacienteMap = new Map<number, PacienteData>();
      pacientesIniciales.forEach((paciente) => {
        const id = Number(paciente?.id);
        if (Number.isFinite(id) && id > 0) pacienteMap.set(id, paciente);
      });

      const missingPacienteIds = new Set<number>();
      recetas.forEach((receta: any) => {
        const consultaId = getConsultaId(receta);
        const consulta = consultaId ? consultaMap.get(consultaId) : receta?.consulta;
        const pacienteId = getPacienteId(receta, consulta);
        if (pacienteId && !pacienteMap.has(pacienteId)) missingPacienteIds.add(pacienteId);
      });

      if (missingPacienteIds.size > 0) {
        const missing = await Promise.allSettled(
          Array.from(missingPacienteIds).slice(0, 100).map((id) => pacientesService.getPacienteById(id)),
        );
        missing.forEach((result) => {
          if (result.status === 'fulfilled' && result.value?.id) {
            pacienteMap.set(Number(result.value.id), result.value);
          }
        });
      }

      const agendaMap = new Map<number, CitaAgenda>();
      agenda.forEach((cita) => {
        if (cita.recetaId) agendaMap.set(Number(cita.recetaId), cita);
      });

      const today = dayjs().startOf('day');
      const normalized: RecetaVista[] = recetas
        .map((receta: any): RecetaVista | null => {
          const id = Number(receta?.id);
          if (!Number.isFinite(id) || id <= 0) return null;

          const consultaId = getConsultaId(receta);
          const consulta = consultaId ? consultaMap.get(consultaId) ?? receta?.consulta ?? null : receta?.consulta ?? null;
          const pacienteId = getPacienteId(receta, consulta);
          const paciente = pacienteId ? pacienteMap.get(pacienteId) ?? null : null;
          const pacienteNombre =
            fullName(paciente) ||
            fullName(consulta?.paciente) ||
            fullName(receta?.paciente) ||
            fullName(receta?.consulta?.paciente) ||
            'Paciente no identificado';
          const expediente = firstDefined(
            paciente?.numero_expediente,
            consulta?.paciente?.numeroExpediente,
            consulta?.paciente?.numero_expediente,
            receta?.paciente?.numeroExpediente,
            receta?.paciente?.numero_expediente,
            '-',
          );
          const medicamentos = getMedicamentos(receta);
          const nombres = medicamentos.map(getMedicamentoNombre).filter(Boolean);
          const medicamentoResumen = nombres.length
            ? `${nombres.slice(0, 2).join(', ')}${nombres.length > 2 ? ` +${nombres.length - 2}` : ''}`
            : 'Sin medicamentos registrados';
          const programarSeguimiento = Boolean(
            receta?.programarSeguimiento ?? receta?.programar_seguimiento,
          );
          const seguimientoFecha = firstDefined(
            receta?.fechaSeguimiento,
            receta?.fecha_seguimiento,
          );
          const cita = agendaMap.get(id);
          const seguimientoHora = cita?.hora ?? null;
          const estudios = Boolean(
            receta?.solicitarEstudiosClinicos ?? receta?.solicitar_estudios_clinicos,
          );

          let estado: EstadoReceta = 'EMITIDA';
          if (cita?.estado === 'COMPLETADA') estado = 'ATENDIDA';
          else if (cita?.estado === 'CANCELADA') estado = 'CANCELADA';
          else if (programarSeguimiento && seguimientoFecha) {
            const date = dayjs(seguimientoFecha);
            estado = date.isValid() && date.endOf('day').isBefore(today)
              ? 'SEGUIMIENTO_VENCIDO'
              : 'CON_SEGUIMIENTO';
          }

          const seguimientoTexto =
            programarSeguimiento && seguimientoFecha
              ? `${formatDate(seguimientoFecha)} · ${formatTime12(seguimientoHora)}`
              : 'Sin seguimiento programado';

          return {
            id,
            receta,
            consulta,
            paciente,
            pacienteId,
            pacienteNombre,
            expediente: String(expediente),
            fechaIso: getRecetaDate(receta),
            diagnostico: getDiagnostico(consulta, receta),
            medicamentos,
            medicamentoResumen,
            tieneInventario: recetaTieneInventario(medicamentos),
            tieneRecetaLibre: recetaTieneLibre(medicamentos),
            tieneSeguimiento: programarSeguimiento && Boolean(seguimientoFecha),
            seguimientoFecha,
            seguimientoHora,
            seguimientoTexto,
            estudios,
            estado,
            cita,
          };
        })
        .filter((item): item is RecetaVista => item !== null)
        .sort((a, b) => dayjs(b.fechaIso).valueOf() - dayjs(a.fechaIso).valueOf());

      setRecords(normalized);
      setWarnings(nextWarnings);
    } catch (error) {
      console.error('Error cargando centro de recetas:', error);
      message.error(getRecetaApiError(error, 'No fue posible cargar las recetas emitidas.'));
      setRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadData(false);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, quickFilter, dateRange]);

  const metrics = useMemo(() => {
    const now = dayjs();
    const today = records.filter((item) => dayjs(item.fechaIso).isSame(now, 'day')).length;
    const week = records.filter((item) => {
      const date = dayjs(item.fechaIso);
      return date.isAfter(now.startOf('week').subtract(1, 'millisecond')) &&
        date.isBefore(now.endOf('week').add(1, 'millisecond'));
    }).length;
    const month = records.filter((item) => dayjs(item.fechaIso).isSame(now, 'month')).length;
    const upcoming = records.filter((item) => {
      if (!item.tieneSeguimiento || !item.seguimientoFecha) return false;
      if (item.estado === 'ATENDIDA' || item.estado === 'CANCELADA') return false;
      return !dayjs(item.seguimientoFecha).endOf('day').isBefore(now.startOf('day'));
    }).length;

    return { today, week, month, upcoming };
  }, [records]);

  const filtered = useMemo(() => {
    const needle = normalizeText(search);
    return records.filter((item) => {
      if (needle) {
        const haystack = normalizeText(
          [
            item.id,
            item.pacienteNombre,
            item.expediente,
            item.diagnostico,
            item.medicamentoResumen,
            ...item.medicamentos.map((med) =>
              [
                getMedicamentoNombre(med),
                med?.sustanciaActiva,
                med?.sustancia_activa,
                med?.concentracion,
              ].join(' '),
            ),
          ].join(' '),
        );
        if (!haystack.includes(needle)) return false;
      }

      if (quickFilter === 'CON_SEGUIMIENTO' && !item.tieneSeguimiento) return false;
      if (quickFilter === 'SIN_SEGUIMIENTO' && item.tieneSeguimiento) return false;
      if (quickFilter === 'CON_ESTUDIOS' && !item.estudios) return false;
      if (quickFilter === 'INVENTARIO' && !item.tieneInventario) return false;
      if (quickFilter === 'RECETA_LIBRE' && !item.tieneRecetaLibre) return false;

      if (dateRange) {
        const date = dayjs(item.fechaIso);
        if (!date.isValid()) return false;
        const [from, to] = dateRange;
        if (from && date.isBefore(dayjs(from).startOf('day'))) return false;
        if (to && date.isAfter(dayjs(to).endOf('day'))) return false;
      }

      return true;
    });
  }, [records, search, quickFilter, dateRange]);

  const paginated = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page],
  );

  const openDocument = async (record: RecetaVista, printAfterOpen = false) => {
    setDocumentLoading(true);
    setDocumentOpen(true);
    setPendingPrint(printAfterOpen);
    try {
      const consultaId = getConsultaId(record.receta);
      const [recetaResult, consultaResult] = await Promise.allSettled([
        recetasService.findOne(record.id),
        consultaId ? consultasService.findOne(consultaId) : Promise.resolve(record.consulta),
      ]);

      if (recetaResult.status !== 'fulfilled') throw recetaResult.reason;
      const receta = recetaResult.value;
      const consulta =
        consultaResult.status === 'fulfilled' ? consultaResult.value : record.consulta;
      const pacienteId = getPacienteId(receta, consulta) ?? record.pacienteId;
      let paciente = record.paciente;
      if (!paciente && pacienteId) {
        try {
          paciente = await pacientesService.getPacienteById(pacienteId);
        } catch {
          paciente = null;
        }
      }

      setDocumentData({ receta, consulta, paciente, record });
    } catch (error) {
      message.error(getRecetaApiError(error, 'No fue posible abrir el documento de receta.'));
      setDocumentOpen(false);
      setPendingPrint(false);
    } finally {
      setDocumentLoading(false);
    }
  };

  const printCurrentDocument = () => {
    const node = documentRef.current;
    if (!node) {
      message.warning('El documento todavía no está listo para imprimir.');
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    document.body.appendChild(iframe);

    const printWindow = iframe.contentWindow;
    const printDoc = iframe.contentDocument;
    if (!printWindow || !printDoc) {
      iframe.remove();
      message.error('No fue posible preparar la impresión.');
      return;
    }

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((element) => element.outerHTML)
      .join('\n');
    const patient = documentData?.record.pacienteNombre || 'Paciente';
    const safeName = patient.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]+/g, '_');

    printDoc.open();
    printDoc.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${safeName}_Receta_${documentData?.record.id ?? ''}</title>
${styles}
<style>
  html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .recetas-center-print-shell { width: 210mm; margin: 0 auto; background: #fff; }
  @page { size: A4 portrait; margin: 0; }
  @media print {
    .recetas-center-print-shell { width: 210mm; margin: 0; }
    .clinical-rx-sheet { box-shadow: none !important; margin: 0 !important; }
  }
</style>
</head>
<body>
<div class="recetas-center-print-shell">${node.innerHTML}</div>
</body>
</html>`);
    printDoc.close();

    const doPrint = () => {
      window.setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
        } finally {
          window.setTimeout(() => iframe.remove(), 1200);
        }
      }, 350);
    };

    if (printDoc.readyState === 'complete') doPrint();
    else iframe.onload = doPrint;
  };

  useEffect(() => {
    if (!pendingPrint || documentLoading || !documentData || !documentOpen) return;
    const timer = window.setTimeout(() => {
      printCurrentDocument();
      setPendingPrint(false);
    }, 550);
    return () => window.clearTimeout(timer);
  }, [pendingPrint, documentLoading, documentData, documentOpen]);

  const openConsulta = async (record: RecetaVista) => {
    const consultaId = getConsultaId(record.receta);
    if (!consultaId) {
      message.info('Esta receta no tiene una consulta de origen identificable.');
      return;
    }

    setConsultaOpen(true);
    setConsultaLoading(true);
    setConsultaDetalle(null);
    setConsultaPaciente(record.paciente);
    try {
      const consulta = await consultasService.findOne(consultaId);
      setConsultaDetalle(consulta);
      if (!record.paciente) {
        const pacienteId = getPacienteId(record.receta, consulta);
        if (pacienteId) {
          try {
            setConsultaPaciente(await pacientesService.getPacienteById(pacienteId));
          } catch {
            // El modal puede mostrarse aunque el paciente no haya podido refrescarse.
          }
        }
      }
    } catch (error) {
      message.error('No fue posible cargar la consulta de origen.');
      setConsultaOpen(false);
    } finally {
      setConsultaLoading(false);
    }
  };

  const limpiarFiltros = () => {
    setSearch('');
    setQuickFilter('TODAS');
    setDateRange(null);
  };

  const consultaDiagnosticos = Array.isArray(consultaDetalle?.diagnosticos)
    ? consultaDetalle.diagnosticos
    : [];
  const signos = consultaDetalle?.signosVitales ?? consultaDetalle?.signos_vitales ?? {};

  return (
    <div className="recetas-center-page">
      <section className="recetas-center-hero">
        <div className="recetas-center-hero-main">
          <div className="recetas-center-hero-icon"><SolutionOutlined /></div>
          <div>
            <span className="recetas-center-eyebrow">EXPEDIENTE ELECTRÓNICO</span>
            <h1>Recetas emitidas</h1>
            <p>Consulta, reimprime y da seguimiento a las prescripciones generadas desde consulta externa.</p>
          </div>
        </div>
        <Button
          icon={<ReloadOutlined />}
          loading={refreshing}
          onClick={() => void loadData(true)}
          className="recetas-center-refresh"
        >
          Actualizar
        </Button>
      </section>

      {warnings.length > 0 && (
        <div className="recetas-center-warning">
          <strong>Información parcial</strong>
          <span>{warnings.join(' ')}</span>
        </div>
      )}

      <section className="recetas-center-metrics">
        <article>
          <span className="metric-icon"><FileTextOutlined /></span>
          <div><small>RECETAS HOY</small><strong>{metrics.today}</strong><span>Emitidas durante el día</span></div>
        </article>
        <article>
          <span className="metric-icon"><CalendarOutlined /></span>
          <div><small>ESTA SEMANA</small><strong>{metrics.week}</strong><span>Prescripciones registradas</span></div>
        </article>
        <article>
          <span className="metric-icon"><MedicineBoxOutlined /></span>
          <div><small>ESTE MES</small><strong>{metrics.month}</strong><span>Total de recetas</span></div>
        </article>
        <article>
          <span className="metric-icon"><ClockCircleOutlined /></span>
          <div><small>PRÓXIMAS CITAS</small><strong>{metrics.upcoming}</strong><span>Seguimientos pendientes</span></div>
        </article>
      </section>

      <section className="recetas-center-panel">
        <div className="recetas-center-panel-head">
          <div>
            <span className="recetas-center-eyebrow">CENTRO DE CONTROL</span>
            <h2>Documentos de receta</h2>
            <p>{filtered.length} receta(s) encontradas</p>
          </div>
        </div>

        <div className="recetas-center-filters">
          <Input
            allowClear
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            prefix={<SearchOutlined />}
            placeholder="Buscar paciente, expediente, folio, medicamento o diagnóstico..."
          />
          <Select<FiltroRapido>
            value={quickFilter}
            onChange={setQuickFilter}
            suffixIcon={<FilterOutlined />}
            options={[
              { value: 'TODAS', label: 'Todas las recetas' },
              { value: 'CON_SEGUIMIENTO', label: 'Con seguimiento' },
              { value: 'SIN_SEGUIMIENTO', label: 'Sin seguimiento' },
              { value: 'CON_ESTUDIOS', label: 'Con estudios clínicos' },
              { value: 'INVENTARIO', label: 'Medicamento de inventario' },
              { value: 'RECETA_LIBRE', label: 'Receta libre' },
            ]}
          />
          <RangePicker
            format="DD/MM/YYYY"
            value={dateRange ? [dayjs(dateRange[0]), dayjs(dateRange[1])] : null}
            onChange={(dates) =>
              setDateRange(
                dates?.[0] && dates?.[1]
                  ? [dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')]
                  : null,
              )
            }
            placeholder={['Desde', 'Hasta']}
          />
          <Button onClick={limpiarFiltros}>Limpiar</Button>
        </div>

        {loading ? (
          <div className="recetas-center-loading"><Spin size="large" /><span>Cargando recetas emitidas...</span></div>
        ) : filtered.length === 0 ? (
          <div className="recetas-center-empty">
            <Empty description="No encontramos recetas con estos filtros." />
          </div>
        ) : (
          <>
            <div className="recetas-center-list">
              {paginated.map((record) => (
                <article className="receta-center-card" key={record.id}>
                  <header className="receta-card-head">
                    <div className="receta-card-identity">
                      <span className="receta-center-doc-icon"><FileTextOutlined /></span>
                      <div>
                        <div className="receta-card-folio-line">
                          <small>RECETA #{record.id}</small>
                          <span className={`receta-status receta-status--${record.estado.toLowerCase()}`}>
                            {estadoLabel[record.estado]}
                          </span>
                        </div>
                        <strong>{formatDateTime(record.fechaIso)}</strong>
                        <span>{record.expediente !== '-' ? `Expediente ${record.expediente}` : 'Sin expediente visible'}</span>
                      </div>
                    </div>

                    <div className="receta-card-patient-main">
                      <span className="receta-center-avatar"><UserOutlined /></span>
                      <div>
                        <small>PACIENTE</small>
                        <strong>{record.pacienteNombre}</strong>
                        <span>{record.medicamentos.length} medicamento(s) prescritos</span>
                      </div>
                    </div>
                  </header>

                  <div className="receta-card-body">
                    <section className="receta-card-block receta-card-diagnosis">
                      <small>DIAGNÓSTICO</small>
                      <strong>{record.diagnostico}</strong>
                    </section>

                    <section className="receta-card-block receta-card-treatment">
                      <small>TRATAMIENTO</small>
                      {record.medicamentos.length ? (
                        <div className="receta-card-meds">
                          {record.medicamentos.slice(0, 2).map((medicamento, index) => {
                            const detalle = getMedicamentoDetalle(medicamento);
                            return (
                              <div className="receta-card-med" key={`${record.id}-med-${index}`}>
                                <strong>{detalle.nombre}</strong>
                                {detalle.pauta && <span>{detalle.pauta}</span>}
                              </div>
                            );
                          })}
                          {record.medicamentos.length > 2 && (
                            <span className="receta-more-meds">+{record.medicamentos.length - 2} medicamento(s) más</span>
                          )}
                        </div>
                      ) : (
                        <strong>Sin medicamentos registrados</strong>
                      )}
                      <div className="receta-center-source-tags">
                        {record.tieneInventario && <Tag>Inventario</Tag>}
                        {record.tieneRecetaLibre && <Tag>Receta libre</Tag>}
                        {record.estudios && <Tag>Estudios clínicos</Tag>}
                      </div>
                    </section>

                    <section className="receta-card-block receta-card-followup">
                      <small>SEGUIMIENTO</small>
                      <strong>{record.tieneSeguimiento ? record.seguimientoTexto : 'No programado'}</strong>
                      <span>
                        {record.tieneSeguimiento
                          ? record.seguimientoHora
                            ? 'Cita con horario asignado'
                            : 'Pendiente de asignar horario'
                          : 'Sin próxima cita indicada'}
                      </span>
                    </section>
                  </div>

                  <footer className="receta-card-footer">
                    <div className="receta-card-summary">
                      <span><MedicineBoxOutlined /> {record.medicamentos.length} medicamento(s)</span>
                      {record.estudios && <span><SolutionOutlined /> Estudios solicitados</span>}
                      {record.tieneSeguimiento && <span><CalendarOutlined /> Seguimiento</span>}
                    </div>

                    <div className="receta-center-actions">
                      <Button type="primary" icon={<EyeOutlined />} onClick={() => void openDocument(record)}>
                        Ver receta
                      </Button>
                      <Button icon={<PrinterOutlined />} onClick={() => void openDocument(record, true)}>
                        Imprimir
                      </Button>
                      <Button icon={<SolutionOutlined />} onClick={() => void openConsulta(record)}>
                        Consulta
                      </Button>
                      {record.tieneSeguimiento && (
                        <Button icon={<CalendarOutlined />} onClick={() => navigate(ROUTES.APPOINTMENTS)}>
                          Cita
                        </Button>
                      )}
                    </div>
                  </footer>
                </article>
              ))}
            </div>

            <div className="recetas-center-pagination">
              <span>
                {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filtered.length)} de {filtered.length}
              </span>
              <Pagination
                current={page}
                pageSize={pageSize}
                total={filtered.length}
                showSizeChanger={false}
                onChange={setPage}
              />
            </div>
          </>
        )}
      </section>

      <Modal
        open={documentOpen}
        onCancel={() => {
          setDocumentOpen(false);
          setPendingPrint(false);
        }}
        footer={null}
        width={1180}
        centered
        destroyOnHidden
        className="recetas-center-document-modal"
      >
        <div className="recetas-center-document-head">
          <div>
            <span className="recetas-center-doc-badge"><FileTextOutlined /></span>
            <div>
              <strong>Receta médica #{documentData?.record.id ?? ''}</strong>
              <span>{documentData?.record.pacienteNombre ?? 'Documento clínico'}</span>
            </div>
          </div>
          <div className="recetas-center-document-actions">
            {documentData?.record.tieneSeguimiento && (
              <Button icon={<CalendarOutlined />} onClick={() => navigate(ROUTES.APPOINTMENTS)}>
                Ver cita
              </Button>
            )}
            <Button icon={<PrinterOutlined />} onClick={printCurrentDocument} disabled={!documentData}>
              Imprimir
            </Button>
          </div>
        </div>

        {documentLoading ? (
          <div className="recetas-center-document-loading"><Spin size="large" /> Preparando documento...</div>
        ) : documentData ? (
          <div className="recetas-center-document-stage">
            <div ref={documentRef} className="recetas-center-document-sheet">
              <RecetaDocumento
                receta={documentData.receta}
                consulta={documentData.consulta}
                paciente={documentData.paciente}
                doubleCopy
              />
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={consultaOpen}
        onCancel={() => setConsultaOpen(false)}
        footer={null}
        width={920}
        centered
        destroyOnHidden
        title={
          <div className="recetas-center-consulta-title">
            <SolutionOutlined />
            <div><strong>Consulta de origen</strong><span>Información clínica que generó la receta</span></div>
          </div>
        }
      >
        {consultaLoading ? (
          <div className="recetas-center-consulta-loading"><Spin /></div>
        ) : consultaDetalle ? (
          <div className="recetas-center-consulta-detail">
            <div className="consulta-summary-row">
              <div><small>PACIENTE</small><strong>{fullName(consultaPaciente) || fullName(consultaDetalle?.paciente) || '-'}</strong></div>
              <div><small>TIPO DE CONSULTA</small><strong>{firstDefined(consultaDetalle?.tipoConsulta, consultaDetalle?.tipo_consulta, '-')}</strong></div>
              <div><small>ESTATUS</small><strong>{firstDefined(consultaDetalle?.estatus, '-')}</strong></div>
            </div>

            <section>
              <h3>Motivo y descripción clínica</h3>
              <div className="consulta-text-grid">
                <div><small>MOTIVO</small><p>{firstDefined(consultaDetalle?.motivoConsulta, consultaDetalle?.motivo_consulta, '-')}</p></div>
                <div><small>DESCRIPCIÓN</small><p>{firstDefined(consultaDetalle?.descripcion, '-')}</p></div>
              </div>
            </section>

            <section>
              <h3>Diagnósticos</h3>
              {consultaDiagnosticos.length ? (
                <div className="consulta-diagnosticos">
                  {consultaDiagnosticos.map((item: any, index: number) => {
                    const catalogo = item?.diagnostico ?? item?.cie10 ?? {};
                    const clave = firstDefined(catalogo?.clave, item?.clave, item?.codigo, 'CIE-10');
                    const nombre = firstDefined(catalogo?.nombre, catalogo?.descripcion, item?.nombre, item?.descripcion, '-');
                    return <div key={String(item?.id ?? index)}><span>{clave}</span><strong>{nombre}</strong></div>;
                  })}
                </div>
              ) : <p>Sin diagnósticos disponibles.</p>}
            </section>

            <section>
              <h3>Signos vitales registrados</h3>
              <div className="consulta-vitals-grid">
                <div><small>Peso</small><strong>{signos?.peso != null ? `${signos.peso} kg` : '-'}</strong></div>
                <div><small>Altura</small><strong>{signos?.altura != null ? `${Number(signos.altura).toFixed(2)} m` : '-'}</strong></div>
                <div><small>IMC</small><strong>{signos?.imc != null ? Number(signos.imc).toFixed(2) : '-'}</strong></div>
                <div><small>Temperatura</small><strong>{signos?.temperatura != null ? `${signos.temperatura} °C` : '-'}</strong></div>
                <div><small>T.A.</small><strong>{firstDefined(signos?.presionArterial, signos?.presion_arterial, '-')}</strong></div>
                <div><small>F.C.</small><strong>{firstDefined(signos?.frecuenciaCardiaca, signos?.frecuencia_cardiaca, '-')}</strong></div>
                <div><small>F.R.</small><strong>{firstDefined(signos?.frecuenciaRespiratoria, signos?.frecuencia_respiratoria, '-')}</strong></div>
                <div><small>SpO₂</small><strong>{signos?.spo2 != null ? `${signos.spo2} %` : '-'}</strong></div>
              </div>
            </section>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default Recetas;
