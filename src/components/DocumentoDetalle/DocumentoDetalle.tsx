import type { ReactNode } from 'react';

const labels: Record<string, string> = {
  ta: 'Presión arterial', fc: 'Frecuencia cardíaca', fr: 'Frecuencia respiratoria',
  spo2: 'Saturación de oxígeno', temp: 'Temperatura', imc: 'Índice de masa corporal',
  detalle: 'Detalle', diagnosticos: 'Diagnósticos', estudios: 'Estudios solicitados',
  motivoConsulta: 'Motivo de consulta', signosVitales: 'Signos vitales',
};
const hidden = new Set(['id', 'paciente_id', 'pacienteId', 'paciente', 'empresaId', 'sucursalId', 'usuarioId', 'medicoId', 'consultaId', 'createdAt', 'updatedAt', 'fecha_elaboracion', 'diagnostico_select', 'estudio_select']);
const title = (key: string) => labels[key] ?? key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, letter => letter.toUpperCase());

export default function DocumentoDetalle({ datos }: { datos: unknown }): ReactNode {
  if (datos === undefined || datos === null || datos === '') return null;
  if (typeof datos === 'boolean') return datos ? 'Sí' : 'No';
  if (typeof datos !== 'object') return <span style={{ whiteSpace: 'pre-wrap' }}>{String(datos)}</span>;
  if (Array.isArray(datos)) return <ol>{datos.map((item, index) => <li key={index}><DocumentoDetalle datos={item} /></li>)}</ol>;
  return <dl>{Object.entries(datos).filter(([key, value]) => !hidden.has(key) && value !== null && value !== undefined && value !== '').map(([key, value]) => (
    <div key={key} style={{ marginBottom: 12 }}>
      <dt><strong>{title(key)}</strong></dt>
      <dd style={{ marginLeft: 0 }}><DocumentoDetalle datos={value} /></dd>
    </div>
  ))}</dl>;
}
