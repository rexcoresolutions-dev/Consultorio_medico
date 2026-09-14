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
  AuditOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../router/routes';
import useSystemConfig from '../../hooks/useSystemConfig';
import { getUserRoleId } from '../../utils/role.utils';
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
  const systemConfig = useSystemConfig();

  const activeUser = user || getUserFromStorage();
  const rolId = getUserRoleId(activeUser);

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
        ? leaf(ROUTES.DASHBOARD_ADMIN, <DashboardOutlined />, 'Inicio')
        : rolId === 2
          ? leaf(ROUTES.DASHBOARD_MEDICO, <DashboardOutlined />, 'Inicio')
          : leaf(ROUTES.DASHBOARD_AUDITOR, <AuditOutlined />, 'Inicio');

    const paciente = section(
      'mobile-section-paciente',
      <UserOutlined />,
      'Paciente',
      'Registro y atención',
      [
        leaf(ROUTES.PATIENTS, <UserOutlined />, 'Pacientes'),
        leaf(ROUTES.CONFIRMAR_ATENCION, <FileTextOutlined />, 'Registrar atención'),
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
        ...(rolId === 1 || rolId === 2
          ? [leaf(ROUTES.PROCEDIMIENTOS, <MedicineBoxOutlined />, 'Procedimientos')]
          : []),
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
        : section(
            'mobile-section-admin',
            <BarChartOutlined />,
            'Administración',
            'Reportes',
            [leaf(ROUTES.REPORTS, <BarChartOutlined />, 'Reportes')]
          );

    const auditoria = leaf(ROUTES.AUDIT, <AuditOutlined />, 'Auditoría');
    const documentacionAuditor = section(
      'mobile-section-auditor-docs',
      <FileSearchOutlined />,
      'Documentación',
      'Consulta y reportes',
      [
        leaf(ROUTES.PRESCRIPTIONS, <FileTextOutlined />, 'Recetas emitidas'),
        leaf(ROUTES.CONTROL_DIARIO_PACIENTES, <TableOutlined />, 'Control diario'),
      ]
    );

    if (rolId === 3) {
      return [dashboard, auditoria, documentacionAuditor];
    }

    return [
      dashboard,
      paciente,
      expediente,
      consulta,
      ...(rolId === 1 ? [inventario] : []),
      formatos,
      administracion,
    ];
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
            {systemConfig.logoDataUrl ? (
              <img
                src={systemConfig.logoDataUrl}
                alt={systemConfig.nombreCorto}
                className="mobile-system-logo-image"
              />
            ) : (
              <HeartOutlined className="mobile-drawer-logo" />
            )}

            <div>
              <span className="mobile-drawer-title">{systemConfig.nombreCorto}</span>
              <small>{systemConfig.subtitulo}</small>
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