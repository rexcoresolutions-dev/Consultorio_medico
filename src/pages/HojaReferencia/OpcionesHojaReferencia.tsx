import React from 'react';
import { Button, Typography } from 'antd';
import {
  FileSearchOutlined,
  FileAddOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import './OpcionesHojaReferencia.css';

const { Title, Text } = Typography;

const OpcionesHojaReferencia: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="opciones-ref-page">
      <div className="opciones-ref-shell">

        <div className="opciones-ref-header">
          <Title level={1}>¿Qué deseas registrar?</Title>
          <Text>
            Selecciona el flujo que corresponde a la hoja de referencia del paciente.
          </Text>
        </div>

        <div className="opciones-ref-grid">
          <button
            type="button"
            className="opciones-ref-card disabled"
            disabled
          >
            <div className="opciones-ref-icon muted">
              <FileSearchOutlined />
            </div>

            <div className="opciones-ref-content">
              <h2>Consultar hoja</h2>
              <p>
                Consulta una hoja de referencia registrada previamente.
              </p>
            </div>

            <div className="opciones-ref-action">
              Próximamente <ArrowRightOutlined />
            </div>
          </button>

          <button
            type="button"
            className="opciones-ref-card active"
            onClick={() => navigate('/hoja-referencia/crear')}
          >
            <div className="opciones-ref-icon">
              <FileAddOutlined />
            </div>

            <div className="opciones-ref-content">
              <h2>Crear hoja</h2>
              <p>
                Crear una nueva hoja de referencia para el paciente activo.
              </p>
            </div>

            <div className="opciones-ref-action">
              Continuar <ArrowRightOutlined />
            </div>
          </button>
        </div>
      </div>
    </section>
  );
};

export default OpcionesHojaReferencia;