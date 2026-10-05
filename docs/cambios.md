# Cambios

**Estado:** Implementado parcialmente

## 2026-10-04

- Login dual por correo o usuario.
- Campos de usuario para identificador y estado de contraseña temporal.
- Generación segura de usuario con sufijo aleatorio de dos dígitos.
- Selección automática cuando el Administrador tiene una sola sucursal.
- Opción consolidada para varias sucursales.
- Configuración disponible desde el menú del perfil para Administrador y Superadministrador.
- Catálogo de sucursales del Administrador limitado a sus asignaciones activas.
- Configuración SMTP y política de acceso persistentes por empresa.
- Secretos SMTP y contraseña temporal cifrados con una clave externa al dato.
- Prueba SMTP ejecutada en el backend y resultado registrado sin exponer la contraseña.
- Bandeja de notificaciones, contador real de pendientes e historial empresarial de envíos.
- Bloqueo del primer ingreso, caducidad de contraseña temporal y cambio obligatorio antes de acceder a módulos operativos.
- Correo de acceso inicial posterior al alta, con contraseña cifrada hasta el envío y resultado independiente de la creación del usuario.
- Configuración empresarial reorganizada en pestañas independientes para SMTP, primer ingreso y notificaciones.
- Vista previa e identidad visual separadas de la configuración operativa mediante navegación principal.
- Configuración unificada en una sola barra para identidad, SMTP, primer ingreso y notificaciones.
- Base PWA con manifest, service worker, almacenamiento offline cifrado, cola persistente, estado de conexión y sincronización manual.
- Idempotencia de operaciones sincronizadas en la API y primera captura offline para altas de pacientes.
- Dependencias offline entre pacientes, consultas y recetas, con reconciliación de identificadores provisionales.
- Cola offline extendida a historia clínica, citas e inventario, con vista de revisión, reintento y descarte explícito.
- Caché cifrada de lecturas operativas con exclusión de módulos sensibles.
- Autorización offline firmada, ligada al dispositivo y limitada a 24 horas y a la cobertura de la empresa.
- Revalidación al reconectar y candado de sincronización entre pestañas.
- Dashboard agregado en la API con totales únicos y contexto autorizado de sucursal/consolidado.
- Procesador SMTP periódico con reclamación atómica y límite de intentos.
- Proyectos reproducibles de Tauri 2 y Capacitor Android, scripts de empaquetado e iconos PWA.
