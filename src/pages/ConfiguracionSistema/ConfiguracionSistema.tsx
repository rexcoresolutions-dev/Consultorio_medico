import React, { useEffect, useMemo, useState } from 'react';
import {
  App,
  Button,
  ColorPicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Spin,
  Switch,
  Tabs,
  Upload,
} from 'antd';
import {
  CheckCircleOutlined,
  HeartOutlined,
  PictureOutlined,
  ReloadOutlined,
  SaveOutlined,
  SettingOutlined,
  UndoOutlined,
  UploadOutlined,
  MailOutlined,
  KeyOutlined,
  BellOutlined,
  EyeOutlined,
} from '@ant-design/icons';

import useSystemConfig from '../../hooks/useSystemConfig';
import systemConfigService, {
  type SystemConfig,
} from '../../services/system-config/system-config.service';
import { removeConnectedLightBackground } from '../../utils/logoBackgroundRemoval';
import { loadEmpresaConfig, revealEmpresaTemporaryPassword, saveEmpresaConfig, testEmpresaSmtp, type EmpresaConfig } from '../../services/system-config/empresa-config.service';
import './ConfiguracionSistema.css';

const MAX_IMAGE_SIZE = 1.5 * 1024 * 1024;
const ALLOWED_IMAGES = ['image/png', 'image/jpeg', 'image/webp'];

const DEFAULT_THEME_COLOR = '#36C6C7';

const THEME_PRESETS = [
  { key: 'turquesa', label: 'Turquesa', color: DEFAULT_THEME_COLOR },
  { key: 'azul', label: 'Azul', color: '#2563EB' },
  { key: 'rosa', label: 'Rosa', color: '#EC4899' },
  { key: 'amarillo', label: 'Amarillo', color: '#F4B740' },
  { key: 'verde', label: 'Verde', color: '#22A06B' },
  { key: 'morado', label: 'Morado', color: '#7C3AED' },
  { key: 'rojo', label: 'Rojo', color: '#E5484D' },
];

type IdentityFormValues = {
  nombreSistema: string;
  subtitulo: string;
  descripcion: string;
  colorMarca: any;
  mostrarNombreSidebar: boolean;
};

const getHexColor = (value: any, fallback: string) => {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return value?.toHexString?.() || fallback;
};

const getApiError = (error: any) => {
  const details = error?.response?.data?.details;
  if (Array.isArray(details) && details.length) return details.join('. ');

  const backendMessage = error?.response?.data?.message;
  if (Array.isArray(backendMessage)) return backendMessage.join('. ');
  if (backendMessage) return String(backendMessage);

  return 'No fue posible guardar la identidad del sistema.';
};

const ConfiguracionSistema: React.FC = () => {
  const current = useSystemConfig();
  const [form] = Form.useForm<IdentityFormValues>();
  const [companyForm] = Form.useForm();
  const { message, modal } = App.useApp();

  const [draft, setDraft] = useState<SystemConfig>(current);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState(current.logoDataUrl);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [removeLogoBackground, setRemoveLogoBackground] = useState(true);
  const [processingLogo, setProcessingLogo] = useState(false);
  const [companyLoading, setCompanyLoading] = useState(true);
  const [companySaving, setCompanySaving] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpPasswordConfigured, setSmtpPasswordConfigured] = useState(false);
  const [temporaryPasswordConfigured, setTemporaryPasswordConfigured] = useState(false);
  const [revealedTemporaryPassword, setRevealedTemporaryPassword] = useState<string | null>(null);
  const [revealedPasswordInUse, setRevealedPasswordInUse] = useState(false);
  const [revealingPassword, setRevealingPassword] = useState(false);
  const [settingsArea, setSettingsArea] = useState<'identity' | 'smtp' | 'access' | 'notifications'>('identity');

  const initialValues = useMemo<IdentityFormValues>(
    () => ({
      nombreSistema: current.nombreSistema,
      subtitulo: current.subtitulo,
      descripcion: current.descripcion,
      colorMarca: current.colorMarca,
      mostrarNombreSidebar: current.mostrarNombreSidebar,
    }),
    [current],
  );

  useEffect(() => {
    form.setFieldsValue(initialValues);
    setDraft(current);
    setLogoFile(null);
    setLogoPreview(current.logoDataUrl);
  }, [current, form, initialValues]);

  useEffect(() => {
    let active = true;
    setCompanyLoading(true);
    loadEmpresaConfig().then((config: EmpresaConfig) => {
      if (!active) return;
      companyForm.setFieldsValue(config);
      setSmtpPasswordConfigured(config.smtpPasswordConfigurado);
      setTemporaryPasswordConfigured(config.passwordTemporalConfigurada);
    }).catch((error) => message.error(getApiError(error)))
      .finally(() => active && setCompanyLoading(false));
    return () => { active = false; };
  }, [companyForm, message]);

  const handleCompanySave = async () => {
    try {
      const values = await companyForm.validateFields();
      setCompanySaving(true);
      const { destinatarioPrueba: _destinatarioPrueba, ...configurationValues } = values;
      const normalizedSecurity = Number(configurationValues.smtpPuerto) === 465
        ? 'TLS'
        : Number(configurationValues.smtpPuerto) === 587
          ? 'STARTTLS'
          : configurationValues.smtpSeguridad;
      const saved = await saveEmpresaConfig({
        ...configurationValues,
        smtpSeguridad: normalizedSecurity,
        smtpResponderA: configurationValues.smtpResponderA?.trim() || null,
      });
      setSmtpPasswordConfigured(saved.smtpPasswordConfigurado);
      setTemporaryPasswordConfigured(saved.passwordTemporalConfigurada);
      companyForm.setFieldsValue({ ...saved, smtpPassword: undefined, passwordTemporal: undefined });
      message.success('Configuración de la empresa actualizada.');
    } catch (error: any) {
      if (!error?.errorFields) message.error(getApiError(error));
    } finally { setCompanySaving(false); }
  };

  const handleSmtpTest = async () => {
    try {
      const destinatario = companyForm.getFieldValue('destinatarioPrueba');
      if (!destinatario) return message.warning('Ingresa el destinatario de prueba.');
      setSmtpTesting(true);
      await testEmpresaSmtp(destinatario);
      message.success('Correo aceptado por el servidor SMTP.');
    } catch (error) { message.error(getApiError(error)); }
    finally { setSmtpTesting(false); }
  };

  const handleRevealTemporaryPassword = async () => {
    try {
      setRevealingPassword(true);
      const result = await revealEmpresaTemporaryPassword();
      setRevealedTemporaryPassword(result.passwordTemporal);
      setRevealedPasswordInUse(result.utilizadaEnNuevasCuentas);
    } catch (error) { message.error(getApiError(error)); }
    finally { setRevealingPassword(false); }
  };

  const readLogo = async (file: File) => {
    if (file.size > MAX_IMAGE_SIZE) {
      message.error('El logo debe pesar máximo 1.5 MB.');
      return Upload.LIST_IGNORE;
    }

    if (!ALLOWED_IMAGES.includes(file.type)) {
      message.error('Usa un archivo PNG, JPG o WEBP.');
      return Upload.LIST_IGNORE;
    }

    setProcessingLogo(true);
    let preparedFile = file;
    try {
      if (removeLogoBackground) {
        preparedFile = await removeConnectedLightBackground(file);
        message.success('Fondo claro removido. Revisa la vista previa antes de guardar.');
      }
    } catch (error) {
      console.warn('No fue posible quitar el fondo del logo:', error);
      message.warning('Se conservará el logo original porque no fue posible quitar el fondo.');
    } finally {
      setProcessingLogo(false);
    }

    setLogoFile(preparedFile);

    const reader = new FileReader();
    reader.onload = () => setLogoPreview(String(reader.result || ''));
    reader.readAsDataURL(preparedFile);

    return false;
  };

  const cancelLogoChange = () => {
    setLogoFile(null);
    setLogoPreview(current.logoDataUrl);
  };

  const handleValuesChange = (_: unknown, values: IdentityFormValues) => {
    const colorMarca = getHexColor(values.colorMarca, draft.colorMarca || current.colorMarca);

    setDraft((previous) => ({
      ...previous,
      nombreSistema: values.nombreSistema ?? previous.nombreSistema,
      nombreCorto: values.nombreSistema ?? previous.nombreCorto,
      subtitulo: values.subtitulo ?? previous.subtitulo,
      descripcion: values.descripcion ?? previous.descripcion,
      colorMarca,
      mostrarNombreSidebar:
        values.mostrarNombreSidebar ?? previous.mostrarNombreSidebar,
    }));
  };

  const setThemeColor = (color: string) => {
    const normalized = color.toUpperCase();
    form.setFieldValue('colorMarca', normalized);
    setDraft((previous) => ({ ...previous, colorMarca: normalized }));
  };

  const isPresetActive = (color: string) =>
    String(draft.colorMarca || '').toUpperCase() === color.toUpperCase();

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const colorMarca = getHexColor(values.colorMarca, current.colorMarca);

      const saved = await systemConfigService.save({
        nombreSistema: values.nombreSistema,
        subtitulo: values.subtitulo || 'Consultorio médico',
        descripcion: values.descripcion || 'Sistema Integral de Gestión Médica',
        colorMarca,
        mostrarNombreSidebar: Boolean(values.mostrarNombreSidebar),
        logo: logoFile,
      });

      setLogoFile(null);
      setLogoPreview(saved.logoDataUrl);
      setDraft(saved);
      form.setFieldsValue({
        nombreSistema: saved.nombreSistema,
        subtitulo: saved.subtitulo,
        descripcion: saved.descripcion,
        colorMarca: saved.colorMarca,
        mostrarNombreSidebar: saved.mostrarNombreSidebar,
      });

      message.success('Identidad del sistema actualizada correctamente.');
    } catch (error: any) {
      if (error?.errorFields) return;
      console.error('Error guardando identidad:', error);
      message.error(getApiError(error));
    } finally {
      setSaving(false);
    }
  };

  const handleReload = async () => {
    try {
      setRefreshing(true);
      const loaded = await systemConfigService.load(true);
      setLogoFile(null);
      setLogoPreview(loaded.logoDataUrl);
      message.success('Identidad actualizada desde el servidor.');
    } catch (error) {
      console.error('Error cargando identidad:', error);
      message.error('No fue posible actualizar la identidad desde el servidor.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleReset = () => {
    modal.confirm({
      title: 'Restaurar identidad predeterminada',
      content:
        'Se restaurarán en el servidor el nombre, logo, color y preferencias visuales predeterminadas para todos los usuarios.',
      okText: 'Sí, restaurar',
      cancelText: 'Cancelar',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const restored = await systemConfigService.reset();
          setLogoFile(null);
          setLogoPreview(restored.logoDataUrl);
          setDraft(restored);
          form.setFieldsValue({
            nombreSistema: restored.nombreSistema,
            subtitulo: restored.subtitulo,
            descripcion: restored.descripcion,
            colorMarca: restored.colorMarca,
            mostrarNombreSidebar: restored.mostrarNombreSidebar,
          });
          message.success('Identidad predeterminada restaurada.');
        } catch (error) {
          console.error('Error restaurando identidad:', error);
          message.error('No fue posible restaurar la identidad predeterminada.');
          throw error;
        }
      },
    });
  };

  const displayedLogo = logoPreview || current.logoDataUrl;

  return (
    <main className="system-settings-page">
      <section className="system-settings-hero">
        <div>
          <span className="system-settings-eyebrow">ADMINISTRACIÓN DEL SISTEMA</span>
          <h1>Configuración</h1>
          <p>
            Personaliza la identidad visual que verán todos los usuarios del sistema.
          </p>
        </div>

        <div className="system-settings-hero-actions">
          <span className="system-settings-mode">
            <CheckCircleOutlined /> Conectado
          </span>
          <Button
            icon={<ReloadOutlined />}
            loading={refreshing}
            onClick={handleReload}
          >
            Actualizar
          </Button>
        </div>
      </section>

      <nav className="system-settings-area-nav" aria-label="Secciones de configuración">
        <button type="button" className={settingsArea === 'identity' ? 'active' : ''} onClick={() => setSettingsArea('identity')}>
          <PictureOutlined /><span><strong>Identidad visual</strong></span>
        </button>
        <button type="button" className={settingsArea === 'smtp' ? 'active' : ''} onClick={() => setSettingsArea('smtp')}>
          <MailOutlined /><span><strong>Correo SMTP</strong></span>
        </button>
        <button type="button" className={settingsArea === 'access' ? 'active' : ''} onClick={() => setSettingsArea('access')}>
          <KeyOutlined /><span><strong>Primer ingreso</strong></span>
        </button>
        <button type="button" className={settingsArea === 'notifications' ? 'active' : ''} onClick={() => setSettingsArea('notifications')}>
          <BellOutlined /><span><strong>Notificaciones</strong></span>
        </button>
      </nav>

      {settingsArea === 'identity' && <div className="system-settings-grid">
        <aside className="system-settings-preview-card">
          <div className="system-settings-preview-title">
            <span>Vista previa</span>
            <small>Así se verá la identidad principal</small>
          </div>

          <div
            className="system-settings-brand-preview"
            style={{ '--preview-brand-color': draft.colorMarca } as React.CSSProperties}
          >
            <div className="system-settings-logo-preview">
              {displayedLogo ? (
                <img src={displayedLogo} alt="Logo del sistema" />
              ) : (
                <HeartOutlined />
              )}
            </div>

            {draft.mostrarNombreSidebar && (
              <div>
                <strong>{draft.nombreSistema || 'MediSys'}</strong>
                <span>{draft.subtitulo || 'Consultorio médico'}</span>
              </div>
            )}
          </div>

          <div className="system-settings-login-preview">
            <span className="system-settings-preview-label">PANTALLA DE ACCESO</span>
            <div className="system-settings-login-brand">
              <div className="system-settings-login-logo-plain">
                {displayedLogo ? (
                  <img src={displayedLogo} alt="Logo" />
                ) : (
                  <HeartOutlined style={{ color: draft.colorMarca }} />
                )}
              </div>
              <div>
                <strong>{draft.nombreSistema || 'MediSys'}</strong>
                <small>{draft.descripcion || 'Sistema Integral de Gestión Médica'}</small>
              </div>
            </div>
          </div>
        </aside>

        <section className="system-settings-form-card">
          <Spin spinning={refreshing}>
            <Form
              form={form}
              layout="vertical"
              initialValues={initialValues}
              onValuesChange={handleValuesChange}
            >
              <div className="system-settings-section-heading">
                <span className="system-settings-section-icon">
                  <SettingOutlined />
                </span>
                <div>
                  <h2>Identidad del sistema</h2>
                  <p>Nombre y textos principales visibles para los usuarios.</p>
                </div>
              </div>

              <Form.Item
                label="Nombre del sistema"
                name="nombreSistema"
                rules={[{ required: true, message: 'Captura el nombre del sistema' }]}
                extra="Aparecerá en el menú, acceso, bienvenida y documentos del sistema."
              >
                <Input placeholder="MediSys" maxLength={50} />
              </Form.Item>

              <Form.Item label="Subtítulo" name="subtitulo">
                <Input placeholder="Consultorio médico" maxLength={60} />
              </Form.Item>

              <Form.Item label="Descripción del sistema" name="descripcion">
                <Input.TextArea
                  rows={2}
                  placeholder="Sistema Integral de Gestión Médica"
                  maxLength={120}
                />
              </Form.Item>

              <div className="system-settings-divider" />

              <div className="system-settings-section-heading">
                <span className="system-settings-section-icon">
                  <PictureOutlined />
                </span>
                <div>
                  <h2>Logo e identidad visual</h2>
                  <p>El logo se utilizará en el menú, acceso, bienvenida y documentos.</p>
                </div>
              </div>

              <div className="system-settings-brand-editor">
                <div className="system-settings-logo-box">
                  {displayedLogo ? (
                    <img src={displayedLogo} alt="Logo actual" />
                  ) : (
                    <HeartOutlined style={{ color: draft.colorMarca }} />
                  )}
                </div>

                <div className="system-settings-logo-actions">
                  <strong>Logo principal</strong>
                  <span>PNG, JPG o WEBP. Máximo 1.5 MB.</span>
                  <label className="system-settings-remove-background">
                    <Switch checked={removeLogoBackground} onChange={setRemoveLogoBackground} size="small" />
                    <span>Quitar automáticamente el fondo claro al subir</span>
                  </label>
                  <div>
                    <Upload
                      accept="image/png,image/jpeg,image/webp"
                      showUploadList={false}
                      beforeUpload={readLogo}
                    >
                      <Button icon={<UploadOutlined />} loading={processingLogo}>
                        {processingLogo ? 'Procesando logo' : displayedLogo ? 'Cambiar logo' : 'Subir logo'}
                      </Button>
                    </Upload>

                    {logoFile && (
                      <Button icon={<UndoOutlined />} onClick={cancelLogoChange}>
                        Cancelar cambio
                      </Button>
                    )}
                  </div>
                  {current.logoDataUrl && !logoFile && (
                    <small className="system-settings-logo-help">
                      Para volver al logo original utiliza “Restaurar predeterminados”.
                    </small>
                  )}
                </div>
              </div>

              <div className="system-settings-theme-block">
                <div className="system-settings-theme-title">
                  <div>
                    <strong>Tema de color del sistema</strong>
                    <span>
                      Este color rige la interfaz completa: menú lateral, botones, pestañas,
                      selecciones, tablas, calendarios y acentos visuales.
                    </span>
                  </div>

                  <Button
                    type="text"
                    className="system-settings-default-theme-btn"
                    onClick={() => setThemeColor(DEFAULT_THEME_COLOR)}
                  >
                    Usar turquesa predeterminado
                  </Button>
                </div>

                <div className="system-settings-theme-presets">
                  {THEME_PRESETS.map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      className={`system-settings-theme-preset ${
                        isPresetActive(preset.color) ? 'active' : ''
                      }`}
                      style={{ '--preset-color': preset.color } as React.CSSProperties}
                      onClick={() => setThemeColor(preset.color)}
                    >
                      <span
                        className="system-settings-theme-swatch"
                        style={{ background: preset.color }}
                      />
                      <span>{preset.label}</span>
                      {isPresetActive(preset.color) && <CheckCircleOutlined />}
                    </button>
                  ))}
                </div>

                <div className="system-settings-custom-theme">
                  <div>
                    <strong>Color personalizado</strong>
                    <span>Elige cualquier color si no quieres usar una opción predefinida.</span>
                  </div>
                  <div className="system-settings-custom-theme-control">
                    <Form.Item name="colorMarca" hidden>
                      <Input />
                    </Form.Item>

                    <ColorPicker
                      value={draft.colorMarca || DEFAULT_THEME_COLOR}
                      format="hex"
                      disabledAlpha
                      onChange={(color) => setThemeColor(color.toHexString())}
                    >
                      <button
                        type="button"
                        className="system-settings-custom-color-trigger"
                        aria-label="Seleccionar color personalizado"
                      >
                        <span
                          className="system-settings-custom-color-swatch"
                          style={{ backgroundColor: draft.colorMarca || DEFAULT_THEME_COLOR }}
                        />
                        <span className="system-settings-custom-color-copy">
                          <small>HEX</small>
                          <strong>
                            {String(draft.colorMarca || DEFAULT_THEME_COLOR).toUpperCase()}
                          </strong>
                        </span>
                      </button>
                    </ColorPicker>
                  </div>
                </div>
              </div>

              <Form.Item
                className="system-settings-show-name-option"
                label="Mostrar nombre junto al logo"
                name="mostrarNombreSidebar"
                valuePropName="checked"
                extra="Si tu logo ya incluye el nombre de la clínica, puedes desactivarlo."
              >
                <Switch checkedChildren="Sí" unCheckedChildren="No" />
              </Form.Item>

              <div className="system-settings-actions">
                <Button icon={<ReloadOutlined />} danger onClick={handleReset}>
                  Restaurar predeterminados
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={saving}
                  onClick={handleSave}
                >
                  Guardar cambios
                </Button>
              </div>
            </Form>
          </Spin>
        </section>
      </div>}

      {settingsArea !== 'identity' && <section className="system-settings-form-card system-settings-company-card">
        <Spin spinning={companyLoading}>
          <Form form={companyForm} layout="vertical" initialValues={{ smtpPuerto: 587, smtpSeguridad: 'STARTTLS', generarPasswordTemporal: true, passwordTemporalDias: 60, cambioPasswordObligatorio: true }}>
            <div className="system-settings-section-heading">
              <span className="system-settings-section-icon"><SettingOutlined /></span>
              <div><h2>Configuración de la empresa</h2><p>Correo, acceso y avisos compartidos entre todas sus sucursales.</p></div>
            </div>
            <Tabs
              className="system-settings-company-tabs"
              activeKey={settingsArea}
              items={[
                {
                  key: 'smtp',
                  label: <span><MailOutlined /> Correo SMTP</span>,
                  children: <div className="system-settings-tab-panel">
                    <div className="system-settings-tab-intro"><div><h3>Servidor de correo</h3><p>Configura la cuenta que enviará accesos y notificaciones.</p></div><Form.Item name="smtpHabilitado" valuePropName="checked" noStyle><Switch checkedChildren="Activo" unCheckedChildren="Inactivo" /></Form.Item></div>
                    <div className="system-settings-fields-grid">
                      <Form.Item name="smtpHost" label="Servidor SMTP"><Input placeholder="smtp.proveedor.com" /></Form.Item>
                      <Form.Item name="smtpPuerto" label="Puerto" extra="587 usa STARTTLS; 465 usa TLS implícito."><InputNumber min={1} max={65535} style={{ width: '100%' }} onChange={(port) => { const numericPort = Number(port); if (numericPort === 465) companyForm.setFieldValue('smtpSeguridad', 'TLS'); if (numericPort === 587) companyForm.setFieldValue('smtpSeguridad', 'STARTTLS'); }} /></Form.Item>
                      <Form.Item name="smtpSeguridad" label="Seguridad"><Select options={[{ value: 'STARTTLS', label: 'STARTTLS' }, { value: 'TLS', label: 'TLS implícito' }, { value: 'NINGUNA', label: 'Sin cifrado' }]} /></Form.Item>
                      <Form.Item name="smtpUsuario" label="Usuario SMTP"><Input autoComplete="off" /></Form.Item>
                      <Form.Item name="smtpPassword" label={`Contraseña SMTP${smtpPasswordConfigured ? ' (configurada)' : ''}`}><Input.Password placeholder={smtpPasswordConfigured ? 'Déjala vacía para conservarla' : 'Contraseña SMTP'} autoComplete="new-password" /></Form.Item>
                      <Form.Item name="smtpRemitenteNombre" label="Nombre del remitente"><Input /></Form.Item>
                      <Form.Item name="smtpRemitenteCorreo" label="Correo del remitente" rules={[{ type: 'email' }]}><Input /></Form.Item>
                      <Form.Item name="smtpResponderA" label="Responder a" rules={[{ type: 'email' }]}><Input /></Form.Item>
                    </div>
                    <div className="system-settings-test-row"><Form.Item name="destinatarioPrueba" label="Destinatario de prueba" rules={[{ type: 'email' }]}><Input placeholder="correo@ejemplo.com" /></Form.Item><Button onClick={handleSmtpTest} loading={smtpTesting} icon={<MailOutlined />}>Enviar prueba</Button></div>
                  </div>,
                },
                {
                  key: 'access',
                  label: <span><KeyOutlined /> Primer ingreso</span>,
                  children: <div className="system-settings-tab-panel">
                    <div className="system-settings-tab-intro"><div><h3>Credenciales temporales</h3><p>Define cómo ingresan las cuentas nuevas y cuánto dura su acceso inicial.</p></div></div>
                    <div className="system-settings-option-card"><div><strong>Generar una contraseña individual segura</strong><span>El sistema crea una clave diferente para cada usuario nuevo.</span></div><Form.Item name="generarPasswordTemporal" valuePropName="checked" noStyle><Switch /></Form.Item></div>
                    <div className="system-settings-access-grid">
                      <div className="system-settings-credential-card">
                        <div><strong>Contraseña temporal predeterminada</strong><span>{temporaryPasswordConfigured ? 'Guardada de forma cifrada.' : 'Todavía no está configurada.'}</span></div>
                        <Form.Item name="passwordTemporal" noStyle><Input.Password placeholder={temporaryPasswordConfigured ? 'Déjala vacía para conservarla' : 'Nueva contraseña, mínimo 8 caracteres'} autoComplete="new-password" /></Form.Item>
                        <Button icon={<EyeOutlined />} loading={revealingPassword} disabled={!temporaryPasswordConfigured} onClick={() => void handleRevealTemporaryPassword()}>Ver contraseña configurada</Button>
                      </div>
                      <div className="system-settings-duration-card">
                        <div><strong>Vigencia del acceso inicial</strong><span>Al vencer debe emitirse una nueva contraseña temporal.</span></div>
                        <Form.Item name="passwordTemporalDias" noStyle><Select options={[{ value: 60, label: '60 días' }, { value: 90, label: '90 días' }]} /></Form.Item>
                      </div>
                    </div>
                    <div className="system-settings-option-card"><div><strong>Exigir cambio en el primer ingreso</strong><span>Bloquea los módulos hasta que el usuario elija una contraseña nueva.</span></div><Form.Item name="cambioPasswordObligatorio" valuePropName="checked" noStyle><Switch /></Form.Item></div>
                  </div>,
                },
                {
                  key: 'notifications',
                  label: <span><BellOutlined /> Notificaciones</span>,
                  children: <div className="system-settings-tab-panel">
                    <div className="system-settings-tab-intro"><div><h3>Eventos habilitados</h3><p>Selecciona los eventos que pueden generar avisos para esta empresa.</p></div></div>
                    <div className="system-settings-options-list">
                      <div className="system-settings-option-card"><div><strong>Alta y acceso inicial de usuarios</strong><span>Envía credenciales temporales después de crear una cuenta.</span></div><Form.Item name="notificarAltaUsuario" valuePropName="checked" noStyle><Switch /></Form.Item></div>
                      <div className="system-settings-option-card"><div><strong>Cambios de acceso</strong><span>Avisa modificaciones de rol, permisos o sucursales.</span></div><Form.Item name="notificarCambiosAcceso" valuePropName="checked" noStyle><Switch /></Form.Item></div>
                      <div className="system-settings-option-card"><div><strong>Citas</strong><span>Avisa creaciones, cambios, cancelaciones y recordatorios.</span></div><Form.Item name="notificarCitas" valuePropName="checked" noStyle><Switch /></Form.Item></div>
                    </div>
                  </div>,
                },
              ]}
            />
            <div className="system-settings-company-footer"><span>Los cambios se aplican a toda la empresa.</span><Button type="primary" icon={<SaveOutlined />} loading={companySaving} onClick={handleCompanySave}>Guardar configuración</Button></div>
          </Form>
        </Spin>
      </section>}
      <Modal title="Contraseña temporal configurada" open={revealedTemporaryPassword !== null} footer={null} onCancel={() => setRevealedTemporaryPassword(null)} destroyOnHidden>
        <p>{revealedPasswordInUse ? 'Esta contraseña se utiliza actualmente para las cuentas nuevas.' : 'Está guardada, pero las cuentas nuevas reciben una contraseña individual generada automáticamente.'}</p>
        <Input.Password value={revealedTemporaryPassword ?? ''} readOnly visibilityToggle />
        <Button style={{ marginTop: 16 }} onClick={() => setRevealedTemporaryPassword(null)}>Cerrar y ocultar</Button>
      </Modal>
    </main>
  );
};

export default ConfiguracionSistema;
