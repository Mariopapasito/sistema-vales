import React, { useEffect, useState } from 'react';
import '../styles/OrderDetail.css';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import api from '../services/api';
import ReportTemplate from '../components/ReportTemplate';
import OrderComments from '../components/OrderComments';
import { logout } from '../store/slices/authSlice';
import html2pdf from 'html2pdf.js';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  ArrowPathIcon,
  XCircleIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';

interface WorkReport {
  id: number;
  orderId: number;
  createdAt: string;
  station: string;
  faultDescription: string;
  actionTaken: string;
  preventionTaken?: string;
  completed: boolean;
}

interface Order {
  _id: string;
  id: number;
  folio: string;
  prioridad: 'Alta' | 'Baja' | 'Paro' | 'Correctivo';
  estado: 'Sin iniciar' | 'En proceso' | 'Completada';
  localizacion: string;
  descripcion: string;
  observaciones?: string;
  tipo: 'sistemas' | 'compras';
  imagenes?: string[];
  User?: {
    nombre: string;
    estacion: string;
    rol: string;
  };
  createdAt: string;
  updatedAt: string;
  workReport?: WorkReport;
  firma?: string;
  firma_estacion?: string;
  firma_sistemas?: string;
  repairDescription?: string;
  reportDateTime?: string;
  requestorSignature?: string;
  solutionDateTime?: string;
  conformitySignature?: string;
  requestorPersonal?: string;
  stationPersonal?: string;
}

export const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedDoc, setExpandedDoc] = useState<'vale' | 'report' | null>(null);
  const [isEditingVale, setIsEditingVale] = useState(false);
  const [editedOrder, setEditedOrder] = useState<Order | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Get API base URL
  const getApiBaseURL = () => {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:3000';
    }
    return window.location.origin;
  };

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await api.get(`/orders/${id}`);
        setOrder(response.data);
      } catch (err) {
        console.error('Error fetching order:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  const handleDelete = async () => {
    if (!order) return;
    if (!window.confirm(`¿Seguro que quieres eliminar el vale ${order.folio}? Esta acción no se puede deshacer.`)) return;
    try {
      setDeleting(true);
      await api.delete(`/orders/${id}`);
      navigate('/dashboard');
    } catch (err: any) {
      alert('Error al eliminar: ' + (err.response?.data?.error || err.message));
    } finally {
      setDeleting(false);
    }
  };

  const canDelete = ['jefe', 'sistemas'].includes(user?.rol || '');

  const downloadPDF = async (docType: 'vale' | 'report') => {
    if (!order) return;

    let element: HTMLElement | null = null;
    let filename = '';

    if (docType === 'vale') {
      element = document.getElementById('vale-document');
      filename = `Vale-${order.folio}.pdf`;
    } else {
      element = document.getElementById('report-document');
      filename = `OrdenTrabajo-${order.folio}.pdf`;
    }

    if (!element) return;

    try {
      // Ocultar botones temporalmente
      const editButtonsDiv = element.querySelector('div[style*="position: absolute"]') as HTMLElement;
      let originalDisplay = '';
      if (editButtonsDiv) {
        originalDisplay = editButtonsDiv.style.display;
        editButtonsDiv.style.display = 'none';
      }

      // Usar html2canvas + jsPDF para tener control sobre marca de agua
      const canvas = await html2canvas(element, { scale: 2 });
      
      // Restaurar botones
      if (editButtonsDiv) {
        editButtonsDiv.style.display = originalDisplay;
      }

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Agregar imagen del documento
      pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);

      // Agregar marca de agua
      try {
        const watermarkImg = new Image();
        watermarkImg.crossOrigin = 'anonymous';
        watermarkImg.src = `${getApiBaseURL()}/logo.png`;

        await new Promise<void>((resolve) => {
          watermarkImg.onload = () => {
            const wmCanvas = document.createElement('canvas');
            wmCanvas.width = watermarkImg.width;
            wmCanvas.height = watermarkImg.height;
            const wmCtx = wmCanvas.getContext('2d');

            if (wmCtx) {
              wmCtx.globalAlpha = 0.15;
              wmCtx.drawImage(watermarkImg, 0, 0);
              const wmData = wmCanvas.toDataURL('image/png');

              // Agregar marca de agua en el centro
              const wmWidth = 80;
              const wmHeight = 80;
              const wmX = (pageWidth - wmWidth) / 2;
              const wmY = (pageHeight - wmHeight) / 2;

              pdf.addImage(wmData, 'PNG', wmX, wmY, wmWidth, wmHeight);
            }
            resolve();
          };
          watermarkImg.onerror = () => resolve();
        });
      } catch (err) {
        console.error('Error adding watermark:', err);
      }

      pdf.save(filename);
    } catch (err) {
      console.error('Error generating PDF:', err);
    }
  };

  const handleEditVale = () => {
    if (order) {
      setEditedOrder({ ...order });
      setIsEditingVale(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingVale(false);
    setEditedOrder(null);
  };

  const handleSaveVale = async () => {
    if (!editedOrder) return;
    // Use URL id as authoritative fallback in case editedOrder.id is missing
    const orderId = editedOrder.id || id;

    try {
      const response = await api.patch(`/orders/${orderId}`, {
        prioridad: editedOrder.prioridad,
        localizacion: editedOrder.localizacion,
        descripcion: editedOrder.descripcion,
        observaciones: editedOrder.observaciones,
      });

      setOrder(response.data);
      setIsEditingVale(false);
      setEditedOrder(null);
      alert('Vale actualizado exitosamente');
    } catch (err) {
      console.error('Error updating order:', err);
      alert('Error al actualizar el vale');
    }
  };

  const handleValeFieldChange = (field: string, value: string | any) => {
    if (editedOrder) {
      setEditedOrder({ ...editedOrder, [field]: value });
    }
  };

  if (loading) {
    return (
      <main style={{ flex: 1, padding: '2rem', color: '#64748b' }}>
        <ArrowPathIcon style={{ width: 20, height: 20 }} /> Cargando vale...
      </main>
    );
  }

  if (!order) {
    return (
      <main style={{ flex: 1, padding: '2rem', color: '#ef4444' }}>
        <XCircleIcon style={{ width: 20, height: 20 }} /> Vale no encontrado
      </main>
    );
  }

  const tableStyle: React.CSSProperties = {
    borderCollapse: 'collapse',
    width: '100%',
    border: '2px solid #333',
    fontFamily: 'Arial, sans-serif',
    fontSize: '13px'
  };

  const cellStyle: React.CSSProperties = {
    border: '1px solid #333',
    padding: '8px 10px',
    textAlign: 'left',
    verticalAlign: 'top',
    backgroundColor: '#fefef8'
  };

  const headerCellStyle: React.CSSProperties = {
    ...cellStyle,
    fontWeight: 'bold',
    fontSize: '12px',
    backgroundColor: '#fafaf5'
  };

  const checkboxCellStyle: React.CSSProperties = {
    border: '1px solid #333',
    padding: '6px',
    textAlign: 'center',
    width: '60px'
  };

  const renderCheckbox = (priority: string) => {
    const currentOrder = isEditingVale && editedOrder ? editedOrder : order;
    const isChecked = currentOrder?.prioridad === priority;
    if (isEditingVale && editedOrder) {
      return (
        <div
          onClick={() => handleValeFieldChange('prioridad', priority)}
          style={{
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            padding: '0.25rem',
            borderRadius: '4px',
            backgroundColor: isChecked ? '#dbeafe' : 'transparent',
            border: isChecked ? '2px solid #3b82f6' : '2px solid transparent',
          }}
        >
          {isChecked ? '☑' : '☐'}
        </div>
      );
    }
    return isChecked ? '☑' : '☐';
  };

  const docPreviewStyle: React.CSSProperties = {
    padding: '1.5rem',
    border: '2px solid #e0e7ff',
    borderRadius: '8px',
    backgroundColor: '#f8fafc',
    marginBottom: '1.5rem',
    cursor: 'pointer',
    transition: 'all 0.3s'
  };

  return (
    <main style={{ flex: 1, overflow: 'auto', padding: '1.5rem 2rem', width: '100%' }}>
        <div  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                padding: '0.6rem 1.2rem',
                background: '#0f172a',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '600'
              }}
            >
              ← Volver
            </button>
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  padding: '0.6rem 1.2rem',
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  opacity: deleting ? 0.6 : 1,
                }}
              >
                🗑 {deleting ? 'Eliminando...' : 'Eliminar vale'}
              </button>
            )}
          </div>
          <button
            onClick={() => dispatch(logout() as any)}
            className="desktop-logout-btn"
            style={{
              padding: '0.6rem 1.2rem',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',

            }}
          >
            <ArrowRightOnRectangleIcon style={{ width: '18px', height: '18px' }} />
            Cerrar sesión
          </button>
        </div>

        {/* HEADER CON DOCUMENTOS DISPONIBLES */}
        <div style={{
          background: 'white',
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          marginBottom: '2rem'
        }} className="order-info-card">
          <h2 style={{ margin: '0 0 1.5rem 0', color: '#1e293b', fontSize: '1.5rem' }}>
            <ClipboardDocumentListIcon style={{ width: 24, height: 24 }} /> Documentos - {order.folio}
          </h2>

          {/* PREVIEW DE DOCUMENTOS */}
          <div className="doc-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            {/* VALE PREVIEW */}
            <div
              className="doc-preview-card"
              style={docPreviewStyle}
              onClick={() => setExpandedDoc(expandedDoc === 'vale' ? null : 'vale')}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e0e7ff';
                e.currentTarget.style.borderColor = '#4f46e5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f8fafc';
                e.currentTarget.style.borderColor = '#e0e7ff';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <DocumentTextIcon style={{ width: 32, height: 32, color: '#4f46e5' }} />
                <div>
                  <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.1rem' }}>Vale de Pedido</h3>
                  <p style={{ margin: '0.5rem 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                    Creado: {new Date(order.createdAt).toLocaleDateString('es-MX')}
                  </p>
                </div>
              </div>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                {expandedDoc === 'vale' ? '▼ Ocultar' : '▶ Ver documento completo'}
              </p>
            </div>

            {/* ORDEN DE TRABAJO PREVIEW */}
            {order.workReport && (
              <div
                className="doc-preview-card"
                style={docPreviewStyle}
                onClick={() => setExpandedDoc(expandedDoc === 'report' ? null : 'report')}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#fef3c7';
                  e.currentTarget.style.borderColor = '#f59e0b';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.borderColor = '#e0e7ff';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <ClipboardDocumentListIcon style={{ width: 32, height: 32, color: '#f59e0b' }} />
                  <div>
                    <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.1rem' }}>Orden de Trabajo</h3>
                    <p style={{ margin: '0.5rem 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                      Generada: {new Date(order.workReport.createdAt).toLocaleDateString('es-MX')}
                    </p>
                  </div>
                </div>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                  {expandedDoc === 'report' ? '▼ Ocultar' : '▶ Ver documento completo'}
                </p>
              </div>
            )}
          </div>

          {/* IMÁGENES ADJUNTAS */}
          {['compras', 'sistemas'].includes(user?.rol || '') && order.imagenes && order.imagenes.length > 0 && (
            <div style={{ marginTop: '1.5rem', padding: '1.25rem', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b', fontSize: '1rem', fontWeight: 700 }}>Imágenes adjuntas</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                {order.imagenes.map((src, idx) => (
                  <img
                    key={idx}
                    src={src}
                    alt={`Imagen adjunta ${idx + 1}`}
                    style={{ width: '100%', minHeight: '140px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #cbd5e1' }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* BOTONES DE DESCARGA */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => downloadPDF('vale')}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.95rem'
              }}
            >
              <ArrowDownTrayIcon style={{ width: 18, height: 18 }} /> Descargar Vale
            </button>
            {order.workReport && (
              <button
                onClick={() => downloadPDF('report')}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.95rem'
                }}
              >
                <ArrowDownTrayIcon style={{ width: 18, height: 18 }} /> Descargar Orden de Trabajo
              </button>
            )}
          </div>
        </div>

        {/* NOTAS Y COMENTARIOS */}
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto 2rem auto'
        }}>
          <OrderComments orderId={(order as any).id || parseInt(order._id)} />
        </div>

        {/* VALE DOCUMENTO COMPLETO */}
        {expandedDoc === 'vale' && (
          <div id="vale-document" style={{
            background: 'white',
            maxWidth: '1000px',
            margin: '0 auto 2rem auto',
            padding: '2rem',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            position: 'relative'
          }}>
            <style>{`
              #vale-document::before {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 300px;
                height: 300px;
                background: url('${getApiBaseURL()}/logo.png') center/contain no-repeat;
                opacity: 0.08;
                pointer-events: none;
                z-index: 0;
              }
            `}</style>
            
            {/* BOTONES DE EDICIÓN - ESQUINA SUPERIOR DERECHA */}
            <div style={{ position: 'absolute', top: '2rem', right: '2rem', zIndex: 10, display: 'flex', gap: '0.5rem' }}>
              {!isEditingVale ? (
                <button
                  onClick={handleEditVale}
                  style={{
                    padding: '0.6rem 1.2rem',
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.9rem'
                  }}
                >
                  ✎ Editar
                </button>
              ) : (
                <>
                  <button
                    onClick={handleSaveVale}
                    style={{
                      padding: '0.6rem 1.2rem',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.9rem'
                    }}
                  >
                    ✓ Guardar
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    style={{
                      padding: '0.6rem 1.2rem',
                      background: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.9rem'
                    }}
                  >
                    ✕ Cancelar
                  </button>
                </>
              )}
            </div>
            
            {/* ENCABEZADO */}
            <div style={{ position: 'relative', zIndex: 1, marginTop: '2rem' }}>
            <div style={{
              textAlign: 'center',
              marginBottom: '1rem',
              paddingBottom: '0.5rem'
            }}>
              <h1 style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#333',
                letterSpacing: '0.5px',
                fontFamily: 'Arial, sans-serif'
              }}>
                MULTISERVICIO LA VILLITA - - VALE DE PEDIDO
              </h1>
            </div>

            {/* TABLA PRINCIPAL */}
            <table style={tableStyle}>
              <tbody>
                {/* FILA 1: PRIORIDAD Y ORDEN */}
                <tr>
                  <td style={{ ...headerCellStyle, width: '15%', fontWeight: 'bold' }}>PRIORIDAD:</td>
                  <td style={checkboxCellStyle}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold' }}>Alta:</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{renderCheckbox('Alta')}</div>
                  </td>
                  <td style={checkboxCellStyle}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold' }}>Baja:</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{renderCheckbox('Baja')}</div>
                  </td>
                  <td style={checkboxCellStyle}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold' }}>Paro:</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{renderCheckbox('Paro')}</div>
                  </td>
                  <td style={checkboxCellStyle}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold' }}>Correctivo:</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{renderCheckbox('Correctivo')}</div>
                  </td>
                  <td style={{ ...headerCellStyle, width: '20%', fontWeight: 'bold' }}>Nº de Orden:</td>
                  <td style={{ ...cellStyle, textAlign: 'center', fontSize: '18px', fontWeight: 'bold', color: '#d32f2f', width: '15%' }}>
                    Nº {order.folio.split('-')[1] || order.folio}
                  </td>
                </tr>

                {/* FILA 2: REQUERIDO POR Y FECHA */}
                <tr>
                  <td style={{ ...headerCellStyle, fontWeight: 'bold' }}>REQUERIDO POR:</td>
                  <td colSpan={4} style={cellStyle}>
                    {isEditingVale && editedOrder ? (
                      <input
                        type="text"
                        value={editedOrder.User?.nombre || ''}
                        onChange={(e) => handleValeFieldChange('User', { ...editedOrder.User, nombre: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #3b82f6',
                          borderRadius: '4px',
                          fontFamily: 'Arial, sans-serif',
                        }}
                      />
                    ) : (
                      order.User?.nombre || ''
                    )}
                  </td>
                  <td style={{ ...headerCellStyle, fontWeight: 'bold' }}>Fecha:</td>
                  <td style={cellStyle}>{new Date(order.createdAt).toLocaleDateString('es-MX')}</td>
                </tr>

                {/* FILA 3: ESTACIÓN Y LOCALIZACIÓN */}
                <tr>
                  <td style={{ ...headerCellStyle, fontWeight: 'bold' }}>ESTACION:</td>
                  <td colSpan={2} style={cellStyle}>
                    {isEditingVale && editedOrder ? (
                      <input
                        type="text"
                        value={editedOrder.User?.estacion || ''}
                        onChange={(e) => handleValeFieldChange('User', { ...editedOrder.User, estacion: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #3b82f6',
                          borderRadius: '4px',
                          fontFamily: 'Arial, sans-serif',
                        }}
                      />
                    ) : (
                      order.User?.estacion || ''
                    )}
                  </td>
                  <td style={{ ...headerCellStyle, fontWeight: 'bold' }}>Localización:</td>
                  <td colSpan={2} style={cellStyle}>
                    {isEditingVale && editedOrder ? (
                      <input
                        type="text"
                        value={editedOrder.localizacion || ''}
                        onChange={(e) => handleValeFieldChange('localizacion', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #3b82f6',
                          borderRadius: '4px',
                          fontFamily: 'Arial, sans-serif',
                        }}
                      />
                    ) : (
                      order.localizacion
                    )}
                  </td>
                </tr>

                {/* FILA 4: DESCRIPCIÓN DEL PROBLEMA */}
                <tr>
                  <td colSpan={7} style={{ ...headerCellStyle, fontWeight: 'bold' }}>Descripción del problema o material necesario:</td>
                </tr>
                <tr>
                  <td colSpan={7} style={{ ...cellStyle, height: '120px', verticalAlign: 'top', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                    {isEditingVale && editedOrder ? (
                      <textarea
                        value={editedOrder.descripcion || ''}
                        onChange={(e) => handleValeFieldChange('descripcion', e.target.value)}
                        style={{
                          width: '100%',
                          height: '100%',
                          padding: '0.5rem',
                          border: '1px solid #3b82f6',
                          borderRadius: '4px',
                          fontFamily: 'Arial, sans-serif',
                          resize: 'none'
                        }}
                      />
                    ) : (
                      order.descripcion
                    )}
                  </td>
                </tr>

                {/* FILA 5: DESCRIPCIÓN DE REPARACIÓN */}
                <tr>
                  <td colSpan={7} style={{ ...headerCellStyle, fontWeight: 'bold' }}>Descripción de reparación realizada por mecánicos internos o externos:</td>
                </tr>
                <tr>
                  <td colSpan={7} style={{ ...cellStyle, height: '80px', verticalAlign: 'top', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                    {isEditingVale && editedOrder ? (
                      <textarea
                        value={editedOrder.repairDescription || ''}
                        onChange={(e) => handleValeFieldChange('repairDescription', e.target.value)}
                        style={{
                          width: '100%',
                          height: '100%',
                          padding: '0.5rem',
                          border: '1px solid #3b82f6',
                          borderRadius: '4px',
                          fontFamily: 'Arial, sans-serif',
                          resize: 'none'
                        }}
                      />
                    ) : (
                      (order as any).repairDescription || ''
                    )}
                  </td>
                </tr>

                {/* FILA 6: FIRMAS Y DATOS */}
                <tr>
                  <td style={{ ...headerCellStyle, fontWeight: 'bold', width: '25%' }}>Fecha y hora de reporte o pedido:</td>
                  <td style={{ ...headerCellStyle, fontWeight: 'bold', width: '25%' }}>Nombre y Firma Solicitante:</td>
                  <td style={{ ...headerCellStyle, fontWeight: 'bold', width: '25%' }}>Fecha y Hora Solución:</td>
                  <td style={{ ...headerCellStyle, fontWeight: 'bold', width: '25%' }}>Nombre y Firma de Conformidad:</td>
                </tr>
                <tr>
                  <td style={{ ...cellStyle, height: '50px', verticalAlign: 'top', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                    {isEditingVale && editedOrder ? (
                      <textarea
                        value={editedOrder.reportDateTime || ''}
                        onChange={(e) => handleValeFieldChange('reportDateTime', e.target.value)}
                        style={{
                          width: '100%',
                          height: '100%',
                          padding: '0.5rem',
                          border: '1px solid #3b82f6',
                          borderRadius: '4px',
                          fontFamily: 'Arial, sans-serif',
                          resize: 'none'
                        }}
                      />
                    ) : (
                      (order as any).reportDateTime || ''
                    )}
                  </td>
                  <td style={{ ...cellStyle, height: '50px', verticalAlign: 'top', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                    {isEditingVale && editedOrder ? (
                      <textarea
                        value={editedOrder.requestorSignature || ''}
                        onChange={(e) => handleValeFieldChange('requestorSignature', e.target.value)}
                        style={{
                          width: '100%',
                          height: '100%',
                          padding: '0.5rem',
                          border: '1px solid #3b82f6',
                          borderRadius: '4px',
                          fontFamily: 'Arial, sans-serif',
                          resize: 'none'
                        }}
                      />
                    ) : (
                      (order as any).requestorSignature || ''
                    )}
                  </td>
                  <td style={{ ...cellStyle, height: '50px', verticalAlign: 'top', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                    {isEditingVale && editedOrder ? (
                      <textarea
                        value={editedOrder.solutionDateTime || ''}
                        onChange={(e) => handleValeFieldChange('solutionDateTime', e.target.value)}
                        style={{
                          width: '100%',
                          height: '100%',
                          padding: '0.5rem',
                          border: '1px solid #3b82f6',
                          borderRadius: '4px',
                          fontFamily: 'Arial, sans-serif',
                          resize: 'none'
                        }}
                      />
                    ) : (
                      (order as any).solutionDateTime || ''
                    )}
                  </td>
                  <td style={{ ...cellStyle, height: '50px', verticalAlign: 'top', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                    {isEditingVale && editedOrder ? (
                      <textarea
                        value={editedOrder.conformitySignature || ''}
                        onChange={(e) => handleValeFieldChange('conformitySignature', e.target.value)}
                        style={{
                          width: '100%',
                          height: '100%',
                          padding: '0.5rem',
                          border: '1px solid #3b82f6',
                          borderRadius: '4px',
                          fontFamily: 'Arial, sans-serif',
                          resize: 'none'
                        }}
                      />
                    ) : (
                      <div>
                        {(order as any).conformitySignature || ''}
                        {(order.firma_estacion || order.firma) && (
                          <img
                            src={order.firma_estacion || order.firma}
                            alt="Firma de conformidad"
                            style={{ display: 'block', maxWidth: '100%', maxHeight: '44px', marginTop: 4, border: '1px solid #e2e8f0', borderRadius: 4 }}
                          />
                        )}
                      </div>
                    )}
                  </td>
                </tr>

                {/* FILA 7: DATOS PERSONAL */}
                <tr>
                  <td colSpan={3} style={{ ...headerCellStyle, fontWeight: 'bold' }}>Datos personal que solicita material o servicios.</td>
                  <td colSpan={4} style={{ ...headerCellStyle, fontWeight: 'bold' }}>Encargado de Estación de Servicio que recibe:</td>
                </tr>
                <tr>
                  <td colSpan={3} style={{ ...cellStyle, height: '50px', verticalAlign: 'top', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                    {isEditingVale && editedOrder ? (
                      <textarea
                        value={editedOrder.requestorPersonal || ''}
                        onChange={(e) => handleValeFieldChange('requestorPersonal', e.target.value)}
                        style={{
                          width: '100%',
                          height: '100%',
                          padding: '0.5rem',
                          border: '1px solid #3b82f6',
                          borderRadius: '4px',
                          fontFamily: 'Arial, sans-serif',
                          resize: 'none'
                        }}
                      />
                    ) : (
                      (order as any).requestorPersonal || ''
                    )}
                  </td>
                  <td colSpan={4} style={{ ...cellStyle, height: '50px', verticalAlign: 'top', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                    {isEditingVale && editedOrder ? (
                      <textarea
                        value={editedOrder.stationPersonal || ''}
                        onChange={(e) => handleValeFieldChange('stationPersonal', e.target.value)}
                        style={{
                          width: '100%',
                          height: '100%',
                          padding: '0.5rem',
                          border: '1px solid #3b82f6',
                          borderRadius: '4px',
                          fontFamily: 'Arial, sans-serif',
                          resize: 'none'
                        }}
                      />
                    ) : (
                      (order as any).stationPersonal || ''
                    )}
                  </td>
                </tr>

                {/* FILA 8: OBSERVACIONES */}
                <tr>
                  <td colSpan={7} style={{ ...headerCellStyle, fontWeight: 'bold' }}>Observaciones y retroalimentación del Servicio.</td>
                </tr>
                <tr>
                  <td colSpan={7} style={{ ...cellStyle, height: '60px', verticalAlign: 'top', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                    {isEditingVale && editedOrder ? (
                      <textarea
                        value={editedOrder.observaciones || ''}
                        onChange={(e) => handleValeFieldChange('observaciones', e.target.value)}
                        style={{
                          width: '100%',
                          height: '100%',
                          padding: '0.5rem',
                          border: '1px solid #3b82f6',
                          borderRadius: '4px',
                          fontFamily: 'Arial, sans-serif',
                          resize: 'none'
                        }}
                      />
                    ) : (
                      order.observaciones || ''
                    )}
                  </td>
                </tr>
                  </tbody>
              </table>

              {order.imagenes && order.imagenes.length > 0 && (
                <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', fontWeight: 700, color: '#1f2937' }}>Imágenes adjuntas</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                    {order.imagenes.map((src, idx) => (
                      <img
                        key={idx}
                        src={src}
                        alt={`Adjunto ${idx + 1}`}
                        style={{ width: '100%', minHeight: '120px', objectFit: 'cover', borderRadius: '10px', border: '1px solid #cbd5e1' }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ORDEN DE TRABAJO DOCUMENTO COMPLETO */}
        {expandedDoc === 'report' && order.workReport && (
          <div id="report-document" style={{
            background: 'white',
            maxWidth: '1000px',
            margin: '0 auto 2rem auto',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
          }}>
            <ReportTemplate
              workReport={order.workReport}
              order={order}
              onUpdate={(updated) => {
                setOrder({
                  ...order,
                  workReport: updated
                });
              }}
            />
          </div>
        )}

        {/* CSS PARA IMPRESIÓN */}
        <style>{`
          @media print {
            body {
              margin: 0;
              padding: 0;
              background: white;
            }
            main {
              padding: 0 !important;
            }
            button {
              display: none !important;
            }
            div[style*="display: flex"] {
              page-break-inside: avoid;
            }
            table {
              page-break-inside: avoid;
            }
          }
        `}</style>
      </main>
  );
};

export default OrderDetail;
