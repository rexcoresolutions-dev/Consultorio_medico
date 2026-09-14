import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Typography, App, Checkbox } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  LoginOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
} from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';
import useSystemConfig from '../../hooks/useSystemConfig';
import { getDashboardByRole } from '../../router/routes';
import { getUserRoleId } from '../../utils/role.utils';
import './Login.css';

const { Title, Text } = Typography;

interface LoginFormValues {
  email: string;
  password: string;
  remember?: boolean;
}

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm<LoginFormValues>();
  const { login } = useAuth();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const systemConfig = useSystemConfig();

  useEffect(() => {
    const remembered = localStorage.getItem('remember_me') === 'true';
    const savedEmail = localStorage.getItem('remembered_email');

    if (remembered && savedEmail) {
      form.setFieldsValue({
        email: savedEmail,
        remember: true,
      });
    }
  }, [form]);

  const getErrorMessage = (error: any) => {
    const statusCode = error?.response?.status;
    const backendMessage = String(error?.response?.data?.message || '').toLowerCase();

    if (statusCode === 404 || backendMessage.includes('no registrado')) {
      return 'El correo electrónico no está registrado';
    }

    if (
      statusCode === 401 ||
      backendMessage.includes('contraseña') ||
      backendMessage.includes('password') ||
      backendMessage.includes('credenciales')
    ) {
      return 'Datos de acceso incorrectos. Verifica tu correo y contraseña';
    }

    if (error?.message?.toLowerCase().includes('network')) {
      return 'Error de conexión. Verifica tu internet';
    }

    return 'No fue posible iniciar sesión. Intente nuevamente';
  };

  const getRedirectByRole = (userData: any) =>
    getDashboardByRole(getUserRoleId(userData));

  const onFinish = async (values: LoginFormValues) => {
    setLoading(true);

    try {
      const loginResponse = await login(values.email, values.password);

      if (values.remember) {
        localStorage.setItem('remember_me', 'true');
        localStorage.setItem('remembered_email', values.email);
      } else {
        localStorage.removeItem('remember_me');
        localStorage.removeItem('remembered_email');
      }

      const user = JSON.parse(
        localStorage.getItem('user') || '{}'
      );

      const redirectPath = getRedirectByRole(user);

      message.success({
        content: user?.nombre
          ? `Bienvenido, ${user.nombre} ${user.primer_apellido || ''}`
          : 'Bienvenido al sistema',
        duration: 3,
      });

      navigate(redirectPath, { replace: true });
    } catch (error: any) {
      console.error('ERROR LOGIN:', error);

      message.error({
        content: getErrorMessage(error),
        duration: 4,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="circle-top" />

        <div className="brand-content">
          <div className={`brand-icon ${systemConfig.logoDataUrl ? 'brand-icon--image' : ''}`}>
            {systemConfig.logoDataUrl ? (
              <img
                src={systemConfig.logoDataUrl}
                alt={systemConfig.nombreSistema}
                className="login-system-logo-image"
              />
            ) : (
              <LoginOutlined />
            )}
          </div>

          <Title className="brand-title">
            {systemConfig.nombreSistema}
          </Title>

          <Text className="brand-subtitle">
            {systemConfig.descripcion}
          </Text>
        </div>

        <div className="medical-image" />
        <div className="circle-bottom" />
        <div className="dots" />
      </div>

      <div className="login-right">
        <div className="form-wrapper">
          <div className="form-header">
            <Title level={2} className="form-title">
              Acceso al sistema
            </Title>

            <Text className="form-subtitle">
              Ingresa tus credenciales para continuar
            </Text>
          </div>

          <Form
            form={form}
            name="login"
            layout="vertical"
            onFinish={onFinish}
            className="login-form"
            initialValues={{ remember: false }}
          >
            <Form.Item
              name="email"
              label="Correo electrónico"
              rules={[
                { required: true, message: 'Por favor ingrese su correo' },
                { type: 'email', message: 'Ingrese un correo válido' },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="ejemplo@correo.com"
                autoComplete="email"
                className="login-input"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Contraseña"
              rules={[
                { required: true, message: 'Por favor ingrese su contraseña' },
                { min: 6, message: 'La contraseña debe tener al menos 6 caracteres' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Ingresa tu contraseña"
                autoComplete="current-password"
                className="login-input"
                size="large"
                iconRender={(visible) =>
                  visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                }
              />
            </Form.Item>

            <div className="login-options">
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox className="remember-checkbox">
                  Recordarme
                </Checkbox>
              </Form.Item>

              <a
                href="#"
                className="forgot-link"
                onClick={(e) => e.preventDefault()}
              >
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              className="login-button"
              size="large"
            >
              Ingresar <LoginOutlined />
            </Button>
          </Form>

          <div className="version">
            <span></span>
            <p>Versión {systemConfig.version}</p>
            <span></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;