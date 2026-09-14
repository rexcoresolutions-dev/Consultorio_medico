import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Empty,
  Progress,
  Row,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  HistoryOutlined,
  MedicineBoxOutlined,
  PlusOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import pacientesService, {
  type PacienteData,
} from '../../services/pacientes/pacientes.service';
import consultasService from '../../services/consultas/consultas.service';
import recetasService from '../../services/recetas/recetas.service';
import './DashboardMedico.css';

const { Title, Text } = Typography;

interface ConsultaHoyItem {
  id: string;
  hora: string;
  paciente: string;
  motivo: string;
  estado: string;
}

interface PacienteReciente {
  id: string;
  nombre: string;
  fecha: string;
}

interface SemanaItem {
  dia: string;
  total: number;
}

const extractFecha = (item: any): string =>
  String(
    item?.fecha ??
      item?.fechaConsulta ??
      item?.fecha_consulta ??
      item?.createdAt ??
      item?.created_at ??
      item?.updatedAt ??
      item?.updated_at ??
      '',
  );

const toDate = (value?: string) => {
  if (!value) return null;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isSameLocalDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const startOfWeekMonday = (date: Date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);

  const day = result.getDay();
  const delta = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + delta);

  return result;
};

const endOfWeekSunday = (date: Date) => {
  const start = startOfWeekMonday(date);
  const result = new Date(start);
  result.setDate(result.getDate() + 7);
  return result;
};

const getConsultaPacienteId = (consulta: any): number | null => {
  const parsed = Number(
    consulta?.pacienteId ??
      consulta?.paciente_id ??
      consulta?.paciente?.id ??
      0,
  );

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const getConsultaMedicoId = (consulta: any): number | null => {
  const parsed = Number(
    consulta?.medicoId ??
      consulta?.medico_id ??
      consulta?.medico?.id ??
      consulta?.usuarioId ??
      consulta?.usuario_id ??
      consulta?.usuario?.id ??
      0,
  );

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};


const getRecetaConsultaId = (receta: any): number | null => {
  const parsed = Number(
    receta?.consultaId ??
      receta?.consulta_id ??
      receta?.consulta?.id ??
      0,
  );

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const getPacienteNombre = (
  consulta: any,
  pacientesById: Map<number, PacienteData>,
) => {
  const pacienteId = getConsultaPacienteId(consulta);
  const paciente =
    consulta?.paciente ??
    (pacienteId !== null ? pacientesById.get(pacienteId) : undefined);

  const nombre = `${
    paciente?.nombre ??
    consulta?.pacienteNombre ??
    consulta?.paciente_nombre ??
    ''
  } ${
    paciente?.primer_apellido ??
    paciente?.primerApellido ??
    ''
  } ${
    paciente?.segundo_apellido ??
    paciente?.segundoApellido ??
    ''
  }`
    .replace(/\s+/g, ' ')
    .trim();

  return nombre || 'Paciente';
};

const getMotivoConsulta = (consulta: any) =>
  String(
    consulta?.motivoConsulta ??
      consulta?.motivo_consulta ??
      consulta?.descripcion ??
      consulta?.tipoConsulta ??
      consulta?.tipo_consulta ??
      'Consulta médica',
  );

const getEstadoConsulta = (consulta: any) =>
  String(consulta?.estatus ?? consulta?.estado ?? 'REGISTRADA').toUpperCase();

const estadoLabel = (estado: string) => {
  const value = estado.toUpperCase();

  if (value === 'ABIERTA') return 'Abierta';
  if (['CERRADA', 'FINALIZADA', 'COMPLETADA'].includes(value)) return 'Finalizada';
  if (value === 'CANCELADA') return 'Cancelada';

  return value
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
};

const estadoColor = (estado: string) => {
  const value = estado.toUpperCase();

  if (value === 'ABIERTA') return 'processing';
  if (['CERRADA', 'FINALIZADA', 'COMPLETADA'].includes(value)) return 'success';
  if (value === 'CANCELADA') return 'error';

  return 'default';
};

const DashboardMedico: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [pacientes, setPacientes] = useState<PacienteData[]>([]);
  const [consultas, setConsultas] = useState<any[]>([]);
  const [recetas, setRecetas] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;

    const cargarTodo = async () => {
      setLoading(true);
      setErrorCarga(null);

      try {
        const medicoId = Number(user?.id);
        const sucursalId = Number(
          user?.sucursal_id ??
            user?.sucursal?.id ??
            0,
        );

        const consultaParams = {
          page: 1,
          limit: 100,
          ...(Number.isInteger(medicoId) && medicoId > 0 ? { medicoId } : {}),
          ...(Number.isInteger(sucursalId) && sucursalId > 0 ? { sucursalId } : {}),
        };

        const recetaParams = {
          page: 1,
          limit: 100,
        };

        const [pacientesResult, consultasPage, recetasPage] = await Promise.all([
          pacientesService.getPacientes(),
          consultasService.findAll(consultaParams),
          recetasService.findAll(recetaParams),
        ]);

        let consultasTodas = [...consultasPage.data];
        let recetasTodas = [...recetasPage.data];

        const paginasConsultas = Math.max(
          1,
          Number(consultasPage.meta.totalPages || 1),
        );

        if (paginasConsultas > 1) {
          const restantes = await Promise.all(
            Array.from({ length: paginasConsultas - 1 }, (_, index) =>
              consultasService.findAll({
                ...consultaParams,
                page: index + 2,
              }),
            ),
          );

          consultasTodas = consultasTodas.concat(
            ...restantes.flatMap((page) => page.data),
          );
        }

        const paginasRecetas = Math.max(
          1,
          Number(recetasPage.meta.totalPages || 1),
        );

        if (paginasRecetas > 1) {
          const restantes = await Promise.all(
            Array.from({ length: paginasRecetas - 1 }, (_, index) =>
              recetasService.findAll({
                ...recetaParams,
                page: index + 2,
              }),
            ),
          );

          recetasTodas = recetasTodas.concat(
            ...restantes.flatMap((page) => page.data),
          );
        }

        if (Number.isInteger(medicoId) && medicoId > 0) {
          consultasTodas = consultasTodas.filter((consulta) => {
            const consultaMedicoId = getConsultaMedicoId(consulta);
            return consultaMedicoId === null || consultaMedicoId === medicoId;
          });
        }

        const idsConsultasMedico = new Set(
          consultasTodas
            .map((consulta) => {
              const parsed = Number(
                consulta?.id ??
                  consulta?.consultaId ??
                  consulta?.consulta_id ??
                  0,
              );

              return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
            })
            .filter((id): id is number => id !== null),
        );

        recetasTodas = recetasTodas.filter((receta) => {
          const consultaId = getRecetaConsultaId(receta);
          return consultaId !== null && idsConsultasMedico.has(consultaId);
        });

        if (cancelled) return;

        setPacientes(pacientesResult);
        setConsultas(consultasTodas);
        setRecetas(recetasTodas);
      } catch (error: any) {
        if (cancelled) return;

        console.error('Error cargando Inicio médico:', error);
        const message = error?.response?.data?.message;

        setErrorCarga(
          Array.isArray(message)
            ? message.join('. ')
            : typeof message === 'string'
              ? message
              : 'No fue posible cargar la información clínica del servidor.',
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void cargarTodo();

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.sucursal_id, user?.sucursal?.id]);

  const pacientesById = useMemo(() => {
    const map = new Map<number, PacienteData>();

    pacientes.forEach((paciente) => {
      const id = Number(paciente.id);
      if (Number.isInteger(id) && id > 0) map.set(id, paciente);
    });

    return map;
  }, [pacientes]);

  const hoy = useMemo(() => new Date(), []);
  const inicioSemana = useMemo(() => startOfWeekMonday(hoy), [hoy]);
  const finSemana = useMemo(() => endOfWeekSunday(hoy), [hoy]);

  const consultasHoy = useMemo(
    () =>
      consultas
        .filter((consulta) => {
          const fecha = toDate(extractFecha(consulta));
          return fecha ? isSameLocalDay(fecha, hoy) : false;
        })
        .sort(
          (a, b) =>
            (toDate(extractFecha(a))?.getTime() ?? 0) -
            (toDate(extractFecha(b))?.getTime() ?? 0),
        ),
    [consultas, hoy],
  );

  const consultasSemana = useMemo(
    () =>
      consultas.filter((consulta) => {
        const fecha = toDate(extractFecha(consulta));
        return Boolean(
          fecha &&
            fecha.getTime() >= inicioSemana.getTime() &&
            fecha.getTime() < finSemana.getTime(),
        );
      }),
    [consultas, finSemana, inicioSemana],
  );

  const recetasHoy = useMemo(
    () =>
      recetas.filter((receta) => {
        const fecha = toDate(extractFecha(receta));
        return fecha ? isSameLocalDay(fecha, hoy) : false;
      }),
    [hoy, recetas],
  );

  const agendaData = useMemo<ConsultaHoyItem[]>(
    () =>
      consultasHoy.map((consulta, index) => {
        const fecha = toDate(extractFecha(consulta));
        const estado = getEstadoConsulta(consulta);

        return {
          id: String(consulta?.id ?? `consulta-${index}`),
          hora: fecha
            ? fecha.toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : '-',
          paciente: getPacienteNombre(consulta, pacientesById),
          motivo: getMotivoConsulta(consulta),
          estado,
        };
      }),
    [consultasHoy, pacientesById],
  );

  const pacientesRecientes = useMemo<PacienteReciente[]>(() => {
    const ordenadas = [...consultas].sort(
      (a, b) =>
        (toDate(extractFecha(b))?.getTime() ?? 0) -
        (toDate(extractFecha(a))?.getTime() ?? 0),
    );

    const usados = new Set<string>();
    const resultado: PacienteReciente[] = [];

    for (const consulta of ordenadas) {
      const pacienteId = getConsultaPacienteId(consulta);
      const nombre = getPacienteNombre(consulta, pacientesById);
      const key = pacienteId ? String(pacienteId) : nombre.toLowerCase();

      if (usados.has(key)) continue;
      usados.add(key);

      const fecha = toDate(extractFecha(consulta));
      const fechaLabel = fecha
        ? isSameLocalDay(fecha, hoy)
          ? 'Hoy'
          : fecha.toLocaleDateString('es-MX')
        : '-';

      resultado.push({
        id: key,
        nombre,
        fecha: fechaLabel,
      });

      if (resultado.length >= 4) break;
    }

    return resultado;
  }, [consultas, hoy, pacientesById]);

  const semanaData = useMemo<SemanaItem[]>(() => {
    const labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    return labels.map((dia, index) => {
      const inicioDia = new Date(inicioSemana);
      inicioDia.setDate(inicioSemana.getDate() + index);

      return {
        dia,
        total: consultasSemana.filter((consulta) => {
          const fecha = toDate(extractFecha(consulta));
          return fecha ? isSameLocalDay(fecha, inicioDia) : false;
        }).length,
      };
    });
  }, [consultasSemana, inicioSemana]);

  const maxSemana = Math.max(1, ...semanaData.map((item) => item.total));

  const columns: ColumnsType<ConsultaHoyItem> = [
    {
      title: 'Hora',
      dataIndex: 'hora',
      width: 105,
      render: (hora) => (
        <span className="agenda-hour">
          <ClockCircleOutlined /> {hora}
        </span>
      ),
    },
    {
      title: 'Paciente',
      dataIndex: 'paciente',
      ellipsis: true,
      render: (paciente) => (
        <Space>
          <Avatar icon={<UserOutlined />} className="patient-avatar" />
          <strong>{paciente}</strong>
        </Space>
      ),
    },
    {
      title: 'Motivo',
      dataIndex: 'motivo',
      ellipsis: true,
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      width: 130,
      align: 'center',
      render: (estado) => (
        <Tag color={estadoColor(estado)}>{estadoLabel(estado)}</Tag>
      ),
    },
  ];

  return (
    <div className="doctor-dashboard">
      <div className="doctor-header">
        <div>
        </div>

        <Space wrap className="doctor-header-actions">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            className="primary-medical-btn"
            onClick={() => navigate('/pacientes')}
          >
            Consulta
          </Button>

          <Button
            icon={<MedicineBoxOutlined />}
            className="secondary-medical-btn"
            onClick={() => navigate('/procedimientos')}
          >
            Procedimiento
          </Button>
        </Space>
      </div>

      {errorCarga && (
        <Alert
          type="warning"
          showIcon
          message="No se pudo actualizar todo el Inicio"
          description={errorCarga}
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={12} md={8} lg={6}>
          <Card className="doctor-stat-card" loading={loading}>
            <MedicineBoxOutlined className="doctor-stat-icon" />
            <Text>Consultas hoy</Text>
            <Title level={2}>{consultasHoy.length}</Title>
          </Card>
        </Col>

        <Col xs={12} md={8} lg={6}>
          <Card className="doctor-stat-card" loading={loading}>
            <HistoryOutlined className="doctor-stat-icon" />
            <Text>Consultas esta semana</Text>
            <Title level={2}>{consultasSemana.length}</Title>
          </Card>
        </Col>

        <Col xs={12} md={8} lg={6}>
          <Card className="doctor-stat-card" loading={loading}>
            <UserOutlined className="doctor-stat-icon" />
            <Text>Pacientes</Text>
            <Title level={2}>{pacientes.length}</Title>
          </Card>
        </Col>

        <Col xs={12} md={24} lg={6}>
          <Card className="doctor-stat-card" loading={loading}>
            <FileTextOutlined className="doctor-stat-icon" />
            <Text>Recetas hoy</Text>
            <Title level={2}>{recetasHoy.length}</Title>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="doctor-main-row equal-row">
        <Col xs={24} lg={16}>
          <Card
            title="Consultas de hoy"
            className="doctor-card equal-card"
            extra={
              <Button type="link" onClick={() => navigate('/pacientes')}>
                Ver pacientes
              </Button>
            }
          >
            <Table
              columns={columns}
              dataSource={agendaData}
              rowKey="id"
              loading={loading}
              pagination={false}
              size="middle"
              locale={{
                emptyText: <Empty description="No hay consultas registradas hoy" />,
              }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            title="Pacientes recientes"
            className="doctor-card equal-card"
            loading={loading}
          >
            {pacientesRecientes.length === 0 ? (
              <Empty description="Todavía no hay consultas recientes" />
            ) : (
              <div className="recent-patients">
                {pacientesRecientes.map((paciente) => (
                  <div key={paciente.id} className="recent-patient-item">
                    <Space>
                      <Avatar icon={<UserOutlined />} className="patient-avatar" />

                      <div>
                        <strong>{paciente.nombre}</strong>
                        <p>Última consulta: {paciente.fecha}</p>
                      </div>
                    </Space>

                    <CheckCircleOutlined className="recent-check" />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="doctor-main-row equal-row">
        <Col xs={24} lg={12}>
          <Card
            title="Consultas de la semana"
            className="doctor-card equal-card"
            loading={loading}
          >
            <div className="week-chart">
              {semanaData.map((item) => (
                <div key={item.dia} className="week-item">
                  <span>{item.dia}</span>

                  <Progress
                    percent={Math.round((item.total / maxSemana) * 100)}
                    showInfo={false}
                  />

                  <strong>{item.total}</strong>
                </div>
              ))}
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Acciones rápidas" className="doctor-card doctor-actions-card equal-card">
            <div className="quick-actions-grid">
              <Button
                block
                icon={<PlusOutlined />}
                className="quick-main-action"
                onClick={() => navigate('/pacientes')}
              >
                Consulta
              </Button>

              <Button
                block
                icon={<MedicineBoxOutlined />}
                className="quick-main-action"
                onClick={() => navigate('/procedimientos')}
              >
                Procedimiento
              </Button>

              <Button
                block
                icon={<MedicineBoxOutlined />}
                onClick={() => navigate('/inventario')}
              >
                Inventario
              </Button>

              <Button
                block
                icon={<HistoryOutlined />}
                onClick={() => navigate('/historico-paciente')}
              >
                Histórico
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardMedico;
