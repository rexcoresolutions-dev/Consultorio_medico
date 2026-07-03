import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, message, Skeleton, Typography } from 'antd';
import {
  DownloadOutlined,
  FileProtectOutlined,
  PrinterOutlined,
  ReloadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import jsPDF from 'jspdf';
import axiosInstance from '../../api/axios.config';
import './AvisoMedicoComodatario.css';

const { Title, Text } = Typography;

type UsuarioMe = {
  id?: number;

  rolId?: number;
  rol_id?: number;
  rolNombre?: string;

  empresaId?: number;
  empresaNombre?: string;

  sucursalId?: number;
  sucursalNombre?: string;

  nombre?: string;
  primerApellido?: string;
  segundoApellido?: string;

  primer_apellido?: string;
  segundo_apellido?: string;

  apellido_paterno?: string;
  apellido_materno?: string;

  name?: string;
  correo?: string;
  email?: string;
  telefono?: string;

  cedula?: string;
  cedulaProfesional?: string;
  cedula_profesional?: string;

  especialidad?: string;

  genero?: string;
  sexo?: string;

  municipio?: string;
  ciudad?: string;
  estado?: string;

  fechaRegistro?: string;
  fecha_registro?: string;
  fechaCreacion?: string;
  fecha_creacion?: string;
  createdAt?: string;
  created_at?: string;
  registered_at?: string;

  ultimoAcceso?: string;
};

type AvisoSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

const extractUsuario = (payload: any): UsuarioMe => {
  return (
    payload?.data?.usuario ||
    payload?.data?.user ||
    payload?.data?.medico ||
    payload?.data ||
    payload?.usuario ||
    payload?.user ||
    payload?.medico ||
    payload ||
    {}
  );
};

const hasUsuarioValido = (usuario?: UsuarioMe | null): boolean => {
  if (!usuario) return false;

  return Boolean(
    usuario.id ||
      usuario.nombre ||
      usuario.name ||
      usuario.email ||
      usuario.correo ||
      usuario.primerApellido ||
      usuario.primer_apellido
  );
};

const buildNombreCompleto = (usuario?: UsuarioMe | null): string => {
  if (!usuario) return 'MÉDICO RESPONSABLE';

  const nombrePorPartes = [
    usuario.nombre,
    usuario.primerApellido || usuario.primer_apellido || usuario.apellido_paterno,
    usuario.segundoApellido || usuario.segundo_apellido || usuario.apellido_materno,
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return nombrePorPartes || usuario.name || 'MÉDICO RESPONSABLE';
};

const getPrefijoMedico = (usuario?: UsuarioMe | null): string => {
  const genero = `${usuario?.genero || usuario?.sexo || ''}`
    .trim()
    .toLowerCase();

  if (
    genero.includes('femenino') ||
    genero.includes('mujer') ||
    genero === 'f'
  ) {
    return 'Dra.';
  }

  if (
    genero.includes('masculino') ||
    genero.includes('hombre') ||
    genero === 'm'
  ) {
    return 'Dr.';
  }

  return '';
};

const getCedulaProfesional = (usuario?: UsuarioMe | null): string => {
  return (
    usuario?.cedulaProfesional ||
    usuario?.cedula_profesional ||
    usuario?.cedula ||
    ''
  );
};

const getEspecialidad = (usuario?: UsuarioMe | null): string => {
  return usuario?.especialidad || '';
};

const getLugar = (usuario?: UsuarioMe | null): string => {
  const municipio = usuario?.municipio || usuario?.ciudad;
  const estado = usuario?.estado;

  if (municipio && estado) {
    return `${municipio}, ${estado}`.toUpperCase();
  }

  return 'TEPEXI DE RODRÍGUEZ, PUEBLA';
};

const getUsuarioFromStorage = (): UsuarioMe | null => {
  try {
    const rawUser = localStorage.getItem('user');

    if (!rawUser) return null;

    const parsedUser = JSON.parse(rawUser);
    const usuario = extractUsuario(parsedUser);

    return hasUsuarioValido(usuario) ? usuario : null;
  } catch {
    return null;
  }
};

const formatFecha = (): string => {
  return new Date().toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const sanitizeFileName = (value: string) => {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
};

const AvisoMedicoComodatario: React.FC = () => {
  const [usuario, setUsuario] = useState<UsuarioMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fechaActual = useMemo(() => formatFecha(), []);

  const datosMedico = useMemo(() => {
    const nombreMedico = buildNombreCompleto(usuario);
    const prefijo = getPrefijoMedico(usuario);
    const medicoCompleto = prefijo
      ? `${prefijo} ${nombreMedico}`
      : nombreMedico;

    return {
      nombreMedico,
      medicoCompleto,
      medicoCompletoMayusculas: medicoCompleto.toUpperCase(),
      cedulaProfesional: getCedulaProfesional(usuario),
      especialidad: getEspecialidad(usuario),
      lugar: getLugar(usuario),
      nombreArchivo: sanitizeFileName(nombreMedico || 'medico-responsable'),
    };
  }, [usuario]);

  const seccionesAviso = useMemo<AvisoSection[]>(() => {
    const datosIdentificacion: string[] = [];

    if (datosMedico.cedulaProfesional) {
      datosIdentificacion.push(
        `Para efectos de identificación profesional, el médico responsable cuenta con cédula profesional ${datosMedico.cedulaProfesional}.`
      );
    }

    if (datosMedico.especialidad) {
      datosIdentificacion.push(
        `Especialidad o área profesional registrada: ${datosMedico.especialidad}.`
      );
    }

    return [
      {
        title: 'I. Responsable del tratamiento de datos personales',
        paragraphs: [
          `En cumplimiento con lo dispuesto por la Ley Federal de Protección de Datos Personales en Posesión de los Particulares, su Reglamento, los Lineamientos del Aviso de Privacidad y demás disposiciones aplicables, se pone a disposición del paciente el presente Aviso de Privacidad, con la finalidad de informarle de manera clara, precisa y formal sobre el tratamiento que se dará a sus datos personales y datos personales sensibles.`,
          `${datosMedico.medicoCompletoMayusculas}, en su carácter de médico responsable de la atención clínica y, en su caso, médico comodatario autorizado para prestar servicios profesionales de salud, será responsable del tratamiento, resguardo y uso adecuado de los datos personales proporcionados por el paciente, exclusivamente para los fines relacionados con la prestación de servicios médicos.`,
          ...datosIdentificacion,
        ],
      },
      {
        title: 'II. Datos personales que podrán recabarse',
        paragraphs: [
          'Para brindar una atención médica adecuada, segura y continua, el médico responsable podrá recabar de forma directa los datos personales necesarios para identificar al paciente, integrar su expediente clínico y proporcionar seguimiento a su atención médica.',
        ],
        bullets: [
          'Nombre completo.',
          'Fecha de nacimiento, edad y sexo.',
          'Teléfono, correo electrónico u otros medios de contacto.',
          'Datos generales de identificación.',
          'Antecedentes heredofamiliares.',
          'Antecedentes personales patológicos y no patológicos.',
          'Hábitos, alergias, padecimientos y medicación actual.',
          'Signos vitales y datos derivados de la exploración física.',
          'Motivo de consulta, diagnóstico, evolución clínica y pronóstico.',
          'Tratamiento indicado, recetas, referencias médicas y seguimiento.',
          'Resultados de estudios clínicos, laboratorio, gabinete o documentos relacionados con la atención médica.',
        ],
      },
      {
        title: 'III. Datos personales sensibles',
        paragraphs: [
          'Se consideran datos personales sensibles aquellos relacionados con el estado de salud presente, pasado o futuro del paciente, antecedentes clínicos, diagnósticos, tratamientos, resultados de estudios, información genética, alergias, padecimientos, discapacidades, hábitos, consumo de medicamentos y cualquier otra información necesaria para la valoración médica.',
          'El tratamiento de dichos datos se realizará únicamente cuando resulte indispensable para proporcionar atención médica, integrar el expediente clínico, emitir documentos relacionados con la consulta y cumplir con las obligaciones profesionales, éticas y legales aplicables al servicio de salud.',
        ],
      },
      {
        title: 'IV. Finalidades del tratamiento de datos personales',
        paragraphs: [
          'Los datos personales y datos personales sensibles del paciente serán utilizados para las siguientes finalidades primarias:',
        ],
        bullets: [
          'Integrar, actualizar, conservar y consultar el expediente clínico del paciente.',
          'Brindar atención médica, valoración clínica, diagnóstico, tratamiento, seguimiento y orientación profesional.',
          'Elaborar recetas médicas, notas de evolución, certificados, hojas de referencia, consentimientos informados y demás documentos clínicos necesarios.',
          'Registrar antecedentes, signos vitales, exploración física, diagnósticos, indicaciones, tratamientos y pronóstico.',
          'Dar seguimiento a consultas, procedimientos, estudios, referencias, interconsultas o atenciones posteriores.',
          'Mantener comunicación con el paciente para asuntos directamente relacionados con su atención médica.',
          'Cumplir con obligaciones derivadas de la relación médico-paciente y con requerimientos emitidos por autoridades competentes, cuando legalmente proceda.',
        ],
      },
      {
        title: 'V. Finalidades secundarias',
        paragraphs: [
          'De manera secundaria, los datos personales podrán utilizarse para recordatorios de citas, comunicación administrativa, seguimiento general del servicio o información relacionada con la continuidad de la atención médica. El paciente podrá manifestar su negativa para estas finalidades secundarias sin que ello afecte la prestación del servicio médico solicitado.',
        ],
      },
      {
        title: 'VI. Transferencia de datos personales',
        paragraphs: [
          'Los datos personales del paciente no serán transferidos a terceros sin su consentimiento, salvo en los casos permitidos por la legislación aplicable o cuando dicha transferencia sea necesaria para proteger la salud del paciente, atender una urgencia médica, realizar una referencia, interconsulta, estudio clínico, trámite administrativo indispensable o dar cumplimiento a un requerimiento de autoridad competente.',
          'Cuando resulte necesario compartir información con laboratorios, especialistas, instituciones de salud, aseguradoras o terceros vinculados con la atención del paciente, se procurará transferir únicamente la información estrictamente necesaria para cumplir la finalidad correspondiente.',
        ],
      },
      {
        title: 'VII. Medidas de seguridad',
        paragraphs: [
          'El médico responsable adoptará medidas administrativas, técnicas y físicas razonables para proteger los datos personales contra daño, pérdida, alteración, destrucción, uso, acceso, divulgación o tratamiento no autorizado.',
          'La información clínica será utilizada únicamente por personal autorizado y exclusivamente para fines relacionados con la prestación del servicio médico, la continuidad de la atención y el cumplimiento de obligaciones legales aplicables.',
        ],
      },
      {
        title: 'VIII. Derechos ARCO y revocación del consentimiento',
        paragraphs: [
          'El paciente podrá ejercer en cualquier momento sus derechos de Acceso, Rectificación, Cancelación u Oposición respecto de sus datos personales, así como revocar el consentimiento otorgado para su tratamiento, conforme a los términos establecidos en la legislación aplicable.',
          'Para ejercer dichos derechos, el paciente deberá presentar una solicitud directamente ante el médico responsable, señalando con claridad el derecho que desea ejercer y proporcionando los datos necesarios para acreditar su identidad. La atención de la solicitud estará sujeta a las obligaciones legales, médicas, administrativas y de conservación documental que resulten aplicables.',
        ],
      },
      {
        title: 'IX. Conservación de la información',
        paragraphs: [
          'Los datos personales y documentos clínicos serán conservados durante el tiempo que resulte necesario para cumplir con las finalidades que dieron origen a su tratamiento, así como con las obligaciones legales, profesionales, administrativas y de responsabilidad médica que resulten aplicables.',
        ],
      },
      {
        title: 'X. Cambios al aviso de privacidad',
        paragraphs: [
          'El presente Aviso de Privacidad podrá ser modificado o actualizado cuando existan cambios en la legislación aplicable, en los servicios prestados, en los procesos internos de atención o en las prácticas relacionadas con el tratamiento de datos personales.',
          'Las modificaciones estarán disponibles para consulta del paciente a través de los medios que el médico responsable determine para tal efecto.',
        ],
      },
      {
        title: 'XI. Consentimiento',
        paragraphs: [
          'Al proporcionar sus datos personales y recibir atención médica, el paciente manifiesta haber leído y comprendido el presente Aviso de Privacidad, aceptando el tratamiento de sus datos personales y datos personales sensibles conforme a las finalidades aquí descritas.',
        ],
      },
    ];
  }, [datosMedico]);

  const cargarDoctor = async (mostrarMensaje = false) => {
    try {
      setLoading(true);
      setError(null);

      const endpoints = ['/usuarios/me', '/api/v1/usuarios/me'];
      let ultimoError: unknown = null;

      for (const endpoint of endpoints) {
        try {
          const response = await axiosInstance.get(endpoint);
          const usuarioData = extractUsuario(response.data);

          if (hasUsuarioValido(usuarioData)) {
            setUsuario(usuarioData);
            localStorage.setItem('user', JSON.stringify(usuarioData));

            if (mostrarMensaje) {
              message.success('Datos del médico actualizados correctamente.');
            }

            return;
          }

          ultimoError = new Error(
            `La respuesta de ${endpoint} no contiene datos válidos.`
          );
        } catch (err) {
          ultimoError = err;
        }
      }

      const usuarioGuardado = getUsuarioFromStorage();

      if (usuarioGuardado) {
        setUsuario(usuarioGuardado);

        if (mostrarMensaje) {
          message.warning(
            'No se pudo consultar la API, pero se usaron los datos guardados de la sesión.'
          );
        }

        return;
      }

      console.error('Error al obtener datos del médico:', ultimoError);

      setError(
        'No se pudo cargar la información del médico. Revisa que la sesión esté activa y que axiosInstance esté apuntando correctamente a la API.'
      );

      message.error('No se pudieron cargar los datos del médico.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDoctor(false);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const marginX = 16;
      const marginTop = 16;
      const marginBottom = 16;
      const usableWidth = pageWidth - marginX * 2;

      let y = marginTop;

      const ensureSpace = (neededSpace: number) => {
        if (y + neededSpace > pageHeight - marginBottom) {
          pdf.addPage();
          y = marginTop;
        }
      };

      const addPageNumber = () => {
        const totalPages = pdf.getNumberOfPages();

        for (let i = 1; i <= totalPages; i += 1) {
          pdf.setPage(i);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          pdf.text(
            `Página ${i} de ${totalPages}`,
            pageWidth - marginX,
            pageHeight - 8,
            { align: 'right' }
          );
        }
      };

      const addCenteredText = (
        text: string,
        fontSize: number,
        fontStyle: 'normal' | 'bold' = 'normal',
        spacingAfter = 4
      ) => {
        pdf.setFont('helvetica', fontStyle);
        pdf.setFontSize(fontSize);

        const lines = pdf.splitTextToSize(text, usableWidth) as string[];
        const lineHeight = fontSize * 0.42;

        ensureSpace(lines.length * lineHeight + spacingAfter);

        lines.forEach((line) => {
          pdf.text(line, pageWidth / 2, y, { align: 'center' });
          y += lineHeight;
        });

        y += spacingAfter;
      };

      const addParagraph = (text: string, spacingAfter = 3) => {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10.2);

        const lines = pdf.splitTextToSize(text, usableWidth) as string[];
        const lineHeight = 4.8;

        ensureSpace(lines.length * lineHeight + spacingAfter);

        pdf.text(lines, marginX, y);
        y += lines.length * lineHeight + spacingAfter;
      };

      const addSectionTitle = (title: string) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10.8);

        const lines = pdf.splitTextToSize(
          title.toUpperCase(),
          usableWidth
        ) as string[];

        const lineHeight = 5;

        ensureSpace(lines.length * lineHeight + 3);

        pdf.text(lines, marginX, y);
        y += lines.length * lineHeight + 2;
      };

      const addBullets = (items: string[]) => {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);

        items.forEach((item) => {
          const lines = pdf.splitTextToSize(item, usableWidth - 8) as string[];
          const lineHeight = 4.6;

          ensureSpace(lines.length * lineHeight + 2);

          pdf.text('•', marginX + 2, y);
          pdf.text(lines, marginX + 7, y);

          y += lines.length * lineHeight + 1.4;
        });

        y += 2;
      };

      addCenteredText('AVISO DE PRIVACIDAD', 14, 'bold', 1);
      addCenteredText('Médico-paciente / Médico comodatario', 10.5, 'bold', 8);

      seccionesAviso.forEach((section) => {
        addSectionTitle(section.title);

        section.paragraphs.forEach((paragraph) => {
          addParagraph(paragraph);
        });

        if (section.bullets?.length) {
          addBullets(section.bullets);
        }

        y += 1.5;
      });

      ensureSpace(34);

      y += 10;
      pdf.setDrawColor(20, 20, 20);
      pdf.line(pageWidth / 2 - 45, y, pageWidth / 2 + 45, y);

      y += 6;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.text(datosMedico.medicoCompleto, pageWidth / 2, y, {
        align: 'center',
      });

      y += 5;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text('Médico responsable', pageWidth / 2, y, {
        align: 'center',
      });

      y += 10;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9.5);
      pdf.text(`${datosMedico.lugar}, a ${fechaActual}.`, pageWidth - marginX, y, {
        align: 'right',
      });

      addPageNumber();

      pdf.save(`aviso-medico-comodatario-${datosMedico.nombreArchivo}.pdf`);
      message.success('PDF descargado correctamente.');
    } catch (err) {
      console.error('Error al descargar PDF:', err);
      message.error('No se pudo generar el PDF.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="aviso-med-page">
      <div className="aviso-med-shell">
        <div className="aviso-med-compact-bar no-print">
          <div className="aviso-med-title-mini">
            <span className="aviso-med-title-icon">
              <FileProtectOutlined />
            </span>

            <div>
              <Title level={4}>Aviso médico comodatario</Title>
              <Text>Privacidad médico-paciente</Text>
            </div>
          </div>

          <div className="aviso-med-doctor-mini">
            <span className="aviso-med-doctor-mini-icon">
              <UserOutlined />
            </span>

            <div>
              <Text className="aviso-med-mini-label">Médico</Text>

              {loading ? (
                <Skeleton.Input active size="small" />
              ) : (
                <strong>{datosMedico.medicoCompleto}</strong>
              )}

              {!loading && (
                <span className="aviso-med-mini-detail">
                  {datosMedico.especialidad || 'Sin especialidad registrada'}
                  {datosMedico.cedulaProfesional
                    ? ` · Céd. ${datosMedico.cedulaProfesional}`
                    : ''}
                </span>
              )}
            </div>
          </div>

          <div className="aviso-med-actions-mini">
            <Button
              icon={<ReloadOutlined />}
              onClick={() => cargarDoctor(true)}
              disabled={loading || downloading}
            >
              Actualizar
            </Button>

            <Button
              icon={<PrinterOutlined />}
              onClick={handlePrint}
              disabled={loading || downloading}
            >
              Guardar
            </Button>

            <Button
              type="primary"
              icon={<DownloadOutlined />}
              className="aviso-med-download-btn"
              onClick={handleDownloadPdf}
              loading={downloading}
              disabled={loading}
            >
              Descargar
            </Button>
          </div>
        </div>

        {error && (
          <Alert
            className="aviso-med-alert no-print"
            type="warning"
            showIcon
            message="Aviso"
            description={error}
          />
        )}

        <div className="aviso-med-print-area">
          <article className="aviso-med-document">
            <header className="aviso-med-doc-header">
              <h1>AVISO DE PRIVACIDAD</h1>
              <h2>Médico-paciente / Médico comodatario</h2>
            </header>

            {seccionesAviso.map((section) => (
              <section className="aviso-med-section" key={section.title}>
                <h3>{section.title}</h3>

                {section.paragraphs.map((paragraph, index) => (
                  <p key={`${section.title}-paragraph-${index}`}>
                    {paragraph}
                  </p>
                ))}

                {section.bullets && (
                  <ul>
                    {section.bullets.map((bullet, index) => (
                      <li key={`${section.title}-bullet-${index}`}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            <footer className="aviso-med-signatures">
              <div className="aviso-med-signature">
                <div className="aviso-med-line" />
                <p>{datosMedico.medicoCompleto}</p>
                <span>Médico responsable</span>
              </div>
            </footer>

            <div className="aviso-med-doc-date">
              {datosMedico.lugar}, a {fechaActual}.
            </div>
          </article>
        </div>
      </div>
    </section>
  );
};

export default AvisoMedicoComodatario;