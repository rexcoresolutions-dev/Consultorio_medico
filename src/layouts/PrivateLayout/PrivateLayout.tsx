import React, { useEffect, useState } from 'react';
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
} from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import MobileMenu from '../../components/MobileMenu/MobileMenu';
import WelcomeModal from '../../components/Auth/WelcomeModal';
import UserService from '../../services/user/user.service';
import './PrivateLayout.css';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const PACIENTE_ATENCION_STORAGE_KEY = 'paciente_atencion_actual';
const CONSULTA_EXTERNA_ABIERTA_STORAGE_KEY = 'consulta_externa_abierta';

const PrivateLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

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

  const menuAdmin = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/clinicas', icon: <ShopOutlined />, label: 'Consultorios' },
    { key: '/usuarios', icon: <TeamOutlined />, label: 'Usuarios' },
    { key: '/pacientes', icon: <UserOutlined />, label: 'Pacientes' },
    { key: '/confirmar-atencion', icon: <FileTextOutlined />, label: 'Registrar atención' },
    { key: '/historial-clinico', icon: <HistoryOutlined />, label: 'Historial clínico' },
    { key: '/historiales-disponibles', icon: <FolderOpenOutlined />, label: 'Historiales disponibles' },
    { key: '/nota-evolucion', icon: <FormOutlined />, label: 'Nota de evolución' },
    { key: '/historico-paciente', icon: <HistoryOutlined />, label: 'Histórico por paciente' },
    { key: '/hoja-referencia', icon: <MedicineBoxOutlined />, label: 'Hoja de referencia' },
    { key: '/estudios-clinicos', icon: <ExperimentOutlined />, label: 'Estudios clínicos' },
    { key: '/certificado-medico', icon: <SolutionOutlined />, label: 'Certificado médico' },
    { key: '/control-diario-pacientes', icon: <TableOutlined />, label: 'Control diario' },
    { key: '/citas', icon: <CalendarOutlined />, label: 'Citas' },
    { key: '/recetas', icon: <FileTextOutlined />, label: 'Recetas' },
    { key: '/reportes', icon: <BarChartOutlined />, label: 'Reportes' },
    { key: '/configuracion', icon: <SettingOutlined />, label: 'Configuración' },
  ];

  const menuMedico = [
    { key: '/dashboard-medico', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/confirmar-atencion', icon: <FileTextOutlined />, label: 'Procedimientos' },
    { key: '/historial-clinico', icon: <HistoryOutlined />, label: 'Historial clínico' },
    { key: '/historiales-disponibles', icon: <FolderOpenOutlined />, label: 'Historiales disponibles' },
    { key: '/nota-evolucion', icon: <FormOutlined />, label: 'Nota de evolución' },
    { key: '/historico-paciente', icon: <HistoryOutlined />, label: 'Histórico por paciente' },
    { key: '/hoja-referencia', icon: <MedicineBoxOutlined />, label: 'Hoja de referencia' },
    { key: '/estudios-clinicos', icon: <ExperimentOutlined />, label: 'Estudios clínicos' },
    { key: '/certificado-medico', icon: <SolutionOutlined />, label: 'Certificado médico' },
    { key: '/control-diario-pacientes', icon: <TableOutlined />, label: 'Control diario' },
    { key: '/citas', icon: <CalendarOutlined />, label: 'Citas' },
    { key: '/recetas', icon: <FileTextOutlined />, label: 'Recetas' },
    { key: '/reportes', icon: <BarChartOutlined />, label: 'Reportes' },
    { key: '/configuracion', icon: <SettingOutlined />, label: 'Configuración' },
  ];

  const menuConsultor = [
    { key: '/dashboard-consultor', icon: <EyeOutlined />, label: 'Dashboard' },
    { key: '/pacientes', icon: <UserOutlined />, label: 'Pacientes' },
    { key: '/confirmar-atencion', icon: <FileTextOutlined />, label: 'Registrar atención' },
    { key: '/historial-clinico', icon: <HistoryOutlined />, label: 'Historial clínico' },
    { key: '/historiales-disponibles', icon: <FolderOpenOutlined />, label: 'Historiales disponibles' },
    { key: '/nota-evolucion', icon: <FormOutlined />, label: 'Nota de evolución' },
    { key: '/historico-paciente', icon: <HistoryOutlined />, label: 'Histórico por paciente' },
    { key: '/hoja-referencia', icon: <MedicineBoxOutlined />, label: 'Hoja de referencia' },
    { key: '/estudios-clinicos', icon: <ExperimentOutlined />, label: 'Estudios clínicos' },
    { key: '/certificado-medico', icon: <SolutionOutlined />, label: 'Certificado médico' },
    { key: '/control-diario-pacientes', icon: <TableOutlined />, label: 'Control diario' },
    { key: '/citas', icon: <CalendarOutlined />, label: 'Citas' },
    { key: '/recetas', icon: <FileTextOutlined />, label: 'Recetas' },
    { key: '/reportes', icon: <BarChartOutlined />, label: 'Reportes' },
  ];

  const getMenuItems = () => {
    switch (rolId) {
      case 1:
        return menuAdmin;
      case 2:
        return menuMedico;
      case 3:
        return menuConsultor;
      default:
        return menuConsultor;
    }
  };

  const menuItems = getMenuItems();

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
    navigate(key);
    setMobileMenuOpen(false);
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
    { key: 'logout', danger: true, icon: <LogoutOutlined />, label: 'Cerrar sesión' },
  ];

  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'profile') {
      navigate('/perfil');
      return;
    }

    if (key === 'settings') {
      navigate('/configuracion');
      return;
    }

    if (key === 'logout') {
      showLogoutConfirm();
    }
  };

  const selectedKey =
    menuItems.find((item) => location.pathname.startsWith(String(item.key)))?.key ||
    location.pathname;

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
          items={menuItems}
          className="custom-menu"
          onClick={({ key }) => handleMenuClick(key)}
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
              <Text strong>
                {menuItems.find((item) => item.key === selectedKey)?.label || 'Dashboard'}
              </Text>
            </div>
          </div>

          <div className="header-right">
            <Tooltip title="Notificaciones">
              <Badge count={3} size="small">
                <Button type="text" icon={<BellOutlined />} className="notification-btn" />
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
                    background: 'linear-gradient(135deg, #50EBEC 0%, #36C6C7 100%)',
                  }}
                />

                <div className="user-text-info">
                  <div className="user-name">
                    {activeUser?.nombre || 'Usuario'} {activeUser?.primer_apellido || ''}
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