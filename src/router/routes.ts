export const ROUTES = {
  LOGIN: '/login',
  PLATFORM: '/plataforma',

  DASHBOARD_ADMIN: '/dashboard',
  DASHBOARD_MEDICO: '/dashboard-medico',
  DASHBOARD_AUDITOR: '/dashboard-auditor',
  AUDIT: '/auditoria',

  CLINICS: '/clinicas',
  CLINIC_NEW: '/clinicas/nueva',
  CLINIC_DETAIL: '/clinicas/:id',

  PATIENTS: '/pacientes',

  CONFIRMAR_ATENCION: '/confirmar-atencion',
  BUSQUEDA_PACIENTE: '/busqueda-paciente/:tipo',

  CONSULTA: '/consulta/:pacienteId',
  PROCEDIMIENTO: '/procedimiento/:pacienteId',

  PROCEDIMIENTOS: '/procedimientos',
  HISTORIAL_CLINICO: '/historial-clinico',
  HISTORIALES_DISPONIBLES: '/historiales-disponibles',
  NOTA_EVOLUCION: '/nota-evolucion',
  HISTORICO_PACIENTE: '/historico-paciente',

  HOJA_REFERENCIA: '/hoja-referencia',
  HOJA_REFERENCIA_CREAR: '/hoja-referencia/crear',

  ESTUDIOS_CLINICOS: '/estudios-clinicos',
  CERTIFICADO_MEDICO: '/certificado-medico',
  CONTROL_DIARIO_PACIENTES: '/control-diario-pacientes',
  DOCUMENTOS: '/documentos',
  CONSENTIMIENTO_INFORMADO: '/consentimiento-informado',
  FARMACO_VIGILANCIA: '/farmaco-vigilancia',
  AVISO_PRIVACIDAD: '/aviso-privacidad',
  AVISO_MEDICO_COMODATARIO: '/aviso-medico-comodatario',

  APPOINTMENTS: '/citas',
  MEDICAL_RECORDS: '/expedientes',
  PRESCRIPTIONS: '/recetas',
  INVENTORY: '/inventario',
  REPORTS: '/reportes',
  USERS: '/usuarios',
  PERMISSIONS: '/permisos',
  SETTINGS: '/configuracion',
  PROFILE: '/perfil',
  NOTIFICATIONS: '/notificaciones',
  INITIAL_PASSWORD: '/cambiar-password-inicial',
  SYNC: '/sincronizacion',
} as const;

export const ROLES = {
  SUPER_ADMIN: 4,
  ADMIN: 1,
  MEDICO: 2,
  AUDITOR: 3,
} as const;

export const getDashboardByRole = (rolId?: number) => {
  switch (Number(rolId)) {
    case ROLES.SUPER_ADMIN:
      return ROUTES.PLATFORM;
    case ROLES.ADMIN:
      return ROUTES.DASHBOARD_ADMIN;
    case ROLES.MEDICO:
      return ROUTES.DASHBOARD_MEDICO;
    case ROLES.AUDITOR:
      return ROUTES.DASHBOARD_AUDITOR;
    default:
      return ROUTES.LOGIN;
  }
};

export const ROLE_ALLOWED_ROUTES: Record<number, string[]> = {
  [ROLES.SUPER_ADMIN]: [],
  [ROLES.ADMIN]: [
    ROUTES.DASHBOARD_ADMIN,
    ROUTES.CLINICS,
    ROUTES.CLINIC_NEW,
    ROUTES.CLINIC_DETAIL,
    ROUTES.USERS,
    ROUTES.PERMISSIONS,
    ROUTES.PATIENTS,
    ROUTES.CONFIRMAR_ATENCION,
    ROUTES.BUSQUEDA_PACIENTE,
    ROUTES.CONSULTA,
    ROUTES.PROCEDIMIENTO,
    ROUTES.PROCEDIMIENTOS,
    ROUTES.HISTORIAL_CLINICO,
    ROUTES.HISTORIALES_DISPONIBLES,
    ROUTES.NOTA_EVOLUCION,
    ROUTES.HISTORICO_PACIENTE,
    ROUTES.HOJA_REFERENCIA,
    ROUTES.HOJA_REFERENCIA_CREAR,
    ROUTES.ESTUDIOS_CLINICOS,
    ROUTES.CERTIFICADO_MEDICO,
    ROUTES.CONTROL_DIARIO_PACIENTES,
    ROUTES.DOCUMENTOS,
    ROUTES.CONSENTIMIENTO_INFORMADO,
    ROUTES.FARMACO_VIGILANCIA,
    ROUTES.AVISO_PRIVACIDAD,
    ROUTES.AVISO_MEDICO_COMODATARIO,
    ROUTES.APPOINTMENTS,
    ROUTES.MEDICAL_RECORDS,
    ROUTES.PRESCRIPTIONS,
    ROUTES.INVENTORY,
    ROUTES.REPORTS,
    ROUTES.SETTINGS,
    ROUTES.PROFILE,
    ROUTES.NOTIFICATIONS,
    ROUTES.INITIAL_PASSWORD,
    ROUTES.SYNC,
  ],

  [ROLES.MEDICO]: [
    ROUTES.DASHBOARD_MEDICO,
    ROUTES.PATIENTS,
    ROUTES.CONFIRMAR_ATENCION,
    ROUTES.BUSQUEDA_PACIENTE,
    ROUTES.CONSULTA,
    ROUTES.PROCEDIMIENTO,
    ROUTES.PROCEDIMIENTOS,
    ROUTES.HISTORIAL_CLINICO,
    ROUTES.HISTORIALES_DISPONIBLES,
    ROUTES.NOTA_EVOLUCION,
    ROUTES.HISTORICO_PACIENTE,
    ROUTES.HOJA_REFERENCIA,
    ROUTES.HOJA_REFERENCIA_CREAR,
    ROUTES.ESTUDIOS_CLINICOS,
    ROUTES.CERTIFICADO_MEDICO,
    ROUTES.CONTROL_DIARIO_PACIENTES,
    ROUTES.DOCUMENTOS,
    ROUTES.CONSENTIMIENTO_INFORMADO,
    ROUTES.FARMACO_VIGILANCIA,
    ROUTES.AVISO_PRIVACIDAD,
    ROUTES.AVISO_MEDICO_COMODATARIO,
    ROUTES.APPOINTMENTS,
    ROUTES.MEDICAL_RECORDS,
    ROUTES.PRESCRIPTIONS,
    ROUTES.REPORTS,
    ROUTES.PROFILE,
    ROUTES.NOTIFICATIONS,
    ROUTES.INITIAL_PASSWORD,
    ROUTES.SYNC,
  ],

  // Auditor: lectura y trazabilidad. No puede registrar pacientes, atender,
  // modificar inventario, usuarios, consultorios ni configuración.
  [ROLES.AUDITOR]: [
    ROUTES.DASHBOARD_AUDITOR,
    ROUTES.AUDIT,
    ROUTES.PRESCRIPTIONS,
    ROUTES.CONTROL_DIARIO_PACIENTES,
    ROUTES.PROFILE,
    ROUTES.NOTIFICATIONS,
    ROUTES.INITIAL_PASSWORD,
    ROUTES.SYNC,
  ],
};

ROLE_ALLOWED_ROUTES[ROLES.SUPER_ADMIN] = [
  ROUTES.PLATFORM,
  ROUTES.AUDIT,
  ...ROLE_ALLOWED_ROUTES[ROLES.ADMIN],
];

export const canAccessRoute = (rolId: number | undefined, pathname: string) => {
  if ([ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(Number(rolId) as 1 | 4)) {
    const privileged = ROLE_ALLOWED_ROUTES[Number(rolId)] || [];
    return privileged.some((route) => route.includes('/:') ? pathname.startsWith(route.split('/:')[0]) : route === pathname);
  }

  const moduleKey = getRouteModulePermission(pathname);
  if (moduleKey) {
    try {
      const stored = JSON.parse(localStorage.getItem('effective_permissions') || 'null');
      const current = JSON.parse(localStorage.getItem('user') || 'null');
      if (stored?.userId === Number(current?.id) && typeof stored?.values?.[moduleKey] === 'boolean') {
        return stored.values[moduleKey];
      }
    } catch { /* usa el acceso predeterminado del rol */ }
  }
  const allowedRoutes = ROLE_ALLOWED_ROUTES[Number(rolId)] || [];

  return allowedRoutes.some((route) => {
    if (route.includes('/:')) {
      const baseRoute = route.split('/:')[0];
      return pathname.startsWith(baseRoute);
    }

    return route === pathname;
  });
};

const getRouteModulePermission = (pathname: string): string | null => {
  if ([ROUTES.DASHBOARD_MEDICO, ROUTES.DASHBOARD_AUDITOR].includes(pathname as any)) return 'modulo.inicio.acceder';
  if (pathname === ROUTES.INVENTORY) return 'modulo.inventario.acceder';
  if (pathname === ROUTES.PROCEDIMIENTOS || pathname.startsWith('/procedimiento/')) return 'modulo.procedimientos.acceder';
  if ([ROUTES.HISTORIAL_CLINICO, ROUTES.HISTORIALES_DISPONIBLES, ROUTES.NOTA_EVOLUCION, ROUTES.HISTORICO_PACIENTE].includes(pathname as any)) return 'modulo.expediente.acceder';
  if (pathname === ROUTES.CONFIRMAR_ATENCION || pathname.startsWith('/busqueda-paciente/') || pathname.startsWith('/consulta/')) return 'modulo.pacientes.acceder';
  if ([ROUTES.HOJA_REFERENCIA, ROUTES.HOJA_REFERENCIA_CREAR, ROUTES.ESTUDIOS_CLINICOS, ROUTES.CERTIFICADO_MEDICO, ROUTES.CONTROL_DIARIO_PACIENTES, ROUTES.APPOINTMENTS, ROUTES.PRESCRIPTIONS].includes(pathname as any)) return pathname === ROUTES.CONTROL_DIARIO_PACIENTES ? 'modulo.control_diario.acceder' : 'modulo.consulta.acceder';
  if ([ROUTES.DOCUMENTOS, ROUTES.CONSENTIMIENTO_INFORMADO, ROUTES.FARMACO_VIGILANCIA, ROUTES.AVISO_PRIVACIDAD, ROUTES.AVISO_MEDICO_COMODATARIO].includes(pathname as any)) return 'modulo.formatos.acceder';
  if (pathname === ROUTES.REPORTS) return 'modulo.reportes.acceder';
  if (pathname === ROUTES.AUDIT) return 'modulo.auditoria.acceder';
  return null;
};
