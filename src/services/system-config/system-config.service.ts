import axiosInstance from '../../api/axios.config';

export interface SystemConfig {
  nombreSistema: string;
  /** Compatibilidad con componentes existentes. Se deriva de nombreSistema. */
  nombreCorto: string;
  subtitulo: string;
  /** En la API corresponde a descripcionSistema. */
  descripcion: string;
  /** URL pública del logo devuelta por la API. */
  logoDataUrl: string;
  /** En la API corresponde a colorIdentidad. */
  colorMarca: string;
  tituloNavegador: string;
  version: string;
  /** En la API corresponde a mostrarNombreLogo. */
  mostrarNombreSidebar: boolean;
}

export type SystemConfigSaveInput = Pick<
  SystemConfig,
  'nombreSistema' | 'subtitulo' | 'descripcion' | 'colorMarca' | 'mostrarNombreSidebar'
> & {
  logo?: File | null;
};

export const SYSTEM_CONFIG_EVENT = 'consultorio:system-config-changed';

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  nombreSistema: 'MediSys',
  nombreCorto: 'MediSys',
  subtitulo: 'Consultorio médico',
  descripcion: 'Sistema Integral de Gestión Médica',
  logoDataUrl: '',
  colorMarca: '#36c6c7',
  tituloNavegador: 'MediSys · Consultorio médico',
  version: '1.0.0',
  mostrarNombreSidebar: true,
};

const BASE_PATH = '/identidad';

let cachedConfig: SystemConfig = DEFAULT_SYSTEM_CONFIG;
let identityExists: boolean | null = null;
let loadedOnce = false;
let pendingLoad: Promise<SystemConfig> | null = null;

const firstDefined = (...values: any[]) =>
  values.find((value) => value !== undefined && value !== null && value !== '');

const unwrapEntity = (responseData: any): any =>
  responseData?.data?.data ??
  responseData?.data?.identidad ??
  responseData?.data?.identity ??
  responseData?.data?.result ??
  responseData?.data ??
  responseData?.identidad ??
  responseData?.identity ??
  responseData?.result ??
  responseData;

const normalizeBoolean = (value: unknown, fallback = true) => {
  if (typeof value === 'boolean') return value;
  const normalized = String(value ?? '').trim().toLowerCase();
  if (['1', 'true', 'si', 'sí', 'yes'].includes(normalized)) return true;
  if (['0', 'false', 'no'].includes(normalized)) return false;
  return fallback;
};

const normalizeHex = (value: unknown, fallback = DEFAULT_SYSTEM_CONFIG.colorMarca) => {
  const text = String(value ?? '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(text)) return text.toUpperCase();
  if (/^[0-9a-fA-F]{6}$/.test(text)) return `#${text.toUpperCase()}`;
  return fallback;
};

const normalizeLogo = (raw: any) => {
  const logo = firstDefined(
    raw?.logoUrl,
    raw?.logoURL,
    raw?.urlLogo,
    raw?.logo_url,
    raw?.logo,
    raw?.rutaLogo,
    raw?.ruta_logo,
    raw?.logoPath,
    raw?.logo_path,
  );

  if (typeof logo === 'string') return logo.trim();

  if (logo && typeof logo === 'object') {
    return String(
      firstDefined(logo.url, logo.href, logo.path, logo.ruta, logo.publicUrl, logo.public_url, '') ?? '',
    ).trim();
  }

  return '';
};

const sanitize = (value: Partial<SystemConfig>): SystemConfig => {
  const nombreSistema =
    String(value.nombreSistema ?? DEFAULT_SYSTEM_CONFIG.nombreSistema).trim() ||
    DEFAULT_SYSTEM_CONFIG.nombreSistema;
  const subtitulo =
    String(value.subtitulo ?? DEFAULT_SYSTEM_CONFIG.subtitulo).trim() ||
    DEFAULT_SYSTEM_CONFIG.subtitulo;
  const descripcion =
    String(value.descripcion ?? DEFAULT_SYSTEM_CONFIG.descripcion).trim() ||
    DEFAULT_SYSTEM_CONFIG.descripcion;
  const colorMarca = normalizeHex(value.colorMarca, DEFAULT_SYSTEM_CONFIG.colorMarca);

  return {
    ...DEFAULT_SYSTEM_CONFIG,
    ...value,
    nombreSistema,
    nombreCorto: nombreSistema,
    subtitulo,
    descripcion,
    logoDataUrl: String(value.logoDataUrl ?? '').trim(),
    colorMarca,
    tituloNavegador: `${nombreSistema} · ${subtitulo}`,
    version: DEFAULT_SYSTEM_CONFIG.version,
    mostrarNombreSidebar: Boolean(value.mostrarNombreSidebar ?? true),
  };
};

const normalizeApiConfig = (rawResponse: any): SystemConfig => {
  const raw = unwrapEntity(rawResponse) ?? {};

  return sanitize({
    nombreSistema: firstDefined(raw?.nombreSistema, raw?.nombre_sistema, raw?.nombre),
    subtitulo: firstDefined(raw?.subtitulo, raw?.subtitle),
    descripcion: firstDefined(
      raw?.descripcionSistema,
      raw?.descripcion_sistema,
      raw?.descripcion,
      raw?.description,
    ),
    colorMarca: firstDefined(
      raw?.colorIdentidad,
      raw?.color_identidad,
      raw?.colorMarca,
      raw?.color,
    ),
    mostrarNombreSidebar: normalizeBoolean(
      firstDefined(
        raw?.mostrarNombreLogo,
        raw?.mostrar_nombre_logo,
        raw?.mostrarNombreSidebar,
      ),
      true,
    ),
    logoDataUrl: normalizeLogo(raw),
  });
};

const hexToRgb = (hex: string) => {
  const normalized = normalizeHex(hex).replace('#', '');
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
};

const mixWithBlack = (hex: string, amount = 0.13) => {
  const { r, g, b } = hexToRgb(hex);
  const mix = (channel: number) => Math.max(0, Math.round(channel * (1 - amount)));
  return `#${[mix(r), mix(g), mix(b)]
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase();
};

const mixHex = (hex: string, targetHex: string, amount: number) => {
  const source = hexToRgb(hex);
  const target = hexToRgb(targetHex);
  const mix = (from: number, to: number) => Math.round(from + (to - from) * amount);

  return `#${[
    mix(source.r, target.r),
    mix(source.g, target.g),
    mix(source.b, target.b),
  ]
    .map((channel) => Math.max(0, Math.min(255, channel)).toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase();
};

const getContrastColor = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  const srgb = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  return luminance > 0.48 ? '#0B1F33' : '#FFFFFF';
};


// -----------------------------------------------------------------------------
// Motor de tema global
// -----------------------------------------------------------------------------
// Varias pantallas antiguas todavía tienen turquesas/azules escritos directamente
// en sus CSS o en SVG (por ejemplo Recharts). En lugar de obligar a reescribir cada
// módulo, este motor detecta únicamente colores de acento de la interfaz y los
// convierte a la paleta elegida. Los colores semánticos (error, éxito, advertencia)
// se conservan.

type RGBColor = { r: number; g: number; b: number; a: number };

type ThemeSnapshot = {
  css: Map<string, string>;
  attrs: Map<string, string>;
};

const originalThemeSnapshots = new WeakMap<Element, ThemeSnapshot>();
let runtimeThemeColor = DEFAULT_SYSTEM_CONFIG.colorMarca;
let themeObserver: MutationObserver | null = null;
let themeScanFrame: number | null = null;

const THEME_SCAN_SKIP = [
  '.system-settings-theme-presets',
  '.system-settings-custom-theme',
  '.ant-color-picker-dropdown',
  '.ant-color-picker-panel',
  '[data-preserve-color="true"]',
].join(',');

const CSS_THEME_PROPERTIES = [
  'color',
  'background-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'caret-color',
  'text-decoration-color',
  'fill',
  'stroke',
  'box-shadow',
  'background-image',
] as const;

// Colores históricos usados como identidad en el proyecto. Esta lista permite
// convertir también tonos oscuros del sidebar y azules usados como acento visual.
const LEGACY_BRAND_COLORS = new Set([
  '#36C6C7', '#50EBEC', '#43D7D8', '#31C4C8', '#40CCD0', '#4EDBDF', '#2AC6C7',
  '#2DBEC0', '#3FD0D3', '#37CFD2', '#159FA3', '#079B9D', '#087E80', '#0F4C4D',
  '#145F60', '#1A6B6C', '#0F5557', '#14B8A6', '#0D9488', '#0F766E', '#06B6D4',
  '#22D3EE', '#67E8F9', '#A5F3FC', '#CCFBF1', '#C8EEEE', '#CDEEEE', '#D5ECEE',
  '#DBECEF', '#BCEEEE', '#9DE8E8', '#EAFAFA', '#EAFCFC', '#EFFCF8', '#F1FCFC',
  '#F7FFFF', '#E6FFFE', '#E0F7F7', '#D9F5F5', '#BFFFFF',
  '#2563EB', '#2F66E8', '#2F67ED', '#2D6BEA', '#3B82F6', '#1D4ED8', '#60A5FA',
  '#93C5FD', '#DBEAFE', '#EFF6FF', '#1E40AF',
]);

const clampChannel = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

const rgbToHex = (color: Pick<RGBColor, 'r' | 'g' | 'b'>) =>
  `#${[color.r, color.g, color.b]
    .map((channel) => clampChannel(channel).toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase();

const parseCssColor = (value: string): RGBColor | null => {
  const input = String(value || '').trim();
  if (!input || input === 'transparent' || input === 'none') return null;

  const hexMatch = input.match(/^#([0-9a-fA-F]{3,8})$/);
  if (hexMatch) {
    let raw = hexMatch[1];
    if (raw.length === 3 || raw.length === 4) raw = raw.split('').map((c) => c + c).join('');
    if (raw.length !== 6 && raw.length !== 8) return null;
    return {
      r: parseInt(raw.slice(0, 2), 16),
      g: parseInt(raw.slice(2, 4), 16),
      b: parseInt(raw.slice(4, 6), 16),
      a: raw.length === 8 ? parseInt(raw.slice(6, 8), 16) / 255 : 1,
    };
  }

  const rgbMatch = input.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/i);
  if (!rgbMatch) return null;

  return {
    r: Number(rgbMatch[1]),
    g: Number(rgbMatch[2]),
    b: Number(rgbMatch[3]),
    a: rgbMatch[4] === undefined ? 1 : Number(rgbMatch[4]),
  };
};

const rgbToHsl = ({ r, g, b }: RGBColor) => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta) {
    if (max === rn) h = 60 * (((gn - bn) / delta) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / delta + 2);
    else h = 60 * ((rn - gn) / delta + 4);
  }
  if (h < 0) h += 360;

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return { h, s, l };
};

const isLegacyBrandColor = (value: string) => {
  const color = parseCssColor(value);
  if (!color) return false;

  const exact = LEGACY_BRAND_COLORS.has(rgbToHex(color));
  if (exact) return true;

  const { h, s, l } = rgbToHsl(color);
  // El sistema histórico usa cian/turquesa/azul como color de marca.
  // Excluimos tonos muy oscuros y poco saturados para no teñir textos neutros.
  return h >= 155 && h <= 232 && s >= 0.34 && l >= 0.27;
};

const makeThemePalette = (brand: string) => {
  const base = normalizeHex(brand);
  return {
    base,
    hover: mixHex(base, '#000000', 0.12),
    active: mixHex(base, '#000000', 0.20),
    dark: mixHex(base, '#000000', 0.48),
    darker: mixHex(base, '#000000', 0.62),
    mediumDark: mixHex(base, '#000000', 0.28),
    light: mixHex(base, '#FFFFFF', 0.46),
    lighter: mixHex(base, '#FFFFFF', 0.78),
    veryLight: mixHex(base, '#FFFFFF', 0.90),
    palest: mixHex(base, '#FFFFFF', 0.95),
  };
};

const mapLegacyColor = (value: string, targetBrand = runtimeThemeColor): string | null => {
  const source = parseCssColor(value);
  if (!source || !isLegacyBrandColor(value)) return null;

  const palette = makeThemePalette(targetBrand);
  const { l } = rgbToHsl(source);

  let mapped = palette.base;
  if (l >= 0.94) mapped = palette.palest;
  else if (l >= 0.86) mapped = palette.veryLight;
  else if (l >= 0.73) mapped = palette.lighter;
  else if (l >= 0.61) mapped = palette.light;
  else if (l >= 0.46) mapped = palette.base;
  else if (l >= 0.34) mapped = palette.mediumDark;
  else if (l >= 0.24) mapped = palette.dark;
  else mapped = palette.darker;

  if (source.a < 0.999) {
    const { r, g, b } = hexToRgb(mapped);
    return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, source.a))})`;
  }

  return mapped;
};

const COLOR_TOKEN_PATTERN = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g;

const replaceBrandColorsInComplexValue = (value: string) => {
  let changed = false;
  const mapped = String(value || '').replace(COLOR_TOKEN_PATTERN, (token) => {
    const replacement = mapLegacyColor(token);
    if (!replacement) return token;
    changed = true;
    return replacement;
  });
  return changed ? mapped : null;
};

const getSnapshot = (element: Element): ThemeSnapshot => {
  let snapshot = originalThemeSnapshots.get(element);
  if (!snapshot) {
    snapshot = { css: new Map(), attrs: new Map() };
    originalThemeSnapshots.set(element, snapshot);
  }
  return snapshot;
};

const setStyleImportant = (element: Element, property: string, value: string) => {
  const style = (element as HTMLElement | SVGElement).style;
  if (!style) return;
  if (style.getPropertyValue(property).trim() === value.trim() && style.getPropertyPriority(property) === 'important') {
    return;
  }
  style.setProperty(property, value, 'important');
};

const applyThemeToElement = (element: Element) => {
  if (!(element instanceof HTMLElement) && !(element instanceof SVGElement)) return;
  if (element.closest(THEME_SCAN_SKIP)) return;

  const computed = window.getComputedStyle(element);
  const snapshot = getSnapshot(element);

  CSS_THEME_PROPERTIES.forEach((property) => {
    const original = snapshot.css.get(property) ?? computed.getPropertyValue(property);
    const replacement = property === 'box-shadow' || property === 'background-image'
      ? replaceBrandColorsInComplexValue(original)
      : mapLegacyColor(original);

    if (!replacement) return;
    if (!snapshot.css.has(property)) snapshot.css.set(property, original);
    setStyleImportant(element, property, replacement);
  });

  // SVG / Recharts suelen escribir fill y stroke como atributos, no como CSS.
  ['fill', 'stroke', 'stop-color'].forEach((attribute) => {
    const original = snapshot.attrs.get(attribute) ?? element.getAttribute(attribute) ?? '';
    if (!original) return;

    const replacement = mapLegacyColor(original) ?? replaceBrandColorsInComplexValue(original);
    if (!replacement) return;

    if (!snapshot.attrs.has(attribute)) snapshot.attrs.set(attribute, original);
    if (element.getAttribute(attribute) !== replacement) element.setAttribute(attribute, replacement);
  });
};

const runGlobalThemeScan = () => {
  if (typeof document === 'undefined' || !document.body) return;
  document.body.querySelectorAll('*').forEach(applyThemeToElement);
};

const scheduleGlobalThemeScan = () => {
  if (typeof window === 'undefined') return;
  if (themeScanFrame !== null) return;
  themeScanFrame = window.requestAnimationFrame(() => {
    themeScanFrame = null;
    runGlobalThemeScan();
  });
};

const installGlobalThemeObserver = () => {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined' || themeObserver) return;

  themeObserver = new MutationObserver(() => scheduleGlobalThemeScan());

  const start = () => {
    if (!document.body || !themeObserver) return;
    themeObserver.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'fill', 'stroke', 'stop-color'],
    });
    scheduleGlobalThemeScan();
  };

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
};

const ensureRuntimeThemeStyle = () => {
  if (typeof document === 'undefined') return;

  let style = document.getElementById('system-runtime-theme') as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = 'system-runtime-theme';
    document.head.appendChild(style);
  }

  style.textContent = `
    :root { color-scheme: light; }
    html, body { accent-color: var(--system-brand-color); }

    /* Ant Design: controles principales */
    .ant-btn-primary:not(.ant-btn-dangerous),
    .ant-btn-primary:not(.ant-btn-dangerous):hover,
    .ant-btn-primary:not(.ant-btn-dangerous):focus {
      background: var(--system-brand-color) !important;
      border-color: var(--system-brand-color) !important;
      color: var(--system-brand-contrast) !important;
      box-shadow: 0 8px 20px var(--system-brand-color-shadow) !important;
    }
    .ant-btn-link, .ant-typography a, a.system-brand-link {
      color: var(--system-brand-color) !important;
    }
    .ant-switch.ant-switch-checked { background: var(--system-brand-color) !important; }
    .ant-checkbox-checked .ant-checkbox-inner,
    .ant-checkbox-indeterminate .ant-checkbox-inner:after {
      background: var(--system-brand-color) !important;
      border-color: var(--system-brand-color) !important;
    }
    .ant-checkbox-wrapper:hover .ant-checkbox-inner,
    .ant-checkbox:hover .ant-checkbox-inner,
    .ant-radio-wrapper:hover .ant-radio-inner,
    .ant-radio:hover .ant-radio-inner {
      border-color: var(--system-brand-color) !important;
    }
    .ant-radio-wrapper .ant-radio-checked .ant-radio-inner {
      border-color: var(--system-brand-color) !important;
      background: #fff !important;
    }
    .ant-radio-wrapper .ant-radio-checked .ant-radio-inner::after {
      background: var(--system-brand-color) !important;
    }
    .ant-tabs .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn,
    .ant-tabs .ant-tabs-tab:hover { color: var(--system-brand-color) !important; }
    .ant-tabs .ant-tabs-ink-bar { background: var(--system-brand-color) !important; }
    .ant-pagination .ant-pagination-item-active {
      border-color: var(--system-brand-color) !important;
      background: var(--system-brand-lighter) !important;
    }
    .ant-pagination .ant-pagination-item-active a { color: var(--system-brand-color) !important; }
    .ant-select-dropdown .ant-select-item-option-selected:not(.ant-select-item-option-disabled) {
      background: var(--system-brand-lighter) !important;
      color: var(--system-brand-dark) !important;
    }
    .ant-picker-dropdown .ant-picker-cell-in-view.ant-picker-cell-selected .ant-picker-cell-inner,
    .ant-picker-dropdown .ant-picker-cell-in-view.ant-picker-cell-range-start .ant-picker-cell-inner,
    .ant-picker-dropdown .ant-picker-cell-in-view.ant-picker-cell-range-end .ant-picker-cell-inner {
      background: var(--system-brand-color) !important;
      color: var(--system-brand-contrast) !important;
    }
    .ant-picker-dropdown .ant-picker-cell-today .ant-picker-cell-inner::before {
      border-color: var(--system-brand-color) !important;
    }
    .ant-progress .ant-progress-bg,
    .ant-slider .ant-slider-track { background: var(--system-brand-color) !important; }
    .ant-slider .ant-slider-handle::after { box-shadow: 0 0 0 2px var(--system-brand-color) !important; }
    .ant-steps .ant-steps-item-process .ant-steps-item-icon {
      background: var(--system-brand-color) !important;
      border-color: var(--system-brand-color) !important;
    }
    .ant-steps .ant-steps-item-finish .ant-steps-item-icon {
      border-color: var(--system-brand-color) !important;
    }
    .ant-steps .ant-steps-item-finish .ant-steps-icon,
    .ant-steps .ant-steps-item-finish .ant-steps-item-title::after {
      color: var(--system-brand-color) !important;
      border-color: var(--system-brand-color) !important;
    }
    .ant-input:hover,
    .ant-input:focus,
    .ant-input-affix-wrapper:hover,
    .ant-input-affix-wrapper-focused,
    .ant-select-focused .ant-select-selector,
    .ant-picker:hover,
    .ant-picker-focused,
    .ant-input-number:hover,
    .ant-input-number-focused {
      border-color: var(--system-brand-color) !important;
      box-shadow: 0 0 0 2px var(--system-brand-color-soft) !important;
    }
    .ant-table-wrapper .ant-table-thead > tr > th {
      background: var(--system-brand-lighter) !important;
      color: var(--system-brand-dark) !important;
      border-bottom-color: var(--system-brand-border) !important;
    }

    /* Sidebar y navegación: el tema completo deriva del color elegido */
    .custom-sider {
      background:
        radial-gradient(circle at top left, var(--system-brand-color-soft-2), transparent 34%),
        linear-gradient(180deg, var(--system-sidebar-start) 0%, var(--system-sidebar-mid) 50%, var(--system-sidebar-end) 100%) !important;
    }
    .logo-container { border-bottom-color: var(--system-brand-border) !important; }
    .logo-icon,
    .custom-menu-sectioned .ant-menu-submenu-selected > .ant-menu-submenu-title,
    .custom-menu-sectioned .ant-menu-submenu-selected > .ant-menu-submenu-title .anticon,
    .custom-menu-sectioned .ant-menu-submenu-open > .ant-menu-submenu-title .ant-menu-submenu-arrow,
    .custom-menu-sectioned .ant-menu-submenu-selected > .ant-menu-submenu-title .ant-menu-submenu-arrow {
      color: var(--system-brand-light) !important;
    }
    .logo-text {
      background: linear-gradient(135deg, var(--system-brand-light), #ffffff 52%, var(--system-brand-color)) !important;
      -webkit-background-clip: text !important;
      background-clip: text !important;
    }
    .custom-menu .ant-menu-item:hover,
    .custom-menu-sectioned .ant-menu-item:hover,
    .custom-menu-sectioned .ant-menu-submenu-title:hover,
    .custom-menu-sectioned .ant-menu-submenu-open > .ant-menu-submenu-title {
      background: var(--system-brand-color-soft-2) !important;
    }
    .custom-menu .ant-menu-item-selected {
      background: var(--system-brand-color) !important;
      color: var(--system-brand-contrast) !important;
      box-shadow: 0 10px 24px var(--system-brand-color-shadow) !important;
    }
    .custom-menu .ant-menu-item-selected .anticon { color: var(--system-brand-contrast) !important; }
    .custom-menu-sectioned .ant-menu-submenu-selected > .ant-menu-submenu-title {
      background: linear-gradient(135deg, var(--system-brand-color-soft-2), var(--system-brand-color-soft)) !important;
      border-color: var(--system-brand-border) !important;
    }
    .custom-menu-sectioned .ant-menu-sub .ant-menu-item-selected {
      background: var(--system-brand-color-soft-2) !important;
      box-shadow: inset 3px 0 0 var(--system-brand-color) !important;
    }
    .custom-menu-sectioned::-webkit-scrollbar-thumb { background: var(--system-brand-border) !important; }

    /* Menú móvil */
    .mobile-drawer-root .ant-drawer-content,
    .mobile-drawer-custom .ant-drawer-content,
    .mobile-drawer-root .ant-drawer-body,
    .mobile-drawer-custom .ant-drawer-body,
    .mobile-menu-panel {
      background:
        radial-gradient(circle at top left, var(--system-brand-color-soft-2), transparent 34%),
        linear-gradient(180deg, var(--system-sidebar-start) 0%, var(--system-sidebar-mid) 50%, var(--system-sidebar-end) 100%) !important;
    }
    .mobile-drawer-logo,
    .mobile-drawer-title,
    .mobile-drawer-menu .ant-menu-submenu-selected > .ant-menu-submenu-title,
    .mobile-drawer-menu .ant-menu-submenu-selected > .ant-menu-submenu-title .anticon {
      color: var(--system-brand-light) !important;
    }
    .mobile-drawer-menu .ant-menu-item-selected {
      background: var(--system-brand-color) !important;
      color: var(--system-brand-contrast) !important;
    }
    .mobile-drawer-menu .ant-menu-sub .ant-menu-item-selected {
      background: var(--system-brand-color-soft-2) !important;
      box-shadow: inset 3px 0 0 var(--system-brand-color) !important;
    }

    /* Login */
    .brand-title, .form-title, .login-input .anticon, .forgot-link,
    .remember-checkbox:hover { color: var(--system-brand-color) !important; }
    .circle-top, .circle-bottom { background: var(--system-brand-color-soft) !important; }
    .dots { background-image: radial-gradient(var(--system-brand-color) 2px, transparent 2px) !important; }
    .login-left {
      background: linear-gradient(180deg, #ffffff 0%, var(--system-brand-lighter) 100%) !important;
    }
    .login-button, .login-button:hover, .login-button:focus {
      background: var(--system-brand-color) !important;
      color: var(--system-brand-contrast) !important;
      box-shadow: 0 12px 24px var(--system-brand-color-shadow) !important;
    }

    /* Componentes clínicos ya existentes */
    .proc-global-icon,
    .consulta-avatar,
    .consulta-header-icon,
    .historial-icon,
    .historial-avatar,
    .historial-modal-icon,
    .historial-wizard-icon,
    .recetas-center-hero-icon,
    .receta-center-doc-icon,
    .receta-center-avatar {
      background: var(--system-brand-color-soft) !important;
      color: var(--system-brand-color) !important;
      border-color: var(--system-brand-border) !important;
    }
    .consulta-progress div.active,
    .historial-detail-tab.active,
    .historial-wizard-step.active span,
    .historial-wizard-step.done span,
    .historial-switch-card.active {
      border-color: var(--system-brand-color) !important;
      color: var(--system-brand-dark) !important;
      background: var(--system-brand-lighter) !important;
    }
    .consulta-progress div::before,
    .historial-wizard-line.active,
    .historial-patient-detail-card::before,
    .historial-diagnostico-card::before,
    .historial-switch-card.active::before,
    .consulta-preview-section-title::before {
      background: var(--system-brand-color) !important;
    }
    .consulta-add-btn,
    .consulta-save-btn,
    .proc-global-counter .ant-btn-primary,
    .historial-finalizar-btn,
    .historial-action-card .ant-btn-primary,
    .historial-empty-card .ant-btn,
    .historial-wizard-footer .ant-btn-primary,
    .historial-no-paciente-actions .ant-btn,
    .receta-center-actions .ant-btn-primary {
      background: var(--system-brand-color) !important;
      border-color: var(--system-brand-color) !important;
      color: var(--system-brand-contrast) !important;
      box-shadow: 0 8px 18px var(--system-brand-color-shadow) !important;
    }
    .consulta-diagnostico-table .ant-table-thead > tr > th,
    .consulta-preview-table .ant-table-thead > tr > th {
      background: var(--system-brand-color) !important;
      color: var(--system-brand-contrast) !important;
    }
    .historial-hero-card,
    .system-settings-hero {
      background: linear-gradient(110deg, #ffffff 0%, var(--system-brand-lighter) 100%) !important;
      border-color: var(--system-brand-border) !important;
    }
    .system-settings-eyebrow,
    .system-settings-section-icon,
    .system-settings-preview-note > .anticon {
      color: var(--system-brand-color) !important;
    }

    /* Header y perfil */
    .dashboard-header .ant-avatar,
    .header-right .ant-avatar,
    .user-dropdown-trigger .ant-avatar {
      background: var(--system-brand-color) !important;
      color: var(--system-brand-contrast) !important;
      box-shadow: 0 5px 16px var(--system-brand-color-shadow) !important;
    }
    .user-name { color: var(--system-brand-dark) !important; }
    .desktop-collapse-btn:hover,
    .mobile-menu-btn:hover,
    .notification-btn:hover,
    .user-dropdown-trigger:hover .user-dropdown-arrow {
      color: var(--system-brand-color) !important;
    }
    .desktop-collapse-btn:hover,
    .mobile-menu-btn:hover,
    .notification-btn:hover,
    .user-dropdown-trigger:hover,
    .ant-dropdown-menu-item:not(.ant-dropdown-menu-item-danger):hover {
      background: var(--system-brand-color-soft) !important;
    }

    /* Bienvenida: todos los acentos siguen el tema */
    .welcome-real-decoration { background: var(--system-brand-color-soft) !important; }
    .welcome-real-main-icon {
      background: linear-gradient(145deg, var(--system-brand-light), var(--system-brand-color)) !important;
      box-shadow: 0 12px 28px var(--system-brand-color-shadow) !important;
    }
    .welcome-real-greeting h1 { color: var(--system-brand-color) !important; }
    .welcome-real-role {
      background: var(--system-brand-lighter) !important;
      color: var(--system-brand-dark) !important;
    }
    .welcome-real-metric-icon {
      background: var(--system-brand-lighter) !important;
      color: var(--system-brand-color) !important;
    }
    .welcome-real-message {
      background: var(--system-brand-lighter) !important;
      border-color: var(--system-brand-border) !important;
    }
    .welcome-real-message strong svg { color: var(--system-brand-color) !important; }
    .welcome-real-start {
      background: linear-gradient(90deg, var(--system-brand-light), var(--system-brand-color)) !important;
      color: var(--system-brand-contrast) !important;
      box-shadow: 0 12px 24px var(--system-brand-color-shadow) !important;
    }

    /* Tarjetas, formatos y superficies visuales de módulos */
    [class*="dashboard"] [class*="icon"],
    [class*="formato"] [class*="icon"],
    [class*="document"] [class*="icon"],
    [class*="certificado"] [class*="icon"],
    [class*="estudios"] [class*="icon"],
    [class*="farmaco"] [class*="icon"],
    [class*="nota"] [class*="icon"],
    [class*="referencia"] [class*="icon"],
    [class*="perfil"] [class*="icon"],
    [class*="usuario"] [class*="icon"] {
      border-color: var(--system-brand-border);
    }

    /* Recharts: rellenos que no sean colores semánticos se corrigen además por el motor DOM. */
    .recharts-default-tooltip {
      border-color: var(--system-brand-border) !important;
      box-shadow: 0 10px 24px rgba(15,23,42,.08) !important;
    }
  `;
};

export const applySystemConfig = (config: SystemConfig) => {
  if (typeof document === 'undefined') return;

  const color = normalizeHex(config.colorMarca);
  const { r, g, b } = hexToRgb(color);
  const contrast = getContrastColor(color);

  document.documentElement.style.setProperty('--system-brand-color', color);
  document.documentElement.style.setProperty('--system-brand-color-hover', mixWithBlack(color, 0.12));
  document.documentElement.style.setProperty('--system-brand-color-active', mixWithBlack(color, 0.20));
  document.documentElement.style.setProperty('--system-brand-color-soft', `rgba(${r}, ${g}, ${b}, .12)`);
  document.documentElement.style.setProperty('--system-brand-color-soft-2', `rgba(${r}, ${g}, ${b}, .22)`);
  document.documentElement.style.setProperty('--system-brand-color-shadow', `rgba(${r}, ${g}, ${b}, .26)`);
  document.documentElement.style.setProperty('--system-brand-border', `rgba(${r}, ${g}, ${b}, .34)`);
  document.documentElement.style.setProperty('--system-brand-contrast', contrast);
  document.documentElement.style.setProperty('--system-brand-light', mixHex(color, '#FFFFFF', 0.52));
  document.documentElement.style.setProperty('--system-brand-lighter', mixHex(color, '#FFFFFF', 0.88));
  document.documentElement.style.setProperty('--system-brand-dark', mixHex(color, '#000000', 0.54));
  document.documentElement.style.setProperty('--system-sidebar-start', mixHex(color, '#000000', 0.67));
  document.documentElement.style.setProperty('--system-sidebar-mid', mixHex(color, '#000000', 0.59));
  document.documentElement.style.setProperty('--system-sidebar-end', mixHex(color, '#000000', 0.52));

  runtimeThemeColor = color;
  ensureRuntimeThemeStyle();
  installGlobalThemeObserver();
  scheduleGlobalThemeScan();
  document.title = config.tituloNavegador || `${config.nombreSistema} · ${config.subtitulo}`;

  let favicon = document.querySelector<HTMLLinkElement>('link[data-system-favicon="true"]');

  if (config.logoDataUrl) {
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      favicon.dataset.systemFavicon = 'true';
      document.head.appendChild(favicon);
    }
    favicon.href = config.logoDataUrl;
  } else if (favicon) {
    favicon.remove();
  }
};

const publishConfig = (config: SystemConfig) => {
  cachedConfig = sanitize(config);
  applySystemConfig(cachedConfig);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<SystemConfig>(SYSTEM_CONFIG_EVENT, { detail: cachedConfig }),
    );
  }

  return cachedConfig;
};

/** Retorna inmediatamente el último valor cargado. No hace peticiones. */
export const getSystemConfig = (): SystemConfig => cachedConfig;

/** GET /api/v1/identidad */
export const loadSystemConfig = async (force = false): Promise<SystemConfig> => {
  if (!force && loadedOnce) return cachedConfig;
  if (!force && pendingLoad) return pendingLoad;

  pendingLoad = (async () => {
    try {
      const response = await axiosInstance.get(BASE_PATH);
      identityExists = true;
      loadedOnce = true;
      return publishConfig(normalizeApiConfig(response.data));
    } catch (error: any) {
      if (error?.response?.status === 404) {
        identityExists = false;
        loadedOnce = true;
        return publishConfig(DEFAULT_SYSTEM_CONFIG);
      }

      // Conservamos la última identidad visible si la red falla.
      throw error;
    } finally {
      pendingLoad = null;
    }
  })();

  return pendingLoad;
};

const appendFormField = (formData: FormData, key: string, value: unknown) => {
  if (value === undefined || value === null) return;
  formData.append(key, String(value));
};

const buildFormData = (input: SystemConfigSaveInput) => {
  const formData = new FormData();

  appendFormField(formData, 'nombreSistema', input.nombreSistema.trim());
  appendFormField(formData, 'subtitulo', input.subtitulo.trim());
  appendFormField(formData, 'descripcionSistema', input.descripcion.trim());
  appendFormField(formData, 'colorIdentidad', normalizeHex(input.colorMarca));
  appendFormField(formData, 'mostrarNombreLogo', Boolean(input.mostrarNombreSidebar));

  if (input.logo instanceof File) {
    formData.append('logo', input.logo, input.logo.name);
  }

  return formData;
};

/** POST/PATCH /api/v1/identidad según exista o no una identidad actual. */
export const saveSystemConfig = async (input: SystemConfigSaveInput): Promise<SystemConfig> => {
  if (identityExists === null) {
    try {
      await loadSystemConfig(true);
    } catch {
      // Si no pudimos comprobarlo, PATCH es el camino menos destructivo.
      identityExists = true;
    }
  }

  const body = buildFormData(input);

  try {
    if (identityExists === false) {
      await axiosInstance.post(BASE_PATH, body, { headers: { 'Content-Type': 'multipart/form-data' } });
      identityExists = true;
    } else {
      await axiosInstance.patch(BASE_PATH, body, { headers: { 'Content-Type': 'multipart/form-data' } });
      identityExists = true;
    }
  } catch (error: any) {
    // Tolerancia por si el estado local de existencia estaba desactualizado.
    if (identityExists === true && error?.response?.status === 404) {
      await axiosInstance.post(BASE_PATH, buildFormData(input), { headers: { 'Content-Type': 'multipart/form-data' } });
      identityExists = true;
    } else if (identityExists === false && error?.response?.status === 409) {
      await axiosInstance.patch(BASE_PATH, buildFormData(input), { headers: { 'Content-Type': 'multipart/form-data' } });
      identityExists = true;
    } else {
      throw error;
    }
  }

  loadedOnce = false;
  return loadSystemConfig(true);
};

/** POST /api/v1/identidad/restaurar-predeterminada */
export const resetSystemConfig = async (): Promise<SystemConfig> => {
  await axiosInstance.post(`${BASE_PATH}/restaurar-predeterminada`);
  identityExists = true;
  loadedOnce = false;
  return loadSystemConfig(true);
};

const systemConfigService = {
  get: getSystemConfig,
  load: loadSystemConfig,
  save: saveSystemConfig,
  reset: resetSystemConfig,
  apply: applySystemConfig,
};

export default systemConfigService;
