import React, { useEffect, useState } from 'react';
import { App, Button, List, Spin, Tabs, Tag, Typography } from 'antd';
import { CheckOutlined, MailOutlined } from '@ant-design/icons';
import axiosInstance from '../../api/axios.config';
import { getUserRoleId } from '../../utils/role.utils';
import './Notificaciones.css';

const unwrap = (response: any) => response?.data?.data ?? response?.data;
const Notificaciones: React.FC = () => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const role = getUserRoleId(JSON.parse(localStorage.getItem('user') || '{}'));
  const privileged = [1, 4].includes(role);
  const load = async () => {
    setLoading(true);
    try {
      const mine = unwrap(await axiosInstance.get('/notificaciones/mias'));
      setItems(mine?.data ?? []);
      if (privileged) setHistory(unwrap(await axiosInstance.get('/notificaciones/historial-envios'))?.data ?? []);
    } catch { message.error('No fue posible cargar las notificaciones.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const mark = async (id: string) => { await axiosInstance.patch(`/notificaciones/${id}/leer`); await load(); };
  const markAll = async () => { await axiosInstance.patch('/notificaciones/leer-todas'); await load(); };
  const retry = async (id: string) => { try { await axiosInstance.post(`/correo-envios/${id}/reintentar`); message.success('Reintento procesado.'); await load(); } catch (error: any) { message.error(error?.response?.data?.message ?? 'No fue posible reintentar el envío.'); } };
  const inbox = <><Button icon={<CheckOutlined />} onClick={markAll}>Marcar todas como leídas</Button><List dataSource={items} locale={{ emptyText: 'No tienes notificaciones' }} renderItem={(item) => <List.Item actions={!item.leidaAt ? [<Button type="link" onClick={() => void mark(item.id)}>Marcar leída</Button>] : []}><List.Item.Meta avatar={<MailOutlined />} title={item.titulo} description={<><Typography.Text>{item.resumen}</Typography.Text><br/><Typography.Text type="secondary">{new Date(item.createdAt).toLocaleString()}</Typography.Text></>} /></List.Item>} /></>;
  const sent = <List dataSource={history} locale={{ emptyText: 'No hay envíos registrados' }} renderItem={(item) => <List.Item actions={!['ACEPTADO_SMTP', 'PROCESANDO'].includes(item.estado) ? [<Button onClick={() => void retry(item.id)}>Reintentar</Button>] : []}><List.Item.Meta title={item.asunto} description={`${item.destinatario} · ${new Date(item.createdAt).toLocaleString()}`} /><Tag color={item.estado === 'ACEPTADO_SMTP' ? 'green' : item.estado === 'FALLIDO' ? 'red' : 'gold'}>{item.estado}</Tag></List.Item>} />;
  return <main className="notifications-page"><Typography.Title level={2}>Notificaciones</Typography.Title><Typography.Paragraph type="secondary">Avisos personales y estado de los correos de la empresa.</Typography.Paragraph><Spin spinning={loading}><Tabs items={[{ key: 'mine', label: 'Mis notificaciones', children: inbox }, ...(privileged ? [{ key: 'history', label: 'Historial de envíos', children: sent }] : [])]} /></Spin></main>;
};
export default Notificaciones;
