export const ROLE_IDS = {
  SUPER_ADMIN: 4,
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

const FEMALE_NAMES = new Set([
  'JANETH', 'JANET', 'MARIA', 'ANA', 'SOFIA', 'SOFÍA', 'LAURA', 'PAOLA',
  'KARLA', 'CARLA', 'DANIELA', 'ANDREA', 'GABRIELA', 'FERNANDA', 'ADRIANA',
  'PATRICIA', 'SANDRA', 'MONICA', 'MÓNICA', 'VERONICA', 'VERÓNICA', 'CLAUDIA',
  'ELIZABETH', 'KAREN', 'JESSICA', 'JAZMIN', 'JAZMÍN', 'YAZMIN', 'YAZMÍN',
  'MARIANA', 'ROCIO', 'ROCÍO', 'CARMEN', 'ALEJANDRA', 'LORENA', 'HANNA',
  'HANNAH', 'LUCIA', 'LUCÍA', 'DIANA', 'ERIKA', 'ERICA', 'VALERIA', 'XIMENA',
  'GUADALUPE', 'LUPITA', 'BEATRIZ', 'SUSANA', 'NATALIA', 'PAULINA', 'MELISSA',
]);

const MALE_NAMES = new Set([
  'JESUS', 'JESÚS', 'JUAN', 'JOSE', 'JOSÉ', 'CARLOS', 'MIGUEL', 'ROBERTO',
  'GABRIEL', 'LUIS', 'JORGE', 'FERNANDO', 'DANIEL', 'DAVID', 'ANTONIO', 'PEDRO',
  'ALEJANDRO', 'RICARDO', 'FRANCISCO', 'MANUEL', 'MARIO', 'SERGIO', 'OSCAR',
  'ÓSCAR', 'EDUARDO', 'RAUL', 'RAÚL', 'ENRIQUE', 'ALBERTO', 'ANDRES', 'ANDRÉS',
]);

export const getUserRoleId = (user: any): number => {
  const roleName = normalize(
    user?.rol?.nombre ??
      user?.role?.nombre ??
      user?.rol?.name ??
      user?.role?.name ??
      user?.data?.rol?.nombre ??
      user?.usuario?.rol?.nombre ??
      user?.rol ??
      user?.role,
  );

  if (roleName.includes('SUPER')) return ROLE_IDS.SUPER_ADMIN;
  if (roleName.includes('ADMIN')) return ROLE_IDS.ADMIN;
  if (roleName.includes('MEDIC') || roleName.includes('DOCTOR')) return ROLE_IDS.MEDICO;
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

const getExplicitSex = (user: any) =>
  normalize(
    user?.sexo ??
      user?.genero ??
      user?.gender ??
      user?.perfil?.sexo ??
      user?.perfil?.genero ??
      user?.persona?.sexo ??
      user?.persona?.genero ??
      user?.medico?.sexo ??
      user?.medico?.genero ??
      user?.usuario?.sexo ??
      user?.usuario?.genero ??
      user?.data?.sexo ??
      user?.data?.genero,
  );

const getExplicitTreatment = (user: any) =>
  normalize(
    user?.tratamiento ??
      user?.titulo ??
      user?.title ??
      user?.prefijo ??
      user?.perfil?.tratamiento ??
      user?.perfil?.titulo ??
      user?.medico?.tratamiento ??
      user?.medico?.titulo,
  );

const getFirstName = (user: any) => {
  const raw =
    user?.nombre ??
    user?.name ??
    user?.primerNombre ??
    user?.firstName ??
    user?.nombres ??
    user?.perfil?.nombre ??
    user?.persona?.nombre ??
    user?.usuario?.nombre ??
    user?.data?.nombre ??
    '';

  return normalize(raw).split(/\s+/).filter(Boolean)[0] ?? '';
};

export const getUserGender = (user: any): 'F' | 'M' | 'UNKNOWN' => {
  const sex = getExplicitSex(user);

  if (['F', 'FEMENINO', 'MUJER', 'FEMALE', '2'].includes(sex)) return 'F';
  if (['M', 'MASCULINO', 'HOMBRE', 'MALE', '1'].includes(sex)) return 'M';

  const treatment = getExplicitTreatment(user);
  if (['DRA', 'DRA.', 'DOCTORA', 'LICDA', 'LICDA.', 'SRA', 'SRA.'].includes(treatment)) {
    return 'F';
  }
  if (['DR', 'DR.', 'DOCTOR', 'LIC', 'LIC.', 'SR', 'SR.'].includes(treatment)) {
    return 'M';
  }

  const firstName = getFirstName(user);
  if (FEMALE_NAMES.has(firstName)) return 'F';
  if (MALE_NAMES.has(firstName)) return 'M';

  return 'UNKNOWN';
};

export const getRoleLabel = (user: any): string => {
  const gender = getUserGender(user);

  switch (getUserRoleId(user)) {
    case ROLE_IDS.SUPER_ADMIN:
      return 'Superadministrador';
    case ROLE_IDS.ADMIN:
      return gender === 'F' ? 'Administradora' : 'Administrador';
    case ROLE_IDS.MEDICO:
      return 'Doctor';
    case ROLE_IDS.AUDITOR:
      return gender === 'F' ? 'Auditora' : 'Auditor';
    default:
      return String(
        user?.rol?.nombre ?? user?.role?.nombre ?? user?.rol ?? user?.role ?? 'Usuario',
      );
  }
};

export const getRoleGreeting = (user: any) => {
  const roleId = getUserRoleId(user);
  const gender = getUserGender(user);

  if (roleId === ROLE_IDS.SUPER_ADMIN) {
    return {
      salutation: 'Superadministrador',
      prefix: '',
      badge: 'Superadministrador',
    };
  }

  if (roleId === ROLE_IDS.ADMIN) {
    return {
      salutation: gender === 'F' ? 'Administradora' : 'Administrador',
      prefix: '',
      badge: gender === 'F' ? 'Administradora' : 'Administrador',
    };
  }

  if (roleId === ROLE_IDS.AUDITOR) {
    return {
      salutation: gender === 'F' ? 'Auditora' : 'Auditor',
      prefix: '',
      badge: gender === 'F' ? 'Auditora' : 'Auditor',
    };
  }

  // Para MEDICO el rol interno sigue siendo MÉDICO, pero la presentación
  // visible sí distingue Doctor/Doctora.
  if (gender === 'F') {
    return { salutation: 'Doctora', prefix: 'Dra.', badge: 'Doctora' };
  }

  return { salutation: 'Doctor', prefix: 'Dr.', badge: 'Doctor' };
};
