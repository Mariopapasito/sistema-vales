import React, { useState, useEffect } from 'react';
import api from '../services/api';
import '../styles/ReportTemplate.css';

interface WorkReport {
  id: number;
  number?: string;
  orderId: number;
  station: string;
  createdAt: string;
  faultCode?: string;
  equipmentNumber?: string;
  serialNumber?: string;
  faultDescription: string;
  actionTaken: string;
  preventionTaken?: string;
  rating?: 'completed' | 'incomplete' | 'failed' | 'MUY_MALO' | 'MALO' | 'BUENO' | 'MUY_BUENO' | 'EXCELENTE';
  attendedBy?: string;
  completed: boolean;
}

interface Order {
  id: number;
  folio: string;
  prioridad: string;
  descripcion: string;
  usuario?: { nombre: string };
  User?: { nombre: string; estacion: string; rol: string };
  firma_estacion?: string;
  firma_sistemas?: string;
}

interface ReportTemplateProps {
  workReport: WorkReport;
  order: Order;
  onUpdate?: (updated: WorkReport) => void;
}

// Mapeo de valores simples a ENUM de BD
const ratingMap: Record<string, string> = {
  'completed': 'BUENO',
  'incomplete': 'MALO',
  'failed': 'MUY_MALO',
  'BUENO': 'completed',
  'MALO': 'incomplete',
  'MUY_MALO': 'failed'
};

const getRatingDisplay = (value?: string): 'completed' | 'incomplete' | 'failed' => {
  if (!value) return 'completed';
  return ratingMap[value] as any || value as any;
};

const getRatingDB = (value?: string): string => {
  if (!value) return 'BUENO';
  return ratingMap[value] || value;
};

const ReportTemplate: React.FC<ReportTemplateProps> = ({ workReport, order, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});

  // Initialize form data when workReport changes
  useEffect(() => {
    setFormData({
      faultCode: workReport.faultCode || '',
      equipmentNumber: workReport.equipmentNumber || '',
      serialNumber: workReport.serialNumber || '',
      faultDescription: workReport.faultDescription || order.descripcion || '',
      actionTaken: workReport.actionTaken || '',
      preventionTaken: workReport.preventionTaken || '',
      attendedBy: workReport.attendedBy || '',
      rating: getRatingDisplay(workReport.rating as string) || 'completed',
    });
  }, [workReport, order]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSave = async () => {
    try {
      // Mapear el rating a valor de BD
      const saveData = {
        ...formData,
        rating: getRatingDB(formData.rating)
      };

      const response = await api.put(`/reports/${workReport.id}`, saveData);
      if (onUpdate) {
        onUpdate(response.data.report || response.data);
      }
      setIsEditing(false);
      alert('Orden actualizada exitosamente');
    } catch (error: any) {
      console.error('Error:', error);
      alert('Error al actualizar: ' + (error.response?.data?.message || error.message));
    }
  };

  return (
    <div className="report-container">
      {/* BOTONES DE CONTROL */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
        {isEditing ? (
          <>
            <button
              onClick={handleSave}
              style={{
                padding: '0.6rem 1.2rem',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              ✓ Guardar
            </button>
            <button
              onClick={() => setIsEditing(false)}
              style={{
                padding: '0.6rem 1.2rem',
                background: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              ✕ Cancelar
            </button>
          </>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            style={{
              padding: '0.6rem 1.2rem',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            ✎ Editar
          </button>
        )}
      </div>

      {/* HEADER - GEV FORMATO */}
      <div style={{
        textAlign: 'center',
        marginBottom: '1.5rem',
        paddingBottom: '1rem',
        borderBottom: '3px solid #000'
      }}>
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.6rem', fontWeight: 'bold' }}>
          REPORTE DE TRABAJO - GEV
        </h1>
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#333' }}>
          Folio: <strong>{order.folio}</strong> | Fecha: <strong>{formatDate(workReport.createdAt)}</strong>
        </p>
      </div>

      {/* SECCIÓN 1: INFORMACIÓN BÁSICA */}
      <div style={{ marginBottom: '1.5rem', pageBreakInside: 'avoid' }}>
        <h3 style={{
          background: '#e5e7eb',
          padding: '0.8rem',
          margin: '0 0 1rem 0',
          fontSize: '0.95rem',
          fontWeight: 'bold',
          border: '2px solid #000'
        }}>
          1. INFORMACIÓN BÁSICA
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ padding: '0.6rem', border: '1px solid #000', fontWeight: 'bold', width: '30%' }}>Prioridad:</td>
              <td style={{ padding: '0.6rem', border: '1px solid #000' }}>{order.prioridad}</td>
              <td style={{ padding: '0.6rem', border: '1px solid #000', fontWeight: 'bold', width: '30%' }}>Estación:</td>
              <td style={{ padding: '0.6rem', border: '1px solid #000' }}>{workReport.station}</td>
            </tr>
            <tr>
              <td style={{ padding: '0.6rem', border: '1px solid #000', fontWeight: 'bold' }}>Creado por:</td>
              <td style={{ padding: '0.6rem', border: '1px solid #000' }}>{order.User?.nombre || order.usuario?.nombre || 'N/A'}</td>
              <td style={{ padding: '0.6rem', border: '1px solid #000', fontWeight: 'bold' }}>Atendido por:</td>
              <td style={{ padding: '0.6rem', border: '1px solid #000' }}>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.attendedBy || ''}
                    onChange={(e) => handleInputChange('attendedBy', e.target.value)}
                    style={{ width: '100%', padding: '0.3rem', border: '1px solid #ccc' }}
                  />
                ) : (
                  formData.attendedBy || '_______________'
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* SECCIÓN 2: DESCRIPCIÓN DEL PROBLEMA */}
      <div style={{ marginBottom: '1.5rem', pageBreakInside: 'avoid' }}>
        <h3 style={{
          background: '#e5e7eb',
          padding: '0.8rem',
          margin: '0 0 1rem 0',
          fontSize: '0.95rem',
          fontWeight: 'bold',
          border: '2px solid #000'
        }}>
          2. DESCRIPCIÓN DEL PROBLEMA
        </h3>
        <div style={{ border: '1px solid #000', minHeight: '80px', padding: '0.6rem' }}>
          {isEditing ? (
            <textarea
              value={formData.faultDescription || ''}
              onChange={(e) => handleInputChange('faultDescription', e.target.value)}
              style={{
                width: '100%',
                height: '80px',
                padding: '0.5rem',
                border: '1px solid #ccc',
                fontFamily: 'Arial, sans-serif',
                resize: 'none'
              }}
            />
          ) : (
            <p style={{ margin: 0, whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
              {formData.faultDescription}
            </p>
          )}
        </div>
      </div>

      {/* SECCIÓN 3: DETALLES TÉCNICOS */}
      <div style={{ marginBottom: '1.5rem', pageBreakInside: 'avoid' }}>
        <h3 style={{
          background: '#e5e7eb',
          padding: '0.8rem',
          margin: '0 0 1rem 0',
          fontSize: '0.95rem',
          fontWeight: 'bold',
          border: '2px solid #000'
        }}>
          3. DETALLES TÉCNICOS
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
          <tbody>
            <tr>
              <td style={{ padding: '0.6rem', border: '1px solid #000', fontWeight: 'bold', width: '25%' }}>Código de Falla:</td>
              <td style={{ padding: '0.6rem', border: '1px solid #000' }}>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.faultCode || ''}
                    onChange={(e) => handleInputChange('faultCode', e.target.value)}
                    style={{ width: '100%', padding: '0.3rem', border: '1px solid #ccc' }}
                  />
                ) : (
                  formData.faultCode || '_______________'
                )}
              </td>
              <td style={{ padding: '0.6rem', border: '1px solid #000', fontWeight: 'bold', width: '25%' }}>Equipo:</td>
              <td style={{ padding: '0.6rem', border: '1px solid #000' }}>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.equipmentNumber || ''}
                    onChange={(e) => handleInputChange('equipmentNumber', e.target.value)}
                    style={{ width: '100%', padding: '0.3rem', border: '1px solid #ccc' }}
                  />
                ) : (
                  formData.equipmentNumber || '_______________'
                )}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '0.6rem', border: '1px solid #000', fontWeight: 'bold' }}>Serie:</td>
              <td colSpan={3} style={{ padding: '0.6rem', border: '1px solid #000' }}>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.serialNumber || ''}
                    onChange={(e) => handleInputChange('serialNumber', e.target.value)}
                    style={{ width: '100%', padding: '0.3rem', border: '1px solid #ccc' }}
                  />
                ) : (
                  formData.serialNumber || '_______________'
                )}
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '0.5rem', margin: 0 }}>Acciones Tomadas:</p>
          <div style={{ border: '1px solid #000', minHeight: '60px', padding: '0.6rem' }}>
            {isEditing ? (
              <textarea
                value={formData.actionTaken || ''}
                onChange={(e) => handleInputChange('actionTaken', e.target.value)}
                style={{
                  width: '100%',
                  height: '60px',
                  padding: '0.5rem',
                  border: '1px solid #ccc',
                  fontFamily: 'Arial, sans-serif',
                  resize: 'none'
                }}
              />
            ) : (
              <p style={{ margin: 0, whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                {formData.actionTaken || '_______________'}
              </p>
            )}
          </div>
        </div>

        <div>
          <p style={{ fontWeight: 'bold', marginBottom: '0.5rem', margin: 0 }}>Prevención/Recomendación:</p>
          <div style={{ border: '1px solid #000', minHeight: '60px', padding: '0.6rem' }}>
            {isEditing ? (
              <textarea
                value={formData.preventionTaken || ''}
                onChange={(e) => handleInputChange('preventionTaken', e.target.value)}
                style={{
                  width: '100%',
                  height: '60px',
                  padding: '0.5rem',
                  border: '1px solid #ccc',
                  fontFamily: 'Arial, sans-serif',
                  resize: 'none'
                }}
              />
            ) : (
              <p style={{ margin: 0, whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                {formData.preventionTaken || '_______________'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* SECCIÓN 4: EVALUACIÓN */}
      <div style={{ marginBottom: '1.5rem', pageBreakInside: 'avoid' }}>
        <h3 style={{
          background: '#e5e7eb',
          padding: '0.8rem',
          margin: '0 0 1rem 0',
          fontSize: '0.95rem',
          fontWeight: 'bold',
          border: '2px solid #000'
        }}>
          4. EVALUACIÓN
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ padding: '0.6rem', border: '1px solid #000', fontWeight: 'bold', width: '40%' }}>
                Estado de Completitud:
              </td>
              <td style={{ padding: '0.6rem', border: '1px solid #000' }}>
                {isEditing ? (
                  <select
                    value={formData.rating || 'completed'}
                    onChange={(e) => handleInputChange('rating', e.target.value)}
                    style={{ width: '100%', padding: '0.3rem' }}
                  >
                    <option value="completed">✓ Completado</option>
                    <option value="incomplete">⟳ Incompleto</option>
                    <option value="failed">✗ Fallido</option>
                  </select>
                ) : (
                  <span>
                    {formData.rating === 'completed' && '✓ Completado'}
                    {formData.rating === 'incomplete' && '⟳ Incompleto'}
                    {formData.rating === 'failed' && '✗ Fallido'}
                  </span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* SECCIÓN 5: FIRMAS */}
      <div style={{ marginTop: '3rem', pageBreakInside: 'avoid' }}>
        <h3 style={{
          background: '#e5e7eb',
          padding: '0.8rem',
          margin: '0 0 1rem 0',
          fontSize: '0.95rem',
          fontWeight: 'bold',
          border: '2px solid #000'
        }}>
          5. FIRMAS Y APROBACIÓN
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{
                padding: '0.6rem',
                border: '1px solid #000',
                textAlign: 'center',
                width: '50%',
                height: '80px',
                verticalAlign: 'bottom'
              }}>
                {order.firma_sistemas && (
                  <img
                    src={order.firma_sistemas}
                    alt="Firma técnico"
                    style={{ maxWidth: '100%', maxHeight: '60px', display: 'block', margin: '0 auto 4px auto' }}
                  />
                )}
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 'bold' }}>Técnico</p>
              </td>
              <td style={{
                padding: '0.6rem',
                border: '1px solid #000',
                textAlign: 'center',
                height: '80px',
                verticalAlign: 'bottom'
              }}>
                {order.firma_estacion && (
                  <img
                    src={order.firma_estacion}
                    alt="Firma supervisor"
                    style={{ maxWidth: '100%', maxHeight: '60px', display: 'block', margin: '0 auto 4px auto' }}
                  />
                )}
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 'bold' }}>Supervisor</p>
              </td>
            </tr>
            <tr>
              <td style={{
                padding: '0.6rem',
                border: '1px solid #000',
                textAlign: 'center',
                fontSize: '0.8rem'
              }}>
                {formData.attendedBy || '_______________'}
              </td>
              <td style={{
                padding: '0.6rem',
                border: '1px solid #000',
                textAlign: 'center',
                fontSize: '0.8rem'
              }}>
                {order.User?.nombre || order.usuario?.nombre || '_______________'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      <div style={{
        marginTop: '2rem',
        textAlign: 'center',
        fontSize: '0.8rem',
        color: '#666',
        borderTop: '1px solid #999',
        paddingTop: '1rem'
      }}>
        <p style={{ margin: '0.3rem 0' }}>Este documento fue generado automáticamente</p>
        <p style={{ margin: '0.3rem 0' }}>Generado: {new Date().toLocaleString('es-MX')}</p>
      </div>

      {/* PRINT STYLES */}
      <style>{`
        @media print {
          .report-container {
            padding: 0;
            max-width: 100%;
          }
          button {
            display: none;
          }
          input, textarea, select {
            border: none !important;
            background: transparent !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ReportTemplate;
