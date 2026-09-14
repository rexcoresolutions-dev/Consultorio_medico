export const ROLE_IDS = {
  ADMIN: 1,
  MEDICO: 2,
  AUDITOR: 3,
} as const;

const normalize = (value: unknown) =>
  String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

export const getUserRoleId = (user: any): number => {
  // Si el backend entrega el nombre del rol, lo usamos primero. Así el
  // frontend no depende de que el ID interno del backend sea exactamente 1/2/3.
  const roleName = normalize(
    user?.rol?.nombre ??
      user?.role?.nombre ??
      user?.rol?.name ??
      user?.role?.name ??
      user?.rol ??
      user?.role,
  );

  if (roleName.includes('ADMIN')) return ROLE_IDS.ADMIN;
  if (roleName.includes('MEDIC')) return ROLE_IDS.MEDICO;
  if (roleName.includes('AUDIT')) return ROLE_IDS.AUDITOR;

  const directCandidates = [
    user?.rol_id,
    user?.rolId,
    user?.role_id,
    user?.roleId,
    user?.rol?.id,
    user?.role?.id,
    user?.data?.rol_id,
    user?.data?.rolId,
    user?.data?.rol?.id,
    user?.usuario?.rol_id,
    user?.usuario?.rolId,
    user?.usuario?.rol?.id,
  ];

  for (const candidate of directCandidates) {
    const numeric = Number(candidate);
    if (Number.isFinite(numeric) && numeric > 0) return numeric;
  }

  return 0;
};

export const getRoleLabel = (user: any): string => {
  switch (getUserRoleId(user)) {
    case ROLE_IDS.ADMIN:
      return 'Administrador';
    case ROLE_IDS.MEDICO:
      return 'Médico';
    case ROLE_IDS.AUDITOR:
      return 'Auditor';
    default:
      return String(
        user?.rol?.nombre ?? user?.role?.nombre ?? user?.rol ?? user?.role ?? 'Usuario',
      );
  }
};

const getSex = (user: any) =>
  normalize(user?.sexo ?? user?.genero ?? user?.gender ?? user?.perfil?.sexo);

export const getRoleGreeting = (user: any) => {
  const roleId = getUserRoleId(user);
  const sex = getSex(user);
  const isFemale = ['F', 'FEMENINO', 'MUJER', 'FEMALE'].includes(sex);

  if (roleId === ROLE_IDS.ADMIN) {
    return {
      salutation: isFemale ? 'Administradora' : 'Administrador',
      prefix: '',
      badge: 'Administrador',
    };
  }

  if (roleId === ROLE_IDS.AUDITOR) {
    return {
      salutation: isFemale ? 'Auditora' : 'Auditor',
      prefix: '',
      badge: 'Auditor',
    };
  }

  const explicit = normalize(user?.tratamiento ?? user?.titulo ?? user?.title);
  if (['DRA', 'DRA.', 'DOCTORA'].includes(explicit) || isFemale) {
    return { salutation: 'Doctora', prefix: 'Dra.', badge: 'Médico' };
  }

  return { salutation: 'Doctor', prefix: 'Dr.', badge: 'Médico' };
};
