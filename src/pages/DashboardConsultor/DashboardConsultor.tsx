import React from 'react';
import {
  CalendarOutlined,
  FileTextOutlined,
  TeamOutlined,
  BarChartOutlined,
  MedicineBoxOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  AlertOutlined,
  RiseOutlined,
} from '@ant-design/icons';

import './DashboardConsultor.css';

const DashboardConsultor: React.FC = () => {
  return (
    <div className="consultor-dashboard">
      <div className="consultor-header">
        <div>
          <p className="consultor-subtitle">Panel de consulta general</p>

          <h1>Inicio</h1>

          <span>
            Consulta estadísticas, pacientes, citas y actividad clínica sin permisos de edición.
          </span>
        </div>

        <div className="readonly-badge">
          <EyeOutlined />
          Solo lectura
        </div>
      </div>

      <div className="consultor-highlight">
        <div>
          <p>Resumen operativo</p>
          <h2>Monitoreo general del consultorio</h2>
          <span>
            Visualiza el comportamiento de citas, pacientes, recetas y productividad clínica.
          </span>
        </div>

        <div className="highlight-indicator">
          <RiseOutlined />
          <strong>78%</strong>
          <small>Actividad completada</small>
        </div>
      </div>

      <div className="consultor-stats-grid">
        <div className="consultor-stat-card">
          <div className="stat-icon">
            <CalendarOutlined />
          </div>
          <p>Citas registradas</p>
          <h2>124</h2>
          <span>Este mes</span>
        </div>

        <div className="consultor-stat-card">
          <div className="stat-icon">
            <MedicineBoxOutlined />
          </div>
          <p>Consultas realizadas</p>
          <h2>86</h2>
          <span>Últimos 30 días</span>
        </div>

        <div className="consultor-stat-card">
          <div className="stat-icon">
            <TeamOutlined />
          </div>
          <p>Pacientes activos</p>
          <h2>312</h2>
          <span>Registrados</span>
        </div>

        <div className="consultor-stat-card">
          <div className="stat-icon">
            <FileTextOutlined />
          </div>
          <p>Recetas emitidas</p>
          <h2>58</h2>
          <span>Este mes</span>
        </div>
      </div>

      <div className="consultor-content-grid">
        <section className="consultor-card large-card">
          <div className="card-title-row">
            <h3>Resumen de agenda</h3>
            <span>Hoy</span>
          </div>

          <div className="agenda-table">
            <div className="agenda-row agenda-head">
              <span>Hora</span>
              <span>Paciente</span>
              <span>Médico</span>
              <span>Estado</span>
            </div>

            <div className="agenda-row">
              <span>
                <ClockCircleOutlined /> 09:00
              </span>
              <strong>Juan Pérez López</strong>
              <span>Dra. María Santos</span>
              <em className="status waiting">En espera</em>
            </div>

            <div className="agenda-row">
              <span>
                <ClockCircleOutlined /> 09:30
              </span>
              <strong>Ana Sofía Ramírez</strong>
              <span>Dr. Carlos Méndez</span>
              <em className="status progress">En consulta</em>
            </div>

            <div className="agenda-row">
              <span>
                <ClockCircleOutlined /> 10:00
              </span>
              <strong>Luis Hernández</strong>
              <span>Dra. Fernanda Ruiz</span>
              <em className="status scheduled">Programada</em>
            </div>

            <div className="agenda-row">
              <span>
                <ClockCircleOutlined /> 10:30
              </span>
              <strong>María López</strong>
              <span>Dr. Roberto Díaz</span>
              <em className="status done">Finalizada</em>
            </div>
          </div>
        </section>

        <section className="consultor-card">
          <div className="card-title-row">
            <h3>Pacientes recientes</h3>
            <span>Consulta</span>
          </div>

          <div className="patient-list">
            <div className="patient-item">
              <div className="patient-avatar">
                <UserOutlined />
              </div>
              <div>
                <strong>María López</strong>
                <p>Última consulta: Hoy</p>
              </div>
              <CheckCircleOutlined />
            </div>

            <div className="patient-item">
              <div className="patient-avatar">
                <UserOutlined />
              </div>
              <div>
                <strong>Juan Pérez</strong>
                <p>Última consulta: Ayer</p>
              </div>
              <CheckCircleOutlined />
            </div>

            <div className="patient-item">
              <div className="patient-avatar">
                <UserOutlined />
              </div>
              <div>
                <strong>Ana Ramírez</strong>
                <p>Última consulta: 2 días</p>
              </div>
              <CheckCircleOutlined />
            </div>
          </div>
        </section>

        <section className="consultor-card">
          <div className="card-title-row">
            <h3>Estadísticas clínicas</h3>
            <span>General</span>
          </div>

          <div className="mini-stats">
            <div>
              <BarChartOutlined />
              <p>Consultas completadas</p>
              <strong>78%</strong>
            </div>

            <div>
              <CalendarOutlined />
              <p>Citas pendientes</p>
              <strong>22</strong>
            </div>

            <div>
              <FileTextOutlined />
              <p>Expedientes revisados</p>
              <strong>145</strong>
            </div>
          </div>
        </section>

        <section className="consultor-card">
          <div className="card-title-row">
            <h3>Alertas informativas</h3>
            <span>Monitoreo</span>
          </div>

          <div className="consultor-alerts">
            <div className="alert-item warning">
              <AlertOutlined />
              <div>
                <strong>5 citas pendientes por confirmar</strong>
                <p>Revisión sugerida por administración.</p>
              </div>
            </div>

            <div className="alert-item info">
              <EyeOutlined />
              <div>
                <strong>12 expedientes actualizados</strong>
                <p>Actividad registrada durante el día.</p>
              </div>
            </div>

            <div className="alert-item success">
              <CheckCircleOutlined />
              <div>
                <strong>78% de consultas completadas</strong>
                <p>Indicador general de atención clínica.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="consultor-card">
          <div className="card-title-row">
            <h3>Actividad reciente</h3>
            <span>Lectura</span>
          </div>

          <div className="activity-list">
            <p>
              <CheckCircleOutlined /> Consulta finalizada para María López.
            </p>
            <p>
              <CheckCircleOutlined /> Receta emitida por Dr. Carlos Méndez.
            </p>
            <p>
              <CheckCircleOutlined /> Nuevo paciente registrado en sistema.
            </p>
            <p>
              <CheckCircleOutlined /> Cita programada para mañana.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardConsultor;