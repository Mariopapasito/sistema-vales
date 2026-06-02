import React, { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import api from '../services/api';
import { 
  PlusCircleIcon, 
  TrashIcon, 
  XMarkIcon, 
  CameraIcon,
  PhotoIcon,
  CheckIcon,
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  ShoppingCartIcon,
} from '@heroicons/react/24/outline';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import '../styles/Reports.css';

const getBaseURL = () => {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:3000';
  return window.location.origin;
};

interface ImageFile {
  file: File;
  preview: string;
  descripcion: string;
}

interface Report {
  id: number;
  titulo: string;
  descripcion: string;
  imagenes: Array<{ url: string; descripcion: string }>;
  createdAt: string;
  User?: { id: number; nombre: string; rol: string };
}

export const Reports: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'sistemas' | 'compras'>('sistemas');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [mediaSource, setMediaSource] = useState<'gallery' | 'camera' | null>(null);
  const [showMediaSelector, setShowMediaSelector] = useState(false);

  // Preview modal states
  const [showPreview, setShowPreview] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
  });
  const [imagenes, setImagenes] = useState<ImageFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  const canCreate = user?.rol === 'sistemas' || user?.rol === 'compras';
  const canView = user?.rol === 'sistemas' || user?.rol === 'compras' || user?.rol === 'jefe';

  useEffect(() => {
    if (canView) {
      fetchReports();
    }
  }, []);

  const fetchReports = async () => {
    try {
      const res = await api.get('/reports');
      setReports(Array.isArray(res.data) ? res.data : res.data?.reports || []);
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCameraClick = () => {
    setShowMediaSelector(true);
  };

  const selectMediaSource = (source: 'gallery' | 'camera') => {
    setMediaSource(source);
    setShowMediaSelector(false);

    setTimeout(() => {
      if (source === 'gallery') {
        fileInputRef.current?.click();
      } else if (source === 'camera') {
        const cameraInput = cameraInputRef.current;
        if (cameraInput) {
          cameraInput.click();
        }
      }
    }, 200);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          setImagenes((prev) => [
            ...prev,
            {
              file,
              preview: reader.result as string,
              descripcion: '',
            },
          ]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setImagenes((prev) => prev.filter((_, i) => i !== index));
  };

  const updateImageDescription = (index: number, description: string) => {
    setImagenes((prev) =>
      prev.map((img, i) => (i === index ? { ...img, descripcion: description } : img))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.titulo.trim()) {
      setFormError('El título es obligatorio');
      return;
    }

    if (imagenes.length === 0) {
      setFormError('Debes agregar al menos una imagen');
      return;
    }

    setSubmitting(true);
    try {
      const uploadData = new FormData();
      uploadData.append('titulo', formData.titulo.trim());
      uploadData.append('descripcion', formData.descripcion);

      imagenes.forEach((img) => {
        uploadData.append('imagenes', img.file);
      });

      uploadData.append(
        'imageDescriptions',
        JSON.stringify(imagenes.map((img) => img.descripcion))
      );

      await api.post('/reports', uploadData);

      setFormData({ titulo: '', descripcion: '' });
      setImagenes([]);
      setFormSuccess(true);
      setMediaSource(null);
      fetchReports();
      setTimeout(() => {
        setFormSuccess(false);
        setShowForm(false);
      }, 1500);
    } catch (err) {
      console.error('Error creating report:', err);
      const errorMsg = (err as any).response?.data?.error || (err as any).message || 'Error al crear reporte';
      setFormError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro?')) {
      try {
        await api.delete(`/reports/${id}`);
        fetchReports();
      } catch (err) {
        console.error('Error deleting report:', err);
      }
    }
  };

  const openPreview = (report: Report) => {
    setSelectedReport(report);
    setCurrentImageIndex(0);
    setShowPreview(true);
  };

  const closePreview = () => {
    setShowPreview(false);
    setSelectedReport(null);
    setCurrentImageIndex(0);
  };

  const goToNextImage = () => {
    if (selectedReport && currentImageIndex < selectedReport.imagenes.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  const goToPrevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  const downloadPDF = async () => {
    if (!selectedReport) return;

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - 2 * margin;

      // Precargar logo una sola vez
      const logoData = await new Promise<string | null>((resolve) => {
        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        logoImg.src = `${getBaseURL()}/logo.png`;
        
        logoImg.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = logoImg.width;
          canvas.height = logoImg.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(logoImg, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          } else {
            resolve(null);
          }
        };
        logoImg.onerror = () => resolve(null);
      });

      // Función para agregar marca de agua
      const addWatermark = async () => {
        return new Promise<void>((resolve) => {
          const watermarkImg = new Image();
          watermarkImg.crossOrigin = 'anonymous';
          watermarkImg.src = `${getBaseURL()}/logo.png`;
          
          watermarkImg.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = watermarkImg.width;
            canvas.height = watermarkImg.height;
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
              ctx.globalAlpha = 0.15;
              ctx.drawImage(watermarkImg, 0, 0);
              const imgData = canvas.toDataURL('image/png');
              
              // Agregar en el centro de cada página
              const wmWidth = 80;
              const wmHeight = 80;
              const wmX = (pageWidth - wmWidth) / 2;
              const wmY = (pageHeight - wmHeight) / 2;
              
              pdf.addImage(imgData, 'PNG', wmX, wmY, wmWidth, wmHeight);
            }
            resolve();
          };
          watermarkImg.onerror = () => resolve();
        });
      };

      let isFirstPage = true;

      // Iterar sobre cada imagen
      for (let i = 0; i < selectedReport.imagenes.length; i++) {
        const image = selectedReport.imagenes[i];
        const imageUrl = image.url.startsWith('data:') || image.url.startsWith('http')
          ? image.url
          : `${getBaseURL()}${image.url}`;

        if (!isFirstPage) {
          pdf.addPage();
        }
        isFirstPage = false;

        // Agregar marca de agua de fondo
        await addWatermark();

        // Agregar logo en el encabezado
        if (logoData) {
          pdf.addImage(logoData, 'PNG', margin, margin, 20, 20);
        }

        // Header con información (desplazado para dejar espacio al logo)
        const fontSize = 9;
        pdf.setFontSize(fontSize);
        pdf.text(`Título: ${selectedReport.titulo}`, margin + 25, margin + 5);
        pdf.text(
          `Creado el: ${new Date(selectedReport.createdAt).toLocaleDateString('es-MX')}`,
          margin + 25,
          margin + 10
        );
        pdf.text(`Nro. de elementos: ${selectedReport.imagenes.length}`, margin + 25, margin + 15);

        // Línea separadora
        pdf.setDrawColor(0);
        pdf.line(margin, margin + 22, pageWidth - margin, margin + 22);

        // Número de imagen
        pdf.setFontSize(12);
        pdf.text(`(${i + 1})`, margin + 2, margin + 32);

        // Obtener imagen y agregarla
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = imageUrl;

          await new Promise<void>((resolve, reject) => {
            img.onload = () => {
              const imgWidth = contentWidth - 4;
              const imgHeight = (img.height / img.width) * imgWidth;
              const maxHeight = pageHeight - margin - 80; // Dejar espacio para header y footer

              let finalHeight = imgHeight;
              if (finalHeight > maxHeight) {
                finalHeight = maxHeight;
              }

              const imgX = margin + 2;
              const imgY = margin + 35;

              // Convertir imagen a canvas y luego a datos
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0);
                const imgData = canvas.toDataURL('image/jpeg', 0.9);
                pdf.addImage(imgData, 'JPEG', imgX, imgY, imgWidth, finalHeight);
              }

              resolve();
            };
            img.onerror = () => {
              reject(new Error('Error loading image'));
            };
          });
        } catch (err) {
          console.error('Error processing image:', err);
        }

        // Descripción de imagen
        if (image.descripcion) {
          const descY = pageHeight - margin - 30;
          pdf.setFontSize(9);
          pdf.text(image.descripcion, margin, descY, { maxWidth: contentWidth });
        }

        // Footer con número de página
        pdf.setFontSize(8);
        pdf.text(
          `ld. de doc. 10`,
          margin,
          pageHeight - margin + 2
        );
        pdf.text(
          `página ${i + 1} de ${selectedReport.imagenes.length}`,
          pageWidth - margin - 35,
          pageHeight - margin + 2,
          { align: 'right' }
        );

        // Línea separadora del footer
        pdf.line(margin, pageHeight - margin + 5, pageWidth - margin, pageHeight - margin + 5);
      }

      pdf.save(`${selectedReport.titulo}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
    }
  };

  if (!canView) {
    return (
      <div className="dashboard-container">
        <p>No tienes permisos.</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="page-header">
        <h1>Reportes</h1>
        <p>Crea y gestiona reportes con imágenes</p>
      </div>

          {/* Botón para crear - solo si puede crear */}
          {canCreate && (
            <button
              className="btn-create-report"
              onClick={() => setShowForm(!showForm)}
            >
              <PlusCircleIcon style={{ width: 20, height: 20 }} />
              Crear Reporte
            </button>
          )}

          {/* Tabs para jefe */}
          {user?.rol === 'jefe' && (
            <div className="app-tabs">
              <button
                className={`app-tab${selectedTab === 'sistemas' ? ' active' : ''}`}
                onClick={() => setSelectedTab('sistemas')}
              >
                <ClipboardDocumentListIcon style={{ width: 16, height: 16 }} /> Reportes de Sistemas
              </button>
              <button
                className={`app-tab${selectedTab === 'compras' ? ' active' : ''}`}
                onClick={() => setSelectedTab('compras')}
              >
                <ShoppingCartIcon style={{ width: 16, height: 16 }} /> Reportes de Compras
              </button>
            </div>
          )}

          {/* Formulario - solo si puede crear */}
          {canCreate && showForm && (
            <div className="report-form-container">
              <form onSubmit={handleSubmit} className="report-form">
                {formError && (
                  <div style={{
                    background: '#fee2e2', color: '#b91c1c', borderRadius: 8,
                    padding: '10px 14px', marginBottom: 12, fontSize: 14,
                    border: '1px solid #fca5a5',
                  }}>
                    ⚠️ {formError}
                  </div>
                )}
                {formSuccess && (
                  <div style={{
                    background: '#dcfce7', color: '#15803d', borderRadius: 8,
                    padding: '10px 14px', marginBottom: 12, fontSize: 14,
                    border: '1px solid #86efac',
                  }}>
                    ✅ Reporte publicado correctamente
                  </div>
                )}
                <div className="form-group">
                  <label>Título *</label>
                  <input
                    type="text"
                    placeholder="Ej: Mantenimiento completado"
                    value={formData.titulo}
                    onChange={(e) => {
                      setFormError(null);
                      setFormData({ ...formData, titulo: e.target.value });
                    }}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Descripción</label>
                  <textarea
                    placeholder="Agrega detalles sobre el reporte..."
                    value={formData.descripcion}
                    onChange={(e) =>
                      setFormData({ ...formData, descripcion: e.target.value })
                    }
                    className="form-textarea"
                    rows={3}
                  />
                </div>

                {/* Camera/Gallery Button */}
                <div className="camera-section">
                  <button
                    type="button"
                    className="camera-button"
                    onClick={handleCameraClick}
                  >
                    <div className="camera-circle">
                      {imagenes.length > 0 && (
                        <span className="image-count">{imagenes.length}</span>
                      )}
                      <CameraIcon style={{ width: 30, height: 30 }} />
                    </div>
                  </button>

                  {imagenes.length > 0 && (
                    <div className="images-preview">
                      {imagenes.map((img, index) => (
                        <div key={index} className="preview-item">
                          <img src={img.preview} alt={`preview-${index}`} />
                          <input
                            type="text"
                            placeholder="Descripción (opcional)"
                            value={img.descripcion}
                            onChange={(e) =>
                              updateImageDescription(index, e.target.value)
                            }
                            className="image-description-input"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="remove-btn"
                          >
                            <XMarkIcon style={{ width: 16, height: 16 }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-submit" disabled={submitting}>
                    {submitting ? 'Publicando...' : 'Publicar'}
                  </button>
                  <button
                    type="button"
                    className="btn-cancel"
                    disabled={submitting}
                    onClick={() => {
                      setShowForm(false);
                      setFormData({ titulo: '', descripcion: '' });
                      setImagenes([]);
                      setMediaSource(null);
                      setFormError(null);
                      setFormSuccess(false);
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>

              {/* Media Selector Modal */}
              {showMediaSelector && (
                <div className="modal-overlay">
                  <div className="media-selector-modal">
                    <div className="modal-header">
                      <h3>Selecciona una fuente</h3>
                      <button
                        className="modal-close"
                        onClick={() => setShowMediaSelector(false)}
                      >
                        <XMarkIcon style={{ width: 24, height: 24 }} />
                      </button>
                    </div>
                    <div className="media-options">
                      <button
                        className="media-option-btn"
                        onClick={() => selectMediaSource('gallery')}
                      >
                        <PhotoIcon style={{ width: 32, height: 32 }} />
                        <span>Galería</span>
                      </button>
                      <button
                        className="media-option-btn"
                        onClick={() => selectMediaSource('camera')}
                      >
                        <CameraIcon style={{ width: 32, height: 32 }} />
                        <span>Cámara</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Hidden Inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            style={{ display: 'none' }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageChange}
            style={{ display: 'none' }}
            key="camera-input"
          />

          {/* Reports List - Simple Cards */}
          <div className="reports-list-simple">
            {loading ? (
              <p>Cargando reportes...</p>
            ) : reports.length === 0 ? (
              <p className="no-reports">No hay reportes aún</p>
            ) : user?.rol === 'jefe' ? (
              // Jefe: filtra por tab (sistemas o compras)
              (() => {
                const filtered = reports.filter(r => r.User?.rol === selectedTab);
                return filtered.length === 0 ? (
                  <p className="no-reports">No hay reportes de {selectedTab}</p>
                ) : filtered.map((report) => (
                  <div
                    key={report.id}
                    className="report-card-simple"
                    onClick={() => openPreview(report)}
                  >
                    <div className="report-card-content">
                      <h3>{report.titulo}</h3>
                      <p className="report-meta-simple">
                        {report.User?.nombre} •{' '}
                        {report.imagenes.length} imagen{report.imagenes.length !== 1 ? 'es' : ''} •{' '}
                        {new Date(report.createdAt).toLocaleDateString('es-MX')}
                      </p>
                    </div>
                  </div>
                ));
              })()
            ) : (
              // Sistemas y compras: solo ven sus propios reportes
              reports.map((report) => (
                <div
                  key={report.id}
                  className="report-card-simple"
                  onClick={() => openPreview(report)}
                >
                  <div className="report-card-content">
                    <h3>{report.titulo}</h3>
                    <p className="report-meta-simple">
                      {report.imagenes.length} imagen{report.imagenes.length !== 1 ? 'es' : ''} •{' '}
                      {new Date(report.createdAt).toLocaleDateString('es-MX')}
                    </p>
                  </div>
                  <button
                    className="btn-delete-simple"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(report.id);
                    }}
                    title="Eliminar"
                  >
                    <TrashIcon style={{ width: 18, height: 18 }} />
                  </button>
                </div>
              ))
            )}
          </div>

      {/* Preview Modal */}
      {showPreview && selectedReport && selectedReport.imagenes.length > 0 && (
        <div className="preview-modal-overlay">
          <div className="preview-modal">
            <div className="preview-header">
              <button className="preview-close" onClick={closePreview}>
                <XMarkIcon style={{ width: 28, height: 28 }} />
              </button>
              <div className="preview-header-center">
                <img 
                  src={`${getBaseURL()}/logo.png`} 
                  alt="Logo" 
                  className="preview-logo"
                />
                <h2>Vista Previa</h2>
              </div>
              <button
                className="preview-download"
                onClick={downloadPDF}
                title="Descargar PDF"
              >
                <ArrowDownTrayIcon style={{ width: 24, height: 24 }} />
              </button>
            </div>

            <div className="preview-content">
              {/* Report Document with Vertical Scroll */}
              <div className="report-document-scroll">
                {selectedReport.imagenes.map((image, idx) => {
                  const imageUrl = image.url.startsWith('data:') || image.url.startsWith('http')
                    ? image.url
                    : `${getBaseURL()}${image.url}`;
                  
                  return (
                    <div key={idx} className="report-page">
                      {/* Page Header */}
                      <div className="doc-header">
                        <div className="header-row">
                          <span>Título: {selectedReport.titulo}</span>
                          <span>Creado el: {new Date(selectedReport.createdAt).toLocaleDateString('es-MX')}</span>
                          <span>Nro. de elementos: {selectedReport.imagenes.length}</span>
                        </div>
                      </div>

                      {/* Image */}
                      <div className="image-viewer-scroll">
                        <div className="image-number">{idx + 1}</div>
                        <img
                          src={imageUrl}
                          alt={`image-${idx}`}
                          onError={(e) => {
                            console.error('Error loading image:', imageUrl);
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22300%22%3E%3Crect fill=%22%23e0e0e0%22 width=%22300%22 height=%22300%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-size=%2216%22%3EImagen no disponible%3C/text%3E%3C/svg%3E';
                          }}
                        />
                      </div>

                      {/* Description */}
                      {image.descripcion && (
                        <div className="image-description">
                          <p>{image.descripcion}</p>
                        </div>
                      )}

                      {/* Page Footer */}
                      <div className="doc-footer">
                        <span>Generado por 'Report & Run'</span>
                        <span>página {idx + 1} de {selectedReport.imagenes.length}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
