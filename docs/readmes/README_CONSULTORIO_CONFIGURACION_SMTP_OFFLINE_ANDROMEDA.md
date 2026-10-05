# Consultorio Médico — Configuración, SMTP, notificaciones, multiplataforma y Andromeda

## 1. Objetivo y prioridad de estas instrucciones

Implementar los ajustes descritos en este documento sobre el sistema de Consultorio Médico existente: configuración por empresa desde el menú del perfil, correo SMTP, credenciales de primer acceso, notificaciones, selección de sucursales, actualización de métricas, presentación del logo y aplicación multiplataforma con funcionamiento offline-first.

Crear además una carpeta `docs/` en el repositorio para conservar el conocimiento técnico y funcional y permitir que Andromeda se alimente de él.

Este README complementa `README_CONSULTORIO_SUCURSALES_SUPERADMIN_PERMISOS.md`. **Cuando haya contradicciones, prevalecen estas instrucciones nuevas**, especialmente:

- Administrador con una sola sucursal activa y autorizada: ingreso automático a esa sucursal, sin selector ni confirmación inicial.
- Administrador con dos o más sucursales activas y autorizadas: selector con la opción **“Ver todas las sucursales”**.
- Configuración de empresa, SMTP, credenciales, permisos y notificaciones: persistencia real en el servidor. Sustituir la configuración simulada que afecte estas funciones.
- El comportamiento offline debe respetar los límites de empresa, sucursal, permisos y vigencia del servicio.

Conservar el superadministrador, el administrador, los permisos de Médico/Doctor y Auditor y la administración de empresas ya solicitados. **El administrador nunca debe recibir, consultar ni administrar cuentas o roles de superadministrador.**

Este documento especifica trabajo para Codex; no afirma que sus funciones ya estén implementadas.

## 2. Revisar la implementación antes de modificar

Leer `AGENTS.md`, README y documentación actuales. Revisar el frontend React, la API, el esquema real de empresas/sucursales/consultorios, el módulo de usuarios, el login, las métricas, la configuración existente, las notificaciones y cualquier soporte de PWA o aplicaciones nativas.

Reutilizar los componentes y tecnologías presentes. No cambiar de backend ni copiar el proyecto de Tienda Multiplataforma: trabajar sobre el Consultorio Médico. Si sucursal y consultorio son entidades distintas, preservar su relación real; no renombrarlas o fusionarlas por suposición.

Las capturas suministradas muestran:

| Referencia | Ajuste solicitado |
| --- | --- |
| Menú del perfil con “Mi perfil” y “Cerrar sesión” | Añadir acceso a Configuración para administrador y superadministrador. |
| Barra superior con campana y selector de sucursal | Integrar notificaciones reales y contexto de trabajo coherente. |
| Modal “Selecciona tu sucursal de trabajo” | Eliminarlo para quien sólo tiene una sucursal autorizada. |
| Dashboard con Pacientes, Consultas, Médicos, Consultorios y Usuarios | Actualizar cifras y gráficas al cambiar de sucursal o entrar al consolidado. |
| Logo en el encabezado del menú lateral | Mejorar tamaño y legibilidad del logo transparente, conservando el login que ya se ve bien. |

Confirmar el comportamiento con código y datos de prueba. Las capturas sirven como referencia visual, no como prueba de la causa técnica.

Implementar frontend y backend donde estén disponibles. Si una capa está en otro repositorio, entregar los contratos y cambios pendientes con su ubicación; no dar por resuelto el flujo con controles sólo en el navegador.

## 3. Configuración desde el menú del perfil y por empresa

### 3.1. Ubicación y acceso

Añadir **“Configuración”** en el menú desplegable de la barra superior donde aparecen nombre, perfil, “Mi perfil” y “Cerrar sesión”. Mostrarla para Administrador y Superadministrador, sin duplicar pantallas ni enlaces confusos en el menú lateral.

Mantener “Mi perfil” para los datos personales. Configuración administra la empresa que se está gestionando, no el perfil personal ni otra empresa.

- Administrador: consulta y modifica únicamente la configuración de su empresa.
- Superadministrador: selecciona una empresa antes de abrir su configuración. Mostrar siempre su nombre; cambiar de empresa recarga los ajustes.
- Médico y Auditor: no reciben este módulo por defecto. Mantener cualquier delegación legítima existente sin conceder acceso a secretos SMTP ni a la política de contraseñas temporales.
- El backend verifica el permiso y la empresa en cada lectura o modificación.

### 3.2. Secciones del módulo

| Sección | Contenido mínimo |
| --- | --- |
| General / Identidad | Nombre del sistema para esa empresa, logo y ajustes visuales ya existentes. |
| Correo / SMTP | Servidor, puerto, seguridad, autenticación, remitente y prueba de envío. |
| Acceso de usuarios | Contraseña temporal por defecto, caducidad, cambio obligatorio inicial y política de nombre de usuario. |
| Notificaciones | Eventos habilitados, destinatarios autorizados, plantillas y canal correo / sistema. |
| Preferencias existentes | Conservar ajustes válidos y clasificarlos como empresa, sucursal o usuario según su alcance real. |

La configuración de empresa se comparte entre sus sucursales. Cambiar de sucursal no cambia el SMTP ni la contraseña temporal por defecto. Si hay ajustes propios de una sucursal, mostrarlos en una sección identificada y evitar sobrescribir los de la empresa.

Eliminar valores globales o claves de almacenamiento local que mezclen empresas. Al guardar, persistir en el servidor y reflejar el cambio en los clientes autorizados. Conservar auditoría de cambios sin incluir secretos.

## 4. SMTP por empresa

### 4.1. Configuración disponible para ambos perfiles

Permitir al administrador y al superadministrador configurar el correo de la empresa actual con:

- Estado habilitado/deshabilitado.
- Host y puerto SMTP.
- Seguridad de conexión: TLS implícito o STARTTLS, conforme al proveedor; no confundir ambos modos.
- Usuario SMTP y contraseña o credencial equivalente.
- Nombre y dirección del remitente.
- Dirección de respuesta opcional.
- Destinatario de prueba, validado por el usuario.

Guardar y ofrecer **“Enviar correo de prueba”**, indicando claramente la empresa y el destinatario. Validar los campos y mostrar resultados comprensibles: conexión, autenticación, remitente rechazado u otro fallo, sin exponer datos sensibles.

La credencial se cifra en el servidor con gestión de claves fuera de los datos de configuración. La interfaz la muestra enmascarada y permite reemplazarla o eliminarla mediante una acción explícita; un campo vacío al editar no la borra accidentalmente. Nunca devolverla completa en respuestas de consulta, registros, notificaciones o exportaciones.

El envío se realiza en el servidor. No incluir credenciales SMTP en JavaScript, service workers, APK, instaladores ni almacenamiento offline.

### 4.2. Servicio central de envío

Centralizar los envíos para que los eventos habilitados utilicen el SMTP de su propia empresa. Capturar la empresa del evento al generarlo; no usar la empresa que un superadministrador tenga seleccionada cuando el trabajo se ejecuta más tarde.

- Guardar el evento y el trabajo de envío después de confirmar la transacción del negocio, mediante una cola o patrón de salida persistente compatible con el proyecto.
- Registrar estado, intentos y error sanitizado. Reintentar fallos temporales con espera y límite; evitar múltiples trabajos para el mismo evento y destinatario.
- No deshacer una alta correcta de usuario sólo porque falle SMTP. Informar “Usuario creado; correo pendiente” y permitir resolver el envío.
- Si falta configuración, registrar “Pendiente de configuración” y mostrarlo a los administradores responsables. No usar el SMTP de otra empresa como sustituto.
- Distinguir aceptación por SMTP de entrega al buzón. Sólo afirmar “Entregado” cuando exista confirmación verificable del proveedor; en otro caso usar “Aceptado por SMTP”.
- Un fallo de red después de que el servidor pudo aceptar un correo puede dejar resultado incierto. Documentar ese caso; la deduplicación de trabajos no garantiza una sola entrega en SMTP.

## 5. Nombre de usuario sencillo y login por correo o usuario

### 5.1. Decisión de generación

El sistema propone automáticamente un nombre de usuario sencillo, pero **nunca compuesto sólo por el nombre**. Usar el primer nombre en minúsculas, sin acentos, espacios ni caracteres especiales, seguido de dos dígitos aleatorios generados en el servidor. No usar consecutivos previsibles ni datos personales.

| Nombre | Ejemplo de usuario | Si está ocupado |
| --- | --- | --- |
| Jesús Gabriel Martínez | `jesus48` | Generar otro sufijo aleatorio y comprobarlo. |
| María López | `maria73` | Generar otro sufijo aleatorio y comprobarlo. |
| Ana Pérez | `ana26` | Generar otro sufijo aleatorio y comprobarlo. |

Los números de la tabla son ejemplos, no valores fijos. No utilizar fecha de nacimiento, CURP, teléfono u otros datos personales para construirlo. Si el nombre no produce un identificador válido, proponer `usuario` más un sufijo aleatorio. Utilizar un generador seguro del servidor, reintentos acotados ante colisiones y ampliación del sufijo si el espacio disponible lo requiere.

Mostrar la propuesta antes de guardar. Administrador y superadministrador pueden editar la base legible en el alta, conservando el sufijo aleatorio generado por el sistema y las validaciones. No permitir que la edición elimine el sufijo y deje sólo el nombre. El servidor genera y reserva el valor definitivo; prevenir colisiones en altas simultáneas mediante una restricción de unicidad real.

La unicidad debe cubrir todo el espacio de login. Si el login no pide empresa, un mismo identificador no puede resolver dos cuentas de empresas diferentes. Revisar también correos duplicados existentes: no elegir la primera cuenta coincidente. Entregar una transición para resolver ambigüedades sin borrar ni fusionar usuarios por suposición.

Comparar nombres de usuario sin distinguir mayúsculas/minúsculas. Mostrar una validación genérica de disponibilidad sin revelar datos de cuentas existentes, especialmente de superadministradores.

### 5.2. Pantalla de ingreso

Cambiar la etiqueta a **“Correo electrónico o usuario”**, manteniendo un solo campo de identificación y uno de contraseña. Ambos identificadores resuelven la misma cuenta y sus permisos en el backend.

El nombre de usuario es un identificador público, no una contraseña. Conservar autenticación, limitación de intentos y recuperación de acceso. Los errores no deben revelar si una cuenta corresponde a una empresa o perfil concreto.

Generar nombres para usuarios existentes mediante una migración compatible. No cambiar sus contraseñas, empresa, rol o sucursales ni enviar correos masivos sin una acción prevista para ello. No migrar cuentas de superadministrador a listados ordinarios.

## 6. Contraseña temporal y primer ingreso

### 6.1. Política configurable por empresa

Añadir **“Contraseña temporal por defecto para nuevos usuarios”** en Configuración → Acceso de usuarios. Administrador y superadministrador pueden configurarla para la empresa actual.

Cumplir estos requisitos:

- Aplicar la contraseña configurada únicamente a nuevas cuentas o restablecimientos explícitos; cambiarla no modifica usuarios existentes ni envíos ya preparados.
- Validar que cumple la política de contraseña del sistema. No usar una contraseña fija incluida en el código, semillas de producción o documentación.
- Si la empresa no ha definido una contraseña por defecto, generar una temporal individual segura para cada alta. Permitir también elegir este modo desde la configuración.
- Definir caducidad configurable; usar 48 horas como valor inicial propuesto para credenciales temporales, modificable desde la empresa.
- Mantener un estado de **“Pendiente de cambio de contraseña”** en el servidor.
- Al autenticar por primera vez, permitir únicamente cambiar la contraseña y salir. No cargar expedientes, datos operativos ni entrar al modo offline antes de completar el cambio.
- Exigir una contraseña nueva distinta de la temporal. Al completarlo, invalidar la temporal y renovar las sesiones correspondientes.
- Si caduca sin utilizarse, ofrecer un flujo autorizado para emitir una nueva temporal.

La contraseña de autenticación de cada usuario se guarda mediante el hash usado por el sistema. La contraseña por defecto configurable, si debe recuperarse para un alta, se guarda cifrada como secreto de configuración; no se devuelve en consultas ordinarias ni se muestra tras guardarla.

### 6.2. Alta y envío de claves de acceso

Al guardar un usuario, validar empresa, rol ordinario, sucursales, correo y nombre de usuario; crear la cuenta, marcar el cambio obligatorio y preparar el correo de bienvenida mediante el SMTP de esa empresa.

El correo incluye:

- Nombre del usuario y empresa.
- Nombre de usuario asignado y correo de acceso.
- Contraseña **temporal** de esa alta.
- Enlace al login de la plataforma.
- Vigencia e indicación de cambiarla en el primer ingreso.

No enviar contraseñas permanentes ni contraseñas nuevas elegidas por el usuario. Conservar el secreto temporal para el trabajo de correo sólo cifrado, restringido y durante el tiempo necesario; eliminarlo al completar o cerrar el envío. La vista de notificaciones y los logs muestran el evento, no la contraseña ni el cuerpo con credenciales.

Si se solicita reenviar acceso después de eliminar el secreto o después de su caducidad, generar una nueva temporal e invalidar la anterior, registrando la acción. Evitar que reintentos concurrentes creen contraseñas diferentes o que un correo atrasado se presente como válido: cancelar trabajos obsoletos por versión de credencial antes de enviarlos y conservar su resultado trazable.

## 7. Módulo de Notificaciones y campana

Crear **Notificaciones** e integrarlo con la campana existente de la barra superior. Debe reflejar eventos reales del sistema y el estado de los correos generados; eliminar contadores y contenido de demostración.

### 7.1. Dos vistas dentro del módulo

| Vista | Función y alcance |
| --- | --- |
| Mis notificaciones | Bandeja personal de avisos recibidos; lectura individual y contador de pendientes. |
| Historial de envíos | Administrador y superadministrador consultan los correos y eventos de la empresa gestionada, con estados, fallos y acciones autorizadas. |

Marcar una notificación como leída no cambia el estado del correo ni la marca como leída para otros destinatarios. El contador de la campana refleja notificaciones no leídas del usuario; no el total de correos que toda la empresa ha enviado.

Mostrar tipo de evento, asunto resumido, fecha, empresa, sucursal cuando aplique, destinatario autorizado, canal, estado e intentos. Ofrecer búsqueda, filtros, paginación, detalle sanitizado, marcar leído y marcar todos como leídos. Permitir reintentar un envío fallido mediante un permiso específico; evitar enviar otra vez automáticamente correos ya aceptados por SMTP.

### 7.2. Eventos cubiertos

Centralizar todos los envíos de correo habilitados para que aparezcan en el historial. Revisar eventos existentes y agregar, como mínimo:

- Creación de usuarios y envío de acceso inicial.
- Emisión de contraseña temporal y recuperación de acceso.
- Cambios de rol, permisos y sucursales asignadas, para los destinatarios autorizados.
- Creación, cambio, cancelación y recordatorios de citas cuando esas notificaciones estén habilitadas.
- Envío de recetas, documentos o reportes solicitado por un usuario autorizado.
- Avisos de inventario y otros avisos operativos que ya existan o se habiliten.
- Avisos de vigencia, renovación y suspensión de la empresa, con acceso limitado a sus responsables.
- Pruebas SMTP, fallos y reintentos para quienes gestionan el correo.

Configurar canales y destinatarios por evento, dentro de su empresa y alcance. No enviar un aviso a todos los usuarios por el solo hecho de pertenecer a la empresa; respetar destinatarios y permisos de lectura. Usar contenido clínico mínimo en asuntos y avisos generales.

El administrador no ve eventos que revelen cuentas, identidad o perfil de superadministrador. El panel global conserva sus registros internos; el historial de la empresa debe sanear lo que expone.

### 7.3. Contratos y fiabilidad

Persistir notificaciones, destinatarios, lectura y estados de envío en el backend. Definir permisos separados para ver la bandeja, consultar historial, consultar errores y reintentar envíos. Reutilizar el módulo de permisos previo.

Notificación interna y correo son canales relacionados, con estados independientes: un correo fallido no borra la notificación y una notificación leída no implica que el correo se entregó. Un evento repetido por reintento de API o sincronización no debe duplicar la cuenta, la notificación ni el trabajo de envío.

Un evento creado offline muestra “Pendiente de sincronizar”. El correo se prepara en el servidor después de aceptar la operación, no desde el dispositivo.

## 8. Sucursales: acceso automático y vista de todas

### 8.1. Reglas para el administrador

Contar sucursales **activas y autorizadas para ese administrador**, no todas las filas existentes en la base de datos.

| Sucursales disponibles | Comportamiento al ingresar |
| --- | --- |
| Ninguna | Mostrar que falta una sucursal autorizada; impedir registros y permitir las acciones administrativas que correspondan. No asignar una ajena. |
| Una | Seleccionarla automáticamente, validar el contexto y entrar directamente. No mostrar modal de selección ni pedir confirmación. |
| Dos o más | Mostrar selector con cada sucursal autorizada y **“Ver todas las sucursales”**. Si no hay una selección previa válida, pedir selección antes de cargar el contenido. |

Con una sola sucursal, mostrar su nombre en el encabezado aunque no haya selector. Con varias, conservar una selección previa sólo si sigue siendo válida para esa empresa y ese usuario; ofrecer siempre cambiarla.

Para el superadministrador, primero seleccionar la empresa. Dentro de ella reutilizar el mismo comportamiento de sucursales; el panel global permanece separado. Médico y Auditor siguen sus alcances y no reciben el consolidado automáticamente.

### 8.2. “Ver todas las sucursales”

Esta opción muestra un **consolidado de las sucursales autorizadas de la misma empresa**. No concede nuevas sucursales ni mezcla empresas. Rotular el encabezado y los indicadores como “Todas las sucursales” y mostrar el alcance autorizado cuando sea necesario.

- Ofrecer indicadores, reportes, listas y gráficas consolidados conforme a permisos.
- Identificar la sucursal de cada atención, cita, movimiento o registro cuando aplique.
- Contar pacientes y usuarios únicos según su identificador, evitando duplicarlos cuando estén asignados a varias sucursales. Sumar atenciones y movimientos según sus registros reales.
- Los catálogos compartidos de empresa tienen alcance de empresa; no fingir que pertenecen a una sucursal.
- Para crear información que requiere sucursal, pedir una unidad concreta antes de abrir el registro. El modo consolidado no es una sucursal y no puede enviarse como identificador válido a la API.
- No enviar el texto “todas” como un `sucursalId` inventado. Definir el contrato del consolidado y resolver en el servidor el conjunto autorizado.

### 8.3. Métricas y filtros al cambiar de contexto

Corregir **Pacientes, Consultas, Médicos, Consultorios, Usuarios, gráficas, actividad reciente, pacientes de hoy, próximas citas y pendientes**, además de cualquier indicador nuevo o existente.

Al cambiar empresa, sucursal o consolidado:

1. Cambiar el contexto de forma controlada y mostrar carga. Evitar que las cifras anteriores parezcan corresponder a la nueva selección.
2. Invalidar o separar consultas y cachés por empresa, sucursal/consolidado, permisos y rango de fechas.
3. Recargar métricas desde su fuente real. Cancelar o ignorar respuestas del contexto anterior.
4. Ajustar los filtros secundarios para que no contradigan el selector superior. El filtro “Filtrar por consultorio” no debe ampliar el contexto de una sucursal seleccionada.
5. Actualizar también reportes, calendario y listados dependientes del contexto.
6. Conservar la sucursal original de formularios o guardados iniciados antes del cambio; confirmar el descarte de cambios cuando corresponda.

Si un indicador es propio de toda la empresa, rotularlo explícitamente o moverlo a una sección de empresa. Por ejemplo, no mostrar el total de sucursales de la empresa dentro de un resumen rotulado como exclusivo de una sucursal sin explicar su alcance. No fabricar diferencias entre sucursales cuando el catálogo es compartido.

## 9. Logo transparente en el menú lateral

El logo del login ya se ve bien. Corregir su presentación dentro del sistema, especialmente en el encabezado del menú lateral mostrado en la captura.

- Reutilizar el logo transparente de la empresa actual.
- Revisar dimensiones reales, espacios transparentes, contenedor, tamaño visible y contraste con el fondo del menú.
- Mantener proporciones y evitar recortes o estiramientos; usar el ajuste de imagen adecuado al contenedor.
- Dar al símbolo suficiente tamaño y separarlo del nombre del sistema. No dejarlo como una miniatura dentro de un contenedor grande.
- Si hace falta una variante para fondo oscuro, usar una variante aprobada del logo o ajustar el fondo del contenedor de forma consistente. No recolorear arbitrariamente el logo ni añadir un fondo sólido al archivo transparente.
- Revisar escritorio, menú lateral colapsado y móvil. Conservar el diseño y colores actuales salvo lo necesario para solucionar la legibilidad.

Los cambios de logo o nombre afectan sólo a su empresa y se reflejan en sus clientes. El logo también debe estar disponible offline tras sincronizar la configuración.

## 10. Aplicación multiplataforma con funcionamiento offline-first

### 10.1. Arquitectura elegida

Reutilizar el frontend React y la API actuales, con una capa común de datos, validación y sincronización. Si el repositorio ya cuenta con una solución nativa compatible, extenderla; evitar introducir dos contenedores para el mismo destino.

La base propuesta, cuando no exista soporte equivalente, es:

| Destino | Implementación |
| --- | --- |
| Web instalable | PWA con manifest, iconos, service worker para recursos de aplicación y almacenamiento de datos autorizado. |
| Escritorio | Tauri 2, priorizando un instalador para Windows; conservar configuración compatible para otros sistemas cuando corresponda. |
| Móvil | Capacitor para Android, con APK instalable y la misma aplicación React. |
| Datos locales | IndexedDB en la web; una abstracción de almacenamiento durable que permita IndexedDB o almacenamiento nativo adecuado en escritorio y Android. |
| Sincronización | Cola local persistente y API con operaciones idempotentes, control de versiones y validación del contexto. |

Los contenedores empaquetan recursos locales de la aplicación; no limitarse a abrir una URL remota que deja de funcionar sin conexión. Un instalador o un APK no aporta offline-first por sí solo.

El funcionamiento nativo no debe depender de que el service worker esté disponible en todos los WebView. Mantener la persistencia y la sincronización en la capa común, con adaptadores donde sean necesarios.

### 10.2. Comportamiento sin internet

Después de una primera autenticación y sincronización online, la aplicación debe abrir sin conexión, mostrar el contexto autorizado y permitir trabajar con información local disponible. Las funciones y datos aún no descargados deben indicarlo claramente.

| Módulo o acción | Comportamiento offline esperado |
| --- | --- |
| Pacientes | Consultar pacientes sincronizados y capturar nuevos pacientes como pendientes de sincronización. |
| Consulta Externa | Capturar y guardar localmente consultas pendientes, conservando paciente, médico y sucursal. |
| Recetas | Capturar recetas relacionadas con consultas locales; diferenciar documentos pendientes de validación de documentos definitivos. |
| Historia Clínica | Consultar lo descargado y guardar cambios como versiones locales pendientes. |
| Procedimientos / Control diario | Registrar operaciones locales pendientes y reflejarlas con esa condición en el resumen. |
| Citas | Consultar agenda descargada y guardar propuestas pendientes; confirmar disponibilidad y evitar duplicados al sincronizar. |
| Inventario | Consultar la última existencia sincronizada y permitir capturas de movimientos pendientes cuando el diseño lo soporte; no presentarlos como stock confirmado. |
| Dashboard | Mostrar datos locales con fecha de actualización y pendientes identificados; no presentarlos como cifras actuales del servidor. |
| Notificaciones | Consultar avisos sincronizados; encolar cambios de lectura y mostrar los eventos locales pendientes. No enviar SMTP desde el cliente. |
| Administración sensible | SMTP, cambios de permisos, altas y restablecimientos de usuarios, pagos, suspensión de empresas y políticas de acceso requieren conexión al servidor. |

Las capturas pendientes conservan las validaciones aplicables y el contexto en que fueron creadas. Una consulta o receta provisional no se presenta como documento firmado o confirmado por el servidor. Mantener la generación definitiva conforme a las reglas existentes.

### 10.3. Persistencia y sincronización

- Cada operación local tiene identificador único, empresa, sucursal, usuario, dispositivo, tipo, fecha, estado y dependencias.
- Guardar la operación y la actualización local de forma consistente para que un cierre, reinicio o corte de energía no pierda cambios.
- Sincronizar al recuperar conectividad, al abrir o reanudar la aplicación y mediante **“Sincronizar ahora”**. No depender exclusivamente de ejecución en segundo plano.
- Probar conectividad con la API; el indicador del navegador por sí solo no confirma que el servidor esté disponible.
- Respetar dependencias: sincronizar primero el paciente local, después la consulta y después su receta, reconciliando identificadores provisionales y definitivos.
- Reintentar con límites y conservar estado. El servidor recibe una clave idempotente para impedir duplicados por cortes después de confirmar una operación.
- Validar de nuevo empresa, sucursal, permisos, vigencia, referencias y reglas del negocio antes de aceptar una operación.
- No sobrescribir cambios clínicos concurrentes con la regla “gana el último” de forma silenciosa. Mostrar conflictos y conservar ambas versiones hasta su resolución autorizada.
- Validar citas contra la agenda real y movimientos contra existencias reales. Una cita local no garantiza disponibilidad; un movimiento local no garantiza stock reservado.
- Recibir actualizaciones incrementales, eliminaciones/inactivaciones y revocaciones para no revivir registros antiguos desde otro dispositivo.
- Proteger la cola frente a sincronizaciones paralelas de varias pestañas o reanudaciones del mismo dispositivo.
- Mostrar conectado/sin conexión, última sincronización, pendientes, errores y conflictos. Permitir revisar problemas sin borrar capturas.

Las métricas locales deben evitar contar otra vez una operación ya reconciliada con el servidor. El consolidado offline cubre sólo las sucursales autorizadas cuyos datos estén disponibles y debe indicar si es parcial.

### 10.4. Acceso offline y bloqueo por falta de pago

La primera autenticación, el cambio de contraseña temporal y la habilitación de un dispositivo requieren conexión. Después, permitir desbloqueo local protegido conforme a la política de la empresa, sin guardar la contraseña de acceso en texto plano.

Una suspensión nueva no puede conocerse instantáneamente en un equipo desconectado. Documentar este límite y resolverlo con una autorización offline de vigencia acotada, firmada por el servidor y vinculada a empresa, usuario, dispositivo y alcance.

- Proponer una duración máxima inicial de 24 horas, configurable por el superadministrador dentro de los límites de servicio.
- La autorización offline nunca termina después de la cobertura pagada de la empresa y no puede renovarse sin servidor.
- Al expirar, bloquear operaciones hasta revalidar el acceso. Conservar las capturas pendientes de forma protegida.
- Detectar retrocesos evidentes del reloj y no confiar sólo en una fecha editable del navegador; documentar los límites del mecanismo en cada plataforma.
- Al volver a conectarse, aplicar inmediatamente suspensiones o revocaciones. No aceptar automáticamente operaciones pendientes de una cuenta ya sin autorización.
- Conservar las operaciones rechazadas para revisión o recuperación autorizada; no borrarlas ni mezclarlas con otra empresa para lograr sincronizarlas.

El superadministrador no puede usar una configuración de empresa para ampliar su propia autorización global offline. La administración global y de pagos sigue requiriendo servidor.

### 10.5. Protección de datos locales

Descargar sólo los datos necesarios y autorizados. Separar almacenamiento por empresa, usuario y sucursal, incluyendo cachés, archivos, cola, notificaciones y contexto activo.

Aplicar cifrado y protección de claves adecuados a la plataforma, almacenamiento seguro nativo donde exista y bloqueo de sesión en equipos compartidos. Explicar cómo se protege y desbloquea la información en la PWA; no afirmar que IndexedDB por sí solo cifra o protege datos.

El service worker almacena recursos de aplicación. No guardar indiscriminadamente respuestas de autenticación, contraseñas, secretos SMTP ni expedientes en una caché pública. Los datos operativos van a su almacenamiento protegido y sujeto a permisos.

Cerrar sesión debe impedir a otro usuario acceder a información previa. No borrar operaciones pendientes silenciosamente: intentar sincronizarlas si es posible y, si no, conservarlas cifradas y bloqueadas para su propietario, con aviso de su estado. Una eliminación local requiere acción explícita e información de lo que se perdería.

Al actualizar PWA, APK o escritorio, migrar los datos locales sin perder pendientes. No activar una actualización incompatible mientras haya guardados en curso. Mantener compatibilidad de contratos durante la transición.

### 10.6. Entregables de aplicaciones

Crear los proyectos y scripts de desarrollo, compilación, sincronización y empaquetado siguiendo la estructura real del repositorio, sin imponer un monorepo nuevo si no hace falta.

Entregar:

1. PWA instalable con recursos offline verificados y documentación de despliegue HTTPS.
2. Aplicación de escritorio y scripts para producir el instalador Windows.
3. Proyecto Android y APK de prueba instalable; configuración e instrucciones para producir un APK release firmado y, si se necesita, AAB.
4. Instrucciones de versiones, actualización, permisos nativos, conexión a la API y límites del modo offline.
5. Evidencia de apertura, trabajo, cierre, reanudación y sincronización sin internet en los destinos que se puedan probar.

No incluir claves de firma o secretos en el repositorio. Usar la identidad de publicación de la empresa cuando esté disponible; distinguir claramente build de prueba y release. Si el entorno no permite compilar Windows/Android o falta una clave de publicación, entregar la preparación reproducible y señalar exactamente qué artefacto queda pendiente, sin afirmar que ya se generó.

## 11. Carpeta `docs/` y alimentación de Andromeda

### 11.1. Ubicación y propósito

Crear **`docs/` dentro del repositorio del Consultorio Médico**. Allí se conserva el conocimiento técnico y funcional del proyecto. Andromeda permanece como Segundo Cerebro independiente, conectado mediante el mecanismo existente.

La carpeta debe permitir consultar lo que se pidió, lo que se decidió, lo que se implementó, lo que se verificó y lo que sigue pendiente. No basta con copiar el chat ni guardar una lista de archivos sin contenido útil.

### 11.2. Estructura mínima

| Ruta propuesta | Contenido |
| --- | --- |
| `docs/README.md` | Índice principal, orden de lectura, estado de los documentos y vínculo con Andromeda. |
| `docs/readmes/` | READMEs de requisitos y fases, incluido el anterior y este documento. |
| `docs/arquitectura.md` | Componentes reales, frontend/API, estructura de datos y clientes web/escritorio/Android. |
| `docs/flujo-empresa-sucursal.md` | Alcances, selección automática, consolidado, métricas y cambios de contexto. |
| `docs/roles-permisos.md` | Roles, acciones, sucursales autorizadas e invisibilidad del superadministrador. |
| `docs/configuracion-smtp-notificaciones.md` | Ajustes por empresa, contratos, envío, bandeja y estados, sin credenciales. |
| `docs/acceso-primer-ingreso.md` | Usuario con sufijo aleatorio, login, contraseña temporal, caducidad y cambio obligatorio. |
| `docs/offline-sincronizacion.md` | Almacenamiento, cola, dependencias, conflictos, autorización offline y límites reales. |
| `docs/multiplataforma.md` | Compilación, instalación, APK, escritorio, firma, actualización y pruebas. |
| `docs/decisiones.md` | Decisiones adoptadas, fecha, motivo y consecuencias. |
| `docs/cambios.md` | Cambios implementados por fase y referencias a archivos o commits cuando existan. |
| `docs/pruebas.md` | Escenarios verificados, resultados, verificaciones no ejecutadas y fallos conocidos. |
| `docs/pendientes.md` | Trabajo restante, dependencias, bloqueos reales y siguiente acción concreta. |
| `docs/andromeda.md` | Fuente que lee Andromeda, mecanismo de conexión, actualización y verificación. |

Si ya hay una estructura equivalente, ampliarla y actualizar el índice en lugar de duplicarla. Clasificar documentos como **Requisito**, **Decisión**, **Implementado**, **Verificado** o **Pendiente**; no presentar como implementado todo lo escrito en un README.

### 11.3. Resolver documentación anterior contradictoria

Guardar los READMEs anteriores como antecedentes e indicar su estado. En la documentación vigente, sustituir la confirmación obligatoria de sucursal única por el ingreso automático y establecer “Ver todas las sucursales” para el administrador con varias autorizadas.

Registrar también la decisión actual del nombre de usuario: **base legible más cuatro dígitos aleatorios**, nunca sólo el nombre, cumpleaños o consecutivo. El índice debe apuntar a la regla vigente y señalar qué instrucción anterior quedó reemplazada.

### 11.4. Conexión real con Andromeda

1. Leer las instrucciones reales de integración en `AGENTS.md` y la documentación de Andromeda.
2. Identificar su ruta y mecanismo de conexión configurados. No inventar rutas, comandos o skills ni usar marcadores como `C:\RUTA\A\Andromeda` como si fueran una ubicación real.
3. Registrar `docs/` como fuente del Consultorio Médico mediante el mecanismo existente y actualizar las referencias autorizadas que correspondan.
4. Incorporar un resumen de arquitectura, flujos, decisiones y pendientes con referencias a sus archivos de origen. Evitar copiar el proyecto completo o mezclarlo con Tutum, PC&B, Gimnasio o Tienda Multiplataforma.
5. Si el cerebro conserva una copia o índice, actualizarlo de forma controlada y documentar cómo se renueva tras cambios. Crear `docs/` por sí solo no significa que Andromeda ya se alimente automáticamente.
6. Verificar que desde Andromeda se pueda recuperar la regla de sucursal única, el consolidado, el aislamiento SMTP, el usuario con sufijo aleatorio y los límites offline.
7. Si se utiliza una visualización del cerebro, actualizarla mediante su mecanismo existente y comprobar que los vínculos apunten a documentos actuales.

Si Andromeda no está disponible en el entorno, dejar `docs/` completa y entregar la conexión pendiente con el procedimiento comprobado; no declarar una conexión que no se pudo verificar.

### 11.5. Conservación del conocimiento

Después de cada fase, actualizar documentación, decisiones, cambios, pruebas y pendientes, además del índice principal. Ajustar `AGENTS.md` del consultorio para que futuras tareas lean `docs/README.md` y actualicen los documentos afectados.

Guardar y versionar estos archivos en el repositorio del consultorio mediante el flujo habitual, respetando cambios locales y las reglas del proyecto. No mezclar código del consultorio dentro de Andromeda ni modificar su estructura sin necesidad.

Documentar conocimiento del sistema y ejemplos sintéticos. **No incorporar a Andromeda ni a `docs/` contraseñas, credenciales SMTP, tokens, claves de firma, datos de pacientes, expedientes reales o cuerpos de correos con claves de acceso.**

## 12. Orden de implementación y criterios de aceptación

### 12.1. Fases

1. Revisar el estado real y preparar `docs/README.md` con requisitos vigentes y prioridades.
2. Corregir empresa/sucursal, ingreso automático, consolidado y métricas; ajustar el menú del perfil y el logo.
3. Persistir configuración por empresa e implementar usuario con sufijo aleatorio, login dual y contraseña temporal.
4. Implementar SMTP, cola, historial de envíos y campana de notificaciones con permisos.
5. Implementar persistencia local y sincronización; después empaquetar PWA, escritorio y Android.
6. Completar pruebas y documentación, conectar Andromeda y verificar el conocimiento recuperable.

No detenerse en una propuesta de arquitectura ni dar por terminado el proyecto al generar una carcasa nativa. Completar las capas disponibles y detallar dependencias externas que impidan cerrar un requisito.

### 12.2. Pruebas necesarias

| Área | Escenarios que deben pasar |
| --- | --- |
| Configuración | Menú disponible para ambos perfiles; superadministrador cambia de empresa sin arrastrar ajustes; administrador no modifica otra empresa por API. |
| Sucursales | Cero, una y varias autorizadas; una entra directamente; varias muestran “Ver todas las sucursales”; una desactivada no cuenta. |
| Dashboard | Cambios rápidos entre sucursales y consolidado; respuestas tardías ignoradas; totales únicos sin duplicación; filtros compatibles. |
| SMTP | Dos empresas con configuración distinta, prueba de envío, secreto enmascarado, credencial no enviada al cliente y fallo que conserva el alta. |
| Usuarios | `jesus4827` u otra base con sufijo aleatorio; nunca sólo nombre; colisiones concurrentes resueltas; login por correo y usuario a la misma cuenta. |
| Primer ingreso | Temporal válida, expirada, restablecida y cambiada; no acceso operativo ni offline antes del cambio; contraseña permanente no enviada por correo. |
| Notificaciones | Eventos y contador reales, lectura por destinatario, permisos de historial, fallos, reintentos y contenido sin secretos. |
| Aislamiento | Administrador sin cuentas de superadministrador en API, métricas o notificaciones; archivos y envíos restringidos a su empresa y alcance. |
| Offline | Abrir sin internet después de habilitar el dispositivo, registrar paciente/consulta/receta, cerrar, reabrir y conservar operaciones. |
| Sincronización | Reconexión y reintentos sin duplicados, orden de dependencias, conflicto clínico, cita ocupada y movimiento incompatible con stock. |
| Vigencia offline | Autorización limitada por cobertura pagada, expiración, revocación al reconectar y pendientes protegidos sin aceptación indebida. |
| Cambio de cuenta | Otro usuario o empresa no accede a datos locales, claves, contexto o cola anteriores. |
| Multiplataforma | Apertura, navegación, logo, almacenamiento, impresión/exportación aplicable y sincronización en PWA, Windows y Android verificables. |
| Documentación | Índice actualizado, reglas vigentes sin contradicciones, estado real de cada fase y acceso comprobado desde Andromeda cuando esté disponible. |

Ejecutar las comprobaciones pertinentes del proyecto y pruebas de autorización/sincronización que verifiquen comportamiento real. No reemplazar pruebas con capturas de una pantalla estática. Informar lo que no pudo probarse.

## 13. Entrega final requerida a Codex

Entregar archivos modificados, migraciones compatibles, contratos reales de API, scripts de compilación, artefactos generados, documentación en `docs/` y evidencia de pruebas. Identificar implementaciones, verificaciones y pendientes con precisión.

El informe final debe explicar cómo configurar una empresa, probar SMTP, crear un usuario, recibir y cambiar su contraseña temporal, consultar notificaciones, cambiar de sucursal, usar el consolidado, trabajar offline, sincronizar, instalar escritorio/Android y mantener actualizado Andromeda.

## 14. Referencias técnicas oficiales

Consultar la documentación oficial compatible con las versiones del proyecto; fijar versiones compatibles y mantener el archivo de dependencias del repositorio. No actualizar todo el stack sólo para incorporar estas funciones.

- [Tauri 2](https://v2.tauri.app/): integración de frontend existente y contenedor de escritorio.
- [Capacitor](https://capacitorjs.com/docs): integración nativa para Android sobre la aplicación web.
- [MDN — Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API): recursos de aplicación y funcionamiento web offline en contexto seguro.
- [MDN — IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API): almacenamiento web estructurado.
