import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Spin } from 'antd';
import {
  BulbOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  HeartOutlined,
  MedicineBoxOutlined,
  SettingOutlined,
  TeamOutlined,
  AuditOutlined,
} from '@ant-design/icons';

import welcomeService, {
  type WelcomeMetrics,
} from '../../services/welcome/welcome.service';
import useSystemConfig from '../../hooks/useSystemConfig';
import {
  getRoleGreeting,
  getRoleLabel,
  getUserRoleId,
  ROLE_IDS,
} from '../../utils/role.utils';
import './WelcomeModal.css';

export interface WelcomeModalProps {
  open?: boolean;
  visible?: boolean;
  isOpen?: boolean;
  show?: boolean;
  isVisible?: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onStart?: () => void;
  onContinue?: () => void;
  onStartWorking?: () => void;
  onConfirm?: () => void;
  onOk?: () => void;
  user?: any;
  usuario?: any;
  [key: string]: any;
}

const EMPTY_METRICS: WelcomeMetrics = {
  pacientesHoy: 0,
  proximasCitas: 0,
  pendientes: 0,
  consultasHoy: 0,
  recetasHoy: 0,
};

const parseStoredJson = (key: string) => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const getStoredUser = () =>
  parseStoredJson('user') ??
  parseStoredJson('usuario') ??
  parseStoredJson('auth_user') ??
  {};

const buildName = (user: any) => {
  const fullName = [
    user?.nombre ?? user?.name,
    user?.primerApellido ?? user?.primer_apellido,
    user?.segundoApellido ?? user?.segundo_apellido,
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return fullName || 'Usuario';
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

const getLongDate = () => {
  const text = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const getRolePresentation = (user: any) => {
  const roleId = getUserRoleId(user);
  const baseLabel = getRoleLabel(user);

  if (roleId === ROLE_IDS.MEDICO) {
    const specialty = String(
      user?.especialidad ?? user?.especialidadNombre ?? user?.especialidad_nombre ?? '',
    ).trim();

    return {
      label: specialty || baseLabel,
      icon: <MedicineBoxOutlined />,
    };
  }

  if (roleId === ROLE_IDS.ADMIN) {
    return { label: 'Administrador', icon: <SettingOutlined /> };
  }

  if (roleId === ROLE_IDS.AUDITOR) {
    return { label: 'Auditor', icon: <AuditOutlined /> };
  }

  return { label: baseLabel || 'Usuario', icon: <TeamOutlined /> };
};

export const WelcomeModal: React.FC<WelcomeModalProps> = (props) => {
  const systemConfig = useSystemConfig();
  const user = useMemo(
    () => props.user ?? props.usuario ?? getStoredUser(),
    [props.user, props.usuario],
  );

  const controlledOpen =
    props.open ?? props.visible ?? props.isOpen ?? props.show ?? props.isVisible;
  const [internalOpen, setInternalOpen] = useState<boolean>(controlledOpen ?? true);
  const [metrics, setMetrics] = useState<WelcomeMetrics>(EMPTY_METRICS);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [metricsError, setMetricsError] = useState(false);

  useEffect(() => {
    if (typeof controlledOpen === 'boolean') setInternalOpen(controlledOpen);
  }, [controlledOpen]);

  useEffect(() => {
    if (!internalOpen) return;
    let cancelled = false;

    const loadMetrics = async () => {
      setLoadingMetrics(true);
      setMetricsError(false);
      try {
        const next = await welcomeService.getMetrics(user);
        if (!cancelled) setMetrics(next);
      } catch (error) {
        console.error('No fue posible actualizar las métricas de bienvenida:', error);
        if (!cancelled) {
          setMetrics(EMPTY_METRICS);
          setMetricsError(true);
        }
      } finally {
        if (!cancelled) setLoadingMetrics(false);
      }
    };

    void loadMetrics();
    return () => {
      cancelled = true;
    };
  }, [internalOpen, user]);

  const close = () => {
    if (typeof controlledOpen !== 'boolean') setInternalOpen(false);
    const actionCallback =
      props.onStart ??
      props.onContinue ??
      props.onStartWorking ??
      props.onConfirm ??
      props.onOk;
    const closeCallback = props.onClose ?? props.onCancel;
    actionCallback?.();
    closeCallback?.();
  };

  const nombre = buildName(user);
  const roleId = getUserRoleId(user);
  const treatment = getRoleGreeting(user);
  const rolePresentation = getRolePresentation(user);
  const greetingTitle = `${getGreeting()}, ${treatment.salutation}`;
  const welcomeName =
    roleId === ROLE_IDS.MEDICO && treatment.prefix
      ? `${treatment.prefix} ${nombre}`
      : nombre;

  const renderValue = (value: number) =>
    loadingMetrics ? <Spin size="small" /> : <>{value}</>;

  return (
    <Modal
      open={internalOpen}
      centered
      footer={null}
      closable={false}
      maskClosable={false}
      keyboard
      width={620}
      className="welcome-real-modal"
      destroyOnHidden
      onCancel={close}
    >
      <div className="welcome-real-card">
        <div className="welcome-real-decoration welcome-real-decoration--top" />
        <div className="welcome-real-decoration welcome-real-decoration--left" />
        <div className="welcome-real-decoration welcome-real-decoration--center" />

        <div className="welcome-real-heading">
          <div className="welcome-real-main-icon">
            {systemConfig.logoDataUrl ? (
              <img
                src={systemConfig.logoDataUrl}
                alt={systemConfig.nombreCorto}
                className="welcome-system-logo-image"
              />
            ) : roleId === ROLE_IDS.ADMIN ? (
              <SettingOutlined />
            ) : roleId === ROLE_IDS.AUDITOR ? (
              <AuditOutlined />
            ) : (
              <MedicineBoxOutlined />
            )}
            <span><BulbOutlined /></span>
          </div>

          <div className="welcome-real-greeting">
            <h1>{greetingTitle}</h1>
            <div className="welcome-real-name-row">
              <strong>{nombre}</strong>
              <span className="welcome-real-role">
                {rolePresentation.icon} {rolePresentation.label}
              </span>
            </div>
          </div>
        </div>

        <div className="welcome-real-divider" />

        <div className="welcome-real-metrics">
          <div className="welcome-real-metric">
            <span className="welcome-real-metric-icon"><TeamOutlined /></span>
            <strong>{renderValue(metrics.pacientesHoy)}</strong>
            <small>Pacientes hoy</small>
          </div>

          <div className="welcome-real-metric">
            <span className="welcome-real-metric-icon"><CalendarOutlined /></span>
            <strong>{renderValue(metrics.proximasCitas)}</strong>
            <small>Próximas citas</small>
          </div>

          <div className="welcome-real-metric">
            <span className="welcome-real-metric-icon"><CheckCircleOutlined /></span>
            <strong>{renderValue(metrics.pendientes)}</strong>
            <small>Pendientes hoy</small>
          </div>
        </div>

        <div className="welcome-real-message">
          <strong><HeartOutlined /> ¡Qué gusto verte, {welcomeName}!</strong>
          <span>Hoy es {getLongDate()}</span>
          {metricsError && (
            <small>No fue posible actualizar las métricas. Puedes continuar normalmente.</small>
          )}
        </div>

        <div className="welcome-real-actions">
          <button type="button" className="welcome-real-start" onClick={close}>
            <HeartOutlined />
            <span>Comenzar a trabajar</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default WelcomeModal;
