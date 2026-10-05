# Consultorio Médico — Corrección de sucursales, superadministrador y permisos

## 1. Objetivo de la tarea

Revisar y corregir el flujo completo de asociación de información con empresas, sucursales y consultorios. Actualmente se reportan registros que no quedan vinculados correctamente al lugar de trabajo seleccionado por el administrador. Identificar la causa real en el código y corregir todos los módulos afectados, conservando la información existente.

Incorporar el perfil **Superadministrador**, un módulo exclusivo para administrar las empresas de la plataforma y un módulo de permisos desglosados para los perfiles Médico/Doctor y Auditor.

Este documento es una instrucción de implementación para Codex. No acredita que el código ya haya sido revisado o corregido.

## 2. Revisión obligatoria antes de implementar

1. Leer `AGENTS.md`, el README actual y la documentación relacionada con autenticación, usuarios, empresas, sucursales y API.
2. Revisar la implementación actual: rutas, servicios, formularios, estado de sesión, consultas, almacenamiento local, contratos de API y esquema de datos disponible.
3. Reproducir el fallo reportado con un administrador y al menos dos sucursales. Revisar también cambios recientes relacionados con el contexto de trabajo para identificar una posible regresión, sin asumir de antemano su causa.
4. Documentar qué significa cada entidad: empresa, sucursal y consultorio. Una empresa es el cliente de la plataforma y puede tener varias unidades de trabajo. Confirmar si sucursal y consultorio son entidades diferentes o nombres de la misma entidad; conservar el modelo real y sus identificadores.
5. Identificar qué información pertenece a la empresa, cuál a una sucursal y cuál a un consultorio o paciente. No agregar un filtro de sucursal a catálogos compartidos sin revisar su alcance.
6. Presentar un mapa breve de módulos afectados, causa encontrada y solución. Continuar con los cambios autorizados sin detenerse en una propuesta.

Mantener las tecnologías y convenciones del proyecto. Evitar cambios ajenos a esta tarea, reemplazos generales de arquitectura y modificaciones de credenciales o archivos de entorno. No sobrescribir cambios locales del usuario ni ejecutar migraciones destructivas.

Si el repositorio contiene solamente el frontend y la API se mantiene en otro proyecto, implementar lo que corresponde aquí y entregar el contrato y los cambios necesarios para el backend. No presentar controles visuales como una protección completa si faltan validaciones del servidor.

## 3. Contexto de empresa y sucursal

### 3.1. Reglas de pertenencia

- Cada registro debe tener un alcance definido y verificable conforme al modelo real.
- El administrador opera únicamente dentro de su empresa y de las sucursales que tiene asignadas.
- Tener acceso a una empresa no concede automáticamente acceso a todas sus sucursales.
- Las relaciones entre paciente, cita, consulta, receta, historia clínica, procedimiento e inventario deben pertenecer a contextos compatibles. Rechazar referencias a registros de otra empresa o a sucursales no autorizadas.
- Si un paciente puede atenderse en varias sucursales de la misma empresa, preservar esa funcionalidad: la atención registra la sucursal donde ocurrió y la consulta del expediente respeta los permisos definidos. No duplicar pacientes automáticamente.
- El servidor valida la pertenencia y autorización. Los identificadores enviados por el navegador nunca bastan para conceder acceso.
- Conservar la sucursal original de los registros históricos al editarlos. Cambiar la sucursal activa no debe trasladar registros existentes; cualquier traslado requiere una función explícita, autorizada y trazable.

### 3.2. Selección obligatoria para el administrador

Al iniciar sesión, el administrador debe seleccionar la sucursal o consultorio donde va a trabajar, antes de cargar información operativa o permitir registros. Mostrar solamente opciones de su empresa que estén activas y autorizadas.

Incluso si tiene una sola sucursal, mostrarla y solicitar su confirmación. Evitar seleccionar silenciosamente la primera opción o usar una sucursal predeterminada que no corresponda.

Mostrar en el encabezado la empresa y la unidad de trabajo activas, con un selector accesible para cambiar de sucursal. Si se conserva una selección anterior, validarla nuevamente y pedir confirmación al iniciar una nueva sesión.

El contexto seleccionado debe ser consistente en todo el sistema y validado en cada petición. Una selección ausente, eliminada, desactivada o ya no autorizada debe impedir la operación y devolver al selector, sin recurrir a otra sucursal automáticamente.

Una vista consolidada de la empresa, si ya existe, debe ser explícita y de consulta. No permitir crear registros clínicos desde “Todas las sucursales” sin seleccionar una unidad concreta.

### 3.3. Cambio de sucursal durante una sesión

1. Si hay cambios sin guardar, mostrar una confirmación antes de descartarlos. No reasignar el formulario abierto a la nueva sucursal.
2. Detener nuevas operaciones mientras se realiza el cambio y validar el nuevo contexto en el servidor.
3. Limpiar selecciones, formularios y resultados que dependen del contexto; invalidar o separar cachés por empresa y sucursal.
4. Cancelar o ignorar respuestas tardías de la sucursal anterior. No permitir que una consulta iniciada antes del cambio reemplace los datos actuales.
5. Recargar listas, indicadores, calendarios, filtros y catálogos dependientes de la nueva sucursal.
6. Una operación de guardado iniciada con un contexto conserva ese contexto hasta finalizar. No leer una sucursal global que pudo cambiar durante la petición.
7. Revalidar contexto y permisos en otras pestañas abiertas; no conservar acceso operativo después de una revocación.

El cierre de sesión debe limpiar el contexto. El almacenamiento local y los datos simulados también deben estar separados por su alcance; evitar claves generales que compartan información entre empresas, sucursales o usuarios.

## 4. Módulos que se deben revisar y corregir

Revisar todas las acciones existentes: listar, buscar, filtrar, consultar detalle, crear, editar, cancelar, eliminar, imprimir, exportar y enviar documentos. Aplicar sólo las acciones que correspondan a cada módulo.

| Módulo | Revisión necesaria |
| --- | --- |
| Inicio / Dashboard | Indicadores, actividad reciente y saludo consistentes con el usuario y la sucursal activa. |
| Pacientes | Alcance del catálogo, búsqueda, expediente y vínculos entre sucursales de una misma empresa. |
| Consulta Externa | Paciente, médico, sucursal y consulta vinculados correctamente; conservar motivo y diagnóstico al pasar a Receta. |
| Recetas | Relación con paciente y consulta, sucursal de emisión, histórico, impresión y envío de documentos. |
| Historia Clínica | Acceso al expediente y asociación de su elaboración; preservar la estructura validada por la API. |
| Citas | Calendario, disponibilidad, médico y unidad de trabajo; revisar la prevención de duplicados según las reglas existentes. |
| Inventario | Existencias y movimientos en su alcance correcto; vínculo con medicamentos y recetas; separación de datos simulados. |
| Procedimientos | Catálogo según su alcance real, registros diarios, contador por día e histórico. |
| Control diario | Atenciones, procedimientos, totales y datos del paciente correspondientes al contexto autorizado. |
| Reportes / Estadísticas | Filtros, totales, PDF, Excel y otras exportaciones sin mezclar empresas o sucursales. |
| Usuarios / Perfiles | Empresa, sucursales asignadas, rol, permisos y exclusión del superadministrador para el administrador. |
| Empresas / Sucursales / Consultorios | Jerarquía real, asignaciones y estados activos. |
| Configuración | Separar parámetros de plataforma, empresa, sucursal y usuario conforme a su finalidad. |
| Archivos y documentos | Autorización al generar, descargar, imprimir y enviar; evitar acceso por enlace directo a documentos ajenos. |

Localizar cualquier otro módulo que use estos datos e incluirlo en la corrección. Revisar relaciones y peticiones de forma centralizada, evitando soluciones diferentes en cada pantalla.

No agregar propiedades a los payloads sin comprobar el contrato. Conservar nombres de campos, enumeraciones y estructura de objetos aceptados por la API; actualizar el contrato y las validaciones del backend cuando una ampliación sea necesaria.

## 5. Roles y límites de acceso

Usar identificadores compatibles con el sistema. Si existen los roles `administrador`, `medico` y `auditor`, conservarlos; incorporar `super_administrador` o su equivalente conforme a las convenciones actuales.

| Perfil | Alcance y responsabilidades |
| --- | --- |
| Superadministrador | Todos los accesos del administrador al entrar al contexto de una empresa, más administración global de empresas, vigencias, suspensión y reactivación de acceso. |
| Administrador | Administración completa de su empresa dentro de sus sucursales autorizadas; selección de lugar de trabajo y gestión de permisos de sus médicos y auditores. |
| Médico / Doctor | Accesos actuales de su perfil y permisos adicionales que se le asignen expresamente, dentro de su empresa y sucursales autorizadas. |
| Auditor | Accesos actuales de auditoría y permisos adicionales asignados expresamente, dentro de su empresa y sucursales autorizadas. |

Antes de cambiar los permisos predeterminados, inventariar el comportamiento actual. Preservar los accesos existentes: el médico no recibe inventario por defecto y el auditor no recibe acceso al consultor por defecto. El nuevo módulo permitirá ampliar o restringir acciones autorizadas sin cambiar necesariamente su rol.

### 5.1. Superadministrador invisible para el administrador

El administrador **nunca podrá ver, seleccionar ni administrar el perfil Superadministrador**, ni sus cuentas, en su interfaz de gestión.

- Excluirlo de listas de usuarios, búsquedas, filtros, conteos, detalles, exportaciones, catálogos de roles y selectores de permisos accesibles al administrador.
- No enviar esos datos al frontend del administrador para después ocultarlos.
- Impedir que el administrador lo cree, lo asigne o modifique sus cuentas, contraseñas, permisos o sucursales.
- Rechazar intentos por URL directa, identificador conocido, payload manipulado, asignación masiva o llamada directa a la API.
- Mantener permisos de plataforma fuera del catálogo delegable por el administrador.
- Los registros técnicos internos pueden conservar la identidad real del actor. La vista de auditoría de la empresa debe evitar exponer cuentas o roles de superadministrador y mostrar una atribución neutral cuando corresponda, sin alterar el registro original.

El primer superadministrador debe provisionarse mediante un mecanismo seguro compatible con el proyecto, fuera del alta ordinaria del administrador y sin contraseñas fijas en el código.

## 6. Módulo exclusivo: Administración de plataforma

Crear un único módulo para que el superadministrador gestione todas las empresas y sus consultorios o sucursales desde una misma pantalla.

### 6.1. Información y acciones

Mostrar una lista con búsqueda, filtros y paginación. Incluir, como mínimo:

- Nombre de la empresa y contacto administrativo.
- Sucursales o consultorios asociados.
- Estado de acceso: activo, suspendido o inactivo, con su motivo cuando aplique.
- Inicio y fin del periodo contratado, fecha hasta la que tiene cobertura y días restantes.
- Historial de periodos, pagos registrados, suspensiones y reactivaciones.

Permitir al superadministrador registrar o actualizar empresas y sus unidades, consultar administradores asignados, registrar pagos y renovaciones, programar suspensión al terminar el periodo cubierto y reactivar el acceso cuando corresponda.

Un pago registrado debe conservar empresa, importe, fecha, referencia o nota, periodo que cubre y usuario que lo registró. Si ya hay un mecanismo de cobro o suscripciones, reutilizarlo. Si no existe, implementar registro administrativo de pagos; no incorporar una pasarela nueva como parte de esta tarea.

Antes de operar módulos de una empresa, el superadministrador debe entrar explícitamente en su contexto y seleccionar una sucursal. Mostrar ese contexto en todo momento y permitir volver al panel global. Su perfil global no justifica mezclar resultados clínicos de distintas empresas.

El administrador de una empresa no tiene acceso al panel global ni a otras empresas. Puede consultar el estado de su propia vigencia si se habilita esa vista, pero no alterar pagos, fechas de cobertura ni suspensiones.

## 7. Vigencia y bloqueo de la plataforma

### 7.1. Fin del periodo pagado

El superadministrador debe poder marcar una empresa para que su acceso se suspenda cuando termine el mes o periodo que ya tiene pagado, si no se registra una renovación. La empresa conserva acceso hasta concluir su cobertura.

Implementar una opción explícita **“Suspender al finalizar el periodo pagado”**, mostrando la fecha efectiva y solicitando confirmación. No convertir esa acción en una suspensión inmediata.

Separar fecha del pago, vencimiento de cobro y fin de cobertura. Utilizar la vigencia almacenada; no asumir que todos los meses tienen treinta días, que vencen el día primero o que registrar un pago cubre cualquier periodo automáticamente.

Si la vigencia se expresa como una fecha inclusive, el acceso termina al iniciar el día siguiente en la zona horaria configurada para la suscripción. Si se expresa como un instante de fin exclusivo, comparar directamente con ese instante. Usar una sola regla documentada y la hora del servidor.

### 7.2. Aplicación del bloqueo

- Validar el estado de acceso de la empresa en el backend al iniciar sesión y en cada petición operativa, incluyendo sesiones ya abiertas, trabajos de generación de documentos y descargas protegidas.
- El bloqueo afecta a todos los usuarios operativos de esa empresa; el administrador no puede desactivarlo ni cambiar el reloj del navegador para eludirlo.
- El proceso programado puede actualizar estados, pero el bloqueo efectivo debe funcionar aunque ese proceso se retrase o no se ejecute.
- Mantener disponible el panel global del superadministrador para registrar la renovación y gestionar la reactivación; sus accesos operativos dentro de la empresa suspendida siguen la misma restricción.
- Mostrar una pantalla clara: “El acceso de esta empresa está suspendido por vencimiento del periodo contratado. Contacta al administrador de la plataforma para renovar el servicio”. Ofrecer sólo información mínima de estado, soporte y salida de sesión.
- Conservar pacientes, expedientes y demás registros. Suspender acceso no elimina información.
- Aislar el bloqueo: la suspensión de una empresa no afecta a las demás.

Registrar cada renovación, corrección de pago, suspensión y reactivación con actor, fecha, motivo y valores anteriores y nuevos. Una renovación que extiende cobertura puede reactivar una suspensión por vencimiento; no debe levantar automáticamente una suspensión manual por otro motivo.

## 8. Módulo de permisos por perfil y usuario

Crear un módulo con permisos específicos por **módulo, acción y alcance**, para asignar o retirar accesos a médicos y auditores.

### 8.1. Gestión y reglas

- El administrador gestiona únicamente usuarios de su empresa y de sucursales sobre las que tenga autoridad. El superadministrador puede hacerlo entrando en el contexto de esa empresa.
- Permitir configurar permisos base por perfil dentro de la empresa y excepciones por usuario, evitando que editar un perfil cambie los permisos de otras empresas.
- Separar “Heredar del perfil”, “Permitir” y “Denegar” por usuario. Si existe una denegación explícita por usuario, prevalece sobre el permiso heredado.
- Una excepción nunca supera los límites de empresa, sucursal, rol protegido o suspensión de servicio.
- Separar acciones operativas de administración de permisos. Poder editar una consulta no permite gestionar usuarios o conceder permisos.
- No permitir al administrador conceder privilegios globales, crear superadministradores, delegar más autoridad de la que tiene o elevar su propio alcance.
- Mostrar el permiso efectivo y de dónde proviene. Aplicar los cambios en sesiones abiertas sin exigir esperar al siguiente inicio de sesión.
- Validar en menús, botones, rutas y API. Un botón oculto no reemplaza la autorización del servidor.
- Registrar asignaciones y revocaciones; comprobar los permisos vigentes al ejecutar cada acción.

### 8.2. Catálogo mínimo de acciones

Las siguientes acciones son permisos separables. Incorporar sólo funcionalidades existentes o desarrolladas en esta tarea; no crear botones sin operación ni inventar acciones clínicas ausentes para completar la tabla.

| Módulo | Permisos desglosados |
| --- | --- |
| Inicio | Ver resumen, ver indicadores de la sucursal, ver consolidado de la empresa cuando esté autorizado. |
| Pacientes | Ver listado, buscar, consultar detalle, crear, editar, inactivar, consultar expediente, exportar. |
| Consulta Externa | Ver listado, consultar detalle, crear, editar, cancelar, eliminar si existe, imprimir o exportar. |
| Recetas | Ver histórico, consultar detalle, crear, editar, cancelar, eliminar si existe, imprimir, descargar y enviar. |
| Historia Clínica | Consultar, elaborar, editar, consultar versiones, imprimir y descargar cuando existan esas acciones. |
| Citas | Ver calendario, ver detalle, agendar, reprogramar, cancelar y gestionar estados existentes. |
| Inventario | Ver catálogo, ver existencias, crear medicamento, editar medicamento, registrar entradas, registrar salidas, hacer ajustes, ver movimientos y exportar. |
| Procedimientos | Ver catálogo, gestionar catálogo, registrar aplicación, editar o cancelar registro, consultar histórico y exportar. |
| Control diario | Consultar registros, ver totales, registrar o corregir datos si existe esa operación, imprimir y exportar. |
| Reportes / Estadísticas | Acceder a cada reporte existente, consultar, exportar PDF, exportar Excel y consultar consolidados autorizados. |
| Usuarios | Ver usuarios ordinarios, crear, editar, inactivar, restablecer acceso, asignar rol ordinario y asignar sucursales. |
| Configuración | Consultar y editar por separado los ajustes de empresa y de sucursal. |
| Permisos | Consultar permisos, gestionar permisos base de perfiles ordinarios y gestionar excepciones por usuario. |
| Archivos | Ver, descargar, generar, imprimir y enviar, en conjunto con el permiso del módulo de origen. |

Dividir también los permisos de administración de sucursales y consultorios si existen esas funciones. Mantener las operaciones de plataforma fuera de esta lista delegable.

### 8.3. Alcances y dependencias

El permiso responde **qué puede hacer** el usuario; el alcance responde **sobre qué información** puede hacerlo. Separar:

- Registros propios o asignados, cuando el módulo maneje esa relación.
- Registros de una o varias sucursales autorizadas.
- Consulta consolidada de la misma empresa, únicamente con autorización expresa.

Las operaciones de archivo, impresión y exportación requieren también acceso al registro de origen. La interfaz debe detectar dependencias: por ejemplo, crear una receta puede necesitar acceso a un selector de pacientes. Si éste debe mostrar sólo datos mínimos, implementarlo expresamente sin conceder consulta completa del expediente.

Ejemplos de configuración que deben funcionar:

1. Médico con permisos actuales y acceso adicional a existencias y movimientos de inventario, sin ajustes ni administración de medicamentos.
2. Auditor con lectura de Control diario y exportación de un reporte autorizado, sin crear ni modificar consultas.
3. Médico autorizado en dos sucursales que opera en la seleccionada, sin consultar ni guardar información de una tercera.
4. Usuario con un permiso heredado al que se aplica una denegación individual; el backend rechaza la acción inmediatamente.

### 8.4. Diseño del módulo

Mostrar empresa, usuario, perfil y sucursales autorizadas. Agrupar acciones por módulo con títulos y etiquetas comprensibles, búsqueda y controles compactos. Ofrecer seleccionar o quitar todas las acciones de un módulo, sin incluir permisos globales ocultos.

Antes de guardar, mostrar un resumen de cambios. Usar SweetAlert para confirmaciones y notificaciones si forma parte del proyecto. Mantener estilo limpio, responsive y consistente, sin exceso de tarjetas ni scroll horizontal.

## 9. Persistencia, compatibilidad y seguridad

- Las asignaciones de empresa, sucursal, roles, permisos y vigencias deben persistir en el backend. No usar `localStorage` como fuente de autorización o de pago.
- Centralizar la validación de contexto, permisos y estado de empresa para aplicarla a todos los endpoints, no sólo al inicio de sesión.
- Filtrar antes de paginar, contar, calcular indicadores y exportar. Proteger también consultas de detalle y mutaciones por identificador.
- Separar caches, archivos y claves de almacenamiento por el alcance que realmente les corresponde.
- Al cambiar de empresa o sucursal, capturar el contexto de peticiones y documentos para evitar cruces durante operaciones simultáneas.
- Preparar migraciones compatibles y una estrategia de transición para usuarios y datos existentes. Identificar registros sin empresa o sucursal antes de añadir restricciones.
- No asignar registros huérfanos a la primera sucursal ni modificar asociaciones históricas sin evidencia. Entregar el listado y la regla propuesta cuando no se pueda resolver su pertenencia.
- Mantener como simulados los módulos que ya lo sean, pero aislar sus datos y aplicar sus controles de interfaz. Documentar sus límites; no usarlos como sustituto de seguridad del backend.
- No añadir APIs, campos o enumeraciones inventados. Documentar cualquier cambio necesario del contrato real.

## 10. Orden de implementación

1. Diagnosticar la asociación incorrecta y mapear el modelo de empresa, sucursal y consultorio.
2. Corregir el contexto de trabajo y las validaciones del backend; actualizar todos los módulos afectados y revisar datos históricos.
3. Incorporar el superadministrador y asegurar su exclusión completa de los accesos del administrador.
4. Implementar Administración de plataforma, registro de periodos y bloqueo por vigencia.
5. Implementar el catálogo de permisos, permisos base, excepciones y alcance por usuario.
6. Completar pantallas, migraciones, verificaciones de regresión y documentación.

Si algunas capas están en un repositorio distinto, entregar los cambios y contratos pendientes con su ubicación. No dar por terminada la seguridad del flujo mientras exista un endpoint operativo sin las validaciones requeridas.

## 11. Criterios de aceptación y pruebas

Preparar escenarios con dos empresas, dos sucursales de una empresa y usuarios con distintos roles. Utilizar datos de prueba y los mecanismos de validación existentes.

- [ ] El administrador confirma su sucursal al ingresar y no puede operar sin un contexto válido.
- [ ] Cada alta conserva la empresa y unidad de trabajo correctas; las ediciones preservan la pertenencia original.
- [ ] Cambiar de sucursal actualiza todos los módulos, documentos e indicadores y no muestra respuestas tardías de la anterior.
- [ ] Formularios abiertos, guardados en curso, recarga de página, cierre de sesión y múltiples pestañas no provocan cruces de información.
- [ ] Un paciente compartido entre sucursales de su empresa conserva su expediente conforme a la política existente, sin duplicación automática.
- [ ] Alterar identificadores en una petición no permite consultar, modificar ni descargar datos de otra empresa o sucursal no autorizada.
- [ ] Listados, conteos, detalles, archivos y exportaciones respetan el mismo alcance.
- [ ] El administrador no recibe cuentas ni catálogos de superadministrador; tampoco puede crearlo o acceder a sus operaciones por API.
- [ ] El superadministrador dispone de los accesos de administrador al seleccionar empresa y sucursal, y del panel global exclusivo.
- [ ] Programar suspensión respeta el periodo pagado; verificar el instante anterior, exacto y posterior al fin de cobertura en la zona horaria definida.
- [ ] El vencimiento bloquea peticiones de sesiones abiertas aunque el proceso programado no se haya ejecutado.
- [ ] La suspensión de una empresa conserva sus datos y no afecta a otras empresas ni al panel global.
- [ ] Una renovación válida extiende cobertura y permite reactivación; no levanta una suspensión manual por otro motivo.
- [ ] Médico y Auditor conservan sus accesos predeterminados y reciben únicamente los permisos adicionales asignados.
- [ ] Permitir, denegar y heredar producen el resultado correcto en interfaz, rutas y API; revocar permisos afecta a sesiones abiertas.
- [ ] Gestionar permisos no permite elevarse a superadministrador ni ampliar el alcance fuera de la empresa autorizada.
- [ ] Consulta, Receta, Historia Clínica, Citas, Inventario, Procedimientos y Control diario conservan sus validaciones y funciones actuales.
- [ ] La aplicación compila y pasa las comprobaciones pertinentes del proyecto; las verificaciones no ejecutadas quedan identificadas.

## 12. Entrega esperada de Codex

Entregar la implementación con:

1. Causa comprobada del error de asociación y explicación del flujo corregido.
2. Archivos modificados y responsabilidad de cada cambio.
3. Modelo de alcance definitivo y matriz de permisos efectivos por perfil, acción y sucursal.
4. Migraciones, revisión de datos existentes y contratos de API actualizados cuando correspondan.
5. Instrucciones para provisionar el superadministrador, seleccionar sucursal, gestionar empresas, renovar cobertura y asignar permisos.
6. Evidencia de pruebas funcionales y de autorización, además de las comprobaciones de compilación pertinentes.
7. Dependencias o cambios pendientes en otros repositorios, sin presentarlos como implementados.

Actualizar la documentación del Consultorio Médico. Mantener Andromeda independiente y respetar las instrucciones de conexión del proyecto; no mover el código del consultorio dentro de Andromeda ni modificar su estructura como parte de esta tarea.
