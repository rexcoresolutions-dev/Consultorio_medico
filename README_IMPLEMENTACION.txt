HISTORIA CLINICA + CONSULTA EXTERNA - FLUJO INTEGRADO
=====================================================

OBJETIVO
- No sustituir el flujo previo del expediente.
- Consulta Externa debe aparecer en Historiales disponibles.
- Historia Clinica sigue siendo un documento propio y completo.
- Al crear una Historia Clinica, los signos vitales y datos clinicos recientes se precargan desde la ultima Consulta Externa.
- Los antecedentes longitudinales se conservan desde la ultima Historia Clinica.

FUENTES
1) GET /api/v1/consultas?pacienteId=...
   - Consulta externa
   - signosVitales
   - diagnosticos
   - motivo, tratamiento y referencia

2) GET /api/v1/historia-clinica?pacienteId=...
   - Historias clinicas integrales
   - antecedentes familiares/personales/gineco-obstetricos

HISTORIA CLINICA
Al abrir "Nuevo historial":
- Peso, altura, IMC, temperatura, presion, FC, FR, SpO2 y cintura: ultima Consulta Externa.
- Motivo y diagnostico: ultima Consulta Externa.
- Antecedentes completos: ultima Historia Clinica.
- Los campos siguen editables antes de guardar.

HISTORIALES DISPONIBLES
Integra cronologicamente:
- Consulta externa
- Historia clinica

Cada registro conserva su origen y el boton Ver consulta el endpoint correcto:
- Consulta externa -> GET /consultas/{id}
- Historia clinica -> GET /historia-clinica/{id}

ARCHIVOS
- src/pages/HistorialClinico/HistorialClinico.tsx
- src/pages/HistorialClinico/HistorialesDisponibles.tsx
- src/services/expediente-clinico/expediente-clinico.service.ts (nuevo)
- src/services/historia-clinica/historia-clinica.service.ts

NOTA
El payload exacto de POST/PATCH /historia-clinica sigue centralizado en historia-clinica.service.ts. Cuando se tenga el JSON exacto de Swagger, cualquier diferencia del DTO puede ajustarse en un solo lugar sin volver a cambiar el flujo de las pantallas.
