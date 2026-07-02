import React, { useMemo, useRef, useState } from 'react';
import { App, Button, Card, Typography } from 'antd';
import {
  DownloadOutlined,
  PrinterOutlined,
  SafetyCertificateOutlined,
  FileProtectOutlined,
} from '@ant-design/icons';
import jsPDF from 'jspdf';
import './AvisoPrivacidad.css';

const { Title, Text } = Typography;

const COMPANY_NAME = 'RexCoreSolutions';
const APP_NAME = 'RexCore Salud';
const PRIVACY_EMAIL = 'rexcoresolutions@gmail.com';

type AvisoSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

const formatDate = (date: Date) => {
  return date.toLocaleDateString('es-MX', {
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

const AvisoPrivacidad: React.FC = () => {
  const { message } = App.useApp();
  const documentRef = useRef<HTMLElement | null>(null);

  const [downloading, setDownloading] = useState(false);
  const [printing, setPrinting] = useState(false);

  const fechaActualizacion = useMemo(() => formatDate(new Date()), []);

  const sections: AvisoSection[] = useMemo(
    () => [
      {
        title: '1. Responsable del tratamiento de datos personales',
        paragraphs: [
          `${COMPANY_NAME}, en adelante “EL RESPONSABLE”, es responsable del tratamiento, uso, resguardo y protección de los datos personales que sean recabados, registrados o administrados a través de la aplicación ${APP_NAME}, en adelante “LA APLICACIÓN”.`,
          `El presente Aviso de Privacidad tiene como finalidad informar a los usuarios, pacientes, médicos, personal administrativo y demás titulares de datos personales sobre las condiciones bajo las cuales se tratará su información dentro de LA APLICACIÓN.`,
        ],
      },
      {
        title: '2. Datos personales que podrán recabarse',
        paragraphs: [
          'Para la operación de LA APLICACIÓN podrán recabarse datos personales de identificación, contacto, administrativos, profesionales, clínicos y documentales, dependiendo del tipo de usuario y de las funciones utilizadas dentro del sistema.',
        ],
        bullets: [
          'Datos de identificación: nombre completo, edad, sexo, fecha de nacimiento, CURP, número de expediente o identificadores internos.',
          'Datos de contacto: teléfono, correo electrónico y medios de contacto proporcionados por el titular.',
          'Datos profesionales: nombre del médico, especialidad, cédula profesional, consultorio, clínica o unidad médica.',
          'Datos administrativos: usuario, rol, permisos, sucursal, fechas de acceso, historial de actividad y registros de operación.',
          'Datos clínicos: antecedentes, signos vitales, diagnósticos, tratamientos, recetas, notas de evolución, estudios, certificados, hojas de referencia y demás información relacionada con la atención médica.',
          'Documentos y archivos: formatos médicos, consentimientos, certificados, estudios clínicos, archivos adjuntos, imágenes o documentos PDF cargados en LA APLICACIÓN.',
        ],
      },
      {
        title: '3. Datos personales sensibles',
        paragraphs: [
          'Dentro de LA APLICACIÓN podrán tratarse datos personales sensibles relacionados con el estado de salud presente, pasado o futuro de los pacientes, antecedentes médicos, diagnósticos, tratamientos, alergias, padecimientos, hábitos, evolución clínica y demás información necesaria para la atención médica.',
          'Estos datos serán tratados únicamente para finalidades relacionadas con la prestación, administración, seguimiento y documentación de servicios médicos o clínicos dentro del sistema.',
        ],
      },
      {
        title: '4. Finalidades primarias',
        paragraphs: [
          'Los datos personales recabados serán utilizados para las finalidades necesarias que dan origen a la relación entre el titular, la clínica, el médico tratante, el personal autorizado y LA APLICACIÓN.',
        ],
        bullets: [
          'Crear, administrar y actualizar expedientes clínicos.',
          'Registrar consultas, procedimientos, notas médicas y evolución del paciente.',
          'Generar recetas, certificados médicos, hojas de referencia, consentimientos informados y demás documentos clínicos.',
          'Permitir el seguimiento médico, administrativo y operativo de los pacientes.',
          'Gestionar usuarios, roles, permisos y accesos dentro de LA APLICACIÓN.',
          'Mantener trazabilidad, auditoría y seguridad de las operaciones realizadas.',
          'Atender solicitudes de soporte, mantenimiento, mejora técnica y continuidad operativa del sistema.',
          'Cumplir obligaciones legales, regulatorias, administrativas o requerimientos de autoridades competentes.',
        ],
      },
      {
        title: '5. Finalidades secundarias',
        paragraphs: [
          'De forma adicional, la información podrá utilizarse para finalidades que no son indispensables para la relación principal, pero que permiten mejorar la calidad, seguridad y funcionamiento de LA APLICACIÓN.',
        ],
        bullets: [
          'Generar estadísticas internas de uso, rendimiento y operación del sistema.',
          'Mejorar la experiencia de usuario, diseño, estabilidad y seguridad de la plataforma.',
          'Realizar análisis internos con información disociada o anonimizada cuando sea posible.',
          'Enviar comunicados operativos o informativos relacionados con actualizaciones del sistema.',
        ],
      },
      {
        title: '6. Transferencias de datos personales',
        paragraphs: [
          'Los datos personales no serán vendidos, rentados o comercializados. Sin embargo, podrán compartirse cuando sea necesario para cumplir las finalidades descritas en este Aviso de Privacidad o cuando exista una obligación legal.',
        ],
        bullets: [
          'Con autoridades sanitarias, judiciales, administrativas o regulatorias cuando exista requerimiento legal.',
          'Con clínicas, consultorios, médicos, personal autorizado o instituciones participantes en la atención del paciente.',
          'Con proveedores tecnológicos, servicios de alojamiento, respaldo, soporte, seguridad o mantenimiento que actúen bajo instrucciones de EL RESPONSABLE.',
          'Con terceros estrictamente necesarios para la operación, conservación, soporte o continuidad de LA APLICACIÓN.',
        ],
      },
      {
        title: '7. Uso de tecnologías, cookies y almacenamiento local',
        paragraphs: [
          'LA APLICACIÓN podrá utilizar tecnologías como almacenamiento local, sesiones, identificadores técnicos, registros de acceso y herramientas similares para mantener activa la sesión del usuario, recordar configuraciones, resguardar información temporal y mejorar la seguridad del sistema.',
          'El usuario puede configurar su navegador para limitar o eliminar estas tecnologías; sin embargo, algunas funciones de LA APLICACIÓN podrían verse afectadas.',
        ],
      },
      {
        title: '8. Conservación de la información',
        paragraphs: [
          'Los datos personales serán conservados durante el tiempo necesario para cumplir las finalidades descritas, atender obligaciones legales, administrativas, clínicas, contractuales o regulatorias, y posteriormente podrán ser bloqueados, eliminados o anonimizados conforme a los procedimientos internos aplicables.',
        ],
      },
      {
        title: '9. Medidas de seguridad',
        paragraphs: [
          `${COMPANY_NAME} implementará medidas administrativas, técnicas y físicas razonables para proteger los datos personales contra daño, pérdida, alteración, destrucción, uso, acceso o tratamiento no autorizado.`,
        ],
        bullets: [
          'Control de acceso mediante usuarios, contraseñas y roles.',
          'Separación de permisos por tipo de usuario.',
          'Registro de operaciones relevantes dentro del sistema.',
          'Restricción de acceso a información clínica conforme al perfil autorizado.',
          'Mecanismos de respaldo, continuidad y seguridad técnica cuando sean implementados en producción.',
        ],
      },
      {
        title: '10. Derechos ARCO y revocación del consentimiento',
        paragraphs: [
          'El titular podrá solicitar el acceso, rectificación, cancelación u oposición respecto de sus datos personales, así como revocar su consentimiento cuando legalmente sea procedente.',
          `Para ejercer estos derechos, el titular podrá enviar una solicitud al correo ${PRIVACY_EMAIL}, indicando nombre completo, medio de contacto, derecho que desea ejercer, descripción clara de la solicitud y documento que acredite su identidad o representación legal.`,
        ],
      },
      {
        title: '11. Datos de menores de edad o personas incapaces',
        paragraphs: [
          'Cuando se traten datos personales de menores de edad o personas incapaces, estos deberán ser proporcionados y autorizados por quien ejerza la patria potestad, tutela, representación legal o autorización correspondiente, procurando siempre la protección del interés superior del menor y la confidencialidad de la información.',
        ],
      },
      {
        title: '12. Cambios al Aviso de Privacidad',
        paragraphs: [
          `${COMPANY_NAME} podrá modificar, actualizar o complementar el presente Aviso de Privacidad para atender cambios legales, técnicos, operativos o funcionales de LA APLICACIÓN.`,
          'Las modificaciones estarán disponibles dentro de LA APLICACIÓN o por el medio que EL RESPONSABLE determine para informar a los titulares.',
        ],
      },
    ],
    []
  );

  const buildPdf = () => {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter',
      compress: true,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const marginX = 16;
    const marginTop = 15;
    const marginBottom = 16;
    const contentWidth = pageWidth - marginX * 2;
    const pageBottom = pageHeight - marginBottom;

    let pageNumber = 1;
    let y = marginTop;

    const addHeader = () => {
      pdf.setFillColor(21, 159, 163);
      pdf.roundedRect(marginX, marginTop, 13, 13, 3, 3, 'F');

      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.text('RC', marginX + 6.5, marginTop + 8.2, { align: 'center' });

      pdf.setTextColor(22, 57, 59);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.text('AVISO DE PRIVACIDAD INTEGRAL', marginX + 17, marginTop + 5);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.7);
      pdf.setTextColor(96, 120, 123);
      pdf.text(
        `${APP_NAME} · Aplicación de gestión clínica desarrollada por ${COMPANY_NAME}`,
        marginX + 17,
        marginTop + 10
      );

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.2);
      pdf.text('Versión 1.0', pageWidth - marginX, marginTop + 4.5, {
        align: 'right',
      });
      pdf.text(
        `Actualización: ${fechaActualizacion}`,
        pageWidth - marginX,
        marginTop + 9,
        { align: 'right' }
      );

      pdf.setDrawColor(21, 159, 163);
      pdf.setLineWidth(0.7);
      pdf.line(marginX, marginTop + 17, pageWidth - marginX, marginTop + 17);

      y = marginTop + 24;
    };

    const addFooter = () => {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(130, 145, 148);
      pdf.text(`Página ${pageNumber}`, pageWidth - marginX, pageHeight - 8, {
        align: 'right',
      });
    };

    const addPage = () => {
      addFooter();
      pdf.addPage('letter', 'portrait');
      pageNumber += 1;
      addHeader();
    };

    const ensureSpace = (needed: number) => {
      if (y + needed > pageBottom) {
        addPage();
      }
    };

    const addTextBlock = (
      text: string,
      options?: {
        fontSize?: number;
        lineHeight?: number;
        bold?: boolean;
        bullet?: boolean;
        color?: [number, number, number];
        marginAfter?: number;
      }
    ) => {
      const fontSize = options?.fontSize ?? 8.4;
      const lineHeight = options?.lineHeight ?? 4.4;
      const marginAfter = options?.marginAfter ?? 2;
      const bulletIndent = options?.bullet ? 5 : 0;
      const color = options?.color ?? [38, 56, 58];

      pdf.setFont('helvetica', options?.bold ? 'bold' : 'normal');
      pdf.setFontSize(fontSize);
      pdf.setTextColor(color[0], color[1], color[2]);

      const lines = pdf.splitTextToSize(
        text,
        contentWidth - bulletIndent
      ) as string[];

      lines.forEach((line, index) => {
        ensureSpace(lineHeight + marginAfter);

        if (options?.bullet && index === 0) {
          pdf.text('•', marginX, y);
        }

        pdf.text(line, marginX + bulletIndent, y);
        y += lineHeight;
      });

      y += marginAfter;
    };

    const addSectionTitle = (title: string) => {
      const lines = pdf.splitTextToSize(
        title.toUpperCase(),
        contentWidth
      ) as string[];

      const needed = lines.length * 4.6 + 4;
      ensureSpace(needed + 8);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9.2);
      pdf.setTextColor(22, 57, 59);

      lines.forEach((line) => {
        pdf.text(line, marginX, y);
        y += 4.6;
      });

      y += 2;
    };

    const addIntro = () => {
      const intro = `${COMPANY_NAME} pone a disposición de los titulares el presente Aviso de Privacidad Integral para informar de manera clara el tratamiento que se dará a los datos personales recabados, registrados, consultados, almacenados o administrados mediante ${APP_NAME}, aplicación orientada a la gestión clínica, administrativa y documental de servicios médicos.`;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.2);
      pdf.setTextColor(38, 56, 58);

      const lines = pdf.splitTextToSize(intro, contentWidth - 10) as string[];
      const lineHeight = 4.2;
      const boxHeight = lines.length * lineHeight + 9;

      ensureSpace(boxHeight + 6);

      pdf.setFillColor(243, 251, 251);
      pdf.setDrawColor(202, 234, 235);
      pdf.roundedRect(marginX, y, contentWidth, boxHeight, 3, 3, 'FD');

      let introY = y + 6.2;

      lines.forEach((line) => {
        pdf.text(line, marginX + 5, introY);
        introY += lineHeight;
      });

      y += boxHeight + 7;
    };

    const addFinalNotes = () => {
      ensureSpace(28);

      pdf.setDrawColor(214, 230, 231);
      pdf.line(marginX, y, pageWidth - marginX, y);
      y += 6;

      addTextBlock(
        `Medio de contacto: Para dudas, aclaraciones o solicitudes relacionadas con este Aviso de Privacidad, el titular podrá comunicarse al correo ${PRIVACY_EMAIL}.`,
        {
          fontSize: 8.2,
          lineHeight: 4.3,
          marginAfter: 2,
        }
      );

      addTextBlock(
        `Este documento es una base editable para implementación en la aplicación. El correo institucional, responsable interno y alcance final deberán ser revisados y validados por ${COMPANY_NAME} antes de su publicación definitiva.`,
        {
          fontSize: 8.2,
          lineHeight: 4.3,
          marginAfter: 2,
        }
      );
    };

    addHeader();
    addIntro();

    sections.forEach((section) => {
      addSectionTitle(section.title);

      section.paragraphs?.forEach((paragraph) => {
        addTextBlock(paragraph, {
          fontSize: 8.4,
          lineHeight: 4.4,
          marginAfter: 2.2,
        });
      });

      section.bullets?.forEach((bullet) => {
        addTextBlock(bullet, {
          fontSize: 8.25,
          lineHeight: 4.3,
          marginAfter: 1.6,
          bullet: true,
        });
      });

      y += 2.5;
    });

    addFinalNotes();
    addFooter();

    return pdf;
  };

  const handlePrint = async () => {
    try {
      setPrinting(true);

      const pdf = buildPdf();
      pdf.autoPrint();

      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');

      if (!printWindow) {
        message.warning('El navegador bloqueó la ventana de impresión.');
      }

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 20000);
    } catch (error) {
      console.error('Error al imprimir aviso:', error);
      message.error('No se pudo preparar la impresión.');
    } finally {
      setPrinting(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);

      const pdf = buildPdf();

      pdf.save(
        `${sanitizeFileName(`aviso-privacidad-${APP_NAME}-${COMPANY_NAME}`)}.pdf`
      );

      message.success('PDF descargado correctamente.');
    } catch (error) {
      console.error('Error al descargar PDF:', error);
      message.error('No se pudo descargar el PDF.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="privacy-page">
      <div className="privacy-shell">
        <div className="privacy-toolbar no-print">
          <div className="privacy-toolbar-left">
            <div className="privacy-page-icon">
              <SafetyCertificateOutlined />
            </div>

            <div>
              <Title level={3}>Aviso de privacidad</Title>
              <Text>
                Documento integral para la aplicación clínica de{' '}
                {COMPANY_NAME}.
              </Text>
            </div>
          </div>

          <div className="privacy-actions">
            <Button
              icon={<PrinterOutlined />}
              className="privacy-print-btn"
              onClick={handlePrint}
              loading={printing}
            >
              Imprimir
            </Button>

            <Button
              type="primary"
              icon={<DownloadOutlined />}
              className="privacy-download-btn"
              onClick={handleDownloadPdf}
              loading={downloading}
            >
              Descargar PDF
            </Button>
          </div>
        </div>

        <Card className="privacy-card">
          <article className="privacy-document" ref={documentRef}>
            <header className="privacy-document-header">
              <div className="privacy-brand">
                <div className="privacy-brand-mark">
                  <FileProtectOutlined />
                </div>

                <div>
                  <h1>Aviso de privacidad integral</h1>
                  <p>
                    {APP_NAME} · Aplicación de gestión clínica desarrollada por{' '}
                    {COMPANY_NAME}
                  </p>
                </div>
              </div>

              <div className="privacy-doc-meta">
                <span className="privacy-version-pill">Versión 1.0</span>
                <p>Última actualización: {fechaActualizacion}</p>
                <p>Responsable: {COMPANY_NAME}</p>
              </div>
            </header>

            <section className="privacy-intro">
              <strong>{COMPANY_NAME}</strong> pone a disposición de los
              titulares el presente Aviso de Privacidad Integral para informar
              de manera clara el tratamiento que se dará a los datos personales
              recabados, registrados, consultados, almacenados o administrados
              mediante <strong>{APP_NAME}</strong>, aplicación orientada a la
              gestión clínica, administrativa y documental de servicios médicos.
            </section>

            <main className="privacy-sections">
              {sections.map((section) => (
                <section className="privacy-section" key={section.title}>
                  <h2>{section.title}</h2>

                  {section.paragraphs?.map((paragraph, index) => (
                    <p key={`${section.title}-p-${index}`}>{paragraph}</p>
                  ))}

                  {!!section.bullets?.length && (
                    <ul>
                      {section.bullets.map((bullet, index) => (
                        <li key={`${section.title}-b-${index}`}>{bullet}</li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </main>

            <footer className="privacy-footer">
              <p>
                <strong>Medio de contacto:</strong> Para dudas, aclaraciones o
                solicitudes relacionadas con este Aviso de Privacidad, el titular
                podrá comunicarse al correo{' '}
                <strong>{PRIVACY_EMAIL}</strong>.
              </p>

              <p>
                Este documento es una base editable para implementación en la
                aplicación. El correo institucional, responsable interno y
                alcance final deberán ser revisados y validados por{' '}
                {COMPANY_NAME} antes de su publicación definitiva.
              </p>
            </footer>
          </article>
        </Card>
      </div>
    </section>
  );
};

export default AvisoPrivacidad;