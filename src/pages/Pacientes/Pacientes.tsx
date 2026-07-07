import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  AutoComplete,
  Button,
  Card,
  Col,
  DatePicker,
  Dropdown,
  Empty,
  Form,
  Input,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Typography,
  Tooltip,
  App,
  Pagination,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  UserOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  HistoryOutlined,
  ReloadOutlined,
  SyncOutlined,
  CalendarOutlined,
  IdcardOutlined,
  HomeOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CloseOutlined,
  MedicineBoxOutlined,
  MoreOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import Swal from 'sweetalert2';

import PacientesService, {
  type PacienteData,
} from '../../services/pacientes/pacientes.service';

import ConsultaExterna from './ConsultaExterna';
import PacienteDetalleModal from './components/PacienteDetalleModal';
import PacienteAuditoriaModal from './components/PacienteAuditoriaModal';
import PacienteEditModal from './components/PacienteEditModal';

import './Pacientes.css';

dayjs.locale('es');

const { Title, Text } = Typography;

const PACIENTE_ATENCION_STORAGE_KEY = 'paciente_atencion_actual';
const CONSULTA_EXTERNA_ABIERTA_STORAGE_KEY = 'consulta_externa_abierta';

const SUCURSAL_ID_DEFAULT = 1;

type CodigoPostalLocalData = {
  entidad: string;
  municipio: string;
  colonias: string[];
};

const CATALOGO_CODIGOS_POSTALES: Record<string, CodigoPostalLocalData> = {
  '44100': {
    entidad: 'Jalisco',
    municipio: 'Guadalajara',
    colonias: ['Centro', 'Guadalajara Centro'],
  },
  '72000': {
    entidad: 'Puebla',
    municipio: 'Puebla',
    colonias: ['Centro', 'El Carmen', 'Analco'],
  },
  '72210': {
    entidad: 'Puebla',
    municipio: 'Puebla',
    colonias: ['Malintzi', 'La Resurrección'],
  },
  '75700': {
    entidad: 'Puebla',
    municipio: 'Tehuacán',
    colonias: ['Centro', 'La Purísima', 'Santiago Tula'],
  },
  '74690': {
    entidad: 'Puebla',
    municipio: 'Tepexi de Rodríguez',
    colonias: ['Centro', 'San Sebastián', 'San Pedro'],
  },
};

type DomicilioPacienteData = {
  calle?: string;
  numero_exterior?: string;
  numero_interior?: string;
  colonia?: string;
  codigo_postal?: string;
  municipio?: string;
  entidad?: string;
  referencias_domicilio?: string;
};

type PacienteFormData = Omit<PacienteData, 'fecha_nacimiento'> &
  DomicilioPacienteData & {
    fecha_nacimiento?: string | Dayjs | null;
  };

type PacienteCreateApiPayload = {
  sucursalId: number;
  nombre: string;
  primerApellido: string;
  segundoApellido?: string;
  fechaNacimiento: string;
  sexo: string;
  tipoSangre: string;
  curp: string;
  curpGenerico?: string;
  lugarOrigen?: string;
  paisNacimiento: string;
  estadoCivil?: string;
  escolaridad?: string;
  ocupacion?: string;
  telefono?: string;
  celular?: string;
  correo?: string;
  entidad?: string;
  municipio?: string;
  codigoPostal?: string;
  colonia?: string;
  calle?: string;
  numeroExterior?: string;
  numeroInterior?: string;
};

const guardarPacienteAtencion = (paciente: PacienteData | null) => {
  try {
    if (!paciente) {
      localStorage.removeItem(PACIENTE_ATENCION_STORAGE_KEY);
      return;
    }

    localStorage.setItem(PACIENTE_ATENCION_STORAGE_KEY, JSON.stringify(paciente));
  } catch {
    // Evita romper la app si el navegador bloquea localStorage.
  }
};

const cargarPacienteAtencion = (): PacienteData | null => {
  try {
    const data = localStorage.getItem(PACIENTE_ATENCION_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

const generarCurpGenerica = () => {
  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numeros = '0123456789';

  return `XEXX010101MNEXXX${
    letras.charAt(Math.floor(Math.random() * letras.length))
  }${numeros.charAt(Math.floor(Math.random() * numeros.length))}`;
};

const extraerDataPaciente = (response: any) => {
  return (
    response?.data?.paciente ||
    response?.data?.result ||
    response?.data?.data ||
    response?.data ||
    response?.paciente ||
    response?.result ||
    response
  );
};

const normalizarPacienteRespuesta = (
  response: any,
  fallback: PacienteData,
): PacienteData => {
  const raw = extraerDataPaciente(response) || {};

  return {
    ...fallback,
    ...raw,
    id: raw?.id ?? fallback.id,
    nombre: raw?.nombre ?? fallback.nombre,
    primer_apellido:
      raw?.primer_apellido ?? raw?.primerApellido ?? fallback.primer_apellido,
    segundo_apellido:
      raw?.segundo_apellido ?? raw?.segundoApellido ?? fallback.segundo_apellido ?? '',
    fecha_nacimiento:
      raw?.fecha_nacimiento ?? raw?.fechaNacimiento ?? fallback.fecha_nacimiento,
    sexo: raw?.sexo ?? fallback.sexo,
    tipo_sangre: raw?.tipo_sangre ?? raw?.tipoSangre ?? fallback.tipo_sangre,
    curp: raw?.curp ?? fallback.curp,
    curp_generico:
      raw?.curp_generico ?? raw?.curpGenerico ?? fallback.curp_generico ?? '',
    lugar_origen:
      raw?.lugar_origen ?? raw?.lugarOrigen ?? fallback.lugar_origen ?? '',
    pais_nacimiento:
      raw?.pais_nacimiento ?? raw?.paisNacimiento ?? fallback.pais_nacimiento ?? 'Mexico',
    estado_civil:
      raw?.estado_civil ?? raw?.estadoCivil ?? fallback.estado_civil ?? '',
    escolaridad: raw?.escolaridad ?? fallback.escolaridad ?? '',
    ocupacion: raw?.ocupacion ?? fallback.ocupacion ?? '',
    telefono: raw?.telefono ?? fallback.telefono ?? '',
    celular: raw?.celular ?? fallback.celular ?? '',
    correo: raw?.correo ?? fallback.correo ?? '',
    numero_expediente:
      raw?.numero_expediente ?? raw?.numeroExpediente ?? fallback.numero_expediente ?? '',
    entidad: raw?.entidad ?? fallback.entidad ?? '',
    municipio: raw?.municipio ?? fallback.municipio ?? '',
    codigo_postal:
      raw?.codigo_postal ?? raw?.codigoPostal ?? fallback.codigo_postal ?? '',
    colonia: raw?.colonia ?? fallback.colonia ?? '',
    calle: raw?.calle ?? fallback.calle ?? '',
    numero_exterior:
      raw?.numero_exterior ?? raw?.numeroExterior ?? fallback.numero_exterior ?? '',
    numero_interior:
      raw?.numero_interior ?? raw?.numeroInterior ?? fallback.numero_interior ?? '',
    activo: raw?.activo ?? fallback.activo ?? true,
  };
};

const Pacientes: React.FC = () => {
  const navigate = useNavigate();

  const [form] = Form.useForm<PacienteFormData>();
  const { message } = App.useApp();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pacientes, setPacientes] = useState<PacienteData[]>([]);

  const [busquedaPaciente, setBusquedaPaciente] = useState('');
  const [fechaNacimientoBusqueda, setFechaNacimientoBusqueda] = useState('');
  const [numeroExpedienteBusqueda, setNumeroExpedienteBusqueda] = useState('');

  const [wizardOpen, setWizardOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const [consultaPaciente, setConsultaPaciente] = useState<PacienteData | null>(() => {
    const consultaAbierta =
      localStorage.getItem(CONSULTA_EXTERNA_ABIERTA_STORAGE_KEY) === 'true';

    if (!consultaAbierta) return null;

    return cargarPacienteAtencion();
  });

  const [pacienteAtencion, setPacienteAtencion] = useState<PacienteData | null>(() =>
    cargarPacienteAtencion(),
  );

  const [selectedPaciente, setSelectedPaciente] = useState<PacienteData | null>(null);
  const [auditoria, setAuditoria] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [usarCurpGenerica, setUsarCurpGenerica] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [wizardStep, setWizardStep] = useState(0);

  const [coloniasCp, setColoniasCp] = useState<{ value: string; label: string }[]>([]);
  const [cpInfo, setCpInfo] = useState<CodigoPostalLocalData | null>(null);

  const [datosPrimerPaso, setDatosPrimerPaso] =
    useState<Partial<PacienteFormData> | null>(null);

  const lastAutoOpenKey = useRef('');
  const desktopPageSize = 10;
  const mobilePageSize = 5;

  const getFullName = (paciente: PacienteData) =>
    `${paciente.nombre || ''} ${paciente.primer_apellido || ''} ${
      paciente.segundo_apellido || ''
    }`
      .replace(/\s+/g, ' ')
      .trim();

  const formatDate = (fecha?: string) => {
    if (!fecha) return '-';
    return fecha.split('T')[0];
  };

  const normalizarFechaFormulario = (value?: string | Dayjs | null): string => {
    if (!value) return '';

    if (dayjs.isDayjs(value)) {
      return value.format('YYYY-MM-DD');
    }

    if (typeof value === 'string') {
      return value.split('T')[0];
    }

    return '';
  };

  const abrirConsultaPaciente = (paciente: PacienteData) => {
    setPacienteAtencion(paciente);
    guardarPacienteAtencion(paciente);
    localStorage.setItem(CONSULTA_EXTERNA_ABIERTA_STORAGE_KEY, 'true');
    setConsultaPaciente(paciente);
  };

  const activarPacienteParaExpediente = (paciente: PacienteData) => {
    localStorage.removeItem(CONSULTA_EXTERNA_ABIERTA_STORAGE_KEY);

    setPacienteAtencion(paciente);
    guardarPacienteAtencion(paciente);
    setConsultaPaciente(null);

    message.success('Paciente seleccionado correctamente');

    navigate('/pacientes');
  };

  const mostrarDecisionPaciente = async (paciente: PacienteData) => {
    const result = await Swal.fire({
      icon: 'question',
      title: 'Seleccionar paciente',
      html: `
        <div style="text-align:center">
          <p style="margin:0 0 6px;color:#475569;">
            Paciente:
          </p>

          <p style="margin:0;font-weight:700;color:#111827;font-size:16px;">
            ${getFullName(paciente)}
          </p>

          <p style="margin:6px 0 0;color:#64748b;font-size:13px;">
            Expediente: ${paciente.numero_expediente || 'Sin expediente'}
          </p>

          <p style="margin:14px 0 0;color:#475569;font-size:13px;">
            Elige si deseas iniciar consulta externa o dejarlo activo para usar sus módulos del expediente.
          </p>
        </div>
      `,
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Consulta externa',
      denyButtonText: 'Usar paciente',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      denyButtonColor: '#475569',
      cancelButtonColor: '#9ca3af',
      reverseButtons: true,
      allowOutsideClick: false,
      allowEscapeKey: true,
    });

    if (result.isConfirmed) {
      abrirConsultaPaciente(paciente);
      return;
    }

    if (result.isDenied) {
      activarPacienteParaExpediente(paciente);
    }
  };

  const cerrarConsultaPaciente = () => {
    localStorage.removeItem(CONSULTA_EXTERNA_ABIERTA_STORAGE_KEY);
    setConsultaPaciente(null);
  };

  const finalizarAtencion = async () => {
    if (!pacienteAtencion) return;

    const result = await Swal.fire({
      icon: 'question',
      title: 'Finalizar atención',
      text: `El paciente ${getFullName(
        pacienteAtencion,
      )} dejará de estar activo para consulta y procedimientos.`,
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

    localStorage.removeItem(CONSULTA_EXTERNA_ABIERTA_STORAGE_KEY);
    guardarPacienteAtencion(null);

    setPacienteAtencion(null);
    setConsultaPaciente(null);

    Swal.fire({
      icon: 'success',
      title: 'Atención finalizada',
      text: 'El paciente activo fue liberado correctamente.',
      timer: 1600,
      showConfirmButton: false,
    });
  };

  const loadPacientes = async () => {
    try {
      setLoading(true);
      const data = await PacientesService.getPacientes();
      setPacientes(data);

      const pacienteGuardado = cargarPacienteAtencion();

      if (pacienteGuardado) {
        const actualizado = data.find((item) => String(item.id) === String(pacienteGuardado.id));

        if (actualizado) {
          setPacienteAtencion(actualizado);
          guardarPacienteAtencion(actualizado);

          if (consultaPaciente?.id === actualizado.id) {
            setConsultaPaciente(actualizado);
          }
        } else {
          setPacienteAtencion(null);
          guardarPacienteAtencion(null);
        }
      }
    } catch (error) {
      console.error(error);
      message.error('No fue posible cargar los pacientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPacientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetPagination = () => setCurrentPage(1);

  const limpiarBusqueda = () => {
    setBusquedaPaciente('');
    setFechaNacimientoBusqueda('');
    setNumeroExpedienteBusqueda('');
    lastAutoOpenKey.current = '';
    resetPagination();
  };

  const limpiarDatosCodigoPostal = () => {
    setColoniasCp([]);
    setCpInfo(null);
  };

  const buscarCodigoPostalLocal = (value: string) => {
    const cp = String(value || '').replace(/\D/g, '').slice(0, 5);

    form.setFieldValue('codigo_postal', cp);

    if (cp.length < 5) {
      limpiarDatosCodigoPostal();
      return;
    }

    const data = CATALOGO_CODIGOS_POSTALES[cp];

    if (!data) {
      limpiarDatosCodigoPostal();

      form.setFieldsValue({
        entidad: '',
        municipio: '',
        colonia: undefined,
      } as Partial<PacienteFormData>);

      message.info(
        'Este código postal no está en el catálogo local. Puedes capturar los datos manualmente.',
      );

      return;
    }

    const coloniasOptions = data.colonias.map((colonia) => ({
      value: colonia,
      label: colonia,
    }));

    setCpInfo(data);
    setColoniasCp(coloniasOptions);

    form.setFieldsValue({
      entidad: data.entidad,
      municipio: data.municipio,
      colonia: coloniasOptions.length === 1 ? coloniasOptions[0].value : undefined,
    } as Partial<PacienteFormData>);
  };

  const filteredPacientes = useMemo(() => {
    return pacientes.filter((paciente) => {
      const nombreCompleto = getFullName(paciente).toLowerCase();
      const fechaNacimiento = formatDate(paciente.fecha_nacimiento);
      const numeroExpediente = String(paciente.numero_expediente || '').toLowerCase();

      return (
        (!busquedaPaciente ||
          nombreCompleto.includes(busquedaPaciente.toLowerCase().trim())) &&
        (!fechaNacimientoBusqueda || fechaNacimiento === fechaNacimientoBusqueda) &&
        (!numeroExpedienteBusqueda ||
          numeroExpediente.includes(numeroExpedienteBusqueda.toLowerCase().trim()))
      );
    });
  }, [pacientes, busquedaPaciente, fechaNacimientoBusqueda, numeroExpedienteBusqueda]);

  const hayBusquedaActiva = Boolean(
    busquedaPaciente.trim() || fechaNacimientoBusqueda || numeroExpedienteBusqueda.trim(),
  );

  const busquedaSuficiente = Boolean(
    busquedaPaciente.trim().length >= 3 ||
      fechaNacimientoBusqueda ||
      numeroExpedienteBusqueda.trim().length >= 1,
  );

  const paginatedMobilePacientes = useMemo(() => {
    const start = (currentPage - 1) * mobilePageSize;
    return filteredPacientes.slice(start, start + mobilePageSize);
  }, [filteredPacientes, currentPage]);

  const openCreate = () => {
    setWizardStep(0);
    setSelectedPaciente(null);
    setDatosPrimerPaso(null);
    setUsarCurpGenerica(false);
    limpiarDatosCodigoPostal();
    form.resetFields();

    form.setFieldsValue({
      sexo: undefined,
      tipo_sangre: undefined,
      estado_civil: undefined,
      pais_nacimiento: 'Mexico',
      curp: '',
      curp_generico: '',
      entidad: '',
      municipio: '',
      codigo_postal: '',
      colonia: '',
      calle: '',
      numero_exterior: '',
      numero_interior: '',
    } as Partial<PacienteFormData>);

    setWizardOpen(true);
  };

  const openCreateFromSearch = () => {
    const partes = busquedaPaciente.trim().split(/\s+/).filter(Boolean);

    setWizardStep(0);
    setSelectedPaciente(null);
    setDatosPrimerPaso(null);
    setUsarCurpGenerica(false);
    limpiarDatosCodigoPostal();
    form.resetFields();

    form.setFieldsValue({
      nombre: partes[0] || '',
      primer_apellido: partes[1] || '',
      segundo_apellido: partes.slice(2).join(' ') || '',
      fecha_nacimiento: fechaNacimientoBusqueda ? dayjs(fechaNacimientoBusqueda) : undefined,
      pais_nacimiento: 'Mexico',
      curp: '',
      curp_generico: '',
      sexo: undefined,
      tipo_sangre: undefined,
      estado_civil: undefined,
      entidad: '',
      municipio: '',
      codigo_postal: '',
      colonia: '',
      calle: '',
      numero_exterior: '',
      numero_interior: '',
    } as Partial<PacienteFormData>);

    setWizardOpen(true);
  };

  const showRedirectToWizard = async () => {
    const result = await Swal.fire({
      icon: 'info',
      title: 'Paciente no encontrado',
      text: 'No se encontró ningún expediente con esos datos. Puede abrir el registro o cancelar para corregir la búsqueda.',
      showCancelButton: true,
      confirmButtonText: 'Ir al registro',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#43d7d8',
      cancelButtonColor: '#94a3b8',
      reverseButtons: true,
      allowOutsideClick: false,
      allowEscapeKey: true,
    });

    if (result.isConfirmed) {
      openCreateFromSearch();
    } else {
      lastAutoOpenKey.current = `${busquedaPaciente.trim()}|${fechaNacimientoBusqueda}|${numeroExpedienteBusqueda.trim()}`;
    }
  };

  const tryOpenCreateFromSearch = () => {
    if (busquedaSuficiente && !loading && filteredPacientes.length === 0 && !wizardOpen) {
      const autoOpenKey = `${busquedaPaciente.trim()}|${fechaNacimientoBusqueda}|${numeroExpedienteBusqueda.trim()}`;
      lastAutoOpenKey.current = autoOpenKey;
      showRedirectToWizard();
    }
  };

  const handleSearchEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      tryOpenCreateFromSearch();
    }
  };

  useEffect(() => {
    const autoOpenKey = `${busquedaPaciente.trim()}|${fechaNacimientoBusqueda}|${numeroExpedienteBusqueda.trim()}`;

    const timer = setTimeout(() => {
      if (
        busquedaSuficiente &&
        !loading &&
        filteredPacientes.length === 0 &&
        !wizardOpen &&
        autoOpenKey !== lastAutoOpenKey.current
      ) {
        lastAutoOpenKey.current = autoOpenKey;
        showRedirectToWizard();
      }
    }, 950);

    return () => clearTimeout(timer);
  }, [
    busquedaPaciente,
    fechaNacimientoBusqueda,
    numeroExpedienteBusqueda,
    busquedaSuficiente,
    filteredPacientes.length,
    loading,
    wizardOpen,
  ]);

  const openEdit = (paciente: PacienteData) => {
    setSelectedPaciente(paciente);
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (values: PacienteData) => {
    if (!selectedPaciente?.id) return;

    try {
      setSaving(true);

      const payload: PacienteData = {
        ...selectedPaciente,
        ...values,
        curp: values.curp?.trim().toUpperCase() || '',
        nombre: values.nombre?.trim(),
        primer_apellido: values.primer_apellido?.trim(),
        segundo_apellido: values.segundo_apellido?.trim() || '',
        telefono: values.telefono?.trim() || '',
        celular: values.celular?.trim() || '',
        correo: values.correo?.trim() || '',
      };

      await PacientesService.updatePaciente(selectedPaciente.id, payload);

      await Swal.fire({
        icon: 'success',
        title: 'Paciente actualizado',
        text: 'Los datos del paciente se actualizaron correctamente.',
        confirmButtonColor: '#43d7d8',
      });

      setEditModalOpen(false);
      setSelectedPaciente(null);

      if (pacienteAtencion?.id === selectedPaciente.id) {
        setPacienteAtencion(payload);
        guardarPacienteAtencion(payload);
      }

      if (consultaPaciente?.id === selectedPaciente.id) {
        setConsultaPaciente(payload);
      }

      loadPacientes();
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error al actualizar',
        text: error?.message || 'No fue posible actualizar el paciente',
        confirmButtonColor: '#ff4d4f',
      });
    } finally {
      setSaving(false);
    }
  };

  const openDetail = (paciente: PacienteData) => {
    setSelectedPaciente(paciente);
    setDetailOpen(true);
  };

  const openAudit = async (paciente: PacienteData) => {
    if (!paciente.id) return;

    try {
      setSelectedPaciente(paciente);
      setAuditOpen(true);
      setAuditLoading(true);
      const data = await PacientesService.getAuditoriaPaciente(paciente.id);
      setAuditoria(data);
    } catch (error) {
      console.error(error);
      message.error('No fue posible cargar la auditoría');
    } finally {
      setAuditLoading(false);
    }
  };

  const handleCloseWizard = () => {
    setWizardStep(0);
    setWizardOpen(false);
    setSelectedPaciente(null);
    setDatosPrimerPaso(null);
    setUsarCurpGenerica(false);
    limpiarDatosCodigoPostal();
    form.resetFields();
  };

  const handleToggleCurpGenerica = (checked: boolean) => {
    setUsarCurpGenerica(checked);

    if (checked) {
      const curpGenerica = generarCurpGenerica();

      form.setFieldsValue({
        curp: curpGenerica,
        curp_generico: curpGenerica,
      } as Partial<PacienteFormData>);
    } else {
      form.setFieldsValue({
        curp: '',
        curp_generico: '',
      } as Partial<PacienteFormData>);
    }
  };

  const handleRegenerarCurpGenerica = () => {
    const curpGenerica = generarCurpGenerica();

    form.setFieldsValue({
      curp: curpGenerica,
      curp_generico: curpGenerica,
    } as Partial<PacienteFormData>);
  };

  const goNextWizardStep = async () => {
    try {
      const values = await form.validateFields([
        'nombre',
        'primer_apellido',
        'fecha_nacimiento',
        'sexo',
        'tipo_sangre',
        'curp',
      ]);

      const todosLosValores = form.getFieldsValue(true);

      setDatosPrimerPaso({
        ...todosLosValores,
        ...values,
      });

      setWizardStep(1);
    } catch {
      message.warning('Completa los datos obligatorios del paciente');
    }
  };

  const goPrevWizardStep = () => {
    if (datosPrimerPaso) {
      form.setFieldsValue(datosPrimerPaso);
    }

    setWizardStep(0);
  };

  const submitWizard = () => {
    form.submit();
  };

  const handleSubmit = async (values: PacienteFormData) => {
    try {
      setSaving(true);

      const datosFinales: PacienteFormData = {
        ...datosPrimerPaso,
        ...values,
      } as PacienteFormData;

      const curpFinal = datosFinales.curp?.trim().toUpperCase() || '';

      const payloadApi: PacienteCreateApiPayload = {
        sucursalId: SUCURSAL_ID_DEFAULT,
        nombre: datosFinales.nombre?.trim() || '',
        primerApellido: datosFinales.primer_apellido?.trim() || '',
        segundoApellido: datosFinales.segundo_apellido?.trim() || '',
        fechaNacimiento: normalizarFechaFormulario(datosFinales.fecha_nacimiento),
        sexo: datosFinales.sexo || '',
        tipoSangre: datosFinales.tipo_sangre || '',
        curp: curpFinal,
        curpGenerico: usarCurpGenerica
          ? curpFinal
          : datosFinales.curp_generico?.trim().toUpperCase() || '',
        lugarOrigen: datosFinales.lugar_origen?.trim() || '',
        paisNacimiento: datosFinales.pais_nacimiento?.trim() || 'Mexico',
        estadoCivil: datosFinales.estado_civil || '',
        escolaridad: datosFinales.escolaridad || '',
        ocupacion: datosFinales.ocupacion?.trim() || '',
        telefono: datosFinales.telefono?.trim() || '',
        celular: datosFinales.celular?.trim() || '',
        correo: datosFinales.correo?.trim() || '',
        entidad: datosFinales.entidad?.trim() || '',
        municipio: datosFinales.municipio?.trim() || '',
        codigoPostal: datosFinales.codigo_postal?.trim() || '',
        colonia: datosFinales.colonia?.trim() || '',
        calle: datosFinales.calle?.trim() || '',
        numeroExterior: datosFinales.numero_exterior?.trim() || '',
        numeroInterior: datosFinales.numero_interior?.trim() || '',
      };

      const fallbackPaciente: PacienteData = {
        nombre: payloadApi.nombre,
        primer_apellido: payloadApi.primerApellido,
        segundo_apellido: payloadApi.segundoApellido || '',
        fecha_nacimiento: payloadApi.fechaNacimiento,
        sexo: payloadApi.sexo,
        tipo_sangre: payloadApi.tipoSangre,
        curp: payloadApi.curp,
        curp_generico: payloadApi.curpGenerico || '',
        lugar_origen: payloadApi.lugarOrigen || '',
        pais_nacimiento: payloadApi.paisNacimiento,
        estado_civil: payloadApi.estadoCivil || '',
        escolaridad: payloadApi.escolaridad || '',
        ocupacion: payloadApi.ocupacion || '',
        telefono: payloadApi.telefono || '',
        celular: payloadApi.celular || '',
        correo: payloadApi.correo || '',
        entidad: payloadApi.entidad || '',
        municipio: payloadApi.municipio || '',
        codigo_postal: payloadApi.codigoPostal || '',
        colonia: payloadApi.colonia || '',
        calle: payloadApi.calle || '',
        numero_exterior: payloadApi.numeroExterior || '',
        numero_interior: payloadApi.numeroInterior || '',
        numero_expediente: '',
        activo: true,
      };

      Swal.fire({
        title: 'Registrando paciente...',
        text: 'Por favor espera un momento',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading(),
      });

      const response = await PacientesService.createPaciente(payloadApi as any);
      const pacienteGuardado = normalizarPacienteRespuesta(response, fallbackPaciente);

      Swal.close();

      await Swal.fire({
        icon: 'success',
        title: 'Paciente registrado',
        html: `
          <div style="text-align:center">
            <p>El paciente se registró correctamente.</p>
            <p style="margin:8px 0 0;font-weight:700;color:#159fa3">
              Expediente: ${pacienteGuardado.numero_expediente || 'Asignado por el sistema'}
            </p>
            <p style="margin:8px 0 0">Será enviado a consulta externa.</p>
          </div>
        `,
        confirmButtonColor: '#36c6c7',
      });

      handleCloseWizard();
      limpiarBusqueda();

      await loadPacientes();

      abrirConsultaPaciente(pacienteGuardado);
    } catch (error: any) {
      Swal.close();

      const backendMessage =
        error?.response?.data?.details ||
        error?.response?.data?.message ||
        error?.response?.data?.error;

      Swal.fire({
        icon: 'error',
        title: 'Error al guardar paciente',
        html: Array.isArray(backendMessage)
          ? backendMessage.join('<br>')
          : backendMessage || error?.message || 'No fue posible guardar el paciente',
        confirmButtonColor: '#ff4d4f',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (paciente: PacienteData) => {
    if (!paciente.id) return;

    const result = await Swal.fire({
      icon: 'warning',
      title: '¿Eliminar paciente?',
      text: `Se eliminará el registro de ${getFullName(paciente)}.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ff4d4f',
    });

    if (!result.isConfirmed) return;

    try {
      Swal.fire({
        title: 'Eliminando paciente...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading(),
      });

      await PacientesService.deletePaciente(paciente.id);

      Swal.close();

      await Swal.fire({
        icon: 'success',
        title: 'Paciente eliminado',
        text: 'El registro se eliminó correctamente.',
        confirmButtonColor: '#36c6c7',
      });

      if (pacienteAtencion?.id === paciente.id) {
        setPacienteAtencion(null);
        guardarPacienteAtencion(null);
      }

      if (consultaPaciente?.id === paciente.id) {
        setConsultaPaciente(null);
      }

      resetPagination();
      loadPacientes();
    } catch (error: any) {
      Swal.close();

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error?.message || 'No fue posible eliminar el paciente',
        confirmButtonColor: '#ff4d4f',
      });
    }
  };

  const getActionItems = (paciente: PacienteData): MenuProps['items'] => [
    {
      key: 'flujo',
      icon: <MedicineBoxOutlined />,
      label: 'Seleccionar flujo',
      onClick: () => mostrarDecisionPaciente(paciente),
    },
    {
      key: 'detalle',
      icon: <EyeOutlined />,
      label: 'Ver detalle',
      onClick: () => openDetail(paciente),
    },
    {
      key: 'auditoria',
      icon: <HistoryOutlined />,
      label: 'Auditoría',
      onClick: () => openAudit(paciente),
    },
    {
      key: 'editar',
      icon: <EditOutlined />,
      label: 'Editar',
      onClick: () => openEdit(paciente),
    },
    {
      type: 'divider',
    },
    {
      key: 'eliminar',
      icon: <DeleteOutlined />,
      label: 'Eliminar',
      danger: true,
      onClick: () => handleDelete(paciente),
    },
  ];

  const columns: ColumnsType<PacienteData> = [
    {
      title: 'Paciente',
      key: 'paciente',
      width: '27%',
      render: (_, paciente) => (
        <Space size={10} className="paciente-cell-space">
          <Avatar icon={<UserOutlined />} className="paciente-avatar" />

          <div className="paciente-name-cell">
            <strong title={getFullName(paciente)}>{getFullName(paciente)}</strong>

            <span title={paciente.numero_expediente || 'Sin expediente'}>
              Exp. {paciente.numero_expediente || 'Sin expediente'}
            </span>
          </div>
        </Space>
      ),
    },
    {
      title: 'Nacimiento',
      dataIndex: 'fecha_nacimiento',
      width: '11%',
      render: (fecha) => formatDate(fecha),
    },
    {
      title: 'CURP',
      dataIndex: 'curp',
      width: '18%',
      ellipsis: true,
      render: (curp) => curp || <Text type="secondary">Sin CURP</Text>,
    },
    {
      title: 'Contacto',
      key: 'contacto',
      width: '19%',
      render: (_, paciente) => (
        <div className="paciente-contact-cell">
          <strong title={paciente.celular || paciente.telefono || '-'}>
            {paciente.celular || paciente.telefono || '-'}
          </strong>

          <span title={paciente.correo || 'Sin correo'}>{paciente.correo || 'Sin correo'}</span>
        </div>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'activo',
      width: '9%',
      align: 'center',
      render: (activo) =>
        activo ? (
          <Tag className="paciente-status activo">Activo</Tag>
        ) : (
          <Tag className="paciente-status inactivo">Inactivo</Tag>
        ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: '16%',
      align: 'center',
      render: (_, paciente) => (
        <div className="paciente-actions-wrap">
          <Tooltip title="Seleccionar paciente para consulta o expediente">
            <Button
              type="primary"
              icon={<MedicineBoxOutlined />}
              className="paciente-consulta-btn"
              onClick={() => mostrarDecisionPaciente(paciente)}
            >
              <span className="consulta-text">Atender</span>
            </Button>
          </Tooltip>

          <Dropdown
            menu={{ items: getActionItems(paciente) }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button
              className="paciente-more-btn"
              icon={<MoreOutlined />}
              onClick={(event) => event.preventDefault()}
            />
          </Dropdown>
        </div>
      ),
    },
  ];

  if (consultaPaciente) {
    return (
      <ConsultaExterna
        paciente={consultaPaciente}
        onBack={cerrarConsultaPaciente}
        onPacienteLiberado={() => {
          localStorage.removeItem(CONSULTA_EXTERNA_ABIERTA_STORAGE_KEY);
          localStorage.removeItem(PACIENTE_ATENCION_STORAGE_KEY);

          setPacienteAtencion(null);
          setConsultaPaciente(null);
          guardarPacienteAtencion(null);

          setWizardOpen(false);
          setDetailOpen(false);
          setAuditOpen(false);
          setEditModalOpen(false);

          resetPagination();

          navigate('/pacientes', { replace: true });
        }}
      />
    );
  }

  return (
    <div className="pacientes-page">
      {!wizardOpen ? (
        <>
          <div className="pacientes-hero">
            <div className="pacientes-header-top">
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                className="pacientes-back-btn"
                onClick={() => navigate('/confirmar-atencion')}
              >
                Regresar
              </Button>

              <span className="pacientes-subtitle-right">Expediente electrónico</span>
            </div>

            <div className="pacientes-hero-main">
              <div>
                <Title level={2}>Pacientes</Title>

                <Text type="secondary">
                  Busca en tiempo real. Si no existe, se notificará y se abrirá el registro.
                </Text>

                {pacienteAtencion && (
                  <div className="pacientes-active-patient">
                    <div className="pacientes-active-left">
                      <MedicineBoxOutlined className="pacientes-active-icon" />

                      <span className="pacientes-active-badge">EN ATENCIÓN</span>

                      <span className="pacientes-active-name">
                        {getFullName(pacienteAtencion)}
                      </span>

                      <span className="pacientes-active-divider">•</span>

                      <span className="pacientes-active-exp">
                        Exp. {pacienteAtencion.numero_expediente || 'Sin expediente'}
                      </span>
                    </div>

                    <Button
                      icon={<CheckCircleOutlined />}
                      className="pacientes-finalizar-btn-outline"
                      onClick={finalizarAtencion}
                    >
                      Finalizar atención
                    </Button>
                  </div>
                )}
              </div>

              <Button
                type="primary"
                icon={<PlusOutlined />}
                className="pacientes-create-btn"
                onClick={openCreate}
              >
                Crear paciente
              </Button>
            </div>
          </div>

          <Card className="pacientes-card">
            <div className="pacientes-smart-search">
              <div className="pacientes-radar">
                <span />
                <SearchOutlined />
              </div>

              <div className="pacientes-search-main">
                <label>Buscar paciente</label>

                <Input
                  className="pacientes-name-search"
                  placeholder="Nombre o apellidos..."
                  value={busquedaPaciente}
                  onChange={(e) => {
                    setBusquedaPaciente(e.target.value);
                    resetPagination();
                  }}
                  onKeyDown={handleSearchEnter}
                  allowClear
                />
              </div>

              <div className="pacientes-filter-group">
                <label>Fecha de nacimiento</label>

                <DatePicker
                  className="pacientes-date-picker"
                  format="DD/MM/YYYY"
                  placeholder="Selecciona fecha"
                  value={fechaNacimientoBusqueda ? dayjs(fechaNacimientoBusqueda) : null}
                  allowClear
                  inputReadOnly
                  suffixIcon={<CalendarOutlined />}
                  disabledDate={(current) => Boolean(current && current > dayjs().endOf('day'))}
                  onChange={(date) => {
                    setFechaNacimientoBusqueda(date ? date.format('YYYY-MM-DD') : '');
                    resetPagination();
                  }}
                />
              </div>

              <div className="pacientes-filter-group">
                <label>Número de expediente</label>

                <div className="pacientes-filter-pill">
                  <IdcardOutlined />

                  <Input
                    placeholder="Expediente"
                    value={numeroExpedienteBusqueda}
                    onChange={(e) => {
                      setNumeroExpedienteBusqueda(e.target.value);
                      resetPagination();
                    }}
                    onKeyDown={handleSearchEnter}
                    allowClear
                  />
                </div>
              </div>

              <div className="pacientes-search-actions">
                <Button onClick={limpiarBusqueda}>Limpiar</Button>

                <Button icon={<ReloadOutlined />} onClick={loadPacientes}>
                  Actualizar
                </Button>
              </div>
            </div>

            <div className="pacientes-summary-grid">
              <div>
                <strong>{pacientes.length}</strong>
                <span>Registrados</span>
              </div>

              <div>
                <strong>{filteredPacientes.length}</strong>
                <span>Coincidencias</span>
              </div>

              <div>
                <strong>{hayBusquedaActiva ? 'Activo' : 'Libre'}</strong>
                <span>Filtro</span>
              </div>
            </div>

            <Table
              className="pacientes-table-desktop"
              columns={columns}
              dataSource={filteredPacientes}
              rowKey={(record) => String(record.id)}
              loading={loading}
              size="small"
              tableLayout="fixed"
              pagination={{
                current: currentPage,
                pageSize: desktopPageSize,
                total: filteredPacientes.length,
                showSizeChanger: false,
                position: ['bottomCenter'],
                onChange: (page) => setCurrentPage(page),
              }}
              locale={{
                emptyText: hayBusquedaActiva ? (
                  <Empty description="Paciente no encontrado. Puede registrarlo o corregir la búsqueda." />
                ) : (
                  <Empty description="No hay pacientes registrados" />
                ),
              }}
            />

            <div className="pacientes-mobile-list">
              {loading ? (
                <div className="pacientes-mobile-loading">
                  <Spin />
                </div>
              ) : paginatedMobilePacientes.length ? (
                paginatedMobilePacientes.map((paciente) => (
                  <Card key={paciente.id} className="paciente-mobile-card">
                    <div className="paciente-mobile-header">
                      <Avatar icon={<UserOutlined />} className="paciente-avatar" />

                      <div>
                        <strong>{getFullName(paciente)}</strong>
                        <p>{paciente.numero_expediente || 'Sin expediente'}</p>
                      </div>
                    </div>

                    <div className="paciente-mobile-extra">
                      <p>
                        <strong>Fecha nacimiento:</strong> {formatDate(paciente.fecha_nacimiento)}
                      </p>

                      <p>
                        <strong>CURP:</strong> {paciente.curp || 'Sin CURP'}
                      </p>

                      <p>
                        <strong>Contacto:</strong> {paciente.celular || paciente.telefono || '-'}
                      </p>

                      <p>
                        <strong>Correo:</strong> {paciente.correo || 'Sin correo'}
                      </p>
                    </div>

                    <div className="paciente-mobile-actions">
                      <Button
                        type="primary"
                        icon={<MedicineBoxOutlined />}
                        className="paciente-consulta-mobile-btn"
                        onClick={() => mostrarDecisionPaciente(paciente)}
                      >
                        Seleccionar paciente
                      </Button>

                      <div className="paciente-mobile-secondary-actions">
                        <Button icon={<EyeOutlined />} onClick={() => openDetail(paciente)}>
                          Ver
                        </Button>

                        <Button icon={<HistoryOutlined />} onClick={() => openAudit(paciente)}>
                          Auditoría
                        </Button>

                        <Button icon={<EditOutlined />} onClick={() => openEdit(paciente)}>
                          Editar
                        </Button>

                        <Button danger icon={<DeleteOutlined />} onClick={() => handleDelete(paciente)}>
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <Empty description="No hay pacientes registrados" />
              )}

              {filteredPacientes.length > mobilePageSize && (
                <Pagination
                  current={currentPage}
                  pageSize={mobilePageSize}
                  total={filteredPacientes.length}
                  showSizeChanger={false}
                  size="small"
                  onChange={(page) => setCurrentPage(page)}
                  className="pacientes-mobile-pagination"
                />
              )}
            </div>
          </Card>
        </>
      ) : (
        <div className="pacientes-wizard-page">
          <div className="pacientes-wizard-topbar">
            <div>
              <Text className="pacientes-subtitle">Nuevo expediente</Text>
              <Title level={2}>Registro de paciente</Title>
            </div>

            <Button icon={<CloseOutlined />} onClick={handleCloseWizard}>
              Cerrar
            </Button>
          </div>

          <div className="pacientes-wizard-layout">
            <aside className="pacientes-wizard-side">
              <div className="pacientes-wizard-brand">
                <div className="pacientes-wizard-logo">
                  <UserOutlined />
                </div>

                <strong>Asistente de registro</strong>
                <span>Completa el expediente en pasos claros.</span>
              </div>

              <div className="pacientes-wizard-progress">
                <div
                  className={`wizard-step-item ${
                    wizardStep === 0 ? 'active' : wizardStep > 0 ? 'done' : ''
                  }`}
                >
                  <div className="wizard-step-icon">
                    <UserOutlined />
                  </div>

                  <div>
                    <strong>Paciente</strong>
                    <span>Datos generales obligatorios</span>
                  </div>
                </div>

                <div className={`wizard-step-item ${wizardStep === 1 ? 'active' : ''}`}>
                  <div className="wizard-step-icon">
                    <HomeOutlined />
                  </div>

                  <div>
                    <strong>Domicilio</strong>
                    <span>Información que se enviará a la API</span>
                  </div>
                </div>
              </div>
            </aside>

            <section className="pacientes-wizard-content">
              <Form
                form={form}
                layout="vertical"
                preserve={true}
                onFinish={handleSubmit}
                initialValues={{
                  sexo: undefined,
                  tipo_sangre: undefined,
                  estado_civil: undefined,
                  pais_nacimiento: 'Mexico',
                  curp: '',
                  curp_generico: '',
                }}
              >
                {wizardStep === 0 && (
                  <div className="pacientes-wizard-step">
                    <div className="pacientes-step-title">
                      <span>1</span>

                      <div>
                        <strong>Información del paciente</strong>
                        <p>Estos datos son necesarios para crear el expediente clínico.</p>
                      </div>
                    </div>

                    <Row gutter={[16, 0]}>
                      <Col xs={24} md={8}>
                        <Form.Item
                          name="nombre"
                          label="Nombre"
                          rules={[{ required: true, message: 'Ingresa el nombre' }]}
                        >
                          <Input />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={8}>
                        <Form.Item
                          name="primer_apellido"
                          label="Primer apellido"
                          rules={[{ required: true, message: 'Ingresa el primer apellido' }]}
                        >
                          <Input />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={8}>
                        <Form.Item name="segundo_apellido" label="Segundo apellido">
                          <Input />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={8}>
                        <Form.Item
                          name="fecha_nacimiento"
                          label="Fecha de nacimiento"
                          rules={[{ required: true, message: 'Ingresa la fecha de nacimiento' }]}
                        >
                          <DatePicker
                            className="pacientes-date-picker pacientes-birth-datepicker"
                            format="DD/MM/YYYY"
                            placeholder="Selecciona la fecha"
                            allowClear
                            inputReadOnly
                            showToday={false}
                            suffixIcon={<CalendarOutlined />}
                            disabledDate={(current) =>
                              Boolean(current && current > dayjs().endOf('day'))
                            }
                          />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={8}>
                        <Form.Item
                          name="sexo"
                          label="Sexo"
                          rules={[{ required: true, message: 'Selecciona el sexo' }]}
                        >
                          <Select
                            options={[
                              { value: 'F', label: 'Femenino' },
                              { value: 'M', label: 'Masculino' },
                            ]}
                            allowClear
                          />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={8}>
                        <Form.Item
                          name="tipo_sangre"
                          label="Tipo de sangre"
                          rules={[{ required: true, message: 'Selecciona el tipo de sangre' }]}
                        >
                          <Select
                            options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(
                              (v) => ({ value: v, label: v }),
                            )}
                            allowClear
                          />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={usarCurpGenerica ? 14 : 16}>
                        <Form.Item
                          name="curp"
                          label={usarCurpGenerica ? 'CURP generada' : 'CURP'}
                          rules={[
                            { required: true, message: 'Ingresa la CURP' },
                            { len: 18, message: 'La CURP debe tener 18 caracteres' },
                          ]}
                        >
                          <Input
                            maxLength={18}
                            disabled={usarCurpGenerica}
                            onChange={(event) => {
                              form.setFieldValue('curp', event.target.value.toUpperCase());
                            }}
                          />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={usarCurpGenerica ? 6 : 8}>
                        <Form.Item label="CURP genérica">
                          <div className="pacientes-curp-switch-inline">
                            <Switch
                              checked={usarCurpGenerica}
                              onChange={handleToggleCurpGenerica}
                            />

                            <span>
                              {usarCurpGenerica ? 'Activada' : 'Usar si no cuenta con CURP'}
                            </span>
                          </div>
                        </Form.Item>
                      </Col>

                      {usarCurpGenerica && (
                        <Col xs={24} md={4}>
                          <Form.Item label="Generar otra">
                            <Button
                              icon={<SyncOutlined />}
                              onClick={handleRegenerarCurpGenerica}
                              block
                            >
                              Generar
                            </Button>
                          </Form.Item>
                        </Col>
                      )}

                      <Form.Item name="curp_generico" hidden>
                        <Input />
                      </Form.Item>

                      <Col xs={24} md={8}>
                        <Form.Item name="lugar_origen" label="Lugar de origen">
                          <Input placeholder="Ej. Guadalajara, Jalisco" />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={8}>
                        <Form.Item name="pais_nacimiento" label="País de nacimiento">
                          <Input />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={8}>
                        <Form.Item name="estado_civil" label="Estado civil">
                          <Select
                            allowClear
                            options={[
                              'Soltero',
                              'Casado',
                              'Divorciado',
                              'Viudo',
                              'Union libre',
                            ].map((v) => ({ value: v, label: v }))}
                          />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={8}>
                        <Form.Item name="escolaridad" label="Escolaridad">
                          <Select
                            allowClear
                            options={[
                              'Primaria',
                              'Secundaria',
                              'Preparatoria',
                              'Licenciatura',
                              'Maestria',
                              'Doctorado',
                              'Otro',
                            ].map((v) => ({ value: v, label: v }))}
                          />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={8}>
                        <Form.Item name="ocupacion" label="Ocupación">
                          <Input />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={8}>
                        <Form.Item label="Número de expediente">
                          <Input
                            disabled
                            prefix={<IdcardOutlined />}
                            value="Se asignará automáticamente"
                          />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={8}>
                        <Form.Item name="telefono" label="Teléfono">
                          <Input />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={8}>
                        <Form.Item name="celular" label="Celular">
                          <Input />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={8}>
                        <Form.Item
                          name="correo"
                          label="Correo"
                          rules={[
                            {
                              type: 'email',
                              message: 'Ingresa un correo válido',
                            },
                          ]}
                        >
                          <Input placeholder="correo@ejemplo.com" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                )}

                {wizardStep === 1 && (
                  <div className="pacientes-wizard-step">
                    <div className="pacientes-step-title domicilio">
                      <span>2</span>

                      <div>
                        <strong>Domicilio del paciente</strong>
                        <p>
                          Ingresa el código postal. Si existe en el catálogo local, se llenarán
                          algunos datos automáticamente.
                        </p>
                      </div>
                    </div>

                    <Row gutter={[16, 0]}>
                      <Col xs={24} md={8}>
                        <Form.Item
                          name="codigo_postal"
                          label="Código postal"
                          rules={[
                            {
                              pattern: /^\d{5}$/,
                              message: 'El código postal debe tener 5 dígitos',
                            },
                          ]}
                        >
                          <Input
                            maxLength={5}
                            placeholder="Ej. 44100"
                            inputMode="numeric"
                            onChange={(event) => buscarCodigoPostalLocal(event.target.value)}
                          />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={8}>
                        <Form.Item name="entidad" label="Entidad">
                          <Input placeholder="Ej. Jalisco" disabled={Boolean(cpInfo?.entidad)} />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={8}>
                        <Form.Item name="municipio" label="Municipio">
                          <Input
                            placeholder="Ej. Guadalajara"
                            disabled={Boolean(cpInfo?.municipio)}
                          />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={8}>
                        <Form.Item name="colonia" label="Colonia">
                          <AutoComplete
                            placeholder={
                              coloniasCp.length ? 'Selecciona una colonia' : 'Escribe la colonia'
                            }
                            options={coloniasCp}
                            filterOption={(inputValue, option) =>
                              String(option?.value || '')
                                .toLowerCase()
                                .includes(inputValue.toLowerCase())
                            }
                          />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={10}>
                        <Form.Item name="calle" label="Calle">
                          <Input placeholder="Ej. Av. Juárez" />
                        </Form.Item>
                      </Col>

                      <Col xs={12} md={3}>
                        <Form.Item name="numero_exterior" label="No. exterior">
                          <Input placeholder="123" />
                        </Form.Item>
                      </Col>

                      <Col xs={12} md={3}>
                        <Form.Item name="numero_interior" label="No. interior">
                          <Input placeholder="A" />
                        </Form.Item>
                      </Col>

                      <Col xs={24}>
                        <Form.Item name="referencias_domicilio" label="Referencias">
                          <Input.TextArea
                            rows={3}
                            placeholder="Entre calles, color de casa, referencias..."
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                )}

                <div className="pacientes-wizard-actions">
                  <Button onClick={handleCloseWizard}>Cancelar</Button>

                  {wizardStep === 1 && (
                    <Button icon={<ArrowLeftOutlined />} onClick={goPrevWizardStep}>
                      Anterior
                    </Button>
                  )}

                  {wizardStep === 0 && (
                    <Button
                      type="primary"
                      icon={<ArrowRightOutlined />}
                      className="pacientes-primary-btn"
                      onClick={goNextWizardStep}
                    >
                      Siguiente
                    </Button>
                  )}

                  {wizardStep === 1 && (
                    <>
                      <Button loading={saving} onClick={submitWizard}>
                        Omitir domicilio y registrar
                      </Button>

                      <Button
                        type="primary"
                        loading={saving}
                        className="pacientes-primary-btn"
                        onClick={submitWizard}
                      >
                        Registrar paciente
                      </Button>
                    </>
                  )}
                </div>
              </Form>
            </section>
          </div>
        </div>
      )}

      <PacienteDetalleModal
        open={detailOpen}
        paciente={selectedPaciente}
        onClose={() => setDetailOpen(false)}
        onConsulta={(paciente) => {
          setDetailOpen(false);
          mostrarDecisionPaciente(paciente);
        }}
      />

      <PacienteAuditoriaModal
        open={auditOpen}
        loading={auditLoading}
        auditoria={auditoria}
        onClose={() => setAuditOpen(false)}
      />

      <PacienteEditModal
        open={editModalOpen}
        paciente={selectedPaciente}
        loading={saving}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedPaciente(null);
        }}
        onSubmit={handleEditSubmit}
      />
    </div>
  );
};

export default Pacientes;