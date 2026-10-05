import React, { useState, useEffect } from 'react';
import { Card, Button, Table, message, Space, Spin, Alert, Typography, Tag } from 'antd';
import { ApiOutlined, ReloadOutlined, UserOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import userService from '../../services/user/user.service';
import { useAuth } from '../../hooks/useAuth';
import './TestApi.css';

const { Title, Text } = Typography;

// Definir la interfaz localmente en lugar de importarla
interface UserDataLocal {
  id?: number;
  nombre: string;
  primer_apellido: string;
  segundo_apellido?: string;
  email: string;
  telefono?: string;
  rol_id?: number;
  empresa_id?: number;
  sucursal_id?: number | null;
  activo?: boolean;
}

const TestApi: React.FC = () => {
  const [users, setUsers] = useState<UserDataLocal[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<'testing' | 'connected' | 'error'>('testing');
  const { user } = useAuth();

  const testConnection = async () => {
    setLoading(true);
    try {
      const usuarios = await userService.getUsuarios();
      setUsers(usuarios);
      setApiStatus('connected');
      message.success(`✅ Conexión exitosa! ${usuarios.length} usuarios encontrados`);
    } catch (error: any) {
      setApiStatus('error');
      console.error('Error details:', error);
      message.error(error.response?.data?.message || error.message || 'Error al conectar con la API');
    } finally {
      setLoading(false);
    }
  };

  const testGetUserById = async () => {
    setLoading(true);
    try {
      const userData = await userService.getUsuarioById(1);
      message.success(`✅ Usuario encontrado: ${userData.nombre} ${userData.primer_apellido} (${userData.email})`);
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al obtener usuario');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: 'Nombre completo',
      key: 'nombre',
      render: (record: UserDataLocal) => (
        <Text strong>
          {record.nombre} {record.primer_apellido} {record.segundo_apellido || ''}
        </Text>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Teléfono',
      dataIndex: 'telefono',
      key: 'telefono',
      render: (telefono: string) => telefono || '—',
    },
    {
      title: 'Estado',
      dataIndex: 'activo',
      key: 'activo',
      render: (activo: boolean) => (
        activo ? 
          <Tag icon={<CheckCircleOutlined />} color="success">Activo</Tag> : 
          <Tag icon={<CloseCircleOutlined />} color="error">Inactivo</Tag>
      ),
    },
  ];

  return (
    <div className="test-api-container">
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div className="api-header">
            <ApiOutlined style={{ fontSize: 32, color: '#50EBEC' }} />
            <Title level={3}>Prueba de Conexión API</Title>
          </div>

          <Alert
            message="Información de conexión"
            description={
              <div>
                <p><strong>URL Base:</strong> <code>{import.meta.env.VITE_API_URL || 'https://api-medica.rexcoresolutions.com/api/v1'}</code></p>
                <p><strong>Usuario actual:</strong> {user?.email || 'No autenticado'}</p>
                <p><strong>Token:</strong> {localStorage.getItem('access_token') ? <Tag color="success">✓ Presente</Tag> : <Tag color="error">✗ No presente</Tag>}</p>
              </div>
            }
            type="info"
            showIcon
          />

          <div className="api-status">
            <Text strong>Estado de la API:</Text>
            {apiStatus === 'testing' && <Spin size="small" />}
            {apiStatus === 'connected' && <Text type="success">✓ Conectada</Text>}
            {apiStatus === 'error' && <Text type="danger">✗ Error de conexión</Text>}
          </div>

          <Space>
            <Button 
              type="primary" 
              icon={<ReloadOutlined />} 
              onClick={testConnection}
              loading={loading}
              style={{ background: '#50EBEC', borderColor: '#50EBEC' }}
            >
              Probar Conexión
            </Button>
            <Button icon={<UserOutlined />} onClick={testGetUserById}>
              Probar GET /usuarios/1
            </Button>
          </Space>

          {loading && (
            <div className="loading-container">
              <Spin size="large" tip="Cargando usuarios..." />
            </div>
          )}

          {!loading && users.length > 0 && (
            <Table
              columns={columns}
              dataSource={users}
              rowKey="id"
              pagination={{ pageSize: 10, showTotal: (total) => `Total ${total} usuarios` }}
            />
          )}

          {!loading && apiStatus === 'error' && (
            <Alert
              message="Error de conexión"
              description={
                <div>
                  <p>No se pudo conectar con la API. Verifica:</p>
                  <ul>
                    <li>Que la URL de la API sea correcta</li>
                    <li>Que el servidor esté funcionando</li>
                    <li>Que no haya problemas de CORS</li>
                    <li>Revisa la consola (F12) para más detalles</li>
                  </ul>
                </div>
              }
              type="error"
              showIcon
            />
          )}

          {!loading && apiStatus === 'connected' && users.length === 0 && (
            <Alert
              message="No hay usuarios"
              description="La API respondió correctamente pero no se encontraron usuarios en el sistema."
              type="warning"
              showIcon
            />
          )}
        </Space>
      </Card>
    </div>
  );
};

export default TestApi;