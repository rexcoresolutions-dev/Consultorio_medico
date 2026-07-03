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
  EyeOutlined,
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
} from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import MobileMenu from '../../components/MobileMenu/MobileMenu';
import WelcomeModal from '../../components/Auth/WelcomeModal';
import UserService from '../../services/user/user.service';
import { ROUTES } from '../../router/routes';
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

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { message, modal } = App.useApp();

  useEffect(() => {
    const loadUserFromApi = async () => {
      try {
        const me = await UserService.getMe();

        setCurrentUser(me);
        localStorage.setItem('user', JSON.stringify(me));

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
  const rolId = Number(activeUser?.rol_id || activeUser?.rolId || 0);

  const menuItems = useMemo(() => {
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
      'Dashboard'
    );

    const dashboardMedico = leaf(
      ROUTES.DASHBOARD_MEDICO,
      <DashboardOutlined />,
      'Dashboard'
    );

    const dashboardConsultor = leaf(
      ROUTES.DASHBOARD_CONSULTOR,
      <EyeOutlined />,
      'Dashboard'
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
        leaf(ROUTES.PROCEDIMIENTOS, <MedicineBoxOutlined />, 'Procedimientos'),
      ]
    );

    const pacienteMedico = section(
      'section-paciente',
      <UserOutlined />,
      'Paciente',
      'Atención y procedimientos',
      [
        leaf(
          ROUTES.CONFIRMAR_ATENCION,
          <FileTextOutlined />,
          'Confirmar atención'
        ),
        leaf(ROUTES.PROCEDIMIENTOS, <MedicineBoxOutlined />, 'Procedimientos'),
      ]
    );

    const pacienteConsultor = section(
      'section-paciente',
      <UserOutlined />,
      'Paciente',
      'Búsqueda y registro',
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
        leaf(ROUTES.REPORTS, <BarChartOutlined />, 'Reportes'),
        leaf(ROUTES.SETTINGS, <SettingOutlined />, 'Configuración'),
      ]
    );

    const administracionMedico = section(
      'section-admin',
      <SettingOutlined />,
      'Administración',
      'Reportes y configuración',
      [
        leaf(ROUTES.REPORTS, <BarChartOutlined />, 'Reportes'),
        leaf(ROUTES.SETTINGS, <SettingOutlined />, 'Configuración'),
      ]
    );

    const reportesConsultor = section(
      'section-reportes',
      <BarChartOutlined />,
      'Reportes',
      'Consulta de información',
      [leaf(ROUTES.REPORTS, <BarChartOutlined />, 'Reportes')]
    );

    switch (rolId) {
      case 1:
        return [
          dashboardAdmin,
          pacienteAdmin,
          expediente,
          consulta,
          formatos,
          administracionAdmin,
        ];

      case 2:
        return [
          dashboardMedico,
          pacienteMedico,
          expediente,
          consulta,
          formatos,
          administracionMedico,
        ];

      case 3:
        return [
          dashboardConsultor,
          pacienteConsultor,
          expediente,
          consulta,
          formatos,
          reportesConsultor,
        ];

      default:
        return [
          dashboardConsultor,
          pacienteConsultor,
          expediente,
          consulta,
          formatos,
          reportesConsultor,
        ];
    }
  }, [rolId, collapsed]);

  const activeMenuItem = useMemo(() => {
    return getActiveMenuItem(menuItems, location.pathname);
  }, [menuItems, location.pathname]);

  const selectedKey = activeMenuItem?.key || normalizeMenuPathname(location.pathname);
  const pageTitle = activeMenuItem?.title || 'Dashboard';

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
      sessionStorage.removeItem('hasSeenWelcome');
    } catch {
      // Evita romper la app si el navegador bloquea storage.
    }
  };

  const handleLogout = () => {
    try {
      limpiarEstadoClinicoTemporal();
      logout();

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

  const getRolName = () => {
    switch (rolId) {
      case 1:
        return 'Administrador';

      case 2:
        return 'Médico';

      case 3:
        return 'Consultor';

      default:
        return 'Usuario';
    }
  };

  const userMenuItems = [
    { key: 'profile', icon: <ProfileOutlined />, label: 'Mi perfil' },
    ...(rolId !== 3
      ? [{ key: 'settings', icon: <SettingOutlined />, label: 'Configuración' }]
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
            <HeartOutlined className="logo-icon" />
            {!collapsed && <span className="logo-text">MediSys</span>}
          </div>
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[String(selectedKey)]}
          openKeys={collapsed ? [] : openKeys}
          items={menuItems}
          className="custom-menu custom-menu-sectioned"
          onClick={({ key }) => handleMenuClick(String(key))}
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
            <Tooltip title="Notificaciones">
              <Badge count={3} size="small">
                <Button
                  type="text"
                  icon={<BellOutlined />}
                  className="notification-btn"
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
        visible={welcomeOpen}
        user={activeUser}
        onClose={() => setWelcomeOpen(false)}
      />
    </Layout>
  );
};

export default PrivateLayout;