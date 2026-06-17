import type { PacienteData } from '../services/pacientes/pacientes.service';

const PACIENTE_ATENCION_STORAGE_KEY = 'paciente_atencion_actual';

export const guardarPacienteAtencion = (paciente: PacienteData | null) => {
  try {
    if (!paciente) {
      localStorage.removeItem(PACIENTE_ATENCION_STORAGE_KEY);
      return;
    }

    localStorage.setItem(PACIENTE_ATENCION_STORAGE_KEY, JSON.stringify(paciente));
  } catch {
    // Evita romper la app si el navegador bloquea localStorage.
  }
};

export const cargarPacienteAtencion = (): PacienteData | null => {
  try {
    const data = localStorage.getItem(PACIENTE_ATENCION_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const limpiarPacienteAtencion = () => {
  try {
    localStorage.removeItem(PACIENTE_ATENCION_STORAGE_KEY);
  } catch {
    // Evita romper la app si el navegador bloquea localStorage.
  }
};
