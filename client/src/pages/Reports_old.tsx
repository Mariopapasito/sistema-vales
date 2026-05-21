import React, { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { 
  PlusCircleIcon, 
  TrashIcon, 
  XMarkIcon, 
  CameraIcon,
  PhotoIcon,
  CheckIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import html2pdf from 'html2pdf.js';
import '../styles/Reports.css';

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
  User?: { nombre: string };
}

export const Reports: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [mediaSource, setMediaSource] = useState<'gallery' | 'camera' | null>(null);
  const [showMediaSelector, setShowMediaSelector] = useState(false);

  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
  });
  const [imagenes, setImagenes] = useState<ImageFile[]>([]);

  const canCreate = user?.rol === 'sistemas' || user?.rol === 'compras' || user?.rol === 'jefe';

  useEffect(() => {
    if (canCreate) {
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

    // Incrementar delay para asegurar que la modal está completamente cerrada
    setTimeout(() => {
      if (source === 'gallery') {
        console.log('Abriendo galería');
        fileInputRef.current?.click();
      } else if (source === 'camera') {
        console.log('Abriendo cámara');
        const cameraInput = cameraInputRef.current;
        if (cameraInput) {
          console.log('Input de cámara encontrado, haciendo click');
          cameraInput.click();
        } else {
          console.error('Referencia de input de cámara no encontrada');
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
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const updateImageDescription = (index: number, descripcion: string) => {
    setImagenes((prev) =>
      prev.map((img, i) => (i === index ? { ...img, descripcion } : img))
    );
  };

  const removeImage = (index: number) => {
    setImagenes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.titulo.trim()) {
      alert('Por favor completa el título');
      return;
    }
    if (imagenes.length === 0) {
      alert('Por favor agrega al menos una imagen');
      return;
    }

    try {
      const uploadData = new FormData();
      uploadData.append('titulo', formData.titulo);
      uploadData.append('descripcion', formData.descripcion);

      // Agregar imágenes
      imagenes.forEach((img) => {
        uploadData.append('imagenes', img.file);
      });

      // Agregar descripciones como JSON string
      uploadData.append(
        'imageDescriptions',
        JSON.stringify(imagenes.map((img) => img.descripcion))
      );

      // axios automáticamente detectará FormData y no establecerá Content-Type de JSON
      await api.post('/reports', uploadData);

      // Limpiar formulario
      setFormData({ titulo: '', descripcion: '' });
      setImagenes([]);
      setShowForm(false);
      setMediaSource(null);
      fetchReports();
      alert('Reporte creado exitosamente');
    } catch (err) {
      console.error('Error creating report:', err);
      const errorMsg = (err as any).response?.data?.error || (err as any).message || 'Error desconocido';
      alert('Error al crear reporte: ' + errorMsg);
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

  const downloadPDF = async (report: Report) => {
    try {
      // Crear elemento contenedor para el PDF
      const element = document.createElement('div');
      element.style.padding = '20px';
      element.style.fontFamily = 'Arial, sans-serif';
      element.style.backgroundColor = '#fff';

      // Título
      const title = document.createElement('h1');
      title.textContent = report.titulo;
      title.style.fontSize = '24px';
      title.style.marginBottom = '10px';
      title.style.textAlign = 'center';
      element.appendChild(title);

      // Descripción
      if (report.descripcion) {
        const desc = document.createElement('p');
        desc.textContent = report.descripcion;
        desc.style.fontSize = '14px';
        desc.style.marginBottom = '20px';
        desc.style.textAlign = 'justify';
        element.appendChild(desc);
      }

      // Fecha y usuario
      const meta = document.createElement('p');
      meta.textContent = `Fecha: ${new Date(report.createdAt).toLocaleDateString('es-MX')} | Creado por: ${report.User?.nombre || 'Sistema'}`;
      meta.style.fontSize = '12px';
      meta.style.color = '#666';
      meta.style.marginBottom = '20px';
      element.appendChild(meta);

      // Línea separadora
      const hr = document.createElement('hr');
      hr.style.border = 'none';
      hr.style.borderTop = '1px solid #ccc';
      hr.style.marginBottom = '20px';
      element.appendChild(hr);

      // Imágenes
      if (report.imagenes && report.imagenes.length > 0) {
        const imagesTitle = document.createElement('h2');
        imagesTitle.textContent = 'Imágenes del Reporte';
        imagesTitle.style.fontSize = '18px';
        imagesTitle.style.marginBottom = '15px';
        element.appendChild(imagesTitle);

        for (let i = 0; i < report.imagenes.length; i++) {
          const img = report.imagenes[i];
          
          // Crear contenedor para cada imagen
          const imgContainer = document.createElement('div');
          imgContainer.style.marginBottom = '15px';
          imgContainer.style.pageBreakInside = 'avoid';

          // Número de imagen
          const imgNum = document.createElement('p');
          imgNum.textContent = `Imagen ${i + 1}`;
          imgNum.style.fontWeight = 'bold';
          imgNum.style.fontSize = '14px';
          imgNum.style.marginBottom = '5px';
          imgContainer.appendChild(imgNum);

          // Imagen
          const imgEl = document.createElement('img');
          const imageUrl = img.url.startsWith('http') 
            ? img.url 
            : `http://localhost:3000${img.url}`;
          imgEl.src = imageUrl;
          imgEl.style.maxWidth = '100%';
          imgEl.style.height = 'auto';
          imgEl.style.marginBottom = '10px';
          imgEl.style.border = '1px solid #ddd';
          imgContainer.appendChild(imgEl);

          // Descripción de imagen
          if (img.descripcion) {
            const imgDesc = document.createElement('p');
            imgDesc.textContent = `Descripción: ${img.descripcion}`;
            imgDesc.style.fontSize = '12px';
            imgDesc.style.color = '#555';
            imgDesc.style.fontStyle = 'italic';
            imgContainer.appendChild(imgDesc);
          }

          element.appendChild(imgContainer);
        }
      }

      // Opciones para html2pdf
      const options = {
        margin: 10,
        filename: `Reporte_${report.titulo}_${new Date().getTime()}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait' as const, unit: 'mm', format: 'a4' },
      };

      // Generar PDF
      html2pdf().set(options).from(element).save();
      alert('PDF descargado exitosamente');
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Error al generar PDF');
    }
  };

  if (!canCreate) {
    return (
      <div className="dashboard-layout">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="dashboard-main">
          <div className="dashboard-container">
            <p>No tienes permisos.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="dashboard-main">
        <div className="dashboard-container">
          <div className="page-header">
            <h1>Reportes</h1>
            <p>Crea y gestiona reportes con imágenes</p>
          </div>

          {/* Botón para crear */}
          <button
            className="btn-create-report"
            onClick={() => setShowForm(!showForm)}
          >
            <PlusCircleIcon style={{ width: 20, height: 20 }} />
            Crear Reporte
          </button>

          {/* Formulario */}
          {showForm && (
            <div className="report-form-container">
              <form onSubmit={handleSubmit} className="report-form">
                <div className="form-group">
                  <label>Título *</label>
                  <input
                    type="text"
                    placeholder="Ej: Mantenimiento completado"
                    value={formData.titulo}
                    onChange={(e) =>
                      setFormData({ ...formData, titulo: e.target.value })
                    }
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

                {/* Camera Icon and Media Selector */}
                <div className="form-group">
                  <label>Imágenes *</label>
                  <div className="camera-section">
                    <button
                      type="button"
                      className="camera-icon-btn"
                      onClick={handleCameraClick}
                      title="Agregar imágenes"
                    >
                      <CameraIcon style={{ width: 28, height: 28 }} />
                    </button>
                    {imagenes.length > 0 && (
                      <span className="image-count">{imagenes.length}</span>
                    )}
                  </div>

                  {/* Media Selector Modal */}
                  {showMediaSelector && (
                    <div className="media-selector-modal">
                      <div className="media-selector-content">
                        <h3>Selecciona una opción</h3>
                        <button
                          type="button"
                          className="media-option-btn gallery-btn"
                          onClick={() => selectMediaSource('gallery')}
                        >
                          <PhotoIcon style={{ width: 24, height: 24 }} />
                          <span>Galería</span>
                        </button>
                        <button
                          type="button"
                          className="media-option-btn camera-btn"
                          onClick={() => selectMediaSource('camera')}
                        >
                          <CameraIcon style={{ width: 24, height: 24 }} />
                          <span>Cámara</span>
                        </button>
                        <button
                          type="button"
                          className="media-option-btn cancel-btn"
                          onClick={() => setShowMediaSelector(false)}
                        >
                          <XMarkIcon style={{ width: 24, height: 24 }} />
                          <span>Cancelar</span>
                        </button>
                      </div>
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

                  {/* Image Grid */}
                  {imagenes.length > 0 && (
                    <div className="images-grid">
                      {imagenes.map((img, index) => (
                        <div key={index} className="image-item">
                          <div className="image-wrapper">
                            <img src={img.preview} alt={`preview-${index}`} />
                            <button
                              type="button"
                              className="btn-remove-image"
                              onClick={() => removeImage(index)}
                              title="Eliminar imagen"
                            >
                              <XMarkIcon style={{ width: 18, height: 18 }} />
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder="Descripción (opcional)"
                            value={img.descripcion}
                            onChange={(e) =>
                              updateImageDescription(index, e.target.value)
                            }
                            className="image-description-input"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-submit">
                    Publicar
                  </button>
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => {
                      setShowForm(false);
                      setFormData({ titulo: '', descripcion: '' });
                      setImagenes([]);
                      setMediaSource(null);
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Lista de reportes */}
          <div className="reports-list">
            {loading ? (
              <p>Cargando reportes...</p>
            ) : reports.length === 0 ? (
              <p className="no-reports">No hay reportes aún</p>
            ) : (
              reports.map((report) => (
                <div key={report.id} className="report-card">
                  <div className="report-header">
                    <div className="report-title-info">
                      <h3>{report.titulo}</h3>
                      {report.descripcion && <p className="report-desc">{report.descripcion}</p>}
                    </div>
                    <div className="report-actions">
                      <button
                        className="btn-download"
                        onClick={() => downloadPDF(report)}
                        title="Descargar PDF"
                      >
                        <ArrowDownTrayIcon style={{ width: 18, height: 18 }} />
                      </button>
                      <button
                        className="btn-delete"
                        onClick={() => handleDelete(report.id)}
                        title="Eliminar"
                      >
                        <TrashIcon style={{ width: 18, height: 18 }} />
                      </button>
                    </div>
                  </div>

                  {/* Images Grid in Report */}
                  {report.imagenes && report.imagenes.length > 0 && (
                    <div className="report-images-container">
                      {report.imagenes.map((img, idx) => {
                        const imageUrl = img.url.startsWith('http') 
                          ? img.url 
                          : `http://localhost:3000${img.url}`;
                        return (
                          <div key={idx} className="report-image-item">
                            <img src={imageUrl} alt={`report-img-${idx}`} />
                            {img.descripcion && (
                              <p className="image-desc-text">{img.descripcion}</p>
                            )}
                            <div className="image-number">{idx + 1}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="report-meta">
                    <small>
                      {new Date(report.createdAt).toLocaleDateString('es-MX')}
                      {report.User && ` • ${report.User.nombre}`}
                    </small>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
