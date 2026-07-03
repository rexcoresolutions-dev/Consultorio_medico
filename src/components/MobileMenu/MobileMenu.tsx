import React, { useEffect, useMemo, useState } from 'react';
import { Drawer, Menu } from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  CalendarOutlined,
  FileTextOutlined,
  SettingOutlined,
  UserOutlined,
  ShopOutlined,
  BarChartOutlined,
  HeartOutlined,
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
  TeamOutlined,
} from '@ant-design/icons';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../router/routes';
import './MobileMenu.css';

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  onMenuClick: (key: string) => void;
}

type MenuItem = Required<MenuProps>['items'][number];

const isRouteKey = (key?: string) => Boolean(key && key.startsWith('/'));

const getUserFromStorage = () => {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    return (
      parsed?.data?.usuario ||
      parsed?.data?.user ||
      parsed?.usuario ||
      parsed?.user ||
      parsed
    );
  } catch {
    return null;
  }
};

const flattenMenuItems = (items: MenuItem[]): any[] => {
  return items.flatMap((item: any) => {
    if (item?.children?.length) {
      return flattenMenuItems(item.children);
    }

    return [item];
  });
};

const getActiveMenuItem = (items: MenuItem[], pathname: string) => {
  const leaves = flattenMenuItems(items).filter((item) =>
    isRouteKey(String(item?.key || ''))
  );

  const exact = leaves.find((item) => String(item.key) === pathname);

  if (exact) return exact;

  return leaves
    .filter((item) => {
      const key = String(item.key);
      return pathname.startsWith(`${key}/`);
    })
    .sort((a, b) => String(b.key).length - String(a.key).length)[0];
};

const getParentKeys = (
  items: MenuItem[],
  targetKey: string,
  parents: string[] = []
): string[] => {
  for (const item of items as any[]) {
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

const MobileMenu: React.FC<MobileMenuProps> = ({
  open,
  onClose,
  onMenuClick,
}) => {
  const location = useLocation();
  const { user } = useAuth();
  const [openKeys, setOpenKeys] = useState<string[]>([]);

  const activeUser = user || getUserFromStorage();
  const rolId = Number(
    (activeUser as any)?.rol_id || (activeUser as any)?.rolId || 0
  );

  const menuItems = useMemo<MenuItem[]>(() => {
    const leaf = (key: string, icon: React.ReactNode, label: string) => ({
      key,
      icon,
      title: label,
      label: <span className="mobile-nav-leaf-label">{label}</span>,
    });

    const section = (
      key: string,
      icon: React.ReactNode,
      label: string,
      description: string,
      children: MenuItem[]
    ) => ({
      key,
      icon,
      title: label,
      label: (
        <div className="mobile-nav-parent-label">
          <span>{label}</span>
          <small>{description}</small>
        </div>
      ),
      children,
    });

    const dashboard =
      rolId === 1
        ? leaf(ROUTES.DASHBOARD_ADMIN, <DashboardOutlined />, 'Dashboard')
        : rolId === 2
          ? leaf(ROUTES.DASHBOARD_MEDICO, <DashboardOutlined />, 'Dashboard')
          : leaf(ROUTES.DASHBOARD_CONSULTOR, <EyeOutlined />, 'Dashboard');

    const paciente =
      rolId === 3
        ? section(
            'mobile-section-paciente',
            <UserOutlined />,
            'Paciente',
            'Búsqueda y registro',
            [
              leaf(ROUTES.PATIENTS, <UserOutlined />, 'Pacientes'),
              leaf(
                ROUTES.CONFIRMAR_ATENCION,
                <FileTextOutlined />,
                'Registrar atención'
              ),
            ]
          )
        : section(
            'mobile-section-paciente',
            <UserOutlined />,
            'Paciente',
            'Registro y atención',
            [
              leaf(ROUTES.PATIENTS, <UserOutlined />, 'Pacientes'),
              leaf(
                ROUTES.CONFIRMAR_ATENCION,
                <FileTextOutlined />,
                'Registrar atención'
              ),
              leaf(
                ROUTES.PROCEDIMIENTOS,
                <MedicineBoxOutlined />,
                'Procedimientos'
              ),
            ]
          );

    const expediente = section(
      'mobile-section-expediente',
      <FolderOpenOutlined />,
      'Expediente',
      'Historia y evolución',
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
      'mobile-section-consulta',
      <MedicineBoxOutlined />,
      'Consulta',
      'Atención médica',
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
      'mobile-section-formatos',
      <FileDoneOutlined />,
      'Formatos',
      'Documentos y avisos',
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

    const administracion =
      rolId === 1
        ? section(
            'mobile-section-admin',
            <SettingOutlined />,
            'Administración',
            'Sistema',
            [
              leaf(ROUTES.CLINICS, <ShopOutlined />, 'Consultorios'),
              leaf(ROUTES.USERS, <TeamOutlined />, 'Usuarios'),
              leaf(ROUTES.REPORTS, <BarChartOutlined />, 'Reportes'),
              leaf(ROUTES.SETTINGS, <SettingOutlined />, 'Configuración'),
            ]
          )
        : rolId === 2
          ? section(
              'mobile-section-admin',
              <SettingOutlined />,
              'Administración',
              'Reportes y ajustes',
              [
                leaf(ROUTES.REPORTS, <BarChartOutlined />, 'Reportes'),
                leaf(ROUTES.SETTINGS, <SettingOutlined />, 'Configuración'),
              ]
            )
          : section(
              'mobile-section-reportes',
              <BarChartOutlined />,
              'Reportes',
              'Información',
              [leaf(ROUTES.REPORTS, <BarChartOutlined />, 'Reportes')]
            );

    return [dashboard, paciente, expediente, consulta, formatos, administracion];
  }, [rolId]);

  const activeMenuItem = useMemo(() => {
    return getActiveMenuItem(menuItems, location.pathname);
  }, [menuItems, location.pathname]);

  const selectedKey = activeMenuItem?.key || location.pathname;

  useEffect(() => {
    if (!open) return;

    const parents = getParentKeys(menuItems, String(selectedKey));
    setOpenKeys(parents);
  }, [menuItems, selectedKey, open]);

  const handleOpenChange = (keys: string[]) => {
    const latestOpenKey = keys.find((key) => !openKeys.includes(key));

    if (latestOpenKey) {
      setOpenKeys([latestOpenKey]);
      return;
    }

    setOpenKeys(keys);
  };

  const handleClick = (key: string) => {
    if (!isRouteKey(key)) return;

    onMenuClick(key);
    onClose();
  };

  return (
    <Drawer
      placement="left"
      open={open}
      onClose={onClose}
      width="min(88vw, 340px)"
      closable={false}
      rootClassName="mobile-drawer-root"
      className="mobile-drawer-custom"
      styles={{
        body: {
          padding: 0,
          overflow: 'hidden',
          background: '#0f4c4d',
        },
        content: {
          background: '#0f4c4d',
        },
      }}
    >
      <aside className="mobile-menu-panel">
        <div className="mobile-drawer-header">
          <div className="mobile-drawer-brand">
            <HeartOutlined className="mobile-drawer-logo" />

            <div>
              <span className="mobile-drawer-title">MediSys</span>
              <small>Consultorio médico</small>
            </div>
          </div>
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[String(selectedKey)]}
          openKeys={openKeys}
          items={menuItems}
          className="mobile-drawer-menu"
          onOpenChange={handleOpenChange}
          onClick={({ key }) => handleClick(String(key))}
        />
      </aside>
    </Drawer>
  );
};

export default MobileMenu;