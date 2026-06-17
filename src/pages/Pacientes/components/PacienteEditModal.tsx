import React, { useEffect, useState } from 'react';
import {
  Button,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Typography,
} from 'antd';
import {
  UserOutlined,
  HeartOutlined,
  PhoneOutlined,
  IdcardOutlined,
  SaveOutlined,
  HomeOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import type { PacienteData } from '../../../services/pacientes/pacientes.service';
import './PacienteEditModal.css';

const { Text } = Typography;

type DomicilioPacienteData = {
  calle?: string;
  numero_exterior?: string;
  numero_interior?: string;
  colonia?: string;
  codigo_postal?: string;
  municipio?: string;
  estado_domicilio?: string;
  referencias_domicilio?: string;
};

type PacienteEditFormData = PacienteData & DomicilioPacienteData;

type Props = {
  open: boolean;
  paciente: PacienteData | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (values: PacienteData) => void;
};

const formatDate = (fecha?: string) => {
  if (!fecha) return '';
  return fecha.split('T')[0];
};

const PacienteEditModal: React.FC<Props> = ({
  open,
  paciente,
  loading,
  onClose,
  onSubmit,
}) => {
  const [form] = Form.useForm<PacienteEditFormData>();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (paciente && open) {
      setStep(0);

      form.setFieldsValue({
        ...paciente,
        fecha_nacimiento: formatDate(paciente.fecha_nacimiento),
      } as PacienteEditFormData);
    }

    if (!open) {
      setStep(0);
      form.resetFields();
    }
  }, [paciente, open, form]);

  const handleNext = async () => {
    try {
      await form.validateFields([
        'nombre',
        'primer_apellido',
        'fecha_nacimiento',
        'curp',
        'numero_expediente',
      ]);

      setStep(1);
    } catch {
      // Ant Design muestra los errores automáticamente.
    }
  };

  const handlePrev = () => {
    setStep(0);
  };

  const handleSubmit = (values: PacienteEditFormData) => {
    onSubmit(values as PacienteData);
  };

  return (
    <Modal
      open={open}
      title={null}
      onCancel={onClose}
      width={980}
      centered
      className="paciente-edit-modal"
      footer={null}
      destroyOnClose
      closable={false}
    >
      <div className="paciente-edit-header">
        <div className="paciente-edit-header-icon">
          {step === 0 ? <UserOutlined /> : <HomeOutlined />}
        </div>

        <div>
          <Text className="paciente-edit-eyebrow">Editar paciente</Text>
          <h2>Actualizar información del paciente</h2>
          <p>
            {step === 0
              ? 'Modifica los datos generales y clínicos del paciente.'
              : 'Actualiza la información del domicilio del paciente.'}
          </p>
        </div>

        <Button
          type="text"
          icon={<CloseOutlined />}
          className="paciente-edit-close"
          onClick={onClose}
        />
      </div>

      <div className="paciente-edit-wizard">
        <div className={`paciente-edit-step ${step === 0 ? 'active' : 'done'}`}>
          <div className="paciente-edit-step-number">1</div>

          <div>
            <strong>Paciente</strong>
            <span>Datos generales</span>
          </div>
        </div>

        <div className="paciente-edit-step-line" />

        <div className={`paciente-edit-step ${step === 1 ? 'active' : ''}`}>
          <div className="paciente-edit-step-number">2</div>

          <div>
            <strong>Domicilio</strong>
            <span>Dirección y referencias</span>
          </div>
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        preserve
        onFinish={handleSubmit}
        className="paciente-edit-form"
      >
        {step === 0 && (
          <>
            <section className="paciente-edit-section">
              <div className="paciente-edit-section-title">
                <UserOutlined />

                <div>
                  <h3>Identidad del paciente</h3>
                  <span>Nombre, nacimiento y datos generales</span>
                </div>
              </div>

              <Row gutter={[16, 4]}>
                <Col xs={24} md={8}>
                  <Form.Item
                    name="nombre"
                    label="Nombre"
                    rules={[{ required: true, message: 'Ingresa el nombre' }]}
                  >
                    <Input placeholder="Nombre del paciente" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item
                    name="primer_apellido"
                    label="Primer apellido"
                    rules={[{ required: true, message: 'Ingresa el primer apellido' }]}
                  >
                    <Input placeholder="Primer apellido" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item name="segundo_apellido" label="Segundo apellido">
                    <Input placeholder="Segundo apellido" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item
                    name="fecha_nacimiento"
                    label="Fecha nacimiento"
                    rules={[{ required: true, message: 'Selecciona la fecha de nacimiento' }]}
                  >
                    <Input type="date" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item name="sexo" label="Sexo">
                    <Select
                      placeholder="Seleccionar"
                      allowClear
                      options={[
                        { value: 'F', label: 'Femenino' },
                        { value: 'M', label: 'Masculino' },
                      ]}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item name="estado_civil" label="Estado civil">
                    <Select
                      placeholder="Seleccionar"
                      allowClear
                      options={[
                        { value: 'SOLTERO/A', label: 'Soltero/a' },
                        { value: 'CASADO/A', label: 'Casado/a' },
                        { value: 'UNIÓN LIBRE', label: 'Unión libre' },
                        { value: 'DIVORCIADO/A', label: 'Divorciado/a' },
                        { value: 'VIUDO/A', label: 'Viudo/a' },
                      ]}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24}>
                  <Form.Item name="curp" label="CURP">
                    <Input maxLength={18} placeholder="CURP del paciente" />
                  </Form.Item>
                </Col>
              </Row>
            </section>

            <section className="paciente-edit-section">
              <div className="paciente-edit-section-title">
                <HeartOutlined />

                <div>
                  <h3>Datos médicos y expediente</h3>
                  <span>Información clínica básica</span>
                </div>
              </div>

              <Row gutter={[16, 4]}>
                <Col xs={24} md={8}>
                  <Form.Item name="numero_expediente" label="Número expediente">
                    <Input prefix={<IdcardOutlined />} placeholder="Ej. EXP-001" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item name="tipo_sangre" label="Tipo sangre">
                    <Select
                      placeholder="Seleccionar"
                      allowClear
                      options={['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((v) => ({
                        value: v,
                        label: v,
                      }))}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item name="escolaridad" label="Escolaridad">
                    <Input placeholder="Ej. Licenciatura, Bachillerato..." />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item name="ocupacion" label="Ocupación">
                    <Input placeholder="Ocupación actual" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item name="lugar_origen" label="Lugar de origen">
                    <Input placeholder="Ciudad o estado" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item name="pais_nacimiento" label="País de nacimiento">
                    <Input placeholder="País de nacimiento" />
                  </Form.Item>
                </Col>
              </Row>
            </section>

            <section className="paciente-edit-section">
              <div className="paciente-edit-section-title">
                <PhoneOutlined />

                <div>
                  <h3>Contacto</h3>
                  <span>Teléfono, celular y correo electrónico</span>
                </div>
              </div>

              <Row gutter={[16, 4]}>
                <Col xs={24} md={8}>
                  <Form.Item name="telefono" label="Teléfono">
                    <Input placeholder="Teléfono fijo" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item name="celular" label="Celular">
                    <Input placeholder="Número celular" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item
                    name="correo"
                    label="Correo"
                    rules={[{ type: 'email', message: 'Ingresa un correo válido' }]}
                  >
                    <Input placeholder="correo@ejemplo.com" />
                  </Form.Item>
                </Col>
              </Row>
            </section>
          </>
        )}

        {step === 1 && (
          <section className="paciente-edit-section paciente-edit-address-section">
            <div className="paciente-edit-section-title">
              <HomeOutlined />

              <div>
                <h3>Domicilio del paciente</h3>
                <span>Calle, colonia, municipio y referencias</span>
              </div>
            </div>

            <Row gutter={[16, 4]}>
              <Col xs={24} md={14}>
                <Form.Item name="calle" label="Calle">
                  <Input placeholder="Ej. Avenida Reforma" />
                </Form.Item>
              </Col>

              <Col xs={12} md={5}>
                <Form.Item name="numero_exterior" label="No. exterior">
                  <Input placeholder="123" />
                </Form.Item>
              </Col>

              <Col xs={12} md={5}>
                <Form.Item name="numero_interior" label="No. interior">
                  <Input placeholder="A" />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item name="colonia" label="Colonia">
                  <Input placeholder="Colonia" />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item name="codigo_postal" label="Código postal">
                  <Input maxLength={5} placeholder="Ej. 72000" />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item name="municipio" label="Municipio">
                  <Input placeholder="Municipio" />
                </Form.Item>
              </Col>

              <Col xs={24} md={8}>
                <Form.Item name="estado_domicilio" label="Estado">
                  <Input placeholder="Estado" />
                </Form.Item>
              </Col>

              <Col xs={24} md={16}>
                <Form.Item name="referencias_domicilio" label="Referencias">
                  <Input.TextArea
                    rows={4}
                    placeholder="Entre calles, color de casa, referencias..."
                  />
                </Form.Item>
              </Col>
            </Row>

            <div className="paciente-edit-address-note">
              <HomeOutlined />
              <span>
                Esta información ayuda a completar el expediente del paciente y puede actualizarse
                cuando sea necesario.
              </span>
            </div>
          </section>
        )}

        <div className="paciente-edit-footer">
          <Button onClick={onClose}>Cancelar</Button>

          <div className="paciente-edit-footer-actions">
            {step === 1 && (
              <Button icon={<ArrowLeftOutlined />} onClick={handlePrev}>
                Anterior
              </Button>
            )}

            {step === 0 && (
              <Button
                type="primary"
                icon={<ArrowRightOutlined />}
                className="paciente-edit-next-btn"
                onClick={handleNext}
              >
                Siguiente
              </Button>
            )}

            {step === 1 && (
              <Button
                type="primary"
                loading={loading}
                icon={<SaveOutlined />}
                className="paciente-edit-save-btn"
                onClick={() => form.submit()}
              >
                Guardar cambios
              </Button>
            )}
          </div>
        </div>
      </Form>
    </Modal>
  );
};

export default PacienteEditModal;