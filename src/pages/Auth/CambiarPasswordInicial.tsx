import React, { useState } from 'react';
import { App, Button, Form, Input, Modal, Typography } from 'antd';
import { LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import authService from '../../services/auth/auth.service';
import './CambiarPasswordInicial.css';

const CambiarPasswordInicial: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();
  const submit = async (values: { newPassword: string }) => {
    try {
      setLoading(true);
      await authService.changeInitialPassword(values.newPassword);
      message.success('Contraseña actualizada. Ya puedes continuar en la plataforma.');
      window.location.reload();
    } catch (error: any) {
      message.error(error?.response?.data?.message ?? 'No fue posible actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return <Modal open footer={null} closable={false} maskClosable={false} keyboard={false} centered width={520} className="initial-password-modal">
    <div className="initial-password-header">
      <span className="initial-password-icon"><SafetyCertificateOutlined /></span>
      <div><Typography.Title level={3}>Protege tu cuenta</Typography.Title><Typography.Paragraph>Antes de continuar, cambia la contraseña temporal que recibiste por correo.</Typography.Paragraph></div>
    </div>
    <Form layout="vertical" onFinish={submit} requiredMark="optional">
      <Form.Item name="newPassword" label="Nueva contraseña" rules={[{ required: true, message: 'Ingresa la nueva contraseña' }, { min: 8, message: 'Debe tener al menos 8 caracteres' }]}><Input.Password prefix={<LockOutlined />} size="large" autoFocus /></Form.Item>
      <Form.Item name="confirm" label="Confirmar nueva contraseña" dependencies={['newPassword']} rules={[{ required: true, message: 'Confirma la nueva contraseña' }, ({ getFieldValue }) => ({ validator(_, value) { return !value || getFieldValue('newPassword') === value ? Promise.resolve() : Promise.reject(new Error('Las contraseñas no coinciden')); } })]}><Input.Password prefix={<LockOutlined />} size="large" /></Form.Item>
      <Button type="primary" htmlType="submit" block size="large" loading={loading}>Guardar nueva contraseña</Button>
    </Form>
  </Modal>;
};
export default CambiarPasswordInicial;
