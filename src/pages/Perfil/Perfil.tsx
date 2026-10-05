import React, { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Button,
  Card,
  Col,
  Form,
  Input,
  Row,
  Skeleton,
  Typography,
  App,
  Tag,
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  SaveOutlined,
  MedicineBoxOutlined,
  EyeOutlined,
  StarOutlined,
  IdcardOutlined,
  BankOutlined,
  ShopOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import Swal from 'sweetalert2';
import UserService, { type UserData } from '../../services/user/user.service';
import { getWorkSucursal } from '../../services/work-context/work-context.service';
import './Perfil.css';

const { Title, Text } = Typography;

type UserProfileData = UserData & {
  empresa_nombre?: string;
  nombre_empresa?: string;
  sucursal_nombre?: string;
  nombre_sucursal?: string;
  empresa?: {
    id?: number;
    nombre?: string;
    nombre_empresa?: string;
  };
  sucursal?: {
    id?: number;
    nombre?: string;
    nombre_sucursal?: string;
  };
};

const Perfil: React.FC = () => {
  const [form] = Form.useForm<UserProfileData>();
  const { message } = App.useApp();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState<UserProfileData | null>(null);

  const rolId = Number(userData?.rol_id || 0);

  const roleInfo = useMemo(() => {
    switch (rolId) {
      case 4:
        return {
          name: 'Superadministrador',
          description: 'Acceso global a empresas, sucursales y configuración de la plataforma.',
          icon: <SafetyCertificateOutlined />,
          className: 'role-admin',
        };
      case 1:
        return {
          name: 'Administrador',
          description: 'Acceso completo a la administración del sistema.',
          icon: <StarOutlined />,
          className: 'role-admin',
        };
      case 2:
        return {
          name: 'Doctor',
          description: 'Gestión clínica, pacientes, consultas y recetas.',
          icon: <MedicineBoxOutlined />,
          className: 'role-medico',
        };
      case 3:
        return {
          name: 'Auditor',
          description: 'Acceso de consulta a información y reportes.',
          icon: <EyeOutlined />,
          className: 'role-consultor',
        };
      default:
        return {
          name: 'Usuario',
          description: 'Perfil de usuario del sistema.',
          icon: <UserOutlined />,
          className: 'role-user',
        };
    }
  }, [rolId]);

  const fullName = useMemo(() => {
    return `${userData?.nombre || ''} ${userData?.primer_apellido || ''} ${
      userData?.segundo_apellido || ''
    }`
      .replace(/\s+/g, ' ')
      .trim();
  }, [userData]);

  const initials = useMemo(() => {
    return fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((item) => item[0])
      .join('')
      .toUpperCase();
  }, [fullName]);

  const empresaNombre = useMemo(() => {
    return (
      userData?.empresa_nombre ||
      userData?.nombre_empresa ||
      userData?.empresa?.nombre ||
      userData?.empresa?.nombre_empresa ||
      ''
    );
  }, [userData]);

  const sucursalNombre = useMemo(() => {
    const activeSucursal = getWorkSucursal();
    return (
      activeSucursal?.nombre ||
      userData?.sucursal_nombre ||
      userData?.nombre_sucursal ||
      userData?.sucursal?.nombre ||
      userData?.sucursal?.nombre_sucursal ||
      ''
    );
  }, [userData]);

  const loadProfile = async () => {
    try {
      setLoading(true);

      const me = (await UserService.getMe()) as UserProfileData;

      setUserData(me);

      form.setFieldsValue({
        nombre: me.nombre,
        primer_apellido: me.primer_apellido,
        segundo_apellido: me.segundo_apellido,
        email: me.email,
        telefono: me.telefono,
        cedula_profesional: me.cedula_profesional,
        especialidad: me.especialidad,
      });
    } catch (error) {
      console.error('Error cargando perfil:', error);
      message.error('No fue posible cargar la información del perfil');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleRestoreProfile = () => {
    Swal.fire({
      title: '¿Restaurar información?',
      text: 'Se perderán los cambios que aún no has guardado.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, restaurar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#43d7d8',
      cancelButtonColor: '#d9d9d9',
    }).then((result) => {
      if (result.isConfirmed) {
        loadProfile();

        Swal.fire({
          icon: 'success',
          title: 'Información restaurada',
          text: 'Se cargaron nuevamente los datos guardados.',
          timer: 1800,
          showConfirmButton: false,
        });
      }
    });
  };

  const handleSubmit = async (values: UserProfileData) => {
    try {
      setSaving(true);

      const hasChanges =
        values.nombre !== userData?.nombre ||
        values.primer_apellido !== userData?.primer_apellido ||
        (values.segundo_apellido || '') !== (userData?.segundo_apellido || '') ||
        values.email !== userData?.email ||
        (values.telefono || '') !== (userData?.telefono || '') ||
        (rolId === 2 &&
          ((values.cedula_profesional || '') !== (userData?.cedula_profesional || '') ||
            (values.especialidad || '') !== (userData?.especialidad || '')));

      if (!hasChanges) {
        Swal.fire({
          icon: 'info',
          title: 'Sin cambios',
          text: 'No has realizado ninguna modificación en tu perfil.',
          confirmButtonColor: '#43d7d8',
        });

        return;
      }

      Swal.fire({
        title: 'Actualizando perfil...',
        text: 'Por favor espera un momento',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading(),
      });

      const payload: Partial<UserProfileData> = {
        nombre: values.nombre,
        primer_apellido: values.primer_apellido,
        segundo_apellido: values.segundo_apellido || '',
        email: values.email,
        telefono: values.telefono || '',
      };

      if (rolId === 2) {
        payload.cedula_profesional = values.cedula_profesional || '';
        payload.especialidad = values.especialidad || '';
      }

      const updated = (await UserService.updateMe(payload)) as UserProfileData;

      Swal.close();

      setUserData(updated);
      localStorage.setItem('user', JSON.stringify(updated));

      await Swal.fire({
        icon: 'success',
        title: 'Perfil actualizado',
        text: 'Tus datos se actualizaron correctamente.',
        confirmButtonColor: '#43d7d8',
        confirmButtonText: 'Aceptar',
      });
    } catch (error: any) {
      Swal.close();

      console.error('Error actualizando perfil:', error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error?.message || 'No fue posible actualizar el perfil',
        confirmButtonColor: '#ff4d4f',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="perfil-page">
        <Skeleton active paragraph={{ rows: 10 }} />
      </div>
    );
  }

  return (
    <div className="perfil-page">
      <div className="perfil-header">
        <div>
          <Title level={2}>Mi perfil</Title>
          <Text type="secondary">
            Administra tu información personal y profesional dentro del sistema.
          </Text>
        </div>

        <Tag className={`perfil-role-tag ${roleInfo.className}`}>
          {roleInfo.icon}
          {roleInfo.name}
        </Tag>
      </div>

      <Row gutter={[24, 24]} align="stretch">
        <Col xs={24} lg={8}>
          <div className="perfil-left-stack">
            <Card className="perfil-card perfil-summary-card">
              <div className="perfil-avatar-section">
                <div className="perfil-avatar-ring">
                  <Avatar size={96} className={`perfil-avatar ${roleInfo.className}`}>
                    {initials || roleInfo.icon}
                  </Avatar>
                </div>

                <Title level={3}>{fullName || 'Usuario sin nombre'}</Title>

                <Text type="secondary">{userData?.email || 'Sin correo registrado'}</Text>

                <div className="perfil-role-box">
                  <div className="perfil-role-icon">{roleInfo.icon}</div>

                  <div>
                    <strong>{roleInfo.name}</strong>
                    <p>{roleInfo.description}</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="perfil-card perfil-work-card">
              <div className="perfil-work-header">
                <div className="perfil-work-header-icon">
                  <SafetyCertificateOutlined />
                </div>

                <div>
                  <strong>Ubicación laboral</strong>
                  <span>Empresa y sucursal asignadas</span>
                </div>
              </div>

              <div className="perfil-work-grid">
                <div className="perfil-work-item">
                  <div className="perfil-work-icon">
                    <BankOutlined />
                  </div>

                  <span>Empresa</span>
                  <strong>{empresaNombre || 'Sin empresa asignada'}</strong>
                </div>

                <div className="perfil-work-item">
                  <div className="perfil-work-icon">
                    <ShopOutlined />
                  </div>

                  <span>Sucursal</span>
                  <strong>{sucursalNombre || 'Sin sucursal asignada'}</strong>
                </div>
              </div>
            </Card>
          </div>
        </Col>

        <Col xs={24} lg={16}>
          <Card className="perfil-card perfil-form-card">
            <div className="perfil-form-title">
              <div>
                <h3>Información personal</h3>
                <span>Actualiza tus datos permitidos</span>
              </div>
            </div>

            <Form form={form} layout="vertical" onFinish={handleSubmit} className="perfil-form">
              <Row gutter={[18, 0]}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="nombre"
                    label="Nombre"
                    rules={[{ required: true, message: 'El nombre es obligatorio' }]}
                  >
                    <Input prefix={<UserOutlined />} placeholder="Nombre" size="large" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    name="primer_apellido"
                    label="Primer apellido"
                    rules={[{ required: true, message: 'El primer apellido es obligatorio' }]}
                  >
                    <Input
                      prefix={<UserOutlined />}
                      placeholder="Primer apellido"
                      size="large"
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item name="segundo_apellido" label="Segundo apellido">
                    <Input
                      prefix={<UserOutlined />}
                      placeholder="Segundo apellido"
                      size="large"
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    name="email"
                    label="Correo electrónico"
                    rules={[
                      { required: true, message: 'El correo es obligatorio' },
                      { type: 'email', message: 'Ingresa un correo válido' },
                    ]}
                  >
                    <Input
                      prefix={<MailOutlined />}
                      placeholder="correo@ejemplo.com"
                      size="large"
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item name="telefono" label="Teléfono">
                    <Input prefix={<PhoneOutlined />} placeholder="Teléfono" size="large" />
                  </Form.Item>
                </Col>

                {rolId === 2 && (
                  <>
                    <Col xs={24} md={12}>
                      <Form.Item name="cedula_profesional" label="Cédula profesional">
                        <Input
                          prefix={<IdcardOutlined />}
                          placeholder="Cédula profesional"
                          size="large"
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24}>
                      <Form.Item name="especialidad" label="Especialidad">
                        <Input
                          prefix={<MedicineBoxOutlined />}
                          placeholder="Especialidad médica"
                          size="large"
                        />
                      </Form.Item>
                    </Col>
                  </>
                )}

                {rolId !== 2 && (
                  <Col xs={24}>
                    <div className="perfil-readonly-note">
                      {roleInfo.icon}
                      <span>Este perfil no requiere información médica profesional.</span>
                    </div>
                  </Col>
                )}

                <Col xs={24}>
                  <div className="perfil-actions">
                    <Button onClick={handleRestoreProfile} size="large" icon={<ReloadOutlined />}>
                      Restaurar datos
                    </Button>

                    <Button
                      type="primary"
                      htmlType="submit"
                      size="large"
                      loading={saving}
                      icon={<SaveOutlined />}
                      className="perfil-save-btn"
                    >
                      Guardar cambios
                    </Button>
                  </div>
                </Col>
              </Row>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Perfil;
