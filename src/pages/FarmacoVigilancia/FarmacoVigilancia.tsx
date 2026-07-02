import React, { useEffect, useMemo, useState } from 'react';
import {
  App,
  Button,
  Card,
  Empty,
  Spin,
  Tag,
  Typography,
  Upload,
} from 'antd';
import type { RcFile } from 'antd/es/upload/interface';
import {
  CloudUploadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileDoneOutlined,
  FileImageOutlined,
  FilePdfOutlined,
} from '@ant-design/icons';
import './FarmacoVigilancia.css';

const { Title, Text } = Typography;

const FARMACO_VIGILANCIA_STORAGE_KEY = 'farmaco_vigilancia_archivo';
const MAX_FILE_SIZE_MB = 6;

type StoredFarmacoFile = {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  uploadedAt: string;
  uploadedBy?: string;
};

type UsuarioStorage = {
  nombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
  primer_apellido?: string;
  segundo_apellido?: string;
  rolNombre?: string;
};

const getCurrentUserName = (): string => {
  try {
    const rawUser = localStorage.getItem('user');

    if (!rawUser) return 'Médico responsable';

    const user: UsuarioStorage = JSON.parse(rawUser);

    const fullName = [
      user.nombre,
      user.primerApellido || user.primer_apellido,
      user.segundoApellido || user.segundo_apellido,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    return fullName || 'Médico responsable';
  } catch {
    return 'Médico responsable';
  }
};

const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
};

const formatBytes = (bytes: number): string => {
  if (!bytes) return '0 KB';

  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, index);

  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const formatDateTime = (value: string): string => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';

  return date.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const isPdfFile = (file?: StoredFarmacoFile | null): boolean => {
  if (!file) return false;

  return (
    file.type === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf')
  );
};

const isImageFile = (file?: StoredFarmacoFile | null): boolean => {
  if (!file) return false;

  return (
    file.type.startsWith('image/') ||
    /\.(png|jpg|jpeg|webp)$/i.test(file.name)
  );
};

const isAllowedFile = (file: RcFile): boolean => {
  const name = file.name.toLowerCase();

  return (
    file.type === 'application/pdf' ||
    file.type.startsWith('image/') ||
    name.endsWith('.pdf') ||
    name.endsWith('.png') ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.webp')
  );
};

const FarmacoVigilancia: React.FC = () => {
  const { message, modal } = App.useApp();

  const [archivo, setArchivo] = useState<StoredFarmacoFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const medicoNombre = useMemo(() => getCurrentUserName(), []);

  useEffect(() => {
    try {
      const storedFile = localStorage.getItem(FARMACO_VIGILANCIA_STORAGE_KEY);

      if (storedFile) {
        setArchivo(JSON.parse(storedFile));
      }
    } catch {
      localStorage.removeItem(FARMACO_VIGILANCIA_STORAGE_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFileUpload = async (file: RcFile) => {
    if (!isAllowedFile(file)) {
      message.error('Solo puedes cargar archivos PDF o imágenes.');
      return;
    }

    const maxSize = MAX_FILE_SIZE_MB * 1024 * 1024;

    if (file.size > maxSize) {
      message.error(`El archivo no debe superar ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }

    try {
      setSaving(true);

      const dataUrl = await readFileAsDataURL(file);

      const newFile: StoredFarmacoFile = {
        id: `farmaco-${Date.now()}`,
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        dataUrl,
        uploadedAt: new Date().toISOString(),
        uploadedBy: medicoNombre,
      };

      localStorage.setItem(
        FARMACO_VIGILANCIA_STORAGE_KEY,
        JSON.stringify(newFile)
      );

      setArchivo(newFile);

      message.success(
        archivo
          ? 'Archivo actualizado correctamente.'
          : 'Archivo cargado correctamente.'
      );
    } catch (error) {
      console.error('Error al guardar archivo:', error);
      message.error(
        'No se pudo guardar el archivo. Puede que sea demasiado pesado para localStorage.'
      );
    } finally {
      setSaving(false);
    }
  };

  const beforeUpload = (file: RcFile) => {
    void handleFileUpload(file);
    return Upload.LIST_IGNORE;
  };

  const handleDelete = () => {
    modal.confirm({
      title: 'Eliminar archivo',
      icon: <DeleteOutlined style={{ color: '#ef4444' }} />,
      content:
        '¿Deseas eliminar el archivo cargado de farmacovigilancia? Esta acción no se puede deshacer.',
      okText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      okButtonProps: { danger: true },
      onOk: () => {
        localStorage.removeItem(FARMACO_VIGILANCIA_STORAGE_KEY);
        setArchivo(null);
        message.success('Archivo eliminado correctamente.');
      },
    });
  };

  const handleDownload = () => {
    if (!archivo) return;

    const link = document.createElement('a');
    link.href = archivo.dataUrl;
    link.download = archivo.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleOpen = () => {
    if (!archivo) return;

    const newWindow = window.open();

    if (!newWindow) {
      message.warning('El navegador bloqueó la apertura del archivo.');
      return;
    }

    newWindow.document.write(`
      <iframe
        src="${archivo.dataUrl}"
        style="width:100%;height:100vh;border:0;"
        title="${archivo.name}"
      ></iframe>
    `);
  };

  const renderFileIcon = () => {
    if (isPdfFile(archivo)) return <FilePdfOutlined />;
    if (isImageFile(archivo)) return <FileImageOutlined />;
    return <FileDoneOutlined />;
  };

  const renderViewer = () => {
    if (!archivo) {
      return (
        <div className="farmaco-empty-viewer">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Aún no se ha cargado ningún archivo de farmacovigilancia."
          />
        </div>
      );
    }

    if (isPdfFile(archivo)) {
      return (
        <iframe
          className="farmaco-pdf-viewer"
          src={archivo.dataUrl}
          title={archivo.name}
        />
      );
    }

    if (isImageFile(archivo)) {
      return (
        <div className="farmaco-image-viewer">
          <img src={archivo.dataUrl} alt={archivo.name} />
        </div>
      );
    }

    return (
      <div className="farmaco-empty-viewer">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Este tipo de archivo no se puede previsualizar en el navegador."
        />

        <Button
          icon={<DownloadOutlined />}
          className="farmaco-secondary-btn"
          onClick={handleDownload}
        >
          Descargar archivo
        </Button>
      </div>
    );
  };

  return (
    <section className="farmaco-page">
      <div className="farmaco-shell">
        <div className="farmaco-hero">
          <div className="farmaco-hero-main">
            <div className="farmaco-hero-icon">
              <FileDoneOutlined />
            </div>

            <div>
              <Title level={3}>Farmacovigilancia</Title>
              <Text>
                Carga y consulta el archivo correspondiente al aviso o formato
                de farmacovigilancia.
              </Text>
            </div>
          </div>

          <div className="farmaco-hero-status">
            <Tag color={archivo ? 'success' : 'default'}>
              {archivo ? 'Archivo cargado' : 'Sin archivo'}
            </Tag>
          </div>
        </div>

        <Card className="farmaco-control-card">
          <div className="farmaco-control-grid">
            <div className="farmaco-upload-compact">
              <div className="farmaco-upload-info">
                <strong>Cargar archivo</strong>
                <span>PDF o imagen, máximo {MAX_FILE_SIZE_MB} MB.</span>
              </div>

              <Upload
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                multiple={false}
                showUploadList={false}
                beforeUpload={beforeUpload}
                disabled={saving}
              >
                <Button
                  className="farmaco-upload-btn"
                  icon={<CloudUploadOutlined />}
                  loading={saving}
                >
                  Seleccionar archivo
                </Button>
              </Upload>
            </div>

            <div className={`farmaco-file-strip ${archivo ? 'has-file' : ''}`}>
              {archivo ? (
                <>
                  <div className="farmaco-file-strip-icon">
                    {renderFileIcon()}
                  </div>

                  <div className="farmaco-file-strip-content">
                    <Text className="farmaco-file-strip-label">
                      Archivo actual
                    </Text>

                    <strong>{archivo.name}</strong>

                    <div className="farmaco-file-strip-meta">
                      <span>{formatBytes(archivo.size)}</span>
                      <span>{formatDateTime(archivo.uploadedAt)}</span>
                      <span>{archivo.uploadedBy}</span>
                    </div>
                  </div>

                  <div className="farmaco-file-strip-actions">
                    <Button
                      icon={<EyeOutlined />}
                      className="farmaco-secondary-btn"
                      onClick={handleOpen}
                    >
                      Abrir
                    </Button>

                    <Button
                      icon={<DownloadOutlined />}
                      className="farmaco-secondary-btn"
                      onClick={handleDownload}
                    >
                      Descargar
                    </Button>

                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      className="farmaco-danger-btn"
                      onClick={handleDelete}
                    >
                      Eliminar
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="farmaco-file-strip-icon empty">
                    <FileDoneOutlined />
                  </div>

                  <div className="farmaco-file-strip-content">
                    <Text className="farmaco-file-strip-label">
                      Estado del archivo
                    </Text>

                    <strong>Sin archivo cargado</strong>

                    <div className="farmaco-file-strip-meta">
                      <span>Selecciona un archivo para visualizarlo aquí.</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>

        <Card className="farmaco-preview-card">
          <div className="farmaco-card-header farmaco-preview-header">
            <div>
              <Title level={4}>Vista previa del archivo</Title>
              <Text>
                El documento cargado se muestra en grande para su revisión.
              </Text>
            </div>
          </div>

          <div className="farmaco-preview-box">
            {loading ? (
              <div className="farmaco-loading">
                <Spin size="large" />
                <Text>Cargando archivo guardado...</Text>
              </div>
            ) : (
              renderViewer()
            )}
          </div>
        </Card>
      </div>
    </section>
  );
};

export default FarmacoVigilancia;