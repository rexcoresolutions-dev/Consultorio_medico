import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, DatePicker, Empty, Input, Spin, Table, Tabs, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  AuditOutlined,
  FileTextOutlined,
  MedicineBoxOutlined,
  ReloadOutlined,
  SearchOutlined,
  SolutionOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';

import pacientesService from '../../services/pacientes/pacientes.service';
import { notasService } from '../../services/notas-evolucion/notas-evolucion.service';
import recetasService from '../../services/recetas/recetas.service';
import inventarioService from '../../services/inventario/inventario.service';
import './Auditoria.css';

const { RangePicker } = DatePicker;

type RangeValue = [Dayjs | null, Dayjs | null] | null;

const normalize = (value: any) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const entityDate = (item: any) =>
  String(
    item?.fechaElaboracion ?? item?.fechaHora ?? item?.fecha ??
      item?.fechaConsulta ??
      item?.fecha_consulta ??
      item?.createdAt ??
      item?.created_at ??
      '',
  );

const formatDate = (value: string) => {
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('DD/MM/YYYY · hh:mm A') : '-';
};

const fullName = (person: any) =>
  [
    person?.nombre,
    person?.primerApellido ?? person?.primer_apellido,
    person?.segundoApellido ?? person?.segundo_apellido,
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

const loadAllPages = async (loader: (params: any) => Promise<any>) => {
  const first = await loader({ page: 1, limit: 100 });
  const data = [...(first?.data ?? [])];
  const pages = Math.max(1, Number(first?.meta?.totalPages ?? 1));
  for (let page = 2; page <= pages; page += 1) {
    const next = await loader({ page, limit: 100 });
    data.push(...(next?.data ?? []));
  }
  return data;
};

const Auditoria: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [range, setRange] = useState<RangeValue>(null);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [consultas, setConsultas] = useState<any[]>([]);
  const [recetas, setRecetas] = useState<any[]>([]);
  const [movimientos, setMovimientos] = useState<any[]>([]);

  const cargar = async () => {
    setLoading(true);
    setWarning(null);
    const results = await Promise.allSettled([
      pacientesService.getPacientes(),
      notasService.list(),
      loadAllPages((params) => recetasService.findAll(params)),
      inventarioService.getMovimientos(),
    ]);

    const [p, c, r, m] = results;
    if (p.status === 'fulfilled') setPacientes(p.value ?? []);
    if (c.status === 'fulfilled') setConsultas(c.value ?? []);
    if (r.status === 'fulfilled') setRecetas(r.value ?? []);
    if (m.status === 'fulfilled') setMovimientos(m.value ?? []);

    const fails = results.filter((x) => x.status === 'rejected').length;
    if (fails) setWarning('Algunas fuentes no respondieron. Se muestran los registros disponibles.');
    setLoading(false);
  };

  useEffect(() => {
    void cargar();
  }, []);

  const pacientesById = useMemo(() => {
    const map = new Map<number, any>();
    pacientes.forEach((p) => {
      const id = Number(p?.id);
      if (id > 0) map.set(id, p);
    });
    return map;
  }, [pacientes]);

  const consultasById = useMemo(() => {
    const map = new Map<number, any>();
    consultas.forEach((c) => {
      const id = Number(c?.consultaId ?? c?.id ?? c?.consulta_id ?? 0);
      if (id > 0) map.set(id, c);
    });
    return map;
  }, [consultas]);

  const inRange = (fecha: string) => {
    const d = dayjs(fecha);
    if (!d.isValid()) return false;
    if (!range?.[0] && !range?.[1]) return true;
    const start = range?.[0]?.startOf('day');
    const end = range?.[1]?.endOf('day');
    if (start && d.isBefore(start)) return false;
    if (end && d.isAfter(end)) return false;
    return true;
  };

  const clinicalRows = useMemo(() =>
    consultas
      .map((consulta) => {
        const pacienteId = Number(consulta?.pacienteId ?? consulta?.paciente_id ?? consulta?.paciente?.id ?? 0);
        const paciente = pacientesById.get(pacienteId) ?? consulta?.paciente;
        const diagnosticos = Array.isArray(consulta?.diagnosticos) ? consulta.diagnosticos : [];
        const diagnostico = diagnosticos
          .map((d: any) => d?.nombre ?? d?.diagnostico?.descripcion ?? d?.diagnostico?.nombre ?? d?.descripcion)
          .filter(Boolean)
          .join(', ');
        return {
          key: String(consulta?.id ?? Math.random()),
          fecha: entityDate(consulta),
          paciente: fullName(paciente) || 'Paciente',
          tipo: String(consulta?.tipoConsulta ?? consulta?.tipo_consulta ?? 'Nota de evolución'),
          diagnostico: diagnostico || String(consulta?.motivoConsulta ?? '-'),
          estatus: String(consulta?.estatus ?? consulta?.estado ?? 'REGISTRADA'),
        };
      })
      .filter((row) => inRange(row.fecha))
      .filter((row) => normalize(`${row.paciente} ${row.tipo} ${row.diagnostico} ${row.estatus}`).includes(normalize(query)))
      .sort((a, b) => dayjs(b.fecha).valueOf() - dayjs(a.fecha).valueOf()),
  [consultas, pacientesById, query, range]);

  const recetaRows = useMemo(() =>
    recetas
      .map((receta) => {
        const cId = Number(receta?.consultaId ?? receta?.consulta_id ?? receta?.consulta?.id ?? 0);
        const consulta = receta.consulta ?? consultasById.get(cId);
        const pId = Number(consulta?.pacienteId ?? consulta?.paciente_id ?? consulta?.paciente?.id ?? 0);
        const paciente = pacientesById.get(pId) ?? consulta?.paciente;
        const meds = Array.isArray(receta?.medicamentos)
          ? receta.medicamentos
              .map((m: any) => m?.medicamentoNombre ?? m?.nombre ?? m?.sustanciaActiva)
              .filter(Boolean)
              .join(', ')
          : '';
        return {
          key: String(receta?.id ?? Math.random()),
          fecha: entityDate(receta),
          folio: String(receta?.folio ?? receta?.numeroReceta ?? receta?.id ?? '-'),
          paciente: fullName(paciente) || 'Paciente',
          medicamentos: meds || '-',
          consultaId: cId || '-',
          seguimiento: receta?.programarSeguimiento ? String(receta?.fechaSeguimiento ?? 'Programado') : 'No',
        };
      })
      .filter((row) => inRange(row.fecha))
      .filter((row) => normalize(`${row.folio} ${row.paciente} ${row.medicamentos} ${row.consultaId}`).includes(normalize(query)))
      .sort((a, b) => dayjs(b.fecha).valueOf() - dayjs(a.fecha).valueOf()),
  [recetas, consultasById, pacientesById, query, range]);

  const inventoryRows = useMemo(() =>
    movimientos
      .map((m) => ({
        key: String(m?.id ?? Math.random()),
        fecha: entityDate(m),
        medicamento: String(m?.medicamento_nombre ?? '-'),
        tipo: String(m?.tipo ?? '').toUpperCase(),
        cantidad: Number(m?.cantidad ?? 0),
        stock: `${Number(m?.stock_anterior ?? 0)} → ${Number(m?.stock_nuevo ?? 0)}`,
        motivo: String(m?.motivo ?? '-'),
      }))
      .filter((row) => inRange(row.fecha))
      .filter((row) => normalize(`${row.medicamento} ${row.tipo} ${row.motivo}`).includes(normalize(query)))
      .sort((a, b) => dayjs(b.fecha).valueOf() - dayjs(a.fecha).valueOf()),
  [movimientos, query, range]);

  const clinicalColumns: ColumnsType<any> = [
    { title: 'Fecha', dataIndex: 'fecha', width: 180, render: (v) => formatDate(v) },
    { title: 'Paciente', dataIndex: 'paciente', width: 220 },
    { title: 'Tipo', dataIndex: 'tipo', width: 160 },
    { title: 'Diagnóstico / motivo', dataIndex: 'diagnostico' },
    { title: 'Estatus', dataIndex: 'estatus', width: 130, render: (v) => <Tag>{v}</Tag> },
  ];

  const recipeColumns: ColumnsType<any> = [
    { title: 'Fecha', dataIndex: 'fecha', width: 180, render: (v) => formatDate(v) },
    { title: 'Receta', dataIndex: 'folio', width: 100, render: (v) => `#${v}` },
    { title: 'Paciente', dataIndex: 'paciente', width: 220 },
    { title: 'Medicamentos', dataIndex: 'medicamentos' },
    { title: 'Nota de evolución', dataIndex: 'consultaId', width: 110, render: (v) => `#${v}` },
    { title: 'Seguimiento', dataIndex: 'seguimiento', width: 150 },
  ];

  const inventoryColumns: ColumnsType<any> = [
    { title: 'Fecha', dataIndex: 'fecha', width: 180, render: (v) => formatDate(v) },
    { title: 'Medicamento', dataIndex: 'medicamento', width: 220 },
    { title: 'Movimiento', dataIndex: 'tipo', width: 130, render: (v) => <Tag>{v}</Tag> },
    { title: 'Cantidad', dataIndex: 'cantidad', width: 110, render: (v, row) => `${row.tipo === 'SALIDA' ? '-' : '+'}${v}` },
    { title: 'Existencia', dataIndex: 'stock', width: 140 },
    { title: 'Motivo', dataIndex: 'motivo' },
  ];

  return (
    <div className="audit-page">
      <section className="audit-hero">
        <div>
          <span><AuditOutlined /> TRAZABILIDAD DEL SISTEMA</span>
          <h1>Auditoría</h1>
          <p>Consulta actividad registrada sin permisos para modificar información.</p>
        </div>
        <Tag className="audit-readonly">Solo lectura</Tag>
      </section>

      {warning && <Alert type="warning" showIcon message={warning} />}

      <section className="audit-panel">
        <div className="audit-toolbar">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Buscar paciente, medicamento, diagnóstico, folio..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <RangePicker value={range as any} onChange={(value) => setRange(value as RangeValue)} format="DD/MM/YYYY" />
          <Button icon={<ReloadOutlined />} onClick={() => void cargar()}>Actualizar</Button>
        </div>

        {loading ? (
          <div className="audit-loading"><Spin size="large" /></div>
        ) : (
          <Tabs
            items={[
              {
                key: 'consultas',
                label: <span><SolutionOutlined /> Consultas ({clinicalRows.length})</span>,
                children: clinicalRows.length ? (
                  <Table columns={clinicalColumns} dataSource={clinicalRows} pagination={{ pageSize: 8, showSizeChanger: false }} />
                ) : <Empty description="Sin notas para los filtros seleccionados" />,
              },
              {
                key: 'recetas',
                label: <span><FileTextOutlined /> Recetas ({recetaRows.length})</span>,
                children: recetaRows.length ? (
                  <Table columns={recipeColumns} dataSource={recetaRows} pagination={{ pageSize: 8, showSizeChanger: false }} />
                ) : <Empty description="Sin recetas para los filtros seleccionados" />,
              },
              {
                key: 'inventario',
                label: <span><MedicineBoxOutlined /> Inventario ({inventoryRows.length})</span>,
                children: inventoryRows.length ? (
                  <Table columns={inventoryColumns} dataSource={inventoryRows} pagination={{ pageSize: 8, showSizeChanger: false }} />
                ) : <Empty description="Sin movimientos de inventario para los filtros seleccionados" />,
              },
            ]}
          />
        )}
      </section>
    </div>
  );
};

export default Auditoria;
