import React, { useEffect, useState } from 'react';
import { Button, Tooltip } from 'antd';
import { CloudOutlined, DisconnectOutlined, SyncOutlined } from '@ant-design/icons';
import { getOfflineAuthorization, pendingOfflineCount, synchronizeOffline } from '../../services/offline/offline-sync.service';
import './OfflineStatus.css';

const OfflineStatus: React.FC = () => {
  const [online, setOnline] = useState(navigator.onLine); const [pending, setPending] = useState(0); const [syncing, setSyncing] = useState(false);
  const refresh = () => { setOnline(navigator.onLine); void pendingOfflineCount().then(setPending); };
  useEffect(() => { refresh(); window.addEventListener('online', refresh); window.addEventListener('offline', refresh); window.addEventListener('offline-queue-changed', refresh); window.addEventListener('offline-sync-finished', refresh); return () => { window.removeEventListener('online', refresh); window.removeEventListener('offline', refresh); window.removeEventListener('offline-queue-changed', refresh); window.removeEventListener('offline-sync-finished', refresh); }; }, []);
  const sync = async () => { setSyncing(true); try { await synchronizeOffline(); } finally { setSyncing(false); refresh(); } };
  const offlineAuth = getOfflineAuthorization();
  const offlineText = offlineAuth ? `Sin conexión · acceso hasta ${new Date(offlineAuth.expiresAt).toLocaleString()}` : 'Sin conexión · requiere revalidación';
  return <Tooltip title={online ? `${pending} operación(es) pendiente(s)` : offlineText}><Button className={`offline-status ${online ? 'online' : 'offline'}`} icon={online ? pending ? <SyncOutlined spin={syncing} /> : <CloudOutlined /> : <DisconnectOutlined />} onClick={() => online && void sync()}>{online ? pending ? `${pending} pendiente(s)` : 'Sincronizado' : offlineAuth ? 'Sin conexión' : 'Acceso vencido'}</Button></Tooltip>;
};
export default OfflineStatus;
