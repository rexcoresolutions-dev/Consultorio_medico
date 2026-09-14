import React, { useEffect, useMemo, useState } from 'react';
import {
  App,
  Button,
  ColorPicker,
  Form,
  Input,
  Spin,
  Switch,
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
} from '@ant-design/icons';

import useSystemConfig from '../../hooks/useSystemConfig';
import systemConfigService, {
  type SystemConfig,
} from '../../services/system-config/system-config.service';
import './ConfiguracionSistema.css';

const MAX_IMAGE_SIZE = 1.5 * 1024 * 1024;
const ALLOWED_IMAGES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

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
  const { message, modal } = App.useApp();

  const [draft, setDraft] = useState<SystemConfig>(current);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState(current.logoDataUrl);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

  const readLogo = (file: File) => {
    if (file.size > MAX_IMAGE_SIZE) {
      message.error('El logo debe pesar máximo 1.5 MB.');
      return Upload.LIST_IGNORE;
    }

    if (!ALLOWED_IMAGES.includes(file.type)) {
      message.error('Usa un archivo PNG, JPG, WEBP o SVG.');
      return Upload.LIST_IGNORE;
    }

    setLogoFile(file);

    const reader = new FileReader();
    reader.onload = () => setLogoPreview(String(reader.result || ''));
    reader.readAsDataURL(file);

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
          <Button
            icon={<ReloadOutlined />}
            loading={refreshing}
            onClick={handleReload}
          >
            Actualizar
          </Button>
        </div>
      </section>

      <div className="system-settings-grid">
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
                  <span>PNG, JPG, WEBP o SVG. Máximo 1.5 MB.</span>
                  <div>
                    <Upload
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      showUploadList={false}
                      beforeUpload={readLogo}
                    >
                      <Button icon={<UploadOutlined />}>
                        {displayedLogo ? 'Cambiar logo' : 'Subir logo'}
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
      </div>
    </main>
  );
};

export default ConfiguracionSistema;
