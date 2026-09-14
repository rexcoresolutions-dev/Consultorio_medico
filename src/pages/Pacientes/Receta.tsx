import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  Avatar,
  Button,
  Checkbox,
  Col,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
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
  CalendarOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileDoneOutlined,
  HeartOutlined,
  MedicineBoxOutlined,
  PlusOutlined,
  PrinterOutlined,
  SaveOutlined,
  UserOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import Swal from 'sweetalert2';

import type { PacienteData } from '../../services/pacientes/pacientes.service';
import InventoryService, {
  INVENTARIO_UPDATED_EVENT,
  type MedicamentoInventario,
  getInventoryApiError,
  resolveSucursalIdFromSession,
} from '../../services/inventario/inventario.service';
import consultasService from '../../services/consultas/consultas.service';
import recetasService, {
  type RecetaPayload,
  getRecetaApiError,
} from '../../services/recetas/recetas.service';
import citasService, { type CitaAgenda } from '../../services/citas/citas.service';
import useSystemConfig from '../../hooks/useSystemConfig';
import './Receta.css';

const { Title } = Typography;
const { TextArea } = Input;

const PACIENTE_ATENCION_STORAGE_KEY = 'paciente_atencion_actual';
const CONSULTA_EXTERNA_ABIERTA_STORAGE_KEY = 'consulta_externa_abierta';

type DiagnosticoResumen = {
  key?: string;
  no?: number;
  clave?: string;
  diagnostico?: string;
  descripcion?: string;
};

type RecetaProps = {
  paciente: PacienteData;
  consulta?: any;
  diagnosticos?: DiagnosticoResumen[];
  onBack: () => void;
  onPacienteLiberado?: () => void;
};

type TratamientoItem = {
  key: string;
  no: number;
  sustancia: string;
  origen: 'inventario' | 'libre';
  inventarioId?: number | string;
  nombreComercial?: string;
  concentracion?: string;
  formaFarmaceutica?: string;
  presentacion?: string;
  cantidadNumero: number;
  cantidadUnidad: string;
  frecuenciaNumero: number;
  frecuenciaUnidad: string;
  duracionNumero: number;
  duracionUnidad: string;
  indicacion: string;
  via: string;
  observaciones: string;
};

type RecetaDraftState = {
  tratamientos: TratamientoItem[];
  formValues: any;
  origenMedicamento: 'inventario' | 'libre';
  inventarioSeleccionadoId?: number | string;
  recetaApiId?: number;
  impresa?: boolean;
  updatedAt?: string;
};

const getPacienteDraftKey = (paciente?: PacienteData) =>
  paciente?.id ||
  paciente?.numero_expediente ||
  paciente?.curp ||
  `${paciente?.nombre || 'paciente'}-${paciente?.primer_apellido || ''}`;

const getRecetaDraftKey = (paciente?: PacienteData, consulta?: any) => {
  const consultaId =
    consulta?.consultaApiId ||
    consulta?.apiId ||
    consulta?.id ||
    'actual';

  return `receta_borrador_${getPacienteDraftKey(paciente)}_${consultaId}`;
};

const cargarRecetaDraft = (key: string): Partial<RecetaDraftState> | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const guardarRecetaDraft = (key: string, draft: Partial<RecetaDraftState>) => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        ...draft,
        updatedAt: new Date().toISOString(),
      }),
    );
  } catch {
    // El borrador no debe impedir continuar si storage no está disponible.
  }
};

const unidadSugeridaPorForma = (medicamento?: MedicamentoInventario) => {
  const forma = medicamento?.forma_farmaceutica?.toLowerCase() || '';

  if (forma.includes('tableta')) return 'tableta';
  if (forma.includes('cápsula') || forma.includes('capsula')) return 'cápsula';
  if (forma.includes('gota')) return 'gota';
  if (forma.includes('aerosol') || forma.includes('inhal')) return 'inhalación';
  if (forma.includes('solución') || forma.includes('suspensión') || forma.includes('jarabe')) return 'ml';
  if (forma.includes('crema') || forma.includes('ungüento')) return 'aplicación';

  return 'tableta';
};

const opcionesUnidadCantidad = [
  { value: 'tableta', label: 'Tableta' },
  { value: 'cápsula', label: 'Cápsula' },
  { value: 'ml', label: 'ml' },
  { value: 'gota', label: 'Gota' },
  { value: 'aplicación', label: 'Aplicación' },
  { value: 'inhalación', label: 'Inhalación' },
];

const opcionesUnidadFrecuencia = [
  { value: 'horas', label: 'Horas' },
  { value: 'días', label: 'Días' },
];

const opcionesUnidadDuracion = [
  { value: 'días', label: 'Días' },
  { value: 'semanas', label: 'Semanas' },
  { value: 'meses', label: 'Meses' },
];

const opcionesVia = [
  { value: 'ORAL', label: 'Oral' },
  { value: 'SUBLINGUAL', label: 'Sublingual' },
  { value: 'INTRAMUSCULAR', label: 'Intramuscular' },
  { value: 'INTRAVENOSA', label: 'Intravenosa' },
  { value: 'TÓPICA', label: 'Tópica' },
  { value: 'OFTÁLMICA', label: 'Oftálmica' },
  { value: 'ÓTICA', label: 'Ótica' },
  { value: 'INHALADA', label: 'Inhalada' },
];

const pluralizar = (numero: number, palabra: string) => {
  if (numero === 1) return palabra;
  if (palabra === 'mes') return 'meses';
  if (palabra.endsWith('s')) return palabra;
  if (palabra.endsWith('z')) return `${palabra.slice(0, -1)}ces`;
  return `${palabra}s`;
};

const construirIndicacion = (
  cantidadNumero: number,
  cantidadUnidad: string,
  frecuenciaNumero: number,
  frecuenciaUnidad: string,
  duracionNumero: number,
  duracionUnidad: string,
) => {
  return `${cantidadNumero} ${pluralizar(
    cantidadNumero,
    cantidadUnidad,
  )} cada ${frecuenciaNumero} ${pluralizar(
    frecuenciaNumero,
    frecuenciaUnidad,
  )} durante ${duracionNumero} ${pluralizar(duracionNumero, duracionUnidad)}`;
};

const normalizarUnidadTiempoApi = (value: string) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const extractEntityId = (entity: any): number | null => {
  const raw = entity?.id ?? entity?.recetaId ?? entity?.receta_id ?? null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const extractConsultaId = (consulta?: any): number | null => {
  const raw =
    consulta?.consultaApiId ??
    consulta?.apiId ??
    consulta?.id ??
    consulta?.consultaId ??
    consulta?.consulta_id ??
    consulta?.apiPayload?.id ??
    null;

  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseStoredJson = (key: string) => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const getUsuarioActual = () => {
  const user = parseStoredJson('user') ?? parseStoredJson('usuario') ?? {};
  const nombre = [
    user?.nombre,
    user?.primerApellido ?? user?.primer_apellido,
    user?.segundoApellido ?? user?.segundo_apellido,
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    nombre: nombre || user?.name || 'Médico tratante',
    rol: user?.rol?.nombre ?? user?.rol ?? user?.role ?? 'Médico',
    cedula:
      user?.cedulaProfesional ??
      user?.cedula_profesional ??
      user?.cedula ??
      user?.professionalLicense ??
      '',
  };
};

const Receta: React.FC<RecetaProps> = ({
  paciente,
  consulta,
  diagnosticos = [],
  onBack,
  onPacienteLiberado,
}) => {
  const systemConfig = useSystemConfig();
  const [form] = Form.useForm();
  const requiereProximaCita = Form.useWatch('requiere_proxima_cita', form);
  const fechaProximaCita = Form.useWatch('fecha_proxima_cita', form);
  const recetaDraftKey = useMemo(
    () => getRecetaDraftKey(paciente, consulta),
    [paciente, consulta],
  );
  const recetaDraftInicial = useMemo(
    () => cargarRecetaDraft(recetaDraftKey),
    [recetaDraftKey],
  );

  const [tratamientos, setTratamientos] = useState<TratamientoItem[]>(
    recetaDraftInicial?.tratamientos ?? [],
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewValues, setPreviewValues] = useState<any>({});
  const [origenMedicamento, setOrigenMedicamento] = useState<'inventario' | 'libre'>(
    recetaDraftInicial?.origenMedicamento ?? 'inventario',
  );
  const [inventarioSeleccionadoId, setInventarioSeleccionadoId] = useState<number | string | undefined>(
    recetaDraftInicial?.inventarioSeleccionadoId,
  );
  const [medicamentosInventario, setMedicamentosInventario] = useState<MedicamentoInventario[]>([]);
  const [inventarioLoading, setInventarioLoading] = useState(true);
  const [consultaServidor, setConsultaServidor] = useState<any>(null);
  const [recetaApiId, setRecetaApiId] = useState<number | null>(
    recetaDraftInicial?.recetaApiId ?? null,
  );
  const [recetaImpresa, setRecetaImpresa] = useState<boolean>(
    Boolean(recetaDraftInicial?.impresa),
  );
  const [guardandoReceta, setGuardandoReceta] = useState(false);
  const [agendaCitas, setAgendaCitas] = useState<CitaAgenda[]>([]);
  const [agendaCitasLoading, setAgendaCitasLoading] = useState(false);
  const consultaId = useMemo(() => extractConsultaId(consulta), [consulta]);
  const usuarioActual = useMemo(() => getUsuarioActual(), []);

  const cargarDisponibilidadCitas = async () => {
    try {
      setAgendaCitasLoading(true);
      const agenda = await citasService.getAgenda();
      setAgendaCitas(agenda.citas);
    } catch (error) {
      console.error('No fue posible actualizar la disponibilidad de citas:', error);
      // No bloqueamos toda la receta por una falla de agenda; la validación final
      // vuelve a consultar antes de guardar.
    } finally {
      setAgendaCitasLoading(false);
    }
  };

  useEffect(() => {
    if (requiereProximaCita) void cargarDisponibilidadCitas();
  }, [requiereProximaCita]);

  const citasOcupadasFechaSeguimiento = useMemo(() => {
    if (!fechaProximaCita) return [];
    return citasService.getOccupiedAppointmentsForDate(
      agendaCitas,
      fechaProximaCita,
      undefined,
      recetaApiId,
    );
  }, [agendaCitas, fechaProximaCita, recetaApiId]);

  useEffect(() => {
    let cancelled = false;

    const recargarInventario = async (showError = false) => {
      try {
        setInventarioLoading(true);
        const medicamentos = await InventoryService.getMedicamentosActivos();
        if (!cancelled) setMedicamentosInventario(medicamentos);
      } catch (error) {
        if (!cancelled) {
          setMedicamentosInventario([]);
          if (showError) {
            message.error(
              getInventoryApiError(error, 'No fue posible consultar el inventario del servidor.'),
            );
          }
        }
      } finally {
        if (!cancelled) setInventarioLoading(false);
      }
    };

    const handleInventoryUpdated = () => {
      void recargarInventario(false);
    };

    void recargarInventario(true);
    window.addEventListener(INVENTARIO_UPDATED_EVENT, handleInventoryUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener(INVENTARIO_UPDATED_EVENT, handleInventoryUpdated);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const cargarConsulta = async () => {
      if (!consultaId) return;

      try {
        const data = await consultasService.findOne(consultaId);
        if (!cancelled) setConsultaServidor(data);
      } catch (error) {
        // La receta puede continuar con el espejo local de la consulta. La API
        // seguirá siendo la fuente preferida cuando esté disponible.
        console.warn('No fue posible refrescar los datos clínicos de la consulta:', error);
      }
    };

    void cargarConsulta();

    return () => {
      cancelled = true;
    };
  }, [consultaId]);

  useEffect(() => {
    if (!recetaDraftInicial?.formValues) return;

    const restored = { ...recetaDraftInicial.formValues };
    if (restored.fecha_proxima_cita && !dayjs.isDayjs(restored.fecha_proxima_cita)) {
      const parsed = dayjs(restored.fecha_proxima_cita);
      restored.fecha_proxima_cita = parsed.isValid() ? parsed : undefined;
    }

    form.setFieldsValue(restored);
  }, [form, recetaDraftInicial]);

  useEffect(() => {
    guardarRecetaDraft(recetaDraftKey, {
      tratamientos,
      formValues: form.getFieldsValue(true),
      origenMedicamento,
      inventarioSeleccionadoId,
      recetaApiId: recetaApiId ?? undefined,
      impresa: recetaImpresa,
    });
  }, [
    recetaDraftKey,
    tratamientos,
    origenMedicamento,
    inventarioSeleccionadoId,
    recetaApiId,
    recetaImpresa,
    form,
  ]);

  useEffect(() => {
    if (!recetaDraftInicial) return;

    const tieneBorrador =
      (recetaDraftInicial.tratamientos?.length ?? 0) > 0 ||
      Object.values(recetaDraftInicial.formValues ?? {}).some(
        (value) => value !== undefined && value !== null && value !== '',
      );

    if (!tieneBorrador) return;

    void Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Borrador de receta recuperado',
      text: 'Se restauraron los medicamentos y datos que ya habías capturado.',
      showConfirmButton: false,
      timer: 2200,
      timerProgressBar: true,
    });
  }, [recetaDraftInicial]);

  const medicamentoInventarioSeleccionado = useMemo(
    () => medicamentosInventario.find((item) => item.id === inventarioSeleccionadoId),
    [inventarioSeleccionadoId, medicamentosInventario],
  );

  const nombreCompleto = useMemo(() => {
    return `${paciente.nombre || ''} ${paciente.primer_apellido || ''} ${
      paciente.segundo_apellido || ''
    }`
      .replace(/\s+/g, ' ')
      .trim();
  }, [paciente]);

  const iniciales = useMemo(() => {
    return nombreCompleto
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((item) => item[0])
      .join('')
      .toUpperCase();
  }, [nombreCompleto]);

  const fechaElaboracion = useMemo(() => new Date().toLocaleString('es-MX'), []);

  const calcularEdad = () => {
    if (!paciente.fecha_nacimiento) return '-';

    const nacimiento = new Date(paciente.fecha_nacimiento);
    const hoy = new Date();
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();

    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--;

    return `${edad} años`;
  };

  const datosClinicos = useMemo(() => {
    const apiPayload = consulta?.apiPayload ?? {};
    const signos =
      consultaServidor?.signosVitales ??
      consultaServidor?.signos_vitales ??
      apiPayload?.signosVitales ??
      consulta?.signosVitales ??
      {};

    return {
      presionArterial:
        signos?.presionArterial ??
        signos?.presion_arterial ??
        consulta?.presion_arterial ??
        consulta?.ta,
      frecuenciaCardiaca:
        signos?.frecuenciaCardiaca ??
        signos?.frecuencia_cardiaca ??
        consulta?.frecuencia_cardiaca ??
        consulta?.fc,
      frecuenciaRespiratoria:
        signos?.frecuenciaRespiratoria ??
        signos?.frecuencia_respiratoria ??
        consulta?.frecuencia_respiratoria ??
        consulta?.fr,
      temperatura: signos?.temperatura ?? consulta?.temperatura,
      peso: signos?.peso ?? consulta?.peso,
      altura: signos?.altura ?? consulta?.altura ?? consulta?.talla,
      cinturaAbdominal:
        signos?.cinturaAbdominal ??
        signos?.cintura_abdominal ??
        consulta?.circunferencia_abdomen ??
        consulta?.abdomen,
      spo2: signos?.spo2 ?? consulta?.spo2,
      imc: signos?.imc ?? consulta?.imc,
      alergias:
        consultaServidor?.alergias ??
        consulta?.alergias ??
        (paciente as any)?.alergias ??
        'NO REFIERE',
    };
  }, [consulta, consultaServidor, paciente]);

  const diagnosticoPrincipal = useMemo(() => {
    if (diagnosticos.length) {
      const primero = diagnosticos[0];
      return `${primero.clave ? `${primero.clave} - ` : ''}${
        primero.diagnostico || primero.descripcion || '-'
      }`;
    }

    const diagnosticosApi = Array.isArray(consultaServidor?.diagnosticos)
      ? consultaServidor.diagnosticos
      : [];
    const primeroApi = diagnosticosApi[0];

    if (!primeroApi) return 'Sin diagnóstico capturado';

    const catalogo = primeroApi?.diagnostico ?? primeroApi?.cie10 ?? {};
    const clave = catalogo?.clave ?? catalogo?.codigo ?? primeroApi?.clave ?? '';
    const nombre =
      catalogo?.diagnostico ??
      catalogo?.descripcion ??
      catalogo?.nombre ??
      primeroApi?.descripcion ??
      '-';

    return `${clave ? `${clave} - ` : ''}${nombre}`;
  }, [diagnosticos, consultaServidor]);

  useEffect(() => {
    form.setFieldsValue({
      diagnostico: diagnosticoPrincipal,
      alergias: datosClinicos.alergias,
      ta: datosClinicos.presionArterial,
      fc: datosClinicos.frecuenciaCardiaca,
      fr: datosClinicos.frecuenciaRespiratoria,
      temperatura: datosClinicos.temperatura,
      peso: datosClinicos.peso,
      altura: datosClinicos.altura,
      abdomen: datosClinicos.cinturaAbdominal,
      spo2: datosClinicos.spo2,
    });
  }, [datosClinicos, diagnosticoPrincipal, form]);

  const progresoReceta = useMemo(() => {
    let puntos = 20;
    if (diagnosticoPrincipal !== 'Sin diagnóstico capturado') puntos += 25;
    if (datosClinicos.alergias) puntos += 20;
    if (tratamientos.length > 0) puntos += 35;
    return Math.min(puntos, 100);
  }, [datosClinicos.alergias, diagnosticoPrincipal, tratamientos.length]);

  const seleccionarMedicamentoInventario = (id?: number | string) => {
    setInventarioSeleccionadoId(id);
    const medicamento = medicamentosInventario.find((item) => item.id === id);

    if (!medicamento) {
      form.setFieldValue('sustancia', undefined);
      return;
    }

    form.setFieldsValue({
      sustancia: medicamento.sustancia_activa,
      via_administracion: medicamento.via_administracion || undefined,
      cantidad_unidad: unidadSugeridaPorForma(medicamento),
    });
  };

  const cambiarOrigenMedicamento = (value: 'inventario' | 'libre') => {
    setOrigenMedicamento(value);
    setInventarioSeleccionadoId(undefined);
    form.setFieldsValue({
      origen_medicamento: value,
      inventario_medicamento_id: undefined,
      sustancia: undefined,
      via_administracion: undefined,
    });
  };

  const agregarTratamiento = async () => {
    try {
      const medicamentoFields =
        origenMedicamento === 'inventario'
          ? ['inventario_medicamento_id']
          : ['sustancia'];

      const values = await form.validateFields([
        ...medicamentoFields,
        'cantidad_numero',
        'cantidad_unidad',
        'frecuencia_numero',
        'frecuencia_unidad',
        'duracion_numero',
        'duracion_unidad',
        'via_administracion',
      ]);

      const medicamentoInventario =
        origenMedicamento === 'inventario'
          ? medicamentosInventario.find(
              (item) => item.id === values.inventario_medicamento_id,
            )
          : undefined;

      const sustanciaLabel =
        medicamentoInventario?.sustancia_activa || String(values.sustancia || '').trim();

      if (!sustanciaLabel) {
        message.warning('Captura la sustancia activa del medicamento.');
        return;
      }

      const indicacion = construirIndicacion(
        Number(values.cantidad_numero),
        values.cantidad_unidad,
        Number(values.frecuencia_numero),
        values.frecuencia_unidad,
        Number(values.duracion_numero),
        values.duracion_unidad,
      );

      const nuevo: TratamientoItem = {
        key: `${medicamentoInventario?.id || sustanciaLabel}-${Date.now()}`,
        no: tratamientos.length + 1,
        sustancia: sustanciaLabel,
        origen: origenMedicamento,
        inventarioId: medicamentoInventario?.id,
        nombreComercial: medicamentoInventario?.nombre_comercial,
        concentracion: medicamentoInventario?.concentracion,
        formaFarmaceutica: medicamentoInventario?.forma_farmaceutica,
        presentacion: medicamentoInventario?.presentacion,
        cantidadNumero: Number(values.cantidad_numero),
        cantidadUnidad: values.cantidad_unidad,
        frecuenciaNumero: Number(values.frecuencia_numero),
        frecuenciaUnidad: values.frecuencia_unidad,
        duracionNumero: Number(values.duracion_numero),
        duracionUnidad: values.duracion_unidad,
        indicacion,
        via: values.via_administracion,
        observaciones:
          form.getFieldValue('observaciones_tratamiento') || 'Sin observaciones',
      };

      setTratamientos((prev) => [...prev, nuevo]);
      setInventarioSeleccionadoId(undefined);

      form.setFieldsValue({
        inventario_medicamento_id: undefined,
        sustancia: undefined,
        cantidad_numero: 1,
        cantidad_unidad: 'tableta',
        frecuencia_numero: 8,
        frecuencia_unidad: 'horas',
        duracion_numero: 6,
        duracion_unidad: 'días',
        via_administracion: undefined,
        observaciones_tratamiento: undefined,
      });

      message.success(
        origenMedicamento === 'inventario'
          ? 'Tratamiento agregado desde inventario.'
          : 'Tratamiento de receta libre agregado.',
      );
    } catch {
      message.warning('Completa los campos obligatorios del tratamiento.');
    }
  };

  const handleRecetaValuesChange = (_changedValues: any, values: any) => {
    guardarRecetaDraft(recetaDraftKey, {
      tratamientos,
      formValues: values,
      origenMedicamento,
      inventarioSeleccionadoId,
      recetaApiId: recetaApiId ?? undefined,
      impresa: recetaImpresa,
    });
  };

  const eliminarTratamiento = (key: string) => {
    setTratamientos((prev) =>
      prev
        .filter((item) => item.key !== key)
        .map((item, index) => ({ ...item, no: index + 1 })),
    );
  };

  const abrirVistaPrevia = () => {
    setPreviewValues(form.getFieldsValue(true));
    setPreviewOpen(true);
  };

  const imprimirReceta = async () => {
    const values = form.getFieldsValue(true);
    setPreviewValues(values);

    // Esperamos a que React pinte los valores más recientes antes de clonar
    // el documento. Esto es especialmente importante en "Guardar e imprimir".
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const template = document.getElementById('rx-print-template');

    if (!template) {
      message.error('No fue posible preparar la receta para impresión.');
      return;
    }

    // La impresión se realiza en un iframe aislado. Así las reglas @media print
    // del layout, sidebar, modales o de otras pantallas no pueden ocultar la receta.
    const iframe = document.createElement('iframe');
    iframe.setAttribute('title', 'Impresión de receta médica');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';

    document.body.appendChild(iframe);

    const printDocument = iframe.contentDocument;
    const printWindow = iframe.contentWindow;

    if (!printDocument || !printWindow) {
      iframe.remove();
      message.error('El navegador no pudo abrir el documento de impresión.');
      return;
    }

    const headStyles = Array.from(
      document.head.querySelectorAll('style, link[rel="stylesheet"]'),
    )
      .map((node) => node.outerHTML)
      .join('\n');

    const nombreArchivo = (nombreCompleto || 'Paciente')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s_-]/g, '')
      .trim()
      .replace(/\s+/g, '_');

    const printOverrides = `
      <style>
        @page {
          size: A4 portrait;
          margin: 0;
        }

        html, body {
          width: 210mm !important;
          min-width: 210mm !important;
          height: 297mm !important;
          min-height: 297mm !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
          background: #ffffff !important;
        }

        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color: #0f172a !important;
          font-family: Arial, Helvetica, sans-serif !important;
        }

        body, body * {
          visibility: visible !important;
        }

        .rx-print-sheet {
          width: 210mm !important;
          height: 297mm !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 7mm 6mm 8mm !important;
          box-sizing: border-box !important;
          display: grid !important;
          grid-template-rows: 139mm 4mm 139mm !important;
          gap: 0 !important;
          overflow: hidden !important;
          background: #ffffff !important;
        }

        .rx-print-copy.rx-print-template {
          display: block !important;
          visibility: visible !important;
          width: 198mm !important;
          height: 139mm !important;
          min-height: 139mm !important;
          max-height: 139mm !important;
          margin: 0 !important;
          padding: 4mm 5mm !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
          background: #ffffff !important;
          border: 0.35mm solid #d7ecef !important;
          border-radius: 2.5mm !important;
          box-shadow: none !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }

        .rx-print-cut {
          display: flex !important;
          visibility: visible !important;
          height: 4mm !important;
          align-items: center !important;
          gap: 2mm !important;
          overflow: hidden !important;
        }

        .rx-preview-modal,
        .rx-print-only,
        .ant-modal-root,
        .ant-message,
        .ant-notification {
          display: none !important;
        }
      </style>
    `;

    printDocument.open();
    printDocument.write(`<!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <base href="${document.baseURI}" />
          <title>${nombreArchivo || 'Receta_medica'}_Receta</title>
          ${headStyles}
          ${printOverrides}
        </head>
        <body>${template.outerHTML}</body>
      </html>`);
    printDocument.close();

    // Esperamos estilos, fuentes y recursos antes de abrir el diálogo.
    await new Promise<void>((resolve) => {
      const finish = () => resolve();
      const waitResources = async () => {
        try {
          if (printDocument.fonts?.ready) await printDocument.fonts.ready;
        } catch {
          // Algunos navegadores no exponen document.fonts dentro del iframe.
        }

        const styleLinks = Array.from(
          printDocument.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
        );

        await Promise.all(
          styleLinks.map(
            (link) =>
              new Promise<void>((done) => {
                if (link.sheet) {
                  done();
                  return;
                }
                link.addEventListener('load', () => done(), { once: true });
                link.addEventListener('error', () => done(), { once: true });
                setTimeout(done, 1200);
              }),
          ),
        );

        requestAnimationFrame(() => requestAnimationFrame(finish));
      };

      if (printDocument.readyState === 'complete') {
        void waitResources();
      } else {
        iframe.onload = () => void waitResources();
        setTimeout(() => void waitResources(), 1200);
      }
    });

    setRecetaImpresa(true);
    guardarRecetaDraft(recetaDraftKey, {
      tratamientos,
      formValues: values,
      origenMedicamento,
      inventarioSeleccionadoId,
      recetaApiId: recetaApiId ?? undefined,
      impresa: true,
    });

    try {
      printWindow.focus();

      // Esperamos al cierre del diálogo de impresión antes de permitir que el flujo
      // de "Guardar e imprimir" libere al paciente y desmonte la pantalla.
      await new Promise<void>((resolve) => {
        let resolved = false;
        const done = () => {
          if (resolved) return;
          resolved = true;
          resolve();
        };

        printWindow.addEventListener('afterprint', done, { once: true });

        // En Chrome/Edge print() suele ser bloqueante; en otros navegadores
        // afterprint puede no dispararse, por eso dejamos un respaldo.
        printWindow.print();
        setTimeout(done, 1800);
      });
    } finally {
      iframe.remove();
    }
  };

  const buildRecetaApiPayload = (values: any): RecetaPayload => {
    if (!consultaId) {
      throw new Error(
        'La consulta todavía no tiene un ID válido. Guarda primero la consulta externa antes de registrar la receta.',
      );
    }

    const sucursalId = Number(
      consultaServidor?.sucursalId ??
        consultaServidor?.sucursal_id ??
        consulta?.sucursalId ??
        consulta?.sucursal_id ??
        consulta?.apiPayload?.sucursalId ??
        resolveSucursalIdFromSession(),
    );

    if (!Number.isInteger(sucursalId) || sucursalId <= 0) {
      throw new Error(
        'No fue posible determinar la sucursal activa para guardar la receta.',
      );
    }

    const fechaSeguimientoDateTime = values.fecha_proxima_cita
      ? dayjs.isDayjs(values.fecha_proxima_cita)
        ? values.fecha_proxima_cita
        : dayjs(values.fecha_proxima_cita)
      : null;

    const fechaSeguimiento =
      fechaSeguimientoDateTime?.isValid() ? fechaSeguimientoDateTime.format('YYYY-MM-DD') : undefined;

    if (values.requiere_proxima_cita && !fechaSeguimientoDateTime?.isValid()) {
      throw new Error('Selecciona la fecha y hora de la próxima cita antes de guardar la receta.');
    }

    return {
      sucursalId,
      consultaId,
      fecha: new Date().toISOString(),
      observaciones: String(values.indicaciones_generales ?? '').trim() || undefined,
      programarSeguimiento: Boolean(values.requiere_proxima_cita),
      fechaSeguimiento: values.requiere_proxima_cita ? fechaSeguimiento : undefined,
      solicitarEstudiosClinicos: Boolean(values.estudios_clinicos),
      detalleEstudiosClinicos: values.estudios_clinicos
        ? String(values.detalle_estudios ?? '').trim() || undefined
        : undefined,
      medicamentos: tratamientos.map((item) => {
        const inventarioId = Number(item.inventarioId);
        const observacionMedicamento =
          item.observaciones && item.observaciones !== 'Sin observaciones'
            ? item.observaciones
            : undefined;

        return {
          inventarioId:
            item.origen === 'inventario' && Number.isInteger(inventarioId) && inventarioId > 0
              ? inventarioId
              : undefined,
          medicamentoNombre: item.nombreComercial || item.sustancia,
          sustanciaActiva: item.sustancia,
          concentracion: item.concentracion || undefined,
          formaFarmaceutica: item.formaFarmaceutica || undefined,
          presentacion: item.presentacion || undefined,
          cantidad: item.cantidadNumero,
          unidad: item.cantidadUnidad,
          dosis: `${item.cantidadNumero} ${item.cantidadUnidad}`,
          frecuencia: `cada ${item.frecuenciaNumero} ${normalizarUnidadTiempoApi(
            item.frecuenciaUnidad,
          )}`,
          duracion: item.duracionNumero,
          unidadTiempo: normalizarUnidadTiempoApi(item.duracionUnidad),
          viaAdministracion: item.via,
          indicaciones: observacionMedicamento || item.indicacion,
          observaciones: observacionMedicamento,
        };
      }),
    };
  };

  const validarHorarioSeguimiento = async (values: any, targetRecetaId?: number | null) => {
    if (!values.requiere_proxima_cita || !values.fecha_proxima_cita) return;

    const seguimiento = dayjs(values.fecha_proxima_cita);
    if (!seguimiento.isValid()) return;

    const agenda = await citasService.getAgenda();
    setAgendaCitas(agenda.citas);

    const excludeRecetaId = targetRecetaId ?? recetaApiId;
    const conflict = citasService.hasConflict(
      agenda.citas,
      seguimiento.format('YYYY-MM-DD'),
      seguimiento.format('HH:mm'),
      30,
      excludeRecetaId ? `seguimiento-receta-${excludeRecetaId}` : undefined,
      excludeRecetaId,
    );

    if (conflict) {
      throw new Error(
        `El horario ${seguimiento.format('DD/MM/YYYY hh:mm A')} ya está asignado a ${conflict.pacienteNombre}. Selecciona otro horario disponible.`,
      );
    }
  };

  const guardarRecetaEnApi = async (values: any) => {
    let targetId = recetaApiId;

    if (!targetId && consultaId) {
      try {
        const existente = await recetasService.findByConsultaId(consultaId);
        targetId = extractEntityId(existente);
      } catch {
        // Si el listado no permite ese filtro, se continúa con POST.
      }
    }

    await validarHorarioSeguimiento(values, targetId);
    const payload = buildRecetaApiPayload(values);

    const response = targetId
      ? await recetasService.update(targetId, payload)
      : await recetasService.create(payload);

    const idDesdeApi = extractEntityId(response);
    let idFinal = targetId ?? idDesdeApi;

    if (!idFinal && consultaId) {
      try {
        const recienGuardada = await recetasService.findByConsultaId(consultaId);
        idFinal = extractEntityId(recienGuardada);
      } catch {
        // La receta ya fue guardada; recuperar el ID es sólo para futuros PATCH.
      }
    }

    if (idFinal) {
      setRecetaApiId(idFinal);

      // La API de recetas actualmente conserva la fecha de seguimiento, pero no
      // un campo de hora. El módulo de Citas usa este override temporal para que
      // la cita aparezca desde ahora con fecha + hora completas.
      if (values.requiere_proxima_cita && values.fecha_proxima_cita) {
        const seguimiento = dayjs(values.fecha_proxima_cita);
        if (seguimiento.isValid()) {
          citasService.updateSeguimiento(idFinal, {
            hora: seguimiento.format('HH:mm'),
            duracion: 30,
            estado: 'PROGRAMADA',
            notas: 'Seguimiento programado desde receta médica',
          });
        }
      } else {
        citasService.clearSeguimiento(idFinal);
      }
    }

    guardarRecetaDraft(recetaDraftKey, {
      tratamientos,
      formValues: values,
      origenMedicamento,
      inventarioSeleccionadoId,
      recetaApiId: idFinal ?? undefined,
      impresa: recetaImpresa,
    });

    return { response, recetaId: idFinal, fueActualizacion: Boolean(targetId) };
  };

  const getConsultaStorageKey = (paciente?: PacienteData) => {
    const pacienteKey =
      paciente?.id ||
      paciente?.numero_expediente ||
      paciente?.curp ||
      `${paciente?.nombre || 'paciente'}-${paciente?.primer_apellido || ''}`;

    return `consulta_externa_estado_${pacienteKey}`;
  };

  const completarFinalizacion = async () => {
    localStorage.removeItem(PACIENTE_ATENCION_STORAGE_KEY);
    localStorage.removeItem(CONSULTA_EXTERNA_ABIERTA_STORAGE_KEY);
    localStorage.removeItem(getConsultaStorageKey(paciente));
    localStorage.removeItem(recetaDraftKey);

    await Swal.fire({
      icon: 'success',
      title: 'Atención finalizada',
      text: 'La receta quedó guardada y el paciente fue liberado correctamente.',
      timer: 1650,
      showConfirmButton: false,
      confirmButtonColor: '#0f766e',
    });

    onPacienteLiberado?.();
  };

  const guardarReceta = async () => {
    if (guardandoReceta) return;

    if (tratamientos.length === 0) {
      message.warning('Agrega al menos un tratamiento antes de guardar la receta.');
      return;
    }

    const camposConstructorTratamiento = [
      'inventario_medicamento_id',
      'sustancia',
      'cantidad_numero',
      'cantidad_unidad',
      'frecuencia_numero',
      'frecuencia_unidad',
      'duracion_numero',
      'duracion_unidad',
      'via_administracion',
      'observaciones_tratamiento',
    ];

    form.setFields(
      camposConstructorTratamiento.map((name) => ({
        name,
        errors: [],
        warnings: [],
      })),
    );

    const values = form.getFieldsValue(true);

    if (values.requiere_proxima_cita) {
      try {
        await form.validateFields(['fecha_proxima_cita']);
      } catch {
        message.warning('Selecciona una fecha y hora válida para la próxima cita.');
        return;
      }
    }

    try {
      setGuardandoReceta(true);
      const resultado = await guardarRecetaEnApi(values);

      if (!recetaImpresa) {
        const decision = await Swal.fire({
          icon: 'success',
          title: resultado.fueActualizacion ? 'Receta actualizada' : 'Receta guardada',
          html: `La receta ya quedó registrada${
            resultado.recetaId ? ` como <b>#${resultado.recetaId}</b>` : ''
          }. <br><br><b>Aún no has abierto la impresión.</b> ¿Qué deseas hacer antes de cerrar la atención?`,
          showCancelButton: true,
          showDenyButton: true,
          confirmButtonText: 'Imprimir y finalizar',
          denyButtonText: 'Guardar y finalizar',
          cancelButtonText: 'Seguir en la receta',
          confirmButtonColor: '#0f766e',
          denyButtonColor: '#334155',
          cancelButtonColor: '#94a3b8',
          reverseButtons: true,
          allowOutsideClick: false,
        });

        if (decision.isDismissed) {
          message.success('La receta quedó guardada. La atención continúa abierta.');
          return;
        }

        if (decision.isConfirmed) {
          await imprimirReceta();
        }

        await completarFinalizacion();
        return;
      }

      await completarFinalizacion();
    } catch (error) {
      console.error('Error guardando receta:', error);
      await Swal.fire({
        icon: 'error',
        title: 'No se pudo guardar la receta',
        text: getRecetaApiError(error),
        confirmButtonText: 'Revisar',
        confirmButtonColor: '#0f766e',
      });
    } finally {
      setGuardandoReceta(false);
    }
  };

  const finalizarAtencion = async () => {
    if (tratamientos.length > 0) {
      const result = await Swal.fire({
        icon: 'info',
        title: 'La receta está en proceso',
        text: 'Para finalizar esta atención primero guarda la receta. Así evitamos cerrar al paciente con tratamientos sin registrar.',
        showCancelButton: true,
        confirmButtonText: 'Guardar receta',
        cancelButtonText: 'Seguir editando',
        confirmButtonColor: '#0f766e',
        cancelButtonColor: '#94a3b8',
        reverseButtons: true,
      });

      if (result.isConfirmed) await guardarReceta();
      return;
    }

    const result = await Swal.fire({
      icon: 'question',
      title: 'Finalizar atención sin receta',
      text: `${nombreCompleto || 'El paciente'} no tiene medicamentos agregados. ¿Deseas finalizar la atención sin generar receta?`,
      showCancelButton: true,
      confirmButtonText: 'Sí, finalizar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#0f766e',
      cancelButtonColor: '#94a3b8',
      reverseButtons: true,
      allowOutsideClick: false,
    });

    if (!result.isConfirmed) return;

    localStorage.removeItem(PACIENTE_ATENCION_STORAGE_KEY);
    localStorage.removeItem(CONSULTA_EXTERNA_ABIERTA_STORAGE_KEY);
    localStorage.removeItem(getConsultaStorageKey(paciente));
    localStorage.removeItem(recetaDraftKey);

    await Swal.fire({
      icon: 'success',
      title: 'Atención finalizada',
      text: 'El paciente activo fue liberado correctamente.',
      timer: 1500,
      showConfirmButton: false,
    });

    onPacienteLiberado?.();
  };

  const columnasTratamientos: ColumnsType<TratamientoItem> = [
    {
      title: '#',
      dataIndex: 'no',
      width: 58,
      align: 'center',
      render: (value) => <span className="rx-table-index">{value}</span>,
    },
    {
      title: 'Medicamento',
      dataIndex: 'sustancia',
      render: (_, record) => (
        <div className="rx-med-info">
          <strong>{record.nombreComercial || record.sustancia}</strong>
          {record.nombreComercial && (
            <small className="rx-med-substance">
              Sustancia activa: {record.sustancia}
              {record.concentracion ? ` · ${record.concentracion}` : ''}
            </small>
          )}
          <span>{record.indicacion}</span>
          <small>{record.observaciones}</small>
        </div>
      ),
    },
    {
      title: 'Vía',
      dataIndex: 'via',
      width: 150,
      align: 'center',
      render: (value) => <Tag className="rx-via-tag">{value}</Tag>,
    },
    {
      title: 'Acciones',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Button
          danger
          type="text"
          icon={<DeleteOutlined />}
          onClick={() => eliminarTratamiento(record.key)}
        />
      ),
    },
  ];

  const renderRecipeCopy = (copyLabel: 'COPIA MÉDICO' | 'COPIA PACIENTE') => (
    <section className="rx-print-template rx-print-copy">
      <div className="rx-copy-label">{copyLabel}</div>
      <div className="rx-print-watermark">{systemConfig.nombreCorto}</div>

      <header className="rx-template-header">
        <div className="rx-template-brand">
          <div className="rx-template-logo">
            {systemConfig.logoDataUrl ? (
              <img
                src={systemConfig.logoDataUrl}
                alt={systemConfig.nombreCorto}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <MedicineBoxOutlined />
            )}
          </div>

          <div>
            <h1>{systemConfig.nombreCorto}</h1>
            <p>Receta médica</p>
          </div>
        </div>

        <div className="rx-template-date">
          <span>Fecha de elaboración</span>
          <strong>{fechaElaboracion}</strong>
        </div>
      </header>

      <section className="rx-print-layout">
        <aside className="rx-print-sidebar">
          <div className="rx-template-doctor">
            <span>Médico tratante</span>
            <strong>{usuarioActual.nombre}</strong>
            <small>{usuarioActual.rol}</small>
          </div>

          <div className="rx-template-doctor">
            <span>Cédula profesional</span>
            <strong>{usuarioActual.cedula || '__________________'}</strong>
          </div>

          <div className="rx-template-section">
            <h2>Paciente</h2>

            <div className="rx-template-box">
              <span>Nombre</span>
              <p>{nombreCompleto || 'Paciente sin nombre'}</p>
            </div>

            <div className="rx-template-mini-grid">
              <div>
                <span>Expediente</span>
                <strong>{paciente.numero_expediente || '-'}</strong>
              </div>

              <div>
                <span>Edad</span>
                <strong>{calcularEdad()}</strong>
              </div>

              <div>
                <span>Sexo</span>
                <strong>{paciente.sexo || '-'}</strong>
              </div>
            </div>
          </div>

          <div className="rx-template-section">
            <h2>Antecedentes</h2>

            <div className="rx-template-box">
              <span>Alergias</span>
              <p>{previewValues.alergias || datosClinicos.alergias || 'NO REFIERE'}</p>
            </div>
          </div>
        </aside>

        <main className="rx-print-body">
          <section className="rx-template-section">
            <h2>Diagnóstico</h2>

            <div className="rx-template-box rx-template-box--diagnostic">
              <p>{previewValues.diagnostico || diagnosticoPrincipal}</p>
            </div>
          </section>

          <section className="rx-template-section rx-template-rx">
            <h2>Rp.</h2>

            {tratamientos.length === 0 ? (
              <div className="rx-template-empty">Sin tratamientos agregados.</div>
            ) : (
              <ol className="rx-template-treatment-list">
                {tratamientos.slice(0, 10).map((item) => (
                  <li key={`${copyLabel}-${item.key}`}>
                    <div>
                      <strong>{item.nombreComercial || item.sustancia}</strong>
                      {item.nombreComercial && (
                        <small>
                          Sustancia activa: {item.sustancia}
                          {item.concentracion ? ` · ${item.concentracion}` : ''}
                        </small>
                      )}
                      <p>{item.indicacion}</p>
                    </div>

                    <div>
                      <small>Vía: {item.via}</small>
                      {item.observaciones && item.observaciones !== 'Sin observaciones' && (
                        <em>{item.observaciones}</em>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="rx-template-section">
            <h2>Indicaciones generales</h2>

            <div className="rx-template-note">
              {previewValues.indicaciones_generales || 'Sin indicaciones generales.'}
            </div>
          </section>

          <section className="rx-template-follow">
            <div>
              <span>Próxima cita</span>
              <strong>
                {previewValues.requiere_proxima_cita && previewValues.fecha_proxima_cita
                  ? dayjs(previewValues.fecha_proxima_cita).format('DD/MM/YYYY · hh:mm A')
                  : 'No programada'}
              </strong>
            </div>

            <div>
              <span>Estudios clínicos</span>
              <strong>{previewValues.estudios_clinicos ? 'Sí' : 'No'}</strong>
            </div>

            <div>
              <span>Detalle de estudios</span>
              <strong>{previewValues.detalle_estudios || '-'}</strong>
            </div>
          </section>
        </main>
      </section>

      <footer className="rx-template-footer">
        <div>
          <div className="rx-sign-line" />
          <strong>Firma del médico</strong>
        </div>

        <p>
          Esta receta es válida únicamente con firma del médico tratante. Acuda a revisión si
          presenta datos de alarma o reacción adversa al tratamiento.
        </p>
      </footer>
    </section>
  );

  const renderPrintableRecipe = (printTemplate = false) => (
    <div
      className="rx-print-sheet"
      id={printTemplate ? 'rx-print-template' : undefined}
    >
      {renderRecipeCopy('COPIA MÉDICO')}
      <div className="rx-print-cut" aria-hidden="true">
        <span>✂</span>
        <div />
      </div>
      {renderRecipeCopy('COPIA PACIENTE')}
    </div>
  );

  const renderTratamientoCard = (item: TratamientoItem) => (
    <article className="rx-treatment-card" key={item.key}>
      <div className="rx-treatment-card__top">
        <div className="rx-treatment-card__number">{item.no}</div>

        <div className="rx-treatment-card__main">
          <strong>{item.nombreComercial || item.sustancia}</strong>
          {item.nombreComercial && (
            <small className="rx-treatment-source">
              Sustancia activa: {item.sustancia}
              {item.concentracion ? ` · ${item.concentracion}` : ''}
            </small>
          )}
          <span>{item.indicacion}</span>
        </div>

        <Button
          danger
          type="text"
          icon={<DeleteOutlined />}
          onClick={() => eliminarTratamiento(item.key)}
        />
      </div>

      <div className="rx-treatment-card__meta">
        <Tag className="rx-via-tag">{item.via}</Tag>
        <p>{item.observaciones}</p>
      </div>
    </article>
  );

  return (
    <div className="receta-page">
      <main className="rx-main">
        <header className="rx-hero">
          <div className="rx-hero__top">
            <Button icon={<ArrowLeftOutlined />} onClick={onBack} className="rx-back-btn">
              Volver
            </Button>

            <div className="rx-title-block">
              <div className="rx-hero__icon">
                <MedicineBoxOutlined />
              </div>

              <Title level={2}>Receta médica</Title>
            </div>

            <div className="rx-date-card">
              <CalendarOutlined />

              <div>
                <span>Fecha y hora de elaboración</span>
                <strong>{fechaElaboracion}</strong>
              </div>
            </div>
          </div>

          <section className="rx-patient-panel">
            <div className="rx-patient-header">
              <div className="rx-avatar-frame">
                <Avatar
                  size={70}
                  className="rx-avatar"
                  icon={!iniciales && <UserOutlined />}
                >
                  {iniciales}
                </Avatar>
              </div>

              <div className="rx-patient-data">
                <h2>{nombreCompleto || 'Paciente sin nombre'}</h2>

                <div className="rx-patient-meta">
                  <span>Expediente: {paciente.numero_expediente || 'Sin expediente'}</span>
                  <span>{calcularEdad()}</span>
                  <span>{paciente.sexo || '-'}</span>
                </div>

                <div className="rx-diagnostico-box">
                  <label>Diagnóstico</label>
                  <p>{diagnosticoPrincipal}</p>
                </div>

                <div className="rx-alergias-box">
                  <label>Alergias</label>
                  <p>{datosClinicos.alergias || 'No registradas'}</p>
                </div>
              </div>

              <div className="rx-status-card">
                <div
                  className="rx-progress-ring"
                  style={{ ['--rx-progress' as any]: `${progresoReceta}%` }}
                >
                  <span>{progresoReceta}%</span>
                </div>

                <div className="rx-status-content">
                  <span>Estado</span>
                  <strong>{tratamientos.length} medicamento(s)</strong>
                </div>

                <Button
                  icon={<CheckCircleOutlined />}
                  className="rx-finalizar-btn"
                  onClick={finalizarAtencion}
                >
                  Finalizar atención
                </Button>
              </div>
            </div>
          </section>
        </header>

        <Form
          form={form}
          layout="vertical"
          onValuesChange={handleRecetaValuesChange}
          initialValues={{
            diagnostico: diagnosticoPrincipal,
            alergias: datosClinicos.alergias || 'NO REFIERE',
            ta: datosClinicos.presionArterial,
            fc: datosClinicos.frecuenciaCardiaca,
            fr: datosClinicos.frecuenciaRespiratoria,
            temperatura: datosClinicos.temperatura,
            peso: datosClinicos.peso,
            altura: datosClinicos.altura,
            abdomen: datosClinicos.cinturaAbdominal,
            spo2: datosClinicos.spo2,
            origen_medicamento: 'inventario',
            cantidad_numero: 1,
            cantidad_unidad: 'tableta',
            frecuencia_numero: 8,
            frecuencia_unidad: 'horas',
            duracion_numero: 6,
            duracion_unidad: 'días',
            requiere_proxima_cita: false,
            estudios_clinicos: false,
          }}
        >
          <section className="rx-content-grid">
            <div className="rx-card rx-card--clinical">
              <div className="rx-card-title">
                <div>
                  <HeartOutlined />
                  <h3>Datos clínicos</h3>
                </div>
                <span>Signos y diagnóstico</span>
              </div>

              <Row gutter={[16, 10]}>
                <Col xs={24}>
                  <Form.Item name="diagnostico" label="Diagnóstico relacionado">
                    <Input.TextArea
                      autoSize={{ minRows: 2, maxRows: 4 }}
                      placeholder="Diagnóstico principal"
                      readOnly
                    />
                  </Form.Item>
                </Col>

                <Col xs={24}>
                  <Form.Item name="alergias" label="Alergias">
                    <Input placeholder="Ej. Penicilina / No refiere" readOnly />
                  </Form.Item>
                </Col>

                <Col xs={24}>
                  <div className="rx-vitals-grid">
                    <Form.Item name="ta" label="T.A.">
                      <Input addonAfter="mm/Hg" placeholder="120/80" readOnly />
                    </Form.Item>

                    <Form.Item name="fc" label="F.C.">
                      <Input addonAfter="x min" placeholder="80" readOnly />
                    </Form.Item>

                    <Form.Item name="fr" label="F.R.">
                      <Input addonAfter="x min" placeholder="18" readOnly />
                    </Form.Item>

                    <Form.Item name="temperatura" label="Temperatura">
                      <Input addonAfter="°C" placeholder="36.5" readOnly />
                    </Form.Item>

                    <Form.Item name="peso" label="Peso">
                      <Input addonAfter="kg" placeholder="70" readOnly />
                    </Form.Item>

                    <Form.Item name="altura" label="Altura">
                      <Input addonAfter="m" placeholder="1.70" readOnly />
                    </Form.Item>

                    <Form.Item name="abdomen" label="C. abdomen">
                      <Input addonAfter="cm" placeholder="80" readOnly />
                    </Form.Item>

                    <Form.Item name="spo2" label="SpO₂">
                      <Input addonAfter="%" placeholder="98" readOnly />
                    </Form.Item>
                  </div>
                </Col>
              </Row>
            </div>

            <div className="rx-card rx-card--treatment">
              <div className="rx-card-title">
                <div>
                  <MedicineBoxOutlined />
                  <h3>Tratamiento</h3>
                </div>
                <span>{tratamientos.length} medicamento(s)</span>
              </div>

              <div className="rx-builder">
                <div className="rx-builder-grid">
                  <div className="rx-medication-source rx-field-medicine">
                    <div className="rx-source-switch" role="group" aria-label="Origen del medicamento">
                      <button
                        type="button"
                        className={origenMedicamento === 'inventario' ? 'is-active' : ''}
                        onClick={() => cambiarOrigenMedicamento('inventario')}
                      >
                        Inventario del consultorio
                      </button>
                      <button
                        type="button"
                        className={origenMedicamento === 'libre' ? 'is-active' : ''}
                        onClick={() => cambiarOrigenMedicamento('libre')}
                      >
                        Receta libre
                      </button>
                    </div>

                    {origenMedicamento === 'inventario' ? (
                      <>
                        <Form.Item
                          name="inventario_medicamento_id"
                          label="Medicamento del inventario"
                          rules={[{ required: true, message: 'Selecciona un medicamento' }]}
                        >
                          <Select
                            showSearch
                            allowClear
                            loading={inventarioLoading}
                            placeholder="Buscar por medicamento o sustancia activa"
                            optionFilterProp="label"
                            onChange={seleccionarMedicamentoInventario}
                            options={medicamentosInventario.map((item) => ({
                              value: item.id,
                              label: `${item.nombre_comercial} · ${item.sustancia_activa}${
                                item.concentracion ? ` ${item.concentracion}` : ''
                              } · Stock ${item.stock_actual} ${item.unidad_stock}`,
                            }))}
                            notFoundContent={
                              inventarioLoading
                                ? 'Consultando inventario...'
                                : 'No hay medicamentos disponibles en el inventario'
                            }
                          />
                        </Form.Item>

                        {medicamentoInventarioSeleccionado && (
                          <div className="rx-inventory-med-preview">
                            <div>
                              <span>Sustancia activa</span>
                              <strong>{medicamentoInventarioSeleccionado.sustancia_activa}</strong>
                            </div>
                            <div>
                              <span>Presentación</span>
                              <strong>
                                {medicamentoInventarioSeleccionado.concentracion || 'Sin concentración'}
                                {medicamentoInventarioSeleccionado.forma_farmaceutica
                                  ? ` · ${medicamentoInventarioSeleccionado.forma_farmaceutica}`
                                  : ''}
                              </strong>
                            </div>
                            <div>
                              <span>Existencia</span>
                              <strong
                                className={
                                  medicamentoInventarioSeleccionado.stock_actual <=
                                  medicamentoInventarioSeleccionado.stock_minimo
                                    ? 'is-low'
                                    : ''
                                }
                              >
                                {medicamentoInventarioSeleccionado.stock_actual}{' '}
                                {medicamentoInventarioSeleccionado.unidad_stock}
                              </strong>
                            </div>
                          </div>
                        )}

                        <Form.Item name="sustancia" hidden>
                          <Input />
                        </Form.Item>
                      </>
                    ) : (
                      <Form.Item
                        name="sustancia"
                        label="Sustancia activa / medicamento"
                        rules={[{ required: true, message: 'Captura la sustancia activa' }]}
                      >
                        <Input placeholder="Ej. Paracetamol, Amoxicilina, medicamento magistral..." />
                      </Form.Item>
                    )}
                  </div>

                  <Form.Item
                    name="cantidad_numero"
                    label="Cantidad"
                    rules={[{ required: true, message: 'Cantidad' }]}
                  >
                    <InputNumber min={1} className="rx-number" />
                  </Form.Item>

                  <Form.Item name="cantidad_unidad" label="Unidad">
                    <Select options={opcionesUnidadCantidad} />
                  </Form.Item>

                  <Form.Item
                    name="frecuencia_numero"
                    label="Cada"
                    rules={[{ required: true, message: 'Frecuencia' }]}
                  >
                    <InputNumber min={1} className="rx-number" />
                  </Form.Item>

                  <Form.Item
                    className="rx-field-duracion-unidad"
                    name="frecuencia_unidad"
                    label="Unidad"
                  >
                    <Select options={opcionesUnidadFrecuencia} />
                  </Form.Item>

                  <Form.Item
                    name="duracion_numero"
                    label="Durante"
                    rules={[{ required: true, message: 'Duración' }]}
                  >
                    <InputNumber min={1} className="rx-number" />
                  </Form.Item>

                  <Form.Item name="duracion_unidad" label="Unidad">
                    <Select options={opcionesUnidadDuracion} />
                  </Form.Item>

                  <Form.Item
                    className="rx-field-via"
                    name="via_administracion"
                    label="Vía de administración"
                    rules={[{ required: true, message: 'Selecciona vía' }]}
                  >
                    <Select placeholder="Seleccione" options={opcionesVia} />
                  </Form.Item>

                  <Form.Item
                    name="observaciones_tratamiento"
                    label="Observaciones"
                    className="rx-field-notes"
                  >
                    <Input placeholder="Ej. Tomar después de alimentos" />
                  </Form.Item>

                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    className="rx-primary-btn rx-add-treatment-btn"
                    onClick={agregarTratamiento}
                  >
                    Agregar
                  </Button>
                </div>
              </div>

              <Table
                className="rx-treatment-table"
                columns={columnasTratamientos}
                dataSource={tratamientos}
                pagination={false}
                rowKey="key"
                locale={{
                  emptyText: <Empty description="Sin tratamientos agregados" />,
                }}
              />

              <div className="rx-treatment-cards">
                {tratamientos.length === 0 ? (
                  <div className="rx-empty-box">
                    <Empty description="Sin tratamientos agregados" />
                  </div>
                ) : (
                  tratamientos.map(renderTratamientoCard)
                )}
              </div>
            </div>
          </section>

          <section className="rx-card rx-follow-card">
            <div className="rx-card-title">
              <div>
                <FileDoneOutlined />
                <h3>Indicaciones y seguimiento</h3>
              </div>
              <span>Notas finales para el paciente</span>
            </div>

            <Row gutter={[16, 10]}>
              <Col xs={24} lg={16}>
                <Form.Item name="indicaciones_generales" label="Indicaciones generales">
                  <TextArea
                    rows={5}
                    placeholder="Ej. Reposo, hidratación, signos de alarma, medidas generales..."
                  />
                </Form.Item>
              </Col>

              <Col xs={24} lg={8}>
                <div className="rx-check-panel">
                  <Form.Item name="requiere_proxima_cita" valuePropName="checked">
                    <Checkbox
                      onChange={(event) => {
                        if (!event.target.checked) {
                          form.setFieldValue('fecha_proxima_cita', undefined);
                          form.setFields([{ name: 'fecha_proxima_cita', errors: [] }]);
                        }
                      }}
                    >
                      Programar próxima cita
                    </Checkbox>
                  </Form.Item>

                  <Form.Item
                    name="fecha_proxima_cita"
                    label="Fecha y hora de próxima cita"
                    rules={[
                      {
                        validator: (_, value) => {
                          if (!requiereProximaCita) return Promise.resolve();
                          if (!value) return Promise.reject(new Error('Selecciona fecha y hora'));
                          if (dayjs(value).isBefore(dayjs())) {
                            return Promise.reject(new Error('La cita debe ser posterior a la hora actual'));
                          }
                          return Promise.resolve();
                        },
                      },
                    ]}
                  >
                    <DatePicker
                      className="rx-full rx-follow-datetime"
                      showTime={{ format: 'hh:mm A', minuteStep: 15, use12Hours: true }}
                      format="DD/MM/YYYY hh:mm A"
                      placeholder="Seleccionar fecha y hora (AM/PM)"
                      disabled={!requiereProximaCita}
                      disabledDate={(current) =>
                        Boolean(current && current.endOf('day').isBefore(dayjs().startOf('day')))
                      }
                      disabledTime={(current) =>
                        citasService.getDisabledTimeConfig(
                          agendaCitas,
                          current,
                          30,
                          recetaApiId ? `seguimiento-receta-${recetaApiId}` : undefined,
                          recetaApiId,
                        )
                      }
                      onOpenChange={(open) => {
                        if (open && requiereProximaCita) void cargarDisponibilidadCitas();
                      }}
                      showNow={false}
                    />
                  </Form.Item>

                  {requiereProximaCita && (
                    <div className="rx-availability-note">
                      <CalendarOutlined />
                      <span>
                        {agendaCitasLoading
                          ? 'Actualizando horarios disponibles...'
                          : fechaProximaCita
                            ? citasOcupadasFechaSeguimiento.length > 0
                              ? `${citasOcupadasFechaSeguimiento.length} cita(s) ya programada(s) ese día. Los horarios ocupados están deshabilitados.`
                              : 'Ese día no tiene horarios ocupados registrados. Los horarios pasados también están deshabilitados.'
                            : 'Selecciona una fecha; los horarios ya asignados se deshabilitan automáticamente.'}
                      </span>
                    </div>
                  )}

                  <Form.Item name="estudios_clinicos" valuePropName="checked">
                    <Checkbox>Solicitar estudios clínicos</Checkbox>
                  </Form.Item>
                </div>
              </Col>

              <Col xs={24}>
                <Form.Item name="detalle_estudios" label="Detalle de estudios clínicos">
                  <Input placeholder="Ej. Biometría hemática, química sanguínea, examen general de orina..." />
                </Form.Item>
              </Col>
            </Row>
          </section>

          <div className="rx-actions">
            <Space wrap>
              <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
                Regresar
              </Button>

              <Button icon={<EyeOutlined />} onClick={abrirVistaPrevia}>
                Vista previa
              </Button>

              <Button icon={<PrinterOutlined />} onClick={imprimirReceta}>
                Imprimir
              </Button>

              <Button
                type="primary"
                icon={<SaveOutlined />}
                className="rx-primary-btn"
                onClick={guardarReceta}
                loading={guardandoReceta}
                disabled={guardandoReceta}
              >
                Guardar receta
              </Button>
            </Space>
          </div>
        </Form>
      </main>

      <div className="rx-print-only">{renderPrintableRecipe(true)}</div>

      <Modal
        className="rx-preview-modal"
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        width="82vw"
        centered={false}
        title={
          <div className="rx-preview-title">
            <MedicineBoxOutlined />
            <span>Vista previa de receta</span>
          </div>
        }
        footer={[
          <Button key="cerrar" onClick={() => setPreviewOpen(false)}>
            Cerrar
          </Button>,
          <Button key="imprimir" icon={<PrinterOutlined />} onClick={imprimirReceta}>
            Imprimir
          </Button>,
          <Button
            key="guardar"
            type="primary"
            icon={<SaveOutlined />}
            className="rx-primary-btn"
            onClick={guardarReceta}
            loading={guardandoReceta}
            disabled={guardandoReceta}
          >
            Guardar receta
          </Button>,
        ]}
      >
        {renderPrintableRecipe()}
      </Modal>
    </div>
  );
};

export default Receta;