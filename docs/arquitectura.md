# Arquitectura

**Estado:** Requisito / descripción real

- Frontend React 19 + TypeScript + Vite: `C:\xampp\htdocs\Consultorio_medico`.
- API NestJS 11 + Prisma 7 + MySQL: `C:\xampp\htdocs\api-medica`.
- Autenticación JWT. El token transporta usuario, empresa, sucursal y rol.
- El contexto de empresa de Superadministrador usa `X-Empresa-Id`; la sucursal concreta usa `X-Sucursal-Id`.
- El consolidado no inventa un identificador de sucursal: omite `X-Sucursal-Id` y la API resuelve el alcance autorizado.
- PWA, Tauri, Capacitor y sincronización offline siguen pendientes.
