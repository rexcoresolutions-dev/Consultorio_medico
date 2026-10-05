# Roles y permisos

**Estado:** Implementado parcialmente

- Superadministrador: administración global y acceso a empresas; no forma parte de listados ordinarios de una empresa.
- Administrador: administra su empresa y sus sucursales autorizadas.
- Doctor: nombre visible del rol clínico; el token conserva compatibilidad interna con `MEDICO`.
- Auditor: acceso según permisos efectivos.
- Configuración se muestra en el perfil de Administrador y Superadministrador.

La API debe seguir verificando rol, empresa, sucursal y permiso en cada operación; ocultar un control en React no constituye autorización.
