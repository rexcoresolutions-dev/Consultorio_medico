# Acceso y primer ingreso

**Estado:** Implementado

- El login acepta correo electrónico o nombre de usuario en un único campo.
- Los nuevos nombres de usuario usan el primer nombre normalizado y dos dígitos aleatorios generados en servidor.
- Existe una restricción única global para impedir ambigüedad entre empresas.
- La migración asigna identificadores a cuentas existentes sin modificar contraseñas, empresas, roles o sucursales.

Implementado: configuración empresarial de vigencia, cifrado del secreto predeterminado, marca de contraseña temporal, caducidad, bloqueo de endpoints operativos y pantalla obligatoria de cambio inicial. Al cambiarla se invalida la temporal y se exige iniciar sesión de nuevo.

El alta aplica automáticamente la política empresarial: genera una temporal segura o usa la predeterminada cifrada, calcula su caducidad, obliga el cambio inicial y prepara el correo después de confirmar la cuenta. El correo conserva temporalmente el secreto cifrado y lo elimina tras la aceptación SMTP. El servidor vuelve a validar rol ordinario, empresa y sucursales.

“Restablecer acceso” emite una temporal nueva desde el servidor. Antes de guardarla cancela trabajos de acceso anteriores que todavía no fueron aceptados, elimina sus secretos y marca la cuenta para cambio obligatorio. La interfaz nunca permite que un administrador asigne directamente una contraseña permanente.

El identificador definitivo se reserva en el servidor. La propuesta visible permite cambiar la base, pero mantiene los dos dígitos aleatorios y la restricción única global evita ambigüedad entre empresas.
