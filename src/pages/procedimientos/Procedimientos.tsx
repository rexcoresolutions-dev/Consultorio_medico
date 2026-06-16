import React, { useMemo, useState } from 'react';
import {
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
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import './Procedimientos.css';

const { Title, Text } = Typography;

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

const Procedimientos: React.FC = () => {
  const navigate = useNavigate();

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
    [procedimientos]
  );

  const procedimientosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return procedimientos;

    return procedimientos.filter((item) =>
      item.nombre.toLowerCase().includes(texto)
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
      })
    );
  };

  const guardarProcedimientos = () => {
    const seleccionados = procedimientos.filter((item) => item.cantidad > 0);

    if (seleccionados.length === 0) {
      message.warning('Selecciona al menos un procedimiento.');
      return;
    }

    console.log('Procedimientos seleccionados:', seleccionados);

    message.success('Procedimientos registrados correctamente.');
  };

  const limpiarFormulario = () => {
    setProcedimientos(procedimientosBase);
    setBusqueda('');
  };

  return (
    <div className="procedimientos-page">
      <div className="procedimientos-shell">
        <div className="procedimientos-header">
          <div>
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
                <Title level={2}>Procedimientos</Title>
                <Text>
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
          <div className="procedimientos-toolbar">
            <Input
              allowClear
              size="large"
              prefix={<SearchOutlined />}
              placeholder="Buscar procedimiento..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="procedimientos-search"
            />

            <div className="procedimientos-counter">
              <span>Total seleccionado</span>
              <strong>{totalSeleccionado}</strong>
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
                    <span>{item.nombre}</span>
                  </div>

                  <div className="procedimiento-actions">
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() => cambiarCantidad(item.id, 'restar')}
                      disabled={item.cantidad === 0}
                    >
                      <MinusOutlined />
                    </button>

                    <div className="qty-value">{item.cantidad}</div>

                    <button
                      type="button"
                      className="qty-btn qty-plus"
                      onClick={() => cambiarCantidad(item.id, 'sumar')}
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
            <Button size="large" onClick={limpiarFormulario}>
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
        </Card>
      </div>
    </div>
  );
};

export default Procedimientos;