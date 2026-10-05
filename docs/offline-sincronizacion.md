# Offline y sincronización

**Estado:** Implementado

La capa común usa IndexedDB. Cada operación conserva identificador idempotente, empresa, sucursal, usuario, dispositivo, dependencias, versión y estado; la carga útil y la caché de lectura se cifran con AES-GCM y una clave no exportable del navegador.

El orden mínimo es paciente, consulta y receta. Los conflictos clínicos no se resuelven silenciosamente con “último en guardar”. SMTP, permisos, usuarios, pagos y suspensión requieren conexión. La autorización offline debe estar firmada, limitada por la cobertura pagada y con duración inicial máxima de 24 horas.

Implementado: almacenamiento IndexedDB separado por usuario, empresa y sucursal; carga útil cifrada con una clave AES-GCM no exportable; cola persistente; indicador conectado/sin conexión; cantidad de pendientes; sincronización manual; encabezado idempotente y respuesta reutilizable en el servidor. Pacientes, consultas, recetas, historias clínicas, citas, medicamentos y movimientos pueden quedar pendientes. Sus identificadores provisionales se reemplazan por los definitivos respetando dependencias.

La vista **Sincronización offline** permite revisar estado, intentos y errores, reintentar o descartar mediante confirmación explícita. Los conflictos se conservan para revisión.

Las lecturas operativas exitosas se guardan en una caché cifrada separada por usuario, empresa, sucursal, URL y filtros. Autenticación, usuarios, permisos, SMTP, pagos, plataforma e historial administrativo nunca entran en esa caché. Cuando la API no responde, sólo las lecturas permitidas pueden devolver su última copia y llevan la fecha de actualización en encabezados internos.

La API emite una autorización JWT offline ligada a usuario, empresa, dispositivo y sucursales activas. Dura como máximo 24 horas y nunca rebasa la cobertura pagada. No se emite para superadministración ni durante el cambio inicial de contraseña. Al reconectar se revalida antes de procesar la cola; una suspensión conserva los pendientes y bloquea su envío. `navigator.locks`, con un candado local de respaldo, evita dos sincronizaciones simultáneas.

Los conflictos HTTP 409 permanecen en estado `CONFLICT` para revisión; citas y existencias se validan otra vez en el servidor. La interfaz permite reintentar o descartar expresamente. La resolución clínica combinada requiere decisión humana y por eso no aplica “último en guardar”.

Límite real: en una PWA la clave no exportable queda protegida por el almacén criptográfico del navegador, pero la protección física depende del perfil y bloqueo del sistema operativo. Tauri y Capacitor usan la misma capa durable; para publicación con requisitos corporativos puede incorporarse un adaptador de llavero nativo sin cambiar el contrato de sincronización.
