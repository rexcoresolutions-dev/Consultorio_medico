import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  App,
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Tag,
  Tooltip,
  Grid,
  Drawer,
  Select,
  Spin,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ShopOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  MailOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAuth } from '../../hooks/useAuth';
import axiosInstance from '../../api/axios.config';
import './Clinicas.css';

const { useBreakpoint } = Grid;

interface ConsultorioApi {
  id: number;
  empresaId?: number;
  empresa_id?: number;
  nombre: string;
  telefono?: string | null;
  correo?: string | null;
  entidad: string;
  municipio: string;
  colonia: string;
  codigoPostal?: string;
  codigo_postal?: string;
  calle: string;
  numeroExterior?: string;
  numero_exterior?: string;
  numeroInterior?: string;
  numero_interior?: string;
  activo: boolean;
}

interface Consultorio {
  id: number;
  empresa_id: number;
  nombre: string;
  telefono: string;
  correo: string;
  entidad: string;
  municipio: string;
  colonia: string;
  codigo_postal: string;
  calle: string;
  numero_exterior: string;
  numero_interior: string;
  activo: boolean;
}

const Consultorios: React.FC = () => {
  const { user } = useAuth();
  const { message } = App.useApp();

  const [modalVisible, setModalVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedConsultorio, setSelectedConsultorio] = useState<Consultorio | null>(null);
  const [editingConsultorio, setEditingConsultorio] = useState<Consultorio | null>(null);
  const [consultorios, setConsultorios] = useState<Consultorio[]>([]);
  const [loading, setLoading] = useState(false);

  const [form] = Form.useForm();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [searchParams, setSearchParams] = useSearchParams();

  const getDireccion = (item: Consultorio) =>
    `${item.calle} ${item.numero_exterior}${
      item.numero_interior ? ` Int. ${item.numero_interior}` : ''
    }, ${item.colonia}, ${item.municipio}, ${item.entidad}, C.P. ${item.codigo_postal}`;

  const getErrorMessage = (error: any, fallback: string) => {
    const backendMessage = error?.response?.data?.message;
    const details = error?.response?.data?.details;

    if (Array.isArray(details) && details.length > 0) return details.join(', ');
    if (Array.isArray(backendMessage)) return backendMessage.join(', ');

    return backendMessage || fallback;
  };

  const fetchConsultorios = async () => {
    setLoading(true);

    try {
      const response = await axiosInstance.get('/sucursales', {
        params: {
          page: 1,
          limit: 100,
        },
      });

      const result = response.data?.data?.data || [];

      const normalized: Consultorio[] = result.map((item: ConsultorioApi) => ({
        id: item.id,
        empresa_id: item.empresaId ?? item.empresa_id ?? 0,
        nombre: item.nombre || '',
        telefono: item.telefono || '',
        correo: item.correo || '',
        entidad: item.entidad || '',
        municipio: item.municipio || '',
        colonia: item.colonia || '',
        codigo_postal: item.codigoPostal ?? item.codigo_postal ?? '',
        calle: item.calle || '',
        numero_exterior: item.numeroExterior ?? item.numero_exterior ?? '',
        numero_interior: item.numeroInterior ?? item.numero_interior ?? '',
        activo: item.activo,
      }));

      const empresaId = Number(user?.rol_id) === 4
        ? Number(sessionStorage.getItem('empresa_contexto_id')) || undefined
        : user?.empresa_id;

      setConsultorios(
        empresaId ? normalized.filter((item) => item.empresa_id === empresaId) : normalized
      );
    } catch (error: any) {
      console.error('ERROR GET SUCURSALES:', error?.response?.data || error);
      message.error(getErrorMessage(error, 'No fue posible cargar los consultorios'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsultorios();
  }, [user?.empresa_id]);

  const handleAdd = () => {
    setEditingConsultorio(null);
    setSelectedConsultorio(null);
    form.resetFields();

    form.setFieldsValue({
      numero_interior: '',
    });

    if (isMobile) setDrawerVisible(true);
    else setModalVisible(true);
  };

  useEffect(() => {
    const nuevo = searchParams.get('nuevo');

    if (nuevo === '1') {
      handleAdd();

      const newParams = new URLSearchParams(searchParams);
      newParams.delete('nuevo');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams, isMobile]);

  const handleEdit = (consultorio: Consultorio) => {
    setEditingConsultorio(consultorio);
    setSelectedConsultorio(null);

    form.setFieldsValue({
      nombre: consultorio.nombre,
      telefono: consultorio.telefono,
      correo: consultorio.correo,
      entidad: consultorio.entidad,
      municipio: consultorio.municipio,
      colonia: consultorio.colonia,
      codigo_postal: consultorio.codigo_postal,
      calle: consultorio.calle,
      numero_exterior: consultorio.numero_exterior,
      numero_interior: consultorio.numero_interior,
      activo: consultorio.activo,
    });

    if (isMobile) setDrawerVisible(true);
    else setModalVisible(true);
  };

  const handleView = (consultorio: Consultorio) => {
    setSelectedConsultorio(consultorio);
    setEditingConsultorio(null);
    setDrawerVisible(true);
  };

const handleDelete = async (consultorio: Consultorio) => {
  Modal.confirm({
    title: '¿Desactivar consultorio?',
    content: 'El consultorio no se eliminará, solo cambiará a estado inactivo.',
    centered: true,
    okText: 'Sí, desactivar',
    cancelText: 'Cancelar',
    okButtonProps: {
      danger: true,
    },
    async onOk() {
      setLoading(true);

      try {
        await axiosInstance.patch(`/sucursales/${consultorio.id}`, {
          activo: false,
        });

        message.success('Consultorio marcado como inactivo correctamente');

        setConsultorios((prev) =>
          prev.map((item) =>
            item.id === consultorio.id
              ? {
                  ...item,
                  activo: false,
                }
              : item
          )
        );

        setSelectedConsultorio((prev) =>
          prev && prev.id === consultorio.id
            ? {
                ...prev,
                activo: false,
              }
            : prev
        );
      } catch (error: any) {
        console.error('ERROR DESACTIVAR SUCURSAL:', error?.response?.data || error);
        message.error(getErrorMessage(error, 'No fue posible desactivar el consultorio'));
      } finally {
        setLoading(false);
      }
    },
  });
};

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const basePayload = {
        nombre: String(values.nombre || '').trim(),
        telefono: String(values.telefono || '').trim(),
        correo: String(values.correo || '').trim(),
        entidad: String(values.entidad || '').trim(),
        municipio: String(values.municipio || '').trim(),
        colonia: String(values.colonia || '').trim(),
        codigoPostal: String(values.codigo_postal || '').trim(),
        calle: String(values.calle || '').trim(),
        numeroExterior: String(values.numero_exterior || '').trim(),
        numeroInterior: String(values.numero_interior || '').trim(),
      };

      if (editingConsultorio) {
        await axiosInstance.patch(`/sucursales/${editingConsultorio.id}`, {
          ...basePayload,
          activo: values.activo,
        });

        message.success('Consultorio actualizado correctamente');
      } else {
        await axiosInstance.post('/sucursales', basePayload);
        message.success('Consultorio agregado correctamente');
      }

      setModalVisible(false);
      setDrawerVisible(false);
      setSelectedConsultorio(null);
      setEditingConsultorio(null);
      form.resetFields();
      fetchConsultorios();
    } catch (error: any) {
      console.error('ERROR SAVE SUCURSAL:', error?.response?.data || error);
      message.error(getErrorMessage(error, 'No fue posible guardar el consultorio'));
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnsType<Consultorio> = [
    {
      title: 'Consultorio',
      dataIndex: 'nombre',
      key: 'nombre',
      ellipsis: true,
      render: (text) => <strong className="table-clinic-name">{text}</strong>,
    },
    {
      title: 'Municipio',
      dataIndex: 'municipio',
      key: 'municipio',
      width: 140,
      ellipsis: true,
    },
    {
      title: 'Teléfono',
      dataIndex: 'telefono',
      key: 'telefono',
      width: 145,
      render: (text) => (
        <span className="table-muted">
          <PhoneOutlined /> {text || 'Sin teléfono'}
        </span>
      ),
    },
    {
      title: 'Correo',
      dataIndex: 'correo',
      key: 'correo',
      width: 230,
      ellipsis: true,
      render: (text) => (
        <span className="table-muted">
          <MailOutlined /> {text || 'Sin correo'}
        </span>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'activo',
      key: 'activo',
      align: 'center',
      width: 105,
      render: (activo: boolean) => (
        <Tag className={activo ? 'tag-active' : 'tag-inactive'}>
          {activo ? 'Activo' : 'Inactivo'}
        </Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      align: 'center',
      width: 115,
      render: (_, record) => (
        <Space size="small">
            <Tooltip title="Editar datos">
              <Button
                className="action-btn edit-btn"
                type="text"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              />
            </Tooltip>
            <Tooltip title="Desactivar">
              <Button
                className="action-btn delete-btn"
                type="text"
                icon={<DeleteOutlined />}
                disabled={!record.activo}
                onClick={() => handleDelete(record)}
              />
            </Tooltip>
       
        </Space>
      ),
    },
  ];

  const FormContent = () => (
    <Form form={form} layout="vertical" className="clinica-form">
      <Form.Item
        name="nombre"
        label="Nombre del Consultorio"
        rules={[{ required: true, message: 'Ingrese el nombre del consultorio' }]}
      >
        <Input placeholder="Ej: Consultorio Médico Matriz" size="large" />
      </Form.Item>

      <Form.Item
        name="telefono"
        label="Teléfono"
        rules={[{ required: true, message: 'Ingrese el teléfono' }]}
      >
        <Input placeholder="Ej: 2221234567" size="large" />
      </Form.Item>

      <Form.Item
        name="correo"
        label="Correo electrónico"
        rules={[
          { required: true, message: 'Ingrese el correo electrónico' },
          { type: 'email', message: 'Correo inválido' },
        ]}
      >
        <Input placeholder="Ej: consultorio@correo.com" size="large" />
      </Form.Item>

      <Form.Item name="entidad" label="Entidad" rules={[{ required: true, message: 'Ingrese la entidad' }]}>
        <Input placeholder="Ej: Puebla" size="large" />
      </Form.Item>

      <Form.Item name="municipio" label="Municipio" rules={[{ required: true, message: 'Ingrese el municipio' }]}>
        <Input placeholder="Ej: Puebla" size="large" />
      </Form.Item>

      <Form.Item name="colonia" label="Colonia" rules={[{ required: true, message: 'Ingrese la colonia' }]}>
        <Input placeholder="Ej: Centro" size="large" />
      </Form.Item>

      <Form.Item
        name="codigo_postal"
        label="Código postal"
        rules={[{ required: true, message: 'Ingrese el código postal' }]}
      >
        <Input placeholder="Ej: 72000" size="large" />
      </Form.Item>

      <Form.Item name="calle" label="Calle" rules={[{ required: true, message: 'Ingrese la calle' }]}>
        <Input placeholder="Ej: Av. Principal" size="large" />
      </Form.Item>

      <Form.Item
        name="numero_exterior"
        label="Número exterior"
        rules={[{ required: true, message: 'Ingrese el número exterior' }]}
      >
        <Input placeholder="Ej: 123" size="large" />
      </Form.Item>

      <Form.Item
        name="numero_interior"
        label="Número interior"
        rules={[{ required: true, message: 'Ingrese el número interior' }]}
      >
        <Input placeholder="Ej: 2A" size="large" />
      </Form.Item>

      {editingConsultorio && (
        <Form.Item
          name="activo"
          label="Estado"
          rules={[{ required: true, message: 'Seleccione el estado' }]}
        >
          <Select
            size="large"
            getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
            options={[
              { label: 'Activo', value: true },
              { label: 'Inactivo', value: false },
            ]}
          />
        </Form.Item>
      )}
    </Form>
  );

  const DetailsView = () => (
    <div className="clinica-details">
      <div className="detail-hero">
        <div className="detail-icon">
          <ShopOutlined />
        </div>
        <div>
          <h3>{selectedConsultorio?.nombre}</h3>
          <Tag className={selectedConsultorio?.activo ? 'tag-active' : 'tag-inactive'}>
            {selectedConsultorio?.activo ? 'Activo' : 'Inactivo'}
          </Tag>
        </div>
      </div>

      <div className="detail-item">
        <EnvironmentOutlined />
        <div>
          <div className="detail-label">Dirección</div>
          <div className="detail-value">{selectedConsultorio ? getDireccion(selectedConsultorio) : ''}</div>
        </div>
      </div>

      <div className="detail-item">
        <PhoneOutlined />
        <div>
          <div className="detail-label">Teléfono</div>
          <div className="detail-value">{selectedConsultorio?.telefono || 'Sin teléfono'}</div>
        </div>
      </div>

      <div className="detail-item">
        <MailOutlined />
        <div>
          <div className="detail-label">Correo</div>
          <div className="detail-value">{selectedConsultorio?.correo || 'Sin correo'}</div>
        </div>
      </div>

      <div className="detail-actions">
        <Button
          type="primary"
          icon={<EditOutlined />}
          onClick={() => {
            if (!selectedConsultorio) return;
            setDrawerVisible(false);
            setTimeout(() => handleEdit(selectedConsultorio), 100);
          }}
          block
        >
          Editar Consultorio
        </Button>

        
          <Button
            danger
            icon={<DeleteOutlined />}
            block
            disabled={!selectedConsultorio?.activo}
            onClick={() => {
              if (!selectedConsultorio) return;
              handleDelete(selectedConsultorio);
              setDrawerVisible(false);
            }}
          >
            Desactivar Consultorio
          </Button>
      </div>
    </div>
  );

  const MobileList = () => (
    <Spin spinning={loading}>
      <div className="clinica-mobile-list">
        {consultorios.length === 0 && !loading ? (
          <Empty description="No hay consultorios registrados" />
        ) : (
          consultorios.map((item) => (
            <Card
              key={item.id}
              className="clinica-card-mobile"
              hoverable
              onClick={() => handleView(item)}
            >
              <div className="clinica-card-header">
                <div className="clinic-title-wrap">
                  <div className="clinic-icon-circle">
                    <ShopOutlined />
                  </div>

                  <div>
                    <span className="clinica-card-title">{item.nombre}</span>
                    <span className="clinic-card-subtitle">
                      {item.municipio}, {item.entidad}
                    </span>
                  </div>
                </div>

                <Tag className={item.activo ? 'tag-active' : 'tag-inactive'}>
                  {item.activo ? 'Activo' : 'Inactivo'}
                </Tag>
              </div>

              <div className="clinica-card-info">
                <div className="info-row">
                  <EnvironmentOutlined />
                  <span>{getDireccion(item)}</span>
                </div>

                <div className="info-row">
                  <PhoneOutlined />
                  <span>{item.telefono || 'Sin teléfono'}</span>
                </div>

                <div className="info-row">
                  <MailOutlined />
                  <span>{item.correo || 'Sin correo'}</span>
                </div>
              </div>

              <div className="info-stats">
                <div className="stat">
                  <span className="stat-label">ID</span>
                  <span className="stat-value">#{item.id}</span>
                </div>

                <div className="stat">
                  <span className="stat-label">C.P.</span>
                  <span className="stat-value">{item.codigo_postal}</span>
                </div>

                <div className="stat">
                  <span className="stat-label">Estado</span>
                  <span className="stat-value">{item.activo ? 'Activo' : 'Inactivo'}</span>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </Spin>
  );

  return (
    <div className="clinicas-container">
      <Card
        title={
          <Space>
            <ShopOutlined style={{ color: '#50EBEC' }} />
            <span>Gestión de Consultorios</span>
          </Space>
        }
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Agregar
          </Button>
        }
        className="clinicas-card"
      >
        {isMobile ? (
          <MobileList />
        ) : (
          <div className="table-shell">
            <Table
              columns={columns}
              dataSource={consultorios}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: false,
                showTotal: (total) => `Total ${total} consultorios`,
              }}
              size="middle"
            />
          </div>
        )}
      </Card>

      {!isMobile && (
        <Modal
          title={editingConsultorio ? 'Editar Consultorio' : 'Agregar Consultorio'}
          open={modalVisible}
          onCancel={() => {
            setModalVisible(false);
            setEditingConsultorio(null);
            form.resetFields();
          }}
          onOk={handleSubmit}
          confirmLoading={loading}
          width={760}
          okText={editingConsultorio ? 'Actualizar' : 'Agregar'}
          cancelText="Cancelar"
          destroyOnHidden
          forceRender
        >
          <FormContent />
        </Modal>
      )}

      {isMobile && (
        <Drawer
          title={editingConsultorio ? 'Editar Consultorio' : 'Agregar Consultorio'}
          placement="bottom"
          open={drawerVisible && !selectedConsultorio}
          onClose={() => {
            setDrawerVisible(false);
            setEditingConsultorio(null);
            setSelectedConsultorio(null);
            form.resetFields();
          }}
          size="large"
          className="clinica-drawer"
          destroyOnHidden
        >
          <FormContent />

          <div className="drawer-actions">
            <Button
              onClick={() => {
                setDrawerVisible(false);
                setEditingConsultorio(null);
                setSelectedConsultorio(null);
                form.resetFields();
              }}
              block
            >
              Cancelar
            </Button>

            <Button type="primary" onClick={handleSubmit} loading={loading} block>
              {editingConsultorio ? 'Actualizar' : 'Agregar'}
            </Button>
          </div>
        </Drawer>
      )}

      {isMobile && (
        <Drawer
          title={null}
          placement="bottom"
          open={drawerVisible && !!selectedConsultorio}
          onClose={() => {
            setDrawerVisible(false);
            setSelectedConsultorio(null);
          }}
          size="default"
          className="clinica-drawer details-drawer"
          closeIcon={<CloseOutlined />}
          destroyOnHidden
        >
          <DetailsView />
        </Drawer>
      )}
    </div>
  );
};

export default Consultorios;
