import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Avatar,
  Button,
  Checkbox,
  Col,
  Descriptions,
  Divider,
  Empty,
  Form,
  Input,
  Modal,
  Radio,
  Row,
  Select,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  EyeOutlined,
  FileTextOutlined,
  UserOutlined,
  HeartOutlined,
  ExperimentOutlined,
  MedicineBoxOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  HistoryOutlined,
  WomanOutlined,
  PlusOutlined,
  DeleteOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import Swal from 'sweetalert2';

import axiosInstance from '../../api/axios.config';
import type { PacienteData } from '../../services/pacientes/pacientes.service';
import consultasService, {
  type ConsultaPayload,
} from '../../services/consultas/consultas.service';
import Receta from './Receta';
import './ConsultaExterna.css';

const { Title, Text } = Typography;

const PACIENTE_ATENCION_STORAGE_KEY = 'paciente_atencion_actual';

type ConsultaExternaProps = {
  paciente: PacienteData;
  onBack: () => void;
  onPacienteLiberado?: () => void;
};

export type DiagnosticoItem = {
  key: string;
  no: number;
  clave: string;
  diagnostico: string;
  primeraVez: boolean;
  subsecuente: boolean;
  descripcion: string;
  cie10Id?: number;
  cie10Text?: string;
};

type Cie10Item = {
  id: number;
  nombre: string;
  catalogKey: string;
  text: string;
};

type HistorialPacienteValidacion = {
  loading: boolean;
  totalPrevias: number;
  yaAtendidoEsteAnio: boolean | null;
  ultimaConsulta: string | null;
  error: string | null;
};

type ConsultaStorageState = {
  currentStep: number;
  sinPeso: boolean;
  sinAltura: boolean;
  sinTemperatura: boolean;
  diagnosticos: DiagnosticoItem[];
  mostrarReceta: boolean;
  consultaGuardada: any;
  consultaApiId: number | null;
  progress: {
    validacion: boolean;
    signos: boolean;
    antecedentes: boolean;
    diagnostico: boolean;
    guardado: boolean;
  };
  formValues: any;
};

const getConsultaStorageKey = (paciente?: PacienteData) => {
  const pacienteKey =
    paciente?.id ||
    paciente?.numero_expediente ||
    paciente?.curp ||
    `${paciente?.nombre || 'paciente'}-${paciente?.primer_apellido || ''}`;

  return `consulta_externa_estado_${pacienteKey}`;
};

const cargarEstadoConsulta = (key: string): Partial<ConsultaStorageState> | null => {
  if (typeof window === 'undefined') return null;

  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

const guardarEstadoConsulta = (key: string, data: Partial<ConsultaStorageState>) => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Evita romper la pantalla si el navegador bloquea storage.
  }
};

const limpiarPacienteActivo = () => {
  try {
    localStorage.removeItem(PACIENTE_ATENCION_STORAGE_KEY);
  } catch {
    // Evita romper la pantalla si el navegador bloquea storage.
  }
};

const normalizeSearch = (value?: string) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ');

const extraerFechaConsulta = (consulta: any): Date | null => {
  const raw =
    consulta?.fechaConsulta ??
    consulta?.fecha_consulta ??
    consulta?.fecha ??
    consulta?.createdAt ??
    consulta?.created_at ??
    consulta?.fechaCreacion ??
    consulta?.fecha_creacion ??
    null;

  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatearFechaConsulta = (date: Date | null): string | null => {
  if (!date) return null;
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const CIE10_PAGE_SIZE = 25;

const extractCie10Meta = (payload: any) => {
  const root = payload?.data ?? payload ?? {};
  return root?.meta ?? root?.pagination ?? payload?.meta ?? {};
};

const extractCie10Results = (payload: any): Cie10Item[] => {
  const results =
    payload?.data?.results ||
    payload?.results ||
    payload?.data ||
    payload ||
    [];

  if (!Array.isArray(results)) return [];

  return results
    .map((item) => {
      const catalogKey = String(item?.catalogKey || item?.catalog_key || '');
      const nombre = String(item?.nombre || '');

      return {
        id: Number(item?.id),
        nombre,
        catalogKey,
        text: String(item?.text || `${catalogKey} - ${nombre}`),
      };
    })
    .filter((item) => item.id && item.catalogKey && item.nombre);
};

const ConsultaExterna: React.FC<ConsultaExternaProps> = ({
  paciente,
  onBack,
  onPacienteLiberado,
}) => {
  const [form] = Form.useForm();

  const storageKey = useMemo(() => getConsultaStorageKey(paciente), [paciente]);
  const estadoInicial = useMemo(() => cargarEstadoConsulta(storageKey), [storageKey]);

  const [currentStep, setCurrentStep] = useState(estadoInicial?.currentStep ?? 0);
  const [sinPeso, setSinPeso] = useState(estadoInicial?.sinPeso ?? false);
  const [sinAltura, setSinAltura] = useState(estadoInicial?.sinAltura ?? false);
  const [sinTemperatura, setSinTemperatura] = useState(
    estadoInicial?.sinTemperatura ?? false,
  );

  const [diagnosticos, setDiagnosticos] = useState<DiagnosticoItem[]>(
    estadoInicial?.diagnosticos ?? [],
  );

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewValues, setPreviewValues] = useState<any>({});

  const [mostrarReceta, setMostrarReceta] = useState(
    estadoInicial?.mostrarReceta ?? false,
  );

  const [consultaGuardada, setConsultaGuardada] = useState<any>(
    estadoInicial?.consultaGuardada ?? null,
  );

  const [consultaApiId, setConsultaApiId] = useState<number | null>(() => {
    const id = Number(
      estadoInicial?.consultaApiId ??
        estadoInicial?.consultaGuardada?.consultaApiId ??
        estadoInicial?.consultaGuardada?.apiId ??
        0,
    );

    return Number.isFinite(id) && id > 0 ? id : null;
  });

  const [guardandoConsulta, setGuardandoConsulta] = useState(false);

  const [historialPaciente, setHistorialPaciente] =
    useState<HistorialPacienteValidacion>({
      loading: true,
      totalPrevias: 0,
      yaAtendidoEsteAnio: null,
      ultimaConsulta: null,
      error: null,
    });

  const [progress, setProgress] = useState(
    estadoInicial?.progress ?? {
      validacion: false,
      signos: false,
      antecedentes: false,
      diagnostico: false,
      guardado: false,
    },
  );

  const [cie10Options, setCie10Options] = useState<Cie10Item[]>([]);
  const [cie10Loading, setCie10Loading] = useState(false);
  const [cie10CatalogoInicialCargado, setCie10CatalogoInicialCargado] =
    useState(false);
  const [cie10Seleccionado, setCie10Seleccionado] = useState<Cie10Item | null>(
    null,
  );
  const [cie10SearchValue, setCie10SearchValue] = useState('');
  const [cie10Page, setCie10Page] = useState(1);
  const [cie10HasMore, setCie10HasMore] = useState(true);
  const [diagnosticoRequiredError, setDiagnosticoRequiredError] = useState(false);

  const cie10SearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cie10RequestSeq = useRef(0);

  const imcActual = Form.useWatch('imc', form);
  const alturaActual = Form.useWatch('altura', form);
  const referirPaciente = Form.useWatch('referir_paciente', form);

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

  useEffect(() => {
    if (estadoInicial?.formValues) {
      form.setFieldsValue(estadoInicial.formValues);

      const motivoId = estadoInicial.formValues?.motivo_consulta_cie10_id;
      const motivoClave = estadoInicial.formValues?.motivo_consulta_cie10_clave;
      const motivoNombre = estadoInicial.formValues?.motivo_consulta_cie10_nombre;
      const motivoTexto = estadoInicial.formValues?.motivo_consulta_cie10_texto;

      if (motivoId && motivoClave && motivoNombre) {
        setCie10Seleccionado({
          id: Number(motivoId),
          catalogKey: String(motivoClave),
          nombre: String(motivoNombre),
          text: String(motivoTexto || `${motivoClave} - ${motivoNombre}`),
        });
      }
    }
  }, [estadoInicial, form]);

  useEffect(() => {
    let cancelled = false;

    const validarHistorialPaciente = async () => {
      const pacienteId = Number(paciente?.id);

      if (!Number.isFinite(pacienteId) || pacienteId <= 0) {
        if (!cancelled) {
          setHistorialPaciente({
            loading: false,
            totalPrevias: 0,
            yaAtendidoEsteAnio: null,
            ultimaConsulta: null,
            error: 'No fue posible identificar al paciente.',
          });
        }
        return;
      }

      setHistorialPaciente((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const firstPage = await consultasService.findAll({
          page: 1,
          limit: 20,
          pacienteId,
        });

        let consultas = [...firstPage.data];
        const totalPages = Math.max(1, Number(firstPage.meta.totalPages || 1));

        for (let page = 2; page <= totalPages; page += 1) {
          const response = await consultasService.findAll({
            page,
            limit: firstPage.meta.limit || 20,
            pacienteId,
          });
          consultas = consultas.concat(response.data);
        }

        // Si estamos retomando una consulta ya guardada, esa misma consulta no
        // debe contarse como una atención previa para este cálculo.
        const consultasPrevias = consultas.filter((item: any) => {
          const itemId = Number(
            item?.id ?? item?.consultaId ?? item?.consulta_id ?? item?.consulta?.id ?? 0,
          );
          return !(
            consultaApiId &&
            Number.isFinite(itemId) &&
            itemId === Number(consultaApiId)
          );
        });

        const fechas = consultasPrevias
          .map(extraerFechaConsulta)
          .filter((date): date is Date => Boolean(date))
          .sort((a, b) => b.getTime() - a.getTime());

        const anioActual = new Date().getFullYear();
        const yaAtendidoEsteAnio =
          consultasPrevias.length === 0
            ? false
            : fechas.length > 0
              ? fechas.some((date) => date.getFullYear() === anioActual)
              : null;

        if (cancelled) return;

        if (yaAtendidoEsteAnio !== null) {
          form.setFieldsValue({
            primer_consulta_anio: yaAtendidoEsteAnio ? 'NO' : 'SI',
          });
          form.setFields([{ name: 'primer_consulta_anio', errors: [] }]);
        }

        setHistorialPaciente({
          loading: false,
          totalPrevias: consultasPrevias.length,
          yaAtendidoEsteAnio,
          ultimaConsulta: formatearFechaConsulta(fechas[0] ?? null),
          error: null,
        });
      } catch (error) {
        console.warn('No fue posible validar la primera consulta del año:', error);
        if (!cancelled) {
          setHistorialPaciente({
            loading: false,
            totalPrevias: 0,
            yaAtendidoEsteAnio: null,
            ultimaConsulta: null,
            error: 'No se pudo validar automáticamente. Selecciona el dato manualmente.',
          });
        }
      }
    };

    void validarHistorialPaciente();

    return () => {
      cancelled = true;
    };
  }, [paciente?.id, consultaApiId, form]);

  useEffect(() => {
    guardarEstadoConsulta(storageKey, {
      currentStep,
      sinPeso,
      sinAltura,
      sinTemperatura,
      diagnosticos,
      mostrarReceta,
      consultaGuardada,
      consultaApiId,
      progress,
      formValues: form.getFieldsValue(true),
    });
  }, [
    storageKey,
    currentStep,
    sinPeso,
    sinAltura,
    sinTemperatura,
    diagnosticos,
    mostrarReceta,
    consultaGuardada,
    consultaApiId,
    progress,
    form,
  ]);

  useEffect(() => {
    return () => {
      if (cie10SearchTimer.current) {
        clearTimeout(cie10SearchTimer.current);
      }
    };
  }, []);

  const guardarEstadoActual = (formValues?: any) => {
    guardarEstadoConsulta(storageKey, {
      currentStep,
      sinPeso,
      sinAltura,
      sinTemperatura,
      diagnosticos,
      mostrarReceta,
      consultaGuardada,
      consultaApiId,
      progress,
      formValues: formValues ?? form.getFieldsValue(true),
    });
  };

  const handleBackPacientes = () => {
    localStorage.removeItem(storageKey);
    onBack();
  };

  const liberarPaciente = async () => {
    const result = await Swal.fire({
      icon: 'question',
      title: 'Finalizar atención',
      text: `El paciente ${nombreCompleto || 'seleccionado'} dejará de estar activo para consulta y procedimientos.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, finalizar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ff4d4f',
      cancelButtonColor: '#94a3b8',
      reverseButtons: true,
      allowOutsideClick: false,
      allowEscapeKey: true,
    });

    if (!result.isConfirmed) return;

    limpiarPacienteActivo();
    localStorage.removeItem(storageKey);
    localStorage.removeItem('consulta_externa_abierta');

    await Swal.fire({
      icon: 'success',
      title: 'Paciente liberado',
      text: 'El paciente activo fue liberado correctamente.',
      timer: 1700,
      showConfirmButton: false,
      confirmButtonColor: '#0f766e',
    });

    onPacienteLiberado?.();
    onBack();
  };

  const opcionesSiNoDesconoce = [
    { value: 'SI', label: 'Sí' },
    { value: 'NO', label: 'No' },
    { value: 'SE DESCONOCE', label: 'Se desconoce' },
  ];

  const opcionesGineco = [
    { value: 'NO APLICA', label: 'No aplica' },
    { value: 'SI', label: 'Sí' },
    { value: 'NO', label: 'No' },
    { value: 'SE DESCONOCE', label: 'Se desconoce' },
  ];

  const getCie10Options = () => {
    return cie10Options.map((item) => ({
      value: item.catalogKey,
      label: `${item.catalogKey} - ${item.nombre}`,
    }));
  };

  const buscarCie10 = async (
    searchText = '',
    silent = false,
    page = 1,
    append = false,
  ) => {
    const query = normalizeSearch(searchText);
    const queryToSend = query.length >= 2 ? query : 'a';
    const requestSeq = ++cie10RequestSeq.current;

    try {
      setCie10Loading(true);

      const response = await axiosInstance.get('/cie10', {
        params: {
          term: queryToSend,
          q: queryToSend,
          _type: 'query',
          page,
          limit: CIE10_PAGE_SIZE,
        },
      });

      if (requestSeq !== cie10RequestSeq.current) return;

      const results = extractCie10Results(response.data);
      const meta = extractCie10Meta(response.data);
      const totalPages = Number(meta?.totalPages ?? meta?.total_pages ?? 0);

      setCie10Options((prev) => {
        const source = append ? [...prev, ...results] : results;
        const unique = new Map<string, Cie10Item>();
        source.forEach((item) => unique.set(`${item.id}-${item.catalogKey}`, item));
        return [...unique.values()];
      });
      setCie10SearchValue(query);
      setCie10Page(page);
      setCie10HasMore(
        totalPages > 0 ? page < totalPages : results.length >= CIE10_PAGE_SIZE,
      );
      setCie10CatalogoInicialCargado(true);
    } catch (error: any) {
      console.error('Error al consultar CIE-10:', error);

      if (!append) setCie10Options([]);

      if (!silent) {
        Swal.fire({
          icon: 'error',
          title: 'Error al consultar CIE-10',
          text: 'No fue posible obtener información del catálogo CIE-10.',
          confirmButtonColor: '#36c6c7',
        });
      }
    } finally {
      if (requestSeq === cie10RequestSeq.current) setCie10Loading(false);
    }
  };

  const cargarCatalogoInicialCie10 = () => {
    if (cie10Loading) return;

    if (cie10CatalogoInicialCargado && cie10Options.length > 0 && !cie10SearchValue) {
      return;
    }

    void buscarCie10('', true, 1, false);
  };

  const handleOpenCie10 = (open: boolean) => {
    if (open) cargarCatalogoInicialCie10();
  };

  const handleSearchCie10 = (searchText: string) => {
    if (cie10SearchTimer.current) clearTimeout(cie10SearchTimer.current);

    const query = normalizeSearch(searchText);
    setCie10SearchValue(query);

    cie10SearchTimer.current = setTimeout(() => {
      void buscarCie10(query, true, 1, false);
    }, 320);
  };

  const handleCie10PopupScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (cie10Loading || !cie10HasMore) return;

    const target = event.currentTarget;
    const nearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 48;
    if (!nearBottom) return;

    void buscarCie10(cie10SearchValue, true, cie10Page + 1, true);
  };

  const setCie10HiddenFields = (selected: Cie10Item) => {
    form.setFieldsValue({
      motivo_consulta: selected.catalogKey,
      motivo_consulta_cie10_id: selected.id,
      motivo_consulta_cie10_clave: selected.catalogKey,
      motivo_consulta_cie10_nombre: selected.nombre,
      motivo_consulta_cie10_texto: selected.text,
    });
  };

  const handleSelectCie10 = (value: string) => {
    const selected = cie10Options.find(
      (item) => String(item.catalogKey) === String(value),
    );

    if (!selected) return;

    setCie10Seleccionado(selected);
    setCie10HiddenFields(selected);

    setProgress((prev) => ({
      ...prev,
      diagnostico: true,
    }));

    guardarEstadoActual(form.getFieldsValue(true));
  };

  const handleClearCie10 = () => {
    setCie10Seleccionado(null);

    form.setFieldsValue({
      motivo_consulta: undefined,
      motivo_consulta_cie10_id: undefined,
      motivo_consulta_cie10_clave: '',
      motivo_consulta_cie10_nombre: '',
      motivo_consulta_cie10_texto: '',
    });

    cargarCatalogoInicialCie10();
  };

  const buildCie10FromForm = (): Cie10Item | null => {
    const values = form.getFieldsValue(true);

    if (
      !values.motivo_consulta_cie10_id ||
      !values.motivo_consulta_cie10_clave ||
      !values.motivo_consulta_cie10_nombre
    ) {
      return null;
    }

    return {
      id: Number(values.motivo_consulta_cie10_id),
      catalogKey: String(values.motivo_consulta_cie10_clave),
      nombre: String(values.motivo_consulta_cie10_nombre),
      text: String(
        values.motivo_consulta_cie10_texto ||
          `${values.motivo_consulta_cie10_clave} - ${values.motivo_consulta_cie10_nombre}`,
      ),
    };
  };

  const renderCie10Info = (item: Cie10Item | null, emptyText: string) => {
    if (!item) {
      return <div className="consulta-cie10-empty">{emptyText}</div>;
    }

    return (
      <div className="consulta-cie10-info">
        <div className="consulta-cie10-main">
          <Tag color="cyan">{item.catalogKey}</Tag>
          <strong>{item.nombre}</strong>
        </div>

        <p>{item.text}</p>
      </div>
    );
  };

  const calcularEdad = () => {
    if (!paciente.fecha_nacimiento) return '-';

    const nacimiento = new Date(paciente.fecha_nacimiento);
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

  const getUnidadAltura = (altura?: string | number) => {
    const alturaNum = normalizarNumero(altura);
    if (!alturaNum) return 'm/cm';
    return alturaNum > 3 ? 'cm' : 'm';
  };

  const calcularIMC = (peso?: string | number, altura?: string | number) => {
    const pesoNum = normalizarNumero(peso);
    const alturaMetros = normalizarAlturaMetros(altura);

    if (!pesoNum || !alturaMetros || pesoNum <= 0 || alturaMetros <= 0) return '';

    return (pesoNum / (alturaMetros * alturaMetros)).toFixed(2);
  };

  const getClasificacionIMC = (imc?: string) => {
    const value = Number(imc);

    if (!value) return 'Pendiente';
    if (value < 18.5) return 'Bajo peso';
    if (value < 25) return 'Normal';
    if (value < 30) return 'Sobrepeso';

    return 'Obesidad';
  };

  const toBoolean = (value: any) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;

    return String(value ?? '')
      .trim()
      .toUpperCase() === 'SI';
  };

  const toOptionalNumber = (value: any): number | undefined => {
    if (value === undefined || value === null || String(value).trim() === '') {
      return undefined;
    }

    const parsed = Number(String(value).replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const toOptionalText = (value: any): string | undefined => {
    const text = String(value ?? '').trim();
    return text || undefined;
  };

  const buildConsultaApiPayload = (values: any): ConsultaPayload => {
    const pacienteId = Number(paciente.id);

    if (!Number.isFinite(pacienteId) || pacienteId <= 0) {
      throw new Error(
        'El paciente seleccionado no tiene un ID válido para registrar la consulta en la API.',
      );
    }

    const imcCalculado = calcularIMC(values.peso, values.altura);

    const diagnosticosApi = diagnosticos
      .filter((item) => Number(item.cie10Id) > 0)
      .map((item) => ({
        diagnosticoId: Number(item.cie10Id),
        primeraVez: Boolean(item.primeraVez),
        subsecuente: Boolean(item.subsecuente),
        descripcion: toOptionalText(item.descripcion),
      }));

    if (diagnosticosApi.length === 0) {
      throw new Error('La consulta requiere al menos un diagnóstico CIE-10 válido.');
    }

    return {
      pacienteId,
      tipoConsulta: 'CONSULTA EXTERNA',
      primeraConsultaAnio: toBoolean(values.primer_consulta_anio),
      diabetes: toBoolean(values.diabetes),
      tomaGlucosa: toBoolean(values.toma_glucosa),
      medicionAyunas: toOptionalNumber(values.medicion_ayunas),
      tirasControl: toOptionalText(values.tiras_control),
      atencionPregestacional: toBoolean(values.atencion_pregestacional),
      motivoConsulta: toOptionalText(values.motivo_consulta_texto),
      descripcion: toOptionalText(values.descripcion_consulta),
      tratamientoActual: toOptionalText(values.tratamiento_actual),
      terapeuticaEmpleada: toOptionalText(values.terapeutica_empleada),
      contrarreferencia: toBoolean(values.contrarreferencia),
      estatus: 'ABIERTA',
      signosVitales: {
        peso: sinPeso ? undefined : toOptionalNumber(values.peso),
        altura: sinAltura
          ? undefined
          : (() => {
              const altura = normalizarAlturaMetros(values.altura);
              return altura > 0 ? altura : undefined;
            })(),
        imc: toOptionalNumber(values.imc || imcCalculado),
        temperatura: sinTemperatura
          ? undefined
          : toOptionalNumber(values.temperatura),
        presionArterial: toOptionalText(values.presion_arterial),
        frecuenciaCardiaca: toOptionalNumber(values.frecuencia_cardiaca),
        frecuenciaRespiratoria: toOptionalNumber(values.frecuencia_respiratoria),
        spo2: toOptionalNumber(values.spo2),
        cinturaAbdominal: toOptionalNumber(values.circunferencia_abdomen),
        motivoReferencia:
          values.referir_paciente === 'SI'
            ? toOptionalText(values.motivo_referencia)
            : undefined,
        descripcionReferencia:
          values.referir_paciente === 'SI'
            ? toOptionalText(values.descripcion_referencia)
            : undefined,
      },
      antecedente: {
        tuberculosisPulmonar: toBoolean(values.tuberculosis_pulmonar),
        observaciones: toOptionalText(values.tuberculosis_observaciones),
        infeccionTransmisionSexual: toBoolean(
          values.infeccion_transmision_sexual,
        ),
        patologiaMamariaBenigna: toBoolean(values.patologia_mamaria_benigna),
        terapiaHormonal: toBoolean(values.terapia_hormonal),
        periPostmenopausia: toBoolean(values.peri_postmenopausia),
        colposcopia: toBoolean(values.colposcopia),
      },
      diagnosticos: diagnosticosApi,
    };
  };

  const extractConsultaId = (data: any): number | null => {
    const rawId =
      data?.id ??
      data?.consultaId ??
      data?.consulta_id ??
      data?.consulta?.id ??
      null;

    const id = Number(rawId);
    return Number.isFinite(id) && id > 0 ? id : null;
  };

  const recuperarConsultaApiId = async (pacienteId: number): Promise<number | null> => {
    try {
      const page = await consultasService.findAll({
        page: 1,
        limit: 20,
        pacienteId,
      });

      const candidatas = page.data
        .map((item: any) => ({
          item,
          id: extractConsultaId(item),
        }))
        .filter((candidate) => candidate.id !== null)
        .sort((a, b) => Number(b.id) - Number(a.id));

      const abierta = candidatas.find(
        ({ item }) => String(item?.estatus ?? '').toUpperCase() === 'ABIERTA',
      );

      return abierta?.id ?? candidatas[0]?.id ?? null;
    } catch (error) {
      console.warn('No fue posible recuperar el ID de la consulta recién guardada:', error);
      return null;
    }
  };

  const getApiErrorMessage = (error: any): string => {
    const message = error?.response?.data?.message;

    if (Array.isArray(message)) {
      return message.filter(Boolean).join('\n');
    }

    if (typeof message === 'string' && message.trim()) {
      return message;
    }

    return (
      error?.message ||
      'No fue posible guardar la consulta en el servidor. Verifica los datos e inténtalo nuevamente.'
    );
  };

  const handleValuesChange = (_changedValues: any, values: any) => {
    const imc = calcularIMC(values.peso, values.altura);

    form.setFieldsValue({
      imc: imc || undefined,
    });

    setProgress((prev) => ({
      ...prev,
      validacion: Boolean(
        values.primer_consulta_anio ||
          values.diabetes ||
          values.atencion_pregestacional ||
          values.toma_glucosa ||
          values.medicion_ayunas ||
          values.tiras_control,
      ),
      signos: Boolean(
        (values.peso && values.altura) ||
          values.temperatura ||
          values.presion_arterial ||
          values.frecuencia_cardiaca ||
          values.frecuencia_respiratoria ||
          values.spo2 ||
          values.circunferencia_abdomen,
      ),
      antecedentes: Boolean(
        values.tuberculosis_pulmonar ||
          values.infeccion_transmision_sexual ||
          values.patologia_mamaria_benigna ||
          values.terapia_hormonal ||
          values.peri_postmenopausia ||
          values.colposcopia,
      ),
      diagnostico: diagnosticos.length > 0 || Boolean(values.motivo_consulta),
    }));

    guardarEstadoActual({
      ...values,
      imc: imc || undefined,
    });
  };

  const limpiarPeso = (checked: boolean) => {
    setSinPeso(checked);
    if (checked) {
      form.setFieldsValue({ peso: undefined, imc: undefined });
    }
  };

  const limpiarAltura = (checked: boolean) => {
    setSinAltura(checked);
    if (checked) {
      form.setFieldsValue({ altura: undefined, imc: undefined });
    }
  };

  const limpiarTemperatura = (checked: boolean) => {
    setSinTemperatura(checked);
    if (checked) {
      form.setFieldsValue({ temperatura: undefined });
    }
  };

  const agregarDiagnostico = () => {
    const seleccionado = cie10Seleccionado || buildCie10FromForm();
    const primeraVezValue = form.getFieldValue('primera_vez') ?? true;
    const descripcionDetalle =
      form.getFieldValue('descripcion_diagnostico_detalle') || '';

    if (!seleccionado) {
      Swal.fire({
        icon: 'warning',
        title: 'Diagnóstico requerido',
        text: 'Busca y selecciona un diagnóstico CIE-10 antes de agregarlo.',
        confirmButtonColor: '#36c6c7',
      });

      return;
    }

    const nuevo: DiagnosticoItem = {
      key: `${seleccionado.catalogKey}-${Date.now()}`,
      no: diagnosticos.length + 1,
      clave: seleccionado.catalogKey,
      diagnostico: seleccionado.nombre,
      primeraVez: primeraVezValue === true,
      subsecuente: primeraVezValue === false,
      descripcion: descripcionDetalle || seleccionado.text,
      cie10Id: seleccionado.id,
      cie10Text: seleccionado.text,
    };

    setDiagnosticos((prev) => [...prev, nuevo]);
    setDiagnosticoRequiredError(false);

    form.setFieldsValue({
      motivo_consulta: undefined,
      motivo_consulta_cie10_id: undefined,
      motivo_consulta_cie10_clave: '',
      motivo_consulta_cie10_nombre: '',
      motivo_consulta_cie10_texto: '',
      descripcion_diagnostico_detalle: undefined,
      primera_vez: true,
    });

    setCie10Seleccionado(null);

    setProgress((prev) => ({
      ...prev,
      diagnostico: true,
    }));
  };

  const eliminarDiagnostico = (key: string) => {
    setDiagnosticos((prev) =>
      prev
        .filter((item) => item.key !== key)
        .map((item, index) => ({
          ...item,
          no: index + 1,
        })),
    );
  };

  const columnasDiagnostico: ColumnsType<DiagnosticoItem> = [
    {
      title: 'No.',
      dataIndex: 'no',
      key: 'no',
      width: 48,
      align: 'center',
    },
    {
      title: 'Clave',
      dataIndex: 'clave',
      key: 'clave',
      width: 74,
      align: 'center',
      render: (value: string) => <Tag className="consulta-code-tag">{value}</Tag>,
    },
    {
      title: 'Diagnóstico',
      dataIndex: 'diagnostico',
      key: 'diagnostico',
      render: (value: string) => <span className="consulta-table-strong">{value}</span>,
    },
    {
      title: 'Tipo',
      key: 'tipo',
      width: 112,
      align: 'center',
      render: (_, record) => (
        <Tag
          className={
            record.primeraVez
              ? 'consulta-type-tag primera'
              : 'consulta-type-tag subsecuente'
          }
        >
          {record.primeraVez ? 'Primera vez' : 'Subsecuente'}
        </Tag>
      ),
    },
    {
      title: 'Descripción',
      dataIndex: 'descripcion',
      key: 'descripcion',
      width: 160,
      render: (value: string) => (
        <span className="consulta-table-description">{value || '-'}</span>
      ),
    },
    {
      title: '',
      key: 'acciones',
      width: 44,
      align: 'center',
      render: (_, record) => (
        <Button
          danger
          type="text"
          icon={<DeleteOutlined />}
          onClick={() => eliminarDiagnostico(record.key)}
        />
      ),
    },
  ];

  const columnasVistaPrevia: ColumnsType<DiagnosticoItem> =
    columnasDiagnostico.filter((col) => col.key !== 'acciones');

  const nextStep = async () => {
    if (currentStep === 2) {
      try {
        await form.validateFields(['motivo_consulta_texto']);

        const motivoConsulta = toOptionalText(
          form.getFieldValue('motivo_consulta_texto'),
        );

        if (!motivoConsulta) {
          form.setFields([
            {
              name: 'motivo_consulta_texto',
              errors: ['Captura el motivo de la consulta.'],
            },
          ]);
          return;
        }

        if (diagnosticos.length === 0) {
          setDiagnosticoRequiredError(true);
          await Swal.fire({
            icon: 'warning',
            title: 'Diagnóstico requerido',
            text: 'Agrega al menos un diagnóstico CIE-10 antes de continuar.',
            confirmButtonColor: '#36c6c7',
          });
          return;
        }
      } catch {
        return;
      }
    }

    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const abrirVistaPrevia = () => {
    const values = form.getFieldsValue(true);
    const imcCalculado = calcularIMC(values.peso, values.altura);

    const valuesConIMC = {
      ...values,
      imc: values.imc || imcCalculado || undefined,
    };

    form.setFieldsValue({
      imc: valuesConIMC.imc,
    });

    setPreviewValues(valuesConIMC);
    setPreviewOpen(true);
  };

  const guardarHistorialClinico = (payload: any, apiId: number | null) => {
    const HISTORIAL_CLINICO_STORAGE_KEY = 'historial_clinico_pacientes';

    try {
      const data = localStorage.getItem(HISTORIAL_CLINICO_STORAGE_KEY);
      const historiales = data ? JSON.parse(data) : [];

      const nuevoHistorial = {
        id: apiId
          ? `consulta-api-${apiId}`
          : `${paciente.id || paciente.numero_expediente || Date.now()}-${Date.now()}`,
        consulta_api_id: apiId,
        pacienteId: paciente.id,
        paciente: {
          id: paciente.id,
          nombre: nombreCompleto,
          numero_expediente: paciente.numero_expediente,
          curp: paciente.curp,
          sexo: paciente.sexo,
          fecha_nacimiento: paciente.fecha_nacimiento,
        },
        consulta: payload,
        diagnosticos,
        fecha_consulta: payload.fecha_consulta,
      };

      const historialesActualizados = apiId
        ? [
            nuevoHistorial,
            ...historiales.filter(
              (item: any) => Number(item?.consulta_api_id) !== Number(apiId),
            ),
          ]
        : [nuevoHistorial, ...historiales];

      localStorage.setItem(
        HISTORIAL_CLINICO_STORAGE_KEY,
        JSON.stringify(historialesActualizados),
      );
    } catch {
      // Evita romper la pantalla si localStorage falla.
    }
  };

  const handleGuardar = async () => {
    if (guardandoConsulta) return;

    try {
      setGuardandoConsulta(true);

      // validateFields() en un formulario por pasos puede devolver únicamente
      // los campos que siguen montados en la pantalla actual. Primero validamos
      // lo que esté registrado y después recuperamos TODO el store preservado
      // del Form para incluir los valores capturados en pasos anteriores.
      await form.validateFields();
      const values = form.getFieldsValue(true);

      if (!toOptionalText(values.motivo_consulta_texto)) {
        setCurrentStep(2);
        form.setFields([
          {
            name: 'motivo_consulta_texto',
            errors: ['Captura el motivo de la consulta.'],
          },
        ]);

        await Swal.fire({
          icon: 'warning',
          title: 'Motivo de consulta requerido',
          text: 'Captura el motivo de la consulta antes de guardarla.',
          confirmButtonColor: '#36c6c7',
        });
        return;
      }

      if (diagnosticos.length === 0 || !diagnosticos.some((item) => Number(item.cie10Id) > 0)) {
        setCurrentStep(2);
        setDiagnosticoRequiredError(true);
        await Swal.fire({
          icon: 'warning',
          title: 'Diagnóstico requerido',
          text: 'La consulta debe tener al menos un diagnóstico CIE-10 agregado.',
          confirmButtonColor: '#36c6c7',
        });
        return;
      }

      const imcCalculado = calcularIMC(values.peso, values.altura);
      const apiPayload = buildConsultaApiPayload(values);

      let targetApiId = consultaApiId;

      if (!targetApiId && consultaGuardada?.guardadoEnApi) {
        targetApiId = await recuperarConsultaApiId(apiPayload.pacienteId);
      }

      const responseData = targetApiId
        ? await consultasService.update(targetApiId, apiPayload)
        : await consultasService.create(apiPayload);

      let idDesdeApi = extractConsultaId(responseData);

      if (!targetApiId && !idDesdeApi) {
        idDesdeApi = await recuperarConsultaApiId(apiPayload.pacienteId);
      }

      const idConsulta = targetApiId ?? idDesdeApi;

      if (idConsulta && idConsulta !== consultaApiId) {
        setConsultaApiId(idConsulta);
      }

      const payloadLocal = {
        ...values,
        imc: values.imc || imcCalculado || undefined,
        diagnosticos,
        fecha_consulta: new Date().toISOString(),
        consultaApiId: idConsulta,
        guardadoEnApi: true,
        apiPayload,
      };

      // La API es la fuente principal. Este espejo local se conserva únicamente
      // para no romper las pantallas de histórico que todavía leen localStorage.
      guardarHistorialClinico(payloadLocal, idConsulta);

      setProgress((prev) => ({
        ...prev,
        guardado: true,
      }));

      setConsultaGuardada(payloadLocal);
      setPreviewOpen(false);

      const nextProgress = {
        ...progress,
        guardado: true,
      };

      guardarEstadoConsulta(storageKey, {
        currentStep: 3,
        sinPeso,
        sinAltura,
        sinTemperatura,
        diagnosticos,
        mostrarReceta: false,
        consultaGuardada: payloadLocal,
        consultaApiId: idConsulta,
        progress: nextProgress,
        formValues: {
          ...values,
          imc: payloadLocal.imc,
        },
      });

      console.log(
        targetApiId ? 'Consulta externa actualizada:' : 'Consulta externa creada:',
        responseData,
      );

      const result = await Swal.fire({
        icon: 'success',
        title: targetApiId ? 'Consulta actualizada' : 'Consulta guardada',
        text: idConsulta
          ? `La información clínica se guardó correctamente en el servidor. Consulta #${idConsulta}.`
          : 'La información clínica se guardó correctamente en el servidor.',
        showCancelButton: true,
        confirmButtonText: 'Continuar a receta',
        cancelButtonText: 'Seguir editando',
        confirmButtonColor: '#ff4d4f',
        cancelButtonColor: '#94a3b8',
        reverseButtons: true,
        customClass: {
          popup: 'consulta-save-swal',
        },
      });

      if (result.isConfirmed) {
        setMostrarReceta(true);

        guardarEstadoConsulta(storageKey, {
          currentStep: 3,
          sinPeso,
          sinAltura,
          sinTemperatura,
          diagnosticos,
          mostrarReceta: true,
          consultaGuardada: payloadLocal,
          consultaApiId: idConsulta,
          progress: nextProgress,
          formValues: {
            ...values,
            imc: payloadLocal.imc,
          },
        });
      }
    } catch (error: any) {
      if (error?.errorFields) {
        return;
      }

      console.error('Error guardando consulta externa en API:', error);

      await Swal.fire({
        icon: 'error',
        title: 'No se pudo guardar la consulta',
        text: getApiErrorMessage(error),
        confirmButtonText: 'Revisar',
        confirmButtonColor: '#36c6c7',
      });
    } finally {
      setGuardandoConsulta(false);
    }
  };

  const DiagnosticoCards = ({ preview = false }: { preview?: boolean }) => (
    <div className={preview ? 'consulta-mobile-cards preview' : 'consulta-mobile-cards'}>
      {diagnosticos.length === 0 ? (
        <Empty description="Sin diagnósticos agregados" />
      ) : (
        diagnosticos.map((item) => (
          <article className="consulta-diagnostico-card-mobile" key={item.key}>
            <div className="consulta-diagnostico-card-head">
              <div>
                <span>#{item.no}</span>
                <strong>{item.clave}</strong>
              </div>

              {!preview && (
                <Button
                  danger
                  type="text"
                  icon={<DeleteOutlined />}
                  onClick={() => eliminarDiagnostico(item.key)}
                />
              )}
            </div>

            <h4>{item.diagnostico}</h4>

            <div className="consulta-diagnostico-card-grid">
              <div>
                <span>Primera vez</span>
                <strong>{item.primeraVez ? 'Sí' : 'No'}</strong>
              </div>

              <div>
                <span>Subsecuente</span>
                <strong>{item.subsecuente ? 'Sí' : 'No'}</strong>
              </div>
            </div>

            <p>
              <span>Descripción:</span> {item.descripcion || 'Sin descripción'}
            </p>
          </article>
        ))
      )}
    </div>
  );

  if (mostrarReceta) {
    return (
      <Receta
        paciente={paciente}
        consulta={consultaGuardada}
        diagnosticos={diagnosticos}
        onBack={() => {
          setMostrarReceta(false);
          setCurrentStep(3);

          guardarEstadoConsulta(storageKey, {
            currentStep: 3,
            sinPeso,
            sinAltura,
            sinTemperatura,
            diagnosticos,
            mostrarReceta: false,
            consultaGuardada,
            consultaApiId,
            progress,
            formValues: form.getFieldsValue(true),
          });
        }}
        onPacienteLiberado={onPacienteLiberado}
      />
    );
  }

  return (
    <div className="consulta-page">
      <div className="consulta-shell">
        <aside className="consulta-patient-panel">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handleBackPacientes}
            className="consulta-back-btn"
          >
            Volver a pacientes
          </Button>

          <div className="consulta-patient-card">
            <div className="consulta-patient-glow" />

            <Avatar size={78} className="consulta-avatar" icon={!iniciales && <UserOutlined />}>
              {iniciales}
            </Avatar>

            <Title level={4}>{nombreCompleto || 'Paciente sin nombre'}</Title>

            <Text type="secondary">Exp. {paciente.numero_expediente || 'Sin expediente'}</Text>

            <div className="consulta-patient-tags">
              <Tag>{paciente.sexo || 'Sin sexo'}</Tag>
              <Tag>{paciente.tipo_sangre || 'Sin tipo sangre'}</Tag>
            </div>
          </div>

          <div className="consulta-patient-data">
            <div>
              <span>Edad</span>
              <strong>{calcularEdad()}</strong>
            </div>

            <div>
              <span>Nacimiento</span>
              <strong>{paciente.fecha_nacimiento?.split('T')[0] || '-'}</strong>
            </div>

            <div>
              <span>CURP</span>
              <strong>{paciente.curp || '-'}</strong>
            </div>

            <div>
              <span>Origen</span>
              <strong>{paciente.lugar_origen || '-'}</strong>
            </div>
          </div>

          <div className="consulta-date-card">
            <div className="consulta-date-icon">
              <CalendarOutlined />
            </div>

            <div>
              <span>Fecha de elaboración</span>
              <strong>{new Date().toLocaleString('es-MX')}</strong>
            </div>
          </div>

          <div className="consulta-side-status">
            <div>
              <CheckCircleOutlined />
              <span>Expediente activo</span>
            </div>

            <div>
              <SafetyCertificateOutlined />
              <span>Captura segura</span>
            </div>
          </div>

          <Button
            icon={<CheckCircleOutlined />}
            className="consulta-liberar-paciente-btn"
            onClick={liberarPaciente}
            block
          >
            Finalizar atención
          </Button>
        </aside>

        <main className="consulta-main">
          <div className="consulta-header">
            <div className="consulta-header-left">
              <div className="consulta-header-icon">
                <FileTextOutlined />
              </div>

              <div>
                <Text className="consulta-eyebrow">Atención médica</Text>
                <Title level={2}>Consulta externa</Title>
                <Text type="secondary">
                  Captura validación, signos vitales, antecedentes, diagnóstico y referencia.
                </Text>
              </div>
            </div>

            <div className="consulta-service">
              <span>Servicio de atención</span>

              <Select
                defaultValue="CONSULTA EXTERNA"
                options={[
                  { value: 'CONSULTA EXTERNA', label: 'Consulta externa' },
                  { value: 'URGENCIAS', label: 'Urgencias' },
                  { value: 'CONTROL', label: 'Control' },
                ]}
              />
            </div>
          </div>

          <div className="consulta-progress consulta-progress-five">
            <div className={progress.validacion || currentStep >= 0 ? 'active completed' : ''}>
              <ExperimentOutlined />
              <span>Validación</span>
            </div>

            <div className={progress.signos || currentStep >= 0 ? 'active completed' : ''}>
              <HeartOutlined />
              <span>Signos vitales</span>
            </div>

            <div className={progress.antecedentes || currentStep >= 1 ? 'active completed' : ''}>
              <HistoryOutlined />
              <span>Antecedentes</span>
            </div>

            <div className={progress.diagnostico || currentStep >= 2 ? 'active completed' : ''}>
              <MedicineBoxOutlined />
              <span>Diagnóstico</span>
            </div>

            <div className={progress.guardado || currentStep >= 3 ? 'active completed' : ''}>
              <SaveOutlined />
              <span>Guardado</span>
            </div>
          </div>

          <Form
            form={form}
            layout="vertical"
            onValuesChange={handleValuesChange}
            initialValues={{
              primera_vez: true,
              referir_paciente: 'NO',
              contrarreferencia: 'NO',
            }}
          >
            <Form.Item name="motivo_consulta_cie10_id" hidden>
              <Input />
            </Form.Item>

            <Form.Item name="motivo_consulta_cie10_clave" hidden>
              <Input />
            </Form.Item>

            <Form.Item name="motivo_consulta_cie10_nombre" hidden>
              <Input />
            </Form.Item>

            <Form.Item name="motivo_consulta_cie10_texto" hidden>
              <Input />
            </Form.Item>

            {currentStep === 0 && (
              <section className="consulta-section consulta-step-section">
                <div className="consulta-section-title">
                  <div>
                    <ThunderboltOutlined />
                    <h3>Valoración inicial</h3>
                  </div>

                  <span>Validación y signos vitales</span>
                </div>

                <div className="consulta-subsection">
                  <div className="consulta-subsection-title">
                    <ExperimentOutlined />
                    <strong>Validación del paciente</strong>
                  </div>

                  <Row gutter={[16, 10]}>
                    <Col xs={24} md={8}>
                      <Form.Item
                        name="primer_consulta_anio"
                        label="Primera consulta del año"
                        rules={[
                          {
                            required: true,
                            message: 'Confirma si es la primera consulta del año',
                          },
                        ]}
                        extra={
                          <span className="consulta-history-hint">
                            {historialPaciente.loading
                              ? 'Revisando historial del paciente…'
                              : historialPaciente.error
                                ? historialPaciente.error
                                : historialPaciente.totalPrevias === 0
                                  ? 'Paciente nuevo · sin consultas previas.'
                                  : historialPaciente.yaAtendidoEsteAnio === null
                                    ? 'No fue posible determinarlo con certeza.'
                                    : historialPaciente.yaAtendidoEsteAnio
                                      ? `Última consulta: ${historialPaciente.ultimaConsulta || 'registrada'} · ya fue atendido este año.`
                                      : `Última consulta: ${historialPaciente.ultimaConsulta || 'registrada'} · primera visita de ${new Date().getFullYear()}.`}
                          </span>
                        }
                      >
                        <Select
                          className={
                            !historialPaciente.loading &&
                            !historialPaciente.error &&
                            historialPaciente.yaAtendidoEsteAnio !== null
                              ? 'consulta-auto-select'
                              : undefined
                          }
                          placeholder={historialPaciente.loading ? 'Validando…' : 'Seleccionar'}
                          loading={historialPaciente.loading}
                          disabled={
                            historialPaciente.loading ||
                            (!historialPaciente.error &&
                              historialPaciente.yaAtendidoEsteAnio !== null)
                          }
                          options={[
                            { value: 'SI', label: 'Sí' },
                            { value: 'NO', label: 'No' },
                          ]}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={8}>
                      <Form.Item name="diabetes" label="Diabetes" initialValue="NO">
                        <Select
                          options={[
                            { value: 'SI', label: 'Sí' },
                            { value: 'NO', label: 'No' },
                          ]}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={8}>
                      <Form.Item name="atencion_pregestacional" label="Atención pregestacional">
                        <Select
                          placeholder="Seleccionar"
                          options={[
                            { value: 'SI', label: 'Sí' },
                            { value: 'NO', label: 'No' },
                          ]}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={8}>
                      <Form.Item name="toma_glucosa" label="Toma glucosa" initialValue="NO">
                        <Select
                          options={[
                            { value: 'SI', label: 'Sí' },
                            { value: 'NO', label: 'No' },
                          ]}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={8}>
                      <Form.Item name="medicion_ayunas" label="Medición en ayunas">
                        <Input addonAfter="mg/dl" placeholder="Ej. 95" />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={8}>
                      <Form.Item name="tiras_control" label="Tiras de control">
                        <Input placeholder="Cantidad o referencia" />
                      </Form.Item>
                    </Col>
                  </Row>
                </div>

                <div className="consulta-subsection">
                  <div className="consulta-subsection-title">
                    <HeartOutlined />
                    <strong>Signos vitales</strong>
                  </div>

                  <Text className="consulta-help-text">
                    En altura puedes escribir metros o centímetros. Ejemplo: 1.70 o 170.
                  </Text>

                  <div className="consulta-vitals-grid">
                    <div className="consulta-vital-card">
                      <div className="consulta-vital-card-header">
                        <strong>Peso</strong>
                        <Checkbox
                          className="consulta-vital-checkbox"
                          checked={sinPeso}
                          onChange={(e) => limpiarPeso(e.target.checked)}
                        >
                          Sin toma
                        </Checkbox>
                      </div>

                      <Form.Item name="peso" className="consulta-vital-form-item">
                        <Input disabled={sinPeso} addonAfter="kg" placeholder="Ej. 70" />
                      </Form.Item>
                    </div>

                    <div className="consulta-vital-card">
                      <div className="consulta-vital-card-header">
                        <strong>Altura</strong>
                        <Checkbox
                          className="consulta-vital-checkbox"
                          checked={sinAltura}
                          onChange={(e) => limpiarAltura(e.target.checked)}
                        >
                          Sin toma
                        </Checkbox>
                      </div>

                      <Form.Item name="altura" className="consulta-vital-form-item">
                        <Input
                          disabled={sinAltura}
                          addonAfter={getUnidadAltura(alturaActual)}
                          placeholder="Ej. 1.70 o 170"
                        />
                      </Form.Item>
                    </div>

                    <div className="consulta-vital-card">
                      <div className="consulta-vital-card-header">
                        <strong>Temperatura</strong>
                        <Checkbox
                          className="consulta-vital-checkbox"
                          checked={sinTemperatura}
                          onChange={(e) => limpiarTemperatura(e.target.checked)}
                        >
                          Sin toma
                        </Checkbox>
                      </div>

                      <Form.Item name="temperatura" className="consulta-vital-form-item">
                        <Input
                          disabled={sinTemperatura}
                          addonAfter="°C"
                          placeholder="Ej. 36.5"
                        />
                      </Form.Item>
                    </div>

                    <div className="consulta-vital-card consulta-imc-card">
                      <div className="consulta-vital-card-header consulta-vital-card-header-imc">
                        <div className="consulta-imc-title-wrap">
                          <strong>IMC</strong>
                          <Tag className="consulta-imc-tag" color={imcActual ? 'cyan' : 'default'}>
                            Automático
                          </Tag>
                        </div>
                        <span className="consulta-imc-caption">Se calcula con peso y altura</span>
                      </div>

                      <Form.Item name="imc" className="consulta-vital-form-item consulta-imc-input">
                        <Input disabled addonAfter="kg/m²" placeholder="Se calcula solo" />
                      </Form.Item>

                      <div className="consulta-imc-result">
                        <span>Clasificación</span>
                        <strong>{getClasificacionIMC(imcActual)}</strong>
                      </div>
                    </div>
                  </div>

                  <Row gutter={[16, 10]} className="consulta-extra-vitals">
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
                </div>

                <div className="consulta-step-actions">
                  <Button type="primary" className="consulta-save-btn" onClick={nextStep}>
                    Siguiente
                  </Button>
                </div>
              </section>
            )}

            {currentStep === 1 && (
              <section className="consulta-section consulta-step-section">
                <div className="consulta-section-title">
                  <div>
                    <HistoryOutlined />
                    <h3>Antecedentes</h3>
                  </div>

                  <span>Antecedentes generales y gineco obstétricos</span>
                </div>

                <div className="consulta-subsection consulta-antecedentes-card">
                  <div className="consulta-subsection-title">
                    <HistoryOutlined />
                    <strong>Antecedentes</strong>
                  </div>

                  <Row gutter={[16, 10]} align="middle">
                    <Col xs={24} md={8}>
                      <Form.Item
                        name="tuberculosis_pulmonar"
                        label="Tuberculosis pulmonar"
                        initialValue="SE DESCONOCE"
                      >
                        <Select options={opcionesSiNoDesconoce} />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={16}>
                      <Form.Item name="tuberculosis_observaciones" label="Observaciones">
                        <Input placeholder="Describe observaciones o notas clínicas" />
                      </Form.Item>
                    </Col>
                  </Row>
                </div>

                <div className="consulta-subsection consulta-gineco-card">
                  <div className="consulta-subsection-title">
                    <WomanOutlined />
                    <strong>Antecedentes gineco obstétricos</strong>
                  </div>

                  <Row gutter={[16, 10]}>
                    <Col xs={24} md={8}>
                      <Form.Item
                        name="infeccion_transmision_sexual"
                        label="Infección de transmisión sexual"
                        initialValue="NO APLICA"
                      >
                        <Select options={opcionesGineco} />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={8}>
                      <Form.Item
                        name="patologia_mamaria_benigna"
                        label="Patología mamaria benigna"
                        initialValue="NO APLICA"
                      >
                        <Select options={opcionesGineco} />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={8}>
                      <Form.Item
                        name="terapia_hormonal"
                        label="Terapia hormonal"
                        initialValue="NO APLICA"
                      >
                        <Select options={opcionesGineco} />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={8}>
                      <Form.Item
                        name="peri_postmenopausia"
                        label="Peri postmenopausia"
                        initialValue="NO APLICA"
                      >
                        <Select options={opcionesGineco} />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={8}>
                      <Form.Item name="colposcopia" label="Colposcopía" initialValue="NO APLICA">
                        <Select options={opcionesGineco} />
                      </Form.Item>
                    </Col>
                  </Row>
                </div>

                <div className="consulta-step-actions">
                  <Button onClick={prevStep}>Anterior</Button>
                  <Button type="primary" className="consulta-save-btn" onClick={nextStep}>
                    Siguiente
                  </Button>
                </div>
              </section>
            )}

            {currentStep === 2 && (
              <section className="consulta-section consulta-step-section">
                <div className="consulta-section-title">
                  <div>
                    <MedicineBoxOutlined />
                    <h3>Descripción diagnóstico</h3>
                  </div>

                  <span>Motivo de consulta, diagnóstico y referencia</span>
                </div>

                <div className="consulta-subsection">
                  <div className="consulta-subsection-title">
                    <FileTextOutlined />
                    <strong>Información de la consulta</strong>
                  </div>

                  <Row gutter={[16, 10]}>
                    <Col xs={24}>
                      <Form.Item
                        name="motivo_consulta_texto"
                        label="Motivo de consulta"
                        rules={[
                          {
                            required: true,
                            message: 'Captura el motivo de la consulta.',
                          },
                        ]}
                      >
                        <Input placeholder="Ej. Dolor ocular" />
                      </Form.Item>
                    </Col>

                    <Col xs={24}>
                      <Form.Item name="descripcion_consulta" label="Descripción clínica">
                        <Input.TextArea
                          rows={3}
                          placeholder="Ej. Paciente refiere molestia desde hace 3 días"
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item name="tratamiento_actual" label="Tratamiento actual">
                        <Input.TextArea
                          rows={3}
                          placeholder="Tratamiento que utiliza actualmente el paciente"
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item name="terapeutica_empleada" label="Terapéutica empleada">
                        <Input.TextArea
                          rows={3}
                          placeholder="Describe la terapéutica empleada durante la consulta"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </div>

                <div className="consulta-diagnostico-box">
                  <Row gutter={[16, 12]} align="bottom">
                    <Col xs={24} lg={12}>
                      <Form.Item
                        name="motivo_consulta"
                        label="Diagnóstico CIE-10"
                        required
                        validateStatus={diagnosticoRequiredError ? 'error' : undefined}
                        help={
                          diagnosticoRequiredError
                            ? 'Agrega al menos un diagnóstico CIE-10 a la consulta.'
                            : 'Desliza la lista para cargar más resultados.'
                        }
                      >
                        <Select
                          showSearch
                          allowClear
                          filterOption={false}
                          placeholder="Buscar diagnóstico por clave o nombre..."
                          options={getCie10Options()}
                          onOpenChange={handleOpenCie10}
                          onSearch={handleSearchCie10}
                          onSelect={(value) => handleSelectCie10(String(value))}
                          onClear={handleClearCie10}
                          onPopupScroll={handleCie10PopupScroll}
                          listHeight={340}
                          optionRender={(option) => {
                            const item = cie10Options.find(
                              (row) => String(row.catalogKey) === String(option.value),
                            );
                            return item ? (
                              <div className="consulta-cie10-option">
                                <span className="consulta-cie10-option-code">{item.catalogKey}</span>
                                <span className="consulta-cie10-option-name">{item.nombre}</span>
                              </div>
                            ) : (
                              option.label
                            );
                          }}
                          notFoundContent={
                            cie10Loading ? (
                              <div className="consulta-cie10-loading"><Spin size="small" /> Consultando CIE-10...</div>
                            ) : (
                              'No se encontraron resultados'
                            )
                          }
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} lg={12}>
                      {renderCie10Info(
                        cie10Seleccionado,
                        'Abre el catálogo o busca un diagnóstico CIE-10 para seleccionarlo.',
                      )}
                    </Col>

                    <Col xs={24} lg={20}>
                      <Form.Item
                        name="descripcion_diagnostico_detalle"
                        label="Descripción clínica"
                      >
                        <Input.TextArea
                          rows={3}
                          placeholder="Escribe aquí la descripción clínica del diagnóstico, observaciones o detalle complementario."
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} lg={4}>
                      <Form.Item label=" ">
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          className="consulta-add-btn"
                          onClick={agregarDiagnostico}
                          block
                        >
                          Agregar
                        </Button>
                      </Form.Item>
                    </Col>

                    <Col xs={24}>
                      <Form.Item name="primera_vez" label="Primera vez">
                        <Radio.Group>
                          <Radio value={true}>Sí</Radio>
                          <Radio value={false}>No</Radio>
                        </Radio.Group>
                      </Form.Item>
                    </Col>
                  </Row>

                  <Table
                    className="consulta-diagnostico-table consulta-desktop-table"
                    columns={columnasDiagnostico}
                    dataSource={diagnosticos}
                    rowKey="key"
                    pagination={false}
                    size="middle"
                    tableLayout="auto"
                    locale={{
                      emptyText: 'Sin diagnósticos agregados',
                    }}
                  />

                  <DiagnosticoCards />
                </div>

                <div className="consulta-subsection consulta-referencia-card">
                  <div className="consulta-subsection-title consulta-left-title">
                    <ShareAltOutlined />
                    <strong>Referencia</strong>
                  </div>

                  <Row gutter={[16, 10]}>
                    <Col xs={24} md={6}>
                      <Form.Item name="referir_paciente" label="Referir paciente">
                        <Select
                          options={[
                            { value: 'SI', label: 'Sí' },
                            { value: 'NO', label: 'No' },
                          ]}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={18}>
                      <Form.Item name="motivo_referencia" label="Motivo de referencia">
                        <Input
                          disabled={referirPaciente !== 'SI'}
                          placeholder="Ej. Referencia por dolor persistente"
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={6}>
                      <Form.Item name="contrarreferencia" label="Contrarreferencia">
                        <Select
                          disabled={referirPaciente !== 'SI'}
                          options={[
                            { value: 'SI', label: 'Sí' },
                            { value: 'NO', label: 'No' },
                          ]}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={18}>
                      <Form.Item
                        name="descripcion_referencia"
                        label="Descripción de referencia"
                      >
                        <Input
                          disabled={referirPaciente !== 'SI'}
                          placeholder="Describe la referencia o valoración sugerida"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </div>

                <div className="consulta-step-actions">
                  <Button onClick={prevStep}>Anterior</Button>
                  <Button type="primary" className="consulta-save-btn" onClick={nextStep}>
                    Siguiente
                  </Button>
                </div>
              </section>
            )}

            {currentStep === 3 && (
              <section className="consulta-section consulta-step-section consulta-save-section">
                <div className="consulta-section-title">
                  <div>
                    <SaveOutlined />
                    <h3>Guardar consulta</h3>
                  </div>

                  <span>Revisión final</span>
                </div>

                <div className="consulta-final-card">
                  <CheckCircleOutlined />
                  <h3>Consulta lista para guardar</h3>
                  <p>
                    Revisa la información capturada. Puedes regresar para corregir datos antes de
                    guardar la consulta.
                  </p>
                </div>

                <Divider />

                <div className="consulta-step-actions">
                  <Button onClick={prevStep}>Anterior</Button>

                  <Button icon={<EyeOutlined />} onClick={abrirVistaPrevia}>
                    Vista previa
                  </Button>

                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    className="consulta-save-btn"
                    onClick={handleGuardar}
                    loading={guardandoConsulta}
                    disabled={guardandoConsulta}
                  >
                    {consultaApiId ? 'Actualizar consulta' : 'Guardar consulta'}
                  </Button>
                </div>
              </section>
            )}
          </Form>
        </main>
      </div>

      <Modal
        className="consulta-preview-modal"
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={[
          <Button key="cerrar" onClick={() => setPreviewOpen(false)}>
            Cerrar
          </Button>,
          <Button
            key="guardar"
            type="primary"
            icon={<SaveOutlined />}
            className="consulta-save-btn"
            onClick={handleGuardar}
            loading={guardandoConsulta}
            disabled={guardandoConsulta}
          >
            {consultaApiId ? 'Actualizar consulta' : 'Guardar consulta'}
          </Button>,
        ]}
        width={980}
        title={
          <div className="consulta-preview-title">
            <FileTextOutlined />
            <span>Vista previa de consulta externa</span>
          </div>
        }
      >
        <div className="consulta-preview">
          <Descriptions bordered column={{ xs: 1, sm: 1, md: 2 }} size="small">
            <Descriptions.Item label="Paciente">{nombreCompleto || '-'}</Descriptions.Item>

            <Descriptions.Item label="Expediente">
              {paciente.numero_expediente || '-'}
            </Descriptions.Item>

            <Descriptions.Item label="Edad">{calcularEdad()}</Descriptions.Item>

            <Descriptions.Item label="Fecha">
              {new Date().toLocaleString('es-MX')}
            </Descriptions.Item>
          </Descriptions>

          <div className="consulta-preview-section-title">Signos vitales</div>

          <Descriptions bordered column={{ xs: 1, sm: 1, md: 3 }} size="small">
            <Descriptions.Item label="Peso">
              {sinPeso ? 'No tomado' : previewValues.peso ? `${previewValues.peso} kg` : '-'}
            </Descriptions.Item>

            <Descriptions.Item label="Altura">
              {sinAltura
                ? 'No tomada'
                : previewValues.altura
                  ? `${previewValues.altura} ${getUnidadAltura(previewValues.altura)}`
                  : '-'}
            </Descriptions.Item>

            <Descriptions.Item label="IMC">{previewValues.imc || '-'}</Descriptions.Item>

            <Descriptions.Item label="Temperatura">
              {sinTemperatura
                ? 'No tomada'
                : previewValues.temperatura
                  ? `${previewValues.temperatura} °C`
                  : '-'}
            </Descriptions.Item>

            <Descriptions.Item label="T.A.">
              {previewValues.presion_arterial || '-'}
            </Descriptions.Item>

            <Descriptions.Item label="SpO₂">
              {previewValues.spo2 ? `${previewValues.spo2}%` : '-'}
            </Descriptions.Item>
          </Descriptions>

          <div className="consulta-preview-section-title">Antecedentes</div>

          <Descriptions bordered column={{ xs: 1, sm: 1, md: 2 }} size="small">
            <Descriptions.Item label="Tuberculosis pulmonar">
              {previewValues.tuberculosis_pulmonar || '-'}
            </Descriptions.Item>

            <Descriptions.Item label="Observaciones">
              {previewValues.tuberculosis_observaciones || '-'}
            </Descriptions.Item>

            <Descriptions.Item label="ITS">
              {previewValues.infeccion_transmision_sexual || '-'}
            </Descriptions.Item>

            <Descriptions.Item label="Colposcopía">
              {previewValues.colposcopia || '-'}
            </Descriptions.Item>
          </Descriptions>

          <div className="consulta-preview-section-title">Consulta</div>

          <Descriptions bordered column={{ xs: 1, sm: 1, md: 2 }} size="small">
            <Descriptions.Item label="Motivo de consulta" span={2}>
              {previewValues.motivo_consulta_texto || '-'}
            </Descriptions.Item>

            <Descriptions.Item label="Descripción" span={2}>
              {previewValues.descripcion_consulta || '-'}
            </Descriptions.Item>

            <Descriptions.Item label="Tratamiento actual">
              {previewValues.tratamiento_actual || '-'}
            </Descriptions.Item>

            <Descriptions.Item label="Terapéutica empleada">
              {previewValues.terapeutica_empleada || '-'}
            </Descriptions.Item>
          </Descriptions>

          <div className="consulta-preview-section-title">Diagnóstico</div>

          <Table
            columns={columnasVistaPrevia}
            dataSource={diagnosticos}
            rowKey="key"
            pagination={false}
            size="small"
            tableLayout="auto"
            className="consulta-preview-table consulta-desktop-table"
            locale={{ emptyText: 'Sin diagnósticos agregados' }}
          />

          <DiagnosticoCards preview />

          <div className="consulta-preview-section-title">Referencia</div>

          <Descriptions bordered column={{ xs: 1, sm: 1, md: 2 }} size="small">
            <Descriptions.Item label="Referir paciente">
              {previewValues.referir_paciente || '-'}
            </Descriptions.Item>

            <Descriptions.Item label="Motivo de referencia">
              {previewValues.motivo_referencia || '-'}
            </Descriptions.Item>

            <Descriptions.Item label="Contrarreferencia">
              {previewValues.contrarreferencia || '-'}
            </Descriptions.Item>

            <Descriptions.Item label="Descripción de referencia">
              {previewValues.descripcion_referencia || '-'}
            </Descriptions.Item>
          </Descriptions>
        </div>
      </Modal>
    </div>
  );
};

export default ConsultaExterna;