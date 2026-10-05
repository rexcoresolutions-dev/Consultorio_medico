# Multiplataforma

**Estado:** Implementado; artefactos de distribución no compilados

- Web: PWA instalable con recursos locales y almacenamiento operativo separado de la caché pública.
- Windows: Tauri 2 con recursos empaquetados localmente.
- Android: Capacitor y proyecto reproducible para APK de prueba; la firma release queda fuera del repositorio.

Los contenedores deben funcionar con recursos locales y no limitarse a abrir la URL de producción.

Implementado: manifest web, iconos PNG 192/512, registro del service worker, caché versionada del cascarón y apertura independiente. Tauri usa `com.rexcoresolutions.consultorio`, recursos locales y ventana mínima apta para el sistema. Capacitor contiene el proyecto Android nativo y copia los recursos desde `dist`.

Comandos:

- `npm run pwa:build`: genera la web/PWA.
- `npm run desktop:dev`: abre Tauri en desarrollo.
- `npm run desktop:build`: genera instaladores de escritorio según la plataforma.
- `npm run android:sync`: compila la web y sincroniza Android.
- `npm run android:open`: abre el proyecto en Android Studio.
- `npm run android:apk:debug`: genera el APK de depuración.

La URL de API se toma de `VITE_API_URL`; producción apunta a la API HTTPS. Una versión release Android requiere una clave de firma externa y la identidad de publicación. No se guardan keystores, contraseñas ni certificados en el repositorio. Los instaladores y el APK no se compilaron en esta fase por la indicación de no ejecutar pruebas/compilaciones.
