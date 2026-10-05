import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Empty, Spin, Tag } from 'antd';
import {
  AuditOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  HistoryOutlined,
  MedicineBoxOutlined,
  ReloadOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

import pacientesService from '../../services/pacientes/pacientes.service';
import { notasService } from '../../services/notas-evolucion/notas-evolucion.service';
import recetasService from '../../services/recetas/recetas.service';
import inventarioService from '../../services/inventario/inventario.service';
import { ROUTES } from '../../router/routes';
import './DashboardAuditor.css';

const entityDate = (item: any) =>
  String(
    item?.fechaElaboracion ?? item?.fechaHora ?? item?.fecha ??
      item?.fechaConsulta ??
      item?.fecha_consulta ??
      item?.createdAt ??
      item?.created_at ??
      '',
  );

const sameDay = (value: string, reference = dayjs()) => {
  const parsed = dayjs(value);
  return parsed.isValid() && parsed.format('YYYY-MM-DD') === reference.format('YYYY-MM-DD');
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

const consultaPacienteId = (consulta: any) =>
  Number(consulta?.pacienteId ?? consulta?.paciente_id ?? consulta?.paciente?.id ?? 0);

const consultaId = (consulta: any) =>
  Number(consulta?.id ?? consulta?.consultaId ?? consulta?.consulta_id ?? 0);

const recetaConsultaId = (receta: any) =>
  Number(receta?.consultaId ?? receta?.consulta_id ?? receta?.consulta?.id ?? 0);

const loadAllPages = async (loader: (params: any) => Promise<any>) => {
  const first = await loader({ page: 1, limit: 100 });
  const records = [...(first?.data ?? [])];
  const totalPages = Math.max(1, Number(first?.meta?.totalPages ?? 1));

  for (let page = 2; page <= totalPages; page += 1) {
    const next = await loader({ page, limit: 100 });
    records.push(...(next?.data ?? []));
  }

  return records;
};

const DashboardAuditor: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [consultas, setConsultas] = useState<any[]>([]);
  const [recetas, setRecetas] = useState<any[]>([]);
  const [movimientos, setMovimientos] = useState<any[]>([]);

  const cargar = async () => {
    setLoading(true);
    setError(null);

    const results = await Promise.allSettled([
      pacientesService.getPacientes(),
      notasService.list(),
      loadAllPages((params) => recetasService.findAll(params)),
      inventarioService.getMovimientos(),
    ]);

    const [pacientesResult, consultasResult, recetasResult, movimientosResult] = results;

    if (pacientesResult.status === 'fulfilled') setPacientes(pacientesResult.value ?? []);
    if (consultasResult.status === 'fulfilled') setConsultas(consultasResult.value ?? []);
    if (recetasResult.status === 'fulfilled') setRecetas(recetasResult.value ?? []);
    if (movimientosResult.status === 'fulfilled') setMovimientos(movimientosResult.value ?? []);

    const fallos = results.filter((result) => result.status === 'rejected').length;
    if (fallos > 0) {
      setError(
        fallos === results.length
          ? 'No fue posible cargar la información de auditoría.'
          : 'Algunas fuentes no respondieron. Se muestran los datos disponibles.',
      );
    }

    setLoading(false);
  };

  useEffect(() => {
    void cargar();
  }, []);

  const pacientesById = useMemo(() => {
    const map = new Map<number, any>();
    pacientes.forEach((paciente) => {
      const id = Number(paciente?.id);
      if (id > 0) map.set(id, paciente);
    });
    return map;
  }, [pacientes]);

  const consultasById = useMemo(() => {
    const map = new Map<number, any>();
    consultas.forEach((consulta) => {
      const id = Number(consulta.consultaId);
      if (id > 0) map.set(id, consulta);
    });
    return map;
  }, [consultas]);

  const metrics = useMemo(() => {
    const now = dayjs();
    const consultasHoy = consultas.filter((item) => sameDay(entityDate(item), now)).length;
    const recetasHoy = recetas.filter((item) => sameDay(entityDate(item), now)).length;
    const movimientosHoy = movimientos.filter((item) => sameDay(entityDate(item), now)).length;
    const consultasAbiertas = consultas.filter((item) =>
      String(item?.estatus ?? item?.estado ?? '').toUpperCase().includes('ABIERTA'),
    ).length;

    return {
      pacientes: pacientes.length,
      consultasHoy,
      recetasHoy,
      movimientosHoy,
      consultasAbiertas,
    };
  }, [pacientes, consultas, recetas, movimientos]);

  const actividad = useMemo(() => {
    const clinical = consultas.map((consulta) => {
      const paciente = pacientesById.get(consultaPacienteId(consulta)) ?? consulta?.paciente;
      const diagnostico = Array.isArray(consulta?.diagnosticos) && consulta.diagnosticos.length
        ? String(
            consulta.diagnosticos[0]?.nombre ?? consulta.diagnosticos[0]?.diagnostico?.descripcion ??
              consulta.diagnosticos[0]?.diagnostico?.nombre ??
              consulta.diagnosticos[0]?.descripcion ??
              'Nota de evolución',
          )
        : String(consulta?.motivoConsulta ?? consulta?.tipoConsulta ?? 'Nota de evolución');

      return {
        key: `consulta-${consultaId(consulta)}`,
        fecha: entityDate(consulta),
        tipo: 'Nota de evolución',
        titulo: fullName(paciente) || 'Paciente',
        detalle: diagnostico,
      };
    });

    const prescription = recetas.map((receta) => {
      const consulta = receta.consulta ?? consultasById.get(recetaConsultaId(receta));
      const paciente = consulta ? pacientesById.get(consultaPacienteId(consulta)) : null;
      const meds = Array.isArray(receta?.medicamentos)
        ? receta.medicamentos
            .map((item: any) => item?.medicamentoNombre ?? item?.nombre ?? item?.sustanciaActiva)
            .filter(Boolean)
            .slice(0, 2)
            .join(', ')
        : '';

      return {
        key: `receta-${receta?.id}`,
        fecha: entityDate(receta),
        tipo: 'Receta',
        titulo: fullName(paciente) || 'Paciente',
        detalle: meds || `Receta #${receta?.id ?? '-'}`,
      };
    });

    const inventory = movimientos.map((movimiento) => ({
      key: `mov-${movimiento?.id}`,
      fecha: entityDate(movimiento),
      tipo: 'Inventario',
      titulo: String(movimiento?.medicamento_nombre ?? 'Medicamento'),
      detalle: `${String(movimiento?.tipo ?? '').toUpperCase()} · ${Number(movimiento?.cantidad ?? 0)}`,
    }));

    return [...clinical, ...prescription, ...inventory]
      .filter((item) => dayjs(item.fecha).isValid())
      .sort((a, b) => dayjs(b.fecha).valueOf() - dayjs(a.fecha).valueOf())
      .slice(0, 8);
  }, [consultas, recetas, movimientos, pacientesById, consultasById]);

  return (
    <div className="auditor-dashboard">
      <section className="auditor-hero">
        <div>
          <span className="auditor-eyebrow"><AuditOutlined /> PANEL DE AUDITORÍA</span>
          <h1>Inicio</h1>
          <p>Supervisa la actividad clínica y administrativa sin modificar información.</p>
        </div>
        <div className="auditor-readonly"><FileSearchOutlined /> Solo lectura</div>
      </section>

      {error && <Alert type="warning" showIcon message={error} />}

      {loading ? (
        <div className="auditor-loading"><Spin size="large" /></div>
      ) : (
        <>
          <section className="auditor-metrics">
            <article>
              <TeamOutlined />
              <span>Pacientes registrados</span>
              <strong>{metrics.pacientes}</strong>
            </article>
            <article>
              <HistoryOutlined />
              <span>Notas de hoy</span>
              <strong>{metrics.consultasHoy}</strong>
            </article>
            <article>
              <FileTextOutlined />
              <span>Recetas hoy</span>
              <strong>{metrics.recetasHoy}</strong>
            </article>
            <article>
              <MedicineBoxOutlined />
              <span>Movimientos inventario</span>
              <strong>{metrics.movimientosHoy}</strong>
            </article>
          </section>

          <div className="auditor-grid">
            <section className="auditor-card auditor-card--activity">
              <div className="auditor-card-head">
                <div>
                  <span>TRAZABILIDAD</span>
                  <h2>Actividad reciente</h2>
                </div>
                <Button icon={<ReloadOutlined />} onClick={() => void cargar()}>
                  Actualizar
                </Button>
              </div>

              {actividad.length === 0 ? (
                <Empty description="Sin actividad registrada" />
              ) : (
                <div className="auditor-activity-list">
                  {actividad.map((item) => (
                    <div className="auditor-activity-row" key={item.key}>
                      <div className={`auditor-activity-icon auditor-activity-icon--${item.tipo.toLowerCase()}`}>
                        {item.tipo === 'Nota de evolución' ? <HistoryOutlined /> : item.tipo === 'Receta' ? <FileTextOutlined /> : <MedicineBoxOutlined />}
                      </div>
                      <div className="auditor-activity-copy">
                        <div>
                          <strong>{item.titulo}</strong>
                          <Tag>{item.tipo}</Tag>
                        </div>
                        <p>{item.detalle}</p>
                      </div>
                      <time>{dayjs(item.fecha).format('DD/MM/YYYY · hh:mm A')}</time>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="auditor-card auditor-card--quick">
              <span>ACCESOS DE AUDITOR</span>
              <h2>Consulta documental</h2>
              <p>Accede únicamente a módulos de lectura y trazabilidad.</p>

              <button type="button" onClick={() => navigate(ROUTES.AUDIT)}>
                <AuditOutlined />
                <div><strong>Auditoría</strong><small>Notas de evolución, recetas e inventario</small></div>
              </button>
              <button type="button" onClick={() => navigate(ROUTES.PRESCRIPTIONS)}>
                <FileTextOutlined />
                <div><strong>Recetas emitidas</strong><small>Documentos clínicos registrados</small></div>
              </button>
              <button type="button" onClick={() => navigate(ROUTES.CONTROL_DIARIO_PACIENTES)}>
                <FileSearchOutlined />
                <div><strong>Control diario</strong><small>Reporte clínico administrativo</small></div>
              </button>

              <div className="auditor-open-summary">
                <span>Notas registradas</span>
                <strong>{consultas.length}</strong>
                <small>Registros actualmente marcados como ABIERTA</small>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardAuditor;
