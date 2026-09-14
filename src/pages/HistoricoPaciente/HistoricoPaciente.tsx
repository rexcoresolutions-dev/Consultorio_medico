import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Checkbox,
  Col,
  Empty,
  Input,
  Modal,
  Row,
  Select,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  PrinterOutlined,
  HistoryOutlined,
  MedicineBoxOutlined,
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
import consultasService from '../../services/consultas/consultas.service';
import recetasService from '../../services/recetas/recetas.service';
import RecetaDocumento from '../../components/RecetaDocumento/RecetaDocumento';
import './HistoricoPaciente.css';
import './HistoricoPaciente.documentos.css';
import '../../components/RecetaDocumento/RecetaDocumento.css';

const { Title, Text } = Typography;

const PACIENTE_ATENCION_STORAGE_KEY = 'paciente_atencion_actual';
const CONSULTA_EXTERNA_ABIERTA_STORAGE_KEY = 'consulta_externa_abierta';
const NOTAS_EVOLUCION_STORAGE_KEY = 'notas_evolucion_pacientes';

type DocumentoHistorico = {
  id: string;
  tipo: 'Historial clínico' | 'Nota de evolución' | 'Receta médica';
  fecha: string;
  descripcion: string;
  recetaId?: number;
  proximaCita?: string;
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

const extractFecha = (item: any): string =>
  String(
    item?.fecha ??
      item?.fechaConsulta ??
      item?.fecha_consulta ??
      item?.createdAt ??
      item?.created_at ??
      item?.updatedAt ??
      item?.updated_at ??
      '',
  );

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

const extractConsultaId = (item: any): number | null => {
  const parsed = Number(
    item?.id ??
      item?.consultaId ??
      item?.consulta_id ??
      item?.consulta?.id ??
      0,
  );

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const extractRecetaConsultaId = (item: any): number | null => {
  const parsed = Number(
    item?.consultaId ??
      item?.consulta_id ??
      item?.consulta?.id ??
      0,
  );

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const extractRecetaId = (item: any): number | null => {
  const parsed = Number(
    item?.id ??
      item?.recetaId ??
      item?.receta_id ??
      0,
  );

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const extractPacienteId = (item: any): number | null => {
  const parsed = Number(
    item?.pacienteId ??
      item?.paciente_id ??
      item?.paciente?.id ??
      item?.consulta?.pacienteId ??
      item?.consulta?.paciente_id ??
      item?.consulta?.paciente?.id ??
      0,
  );

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const extractDiagnostico = (consulta: any) => {
  const diagnostico = consulta?.diagnosticos?.[0];

  return (
    diagnostico?.diagnostico?.nombre ??
    diagnostico?.diagnostico?.text ??
    diagnostico?.nombre ??
    diagnostico?.text ??
    diagnostico?.descripcion ??
    consulta?.descripcion ??
    consulta?.motivoConsulta ??
    consulta?.motivo_consulta ??
    'Consulta externa registrada'
  );
};

const extractMedicamentos = (receta: any): any[] => {
  const value =
    receta?.medicamentos ??
    receta?.detalleMedicamentos ??
    receta?.detalle_medicamentos ??
    receta?.items ??
    [];

  return Array.isArray(value) ? value : [];
};

const describeReceta = (receta: any) => {
  const medicamentos = extractMedicamentos(receta);
  const nombres = medicamentos
    .map(
      (item: any) =>
        item?.medicamentoNombre ??
        item?.medicamento_nombre ??
        item?.nombre ??
        item?.sustanciaActiva ??
        item?.sustancia_activa,
    )
    .filter(Boolean)
    .slice(0, 3);

  const cantidadExtra = Math.max(0, medicamentos.length - nombres.length);

  return nombres.length > 0
    ? `${nombres.join(', ')}${cantidadExtra ? ` +${cantidadExtra}` : ''}`
    : 'Tratamiento prescrito';
};

const extractProximaCita = (receta: any) => {
  const programada = Boolean(
    receta?.programarSeguimiento ?? receta?.programar_seguimiento,
  );
  const fechaSeguimiento =
    receta?.fechaSeguimiento ?? receta?.fecha_seguimiento ?? '';

  return programada && fechaSeguimiento ? String(fechaSeguimiento) : '';
};

const HistoricoPaciente: React.FC = () => {
  const navigate = useNavigate();

  const [pacienteActivo, setPacienteActivo] = useState<PacienteData | null>(() =>
    cargarPacienteActivo(),
  );
  const [tipoDocumento, setTipoDocumento] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [verOtrosConsultorios, setVerOtrosConsultorios] = useState(false);
  const [consultasApi, setConsultasApi] = useState<any[]>([]);
  const [recetasApi, setRecetasApi] = useState<any[]>([]);
  const [loadingApi, setLoadingApi] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [recetaDetalleOpen, setRecetaDetalleOpen] = useState(false);
  const [recetaDetalleLoading, setRecetaDetalleLoading] = useState(false);
  const [recetaDetalle, setRecetaDetalle] = useState<any | null>(null);
  const [consultaRecetaDetalle, setConsultaRecetaDetalle] = useState<any | null>(null);

  const pacienteNombre = getFullName(pacienteActivo);
  const notas = cargarStorageArray<any>(NOTAS_EVOLUCION_STORAGE_KEY);

  useEffect(() => {
    let cancelled = false;

    const cargarHistoricoApi = async () => {
      const pacienteId = Number(pacienteActivo?.id);

      if (!Number.isInteger(pacienteId) || pacienteId <= 0) {
        setConsultasApi([]);
        setRecetasApi([]);
        setApiError('El paciente seleccionado no tiene un ID válido para consultar su historial.');
        return;
      }

      setLoadingApi(true);
      setApiError(null);

      try {
        const primeraPaginaConsultas = await consultasService.findAll({
          page: 1,
          limit: 100,
          pacienteId,
        });

        let consultas = [...primeraPaginaConsultas.data];
        const paginasConsultas = Math.max(
          1,
          Number(primeraPaginaConsultas.meta.totalPages || 1),
        );

        if (paginasConsultas > 1) {
          const restantes = await Promise.all(
            Array.from({ length: paginasConsultas - 1 }, (_, index) =>
              consultasService.findAll({
                page: index + 2,
                limit: 100,
                pacienteId,
              }),
            ),
          );

          consultas = consultas.concat(...restantes.flatMap((page) => page.data));
        }

        const consultaIds = new Set(
          consultas
            .map(extractConsultaId)
            .filter((id): id is number => id !== null),
        );

        let recetas: any[] = [];

        const primeraPaginaRecetas = await recetasService.findAll({
          page: 1,
          limit: 100,
        });

        recetas = [...primeraPaginaRecetas.data];

        const paginasRecetas = Math.max(
          1,
          Number(primeraPaginaRecetas.meta.totalPages || 1),
        );

        if (paginasRecetas > 1) {
          const restantes = await Promise.all(
            Array.from({ length: paginasRecetas - 1 }, (_, index) =>
              recetasService.findAll({
                page: index + 2,
                limit: 100,
              }),
            ),
          );

          recetas = recetas.concat(...restantes.flatMap((page) => page.data));
        }

        const recetasPaciente = recetas.filter((receta) => {
          const recetaPacienteId = extractPacienteId(receta);
          const consultaId = extractRecetaConsultaId(receta);

          return (
            recetaPacienteId === pacienteId ||
            (consultaId !== null && consultaIds.has(consultaId))
          );
        });

        if (cancelled) return;

        setConsultasApi(consultas);
        setRecetasApi(recetasPaciente);
      } catch (error: any) {
        if (cancelled) return;

        console.error('Error cargando histórico del paciente:', error);
        setConsultasApi([]);
        setRecetasApi([]);

        const apiMessage = error?.response?.data?.message;
        setApiError(
          Array.isArray(apiMessage)
            ? apiMessage.join('. ')
            : typeof apiMessage === 'string'
              ? apiMessage
              : 'No fue posible cargar el histórico clínico desde el servidor.',
        );
      } finally {
        if (!cancelled) setLoadingApi(false);
      }
    };

    void cargarHistoricoApi();

    return () => {
      cancelled = true;
    };
  }, [pacienteActivo?.id]);

  const abrirReceta = async (recetaId?: number) => {
    if (!recetaId) {
      await Swal.fire({
        icon: 'warning',
        title: 'Receta no disponible',
        text: 'No fue posible identificar la receta seleccionada.',
        confirmButtonColor: '#36c6c7',
      });
      return;
    }

    setRecetaDetalleOpen(true);
    setRecetaDetalleLoading(true);
    setRecetaDetalle(null);
    setConsultaRecetaDetalle(null);

    try {
      const receta = await recetasService.findOne(recetaId);
      setRecetaDetalle(receta);

      const consultaId = extractRecetaConsultaId(receta);
      if (consultaId) {
        try {
          const consulta = await consultasService.findOne(consultaId);
          setConsultaRecetaDetalle(consulta);
        } catch (consultaError) {
          console.warn('La receta abrió correctamente, pero no fue posible recuperar su consulta relacionada:', consultaError);
        }
      }
    } catch (error: any) {
      setRecetaDetalleOpen(false);

      const apiMessage = error?.response?.data?.message;
      await Swal.fire({
        icon: 'error',
        title: 'No se pudo abrir la receta',
        text: Array.isArray(apiMessage)
          ? apiMessage.join('. ')
          : typeof apiMessage === 'string'
            ? apiMessage
            : 'La receta existe en el histórico, pero no fue posible consultar su detalle en el servidor.',
        confirmButtonColor: '#36c6c7',
      });
    } finally {
      setRecetaDetalleLoading(false);
    }
  };

  const imprimirRecetaHistorica = () => {
    const source = document.getElementById('historico-receta-documento');
    if (!source) return;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);

    const printDocument = iframe.contentDocument;
    const printWindow = iframe.contentWindow;
    if (!printDocument || !printWindow) {
      iframe.remove();
      return;
    }

    const styleSources = Array.from(document.querySelectorAll('style, link[rel=\"stylesheet\"]'))
      .map((node) => node.outerHTML)
      .join('\n');

    const safeTitle = (pacienteNombre || 'Paciente')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9 _-]/g, '')
      .trim();

    printDocument.open();
    printDocument.write(`<!doctype html>
<html>
<head>
<meta charset=\"utf-8\" />
<title>Receta - ${safeTitle}</title>
${styleSources}
<style>
  @page { size: A4 portrait; margin: 5mm; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .clinical-rx-sheet { width: 200mm !important; margin: 0 auto !important; padding: 0 !important; border: 0 !important; box-shadow: none !important; }
  .clinical-rx-copy { min-height: 137mm !important; max-height: 137mm !important; overflow: hidden !important; }
</style>
</head>
<body>${source.outerHTML}</body>
</html>`);
    printDocument.close();

    const run = () => {
      printWindow.focus();
      printWindow.print();
      window.setTimeout(() => iframe.remove(), 1200);
    };

    if (printDocument.readyState === 'complete') run();
    else iframe.onload = run;
  };

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

  const documentosPaciente = useMemo(() => {
    if (!pacienteActivo) return [];

    const pacienteId = Number(pacienteActivo.id);

    const docsConsultas: DocumentoHistorico[] = consultasApi.map((item: any) => ({
      id: `consulta-api-${extractConsultaId(item) ?? extractFecha(item)}`,
      tipo: 'Historial clínico',
      fecha: extractFecha(item),
      descripcion: extractDiagnostico(item),
    }));

    const docsRecetas: DocumentoHistorico[] = recetasApi.map((item: any) => ({
      id: `receta-api-${item?.id ?? extractFecha(item)}`,
      tipo: 'Receta médica',
      fecha: extractFecha(item),
      descripcion: describeReceta(item),
      recetaId: extractRecetaId(item) ?? undefined,
      proximaCita: extractProximaCita(item) || undefined,
    }));

    const filtrarNotaPorPaciente = (item: any) => {
      const itemPacienteId = Number(item?.pacienteId ?? item?.paciente?.id ?? 0);
      const sameId =
        Number.isInteger(pacienteId) &&
        pacienteId > 0 &&
        itemPacienteId === pacienteId;

      const sameExpediente =
        pacienteActivo.numero_expediente &&
        item.paciente?.numero_expediente === pacienteActivo.numero_expediente;

      const sameCurp =
        pacienteActivo.curp && item.paciente?.curp === pacienteActivo.curp;

      return sameId || sameExpediente || sameCurp;
    };

    const docsNotas: DocumentoHistorico[] = notas
      .filter(filtrarNotaPorPaciente)
      .map((item: any) => ({
        id: `nota-${item.id}`,
        tipo: 'Nota de evolución',
        fecha: item.fecha_elaboracion || '',
        descripcion:
          item.diagnosticos?.[0]?.diagnostico ||
          item.datos?.motivoConsulta ||
          'Nota de evolución registrada',
      }));

    return [...docsConsultas, ...docsRecetas, ...docsNotas]
      .filter((doc) => {
        if (tipoDocumento !== 'todos' && doc.tipo !== tipoDocumento) return false;

        const texto = busqueda.trim().toLowerCase();

        if (!texto) return true;

        return `${doc.tipo} ${doc.descripcion} ${formatDate(doc.fecha)}`
          .toLowerCase()
          .includes(texto);
      })
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [
    busqueda,
    consultasApi,
    notas,
    pacienteActivo,
    recetasApi,
    tipoDocumento,
  ]);

  const ultimaConsulta = useMemo(
    () =>
      [...consultasApi].sort(
        (a, b) =>
          new Date(extractFecha(b)).getTime() -
          new Date(extractFecha(a)).getTime(),
      )[0] ?? null,
    [consultasApi],
  );

  const signosUltimaConsulta =
    ultimaConsulta?.signosVitales ??
    ultimaConsulta?.signos_vitales ??
    {};

  const columns: ColumnsType<DocumentoHistorico> = [
    {
      title: 'Fecha y hora',
      dataIndex: 'fecha',
      width: 185,
      render: (fecha) => (
        <div className="historico-document-date">
          <span className="historico-document-date__day">
            <CalendarOutlined />
            <strong>{formatDate(fecha)}</strong>
          </span>
          <span className="historico-document-date__time">
            <ClockCircleOutlined />
            {formatTime(fecha)}
          </span>
        </div>
      ),
    },
    {
      title: 'Documento',
      key: 'documento',
      width: 220,
      render: (_, record) => {
        const isReceta = record.tipo === 'Receta médica';

        return (
          <div className="historico-document-type">
            <span className={`historico-document-type__icon ${isReceta ? 'is-receta' : ''}`}>
              {isReceta ? <FileDoneOutlined /> : <HistoryOutlined />}
            </span>
            <div>
              <strong>{record.tipo}</strong>
              {isReceta && record.recetaId ? (
                <small>Folio #{record.recetaId}</small>
              ) : (
                <small>Expediente clínico</small>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Descripción',
      dataIndex: 'descripcion',
      render: (descripcion, record) => (
        <div className="historico-document-description">
          <strong title={descripcion}>{descripcion || '-'}</strong>
          {record.proximaCita ? (
            <span className="historico-document-followup">
              <CalendarOutlined /> Próxima cita: {formatDate(record.proximaCita)}
            </span>
          ) : record.tipo === 'Receta médica' ? (
            <span className="historico-document-description__meta">Sin seguimiento programado</span>
          ) : null}
        </div>
      ),
    },
    {
      title: 'Acción',
      key: 'acciones',
      width: 128,
      align: 'center',
      render: (_, record) =>
        record.tipo === 'Receta médica' ? (
          <Button
            className="historico-open-document-btn"
            icon={<FileTextOutlined />}
            onClick={() => void abrirReceta(record.recetaId)}
          >
            Ver receta
          </Button>
        ) : (
          <span className="historico-no-action">—</span>
        ),
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
              Consultas, recetas y notas registradas para el paciente.
            </Text>
          </div>

          <Tag className="historico-status-tag">{documentosPaciente.length} documento(s)</Tag>
        </header>

        {apiError && (
          <Alert
            style={{ marginTop: 16 }}
            type="warning"
            showIcon
            message="Histórico parcialmente disponible"
            description={apiError}
          />
        )}

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
            <Card className="historico-last-card" loading={loadingApi}>
              <div className="historico-card-title">Última visita</div>

              <div className="historico-last-grid">
                <div>
                  <span>Fecha</span>
                  <strong>{formatDate(extractFecha(ultimaConsulta))}</strong>
                </div>

                <div>
                  <span>Hora</span>
                  <strong>{formatTime(extractFecha(ultimaConsulta))}</strong>
                </div>

                <div>
                  <span>Cuenta con historia clínica</span>
                  <strong>{ultimaConsulta ? 'Sí' : 'No'}</strong>
                </div>

                <div>
                  <span>Consulta externa específica</span>
                  <strong>{ultimaConsulta ? 'Sí' : 'No'}</strong>
                </div>

                <div>
                  <span>Peso</span>
                  <strong>{formatValue(signosUltimaConsulta?.peso)} Kg</strong>
                </div>

                <div>
                  <span>Altura</span>
                  <strong>{formatValue(signosUltimaConsulta?.altura)} m</strong>
                </div>

                <div>
                  <span>IMC</span>
                  <strong>{formatValue(signosUltimaConsulta?.imc)} Kg/m²</strong>
                </div>

                <div>
                  <span>Diabetes</span>
                  <strong>{formatValue(ultimaConsulta?.diabetes)}</strong>
                </div>

                <div>
                  <span>Temperatura</span>
                  <strong>{formatValue(signosUltimaConsulta?.temperatura)} °C</strong>
                </div>

                <div>
                  <span>Frec. cardíaca</span>
                  <strong>
                    {formatValue(
                      signosUltimaConsulta?.frecuenciaCardiaca ??
                        signosUltimaConsulta?.frecuencia_cardiaca,
                    )}{' '}
                    xmin
                  </strong>
                </div>

                <div>
                  <span>Presión arterial</span>
                  <strong>
                    {formatValue(
                      signosUltimaConsulta?.presionArterial ??
                        signosUltimaConsulta?.presion_arterial,
                    )}{' '}
                    mm/Hg
                  </strong>
                </div>

                <div>
                  <span>SpO₂</span>
                  <strong>{formatValue(signosUltimaConsulta?.spo2)} %</strong>
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        <Card className="historico-review-card" loading={loadingApi}>
          <div className="historico-review-header">Última revisión</div>

          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <div className="historico-review-box">
                <span>Diagnóstico</span>
                <strong>{ultimaConsulta ? extractDiagnostico(ultimaConsulta) : '-'}</strong>
              </div>
            </Col>

            <Col xs={24} md={12}>
              <div className="historico-review-box">
                <span>Alergias</span>
                <strong>{formatValue(ultimaConsulta?.alergias)}</strong>
              </div>
            </Col>
          </Row>
        </Card>

        <Card className="historico-documents-card">
          <div className="historico-documents-header">
            <div>
              <Text className="historico-eyebrow"><FolderOpenOutlined /> Expediente documental</Text>
              <h3>Documentos del paciente</h3>
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
                { value: 'Receta médica', label: 'Receta médica' },
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
            className="historico-table historico-documents-table"
            tableLayout="fixed"
            columns={columns}
            dataSource={documentosPaciente}
            rowKey="id"
            loading={loadingApi}
            pagination={{
              pageSize: 6,
              showSizeChanger: false,
              position: ['bottomCenter'],
            }}
            scroll={documentosPaciente.length > 0 ? { x: 760 } : undefined}
            locale={{
              emptyText: <Empty description="No hay documentos registrados para este paciente" />,
            }}
          />
        </Card>

        <Modal
          open={recetaDetalleOpen}
          onCancel={() => {
            setRecetaDetalleOpen(false);
            setRecetaDetalle(null);
            setConsultaRecetaDetalle(null);
          }}
          footer={null}
          width={940}
          centered
          destroyOnHidden
          className="historico-receta-document-modal"
          title={null}
        >
          <div className="historico-receta-viewer">
            <div className="historico-receta-viewer__bar">
              <div>
                <span className="historico-receta-viewer__icon"><FileTextOutlined /></span>
                <div>
                  <strong>Receta médica</strong>
                  <small>Expediente / Recetas / {pacienteNombre || 'Paciente'}{recetaDetalle?.id ? ` / #${recetaDetalle.id}` : ''}</small>
                </div>
              </div>

              <div className="historico-receta-viewer__actions">
                {recetaDetalle && (
                  <Button icon={<PrinterOutlined />} onClick={imprimirRecetaHistorica}>
                    Imprimir
                  </Button>
                )}
                <Button
                  type="primary"
                  onClick={() => {
                    setRecetaDetalleOpen(false);
                    setRecetaDetalle(null);
                    setConsultaRecetaDetalle(null);
                  }}
                >
                  Cerrar
                </Button>
              </div>
            </div>

            <div className="historico-receta-viewer__body">
              {recetaDetalleLoading ? (
                <div className="historico-receta-viewer__loading">
                  <FileTextOutlined />
                  <span>Preparando documento clínico…</span>
                </div>
              ) : recetaDetalle ? (
                <div id="historico-receta-documento">
                  <RecetaDocumento
                    receta={recetaDetalle}
                    consulta={consultaRecetaDetalle}
                    paciente={pacienteActivo}
                    doubleCopy
                  />
                </div>
              ) : (
                <Empty description="No fue posible cargar el documento de la receta" />
              )}
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default HistoricoPaciente;
