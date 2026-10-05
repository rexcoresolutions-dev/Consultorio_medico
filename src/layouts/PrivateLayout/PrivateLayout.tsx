import React, { useEffect, useMemo, useState } from 'react';
import {
  Layout,
  Menu,
  Avatar,
  Button,
  Typography,
  Badge,
  Tooltip,
  App,
  Dropdown,
  Modal,
  Select,
} from 'antd';
import {
  DashboardOutlined,
  CalendarOutlined,
  FileTextOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
  ShopOutlined,
  BarChartOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  HeartOutlined,
  PoweroffOutlined,
  MenuOutlined,
  TeamOutlined,
  ProfileOutlined,
  DownOutlined,
  HistoryOutlined,
  FormOutlined,
  FolderOpenOutlined,
  MedicineBoxOutlined,
  ExperimentOutlined,
  SolutionOutlined,
  TableOutlined,
  FileDoneOutlined,
  SafetyCertificateOutlined,
  FileProtectOutlined,
  AuditOutlined,
  FileSearchOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import MobileMenu from '../../components/MobileMenu/MobileMenu';
import WelcomeModal from '../../components/Auth/WelcomeModal';
import CambiarPasswordInicial from '../../pages/Auth/CambiarPasswordInicial';
import OfflineStatus from '../../components/OfflineStatus/OfflineStatus';
import UserService from '../../services/user/user.service';
import { ROUTES } from '../../router/routes';
import useSystemConfig from '../../hooks/useSystemConfig';
import { persistSystemConfigSnapshot } from '../../services/system-config/system-config.service';
import { getRoleLabel, getUserRoleId } from '../../utils/role.utils';
import axiosInstance from '../../api/axios.config';
import {
  clearWorkSucursal,
  getWorkSucursal,
  setWorkSucursal,
  setAllBranchesContext,
  isAllBranchesContext,
  WORK_CONTEXT_CHANGED,
  type WorkSucursal,
} from '../../services/work-context/work-context.service';
import './PrivateLayout.css';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const PACIENTE_ATENCION_STORAGE_KEY = 'paciente_atencion_actual';
const CONSULTA_EXTERNA_ABIERTA_STORAGE_KEY = 'consulta_externa_abierta';

const isRouteKey = (key?: string) => Boolean(key && key.startsWith('/'));

const flattenMenuItems = (items: any[]): any[] => {
  return items.flatMap((item) => {
    if (item?.children?.length) {
      return flattenMenuItems(item.children);
    }

    return [item];
  });
};

const normalizeMenuPathname = (pathname: string) => {
  /*
    Rutas ocultas en el menú, pero relacionadas con Confirmar atención.

    La idea es:
    - No mostrar "Pacientes" como opción independiente.
    - Cuando el usuario esté en /pacientes, /busqueda-paciente o /consulta,
      se debe marcar "Confirmar atención" como opción activa.
  */

  if (
    pathname === ROUTES.PATIENTS ||
    pathname.startsWith(`${ROUTES.PATIENTS}/`)
  ) {
    return ROUTES.CONFIRMAR_ATENCION;
  }

  const busquedaPacienteBase = ROUTES.BUSQUEDA_PACIENTE.split('/:')[0];
  if (
    pathname === busquedaPacienteBase ||
    pathname.startsWith(`${busquedaPacienteBase}/`)
  ) {
    return ROUTES.CONFIRMAR_ATENCION;
  }

  const consultaBase = ROUTES.CONSULTA.split('/:')[0];
  if (pathname === consultaBase || pathname.startsWith(`${consultaBase}/`)) {
    return ROUTES.CONFIRMAR_ATENCION;
  }

  const procedimientoBase = ROUTES.PROCEDIMIENTO.split('/:')[0];
  if (
    pathname === procedimientoBase ||
    pathname.startsWith(`${procedimientoBase}/`)
  ) {
    return ROUTES.PROCEDIMIENTOS;
  }

  return pathname;
};

const getActiveMenuItem = (items: any[], pathname: string) => {
  const normalizedPathname = normalizeMenuPathname(pathname);

  const leaves = flattenMenuItems(items).filter((item) =>
    isRouteKey(String(item?.key || ''))
  );

  const exact = leaves.find(
    (item) => String(item.key) === normalizedPathname
  );

  if (exact) return exact;

  return leaves
    .filter((item) => {
      const key = String(item.key);
      return normalizedPathname.startsWith(`${key}/`);
    })
    .sort((a, b) => String(b.key).length - String(a.key).length)[0];
};

const getParentKeys = (
  items: any[],
  targetKey: string,
  parents: string[] = []
): string[] => {
  for (const item of items) {
    if (String(item?.key) === targetKey) {
      return parents;
    }

    if (item?.children?.length) {
      const result = getParentKeys(item.children, targetKey, [
        ...parents,
        String(item.key),
      ]);

      if (result.length) return result;
    }
  }

  return [];
};

const PrivateLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const [sucursales, setSucursales] = useState<WorkSucursal[]>([]);
  const [workSucursal, setWorkSucursalState] = useState<WorkSucursal | null>(() => getWorkSucursal());
  const [workSucursalId, setWorkSucursalId] = useState<number | 'all'>();
  const [allBranches, setAllBranches] = useState(() => isAllBranchesContext());
  const [contextOpen, setContextOpen] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);
  const [effectivePermissions, setEffectivePermissions] = useState<Set<string> | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { message, modal } = App.useApp();
  const systemConfig = useSystemConfig();

  useEffect(() => {
    const refresh = () => {
      setWorkSucursalState(getWorkSucursal());
      setAllBranches(isAllBranchesContext());
    };
    window.addEventListener(WORK_CONTEXT_CHANGED, refresh);
    return () => window.removeEventListener(WORK_CONTEXT_CHANGED, refresh);
  }, []);

  useEffect(() => {
    const loadUserFromApi = async () => {
      try {
        const me = await UserService.getMe();
        const mergedUser = {
          ...(user || {}),
          ...me,
          rol_id: getUserRoleId(me) || getUserRoleId(user) || undefined,
        };

        setCurrentUser(mergedUser);
        localStorage.setItem('user', JSON.stringify(mergedUser));

        const hasSeenWelcome = sessionStorage.getItem('hasSeenWelcome');

        if (!hasSeenWelcome) {
          setWelcomeOpen(true);
          sessionStorage.setItem('hasSeenWelcome', 'true');
        }
      } catch {
        const hasSeenWelcome = sessionStorage.getItem('hasSeenWelcome');

        if (!hasSeenWelcome) {
          setWelcomeOpen(true);
          sessionStorage.setItem('hasSeenWelcome', 'true');
        }
      }
    };

    loadUserFromApi();
  }, []);

  const activeUser = currentUser || user;
  const rolId = getUserRoleId(activeUser);

  useEffect(() => {
    if (!activeUser?.id || activeUser?.debe_cambiar_password) return;
    axiosInstance.get('/notificaciones/mias', { params: { page: 1, limit: 1 } })
      .then((response) => setUnreadNotifications(Number((response.data?.data ?? response.data)?.meta?.noLeidas ?? 0)))
      .catch(() => setUnreadNotifications(0));
  }, [activeUser?.id, activeUser?.debe_cambiar_password]);

  useEffect(() => {
    if (!activeUser?.id || activeUser?.debe_cambiar_password || rolId === 4) return;
    axiosInstance.get('/permisos/me')
      .then((response) => {
        const payload = response.data?.data ?? response.data;
        const rows = payload?.permisos ?? [];
        setEffectivePermissions(new Set(
          rows
            .filter((item: any) => item.efectivo)
            .map((item: any) => String(item.clave)),
        ));
        localStorage.setItem('effective_permissions', JSON.stringify({
          userId: Number(activeUser.id),
          values: Object.fromEntries(rows.map((item: any) => [String(item.clave), Boolean(item.efectivo)])),
        }));
      })
      .catch(() => setEffectivePermissions(null));
  }, [activeUser?.id, rolId]);

  useEffect(() => {
    if (!activeUser || !rolId) return;
    if (rolId !== 1) {
      const id = Number(activeUser?.sucursal_id ?? activeUser?.sucursalId);
      if (id > 0) {
        const fixed = { id, nombre: activeUser?.sucursal_nombre ?? activeUser?.sucursalNombre ?? 'Sucursal asignada' };
        setWorkSucursal(fixed);
        setWorkSucursalState(fixed);
      }
      return;
    }
    let active = true;
    setContextLoading(true);
    axiosInstance.get('/sucursales', { params: { page: 1, limit: 100 }, skipWorkContext: true } as any).then(response => {
      if (!active) return;
      const rows = response.data?.data?.data ?? response.data?.data ?? [];
      const options = rows.map((item: any) => ({ id: Number(item.id), nombre: item.nombre, empresaId: Number(item.empresaId) }));
      setSucursales(options);
      const stored = getWorkSucursal();
      const valid = options.find((item: WorkSucursal) => item.id === stored?.id);
      const consolidated = options.length > 1 && isAllBranchesContext();
      if (options.length === 1) {
        const onlyBranch = options[0];
        setWorkSucursal(onlyBranch);
        setWorkSucursalState(onlyBranch);
        setWorkSucursalId(onlyBranch.id);
        setAllBranches(false);
        sessionStorage.setItem('work-context-confirmed', '1');
        setContextOpen(false);
      } else if (valid) {
        setWorkSucursalId(valid.id);
        setWorkSucursalState(valid);
        setAllBranches(false);
        setContextOpen(false);
      } else if (consolidated) {
        setWorkSucursalId('all');
        setWorkSucursalState(null);
        setAllBranches(true);
        setContextOpen(false);
      } else {
        clearWorkSucursal();
        setWorkSucursalState(null);
        setAllBranches(false);
        setContextOpen(options.length > 1);
      }
    }).catch(() => message.error('No fue posible cargar las sucursales autorizadas.'))
      .finally(() => { if (active) setContextLoading(false); });
    return () => { active = false; };
  }, [activeUser?.id, rolId]);

  const confirmWorkContext = () => {
    if (workSucursalId === 'all') {
      setAllBranchesContext();
      setWorkSucursalState(null);
      setAllBranches(true);
      sessionStorage.setItem('work-context-confirmed', '1');
      setContextOpen(false);
      message.success('Contexto activo: Todas las sucursales');
      navigate(ROUTES.DASHBOARD_ADMIN);
      return;
    }
    const selected = sucursales.find(item => item.id === workSucursalId);
    if (!selected) { message.warning('Selecciona la sucursal donde vas a trabajar.'); return; }
    const changed = Boolean(workSucursal && workSucursal.id !== selected.id);
    if (changed) {
      localStorage.removeItem(PACIENTE_ATENCION_STORAGE_KEY);
      localStorage.removeItem(CONSULTA_EXTERNA_ABIERTA_STORAGE_KEY);
    }
    setWorkSucursal(selected);
    setWorkSucursalState(selected);
    setAllBranches(false);
    sessionStorage.setItem('work-context-confirmed', '1');
    setContextOpen(false);
    message.success(`Sucursal activa: ${selected.nombre}`);
    if (changed) navigate(ROUTES.DASHBOARD_ADMIN);
  };

  const menuItems = useMemo(() => {
    const canModule = (name: string) =>
      rolId === 1 || rolId === 4 || effectivePermissions === null ||
      effectivePermissions.has(`modulo.${name}.acceder`);
    const leaf = (key: string, icon: React.ReactNode, label: string) => ({
      key,
      icon,
      title: label,
      label: <span className="nav-leaf-label">{label}</span>,
    });

    const section = (
      key: string,
      icon: React.ReactNode,
      label: string,
      description: string,
      children: any[]
    ) => ({
      key,
      icon,
      title: label,
      label: (
        <div className="nav-parent-label">
          <span>{label}</span>
          {!collapsed && <small>{description}</small>}
        </div>
      ),
      children,
    });

    const dashboardAdmin = leaf(
      ROUTES.DASHBOARD_ADMIN,
      <DashboardOutlined />,
      'Inicio'
    );

    const dashboardMedico = leaf(
      ROUTES.DASHBOARD_MEDICO,
      <DashboardOutlined />,
      'Inicio'
    );

    const dashboardAuditor = leaf(
      ROUTES.DASHBOARD_AUDITOR,
      <AuditOutlined />,
      'Inicio'
    );

    const pacienteAdmin = section(
      'section-paciente',
      <UserOutlined />,
      'Paciente',
      'Registro, búsqueda y atención',
      [
        leaf(
          ROUTES.CONFIRMAR_ATENCION,
          <FileTextOutlined />,
          'Confirmar atención'
        ),
      ]
    );

    const pacienteMedico = section(
      'section-paciente',
      <UserOutlined />,
      'Paciente',
      'Registro y atención',
      [
        leaf(
          ROUTES.CONFIRMAR_ATENCION,
          <FileTextOutlined />,
          'Confirmar atención'
        ),
      ]
    );

    const expediente = section(
      'section-expediente',
      <FolderOpenOutlined />,
      'Expediente',
      'Historial clínico y evolución',
      [
        leaf(ROUTES.HISTORIAL_CLINICO, <HistoryOutlined />, 'Historial clínico'),
        leaf(
          ROUTES.HISTORIALES_DISPONIBLES,
          <FolderOpenOutlined />,
          'Historiales disponibles'
        ),
        leaf(ROUTES.NOTA_EVOLUCION, <FormOutlined />, 'Nota de evolución'),
        leaf(
          ROUTES.HISTORICO_PACIENTE,
          <HistoryOutlined />,
          'Histórico por paciente'
        ),
      ]
    );

    const consulta = section(
      'section-consulta',
      <MedicineBoxOutlined />,
      'Consulta',
      'Referencias, estudios y control',
      [
        ...(canModule('procedimientos') ? [leaf(ROUTES.PROCEDIMIENTOS, <MedicineBoxOutlined />, 'Procedimientos')] : []),
        leaf(
          ROUTES.HOJA_REFERENCIA,
          <MedicineBoxOutlined />,
          'Hoja de referencia'
        ),
        leaf(
          ROUTES.ESTUDIOS_CLINICOS,
          <ExperimentOutlined />,
          'Estudios clínicos'
        ),
        leaf(
          ROUTES.CERTIFICADO_MEDICO,
          <SolutionOutlined />,
          'Certificado médico'
        ),
        leaf(
          ROUTES.CONTROL_DIARIO_PACIENTES,
          <TableOutlined />,
          'Control diario'
        ),
        leaf(ROUTES.APPOINTMENTS, <CalendarOutlined />, 'Citas'),
        leaf(ROUTES.PRESCRIPTIONS, <FileTextOutlined />, 'Recetas'),
      ]
    );

    const inventario = leaf(
      ROUTES.INVENTORY,
      <MedicineBoxOutlined />,
      'Inventario'
    );

    const formatos = section(
      'section-formatos',
      <FileDoneOutlined />,
      'Formatos',
      'Consentimientos y avisos',
      [
        leaf(ROUTES.DOCUMENTOS, <FileDoneOutlined />, 'Documentos'),
        leaf(
          ROUTES.CONSENTIMIENTO_INFORMADO,
          <FileTextOutlined />,
          'Consentimiento informado'
        ),
        leaf(
          ROUTES.FARMACO_VIGILANCIA,
          <SafetyCertificateOutlined />,
          'Farmacovigilancia'
        ),
        leaf(
          ROUTES.AVISO_PRIVACIDAD,
          <FileProtectOutlined />,
          'Aviso de privacidad'
        ),
        leaf(
          ROUTES.AVISO_MEDICO_COMODATARIO,
          <FileProtectOutlined />,
          'Aviso médico comodatario'
        ),
      ]
    );

    const administracionAdmin = section(
      'section-admin',
      <SettingOutlined />,
      'Administración',
      'Sistema y configuración',
      [
        leaf(ROUTES.CLINICS, <ShopOutlined />, 'Consultorios'),
        leaf(ROUTES.USERS, <TeamOutlined />, 'Usuarios'),
        leaf(ROUTES.PERMISSIONS, <SafetyCertificateOutlined />, 'Permisos'),
        leaf(ROUTES.REPORTS, <BarChartOutlined />, 'Reportes'),
        leaf(ROUTES.SETTINGS, <SettingOutlined />, 'Configuración'),
      ]
    );

    const administracionMedico = section(
      'section-admin',
      <BarChartOutlined />,
      'Administración',
      'Reportes',
      [leaf(ROUTES.REPORTS, <BarChartOutlined />, 'Reportes')]
    );

    const auditoria = leaf(
      ROUTES.AUDIT,
      <AuditOutlined />,
      'Auditoría'
    );

    const documentacionAuditor = section(
      'section-auditor-docs',
      <FileSearchOutlined />,
      'Documentación',
      'Consulta y reportes',
      [
        leaf(ROUTES.PRESCRIPTIONS, <FileTextOutlined />, 'Recetas emitidas'),
        leaf(ROUTES.CONTROL_DIARIO_PACIENTES, <TableOutlined />, 'Control diario'),
      ]
    );

    switch (rolId) {
      case 4:
        return [
          leaf(ROUTES.PLATFORM, <ShopOutlined />, 'Plataforma'),
          dashboardAdmin,
          pacienteAdmin,
          expediente,
          consulta,
          inventario,
          formatos,
          administracionAdmin,
        ];

      case 1:
        return [
          dashboardAdmin,
          pacienteAdmin,
          expediente,
          consulta,
          inventario,
          formatos,
          administracionAdmin,
        ];

      case 2:
        return [
          canModule('inicio') ? dashboardMedico : null,
          canModule('pacientes') ? pacienteMedico : null,
          canModule('expediente') ? expediente : null,
          canModule('consulta') ? consulta : null,
          canModule('inventario') ? inventario : null,
          canModule('formatos') ? formatos : null,
          canModule('reportes') ? administracionMedico : null,
        ].filter(Boolean) as any[];

      case 3:
        return [
          canModule('inicio') ? dashboardAuditor : null,
          canModule('auditoria') ? auditoria : null,
          canModule('control_diario') ? documentacionAuditor : null,
        ].filter(Boolean) as any[];

      default:
        return [];
    }
  }, [rolId, collapsed, effectivePermissions]);

  const activeMenuItem = useMemo(() => {
    return getActiveMenuItem(menuItems, location.pathname);
  }, [menuItems, location.pathname]);

  const selectedKey = activeMenuItem?.key || normalizeMenuPathname(location.pathname);
  const pageTitle = activeMenuItem?.title || 'Inicio';

  useEffect(() => {
    if (collapsed) {
      setOpenKeys([]);
      return;
    }

    const parents = getParentKeys(menuItems, String(selectedKey));
    setOpenKeys(parents);
  }, [collapsed, selectedKey, menuItems]);

  const limpiarEstadoClinicoTemporal = () => {
    try {
      localStorage.removeItem(PACIENTE_ATENCION_STORAGE_KEY);
      localStorage.removeItem(CONSULTA_EXTERNA_ABIERTA_STORAGE_KEY);
      clearWorkSucursal();
      sessionStorage.removeItem('empresa_contexto_id');
      localStorage.removeItem('effective_permissions');
      sessionStorage.removeItem('hasSeenWelcome');
    } catch {
      // Evita romper la app si el navegador bloquea storage.
    }
  };

  const handleLogout = async () => {
    try {
      // Guardamos una copia de la identidad antes y después del logout. Algunos
      // providers de autenticación limpian localStorage completo al cerrar sesión;
      // así el Login conserva logo, nombre y tema de la última empresa utilizada.
      const previousUser = activeUser;
      const identitySnapshot = systemConfig;

      persistSystemConfigSnapshot(identitySnapshot, previousUser);
      limpiarEstadoClinicoTemporal();
      await Promise.resolve(logout());
      persistSystemConfigSnapshot(identitySnapshot, previousUser);

      message.success('Sesión cerrada correctamente');
      navigate('/login', { replace: true });
    } catch {
      message.error('Error al cerrar sesión');
    }
  };

  const showLogoutConfirm = () => {
    modal.confirm({
      title: 'Cerrar Sesión',
      icon: <PoweroffOutlined style={{ color: '#50EBEC' }} />,
      content: '¿Estás seguro de que deseas cerrar sesión?',
      okText: 'Sí, cerrar sesión',
      cancelText: 'Cancelar',
      okButtonProps: { danger: true },
      onOk: handleLogout,
    });
  };

  const handleMenuClick = (key: string) => {
    if (!isRouteKey(key)) return;

    navigate(key);
    setMobileMenuOpen(false);
  };

  const handleMenuOpenChange = (keys: string[]) => {
    const latestOpenKey = keys.find((key) => !openKeys.includes(key));

    if (latestOpenKey) {
      setOpenKeys([latestOpenKey]);
      return;
    }

    setOpenKeys(keys);
  };

  const getRolName = () => getRoleLabel(activeUser);

  const userMenuItems = [
    { key: 'profile', icon: <ProfileOutlined />, label: 'Mi perfil' },
    { key: 'sync', icon: <SyncOutlined />, label: 'Sincronización offline' },
    ...([1, 4].includes(rolId)
      ? [{ key: 'settings', icon: <SettingOutlined />, label: 'Configuración del sistema' }]
      : []),
    { type: 'divider' as const },
    {
      key: 'logout',
      danger: true,
      icon: <LogoutOutlined />,
      label: 'Cerrar sesión',
    },
  ];

  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'profile') {
      navigate(ROUTES.PROFILE);
      return;
    }

    if (key === 'settings') {
      navigate(ROUTES.SETTINGS);
      return;
    }

    if (key === 'sync') {
      navigate(ROUTES.SYNC);
      return;
    }

    if (key === 'logout') {
      showLogoutConfirm();
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className="custom-sider"
        width={280}
        collapsedWidth={80}
      >
        <div className="logo-container">
          <div className={`logo ${collapsed ? 'collapsed' : ''}`}>
            {systemConfig.logoDataUrl ? (
              <span className="system-sidebar-logo-frame">
                <img
                  src={systemConfig.logoDataUrl}
                  alt={systemConfig.nombreCorto}
                  className="system-sidebar-logo-image"
                />
              </span>
            ) : (
              <HeartOutlined className="logo-icon" />
            )}
            {!collapsed && systemConfig.mostrarNombreSidebar && (
              <span className="logo-text">{systemConfig.nombreCorto}</span>
            )}
          </div>
        </div>

        <Menu
          key={location.pathname}
          theme="dark"
          mode="inline"
          selectedKeys={[String(selectedKey)]}
          openKeys={collapsed ? [] : openKeys}
          items={menuItems}
          className="custom-menu custom-menu-sectioned"
          onClick={({ key, domEvent }) => {
            const clickedElement = domEvent.currentTarget as HTMLElement | null;
            handleMenuClick(String(key));
            if ('detail' in domEvent && domEvent.detail > 0) {
              requestAnimationFrame(() => clickedElement?.blur());
            }
          }}
          onOpenChange={handleMenuOpenChange}
        />
      </Sider>

      <Layout className="main-layout">
        <Header className="dashboard-header">
          <div className="header-left">
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setMobileMenuOpen(true)}
              className="mobile-menu-btn"
            />

            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="desktop-collapse-btn"
            />

            <div className="page-title">
              <Text strong>{pageTitle}</Text>
            </div>
          </div>

          <div className="header-right">
            <OfflineStatus />
            {rolId === 1 && (
              <Button icon={<ShopOutlined />} onClick={() => setContextOpen(true)}>
                {allBranches ? 'Todas las sucursales' : workSucursal?.nombre || 'Seleccionar sucursal'}
              </Button>
            )}
            <Tooltip title="Notificaciones">
              <Badge count={unreadNotifications} size="small" showZero={false}>
                <Button
                  type="text"
                  icon={<BellOutlined />}
                  className="notification-btn"
                  onClick={() => navigate(ROUTES.NOTIFICATIONS)}
                />
              </Badge>
            </Tooltip>

            <Dropdown
              menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
              trigger={['click']}
              placement="bottomRight"
            >
              <button className="user-dropdown-trigger" type="button">
                <Avatar
                  size={40}
                  icon={<UserOutlined />}
                  style={{
                    background:
                      'linear-gradient(135deg, #50EBEC 0%, #36C6C7 100%)',
                  }}
                />

                <div className="user-text-info">
                  <div className="user-name">
                    {activeUser?.nombre || 'Usuario'}{' '}
                    {activeUser?.primer_apellido ||
                      activeUser?.primerApellido ||
                      ''}
                  </div>

                  <div className="user-role">{getRolName()}</div>
                </div>

                <DownOutlined className="user-dropdown-arrow" />
              </button>
            </Dropdown>
          </div>
        </Header>

        <Content className="dashboard-content">
          <Outlet />
        </Content>
      </Layout>

      <MobileMenu
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        onMenuClick={handleMenuClick}
      />

      <WelcomeModal
        visible={welcomeOpen && !activeUser?.debe_cambiar_password}
        user={activeUser}
        onClose={() => setWelcomeOpen(false)}
      />
      {activeUser?.debe_cambiar_password && <CambiarPasswordInicial />}
      <Modal
        title="Selecciona tu sucursal de trabajo"
        open={contextOpen}
        closable={Boolean(workSucursal || allBranches)}
        maskClosable={false}
        keyboard={false}
        cancelButtonProps={{ style: { display: workSucursal || allBranches ? undefined : 'none' } }}
        okText="Trabajar en esta sucursal"
        onOk={confirmWorkContext}
        onCancel={() => (workSucursal || allBranches) && setContextOpen(false)}
        confirmLoading={contextLoading}
      >
        <p>La consulta, receta, inventario y demás registros se asociarán a esta sucursal.</p>
        <Select
          style={{ width: '100%' }}
          size="large"
          value={workSucursalId}
          onChange={setWorkSucursalId}
          placeholder="Selecciona una sucursal"
          loading={contextLoading}
          options={[
            ...(sucursales.length > 1 ? [{ value: 'all' as const, label: 'Ver todas las sucursales' }] : []),
            ...sucursales.map(item => ({ value: item.id, label: item.nombre })),
          ]}
        />
      </Modal>
    </Layout>
  );
};

export default PrivateLayout;
