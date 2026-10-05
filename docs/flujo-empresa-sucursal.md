# Flujo de empresa y sucursal

**Estado:** Implementado parcialmente

- Superadministrador elige primero una empresa desde Plataforma.
- Administrador ve sólo sucursales activas asignadas mediante `usuario_sucursales`.
- Cero sucursales: no se asigna una ajena; las operaciones que exigen sucursal deben bloquearse.
- Una sucursal: se activa automáticamente sin modal de confirmación.
- Dos o más: se puede elegir una sucursal o **Ver todas las sucursales**.
- El consolidado representa el conjunto autorizado de la empresa y nunca se envía como `sucursalId`.
- Las altas clínicas, recetas, inventario y demás operaciones que exigen trazabilidad requieren una sucursal concreta.

Pendiente: centralizar las métricas del dashboard en endpoints agregados y cancelar respuestas obsoletas al cambiar rápidamente de contexto.
