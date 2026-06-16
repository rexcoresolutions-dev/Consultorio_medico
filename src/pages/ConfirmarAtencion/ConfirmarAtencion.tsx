import React from 'react';
import { Typography } from 'antd';
import {
  FileTextOutlined,
  ToolOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import './ConfirmarAtencion.css';

const { Title, Text } = Typography;

const ConfirmarAtencion: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="confirmar-page">
      <div className="confirmar-shell">
        <div className="confirmar-intro">

          <Title level={2}>¿Qué deseas registrar?</Title>

          <Text>
            Seleccione el flujo que corresponde a la atención del paciente.
          </Text>
        </div>

        <div className="confirmar-grid">
          <button
            type="button"
            className="confirmar-card confirmar-consulta"
            onClick={() => navigate('/pacientes')}
          >
            <div className="confirmar-card-left">
              <div className="confirmar-icon">
                <FileTextOutlined />
              </div>

              <div>
                <h3>Consulta</h3>
                <p>Crear una nueva consulta médica y registrar la valoración del paciente.</p>
              </div>
            </div>

            <div className="confirmar-arrow">
              <ArrowRightOutlined />
            </div>
          </button>

          <button
            type="button"
            className="confirmar-card confirmar-procedimiento"
            onClick={() => navigate('/procedimientos')}
          >
            <div className="confirmar-card-left">
              <div className="confirmar-icon">
                <ToolOutlined />
              </div>

              <div>
                <h3>Procedimiento</h3>
                <p>Registrar un procedimiento clínico realizado al paciente.</p>
              </div>
            </div>

            <div className="confirmar-arrow">
              <ArrowRightOutlined />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmarAtencion;