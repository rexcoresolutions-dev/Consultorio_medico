import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  DatePicker,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CalendarOutlined,
  DeleteOutlined,
  EditOutlined,
  HistoryOutlined,
  MedicineBoxOutlined,
  PlusOutlined,
  SearchOutlined,
  SettingOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

import InventoryService, {
  type MedicamentoInventario,
  type MedicamentoInventarioInput,
  type MovimientoInventario,
  type TipoMovimientoInventario,
  getInventoryApiError,
} from '../../services/inventario/inventario.service';
import './Inventario.css';

const { Title, Text } = Typography;

const FORMAS_FARMACEUTICAS = [
  'Tableta',
  'Cápsula',
  'Jarabe',
  'Suspensión',
  'Solución',
  'Aerosol',
  'Crema',
  'Ungüento',
  'Gotas',
  'Ampolleta',
  'Inyectable',
  'Supositorio',
  'Otro',
].map((value) => ({ value, label: value }));

const VIAS = [
  'ORAL',
  'SUBLINGUAL',
  'INTRAMUSCULAR',
  'INTRAVENOSA',
  'TÓPICA',
  'OFTÁLMICA',
  'ÓTICA',
  'INHALADA',
  'RECTAL',
  'NASAL',
  'OTRA',
].map((value) => ({ value, label: value }));

const UNIDADES_STOCK = [
  'tabletas',
  'cápsulas',
  'frascos',
  'cajas',
  'ampolletas',
  'inhaladores',
  'tubos',
  'sobres',
  'piezas',
].map((value) => ({ value, label: value }));

const formatDate = (value?: string) => {
  if (!value) return 'Sin fecha';
  const date = dayjs(value);
  return date.isValid() ? date.format('DD/MM/YYYY') : value;
};

const diasParaCaducar = (value?: string) => {
  if (!value) return Number.POSITIVE_INFINITY;
  const date = dayjs(value).startOf('day');
  if (!date.isValid()) return Number.POSITIVE_INFINITY;
  return date.diff(dayjs().startOf('day'), 'day');
};

const getStockStatus = (item: MedicamentoInventario) => {
  if (item.stock_actual <= 0) return { label: 'Sin existencia', color: 'red' };
  if (item.stock_actual <= item.stock_minimo) return { label: 'Stock bajo', color: 'orange' };
  return { label: 'Disponible', color: 'green' };
};

const Inventario: React.FC = () => {
  const [medicamentos, setMedicamentos] = useState<MedicamentoInventario[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingMedication, setSavingMedication] = useState(false);
  const [savingMovement, setSavingMovement] = useState(false);
  const [deletingId, setDeletingId] = useState<number | string | null>(null);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'todos' | 'bajo' | 'sin_stock' | 'caducidad'>('todos');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<MedicamentoInventario | null>(null);
  const [movementOpen, setMovementOpen] = useState(false);
  const [movementTarget, setMovementTarget] = useState<MedicamentoInventario | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [form] = Form.useForm();
  const [movementForm] = Form.useForm();
  const movementType = Form.useWatch('tipo', movementForm) as TipoMovimientoInventario | undefined;
  const movementQuantity = Form.useWatch('cantidad', movementForm);

  const movementPreview = useMemo(() => {
    if (!movementTarget) return null;

    const current = movementTarget.stock_actual;
    const quantityValue = Number(movementQuantity);
    const quantity = Number.isFinite(quantityValue) ? Math.max(0, quantityValue) : 0;
    const type = movementType || 'entrada';

    if (type === 'entrada') {
      return { current, delta: quantity, next: current + quantity, type };
    }

    if (type === 'salida') {
      return { current, delta: -quantity, next: Math.max(0, current - quantity), type };
    }

    return { current, delta: quantity - current, next: quantity, type };
  }, [movementQuantity, movementTarget, movementType]);

  const movementSummary = useMemo(() => ({
    entradas: movimientos.filter((item) => item.tipo === 'entrada').length,
    salidas: movimientos.filter((item) => item.tipo === 'salida').length,
    ajustes: movimientos.filter((item) => item.tipo === 'ajuste').length,
  }), [movimientos]);

  const recargar = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      const [medicamentosApi, movimientosApi] = await Promise.all([
        InventoryService.getMedicamentos(),
        InventoryService.getMovimientos(),
      ]);

      setMedicamentos(medicamentosApi);
      setMovimientos(movimientosApi);
    } catch (error) {
      message.error(
        getInventoryApiError(error, 'No fue posible cargar el inventario.'),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void recargar();
  }, []);

  const resumen = useMemo(() => {
    const activos = medicamentos.filter((item) => item.estado === 'activo');
    const stockBajo = activos.filter(
      (item) => item.stock_actual > 0 && item.stock_actual <= item.stock_minimo,
    ).length;
    const sinStock = activos.filter((item) => item.stock_actual <= 0).length;
    const porCaducar = activos.filter((item) => {
      const dias = diasParaCaducar(item.fecha_caducidad);
      return dias >= 0 && dias <= 90;
    }).length;

    return {
      total: activos.length,
      unidades: activos.reduce((sum, item) => sum + item.stock_actual, 0),
      stockBajo,
      sinStock,
      porCaducar,
    };
  }, [medicamentos]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return medicamentos.filter((item) => {
      const matchesText =
        !term ||
        [
          item.nombre_comercial,
          item.sustancia_activa,
          item.concentracion,
          item.laboratorio,
          item.lote,
          item.ubicacion,
        ]
          .join(' ')
          .toLowerCase()
          .includes(term);

      if (!matchesText) return false;

      if (stockFilter === 'bajo') {
        return item.stock_actual > 0 && item.stock_actual <= item.stock_minimo;
      }
      if (stockFilter === 'sin_stock') return item.stock_actual <= 0;
      if (stockFilter === 'caducidad') {
        const dias = diasParaCaducar(item.fecha_caducidad);
        return dias >= 0 && dias <= 90;
      }

      return true;
    });
  }, [medicamentos, search, stockFilter]);

  const abrirNuevo = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      stock_actual: 0,
      stock_minimo: 5,
      estado: 'activo',
      unidad_stock: 'piezas',
      via_administracion: 'ORAL',
    });
    setEditorOpen(true);
  };

  const abrirEditar = (item: MedicamentoInventario) => {
    setEditing(item);
    form.setFieldsValue({
      ...item,
      fecha_caducidad: item.fecha_caducidad ? dayjs(item.fecha_caducidad) : null,
    });
    setEditorOpen(true);
  };

  const guardarMedicamento = async () => {
    try {
      const values = await form.validateFields();
      const payload: MedicamentoInventarioInput = {
        nombre_comercial: values.nombre_comercial.trim(),
        sustancia_activa: values.sustancia_activa.trim(),
        concentracion: values.concentracion?.trim() || '',
        forma_farmaceutica: values.forma_farmaceutica || '',
        presentacion: values.presentacion?.trim() || '',
        via_administracion: values.via_administracion || '',
        laboratorio: values.laboratorio?.trim() || '',
        lote: values.lote?.trim() || '',
        fecha_caducidad: values.fecha_caducidad
          ? dayjs(values.fecha_caducidad).format('YYYY-MM-DD')
          : '',
        stock_actual: Number(values.stock_actual || 0),
        stock_minimo: Number(values.stock_minimo || 0),
        unidad_stock: values.unidad_stock || 'piezas',
        ubicacion: values.ubicacion?.trim() || '',
        observaciones: values.observaciones?.trim() || '',
        estado: values.estado || 'activo',
      };

      setSavingMedication(true);

      if (editing) {
        // Las existencias nunca se modifican con PATCH. Se usan movimientos
        // para mantener la trazabilidad del inventario.
        payload.stock_actual = editing.stock_actual;
        await InventoryService.updateMedicamento(editing.id, payload);
        message.success('Medicamento actualizado correctamente.');
      } else {
        await InventoryService.createMedicamento(payload);
        message.success('Medicamento agregado al inventario.');
      }

      setEditorOpen(false);
      form.resetFields();
      await recargar(true);
    } catch (error: any) {
      if (error?.errorFields) {
        message.warning('Revisa los campos obligatorios del medicamento.');
      } else {
        message.error(
          getInventoryApiError(error, 'No fue posible guardar el medicamento.'),
        );
      }
    } finally {
      setSavingMedication(false);
    }
  };

  const eliminar = async (item: MedicamentoInventario) => {
    try {
      setDeletingId(item.id);
      await InventoryService.deleteMedicamento(item.id);
      await recargar(true);
      message.success('Medicamento eliminado correctamente.');
    } catch (error) {
      message.error(
        getInventoryApiError(error, 'No fue posible eliminar el medicamento.'),
      );
    } finally {
      setDeletingId(null);
    }
  };

  const abrirMovimiento = (item: MedicamentoInventario, tipo: TipoMovimientoInventario = 'entrada') => {
    setMovementTarget(item);
    movementForm.resetFields();
    movementForm.setFieldsValue({ tipo, cantidad: 1, motivo: '' });
    setMovementOpen(true);
  };

  const guardarMovimiento = async () => {
    if (!movementTarget) return;

    try {
      const values = await movementForm.validateFields();
      setSavingMovement(true);

      await InventoryService.registrarMovimiento({
        medicamentoId: movementTarget.id,
        tipo: values.tipo,
        cantidad: Number(values.cantidad),
        motivo: values.motivo || '',
      });

      setMovementOpen(false);
      await recargar(true);
      message.success('Movimiento registrado correctamente.');
    } catch (error: any) {
      if (error?.errorFields) {
        message.warning('Revisa los datos del movimiento.');
      } else {
        message.error(
          getInventoryApiError(error, 'No fue posible registrar el movimiento.'),
        );
      }
    } finally {
      setSavingMovement(false);
    }
  };

  const columns: ColumnsType<MedicamentoInventario> = [
    {
      title: 'Medicamento',
      key: 'medicamento',
      width: '30%',
      render: (_, item) => (
        <div className="inv-med-cell">
          <div className="inv-med-icon"><MedicineBoxOutlined /></div>
          <div>
            <strong>{item.nombre_comercial}</strong>
            <span>{item.sustancia_activa}{item.concentracion ? ` · ${item.concentracion}` : ''}</span>
            <small>{item.forma_farmaceutica || 'Sin forma farmacéutica'} · {item.presentacion || 'Sin presentación'}</small>
          </div>
        </div>
      ),
    },
    {
      title: 'Existencia',
      key: 'stock',
      width: '13%',
      render: (_, item) => {
        const status = getStockStatus(item);
        return (
          <div className="inv-stock-cell">
            <strong>{item.stock_actual}</strong>
            <span>{item.unidad_stock}</span>
            <Tag color={status.color}>{status.label}</Tag>
          </div>
        );
      },
    },
    {
      title: 'Lote / caducidad',
      key: 'lote',
      width: '18%',
      render: (_, item) => {
        const days = diasParaCaducar(item.fecha_caducidad);
        const warning = days < 0 || days <= 90;
        return (
          <div className="inv-lot-cell">
            <strong>{item.lote || 'Sin lote'}</strong>
            <span className={warning ? 'inv-expiry-warning' : ''}>
              {days < 0 ? 'Caducado' : formatDate(item.fecha_caducidad)}
            </span>
          </div>
        );
      },
    },
    {
      title: 'Ubicación',
      dataIndex: 'ubicacion',
      width: '14%',
      render: (value) => value || 'Sin asignar',
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      width: '10%',
      align: 'center',
      render: (value) => (
        <Tag color={value === 'activo' ? 'green' : 'default'}>
          {value === 'activo' ? 'Activo' : 'Inactivo'}
        </Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      width: '15%',
      align: 'center',
      render: (_, item) => (
        <Space size={2} className="inv-row-actions">
          <Tooltip title="Registrar movimiento">
            <Button type="text" icon={<SwapOutlined />} onClick={() => abrirMovimiento(item)} />
          </Tooltip>
          <Tooltip title="Editar medicamento">
            <Button type="text" icon={<EditOutlined />} onClick={() => abrirEditar(item)} />
          </Tooltip>
          <Popconfirm
            title="Eliminar medicamento"
            description="Se eliminará este medicamento del inventario."
            okText="Eliminar"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
            onConfirm={() => eliminar(item)}
          >
            <Tooltip title="Eliminar">
              <Button type="text" danger icon={<DeleteOutlined />} loading={deletingId === item.id} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];


  const historyColumns: ColumnsType<MovimientoInventario> = [
    {
      title: 'Fecha',
      dataIndex: 'fecha',
      key: 'fecha',
      width: '16%',
      render: (value: string) => (
        <div className="inv-history-date-cell">
          <strong>{dayjs(value).format('DD/MM/YYYY')}</strong>
          <span>{dayjs(value).format('HH:mm')}</span>
        </div>
      ),
    },
    {
      title: 'Medicamento',
      dataIndex: 'medicamento_nombre',
      key: 'medicamento_nombre',
      width: '24%',
      render: (value: string) => (
        <div className="inv-history-med-cell">
          <MedicineBoxOutlined />
          <strong title={value}>{value}</strong>
        </div>
      ),
    },
    {
      title: 'Movimiento',
      dataIndex: 'tipo',
      key: 'tipo',
      width: '15%',
      align: 'center',
      render: (tipo: TipoMovimientoInventario, item) => {
        const esInventarioInicial =
          tipo === 'entrada' &&
          item.stock_anterior === 0 &&
          item.motivo.trim().toLowerCase().includes('existencia inicial');

        const config = esInventarioInicial
          ? { label: 'Inventario inicial', icon: <MedicineBoxOutlined />, className: 'is-initial' }
          : tipo === 'entrada'
            ? { label: 'Entrada', icon: <ArrowDownOutlined />, className: 'is-entry' }
            : tipo === 'salida'
              ? { label: 'Salida', icon: <ArrowUpOutlined />, className: 'is-exit' }
              : { label: 'Ajuste', icon: <SettingOutlined />, className: 'is-adjust' };

        return (
          <span className={`inv-history-type-pill ${config.className}`}>
            {config.icon}
            {config.label}
          </span>
        );
      },
    },
    {
      title: 'Cambio',
      key: 'cambio',
      width: '12%',
      align: 'center',
      render: (_, item) => {
        const delta = item.stock_nuevo - item.stock_anterior;
        return (
          <strong
            className={`inv-history-delta ${delta < 0 ? 'is-negative' : delta > 0 ? 'is-positive' : 'is-neutral'}`}
          >
            {delta > 0 ? '+' : ''}{delta}
          </strong>
        );
      },
    },
    {
      title: 'Existencia',
      key: 'existencia',
      width: '17%',
      align: 'center',
      render: (_, item) => (
        <div className="inv-history-stock-cell">
          <span>{item.stock_anterior}</span>
          <b>→</b>
          <strong>{item.stock_nuevo}</strong>
        </div>
      ),
    },
    {
      title: 'Motivo',
      dataIndex: 'motivo',
      key: 'motivo',
      width: '16%',
      ellipsis: true,
      render: (value: string) => (
        <Tooltip title={value || 'Movimiento sin observaciones'}>
          <span className="inv-history-reason-cell">
            {value || 'Movimiento sin observaciones'}
          </span>
        </Tooltip>
      ),
    },
  ];

  return (
    <div className="inventory-page">
      <section className="inv-hero">
        <div className="inv-hero-copy">
          <div className="inv-hero-icon"><MedicineBoxOutlined /></div>
          <div>
            <Text className="inv-eyebrow">Consultorio médico</Text>
            <Title level={2}>Inventario de medicamentos</Title>
            <p>
              Administra medicamentos disponibles en el consultorio y utilízalos después
              desde la receta médica sin perder la opción de receta libre.
            </p>
          </div>
        </div>

        <div className="inv-hero-actions">
          <Button
            className="inv-hero-btn inv-hero-btn--history"
            icon={<HistoryOutlined />}
            onClick={() => { setHistoryOpen(true); void recargar(true); }}
          >
            Movimientos
          </Button>
          <Button
            className="inv-hero-btn inv-hero-btn--new"
            type="primary"
            icon={<PlusOutlined />}
            onClick={abrirNuevo}
          >
            Nuevo medicamento
          </Button>
        </div>
      </section>

      <section className="inv-summary-grid">
        <button className="inv-summary-card" onClick={() => setStockFilter('todos')}>
          <span>Medicamentos activos</span>
          <strong>{resumen.total}</strong>
          <small>{resumen.unidades} unidades registradas</small>
        </button>
        <button className="inv-summary-card inv-summary-card--warning" onClick={() => setStockFilter('bajo')}>
          <span>Stock bajo</span>
          <strong>{resumen.stockBajo}</strong>
          <small>En o debajo del mínimo</small>
        </button>
        <button className="inv-summary-card inv-summary-card--danger" onClick={() => setStockFilter('sin_stock')}>
          <span>Sin existencia</span>
          <strong>{resumen.sinStock}</strong>
          <small>Requieren reposición</small>
        </button>
        <button className="inv-summary-card inv-summary-card--info" onClick={() => setStockFilter('caducidad')}>
          <span>Próximos a caducar</span>
          <strong>{resumen.porCaducar}</strong>
          <small>Dentro de 90 días</small>
        </button>
      </section>

      <section className="inv-panel">
        <div className="inv-toolbar">
          <div>
            <Title level={4}>Catálogo del consultorio</Title>
            <Text type="secondary">{filtered.length} registro(s) visibles</Text>
          </div>

          <div className="inv-toolbar-actions">
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Buscar medicamento, sustancia, lote..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            />
            <Select
              value={stockFilter}
              onChange={setStockFilter}
              options={[
                { value: 'todos', label: 'Todos' },
                { value: 'bajo', label: 'Stock bajo' },
                { value: 'sin_stock', label: 'Sin existencia' },
                { value: 'caducidad', label: 'Próximos a caducar' },
              ]}
            />
          </div>
        </div>

        <Table
          className="inv-table"
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          tableLayout="fixed"
          pagination={{ pageSize: 8, showSizeChanger: false }}
          loading={loading}
          locale={{ emptyText: <Empty description="No hay medicamentos para mostrar" /> }}
        />
      </section>

      <Modal
        title={editing ? 'Editar medicamento' : 'Nuevo medicamento'}
        open={editorOpen}
        onCancel={() => setEditorOpen(false)}
        onOk={guardarMedicamento}
        confirmLoading={savingMedication}
        okButtonProps={{ disabled: savingMedication }}
        cancelButtonProps={{ disabled: savingMedication }}
        okText={editing ? 'Guardar cambios' : 'Agregar medicamento'}
        cancelText="Cancelar"
        width={860}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" className="inv-form">
          <div className="inv-form-grid inv-form-grid--2">
            <Form.Item
              name="nombre_comercial"
              label="Nombre comercial / presentación"
              rules={[{ required: true, message: 'Captura el nombre del medicamento' }]}
            >
              <Input placeholder="Ej. Tempra 500 mg" />
            </Form.Item>
            <Form.Item
              name="sustancia_activa"
              label="Sustancia activa"
              rules={[{ required: true, message: 'Captura la sustancia activa' }]}
            >
              <Input placeholder="Ej. Paracetamol" />
            </Form.Item>
          </div>

          <div className="inv-form-grid inv-form-grid--3">
            <Form.Item name="concentracion" label="Concentración">
              <Input placeholder="Ej. 500 mg" />
            </Form.Item>
            <Form.Item name="forma_farmaceutica" label="Forma farmacéutica">
              <Select showSearch options={FORMAS_FARMACEUTICAS} placeholder="Seleccionar" />
            </Form.Item>
            <Form.Item name="via_administracion" label="Vía habitual">
              <Select showSearch options={VIAS} placeholder="Seleccionar" />
            </Form.Item>
          </div>

          <div className="inv-form-grid inv-form-grid--2">
            <Form.Item name="presentacion" label="Presentación">
              <Input placeholder="Ej. Caja con 20 tabletas" />
            </Form.Item>
            <Form.Item name="laboratorio" label="Laboratorio">
              <Input placeholder="Ej. Genérico / Laboratorio" />
            </Form.Item>
          </div>

          <div className="inv-form-grid inv-form-grid--3">
            <Form.Item name="lote" label="Lote">
              <Input placeholder="Ej. LT-2026-001" />
            </Form.Item>
            <Form.Item name="fecha_caducidad" label="Fecha de caducidad">
              <DatePicker
                className="inv-expiry-picker"
                popupClassName="inv-expiry-picker-dropdown"
                format="DD/MM/YYYY"
                placeholder="Selecciona la fecha"
                suffixIcon={<CalendarOutlined />}
                allowClear
                inputReadOnly
              />
            </Form.Item>
            <Form.Item name="ubicacion" label="Ubicación">
              <Input placeholder="Ej. Anaquel A-1" />
            </Form.Item>
          </div>

          <div className="inv-form-grid inv-form-grid--4">
            {!editing && (
              <Form.Item name="stock_actual" label="Existencia inicial">
                <InputNumber min={0} precision={0} />
              </Form.Item>
            )}
            <Form.Item name="stock_minimo" label="Stock mínimo">
              <InputNumber min={0} precision={0} />
            </Form.Item>
            <Form.Item name="unidad_stock" label="Unidad de stock">
              <Select showSearch options={UNIDADES_STOCK} />
            </Form.Item>
            <Form.Item name="estado" label="Estado">
              <Select
                options={[
                  { value: 'activo', label: 'Activo' },
                  { value: 'inactivo', label: 'Inactivo' },
                ]}
              />
            </Form.Item>
          </div>

          {editing && (
            <Alert
              type="warning"
              showIcon
              message={`Existencia actual: ${editing.stock_actual} ${editing.unidad_stock}`}
              description="Para conservar la trazabilidad, las existencias se cambian desde Registrar movimiento, no desde la edición del medicamento."
            />
          )}

          <Form.Item name="observaciones" label="Observaciones">
            <Input.TextArea rows={3} placeholder="Notas internas del medicamento..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        className="inv-movement-modal"
        title="Registrar movimiento"
        open={movementOpen}
        onCancel={() => setMovementOpen(false)}
        onOk={guardarMovimiento}
        confirmLoading={savingMovement}
        okButtonProps={{ disabled: savingMovement }}
        cancelButtonProps={{ disabled: savingMovement }}
        okText="Registrar movimiento"
        cancelText="Cancelar"
        width={600}
        destroyOnHidden
      >
        {movementTarget && (
          <div className="inv-movement-target">
            <MedicineBoxOutlined />
            <div>
              <strong>{movementTarget.nombre_comercial}</strong>
              <span>
                Existencia actual: {movementTarget.stock_actual} {movementTarget.unidad_stock}
              </span>
            </div>
          </div>
        )}

        <Form form={movementForm} layout="vertical">
          <Form.Item
            name="tipo"
            label="Tipo de movimiento"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: 'entrada', label: 'Entrada — sumar existencias' },
                { value: 'salida', label: 'Salida — restar existencias' },
                { value: 'ajuste', label: 'Ajuste — establecer existencia exacta' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="cantidad"
            label={
              movementType === 'salida'
                ? 'Cantidad a retirar'
                : movementType === 'ajuste'
                  ? 'Nueva existencia exacta'
                  : 'Cantidad a agregar'
            }
            rules={[{ required: true, message: 'Captura la cantidad' }]}
          >
            <InputNumber
              min={movementType === 'ajuste' ? 0 : 1}
              max={movementType === 'salida' ? movementTarget?.stock_actual : undefined}
              precision={0}
              prefix={movementType === 'salida' ? '−' : movementType === 'ajuste' ? '=' : '+'}
              className={`inv-full-number inv-movement-number inv-movement-number--${movementType || 'entrada'}`}
            />
          </Form.Item>

          {movementTarget && movementPreview && (
            <div className={`inv-stock-preview inv-stock-preview--${movementPreview.type}`}>
              <div className="inv-stock-preview__item">
                <span>Existencia actual</span>
                <strong>{movementPreview.current}</strong>
                <small>{movementTarget.unidad_stock}</small>
              </div>
              <div className="inv-stock-preview__operator">
                {movementPreview.type === 'entrada' ? '+' : movementPreview.type === 'salida' ? '−' : '→'}
              </div>
              <div className="inv-stock-preview__item inv-stock-preview__item--movement">
                <span>{movementPreview.type === 'ajuste' ? 'Cambio real' : 'Movimiento'}</span>
                <strong className={movementPreview.delta < 0 ? 'is-negative' : movementPreview.delta > 0 ? 'is-positive' : 'is-neutral'}>
                  {movementPreview.delta > 0 ? '+' : ''}{movementPreview.delta}
                </strong>
                <small>{movementTarget.unidad_stock}</small>
              </div>
              <div className="inv-stock-preview__operator">=</div>
              <div className="inv-stock-preview__item inv-stock-preview__item--result">
                <span>Nueva existencia</span>
                <strong>{movementPreview.next}</strong>
                <small>{movementTarget.unidad_stock}</small>
              </div>
            </div>
          )}

          <Form.Item name="motivo" label="Motivo / referencia">
            <Input.TextArea rows={3} placeholder="Ej. Compra, merma, corrección de conteo..." />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        className="inv-history-drawer-shell"
        title={
          <div className="inv-history-title">
            <span className="inv-history-title__icon"><HistoryOutlined /></span>
            <div>
              <strong>Historial de movimientos</strong>
              <small>Trazabilidad del inventario</small>
            </div>
          </div>
        }
        placement="right"
        width="min(920px, 96vw)"
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      >
        <div className="inv-history-summary">
          <div className="inv-history-summary-card inv-history-summary-card--entry">
            <ArrowDownOutlined />
            <div><span>Entradas</span><strong>{movementSummary.entradas}</strong></div>
          </div>
          <div className="inv-history-summary-card inv-history-summary-card--exit">
            <ArrowUpOutlined />
            <div><span>Salidas</span><strong>{movementSummary.salidas}</strong></div>
          </div>
          <div className="inv-history-summary-card inv-history-summary-card--adjust">
            <SettingOutlined />
            <div><span>Ajustes</span><strong>{movementSummary.ajustes}</strong></div>
          </div>
        </div>

        <div className="inv-history-table-wrap">
          <Table
            className="inv-history-table"
            columns={historyColumns}
            dataSource={movimientos}
            rowKey="id"
            tableLayout="fixed"
            loading={loading}
            pagination={{
              pageSize: 6,
              showSizeChanger: false,
              hideOnSinglePage: false,
              showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} movimientos`,
            }}
            locale={{
              emptyText: <Empty description="Aún no hay movimientos registrados" />,
            }}
          />
        </div>
      </Drawer>
    </div>
  );
};

export default Inventario;
