import React, { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Input,
  Row,
  Space,
  Typography,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  ToolOutlined,
  PlusOutlined,
  MinusOutlined,
  SearchOutlined,
  CalendarOutlined,
  ClearOutlined,
  CheckCircleOutlined,
  UserOutlined,
  IdcardOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

import type { PacienteData } from '../../services/pacientes/pacientes.service';

import './Procedimientos.css';

const { Title, Text } = Typography;

const PACIENTE_ATENCION_STORAGE_KEY = 'paciente_atencion_actual';

type Procedimiento = {
  id: number;
  nombre: string;
  cantidad: number;
};

const procedimientosBase: Procedimiento[] = [
  { id: 1, nombre: 'Aplicación de inyección', cantidad: 0 },
  { id: 2, nombre: 'Colocación y retiro de implantes', cantidad: 0 },
  { id: 3, nombre: 'Control de embarazo', cantidad: 0 },
  { id: 4, nombre: 'Control de niño sano', cantidad: 0 },
  { id: 5, nombre: 'Curación', cantidad: 0 },
  { id: 6, nombre: 'Extracción de cuerpo extraño', cantidad: 0 },
  { id: 7, nombre: 'Glucometría', cantidad: 0 },
  { id: 8, nombre: 'Lavado nasal', cantidad: 0 },
  { id: 9, nombre: 'Lavado ótico', cantidad: 0 },
  { id: 10, nombre: 'Medicina preventiva y promoción de la salud', cantidad: 0 },
  { id: 11, nombre: 'Nebulización', cantidad: 0 },
  { id: 12, nombre: 'Onicocriptosis', cantidad: 0 },
  { id: 13, nombre: 'Perforación para colocación de arete', cantidad: 0 },
  { id: 14, nombre: 'Planificación familiar', cantidad: 0 },
  { id: 15, nombre: 'Resección de lipoma', cantidad: 0 },
  { id: 16, nombre: 'Retiro de puntos', cantidad: 0 },
  { id: 17, nombre: 'Retiro de sondas', cantidad: 0 },
  { id: 18, nombre: 'Retiro de verrugas', cantidad: 0 },
  { id: 19, nombre: 'Retiro y/o revisión de DIU', cantidad: 0 },
  { id: 20, nombre: 'Sutura', cantidad: 0 },
  { id: 21, nombre: 'Toma de oximetría', cantidad: 0 },
  { id: 22, nombre: 'Toma de peso y talla en acompañantes', cantidad: 0 },
  { id: 23, nombre: 'Toma de presión arterial', cantidad: 0 },
  { id: 24, nombre: 'Toma de muestras', cantidad: 0 },
];

const cargarPacienteAtencion = (): PacienteData | null => {
  try {
    const data = localStorage.getItem(PACIENTE_ATENCION_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

const limpiarPacienteActivo = () => {
  try {
    localStorage.removeItem(PACIENTE_ATENCION_STORAGE_KEY);
  } catch {
    // Evita romper la app si el navegador bloquea localStorage.
  }
};

const getFullName = (paciente: PacienteData) =>
  `${paciente.nombre || ''} ${paciente.primer_apellido || ''} ${
    paciente.segundo_apellido || ''
  }`
    .replace(/\s+/g, ' ')
    .trim();

const Procedimientos: React.FC = () => {
  const navigate = useNavigate();

  const [pacienteActual, setPacienteActual] = useState<PacienteData | null>(() =>
    cargarPacienteAtencion(),
  );

  const [procedimientos, setProcedimientos] =
    useState<Procedimiento[]>(procedimientosBase);

  const [busqueda, setBusqueda] = useState('');

  const fechaActual = new Date().toLocaleDateString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const totalSeleccionado = useMemo(
    () => procedimientos.reduce((acc, item) => acc + item.cantidad, 0),
    [procedimientos],
  );

  const tiposSeleccionados = useMemo(
    () => procedimientos.filter((item) => item.cantidad > 0).length,
    [procedimientos],
  );

  const procedimientosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return procedimientos;

    return procedimientos.filter((item) =>
      item.nombre.toLowerCase().includes(texto),
    );
  }, [busqueda, procedimientos]);

  const cambiarCantidad = (id: number, tipo: 'sumar' | 'restar') => {
    setProcedimientos((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const nuevaCantidad =
          tipo === 'sumar'
            ? item.cantidad + 1
            : Math.max(0, item.cantidad - 1);

        return {
          ...item,
          cantidad: nuevaCantidad,
        };
      }),
    );
  };

  const guardarProcedimientos = () => {
    if (!pacienteActual?.id) {
      message.warning('Primero selecciona un paciente desde Consulta.');
      navigate('/pacientes');
      return;
    }

    const seleccionados = procedimientos.filter((item) => item.cantidad > 0);

    if (seleccionados.length === 0) {
      message.warning('Selecciona al menos un procedimiento.');
      return;
    }

    const payload = {
      id_paciente: pacienteActual.id,
      paciente: {
        id: pacienteActual.id,
        nombre: getFullName(pacienteActual),
        numero_expediente: pacienteActual.numero_expediente || '',
      },
      procedimientos: seleccionados,
      total_procedimientos: totalSeleccionado,
      total_tipos: tiposSeleccionados,
      fecha_registro: new Date().toISOString(),
    };

    console.log('Procedimientos seleccionados:', payload);

    message.success(
      `Procedimientos registrados para ${getFullName(pacienteActual)}.`,
    );
  };

  const limpiarFormulario = () => {
    setProcedimientos(procedimientosBase);
    setBusqueda('');
  };

  const liberarPaciente = async () => {
    if (!pacienteActual) return;

    const result = await Swal.fire({
      icon: 'question',
      title: 'Finalizar atención',
      text: `El paciente ${getFullName(
        pacienteActual,
      )} dejará de estar activo para consulta y procedimientos.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, finalizar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ff4d4f',
      cancelButtonColor: '#94a3b8',
      reverseButtons: true,
      allowOutsideClick: false,
      allowEscapeKey: true,
    });

    if (!result.isConfirmed) return;

    limpiarPacienteActivo();
    setPacienteActual(null);
    setProcedimientos(procedimientosBase);
    setBusqueda('');

    await Swal.fire({
      icon: 'success',
      title: 'Paciente liberado',
      text: 'El paciente activo fue liberado correctamente.',
      confirmButtonColor: '#0f766e',
      timer: 1700,
      showConfirmButton: false,
    });

    navigate('/pacientes');
  };

  if (!pacienteActual) {
    return (
      <div className="procedimientos-page">
        <div className="procedimientos-shell">
          <div className="procedimientos-header">
            <div className="procedimientos-header-left">
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                className="procedimientos-back"
                onClick={() => navigate('/confirmar-atencion')}
              >
                Regresar
              </Button>

              <Space align="center" className="procedimientos-title-wrap">
                <div className="procedimientos-icon">
                  <ToolOutlined />
                </div>

                <div>
                  <Text className="procedimientos-kicker">
                    Expediente electrónico
                  </Text>

                  <Title level={2}>Procedimientos</Title>

                  <Text className="procedimientos-subtitle">
                    Primero selecciona un paciente desde el botón Consulta.
                  </Text>
                </div>
              </Space>
            </div>
          </div>

          <Card className="procedimientos-card">
            <Alert
              type="warning"
              showIcon
              message="No hay paciente seleccionado"
              description="Ve al módulo de Pacientes y da clic en Consulta sobre el paciente. Después regresa a Procedimientos y aparecerá aquí."
            />

            <div style={{ marginTop: 18 }}>
              <Button
                type="primary"
                icon={<UserOutlined />}
                onClick={() => navigate('/pacientes')}
              >
                Ir a Pacientes
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="procedimientos-page">
      <div className="procedimientos-shell">
        <div className="procedimientos-header">
          <div className="procedimientos-header-left">
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              className="procedimientos-back"
              onClick={() => navigate(-1)}
            >
              Regresar
            </Button>

            <Space align="center" className="procedimientos-title-wrap">
              <div className="procedimientos-icon">
                <ToolOutlined />
              </div>

              <div>
                <Text className="procedimientos-kicker">
                  Expediente electrónico
                </Text>

                <Title level={2}>Procedimientos</Title>

                <Text className="procedimientos-subtitle">
                  Registra los procedimientos clínicos realizados al paciente.
                </Text>
              </div>
            </Space>
          </div>

          <div className="procedimientos-date-card">
            <CalendarOutlined />

            <div>
              <span>Fecha de elaboración</span>
              <strong>{fechaActual}</strong>
            </div>
          </div>
        </div>

        <Card className="procedimientos-card">
          <div className="procedimientos-paciente-card">
            <div className="procedimientos-paciente-left">
              <div className="procedimientos-paciente-icon">
                <UserOutlined />
              </div>

              <div className="procedimientos-paciente-info">
                <span>Paciente seleccionado</span>

                <strong>{getFullName(pacienteActual)}</strong>

                <small>
                  <IdcardOutlined /> Exp.{' '}
                  {pacienteActual.numero_expediente || 'Sin expediente'}
                </small>
              </div>
            </div>

            <Button
              icon={<LogoutOutlined />}
              className="procedimientos-liberar-btn"
              onClick={liberarPaciente}
            >
              Finalizar atención
            </Button>
          </div>

          <Divider />

          <div className="procedimientos-toolbar">
            <div className="procedimientos-search-box">
              <span>Buscar procedimiento</span>

              <Input
                allowClear
                size="large"
                prefix={<SearchOutlined />}
                placeholder="Nombre del procedimiento..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="procedimientos-search"
              />
            </div>

            <div className="procedimientos-counters">
              <div className="procedimientos-counter">
                <span>Total</span>
                <strong>{totalSeleccionado}</strong>
              </div>

              <div className="procedimientos-counter procedimientos-counter-soft">
                <span>Tipos</span>
                <strong>{tiposSeleccionados}</strong>
              </div>
            </div>
          </div>

          <Divider />

          <Row gutter={[18, 18]}>
            {procedimientosFiltrados.map((item) => (
              <Col xs={24} md={12} xl={8} key={item.id}>
                <div
                  className={
                    item.cantidad > 0
                      ? 'procedimiento-item procedimiento-item-active'
                      : 'procedimiento-item'
                  }
                >
                  <div className="procedimiento-info">
                    <div className="procedimiento-number">
                      {item.id.toString().padStart(2, '0')}
                    </div>

                    <span>{item.nombre}</span>
                  </div>

                  <div className="procedimiento-actions">
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() => cambiarCantidad(item.id, 'restar')}
                      disabled={item.cantidad === 0}
                      aria-label="Restar procedimiento"
                    >
                      <MinusOutlined />
                    </button>

                    <div className="qty-value">{item.cantidad}</div>

                    <button
                      type="button"
                      className="qty-btn qty-plus"
                      onClick={() => cambiarCantidad(item.id, 'sumar')}
                      aria-label="Sumar procedimiento"
                    >
                      <PlusOutlined />
                    </button>
                  </div>
                </div>
              </Col>
            ))}
          </Row>

          {procedimientosFiltrados.length === 0 && (
            <div className="procedimientos-empty">
              No se encontraron procedimientos con ese nombre.
            </div>
          )}

          <div className="procedimientos-footer">
            <div className="procedimientos-footer-status">
              <CheckCircleOutlined />

              <span>{totalSeleccionado} procedimiento(s) seleccionado(s)</span>
            </div>

            <div className="procedimientos-footer-actions">
              <Button
                size="large"
                icon={<ClearOutlined />}
                onClick={limpiarFormulario}
              >
                Limpiar
              </Button>

              <Button
                type="primary"
                size="large"
                icon={<SaveOutlined />}
                onClick={guardarProcedimientos}
                disabled={totalSeleccionado === 0}
              >
                Guardar procedimientos
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Procedimientos;