import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  DatePicker,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import {
  ArrowDownOutlined,
  ArrowLeftOutlined,
  ArrowUpOutlined,
  BarChartOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  EditOutlined,
  EyeOutlined,
  GlobalOutlined,
  HistoryOutlined,
  MedicineBoxOutlined,
  MinusOutlined,
  PlusOutlined,
  SearchOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

import {
  PROCEDIMIENTOS_UPDATED_EVENT,
  getLocalDayKey,
  type MovimientoProcedimiento,
  type ProcedimientoCatalogo,
  type ResumenDiarioProcedimientos,
  procedimientosService,
} from '../../services/procedimientos/procedimientos.service';
import './Procedimientos.css';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type CatalogoFormValues = {
  nombre: string;
  descripcion?: string;
  activo?: boolean;
};

type CorreccionFormValues = {
  motivo: string;
};

const normalizarTexto = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { fecha: '-', hora: '-' };

  return {
    fecha: new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date),
    hora: new Intl.DateTimeFormat('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date),
  };
};

const formatDayKey = (dayKey: string, long = false) => {
  if (!dayKey) return '-';
  const [year, month, day] = dayKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return dayKey;
  return new Intl.DateTimeFormat('es-MX', long
    ? { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' }
  ).format(date);
};

const Procedimientos: React.FC = () => {
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [catalogForm] = Form.useForm<CatalogoFormValues>();
  const [correctionForm] = Form.useForm<CorreccionFormValues>();

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activo' | 'inactivo'>('activo');
  const [procedimientos, setProcedimientos] = useState<ProcedimientoCatalogo[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoProcedimiento[]>([]);
  const [todayKey, setTodayKey] = useState(getLocalDayKey());

  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [editingProcedure, setEditingProcedure] = useState<ProcedimientoCatalogo | null>(null);
  const [correctionProcedure, setCorrectionProcedure] = useState<ProcedimientoCatalogo | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTab, setHistoryTab] = useState('dias');
  const [selectedDay, setSelectedDay] = useState<ResumenDiarioProcedimientos | null>(null);

  const [historySearch, setHistorySearch] = useState('');
  const [historyType, setHistoryType] = useState<'todos' | 'registro' | 'correccion' | 'saldo_inicial'>('todos');
  const [historyRange, setHistoryRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const reload = async () => {
    try {
    await procedimientosService.load();
    setProcedimientos(procedimientosService.getCatalogo());
    setMovimientos(procedimientosService.getMovimientos());
    } catch { messageApi.error("No fue posible cargar los procedimientos del servidor."); }
  };

  useEffect(() => {
    reload();
    const onUpdated = () => reload();
    window.addEventListener(PROCEDIMIENTOS_UPDATED_EVENT, onUpdated);

    const interval = window.setInterval(() => {
      const currentDay = getLocalDayKey();
      setTodayKey((previous) => (previous === currentDay ? previous : currentDay));
    }, 60_000);

    return () => {
      window.removeEventListener(PROCEDIMIENTOS_UPDATED_EVENT, onUpdated);
      window.clearInterval(interval);
    };
  }, []);

  const cantidadesHoy = useMemo(() => {
    const result: Record<number, number> = {};
    procedimientos.forEach((item) => {
      result[item.id] = Math.max(
        0,
        movimientos
          .filter(
            (mov) =>
              mov.procedimiento_id === item.id && getLocalDayKey(mov.fecha) === todayKey,
          )
          .reduce((total, mov) => total + mov.cantidad, 0),
      );
    });
    return result;
  }, [procedimientos, movimientos, todayKey]);

  const historicoPorProcedimiento = useMemo(() => {
    const result: Record<number, number> = {};
    procedimientos.forEach((item) => {
      result[item.id] = Math.max(
        0,
        movimientos
          .filter((mov) => mov.procedimiento_id === item.id)
          .reduce((total, mov) => total + mov.cantidad, 0),
      );
    });
    return result;
  }, [procedimientos, movimientos]);

  const procedimientosFiltrados = useMemo(() => {
    const termino = normalizarTexto(busqueda);
    return procedimientos.filter((item) => {
      const coincideTexto =
        !termino || normalizarTexto(`${item.nombre} ${item.descripcion}`).includes(termino);
      const coincideEstado = filtroEstado === 'todos' || item.estado === filtroEstado;
      return coincideTexto && coincideEstado;
    });
  }, [busqueda, filtroEstado, procedimientos]);

  const resumenHoy = useMemo(() => {
    const dayMovements = movimientos.filter((item) => getLocalDayKey(item.fecha) === todayKey);
    const netByProcedure = new Map<number, number>();
    dayMovements.forEach((item) => {
      netByProcedure.set(
        item.procedimiento_id,
        (netByProcedure.get(item.procedimiento_id) ?? 0) + item.cantidad,
      );
    });
    return {
      total: [...netByProcedure.values()].reduce((sum, value) => sum + Math.max(0, value), 0),
      tipos: [...netByProcedure.values()].filter((value) => value > 0).length,
      movimientos: dayMovements.length,
    };
  }, [movimientos, todayKey]);

  const resumenesDiarios = useMemo(() => procedimientosService.getResumenesDiarios(), [movimientos]);

  const totalHistorico = useMemo(
    () => Math.max(0, movimientos.reduce((sum, item) => sum + item.cantidad, 0)),
    [movimientos],
  );

  const diasConActividad = useMemo(
    () => resumenesDiarios.filter((item) => item.total > 0).length,
    [resumenesDiarios],
  );

  const diaMasActivo = useMemo(
    () => resumenesDiarios.reduce<ResumenDiarioProcedimientos | null>(
      (best, item) => (!best || item.total > best.total ? item : best),
      null,
    ),
    [resumenesDiarios],
  );

  const ultimos7Dias = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return movimientos
      .filter((item) => {
        const value = new Date(item.fecha).getTime();
        return value >= start.getTime() && value <= today.getTime();
      })
      .reduce((sum, item) => sum + item.cantidad, 0);
  }, [movimientos, todayKey]);

  const correccionesAcumuladas = useMemo(
    () => Math.abs(
      movimientos
        .filter((item) => item.cantidad < 0)
        .reduce((sum, item) => sum + item.cantidad, 0),
    ),
    [movimientos],
  );

  const historyFiltered = useMemo(() => {
    const term = normalizarTexto(historySearch);
    const start = historyRange?.[0]?.startOf('day').valueOf();
    const end = historyRange?.[1]?.endOf('day').valueOf();

    return movimientos.filter((item) => {
      const dateValue = new Date(item.fecha).getTime();
      const matchesText =
        !term ||
        normalizarTexto(
          `${item.procedimiento_nombre} ${item.motivo} ${item.usuario_nombre} ${item.sucursal_nombre}`,
        ).includes(term);
      const matchesType = historyType === 'todos' || item.tipo === historyType;
      const matchesStart = start === undefined || dateValue >= start;
      const matchesEnd = end === undefined || dateValue <= end;
      return matchesText && matchesType && matchesStart && matchesEnd;
    });
  }, [historySearch, historyType, historyRange, movimientos]);

  const dailyFiltered = useMemo(() => {
    const start = historyRange?.[0]?.startOf('day').valueOf();
    const end = historyRange?.[1]?.endOf('day').valueOf();
    const term = normalizarTexto(historySearch);

    return resumenesDiarios.filter((item) => {
      const [year, month, day] = item.fecha.split('-').map(Number);
      const time = new Date(year, month - 1, day).getTime();
      const text = normalizarTexto(
        `${item.procedimiento_principal} ${item.detalle.map((detail) => detail.procedimiento_nombre).join(' ')}`,
      );
      return (
        (!term || text.includes(term)) &&
        (start === undefined || time >= start) &&
        (end === undefined || time <= end)
      );
    });
  }, [resumenesDiarios, historySearch, historyRange]);

  const addProcedureRecord = async (item: ProcedimientoCatalogo) => {
    try {
      await procedimientosService.registrarMovimiento({
        procedimientoId: item.id,
        cantidad: 1,
        tipo: 'registro',
        motivo: 'Procedimiento realizado',
      });
      reload();
      messageApi.success(`${item.nombre}: registrado en la jornada de hoy`);
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : 'No fue posible registrar el procedimiento.');
    }
  };

  const openCorrection = (item: ProcedimientoCatalogo) => {
    if ((cantidadesHoy[item.id] ?? 0) <= 0) return;
    correctionForm.resetFields();
    setCorrectionProcedure(item);
  };

  const confirmCorrection = async () => {
    if (!correctionProcedure) return;
    try {
      const values = await correctionForm.validateFields();
      await procedimientosService.registrarMovimiento({
        procedimientoId: correctionProcedure.id,
        cantidad: -1,
        tipo: 'correccion',
        motivo: values.motivo,
      });
      setCorrectionProcedure(null);
      correctionForm.resetFields();
      reload();
      messageApi.success('Corrección registrada en la jornada de hoy.');
    } catch (error: any) {
      if (error?.errorFields) return;
      messageApi.error(error instanceof Error ? error.message : 'No fue posible registrar la corrección.');
    }
  };

  const openNewProcedure = () => {
    setEditingProcedure(null);
    catalogForm.setFieldsValue({ nombre: '', descripcion: '', activo: true });
    setCatalogModalOpen(true);
  };

  const openEditProcedure = (item: ProcedimientoCatalogo) => {
    setEditingProcedure(item);
    catalogForm.setFieldsValue({
      nombre: item.nombre,
      descripcion: item.descripcion,
      activo: item.estado === 'activo',
    });
    setCatalogModalOpen(true);
  };

  const saveCatalog = async () => {
    try {
      const values = await catalogForm.validateFields();
      const payload = {
        nombre: values.nombre,
        descripcion: values.descripcion,
        estado: values.activo === false ? ('inactivo' as const) : ('activo' as const),
      };

      if (editingProcedure) {
        await procedimientosService.updateProcedimiento(editingProcedure.id, payload);
        messageApi.success('Procedimiento actualizado.');
      } else {
        await procedimientosService.createProcedimiento(payload);
        messageApi.success('Procedimiento agregado al catálogo.');
      }

      setCatalogModalOpen(false);
      setEditingProcedure(null);
      catalogForm.resetFields();
      reload();
    } catch (error: any) {
      if (error?.errorFields) return;
      messageApi.error(error instanceof Error ? error.message : 'No fue posible guardar el procedimiento.');
    }
  };

  const historyColumns: ColumnsType<MovimientoProcedimiento> = [
    {
      title: 'FECHA / HORA',
      key: 'fecha',
      width: 150,
      render: (_, row) => {
        const { fecha, hora } = formatDateTime(row.fecha);
        return (
          <div className="proc-history-date">
            <strong>{fecha}</strong>
            <span>{hora}</span>
          </div>
        );
      },
    },
    {
      title: 'PROCEDIMIENTO',
      dataIndex: 'procedimiento_nombre',
      key: 'procedimiento_nombre',
      render: (value: string) => <strong className="proc-history-procedure">{value}</strong>,
    },
    {
      title: 'MOVIMIENTO',
      key: 'tipo',
      width: 150,
      render: (_, row) => {
        if (row.tipo === 'correccion') {
          return <Tag className="proc-history-tag proc-history-tag--negative" icon={<ArrowUpOutlined />}>CORRECCIÓN</Tag>;
        }
        if (row.tipo === 'saldo_inicial') {
          return <Tag className="proc-history-tag proc-history-tag--initial" icon={<SettingOutlined />}>SALDO INICIAL</Tag>;
        }
        return <Tag className="proc-history-tag proc-history-tag--positive" icon={<ArrowDownOutlined />}>REGISTRO</Tag>;
      },
    },
    {
      title: 'CAMBIO',
      key: 'cantidad',
      width: 95,
      render: (_, row) => (
        <strong className={`proc-history-delta ${row.cantidad < 0 ? 'is-negative' : 'is-positive'}`}>
          {row.cantidad > 0 ? '+' : ''}{row.cantidad}
        </strong>
      ),
    },
    {
      title: 'TOTAL DEL DÍA',
      key: 'totales',
      width: 135,
      render: (_, row) => (
        <div className="proc-history-total">
          <span>{row.total_anterior}</span><b>→</b><strong>{row.total_nuevo}</strong>
        </div>
      ),
    },
    {
      title: 'REGISTRÓ',
      key: 'usuario',
      width: 190,
      render: (_, row) => (
        <div className="proc-history-user">
          <strong>{row.usuario_nombre}</strong>
          <span>{row.sucursal_nombre}</span>
        </div>
      ),
    },
    {
      title: 'MOTIVO',
      dataIndex: 'motivo',
      key: 'motivo',
      render: (value: string) => <span className="proc-history-reason">{value}</span>,
    },
  ];

  const dailyColumns: ColumnsType<ResumenDiarioProcedimientos> = [
    {
      title: 'JORNADA',
      key: 'fecha',
      width: 155,
      render: (_, row) => (
        <div className="proc-day-date">
          <CalendarOutlined />
          <div>
            <strong>{formatDayKey(row.fecha)}</strong>
            <span>{row.fecha === todayKey ? 'Hoy' : 'Jornada cerrada'}</span>
          </div>
        </div>
      ),
    },
    {
      title: 'PROCEDIMIENTOS',
      dataIndex: 'total',
      key: 'total',
      width: 145,
      render: (value: number) => <strong className="proc-day-total">{value}</strong>,
    },
    {
      title: 'TIPOS',
      dataIndex: 'tipos_utilizados',
      key: 'tipos_utilizados',
      width: 105,
      render: (value: number) => <span className="proc-day-chip">{value} tipo{value === 1 ? '' : 's'}</span>,
    },
    {
      title: 'MÁS REALIZADO',
      key: 'principal',
      render: (_, row) => (
        <div className="proc-day-main">
          <strong>{row.procedimiento_principal}</strong>
          {row.procedimiento_principal_total > 0 && <span>{row.procedimiento_principal_total} registro{row.procedimiento_principal_total === 1 ? '' : 's'}</span>}
        </div>
      ),
    },
    {
      title: 'CORRECCIONES',
      dataIndex: 'correcciones',
      key: 'correcciones',
      width: 130,
      render: (value: number) => (
        <span className={`proc-day-corrections${value > 0 ? ' has-value' : ''}`}>{value}</span>
      ),
    },
    {
      title: 'DETALLE',
      key: 'detalle',
      width: 115,
      render: (_, row) => (
        <Button icon={<EyeOutlined />} onClick={() => setSelectedDay(row)}>Ver día</Button>
      ),
    },
  ];

  return (
    <div className="proc-global-page">
      {contextHolder}

      <header className="proc-global-hero">
        <div className="proc-global-hero__content">
          <Button type="text" icon={<ArrowLeftOutlined />} className="proc-global-back" onClick={() => navigate(-1)}>
            Regresar
          </Button>
          <div className="proc-global-heading">
            <div className="proc-global-icon"><MedicineBoxOutlined /></div>
            <div>
              <Text className="proc-global-eyebrow">CATÁLOGO DEL CONSULTORIO</Text>
              <Title level={1}>Procedimientos</Title>
              <Text className="proc-global-subtitle">
                Registra la actividad diaria del consultorio sin perder el historial de jornadas anteriores.
              </Text>
            </div>
          </div>
        </div>
        <div className="proc-global-mode">
          <GlobalOutlined />
          <div><span>ALCANCE</span><strong>Global</strong><small>Todo el consultorio</small></div>
        </div>
      </header>

      <main className="proc-global-card">
        <section className="proc-global-summary">
          <div className="proc-global-summary__top">
            <div className="proc-global-summary__copy">
              <Tag className="proc-global-badge" icon={<ClockCircleOutlined />}>Jornada diaria</Tag>
              <h2>Procedimientos de hoy</h2>
              <p>
                Los contadores se reinician automáticamente cada día a las 00:00. El historial nunca se borra.
              </p>
            </div>
            <div className="proc-global-actions">
              <Button icon={<HistoryOutlined />} onClick={() => { setHistoryOpen(true); setHistoryTab('dias'); }}>
                Historial
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={openNewProcedure}>
                Nuevo procedimiento
              </Button>
            </div>
          </div>

          <div className="proc-global-metrics">
            <div className="proc-global-metric proc-global-metric--accent">
              <span>PROCEDIMIENTOS HOY</span>
              <strong>{resumenHoy.total}</strong>
              <small>{formatDayKey(todayKey)}</small>
            </div>
            <div className="proc-global-metric">
              <span>TIPOS UTILIZADOS HOY</span>
              <strong>{resumenHoy.tipos}</strong>
              <small>de {procedimientos.filter((item) => item.estado === 'activo').length} disponibles</small>
            </div>
            <div className="proc-global-metric">
              <span>ÚLTIMOS 7 DÍAS</span>
              <strong>{Math.max(0, ultimos7Dias)}</strong>
              <small>actividad acumulada</small>
            </div>
            <div className="proc-global-metric">
              <span>TOTAL HISTÓRICO</span>
              <strong>{totalHistorico}</strong>
              <small>{diasConActividad} jornada{diasConActividad === 1 ? '' : 's'} con actividad</small>
            </div>
          </div>
        </section>

        <section className="proc-global-search-area">
          <div className="proc-global-search-field">
            <label htmlFor="procedimiento-search">BUSCAR PROCEDIMIENTO</label>
            <Input
              id="procedimiento-search"
              size="large"
              allowClear
              prefix={<SearchOutlined />}
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Nombre o descripción del procedimiento..."
            />
          </div>
          <Select
            className="proc-global-status-filter"
            value={filtroEstado}
            onChange={setFiltroEstado}
            options={[
              { value: 'activo', label: 'Activos' },
              { value: 'inactivo', label: 'Inactivos' },
              { value: 'todos', label: 'Todos' },
            ]}
          />
        </section>

        <section className="proc-global-list">
          {procedimientosFiltrados.length === 0 ? (
            <div className="proc-global-empty"><Empty description="No se encontraron procedimientos" /></div>
          ) : (
            <div className="proc-global-grid">
              {procedimientosFiltrados.map((item) => {
                const current = cantidadesHoy[item.id] ?? 0;
                const historic = historicoPorProcedimiento[item.id] ?? 0;
                return (
                  <article className={`proc-global-item${current > 0 ? ' is-used' : ''}${item.estado === 'inactivo' ? ' is-inactive' : ''}`} key={item.id}>
                    <div className="proc-global-item__number">{String(item.id).padStart(2, '0')}</div>
                    <div className="proc-global-item__name">
                      <div className="proc-global-item__title-row">
                        <strong>{item.nombre}</strong>
                        {item.estado === 'inactivo' && <Tag>Inactivo</Tag>}
                      </div>
                      <span>{item.descripcion || 'Sin descripción'}</span>
                      <small>
                        <b>{current}</b> hoy <i>·</i> {historic} históricos
                      </small>
                    </div>
                    <div className="proc-global-item__controls">
                      <Tooltip title="Editar procedimiento">
                        <Button className="proc-global-edit-btn" icon={<EditOutlined />} onClick={() => openEditProcedure(item)} />
                      </Tooltip>
                      <div className="proc-global-counter" aria-label={`Cantidad de ${item.nombre}`}>
                        <Tooltip title="Corregir un registro de hoy">
                          <Button
                            aria-label={`Restar ${item.nombre}`}
                            icon={<MinusOutlined />}
                            disabled={current === 0 || item.estado === 'inactivo'}
                            onClick={() => openCorrection(item)}
                          />
                        </Tooltip>
                        <strong>{current}</strong>
                        <Tooltip title="Registrar procedimiento realizado hoy">
                          <Button
                            aria-label={`Agregar ${item.nombre}`}
                            type="primary"
                            icon={<PlusOutlined />}
                            disabled={item.estado === 'inactivo'}
                            onClick={() => addProcedureRecord(item)}
                          />
                        </Tooltip>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <Modal
        open={catalogModalOpen}
        title={editingProcedure ? 'Editar procedimiento' : 'Nuevo procedimiento'}
        okText={editingProcedure ? 'Guardar cambios' : 'Agregar procedimiento'}
        cancelText="Cancelar"
        onCancel={() => { setCatalogModalOpen(false); setEditingProcedure(null); catalogForm.resetFields(); }}
        onOk={saveCatalog}
        className="proc-catalog-modal"
        destroyOnClose
      >
        <Form form={catalogForm} layout="vertical">
          <Form.Item label="Nombre del procedimiento" name="nombre" rules={[{ required: true, message: 'Captura el nombre del procedimiento' }]}>
            <Input placeholder="Ej. RETIRO DE PUNTOS" maxLength={120} />
          </Form.Item>
          <Form.Item label="Descripción" name="descripcion">
            <Input.TextArea rows={3} placeholder="Descripción breve o alcance del procedimiento..." maxLength={300} showCount />
          </Form.Item>
          <Form.Item label="Disponible en el catálogo" name="activo" valuePropName="checked">
            <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={Boolean(correctionProcedure)}
        title="Registrar corrección de hoy"
        okText="Confirmar corrección"
        cancelText="Cancelar"
        onCancel={() => { setCorrectionProcedure(null); correctionForm.resetFields(); }}
        onOk={confirmCorrection}
        className="proc-correction-modal"
        destroyOnClose
      >
        {correctionProcedure && (
          <div className="proc-correction-preview">
            <span>Procedimiento</span>
            <strong>{correctionProcedure.nombre}</strong>
            <div>
              <div><small>Total de hoy</small><b>{cantidadesHoy[correctionProcedure.id] ?? 0}</b></div>
              <span>− 1</span>
              <div><small>Nuevo total de hoy</small><b>{Math.max(0, (cantidadesHoy[correctionProcedure.id] ?? 0) - 1)}</b></div>
            </div>
          </div>
        )}
        <Form form={correctionForm} layout="vertical">
          <Form.Item label="Motivo de la corrección" name="motivo" rules={[{ required: true, message: 'Indica por qué se está corrigiendo el registro' }]}>
            <Input.TextArea rows={3} placeholder="Ej. Registro capturado por error" maxLength={250} showCount />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={historyOpen}
        title={null}
        footer={null}
        width={1180}
        onCancel={() => setHistoryOpen(false)}
        className="proc-history-modal"
        destroyOnClose
      >
        <div className="proc-history-header">
          <div>
            <span>ESTADÍSTICA Y TRAZABILIDAD</span>
            <h2>Historial de procedimientos</h2>
            <p>Cada día es una jornada independiente; todos los días forman un único historial del consultorio.</p>
          </div>
          <BarChartOutlined />
        </div>

        <div className="proc-history-metrics">
          <div><CalendarOutlined /><span>HOY</span><strong>{resumenHoy.total}</strong><small>procedimientos</small></div>
          <div><BarChartOutlined /><span>ÚLTIMOS 7 DÍAS</span><strong>{Math.max(0, ultimos7Dias)}</strong><small>procedimientos</small></div>
          <div><MedicineBoxOutlined /><span>DÍA MÁS ACTIVO</span><strong>{diaMasActivo?.total ?? 0}</strong><small>{diaMasActivo ? formatDayKey(diaMasActivo.fecha) : 'Sin actividad'}</small></div>
          <div><ArrowUpOutlined /><span>CORRECCIONES</span><strong>{correccionesAcumuladas}</strong><small>históricas</small></div>
        </div>

        <div className="proc-history-filters">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder={historyTab === 'dias' ? 'Buscar procedimiento dentro de las jornadas...' : 'Buscar procedimiento, motivo o usuario...'}
            value={historySearch}
            onChange={(event) => setHistorySearch(event.target.value)}
          />
          {historyTab === 'movimientos' && (
            <Select
              value={historyType}
              onChange={setHistoryType}
              options={[
                { value: 'todos', label: 'Todos los movimientos' },
                { value: 'registro', label: 'Registros' },
                { value: 'correccion', label: 'Correcciones' },
                { value: 'saldo_inicial', label: 'Saldo inicial' },
              ]}
            />
          )}
          <RangePicker
            format="DD/MM/YYYY"
            value={historyRange}
            onChange={(value) => setHistoryRange(value as [Dayjs | null, Dayjs | null] | null)}
            placeholder={['Desde', 'Hasta']}
          />
        </div>

        <Tabs
          activeKey={historyTab}
          onChange={setHistoryTab}
          className="proc-history-tabs"
          items={[
            {
              key: 'dias',
              label: 'Resumen por día',
              children: (
                <Table<ResumenDiarioProcedimientos>
                  className="proc-history-table proc-daily-table"
                  columns={dailyColumns}
                  dataSource={dailyFiltered}
                  rowKey="fecha"
                  locale={{ emptyText: <Empty description="Todavía no hay jornadas registradas" /> }}
                  pagination={{
                    pageSize: 7,
                    showSizeChanger: false,
                    position: ['bottomCenter'],
                    showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} jornadas`,
                  }}
                />
              ),
            },
            {
              key: 'movimientos',
              label: 'Movimientos',
              children: (
                <Table<MovimientoProcedimiento>
                  className="proc-history-table"
                  columns={historyColumns}
                  dataSource={historyFiltered}
                  rowKey="id"
                  locale={{ emptyText: <Empty description="Todavía no hay movimientos registrados" /> }}
                  pagination={{
                    pageSize: 7,
                    showSizeChanger: false,
                    position: ['bottomCenter'],
                    showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} movimientos`,
                  }}
                />
              ),
            },
          ]}
        />
      </Modal>

      <Modal
        open={Boolean(selectedDay)}
        title={null}
        footer={<Button onClick={() => setSelectedDay(null)}>Cerrar</Button>}
        width={760}
        onCancel={() => setSelectedDay(null)}
        className="proc-day-modal"
        destroyOnClose
      >
        {selectedDay && (
          <div className="proc-day-detail">
            <div className="proc-day-detail__header">
              <div className="proc-day-detail__icon"><CalendarOutlined /></div>
              <div>
                <span>RESUMEN DE JORNADA</span>
                <h2>{formatDayKey(selectedDay.fecha, true)}</h2>
                <p>{selectedDay.fecha === todayKey ? 'Jornada actual' : 'Registro diario cerrado automáticamente al cambiar de fecha'}</p>
              </div>
            </div>

            <div className="proc-day-detail__metrics">
              <div><span>Procedimientos</span><strong>{selectedDay.total}</strong></div>
              <div><span>Tipos utilizados</span><strong>{selectedDay.tipos_utilizados}</strong></div>
              <div><span>Correcciones</span><strong>{selectedDay.correcciones}</strong></div>
              <div><span>Movimientos</span><strong>{selectedDay.movimientos}</strong></div>
            </div>

            <div className="proc-day-detail__list-title">
              <MedicineBoxOutlined />
              <strong>Procedimientos de la jornada</strong>
            </div>
            <div className="proc-day-detail__list">
              {selectedDay.detalle.length === 0 ? (
                <Empty description="Sin procedimientos" />
              ) : selectedDay.detalle.map((item) => (
                <div className="proc-day-detail__row" key={item.procedimiento_id}>
                  <div>
                    <strong>{item.procedimiento_nombre}</strong>
                    <span>{item.registros} registro{item.registros === 1 ? '' : 's'}{item.correcciones > 0 ? ` · ${item.correcciones} corrección${item.correcciones === 1 ? '' : 'es'}` : ''}</span>
                  </div>
                  <b>{item.total}</b>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Procedimientos;
