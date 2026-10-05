# Configuración, SMTP y notificaciones

**Estado:** Implementado parcialmente

La configuración SMTP será por empresa y compartida entre sucursales. El secreto debe cifrarse en el servidor y nunca devolverse completo. Un campo vacío al editar no debe borrarlo. El envío debe ocurrir en la API mediante trabajos persistentes e idempotentes.

La campana actual debe sustituirse por notificaciones reales: bandeja personal, contador individual de no leídas e historial empresarial autorizado. La lectura de una notificación y el estado SMTP son estados independientes.

Implementado: persistencia por empresa, secreto SMTP cifrado con AES-256-GCM y clave externa `CONFIG_ENCRYPTION_KEY`, formulario en Configuración, prueba SMTP desde la API, registro sanitizado del resultado, bandeja personal, contador real, lectura individual/total e historial para Administrador y Superadministrador.

Implementado también: el alta de usuario crea el trabajo después de confirmar la cuenta, conserva la contraseña temporal cifrada, registra “Pendiente de configuración” cuando falta SMTP y elimina el secreto tras la aceptación SMTP. Un fallo de correo no deshace el usuario.

El historial permite reintentar trabajos no aceptados; bloquea expresamente el reenvío de correos ya aceptados por SMTP.

El procesador persistente revisa cada minuto trabajos pendientes, fallidos o pendientes de configuración, reclama cada registro atómicamente y limita el envío a cinco intentos. No vuelve a procesar estados aceptados, cancelados o ya reclamados. El estado “Aceptado por SMTP” no se presenta como entrega confirmada al buzón.

Pendiente funcional: conectar al correo todos los eventos clínicos y operativos opcionales y ofrecer plantillas editables/destinatarios por evento. El acceso inicial, pruebas SMTP, historial, lectura, filtros y reintento autorizado ya están conectados.

Estados mínimos de correo: pendiente, pendiente de configuración, procesando, aceptado por SMTP, fallo temporal, fallo definitivo y resultado incierto.
