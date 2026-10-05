import React, { useEffect, useState } from 'react';
import { App, Button, Popconfirm, Table, Tag, Typography } from 'antd';
import { DeleteOutlined, ReloadOutlined, SyncOutlined } from '@ant-design/icons';
import { getOfflineScope, synchronizeOffline } from '../../services/offline/offline-sync.service';
import { listOfflineOperations, removeOfflineOperation, updateOfflineOperation, type OfflineOperation } from '../../services/offline/offline-store';
import './Sincronizacion.css';

const labels: Record<string, string> = { PACIENTE_CREAR: 'Nuevo paciente', CONSULTA_CREAR: 'Nueva consulta', RECETA_CREAR: 'Nueva receta', HISTORIA_CLINICA_CREAR: 'Historia clínica', CITA_CREAR: 'Nueva cita', INVENTARIO_CREAR: 'Medicamento', INVENTARIO_MOVIMIENTO: 'Movimiento de inventario' };
const Sincronizacion: React.FC = () => {
  const { message } = App.useApp(); const [rows, setRows] = useState<OfflineOperation[]>([]); const [syncing, setSyncing] = useState(false);
  const load = async () => { const scope = getOfflineScope(); setRows((await listOfflineOperations()).filter((row) => row.usuarioId === scope.usuarioId && row.empresaId === scope.empresaId).sort((a, b) => a.createdAt.localeCompare(b.createdAt))); };
  useEffect(() => { void load(); }, []);
  const sync = async () => { try { setSyncing(true); await synchronizeOffline(); message.success('Sincronización procesada.'); } catch (error: any) { message.warning(error?.message ?? 'No fue posible sincronizar.'); } finally { setSyncing(false); await load(); } };
  const retry = async (row: OfflineOperation) => { await updateOfflineOperation({ ...row, state: 'PENDING', error: undefined }); await sync(); };
  const discard = async (id: string) => { await removeOfflineOperation(id); message.success('Captura local descartada.'); await load(); };
  return <main className="sync-page"><div className="sync-heading"><div><Typography.Title level={2}>Sincronización offline</Typography.Title><Typography.Paragraph type="secondary">Revisa capturas pendientes, errores y conflictos de esta cuenta y empresa.</Typography.Paragraph></div><Button type="primary" icon={<SyncOutlined />} loading={syncing} onClick={sync}>Sincronizar ahora</Button></div><Table rowKey="id" dataSource={rows} pagination={false} locale={{ emptyText: 'No hay operaciones pendientes' }} columns={[{ title: 'Operación', dataIndex: 'type', render: (value) => labels[value] ?? value }, { title: 'Creada', dataIndex: 'createdAt', render: (value) => new Date(value).toLocaleString() }, { title: 'Estado', dataIndex: 'state', render: (value) => <Tag color={value === 'CONFLICT' ? 'red' : value === 'ERROR' ? 'orange' : 'blue'}>{value}</Tag> }, { title: 'Intentos', dataIndex: 'attempts' }, { title: 'Detalle', dataIndex: 'error', render: (value) => value || 'Pendiente de enviar' }, { title: 'Acciones', render: (_, row) => <><Button type="link" icon={<ReloadOutlined />} onClick={() => void retry(row)}>Reintentar</Button><Popconfirm title="¿Descartar esta captura local?" description="Esta acción elimina los datos pendientes y no se puede deshacer." okText="Descartar" cancelText="Cancelar" onConfirm={() => void discard(row.id)}><Button type="link" danger icon={<DeleteOutlined />}>Descartar</Button></Popconfirm></> }]} /></main>;
};
export default Sincronizacion;
