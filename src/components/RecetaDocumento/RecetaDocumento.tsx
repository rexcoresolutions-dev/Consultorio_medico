import React from 'react';
import { MedicineBoxOutlined } from '@ant-design/icons';
import useSystemConfig from '../../hooks/useSystemConfig';
import './RecetaDocumento.css';

export interface RecetaDocumentoProps {
  receta: any;
  consulta?: any;
  paciente?: any;
  className?: string;
  copyLabel?: 'COPIA MÉDICO' | 'COPIA PACIENTE';
  doubleCopy?: boolean;
}

const firstDefined = (...values: any[]) =>
  values.find((value) => value !== undefined && value !== null && value !== '');

const parseStoredJson = (key: string) => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const fullName = (person?: any) =>
  [
    person?.nombre ?? person?.name,
    person?.primerApellido ?? person?.primer_apellido,
    person?.segundoApellido ?? person?.segundo_apellido,
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

const patientName = (paciente?: any, consulta?: any, receta?: any) =>
  fullName(paciente) ||
  fullName(consulta?.paciente) ||
  fullName(receta?.paciente) ||
  fullName(receta?.consulta?.paciente) ||
  'Paciente';

const getCurrentUser = () =>
  parseStoredJson('user') ?? parseStoredJson('usuario') ?? parseStoredJson('auth_user') ?? {};

const doctorData = (receta?: any, consulta?: any) => {
  const current = getCurrentUser();
  const source =
    receta?.medico ??
    receta?.usuario ??
    receta?.createdBy ??
    receta?.consulta?.medico ??
    receta?.consulta?.usuario ??
    consulta?.medico ??
    consulta?.usuario ??
    current;

  return {
    nombre:
      fullName(source) ||
      source?.nombreCompleto ||
      source?.name ||
      fullName(current) ||
      current?.nombreCompleto ||
      'Médico tratante',
    cedula: firstDefined(
      source?.cedulaProfesional,
      source?.cedula_profesional,
      source?.cedula,
      source?.professionalLicense,
      current?.cedulaProfesional,
      current?.cedula_profesional,
      current?.cedula,
      '',
    ),
    especialidad: firstDefined(
      source?.especialidad,
      source?.specialty,
      current?.especialidad,
      current?.specialty,
      source?.rol?.descripcion,
      source?.rol?.nombre,
      current?.rol?.descripcion,
      current?.rol?.nombre,
      'Médico',
    ),
  };
};

const getPacienteEdad = (paciente?: any) => {
  const fecha = firstDefined(paciente?.fecha_nacimiento, paciente?.fechaNacimiento);
  if (!fecha) return '-';
  const nacimiento = new Date(fecha);
  if (Number.isNaN(nacimiento.getTime())) return '-';
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const deltaMes = hoy.getMonth() - nacimiento.getMonth();
  if (deltaMes < 0 || (deltaMes === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return `${edad} años`;
};

const extractMedicamentos = (receta?: any): any[] => {
  const items =
    receta?.medicamentos ??
    receta?.detalleMedicamentos ??
    receta?.detalle_medicamentos ??
    receta?.items ??
    [];
  return Array.isArray(items) ? items : [];
};

const extractDiagnostico = (consulta?: any, receta?: any) => {
  const diagnosticos =
    consulta?.diagnosticos ?? receta?.consulta?.diagnosticos ?? receta?.diagnosticos ?? [];
  const item = Array.isArray(diagnosticos) ? diagnosticos[0] : null;
  return firstDefined(
    item?.diagnostico?.clave && item?.diagnostico?.nombre
      ? `${item.diagnostico.clave} - ${item.diagnostico.nombre}`
      : null,
    item?.clave && (item?.diagnostico ?? item?.descripcion)
      ? `${item.clave} - ${item?.diagnostico ?? item?.descripcion}`
      : null,
    item?.diagnostico?.nombre,
    item?.diagnostico?.text,
    item?.nombre,
    item?.text,
    item?.descripcion,
    consulta?.descripcion,
    consulta?.motivoConsulta,
    receta?.consulta?.descripcion,
    receta?.consulta?.motivoConsulta,
    'Sin diagnóstico relacionado',
  );
};

const medicationName = (item: any) =>
  firstDefined(
    item?.medicamentoNombre,
    item?.medicamento_nombre,
    item?.nombre,
    item?.sustanciaActiva,
    item?.sustancia_activa,
    'Medicamento',
  );

const medicationSubtitle = (item: any) =>
  [
    firstDefined(item?.sustanciaActiva, item?.sustancia_activa),
    item?.concentracion,
    item?.formaFarmaceutica ?? item?.forma_farmaceutica,
  ]
    .filter(Boolean)
    .join(' · ');

const medicationTreatment = (item: any) => {
  const dosis = firstDefined(
    item?.dosis,
    item?.cantidad && item?.unidad ? `${item.cantidad} ${item.unidad}` : null,
  );
  const frecuencia = firstDefined(item?.frecuencia, item?.frecuenciaTexto);
  const duracion = item?.duracion
    ? `${item.duracion} ${firstDefined(item?.unidadTiempo, item?.unidad_tiempo, '')}`.trim()
    : '';

  return [dosis, frecuencia, duracion].filter(Boolean).join(' · ') || '-';
};

const RecetaCopy: React.FC<{
  receta: any;
  consulta?: any;
  paciente?: any;
  copyLabel: 'COPIA MÉDICO' | 'COPIA PACIENTE';
}> = ({ receta, consulta, paciente, copyLabel }) => {
  const systemConfig = useSystemConfig();
  const doctor = doctorData(receta, consulta);
  const pacienteFuente =
    paciente ?? consulta?.paciente ?? receta?.consulta?.paciente ?? receta?.paciente ?? {};
  const medicamentos = extractMedicamentos(receta);
  const seguimiento = Boolean(receta?.programarSeguimiento ?? receta?.programar_seguimiento);
  const proximaCita = seguimiento
    ? formatDate(receta?.fechaSeguimiento ?? receta?.fecha_seguimiento)
    : 'No programada';
  const estudios = Boolean(
    receta?.solicitarEstudiosClinicos ?? receta?.solicitar_estudios_clinicos,
  );
  const fechaReceta = firstDefined(receta?.fecha, receta?.createdAt, receta?.created_at);

  return (
    <section className="clinical-rx-copy">
      <div className="clinical-rx-watermark">{systemConfig.nombreCorto}</div>

      <header className="clinical-rx-header">
        <div className="clinical-rx-brand">
          <span className={`clinical-rx-logo ${systemConfig.logoDataUrl ? 'has-image' : ''}`}>
            {systemConfig.logoDataUrl ? (
              <>
                <MedicineBoxOutlined />
                <img
                  src={systemConfig.logoDataUrl}
                  alt=""
                  crossOrigin="anonymous"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                    event.currentTarget.parentElement?.classList.remove('has-image');
                  }}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', position: 'absolute', inset: 0, background: 'inherit' }}
                />
              </>
            ) : (
              <MedicineBoxOutlined />
            )}
          </span>
          <div>
            <strong>{systemConfig.nombreCorto}</strong>
            <small>RECETA MÉDICA</small>
          </div>
        </div>

        <div className="clinical-rx-meta">
          <span className="clinical-rx-copy-label">{copyLabel}</span>
          <span>Fecha de elaboración</span>
          <strong>{formatDateTime(fechaReceta)}</strong>
          {receta?.id && <small>Folio #{receta.id}</small>}
        </div>
      </header>

      <div className="clinical-rx-rule" />

      <div className="clinical-rx-layout">
        <aside className="clinical-rx-sidebar">
          <div className="clinical-rx-doctor-box">
            <span>MÉDICO TRATANTE</span>
            <strong>{doctor.nombre}</strong>
            <small>{doctor.especialidad}</small>
          </div>

          <div className="clinical-rx-doctor-box">
            <span>CÉDULA PROFESIONAL</span>
            <strong>{doctor.cedula || '__________________'}</strong>
          </div>

          <div className="clinical-rx-section-block">
            <h3>PACIENTE</h3>
            <div className="clinical-rx-info-box">
              <span>NOMBRE</span>
              <strong>{patientName(pacienteFuente, consulta, receta)}</strong>
            </div>

            <div className="clinical-rx-mini-grid">
              <div>
                <span>EXPEDIENTE</span>
                <strong>{firstDefined(
                  pacienteFuente?.numero_expediente,
                  pacienteFuente?.numeroExpediente,
                  receta?.consulta?.paciente?.numero_expediente,
                  '-',
                )}</strong>
              </div>
              <div>
                <span>EDAD</span>
                <strong>{getPacienteEdad(pacienteFuente)}</strong>
              </div>
              <div>
                <span>SEXO</span>
                <strong>{firstDefined(pacienteFuente?.sexo, pacienteFuente?.genero, '-')}</strong>
              </div>
            </div>
          </div>

          <div className="clinical-rx-section-block clinical-rx-history">
            <h3>ANTECEDENTES</h3>
            <div className="clinical-rx-info-box">
              <span>ALERGIAS</span>
              <strong>{firstDefined(
                consulta?.alergias,
                consulta?.antecedente?.alergias,
                receta?.consulta?.alergias,
                receta?.alergias,
                'NO REFIERE',
              )}</strong>
            </div>
          </div>
        </aside>

        <main className="clinical-rx-body">
          <section className="clinical-rx-diagnosis">
            <h3>DIAGNÓSTICO</h3>
            <div className="clinical-rx-info-box clinical-rx-info-box--diagnosis">
              <strong>{extractDiagnostico(consulta, receta)}</strong>
            </div>
          </section>

          <section className="clinical-rx-rp">
            <div className="clinical-rx-rp-title">
              <h3>Rp.</h3>
              <small>{medicamentos.length} medicamento(s)</small>
            </div>

            {medicamentos.length ? (
              <ol className="clinical-rx-medications">
                {medicamentos.slice(0, 10).map((item, index) => (
                  <li key={String(item?.id ?? item?.inventarioId ?? `${medicationName(item)}-${index}`)}>
                    <div className="clinical-rx-med-main">
                      <strong>{medicationName(item)}</strong>
                      {medicationSubtitle(item) && <small>{medicationSubtitle(item)}</small>}
                    </div>
                    <div className="clinical-rx-med-treatment">
                      <strong>{medicationTreatment(item)}</strong>
                      <small>Vía: {firstDefined(item?.viaAdministracion, item?.via_administracion, '-')}</small>
                      {firstDefined(item?.indicaciones, item?.observaciones) && (
                        <em>{firstDefined(item?.indicaciones, item?.observaciones)}</em>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="clinical-rx-empty">Sin tratamientos registrados.</div>
            )}
          </section>

          <section className="clinical-rx-instructions">
            <h3>INDICACIONES GENERALES</h3>
            <div>{receta?.observaciones || 'Sin indicaciones generales.'}</div>
          </section>

          <section className="clinical-rx-followup-grid">
            <div>
              <span>PRÓXIMA CITA</span>
              <strong>{proximaCita}</strong>
            </div>
            <div>
              <span>ESTUDIOS CLÍNICOS</span>
              <strong>{estudios ? 'Sí' : 'No'}</strong>
            </div>
            <div className="clinical-rx-followup-detail">
              <span>DETALLE DE ESTUDIOS</span>
              <strong>
                {estudios
                  ? firstDefined(
                      receta?.detalleEstudiosClinicos,
                      receta?.detalle_estudios_clinicos,
                      'Sin detalle adicional.',
                    )
                  : 'No aplica'}
              </strong>
            </div>
          </section>
        </main>
      </div>

      <footer className="clinical-rx-footer">
        <div className="clinical-rx-signature">
          <span />
          <strong>Firma del médico</strong>
        </div>
        <p>
          Esta receta es válida únicamente con firma del médico tratante. Acuda a revisión si
          presenta datos de alarma o reacción adversa al tratamiento.
        </p>
      </footer>
    </section>
  );
};

export const RecetaDocumento: React.FC<RecetaDocumentoProps> = ({
  receta,
  consulta,
  paciente,
  className = '',
  copyLabel,
  doubleCopy = true,
}) => {
  if (!doubleCopy || copyLabel) {
    return (
      <article className={`clinical-rx-sheet clinical-rx-sheet--single ${className}`.trim()}>
        <RecetaCopy
          receta={receta}
          consulta={consulta}
          paciente={paciente}
          copyLabel={copyLabel ?? 'COPIA PACIENTE'}
        />
      </article>
    );
  }

  return (
    <article className={`clinical-rx-sheet ${className}`.trim()}>
      <RecetaCopy receta={receta} consulta={consulta} paciente={paciente} copyLabel="COPIA MÉDICO" />
      <div className="clinical-rx-cut" aria-hidden="true">
        <span>✂</span>
        <div />
      </div>
      <RecetaCopy receta={receta} consulta={consulta} paciente={paciente} copyLabel="COPIA PACIENTE" />
    </article>
  );
};

export default RecetaDocumento;
