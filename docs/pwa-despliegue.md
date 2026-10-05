# Despliegue PWA

**Estado:** Implementado parcialmente

La PWA requiere HTTPS en producción. `manifest.webmanifest` y `sw.js` deben publicarse en la raíz del dominio y no redirigirse al HTML de la SPA. El service worker sólo cachea recursos de aplicación; omite `/api/` y `/resources/` para no guardar expedientes, autenticación ni archivos clínicos en una caché pública.

La cola operativa se guarda cifrada en IndexedDB y se desbloquea únicamente en el mismo perfil del navegador. Esto protege frente a lectura casual del almacenamiento, pero una PWA no dispone del almacén seguro nativo de Windows o Android. Los adaptadores Tauri y Capacitor deberán usar el almacén seguro de cada plataforma.
