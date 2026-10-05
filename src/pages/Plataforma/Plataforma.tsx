import React, { useEffect, useMemo, useState } from 'react';
import {
  BankOutlined, CalendarOutlined, CheckCircleFilled, ClockCircleOutlined,
  DollarOutlined, PlusOutlined, ReloadOutlined, ShopOutlined, TeamOutlined,
} from '@ant-design/icons';
import { Button, Card, Col, DatePicker, Empty, Form, Input, InputNumber, Modal, Row, Select, Space, Spin, Tag, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axios.config';
import { ROUTES } from '../../router/routes';
import { getWorkSucursal, setWorkSucursal } from '../../services/work-context/work-context.service';
import './Plataforma.css';

type Sucursal = { id: number; nombre: string; activo: boolean; municipio?: string; entidad?: string };
type Pago = { id: number; importe: string | number; fechaPago: string; periodoInicio: string; periodoFin: string; referencia?: string };
type Empresa = {
  id: number; nombreComercial: string; razonSocial: string; correo?: string; telefono?: string;
  estadoAcceso: 'ACTIVO' | 'SUSPENDIDO' | 'INACTIVO'; coberturaHasta?: string;
  suspenderAlFinal: boolean; motivoSuspension?: string; sucursales: Sucursal[];
  usuarios?: Array<{ id: number }>;
  pagos?: Pago[];
  _count: { pagos: number };
};

type BranchForm = {
  nombre: string; telefono?: string; correo?: string; entidad: string;
  municipio: string; colonia: string; codigoPostal: string; calle: string;
  numeroExterior: string; numeroInterior: string;
};
type CompanyForm = { nombreComercial: string; razonSocial: string; rfc?: string; telefono?: string; correo?: string };

const Plataforma: React.FC = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Empresa[]>([]);
  const [company, setCompany] = useState<Empresa | null>(null);
  const [branchId, setBranchId] = useState<number>();
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [amount, setAmount] = useState<number | null>(null);
  const [serviceStart, setServiceStart] = useState<dayjs.Dayjs | null>(null);
  const [months, setMonths] = useState(1);
  const [branchOpen, setBranchOpen] = useState(false);
  const [savingBranch, setSavingBranch] = useState(false);
  const [branchForm] = Form.useForm<BranchForm>();
  const [companyForm] = Form.useForm<CompanyForm>();
  const [companyOpen, setCompanyOpen] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);

  const unwrap = (response: any) => response.data?.data ?? response.data;

  const selectCompany = async (item: Empresa) => {
    sessionStorage.setItem('empresa_contexto_id', String(item.id));
    const activeBranches = item.sucursales.filter((branch) => branch.activo);
    const stored = getWorkSucursal();
    const initial = activeBranches.find((branch) => branch.id === stored?.id) ?? activeBranches[0];
    if (initial) {
      setBranchId(initial.id);
      setWorkSucursal({ id: initial.id, nombre: initial.nombre, empresaId: item.id });
    } else {
      setBranchId(undefined);
    }
    setCompany(item);
    try {
      const detailResponse = await axiosInstance.get(`/plataforma/empresas/${item.id}`, { skipWorkContext: true } as any);
      setCompany({ ...item, ...unwrap(detailResponse) });
    } catch { /* el resumen sigue disponible */ }
  };

  const load = async (preferredCompanyId?: number) => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/plataforma/empresas', { skipWorkContext: true } as any);
      const rows: Empresa[] = unwrap(response) ?? [];
      setCompanies(rows);
      if (rows.length) {
        const selected = rows.find((item) => item.id === preferredCompanyId) ?? rows[0];
        void selectCompany(selected);
      }
      else setCompany(null);
    } catch (error: any) {
      message.error(error.response?.data?.message ?? 'No se pudieron cargar las empresas');
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const visibleCompanies = useMemo(() => {
    const value = search.trim().toLowerCase();
    return value ? companies.filter((item) => `${item.nombreComercial} ${item.correo ?? ''}`.toLowerCase().includes(value)) : companies;
  }, [companies, search]);

  const chooseBranch = (id: number) => {
    if (!company) return;
    const branch = company.sucursales.find((item) => item.id === id);
    if (!branch) return;
    setBranchId(id);
    sessionStorage.setItem('empresa_contexto_id', String(company.id));
    setWorkSucursal({ id, nombre: branch.nombre, empresaId: company.id });
  };

  const enterCompany = () => {
    if (!company || !branchId) return message.warning('La empresa necesita una sucursal activa para entrar');
    const branch = company.sucursales.find((item) => item.id === branchId);
    message.success(`Trabajando en ${company.nombreComercial} · ${branch?.nombre}`);
    navigate(ROUTES.DASHBOARD_ADMIN);
  };

  const action = (type: 'programar-suspension' | 'suspender' | 'reactivar') => {
    if (!company) return;
    const labels = { 'programar-suspension': 'suspender al finalizar la cobertura', suspender: 'suspender el servicio ahora', reactivar: 'reactivar el servicio' };
    Modal.confirm({
      title: `¿Deseas ${labels[type]}?`,
      content: type === 'programar-suspension' ? `La empresa conservará acceso hasta ${company.coberturaHasta ? dayjs(company.coberturaHasta).format('DD/MM/YYYY') : 'el fin del periodo registrado'}.` : 'Esta acción aplica a toda la empresa y a todas sus sucursales.',
      okText: 'Confirmar', cancelText: 'Cancelar',
      onOk: async () => {
        await axiosInstance.post(`/plataforma/empresas/${company.id}/${type}`, { motivo: type === 'reactivar' ? 'Reactivación administrativa' : 'Decisión administrativa' }, { skipWorkContext: true } as any);
        message.success('Servicio actualizado'); await load(company.id);
      },
    });
  };

  const openPayment = () => {
    if (!company || !renewalAllowed) return;
    const start = company.coberturaHasta && dayjs(company.coberturaHasta).startOf('day').diff(dayjs().startOf('day'), 'day') >= 0
      ? dayjs(company.coberturaHasta).add(1, 'day')
      : dayjs().startOf('day');
    setServiceStart(start);
    setMonths(1);
    setPaymentOpen(true);
  };

  const savePayment = async () => {
    if (!company || !amount || !serviceStart) return message.warning('Completa el importe y la fecha de inicio');
    await axiosInstance.post(`/plataforma/empresas/${company.id}/pagos`, {
      importe: amount, fechaPago: dayjs().format('YYYY-MM-DD'),
      periodoInicio: serviceStart.format('YYYY-MM-DD'), meses: months,
    }, { skipWorkContext: true } as any);
    setPaymentOpen(false); setAmount(null); setServiceStart(null);
    message.success('Pago y cobertura de la empresa registrados'); await load(company.id);
  };

  const saveBranch = async () => {
    if (!company) return;
    const values = await branchForm.validateFields();
    setSavingBranch(true);
    try {
      const response = await axiosInstance.post(
        `/plataforma/empresas/${company.id}/sucursales`,
        { ...values, numeroInterior: values.numeroInterior || '' },
        { skipWorkContext: true } as any,
      );
      const created: Sucursal = unwrap(response);
      branchForm.resetFields();
      setBranchOpen(false);
      await load(company.id);
      setBranchId(created.id);
      sessionStorage.setItem('empresa_contexto_id', String(company.id));
      setWorkSucursal({ id: created.id, nombre: created.nombre, empresaId: company.id });
      message.success('Sucursal creada y seleccionada');
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(error.response?.data?.message ?? 'No fue posible crear la sucursal');
    } finally { setSavingBranch(false); }
  };

  const saveCompany = async () => {
    const values = await companyForm.validateFields();
    setSavingCompany(true);
    try {
      const response = await axiosInstance.post('/plataforma/empresas', values, { skipWorkContext: true } as any);
      const created = unwrap(response);
      companyForm.resetFields();
      setCompanyOpen(false);
      await load(Number(created.id));
      message.success('Empresa creada correctamente');
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(error.response?.data?.message ?? 'No fue posible crear la empresa');
    } finally { setSavingCompany(false); }
  };

  const daysRemaining = company?.coberturaHasta
    ? Math.max(0, dayjs(company.coberturaHasta).startOf('day').diff(dayjs().startOf('day'), 'day') + 1)
    : null;
  const daysUntilCoverageEnd = company?.coberturaHasta
    ? dayjs(company.coberturaHasta).startOf('day').diff(dayjs().startOf('day'), 'day')
    : null;
  const hasActiveCoverage = daysUntilCoverageEnd !== null && daysUntilCoverageEnd >= 0;
  const renewalAllowed = daysUntilCoverageEnd === null || daysUntilCoverageEnd <= 3;
  const renewalAvailableDate = company?.coberturaHasta
    ? dayjs(company.coberturaHasta).subtract(3, 'day')
    : null;
  const calculatedEnd = serviceStart
    ? serviceStart.add(months, 'month').subtract(1, 'day')
    : null;

  return <div className="platform-page">
    <div className="platform-heading">
      <div><Typography.Title level={2}>Empresas conectadas</Typography.Title><Typography.Text type="secondary">Administra el servicio y la vigencia de cada empresa. El cobro incluye todas sus sucursales.</Typography.Text></div>
      <Space><Tag color="purple">{companies.length} empresa(s)</Tag><Button type="primary" icon={<PlusOutlined />} onClick={() => setCompanyOpen(true)}>Nueva empresa</Button></Space>
    </div>

    <div className="platform-shell">
      <aside className="company-list">
        <Input.Search placeholder="Buscar empresa" value={search} onChange={(event) => setSearch(event.target.value)} allowClear />
        <Spin spinning={loading}>
          <div className="company-list-items">
            {visibleCompanies.map((item) => <button key={item.id} className={`company-option ${company?.id === item.id ? 'selected' : ''}`} onClick={() => void selectCompany(item)}>
              <span className="company-option-icon"><BankOutlined /></span>
              <span><strong>{item.nombreComercial}</strong><small>{item.correo || 'Sin correo'}</small></span>
              {company?.id === item.id && <CheckCircleFilled />}
            </button>)}
          </div>
        </Spin>
      </aside>

      <main className="company-detail">
        {!company ? <Empty description="No hay empresas registradas" /> : <>
          <Card className="company-hero">
            <div className="company-hero-main">
              <span className="company-logo"><BankOutlined /></span>
              <div><Typography.Text className="eyebrow">EMPRESA ACTUAL</Typography.Text><Typography.Title level={3}>{company.nombreComercial}</Typography.Title><Typography.Text>{company.razonSocial}</Typography.Text></div>
            </div>
            <Tag color={company.estadoAcceso === 'ACTIVO' ? 'green' : 'red'}>{company.estadoAcceso}</Tag>
          </Card>

          <div className="service-grid">
            <Card><DollarOutlined /><Typography.Text type="secondary">SERVICIO GLOBAL</Typography.Text><strong>{company._count?.pagos ? `${company._count.pagos} pago(s)` : 'Sin pagos registrados'}</strong><small>Incluye todas las sucursales</small></Card>
            <Card><CalendarOutlined /><Typography.Text type="secondary">COBERTURA HASTA</Typography.Text><strong>{company.coberturaHasta ? dayjs(company.coberturaHasta).format('DD/MM/YYYY') : 'Sin configurar'}</strong><small>{daysRemaining === null ? 'Registra el primer periodo' : `${daysRemaining} día(s) restantes`}</small></Card>
            <Card><ShopOutlined /><Typography.Text type="secondary">SUCURSALES</Typography.Text><strong>{company.sucursales.length}</strong><small>{company.sucursales.filter((item) => item.activo).length} activa(s)</small></Card>
            <Card><TeamOutlined /><Typography.Text type="secondary">ADMINISTRADORES</Typography.Text><strong>{company.usuarios?.length ?? 0}</strong><small>Usuarios responsables</small></Card>
          </div>

          <Card className="service-actions" title="Servicio y renovación" extra={<Tag color="blue">Cobro por empresa</Tag>}>
            <Space wrap>
              <Button type="primary" icon={<ReloadOutlined />} disabled={!renewalAllowed} onClick={openPayment}>
                {renewalAllowed ? 'Renovar / registrar pago' : `Renovable desde ${renewalAvailableDate?.format('DD/MM/YYYY')}`}
              </Button>
              <Button icon={<ClockCircleOutlined />} onClick={() => action('programar-suspension')}>Suspender al finalizar cobertura</Button>
              {company.estadoAcceso === 'SUSPENDIDO' ? <Button onClick={() => action('reactivar')}>Reactivar empresa</Button> : <Button danger onClick={() => action('suspender')}>Suspender empresa ahora</Button>}
            </Space>
            {company.motivoSuspension && <Typography.Paragraph type="danger" className="suspension-reason">{company.motivoSuspension}</Typography.Paragraph>}
          </Card>

          <Card className="branches-card" title="Sucursales de la empresa" extra={<Space wrap><Typography.Text type="secondary">Selecciona dónde trabajar</Typography.Text><Button type="primary" icon={<PlusOutlined />} onClick={() => setBranchOpen(true)}>Nueva sucursal</Button></Space>}>
            <div className="branch-grid">
              {company.sucursales.filter((item) => item.activo).map((branch) => <button key={branch.id} className={`branch-option ${branchId === branch.id ? 'selected' : ''}`} onClick={() => chooseBranch(branch.id)}>
                <ShopOutlined /><span><strong>{branch.nombre}</strong><small>{[branch.municipio, branch.entidad].filter(Boolean).join(', ') || 'Sucursal activa'}</small></span>{branchId === branch.id && <CheckCircleFilled />}
              </button>)}
            </div>
            <div className="enter-row"><Button type="primary" size="large" disabled={!branchId} onClick={enterCompany}>Entrar a la empresa</Button></div>
          </Card>

          {company.pagos && company.pagos.length > 0 && <Card title="Pagos recientes" className="payments-card">
            {company.pagos.slice(0, 5).map((payment) => <div className="payment-row" key={payment.id}><span><strong>${Number(payment.importe).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong><small>{payment.referencia || 'Pago administrativo'}</small></span><span>{dayjs(payment.periodoInicio).format('DD/MM/YYYY')} – {dayjs(payment.periodoFin).format('DD/MM/YYYY')}</span></div>)}
          </Card>}
        </>}
      </main>
    </div>

    <Modal title={`Renovar servicio · ${company?.nombreComercial ?? ''}`} open={paymentOpen} onCancel={() => setPaymentOpen(false)} onOk={() => void savePayment()} okText="Guardar pago y cobertura">
      <Typography.Paragraph type="secondary">Este pago cubre a la empresa completa, incluyendo todas sus sucursales.</Typography.Paragraph>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <label>Importe<InputNumber min={0.01} precision={2} prefix="$" value={amount} onChange={setAmount} style={{ width: '100%', marginTop: 6 }} /></label>
        <label>Meses de servicio<Select value={months} onChange={setMonths} options={Array.from({ length: 12 }, (_, index) => index + 1).map((value) => ({ value, label: `${value} ${value === 1 ? 'mes' : 'meses'}` }))} style={{ width: '100%', marginTop: 6 }} /></label>
        <label>Inicio del servicio<DatePicker value={serviceStart} onChange={setServiceStart} disabled={hasActiveCoverage} disabledDate={(date) => date.startOf('day').isBefore(dayjs().startOf('day'))} format="DD/MM/YYYY" style={{ width: '100%', marginTop: 6 }} />{hasActiveCoverage && <Typography.Text type="secondary"> La renovación comienza automáticamente al día siguiente de la cobertura actual.</Typography.Text>}</label>
        <div className="calculated-period"><span>Periodo calculado</span><strong>{serviceStart && calculatedEnd ? `${serviceStart.format('DD/MM/YYYY')} – ${calculatedEnd.format('DD/MM/YYYY')}` : 'Selecciona la fecha de inicio'}</strong></div>
      </Space>
    </Modal>
    <Modal title={`Nueva sucursal · ${company?.nombreComercial ?? ''}`} open={branchOpen} onCancel={() => { setBranchOpen(false); branchForm.resetFields(); }} onOk={() => void saveBranch()} okText="Crear sucursal" confirmLoading={savingBranch} width={760} destroyOnHidden>
      <Typography.Paragraph type="secondary">La sucursal quedará registrada dentro de esta empresa y estará disponible como contexto de trabajo.</Typography.Paragraph>
      <Form form={branchForm} layout="vertical" requiredMark="optional">
        <Row gutter={14}>
          <Col xs={24} md={12}><Form.Item name="nombre" label="Nombre de la sucursal" rules={[{ required: true, message: 'Ingresa el nombre' }]}><Input placeholder="Sucursal Centro" /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item name="correo" label="Correo" rules={[{ type: 'email', message: 'Ingresa un correo válido' }]}><Input placeholder="sucursal@empresa.com" /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item name="telefono" label="Teléfono"><Input placeholder="Teléfono de contacto" /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item name="entidad" label="Estado" rules={[{ required: true, message: 'Ingresa el estado' }]}><Input placeholder="Puebla" /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item name="municipio" label="Municipio" rules={[{ required: true, message: 'Ingresa el municipio' }]}><Input placeholder="Puebla" /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item name="colonia" label="Colonia" rules={[{ required: true, message: 'Ingresa la colonia' }]}><Input placeholder="Centro" /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item name="codigoPostal" label="Código postal" rules={[{ required: true, message: 'Ingresa el código postal' }]}><Input placeholder="72000" maxLength={10} /></Form.Item></Col>
          <Col xs={24} md={16}><Form.Item name="calle" label="Calle" rules={[{ required: true, message: 'Ingresa la calle' }]}><Input placeholder="Nombre de la calle" /></Form.Item></Col>
          <Col xs={12}><Form.Item name="numeroExterior" label="Número exterior" rules={[{ required: true, message: 'Ingresa el número exterior' }]}><Input /></Form.Item></Col>
          <Col xs={12}><Form.Item name="numeroInterior" label="Número interior"><Input placeholder="Opcional" /></Form.Item></Col>
        </Row>
      </Form>
    </Modal>
    <Modal title="Nueva empresa" open={companyOpen} onCancel={() => { setCompanyOpen(false); companyForm.resetFields(); }} onOk={() => void saveCompany()} confirmLoading={savingCompany} okText="Crear empresa" cancelText="Cancelar" centered destroyOnHidden>
      <Form form={companyForm} layout="vertical">
        <Form.Item name="nombreComercial" label="Nombre comercial" rules={[{ required: true, whitespace: true }]}><Input placeholder="Ej. Clínica del Centro" /></Form.Item>
        <Form.Item name="razonSocial" label="Razón social" rules={[{ required: true, whitespace: true }]}><Input placeholder="Razón social de la empresa" /></Form.Item>
        <Form.Item name="rfc" label="RFC"><Input /></Form.Item>
        <Form.Item name="telefono" label="Teléfono"><Input /></Form.Item>
        <Form.Item name="correo" label="Correo" rules={[{ type: 'email' }]}><Input /></Form.Item>
      </Form>
    </Modal>
  </div>;
};

export default Plataforma;
