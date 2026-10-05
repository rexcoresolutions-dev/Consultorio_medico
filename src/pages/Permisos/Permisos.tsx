import React, { useEffect, useMemo, useState } from 'react';
import { Button, Empty, Spin, Switch, Typography, message } from 'antd';
import { EditOutlined, LockOutlined, SaveOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import axiosInstance from '../../api/axios.config';
import './Permisos.css';

type Permission = { id: number; clave: string; modulo: string; accion: string; descripcion?: string };
type ProfilePermission = { rolId: number; permisoId: number; permitido: boolean; alcance: 'PROPIO' | 'SUCURSAL' | 'EMPRESA' };
type RoleDefinition = { id: number; name: string; description: string; locked?: boolean };

const ROLES: RoleDefinition[] = [
  { id: 4, name: 'Superadministrador', description: 'Control global de todas las empresas.', locked: true },
  { id: 1, name: 'Administrador', description: 'Administración completa de su empresa.', locked: true },
  { id: 2, name: 'Doctor', description: 'Atención clínica según los módulos autorizados.' },
  { id: 3, name: 'Auditor', description: 'Consulta de información y trazabilidad.' },
];

const defaultAllowed = (roleId: number, key: string) => {
  if (roleId === 1 || roleId === 4) return true;
  if (roleId === 2) return !key.startsWith('inventario.') && key !== 'modulo.inventario.acceder' && key !== 'modulo.auditoria.acceder';
  if (roleId === 3) return [
    'modulo.inicio.acceder', 'modulo.auditoria.acceder', 'modulo.control_diario.acceder',
    'control_diario.ver', 'recetas.ver', 'modulo.reportes.acceder', 'reportes.ver', 'reportes.exportar',
  ].includes(key);
  return false;
};

const unwrap = (response: any) => response?.data?.data ?? response?.data ?? response;

const Permisos: React.FC = () => {
  const [catalog, setCatalog] = useState<Permission[]>([]);
  const [profiles, setProfiles] = useState<ProfilePermission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState(2);
  const [values, setValues] = useState<Record<number, boolean>>({});
  const [initialValues, setInitialValues] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const selectedRole = ROLES.find((role) => role.id === selectedRoleId) ?? ROLES[0];

  useEffect(() => {
    Promise.all([axiosInstance.get('/permisos/catalogo'), axiosInstance.get('/permisos/perfiles')])
      .then(([catalogResponse, profilesResponse]) => {
        setCatalog(unwrap(catalogResponse) ?? []);
        setProfiles(unwrap(profilesResponse) ?? []);
      })
      .catch(() => message.error('No se pudo cargar la configuración de permisos'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!catalog.length) return;
    const configured = new Map(profiles.filter((item) => item.rolId === selectedRoleId).map((item) => [item.permisoId, item.permitido]));
    const next = Object.fromEntries(catalog.map((permission) => [
      permission.id,
      selectedRole.locked ? true : configured.get(permission.id) ?? defaultAllowed(selectedRoleId, permission.clave),
    ]));
    setValues(next);
    setInitialValues(next);
  }, [catalog, profiles, selectedRoleId, selectedRole.locked]);

  const grouped = useMemo(() => {
    const result = new Map<string, Permission[]>();
    catalog.forEach((permission) => result.set(permission.modulo, [...(result.get(permission.modulo) ?? []), permission]));
    return [...result.entries()];
  }, [catalog]);

  const dirtyIds = useMemo(
    () => catalog.filter((permission) => values[permission.id] !== initialValues[permission.id]).map((permission) => permission.id),
    [catalog, initialValues, values],
  );

  const roleActiveCount = (role: RoleDefinition) => catalog.filter((permission) => {
    if (role.id === selectedRoleId) return values[permission.id];
    const configured = profiles.find((item) => item.rolId === role.id && item.permisoId === permission.id);
    return role.locked || configured?.permitido || (configured === undefined && defaultAllowed(role.id, permission.clave));
  }).length;

  const save = async () => {
    if (selectedRole.locked || !dirtyIds.length) return;
    setSaving(true);
    try {
      await Promise.all(dirtyIds.map((permissionId) => axiosInstance.put('/permisos/perfiles', {
        rolId: selectedRoleId, permisoId: permissionId, permitido: values[permissionId], alcance: 'SUCURSAL',
      })));
      setProfiles((current) => {
        const changed = new Set(dirtyIds);
        return [
          ...current.filter((item) => item.rolId !== selectedRoleId || !changed.has(item.permisoId)),
          ...dirtyIds.map((permissionId) => ({ rolId: selectedRoleId, permisoId: permissionId, permitido: values[permissionId], alcance: 'SUCURSAL' as const })),
        ];
      });
      setInitialValues({ ...values });
      message.success(`Permisos de ${selectedRole.name} guardados`);
    } catch { message.error('No fue posible guardar todos los permisos'); }
    finally { setSaving(false); }
  };

  return <div className="role-permissions-page">
    <div className="role-permissions-heading">
      <Typography.Title level={2}>Permisos por rol</Typography.Title>
      <Typography.Text type="secondary">Define qué módulos y funciones puede utilizar cada rol dentro de la empresa activa.</Typography.Text>
    </div>
    <Spin spinning={loading}>
      <div className="role-permissions-layout">
        <aside className="roles-panel">
          <div className="roles-panel-title"><SafetyCertificateOutlined /><div><strong>Roles del sistema</strong><span>Selecciona uno para configurar.</span></div></div>
          {ROLES.map((role) => <button key={role.id} className={`role-card ${selectedRoleId === role.id ? 'active' : ''}`} onClick={() => setSelectedRoleId(role.id)}>
            <div className="role-card-name"><strong>{role.name}</strong>{role.locked ? <LockOutlined /> : <EditOutlined />}</div>
            <span>{role.description}</span><small>{roleActiveCount(role)} DE {catalog.length} PERMISOS ACTIVOS</small>
          </button>)}
        </aside>
        <main className="permissions-panel">
          <header className="permissions-panel-header">
            <div><h2>{selectedRole.name}</h2><p>{selectedRole.locked ? 'Este rol tiene acceso total y sus permisos están protegidos.' : 'Activa únicamente las funciones que este rol necesita.'}</p></div>
            {!selectedRole.locked && <Button type="primary" icon={<SaveOutlined />} loading={saving} disabled={!dirtyIds.length} onClick={() => void save()}>Guardar permisos{dirtyIds.length ? ` (${dirtyIds.length})` : ''}</Button>}
          </header>
          {!catalog.length && !loading ? <Empty description="No hay permisos configurados" /> : grouped.map(([module, permissions]) => {
            const enabled = permissions.filter((permission) => values[permission.id]).length;
            return <section className="permission-module" key={module}>
              <div className="permission-module-heading"><strong>{module}</strong><span>{enabled}/{permissions.length} activos</span></div>
              <div className="permission-grid">{permissions.map((permission) => <div className={`permission-card ${values[permission.id] ? 'enabled' : ''}`} key={permission.id}>
                <div><strong>{permission.accion}</strong><span>{permission.descripcion || permission.clave}</span></div>
                <Switch checked={Boolean(values[permission.id])} disabled={selectedRole.locked} onChange={(checked) => setValues((current) => ({ ...current, [permission.id]: checked }))} />
              </div>)}</div>
            </section>;
          })}
        </main>
      </div>
    </Spin>
  </div>;
};

export default Permisos;
