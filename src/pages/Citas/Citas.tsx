import React, { useEffect, useMemo, useState } from 'react';
import {
  App as AntdApp,
  Button,
  Calendar,
  DatePicker,
  Empty,
  Form,
  Input,
  Modal,
  Segmented,
  Select,
  Spin,
  Tag,
  TimePicker,
  Tooltip,
} from 'antd';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EditOutlined,
  FileTextOutlined,
  MedicineBoxOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/es';
import Swal from 'sweetalert2';

import citasService, {
  type CitaAgenda,
  type CitaEstado,
  type CitaTipo,
} from '../../services/citas/citas.service';
import type { PacienteData } from '../../services/pacientes/pacientes.service';
import './Citas.css';

dayjs.locale('es');

const { TextArea } = Input;

type Vista = 'agenda' | 'calendario';

interface CitaFormValues {
  pacienteId: number;
  fecha: Dayjs;
  hora: Dayjs;
  duracion: number;
  tipo: CitaTipo;
  motivo: string;
  estado: CitaEstado;
  notas?: string;
}

const statusLabel: Record<CitaEstado, string> = {
  PROGRAMADA: 'Programada',
  CONFIRMADA: 'Confirmada',
  EN_ESPERA: 'En espera',
  COMPLETADA: 'Atendida',
  CANCELADA: 'Cancelada',
};

const typeLabel: Record<CitaTipo, string> = {
  CONSULTA: 'Consulta',
  SEGUIMIENTO: 'Seguimiento',
  REVISION: 'Revisión',
  PROCEDIMIENTO: 'Procedimiento',
};

const formatPatientName = (paciente: PacienteData) =>
  [paciente.nombre, paciente.primer_apellido, paciente.segundo_apellido]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

const dateHeading = (date: string) => {
  const current = dayjs(date);
  const today = dayjs().startOf('day');
  if (current.isSame(today, 'day')) return 'Hoy';
  if (current.isSame(today.add(1, 'day'), 'day')) return 'Mañana';
  return current.format('dddd, D [de] MMMM');
};

const Citas: React.FC = () => {
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm<CitaFormValues>();
  const fechaCita = Form.useWatch('fecha', form);
  const duracionCita = Form.useWatch('duracion', form) ?? 30;
  const [citas, setCitas] = useState<CitaAgenda[]>([]);
  const [pacientes, setPacientes] = useState<PacienteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vista, setVista] = useState<Vista>('agenda');
  const [mes, setMes] = useState<Dayjs>(dayjs());
  const [diaSeleccionado, setDiaSeleccionado] = useState<Dayjs>(dayjs());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | CitaEstado>('TODOS');
  const [originFilter, setOriginFilter] = useState<'TODOS' | 'MANUAL' | 'SEGUIMIENTO_RECETA'>('TODOS');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CitaAgenda | null>(null);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<CitaAgenda | null>(null);

  const loadAgenda = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await citasService.getAgenda();
      setCitas(data.citas);
      setPacientes(data.pacientes);
      if (data.warnings.length > 0) {
        message.warning(data.warnings[0]);
      }
    } catch (error) {
      console.error('Error cargando agenda de citas:', error);
      message.error('No fue posible cargar la agenda de citas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadAgenda();
  }, []);

  const metrics = useMemo(() => {
    const today = dayjs().format('YYYY-MM-DD');
    const weekEnd = dayjs().add(7, 'day').format('YYYY-MM-DD');
    const active = citas.filter((cita) => cita.estado !== 'CANCELADA');

    return {
      today: active.filter((cita) => cita.fecha === today).length,
      next7: active.filter(
        (cita) => cita.fecha >= today && cita.fecha <= weekEnd && cita.estado !== 'COMPLETADA',
      ).length,
      followups: active.filter(
        (cita) => cita.origen === 'SEGUIMIENTO_RECETA' && cita.estado !== 'COMPLETADA',
      ).length,
      pendingTime: active.filter(
        (cita) => cita.fecha >= today && !cita.hora && cita.estado !== 'COMPLETADA',
      ).length,
    };
  }, [citas]);

  const filtered = useMemo(() => {
    const monthKey = mes.format('YYYY-MM');
    const term = search.trim().toLowerCase();

    return citas.filter((cita) => {
      if (!cita.fecha.startsWith(monthKey)) return false;
      if (statusFilter !== 'TODOS' && cita.estado !== statusFilter) return false;
      if (originFilter !== 'TODOS' && cita.origen !== originFilter) return false;
      if (!term) return true;
      return [
        cita.pacienteNombre,
        cita.expediente,
        cita.motivo,
        cita.notas,
        cita.recetaId ? `receta ${cita.recetaId}` : '',
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [citas, mes, search, statusFilter, originFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, CitaAgenda[]>();
    filtered.forEach((cita) => {
      const items = map.get(cita.fecha) ?? [];
      items.push(cita);
      map.set(cita.fecha, items);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const selectedDayAppointments = useMemo(() => {
    const key = diaSeleccionado.format('YYYY-MM-DD');
    return citas
      .filter((cita) => cita.fecha === key && cita.estado !== 'CANCELADA')
      .sort((a, b) => (a.hora ?? '99:99').localeCompare(b.hora ?? '99:99'));
  }, [citas, diaSeleccionado]);

  const openNew = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      fecha: dayjs(),
      hora: dayjs().minute(Math.ceil(dayjs().minute() / 15) * 15).second(0),
      duracion: 30,
      tipo: 'CONSULTA',
      estado: 'PROGRAMADA',
    });
    setModalOpen(true);
  };

  const openEdit = (cita: CitaAgenda) => {
    setEditing(cita);
    form.resetFields();
    form.setFieldsValue({
      pacienteId: cita.pacienteId,
      fecha: dayjs(cita.fecha),
      hora: cita.hora ? dayjs(`${cita.fecha}T${cita.hora}`) : dayjs().hour(9).minute(0),
      duracion: cita.duracion,
      tipo: cita.tipo,
      motivo: cita.motivo,
      estado: cita.estado,
      notas: cita.notas,
    });
    setModalOpen(true);
  };

  const submitCita = async () => {
    try {
      const values = await form.validateFields();
      const fecha = values.fecha.format('YYYY-MM-DD');
      const hora = values.hora.format('HH:mm');
      const duracion = Number(values.duracion || 30);

      const conflict = citasService.hasConflict(
        citas,
        fecha,
        hora,
        duracion,
        editing?.id,
      );

      if (conflict) {
        await Swal.fire({
          icon: 'warning',
          title: 'Horario no disponible',
          html: `Ese horario ya está asignado a <b>${conflict.pacienteNombre}</b> a las <b>${dayjs(`${conflict.fecha}T${conflict.hora}`).format('hh:mm A')}</b>.<br><br>Selecciona otro horario disponible.`,
          confirmButtonText: 'Elegir otro horario',
          confirmButtonColor: '#20bfc1',
        });
        return;
      }

      setSaving(true);

      if (!editing) {
        await citasService.createManual({
          pacienteId: values.pacienteId,
          fecha,
          hora,
          duracion,
          tipo: values.tipo,
          motivo: values.motivo,
          estado: values.estado,
          notas: values.notas,
        });
      } else if (editing.origen === 'MANUAL') {
        await citasService.updateManual(editing.id, {
          pacienteId: values.pacienteId,
          fecha,
          hora,
          duracion,
          tipo: values.tipo,
          motivo: values.motivo,
          estado: values.estado,
          notas: values.notas,
        });
      } else if (editing.recetaId) {
        await citasService.updateSeguimiento(editing.recetaId, {
          hora,
          duracion,
          estado: values.estado,
          notas: values.notas,
        });
      }

      setModalOpen(false);
      form.resetFields();
      await loadAgenda(true);
      message.success(editing ? 'Cita actualizada.' : 'Cita registrada.');
    } catch (error: any) {
      if (error?.errorFields) return;
      console.error('Error guardando cita:', error);
      message.error('No fue posible guardar la cita.');
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (cita: CitaAgenda, estado: CitaEstado) => {
    if (cita.atendidaPorConsulta && estado !== 'COMPLETADA') {
      message.info('Esta cita aparece atendida porque ya existe una consulta del paciente en esa fecha.');
      return;
    }

    if (estado === 'CANCELADA') {
      const result = await Swal.fire({
        icon: 'question',
        title: '¿Cancelar cita?',
        text: `La cita de ${cita.pacienteNombre} quedará conservada en la agenda con estado cancelado.`,
        showCancelButton: true,
        confirmButtonText: 'Sí, cancelar',
        cancelButtonText: 'Volver',
        confirmButtonColor: '#ef4444',
      });
      if (!result.isConfirmed) return;
    }

    try {
      await citasService.setStatus(cita, estado);
      await loadAgenda(true);
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'No se pudo actualizar la cita.');
    }
  };

  const renderStatus = (estado: CitaEstado) => (
    <Tag className={`appointment-status status-${estado.toLowerCase()}`}>
      {statusLabel[estado]}
    </Tag>
  );

  const renderAppointment = (cita: CitaAgenda) => (
    <article
      key={cita.id}
      className={`appointment-row ${cita.estado === 'CANCELADA' ? 'is-cancelled' : ''}`}
    >
      <div className={`appointment-time ${!cita.hora ? 'pending' : ''}`}>
        <ClockCircleOutlined />
        <strong>{cita.hora ? dayjs(`${cita.fecha}T${cita.hora}`).format('hh:mm A') : 'Por definir'}</strong>
        {cita.hora && <span>{cita.duracion} min</span>}
      </div>

      <div className="appointment-main">
        <div className="appointment-title-line">
          <button type="button" className="patient-link" onClick={() => setDetail(cita)}>
            {cita.pacienteNombre}
          </button>
          {renderStatus(cita.estado)}
          <Tag className="appointment-type">{typeLabel[cita.tipo]}</Tag>
        </div>
        <div className="appointment-meta">
          {cita.expediente && <span><UserOutlined /> {cita.expediente}</span>}
          {cita.telefono && <span>{cita.telefono}</span>}
          {cita.origen === 'SEGUIMIENTO_RECETA' && (
            <span className="source-recipe"><FileTextOutlined /> Seguimiento de receta #{cita.recetaId}</span>
          )}
        </div>
        <p className="appointment-reason">{cita.motivo}</p>
        {cita.notas && <p className="appointment-notes">{cita.notas}</p>}
      </div>

      <div className="appointment-actions">
        <Tooltip title={cita.origen === 'SEGUIMIENTO_RECETA' ? 'Asignar horario o cambiar estado' : 'Editar cita'}>
          <Button icon={<EditOutlined />} onClick={() => openEdit(cita)}>
            {cita.origen === 'SEGUIMIENTO_RECETA' && !cita.hora ? 'Asignar horario' : 'Editar'}
          </Button>
        </Tooltip>
        {cita.estado !== 'COMPLETADA' && cita.estado !== 'CANCELADA' && (
          <Button onClick={() => void changeStatus(cita, 'CONFIRMADA')}>Confirmar</Button>
        )}
        {cita.estado !== 'CANCELADA' && cita.estado !== 'COMPLETADA' && (
          <Button danger onClick={() => void changeStatus(cita, 'CANCELADA')}>Cancelar</Button>
        )}
      </div>
    </article>
  );

  const cellRender = (current: Dayjs) => {
    const key = current.format('YYYY-MM-DD');
    const dayItems = citas
      .filter((cita) => cita.fecha === key && cita.estado !== 'CANCELADA')
      .slice(0, 3);
    const extra = citas.filter(
      (cita) => cita.fecha === key && cita.estado !== 'CANCELADA',
    ).length - dayItems.length;

    return (
      <div className="calendar-cell-content">
        {dayItems.map((cita) => (
          <div key={cita.id} className={`calendar-event calendar-${cita.estado.toLowerCase()}`}>
            <span>{cita.hora ? dayjs(`${cita.fecha}T${cita.hora}`).format('hh:mm A') : '•••'}</span>
            <b>{cita.pacienteNombre.split(' ')[0]}</b>
          </div>
        ))}
        {extra > 0 && <div className="calendar-extra">+{extra} más</div>}
      </div>
    );
  };

  return (
    <div className="appointments-page">
      <section className="appointments-hero">
        <div className="appointments-hero-left">
          <div className="appointments-hero-icon"><CalendarOutlined /></div>
          <div>
            <span className="appointments-eyebrow">AGENDA DEL CONSULTORIO</span>
            <h1>Citas</h1>
            <p>Organiza la agenda y recupera automáticamente los seguimientos indicados en las recetas médicas.</p>
          </div>
        </div>
        <div className="appointments-hero-actions">
          <Button icon={<ReloadOutlined />} loading={refreshing} onClick={() => void loadAgenda(true)}>
            Actualizar
          </Button>
          <Button type="primary" icon={<PlusOutlined />} className="appointments-primary" onClick={openNew}>
            Nueva cita
          </Button>
        </div>
      </section>

      <section className="appointments-stats">
        <div className="appointment-stat-card">
          <span className="stat-icon"><CalendarOutlined /></span>
          <div><small>CITAS HOY</small><strong>{metrics.today}</strong><p>{dayjs().format('DD/MM/YYYY')}</p></div>
        </div>
        <div className="appointment-stat-card">
          <span className="stat-icon"><ClockCircleOutlined /></span>
          <div><small>PRÓXIMOS 7 DÍAS</small><strong>{metrics.next7}</strong><p>Pendientes por atender</p></div>
        </div>
        <div className="appointment-stat-card">
          <span className="stat-icon"><MedicineBoxOutlined /></span>
          <div><small>SEGUIMIENTOS</small><strong>{metrics.followups}</strong><p>Generados desde recetas</p></div>
        </div>
        <div className="appointment-stat-card">
          <span className="stat-icon"><CheckCircleOutlined /></span>
          <div><small>SIN HORARIO</small><strong>{metrics.pendingTime}</strong><p>Seguimientos por programar</p></div>
        </div>
      </section>

      <section className="appointments-content">
        <div className="appointments-toolbar">
          <div className="appointments-month-control">
            <span>Periodo</span>
            <DatePicker
              picker="month"
              allowClear={false}
              value={mes}
              format="MMMM YYYY"
              onChange={(value) => value && setMes(value)}
            />
          </div>
          <div className="appointments-search">
            <SearchOutlined />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar paciente, expediente, motivo o receta..."
              variant="borderless"
              allowClear
            />
          </div>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            className="appointments-filter"
            options={[
              { value: 'TODOS', label: 'Todos los estados' },
              ...Object.entries(statusLabel).map(([value, label]) => ({ value, label })),
            ]}
          />
          <Select
            value={originFilter}
            onChange={setOriginFilter}
            className="appointments-filter"
            options={[
              { value: 'TODOS', label: 'Todos los orígenes' },
              { value: 'MANUAL', label: 'Citas manuales' },
              { value: 'SEGUIMIENTO_RECETA', label: 'Seguimientos de receta' },
            ]}
          />
          <Segmented
            value={vista}
            onChange={(value) => setVista(value as Vista)}
            options={[
              { value: 'agenda', label: 'Agenda' },
              { value: 'calendario', label: 'Calendario' },
            ]}
          />
        </div>

        {loading ? (
          <div className="appointments-loading"><Spin size="large" /><span>Cargando agenda...</span></div>
        ) : vista === 'agenda' ? (
          <div className="appointments-agenda">
            {grouped.length === 0 ? (
              <Empty description="No hay citas para los filtros seleccionados." />
            ) : (
              grouped.map(([date, items]) => (
                <section className="agenda-day" key={date}>
                  <header className="agenda-day-header">
                    <div>
                      <strong>{dateHeading(date)}</strong>
                      <span>{dayjs(date).format('DD [de] MMMM [de] YYYY')}</span>
                    </div>
                    <b>{items.length} {items.length === 1 ? 'cita' : 'citas'}</b>
                  </header>
                  <div className="agenda-day-list">{items.map(renderAppointment)}</div>
                </section>
              ))
            )}
          </div>
        ) : (
          <div className="appointments-calendar-layout">
            <div className="appointments-calendar-card">
              <Calendar
                value={mes}
                fullscreen={false}
                cellRender={cellRender}
                onSelect={(value) => {
                  setDiaSeleccionado(value);
                  setMes(value);
                }}
                onPanelChange={(value) => setMes(value)}
              />
            </div>
            <aside className="selected-day-card">
              <div className="selected-day-header">
                <span>{diaSeleccionado.format('dddd')}</span>
                <strong>{diaSeleccionado.format('D')}</strong>
                <p>{diaSeleccionado.format('MMMM YYYY')}</p>
              </div>
              <div className="selected-day-list">
                {selectedDayAppointments.length === 0 ? (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin citas" />
                ) : (
                  selectedDayAppointments.map((cita) => (
                    <button key={cita.id} type="button" className="selected-day-item" onClick={() => setDetail(cita)}>
                      <span>{cita.hora ? dayjs(`${cita.fecha}T${cita.hora}`).format('hh:mm A') : 'Por definir'}</span>
                      <div><b>{cita.pacienteNombre}</b><small>{typeLabel[cita.tipo]}</small></div>
                    </button>
                  ))
                )}
              </div>
            </aside>
          </div>
        )}
      </section>

      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        title={editing ? (editing.origen === 'SEGUIMIENTO_RECETA' ? 'Programar seguimiento' : 'Editar cita') : 'Nueva cita'}
        width={720}
        className="appointment-form-modal"
        footer={[
          <Button key="cancel" onClick={() => setModalOpen(false)}>Cancelar</Button>,
          <Button key="save" type="primary" className="appointments-primary" loading={saving} onClick={() => void submitCita()}>
            {editing ? 'Guardar cambios' : 'Registrar cita'}
          </Button>,
        ]}
      >
        {editing?.origen === 'SEGUIMIENTO_RECETA' && (
          <div className="followup-banner">
            <FileTextOutlined />
            <div>
              <strong>Seguimiento generado desde receta #{editing.recetaId}</strong>
              <span>La fecha y el paciente provienen del documento clínico. Aquí puedes asignar horario y estado.</span>
            </div>
          </div>
        )}

        <Form form={form} layout="vertical" className="appointment-form">
          <div className="appointment-form-grid two">
            <Form.Item
              label="Paciente"
              name="pacienteId"
              rules={[{ required: true, message: 'Selecciona un paciente' }]}
            >
              <Select
                showSearch
                disabled={editing?.origen === 'SEGUIMIENTO_RECETA'}
                placeholder="Buscar paciente..."
                optionFilterProp="label"
                options={pacientes
                  .filter((paciente) => Number(paciente.id) > 0)
                  .map((paciente) => ({
                    value: Number(paciente.id),
                    label: `${formatPatientName(paciente)}${paciente.numero_expediente ? ` · ${paciente.numero_expediente}` : ''}`,
                  }))}
              />
            </Form.Item>
            <Form.Item label="Tipo" name="tipo" rules={[{ required: true }]}> 
              <Select
                disabled={editing?.origen === 'SEGUIMIENTO_RECETA'}
                options={Object.entries(typeLabel).map(([value, label]) => ({ value, label }))}
              />
            </Form.Item>
          </div>

          <div className="appointment-form-grid three">
            <Form.Item label="Fecha" name="fecha" rules={[{ required: true, message: 'Selecciona una fecha' }]}> 
              <DatePicker
                format="DD/MM/YYYY"
                disabled={editing?.origen === 'SEGUIMIENTO_RECETA'}
                disabledDate={(current) => current && current.isBefore(dayjs().startOf('day'))}
              />
            </Form.Item>
            <Form.Item label="Hora disponible (AM/PM)" name="hora" rules={[{ required: true, message: 'Selecciona un horario' }]}> 
              <TimePicker
                format="hh:mm A"
                minuteStep={15}
                use12Hours
                disabledTime={() =>
                  citasService.getDisabledTimeConfig(
                    citas,
                    fechaCita,
                    Number(duracionCita || 30),
                    editing?.id,
                    editing?.recetaId,
                  )
                }
                placeholder="Seleccionar horario AM/PM"
              />
            </Form.Item>
            <Form.Item label="Duración" name="duracion" rules={[{ required: true }]}> 
              <Select options={[15, 20, 30, 45, 60, 90].map((value) => ({ value, label: `${value} minutos` }))} />
            </Form.Item>
          </div>

          <div className="appointment-availability-note">
            <ClockCircleOutlined />
            <span>Los horarios ya asignados se deshabilitan automáticamente para evitar citas duplicadas.</span>
          </div>

          <Form.Item label="Motivo de la cita" name="motivo" rules={[{ required: true, message: 'Captura el motivo de la cita' }]}> 
            <Input disabled={editing?.origen === 'SEGUIMIENTO_RECETA'} placeholder="Ej. Consulta general, revisión de resultados..." />
          </Form.Item>

          <div className="appointment-form-grid two">
            <Form.Item label="Estado" name="estado" rules={[{ required: true }]}> 
              <Select
                options={Object.entries(statusLabel)
                  .filter(([value]) => value !== 'COMPLETADA' || editing?.estado === 'COMPLETADA')
                  .map(([value, label]) => ({ value, label }))}
              />
            </Form.Item>
            <div className="appointment-form-hint">
              {editing?.origen === 'SEGUIMIENTO_RECETA'
                ? 'El seguimiento continuará vinculado a la receta médica.'
                : 'Las citas manuales son temporales hasta contar con una API propia de citas.'}
            </div>
          </div>

          <Form.Item label="Notas internas" name="notas">
            <TextArea rows={3} placeholder="Información útil para recepción o para el médico..." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={Boolean(detail)}
        onCancel={() => setDetail(null)}
        footer={<Button onClick={() => setDetail(null)}>Cerrar</Button>}
        title="Detalle de la cita"
        width={620}
        className="appointment-detail-modal"
      >
        {detail && (
          <div className="appointment-detail">
            <div className="appointment-detail-person">
              <span><UserOutlined /></span>
              <div><small>PACIENTE</small><strong>{detail.pacienteNombre}</strong><p>{detail.expediente || 'Sin expediente visible'}</p></div>
              {renderStatus(detail.estado)}
            </div>
            <div className="appointment-detail-grid">
              <div><small>FECHA</small><strong>{dayjs(detail.fecha).format('DD/MM/YYYY')}</strong></div>
              <div><small>HORARIO</small><strong>{detail.hora ? dayjs(`${detail.fecha}T${detail.hora}`).format('hh:mm A') : 'Pendiente'}</strong></div>
              <div><small>DURACIÓN</small><strong>{detail.hora ? `${detail.duracion} min` : '-'}</strong></div>
              <div><small>TIPO</small><strong>{typeLabel[detail.tipo]}</strong></div>
            </div>
            <div className="appointment-detail-block"><small>MOTIVO</small><p>{detail.motivo}</p></div>
            {detail.notas && <div className="appointment-detail-block"><small>NOTAS</small><p>{detail.notas}</p></div>}
            {detail.origen === 'SEGUIMIENTO_RECETA' && (
              <div className="appointment-detail-source"><FileTextOutlined /><span>Seguimiento creado automáticamente desde la receta médica #{detail.recetaId}.</span></div>
            )}
            <div className="appointment-detail-actions">
              <Button icon={<EditOutlined />} onClick={() => { setDetail(null); openEdit(detail); }}>
                {detail.origen === 'SEGUIMIENTO_RECETA' && !detail.hora ? 'Asignar horario' : 'Editar'}
              </Button>
              {detail.estado !== 'CANCELADA' && detail.estado !== 'COMPLETADA' && (
                <Button danger onClick={() => { setDetail(null); void changeStatus(detail, 'CANCELADA'); }}>Cancelar cita</Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Citas;
