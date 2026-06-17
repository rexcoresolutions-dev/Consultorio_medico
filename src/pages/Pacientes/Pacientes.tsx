import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Button,
  Card,
  Col,
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
  Divider,
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
import Swal from 'sweetalert2';

import PacientesService, {
  type PacienteData,
} from '../../services/pacientes/pacientes.service';

import ConsultaExterna from './ConsultaExterna';
import PacienteDetalleModal from './components/PacienteDetalleModal';
import PacienteAuditoriaModal from './components/PacienteAuditoriaModal';
import PacienteEditModal from './components/PacienteEditModal';

import './Pacientes.css';

const { Title, Text } = Typography;

const PACIENTE_ATENCION_STORAGE_KEY = 'paciente_atencion_actual';
const CONSULTA_EXTERNA_ABIERTA_STORAGE_KEY = 'consulta_externa_abierta';

type DomicilioPacienteData = {
  calle?: string;
  numero_exterior?: string;
  numero_interior?: string;
  colonia?: string;
  codigo_postal?: string;
  municipio?: string;
  estado_domicilio?: string;
  referencias_domicilio?: string;
};

type PacienteFormData = PacienteData & DomicilioPacienteData;

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
    const consultaAbierta = localStorage.getItem(CONSULTA_EXTERNA_ABIERTA_STORAGE_KEY) === 'true';

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

  const [datosPrimerPaso, setDatosPrimerPaso] = useState<Partial<PacienteFormData> | null>(null);

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

  const abrirConsultaPaciente = (paciente: PacienteData) => {
    setPacienteAtencion(paciente);
    guardarPacienteAtencion(paciente);
    localStorage.setItem(CONSULTA_EXTERNA_ABIERTA_STORAGE_KEY, 'true');
    setConsultaPaciente(paciente);
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

    setPacienteAtencion(null);
    setConsultaPaciente(null);
    guardarPacienteAtencion(null);

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
    form.resetFields();

    form.setFieldsValue({
      sexo: undefined,
      tipo_sangre: undefined,
      estado_civil: undefined,
      pais_nacimiento: 'Mexico',
      curp: '',
      curp_generico: '',
    } as Partial<PacienteFormData>);

    setWizardOpen(true);
  };

  const openCreateFromSearch = () => {
    const partes = busquedaPaciente.trim().split(/\s+/).filter(Boolean);

    setWizardStep(0);
    setSelectedPaciente(null);
    setDatosPrimerPaso(null);
    setUsarCurpGenerica(false);
    form.resetFields();

    form.setFieldsValue({
      nombre: partes[0] || '',
      primer_apellido: partes[1] || '',
      segundo_apellido: partes.slice(2).join(' ') || '',
      fecha_nacimiento: fechaNacimientoBusqueda,
      numero_expediente: numeroExpedienteBusqueda.trim(),
      pais_nacimiento: 'Mexico',
      curp: '',
      curp_generico: '',
      sexo: undefined,
      tipo_sangre: undefined,
      estado_civil: undefined,
    } as Partial<PacienteFormData>);

    setWizardOpen(true);
  };

  const showRedirectToWizard = async () => {
    const result = await Swal.fire({
      icon: 'info',
      title: 'Paciente no encontrado',
      text: 'No se encontró ningún expediente con esos datos. Puede abrir el asistente de registro o cancelar para corregir la búsqueda.',
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
        numero_expediente: values.numero_expediente?.trim() || '',
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
        'numero_expediente',
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
        ...values,
        ...datosPrimerPaso,
      } as PacienteFormData;

      const curpFinal = datosFinales.curp?.trim().toUpperCase() || '';

      const payload: PacienteData = {
        nombre: datosFinales.nombre?.trim() || '',
        primer_apellido: datosFinales.primer_apellido?.trim() || '',
        segundo_apellido: datosFinales.segundo_apellido?.trim() || '',
        fecha_nacimiento: datosFinales.fecha_nacimiento || '',
        sexo: datosFinales.sexo || '',
        tipo_sangre: datosFinales.tipo_sangre || '',
        curp: curpFinal,
        curp_generico: usarCurpGenerica
          ? curpFinal
          : datosFinales.curp_generico?.trim().toUpperCase() || '',
        lugar_origen: datosFinales.lugar_origen?.trim() || '',
        pais_nacimiento: datosFinales.pais_nacimiento?.trim() || 'Mexico',
        estado_civil: datosFinales.estado_civil || '',
        escolaridad: datosFinales.escolaridad || '',
        ocupacion: datosFinales.ocupacion?.trim() || '',
        telefono: datosFinales.telefono?.trim() || '',
        celular: datosFinales.celular?.trim() || '',
        correo: datosFinales.correo?.trim() || '',
        numero_expediente: datosFinales.numero_expediente?.trim() || '',
        activo: true,
      };

      Swal.fire({
        title: 'Registrando paciente...',
        text: 'Por favor espera un momento',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading(),
      });

      const response = await PacientesService.createPaciente(payload);
      const pacienteGuardado: PacienteData = response || payload;

      Swal.close();

      await Swal.fire({
        icon: 'success',
        title: 'Paciente registrado',
        text: 'El paciente se registró correctamente. Será enviado a consulta externa.',
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
          <Tooltip title="Abrir consulta externa y dejar paciente activo">
            <Button
              type="primary"
              icon={<MedicineBoxOutlined />}
              className="paciente-consulta-btn"
              onClick={() => abrirConsultaPaciente(paciente)}
            >
              <span className="consulta-text">Consulta</span>
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
                  Busca en tiempo real. Si no existe, se notificará y se abrirá el wizard.
                </Text>

                {pacienteAtencion && (
                  <div className="pacientes-active-patient">
                    <div className="pacientes-active-left">
                      <MedicineBoxOutlined className="pacientes-active-icon" />

                      <span className="pacientes-active-badge">
                        EN ATENCIÓN
                      </span>

                      <span className="pacientes-active-name">
                        {getFullName(pacienteAtencion)}
                      </span>

                      <span className="pacientes-active-divider">
                        •
                      </span>

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

                <div className="pacientes-filter-pill">
                  <CalendarOutlined />

                  <Input
                    type="date"
                    value={fechaNacimientoBusqueda}
                    onChange={(e) => {
                      setFechaNacimientoBusqueda(e.target.value);
                      resetPagination();
                    }}
                    onKeyDown={handleSearchEnter}
                  />
                </div>
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
                        onClick={() => abrirConsultaPaciente(paciente)}
                      >
                        Consulta externa
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
                    <span>Información opcional simulada</span>
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
                      <Col xs={24}>
                        <div className="pacientes-curp-switch">
                          <div>
                            <strong>Registro con CURP genérica</strong>
                            <p>Actívalo si el paciente no cuenta con CURP.</p>
                          </div>

                          <Switch checked={usarCurpGenerica} onChange={handleToggleCurpGenerica} />
                        </div>

                        <Divider />
                      </Col>

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
                          <Input type="date" max={new Date().toISOString().split('T')[0]} />
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

                      <Col xs={24} md={usarCurpGenerica ? 16 : 24}>
                        <Form.Item
                          name="curp"
                          label={usarCurpGenerica ? 'CURP generada' : 'CURP'}
                          rules={[
                            { required: true, message: 'Ingresa la CURP' },
                            { len: 18, message: 'La CURP debe tener 18 caracteres' },
                          ]}
                        >
                          <Input maxLength={18} disabled={usarCurpGenerica} />
                        </Form.Item>
                      </Col>

                      {usarCurpGenerica && (
                        <Col xs={24} md={8}>
                          <Form.Item label="Regenerar CURP genérica">
                            <Button
                              icon={<SyncOutlined />}
                              onClick={handleRegenerarCurpGenerica}
                              block
                            >
                              Generar otra
                            </Button>
                          </Form.Item>
                        </Col>
                      )}

                      <Form.Item name="curp_generico" hidden>
                        <Input />
                      </Form.Item>

                      <Col xs={24} md={8}>
                        <Form.Item name="lugar_origen" label="Lugar de origen">
                          <Input />
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
                        <Form.Item
                          name="numero_expediente"
                          label="Número de expediente"
                          rules={[{ required: true, message: 'Ingresa el número de expediente' }]}
                        >
                          <Input />
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
                        <p>Este paso es solo simulación por ahora. No se enviará al backend.</p>
                      </div>
                    </div>

                    <Row gutter={[16, 0]}>
                      <Col xs={24} md={14}>
                        <Form.Item name="calle" label="Calle">
                          <Input placeholder="Ej. Avenida Reforma" />
                        </Form.Item>
                      </Col>

                      <Col xs={12} md={5}>
                        <Form.Item name="numero_exterior" label="No. exterior">
                          <Input placeholder="123" />
                        </Form.Item>
                      </Col>

                      <Col xs={12} md={5}>
                        <Form.Item name="numero_interior" label="No. interior">
                          <Input placeholder="A" />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={8}>
                        <Form.Item name="colonia" label="Colonia">
                          <Input />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={8}>
                        <Form.Item name="codigo_postal" label="Código postal">
                          <Input maxLength={5} />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={8}>
                        <Form.Item name="municipio" label="Municipio">
                          <Input />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={8}>
                        <Form.Item name="estado_domicilio" label="Estado">
                          <Input />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={16}>
                        <Form.Item name="referencias_domicilio" label="Referencias">
                          <Input.TextArea
                            rows={4}
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
          abrirConsultaPaciente(paciente);
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