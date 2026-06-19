import React from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Space,
  Button,
  Tag,
  Table,
  Progress,
  Avatar,
} from 'antd';
import {
  CalendarOutlined,
  UserOutlined,
  FileTextOutlined,
  MedicineBoxOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import './DashboardMedico.css';

const { Title, Text } = Typography;

interface AgendaItem {
  id: number;
  hora: string;
  paciente: string;
  motivo: string;
  estado: 'En espera' | 'En consulta' | 'Programada' | 'Finalizada';
}

const agendaHoy: AgendaItem[] = [
  {
    id: 1,
    hora: '09:00',
    paciente: 'Juan Pérez López',
    motivo: 'Consulta general',
    estado: 'En espera',
  },
  {
    id: 2,
    hora: '09:30',
    paciente: 'María Santos Mejía',
    motivo: 'Revisión',
    estado: 'En consulta',
  },
  {
    id: 3,
    hora: '10:00',
    paciente: 'Ana Sofía Ramírez',
    motivo: 'Seguimiento',
    estado: 'Programada',
  },
  {
    id: 4,
    hora: '10:30',
    paciente: 'Roberto Hernández',
    motivo: 'Dolor de cabeza',
    estado: 'Programada',
  },
];

const consultasSemana = [
  { dia: 'Lun', total: 12 },
  { dia: 'Mar', total: 18 },
  { dia: 'Mié', total: 9 },
  { dia: 'Jue', total: 14 },
  { dia: 'Vie', total: 20 },
];

const pacientesRecientes = [
  { nombre: 'María López', fecha: 'Hoy' },
  { nombre: 'Juan Pérez', fecha: 'Ayer' },
  { nombre: 'Carlos Ruiz', fecha: '03/06/2026' },
];

const DashboardMedico: React.FC = () => {
  const navigate = useNavigate();

  const getEstadoColor = (estado: AgendaItem['estado']) => {
    switch (estado) {
      case 'En espera':
        return 'warning';
      case 'En consulta':
        return 'processing';
      case 'Programada':
        return 'blue';
      case 'Finalizada':
        return 'success';
      default:
        return 'default';
    }
  };

  const goToConsulta = () => {
    navigate('/pacientes');
  };

  const goToProcedimiento = () => {
    navigate('/procedimientos');
  };

  const goToReceta = () => {
    navigate('/recetas');
  };

  const goToAgenda = () => {
    navigate('/citas');
  };

  const columns: ColumnsType<AgendaItem> = [
    {
      title: 'Hora',
      dataIndex: 'hora',
      width: 90,
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
      render: (estado) => <Tag color={getEstadoColor(estado)}>{estado}</Tag>,
    },
  ];

  return (
    <div className="doctor-dashboard">
      <div className="doctor-header">
        <div>
          <Text type="secondary">
            Resumen de agenda, pacientes y actividades clínicas del día
          </Text>
        </div>

        <Space wrap className="doctor-header-actions">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            className="primary-medical-btn"
            onClick={goToConsulta}
          >
            Consulta
          </Button>

          <Button
            icon={<MedicineBoxOutlined />}
            className="secondary-medical-btn"
            onClick={goToProcedimiento}
          >
            Procedimiento
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={12} md={8} lg={6}>
          <Card className="doctor-stat-card">
            <CalendarOutlined className="doctor-stat-icon" />
            <Text>Citas hoy</Text>
            <Title level={2}>12</Title>
          </Card>
        </Col>

        <Col xs={12} md={8} lg={6}>
          <Card className="doctor-stat-card">
            <MedicineBoxOutlined className="doctor-stat-icon" />
            <Text>Consultas hoy</Text>
            <Title level={2}>8</Title>
          </Card>
        </Col>

        <Col xs={12} md={8} lg={6}>
          <Card className="doctor-stat-card">
            <UserOutlined className="doctor-stat-icon" />
            <Text>Pacientes</Text>
            <Title level={2}>156</Title>
          </Card>
        </Col>

        <Col xs={12} md={24} lg={6}>
          <Card className="doctor-stat-card">
            <FileTextOutlined className="doctor-stat-icon" />
            <Text>Recetas emitidas</Text>
            <Title level={2}>6</Title>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="doctor-main-row equal-row">
        <Col xs={24} lg={16}>
          <Card
            title="Agenda del día"
            className="doctor-card equal-card"
            extra={
              <Button type="link" onClick={goToAgenda}>
                Ver agenda completa
              </Button>
            }
          >
            <Table
              columns={columns}
              dataSource={agendaHoy}
              rowKey="id"
              pagination={false}
              size="middle"
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Pacientes recientes" className="doctor-card equal-card">
            <div className="recent-patients">
              {pacientesRecientes.map((paciente) => (
                <div key={paciente.nombre} className="recent-patient-item">
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
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="doctor-main-row equal-row">
        <Col xs={24} lg={12}>
          <Card title="Consultas por semana" className="doctor-card equal-card">
            <div className="week-chart">
              {consultasSemana.map((item) => (
                <div key={item.dia} className="week-item">
                  <span>{item.dia}</span>

                  <Progress percent={item.total * 4} showInfo={false} strokeColor="#1677ff" />

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
                onClick={goToConsulta}
              >
                Consulta
              </Button>

              <Button
                block
                icon={<MedicineBoxOutlined />}
                className="quick-main-action"
                onClick={goToProcedimiento}
              >
                Procedimiento
              </Button>

              <Button block icon={<FileTextOutlined />} onClick={goToReceta}>
                Nueva receta
              </Button>

              <Button block icon={<CalendarOutlined />} onClick={goToAgenda}>
                Ver agenda
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardMedico;