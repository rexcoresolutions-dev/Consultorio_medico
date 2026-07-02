import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Spin,
  Typography,
  message,
} from 'antd';
import {
  PrinterOutlined,
  ReloadOutlined,
  FileDoneOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import axiosInstance from '../../api/axios.config';
import './ConsentimientoInformado.css';

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

  name?: string;
  correo?: string;
  email?: string;
  telefono?: string;

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

const DEFAULT_LUGAR = 'TEPEXI DE RODRÍGUEZ, PUEBLA';

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

const buildNombreCompleto = (usuario?: UsuarioMe): string => {
  if (!usuario) return 'MÉDICO RESPONSABLE';

  const nombrePorPartes = [
    usuario.nombre,
    usuario.primerApellido || usuario.primer_apellido,
    usuario.segundoApellido || usuario.segundo_apellido,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return nombrePorPartes || usuario.name || 'MÉDICO RESPONSABLE';
};

const getPrefijoMedico = (usuario?: UsuarioMe): string => {
  const genero = `${usuario?.genero || usuario?.sexo || ''}`.toLowerCase();

  if (
    genero.includes('masculino') ||
    genero.includes('hombre') ||
    genero === 'm'
  ) {
    return 'Dr.';
  }

  return 'Dra.';
};

const getFechaDocumento = (usuario?: UsuarioMe): string | undefined => {
  return (
    usuario?.fechaRegistro ||
    usuario?.fecha_registro ||
    usuario?.fechaCreacion ||
    usuario?.fecha_creacion ||
    usuario?.createdAt ||
    usuario?.created_at ||
    usuario?.registered_at
  );
};

const formatFecha = (value?: string): string => {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const getLugar = (usuario?: UsuarioMe): string => {
  const municipio = usuario?.municipio || usuario?.ciudad;
  const estado = usuario?.estado;

  if (municipio && estado) {
    return `${municipio}, ${estado}`.toUpperCase();
  }

  return DEFAULT_LUGAR;
};

const sanitizeFileName = (value: string) => {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
};

const ConsentimientoInformado: React.FC = () => {
  const documentRef = useRef<HTMLElement | null>(null);

  const [usuario, setUsuario] = useState<UsuarioMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const cargarUsuario = async () => {
    try {
      setLoading(true);
      setError('');

      let usuarioData: UsuarioMe | null = null;

      try {
        const response = await axiosInstance.get('/usuarios/me');
        usuarioData = extractUsuario(response.data);
      } catch {
        const response = await axiosInstance.get('/api/v1/usuarios/me');
        usuarioData = extractUsuario(response.data);
      }

      if (!usuarioData || !usuarioData.id) {
        throw new Error('La respuesta no contiene datos válidos del médico.');
      }

      setUsuario(usuarioData);
      return true;
    } catch (err) {
      console.error('Error al cargar usuario médico:', err);

      setError(
        'No se pudo cargar la información del médico. Revisa que la sesión esté activa y que axiosInstance esté apuntando correctamente a la API.'
      );

      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarUsuario();
  }, []);

  const datosDocumento = useMemo(() => {
    const fechaBase = getFechaDocumento(usuario || undefined);
    const fechaTexto = formatFecha(fechaBase);
    const lugarTexto = getLugar(usuario || undefined);
    const prefijo = getPrefijoMedico(usuario || undefined);
    const nombreMedico = buildNombreCompleto(usuario || undefined);
    const medicoCompleto = `${prefijo} ${nombreMedico}`.toUpperCase();

    return {
      fechaBase,
      fechaTexto,
      lugarTexto,
      medicoCompleto,
      nombreArchivo: sanitizeFileName(nombreMedico || 'medico'),
      cedula:
        usuario?.cedulaProfesional ||
        usuario?.cedula_profesional ||
        '',
      especialidad: usuario?.especialidad || '',
    };
  }, [usuario]);

  const buildPrintableHtml = () => {
    const content = documentRef.current?.outerHTML || '';

    return `
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <title>Consentimiento informado</title>
          <style>
            @page {
              size: letter;
              margin: 14mm;
            }

            * {
              box-sizing: border-box;
            }

            html,
            body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              color: #1f2937;
              font-family: Arial, Helvetica, sans-serif;
            }

            .consent-document {
              width: 100%;
              min-height: auto;
              padding: 0;
              background: #ffffff;
              color: #1f2937;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 12px;
              line-height: 1.5;
              letter-spacing: 0.01em;
              text-transform: none;
            }

            .consent-doc-header {
              text-align: center;
              margin-bottom: 42px;
            }

            .consent-doc-header p {
              margin: 0 0 20px;
              font-weight: 700;
              text-transform: uppercase;
            }

            .consent-doc-header h1 {
              margin: 0;
              font-size: 18px;
              font-weight: 900;
              letter-spacing: 0.08em;
              text-transform: uppercase;
            }

            .consent-doc-body {
              display: grid;
              gap: 18px;
            }

            .consent-doc-body p {
              margin: 0;
              text-align: justify;
              font-weight: 500;
            }

            .consent-underline {
              text-decoration: underline;
              text-underline-offset: 2px;
              font-weight: 800;
              text-transform: uppercase;
            }

            .consent-signature-section {
              margin-top: 78px;
              display: flex;
              justify-content: center;
            }

            .consent-signature {
              width: 420px;
              max-width: 100%;
              text-align: center;
            }

            .consent-signature span {
              display: block;
              width: 100%;
              height: 1px;
              background: #1f2937;
              margin-bottom: 10px;
            }

            .consent-signature p {
              margin: 0;
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
            }

            .consent-signature strong {
              display: block;
              margin-top: 8px;
              font-size: 11px;
              font-weight: 900;
              text-transform: uppercase;
            }

            .consent-doctor-info {
              margin-top: 34px;
              display: grid;
              gap: 4px;
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
            }

            .consent-doctor-info p {
              margin: 0;
            }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `;
  };

  const printFromIframe = () => {
    if (!documentRef.current) {
      message.warning('El documento todavía no está listo para imprimirse.');
      return;
    }

    const iframe = document.createElement('iframe');

    iframe.title = 'Impresión consentimiento informado';
    iframe.style.position = 'fixed';
    iframe.style.left = '-10000px';
    iframe.style.top = '0';
    iframe.style.width = '900px';
    iframe.style.height = '1200px';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.style.border = '0';

    document.body.appendChild(iframe);

    const iframeDocument =
      iframe.contentDocument || iframe.contentWindow?.document;

    if (!iframeDocument || !iframe.contentWindow) {
      iframe.remove();
      message.error('No se pudo abrir la vista de impresión.');
      return;
    }

    iframeDocument.open();
    iframeDocument.write(buildPrintableHtml());
    iframeDocument.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();

      setTimeout(() => {
        iframe.remove();
      }, 1000);
    }, 350);
  };

  const handlePrint = () => {
    printFromIframe();
  };

  const handleDownload = async () => {
    if (!documentRef.current) {
      message.warning('El documento todavía no está listo para descargarse.');
      return;
    }

    try {
      setDownloading(true);

      const element = documentRef.current;

      const originalWidth = element.style.width;
      const originalMinHeight = element.style.minHeight;
      const originalPadding = element.style.padding;
      const originalBoxShadow = element.style.boxShadow;
      const originalBorder = element.style.border;

      element.style.width = '816px';
      element.style.minHeight = '1056px';
      element.style.padding = '70px 58px 52px';
      element.style.boxShadow = 'none';
      element.style.border = 'none';

      await new Promise((resolve) => setTimeout(resolve, 120));

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 816,
      });

      element.style.width = originalWidth;
      element.style.minHeight = originalMinHeight;
      element.style.padding = originalPadding;
      element.style.boxShadow = originalBoxShadow;
      element.style.border = originalBorder;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter',
        compress: true,
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const margin = 0;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const imgData = canvas.toDataURL('image/jpeg', 0.98);

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(
        `consentimiento-informado-${datosDocumento.nombreArchivo}.pdf`
      );

      message.success('PDF descargado correctamente.');
    } catch (err) {
      console.error('Error al descargar PDF:', err);
      message.error('No se pudo descargar el PDF.');
    } finally {
      setDownloading(false);
    }
  };

  const handleReload = async () => {
    const ok = await cargarUsuario();

    if (ok) {
      message.success('Información actualizada correctamente.');
    }
  };

  return (
    <section className="consent-page">
      <div className="consent-shell">
        <div className="consent-toolbar no-print">
          <div className="consent-toolbar-left">
            <div className="consent-heading">
              <div className="consent-heading-icon">
                <FileDoneOutlined />
              </div>

              <div>
                <Title level={3}>Consentimiento informado</Title>
                <Text>
                  Documento generado con los datos del médico registrado en la
                  plataforma.
                </Text>
              </div>
            </div>
          </div>

          <div className="consent-actions">
            <Button
              icon={<ReloadOutlined />}
              className="consent-secondary-btn"
              onClick={handleReload}
              loading={loading}
            >
              Actualizar
            </Button>

            <div className="consent-actions-divider" />

            <Button
              icon={<PrinterOutlined />}
              className="consent-print-btn"
              onClick={handlePrint}
              disabled={loading || !!error || downloading}
            >
              Imprimir
            </Button>

            <Button
              icon={<DownloadOutlined />}
              type="primary"
              className="consent-download-btn"
              onClick={handleDownload}
              loading={downloading}
              disabled={loading || !!error}
            >
              Descargar PDF
            </Button>
          </div>
        </div>

        {!loading && !error && !datosDocumento.fechaBase && (
          <Alert
            className="consent-alert no-print"
            type="info"
            showIcon
            message="La API no envió fecha de registro."
            description="El consentimiento se generó con la fecha actual. Si deseas usar la fecha exacta de registro del médico, el backend debe enviar fechaRegistro, createdAt o created_at."
          />
        )}

        {error && (
          <Alert
            className="consent-alert no-print"
            type="error"
            showIcon
            message="No se pudo generar el consentimiento informado"
            description={error}
          />
        )}

        <Card className="consent-card">
          {loading ? (
            <div className="consent-loading">
              <Spin size="large" />
              <Text>Cargando información del médico...</Text>
            </div>
          ) : (
            <article className="consent-document" ref={documentRef}>
              <header className="consent-doc-header">
                <p>
                  Fecha y lugar: {datosDocumento.fechaTexto},{' '}
                  {datosDocumento.lugarTexto}
                </p>

                <h1>Consentimiento informado</h1>
              </header>

              <div className="consent-doc-body">
                <p>
                  Por medio del presente documento manifiesto que, de manera
                  libre y voluntaria, acepto recibir atención médica por parte de{' '}
                  <span className="consent-underline">
                    {datosDocumento.medicoCompleto}
                  </span>
                  , profesional de la salud que cuenta con la preparación,
                  título y cédula profesional correspondiente para brindar la
                  valoración y orientación médica que requiero.
                </p>

                <p>
                  Declaro que se me ha explicado de forma clara y comprensible
                  la naturaleza de la atención médica, los posibles hallazgos
                  durante la valoración, las alternativas de manejo, así como
                  los beneficios, alcances y limitaciones que pueden presentarse
                  durante el proceso de diagnóstico y tratamiento.
                </p>

                <p>
                  Autorizo a{' '}
                  <span className="consent-underline">
                    {datosDocumento.medicoCompleto}
                  </span>{' '}
                  para realizar la valoración clínica correspondiente, emitir
                  indicaciones médicas, establecer el tratamiento que considere
                  adecuado y solicitar, cuando sea necesario, estudios de apoyo,
                  procedimientos diagnósticos o referencia a otros servicios de
                  salud.
                </p>

                <p>
                  Reconozco que todo acto médico puede implicar riesgos,
                  molestias o resultados variables, aun cuando se lleve a cabo
                  con apego a la práctica profesional. Asimismo, entiendo que la
                  evolución de mi estado de salud depende también de la
                  información que proporcione, del seguimiento de las
                  indicaciones médicas y de la respuesta individual de mi
                  organismo.
                </p>

                <p>
                  Bajo protesta de decir verdad, manifiesto que la información
                  proporcionada sobre mis antecedentes, síntomas, enfermedades
                  previas, medicamentos, alergias y demás datos relacionados con
                  mi salud es completa y veraz. En caso de omitir, modificar o
                  proporcionar información incorrecta, acepto que dicha situación
                  puede influir en el diagnóstico, tratamiento o evolución de mi
                  padecimiento.
                </p>
              </div>

              <div className="consent-signature-section">
                <div className="consent-signature">
                  <span />
                  <p>Nombre y firma del médico</p>
                  <strong>{datosDocumento.medicoCompleto}</strong>
                </div>
              </div>

              {(datosDocumento.especialidad || datosDocumento.cedula) && (
                <div className="consent-doctor-info">
                  {datosDocumento.especialidad && (
                    <p>Especialidad: {datosDocumento.especialidad}</p>
                  )}

                  {datosDocumento.cedula && (
                    <p>Cédula profesional: {datosDocumento.cedula}</p>
                  )}
                </div>
              )}
            </article>
          )}
        </Card>
      </div>
    </section>
  );
};

export default ConsentimientoInformado;