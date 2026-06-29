export const ROUTES = {
  LOGIN: '/login',

  DASHBOARD_ADMIN: '/dashboard',
  DASHBOARD_MEDICO: '/dashboard-medico',
  DASHBOARD_CONSULTOR: '/dashboard-consultor',

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

  APPOINTMENTS: '/citas',
  MEDICAL_RECORDS: '/expedientes',
  PRESCRIPTIONS: '/recetas',
  REPORTS: '/reportes',
  USERS: '/usuarios',
  SETTINGS: '/configuracion',
  PROFILE: '/perfil',
} as const;

export const ROLES = {
  ADMIN: 1,
  MEDICO: 2,
  CONSULTOR: 3,
} as const;

export const getDashboardByRole = (rolId?: number) => {
  switch (Number(rolId)) {
    case ROLES.ADMIN:
      return ROUTES.DASHBOARD_ADMIN;
    case ROLES.MEDICO:
      return ROUTES.DASHBOARD_MEDICO;
    case ROLES.CONSULTOR:
      return ROUTES.DASHBOARD_CONSULTOR;
    default:
      return ROUTES.LOGIN;
  }
};

export const ROLE_ALLOWED_ROUTES: Record<number, string[]> = {
  [ROLES.ADMIN]: [
    ROUTES.DASHBOARD_ADMIN,
    ROUTES.CLINICS,
    ROUTES.CLINIC_NEW,
    ROUTES.CLINIC_DETAIL,
    ROUTES.USERS,
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
    ROUTES.APPOINTMENTS,
    ROUTES.MEDICAL_RECORDS,
    ROUTES.PRESCRIPTIONS,
    ROUTES.REPORTS,
    ROUTES.SETTINGS,
    ROUTES.PROFILE,
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
    ROUTES.APPOINTMENTS,
    ROUTES.MEDICAL_RECORDS,
    ROUTES.PRESCRIPTIONS,
    ROUTES.REPORTS,
    ROUTES.SETTINGS,
    ROUTES.PROFILE,
  ],

  [ROLES.CONSULTOR]: [
    ROUTES.DASHBOARD_CONSULTOR,
    ROUTES.PATIENTS,
    ROUTES.CONFIRMAR_ATENCION,
    ROUTES.BUSQUEDA_PACIENTE,
    ROUTES.HISTORIAL_CLINICO,
    ROUTES.HISTORIALES_DISPONIBLES,
    ROUTES.NOTA_EVOLUCION,
    ROUTES.HISTORICO_PACIENTE,
    ROUTES.HOJA_REFERENCIA,
    ROUTES.HOJA_REFERENCIA_CREAR,
    ROUTES.ESTUDIOS_CLINICOS,
    ROUTES.CERTIFICADO_MEDICO,
    ROUTES.APPOINTMENTS,
    ROUTES.PRESCRIPTIONS,
    ROUTES.REPORTS,
    ROUTES.PROFILE,
  ],
};

export const canAccessRoute = (rolId: number | undefined, pathname: string) => {
  const allowedRoutes = ROLE_ALLOWED_ROUTES[Number(rolId)] || [];

  return allowedRoutes.some((route) => {
    if (route.includes('/:')) {
      const baseRoute = route.split('/:')[0];
      return pathname.startsWith(baseRoute);
    }

    return route === pathname;
  });
};