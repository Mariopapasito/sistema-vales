import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import api from '../services/api';
import BrandLoader from '../components/BrandLoader';
import DraftStatus from '../components/DraftStatus';
import { useAutosavedDraft } from '../hooks/useAutosavedDraft';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import '../styles/Dashboard.css';

const ESTACIONES = [
  'Valpa', 'Higuera', 'San Ramon', 'Villas de Gpe', 'Calera',
  'Villa de cos', 'Quebradilla', 'Rioja', 'Plaza alessia', 'MC Camino Real', 'Almacen'
];

export const CreateOrder: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const [formData, setFormData] = useState({
    prioridad: 'Baja',
    localizacion: user?.estacion || '',
    descripcion: '',
    observaciones: '',
    tipo: user?.rol === 'sistemas' ? 'compras' : user?.rol === 'compras' ? 'sistemas' : 'sistemas',
  });
  const [imagenes, setImagenes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { savedAt, clearDraft } = useAutosavedDraft({
    storageKey: user?.id ? `draft:create-order:${user.id}` : null,
    value: formData,
    onRestore: (draft) => setFormData((current) => ({ ...current, ...draft, localizacion: user?.estacion || draft.localizacion })),
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (imagenes.length + files.length > 5) {
      setError('Máximo 5 imágenes');
      return;
    }
    files.forEach(file => {
      if (file.size > 3 * 1024 * 1024) {
        setError(`"${file.name}" supera 3MB`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImagenes(prev => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const removeImage = (idx: number) => {
    setImagenes(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.descripcion) {
      setError('La descripción es obligatoria');
      return;
    }

    try {
      setLoading(true);
      await api.post('/orders', { ...formData, imagenes });
      clearDraft();
      setError('');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear orden');
    } finally {
      setLoading(false);
    }
  };

  return (
<div className="dashboard-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '2rem' }}>
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <h1 className="text-3xl font-bold text-gray-800" style={{ margin: 0 }}>Nueva Orden de Trabajo</h1>
          <DraftStatus savedAt={savedAt} />
        </div>
        
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Estación (Auto del usuario) */}
          <div className="bg-blue-50 p-3 rounded border border-blue-200 mb-4">
            <p className="text-sm text-gray-600"><strong>Estación:</strong> <span className="text-blue-700 font-semibold">{user?.estacion}</span></p>
            <p className="text-xs text-gray-500 mt-1">Se registrará automáticamente desde tu perfil</p>
          </div>

          {/* Vale para */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Vale para *</label>
            {user?.rol === 'sistemas' ? (
              <div className="w-full p-3 border border-gray-200 rounded bg-gray-50 text-gray-700 font-semibold">
                Compras
              </div>
            ) : user?.rol === 'compras' ? (
              <div className="w-full p-3 border border-gray-200 rounded bg-gray-50 text-gray-700 font-semibold">
                Sistemas
              </div>
            ) : (
              <select
                name="tipo"
                value={formData.tipo}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="sistemas">Sistemas</option>
                <option value="compras">Compras</option>
              </select>
            )}
          </div>

          {/* Prioridad */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Prioridad *</label>
            <select
              name="prioridad"
              value={formData.prioridad}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Baja">Baja</option>
              <option value="Alta">Alta</option>
              <option value="Paro">Paro</option>
              <option value="Correctivo">Correctivo</option>
            </select>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Descripción del Problema *</label>
            <textarea
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              placeholder="Describe el problema..."
              rows={4}
              className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">Observaciones (Opcional)</label>
            <textarea
              name="observaciones"
              value={formData.observaciones}
              onChange={handleChange}
              placeholder="Observaciones adicionales..."
              rows={3}
              className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>

          {/* Imágenes */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Imágenes del problema <span className="text-gray-400 font-normal">(opcional, máx. 5)</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              style={{ display: 'none' }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageSelect}
              style={{ display: 'none' }}
            />
            {imagenes.length < 5 && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.75rem 1rem', border: '2px dashed #d1d5db',
                    borderRadius: '8px', background: '#f9fafb', color: '#6b7280',
                    cursor: 'pointer', flex: 1, justifyContent: 'center',
                    fontSize: '0.9rem', fontWeight: '500'
                  }}
                >
                  📷 Cámara
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.75rem 1rem', border: '2px dashed #d1d5db',
                    borderRadius: '8px', background: '#f9fafb', color: '#6b7280',
                    cursor: 'pointer', flex: 1, justifyContent: 'center',
                    fontSize: '0.9rem', fontWeight: '500'
                  }}
                >
                  <PhotoIcon style={{ width: 20, height: 20 }} />
                  Galería
                </button>
              </div>
            )}
            {imagenes.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
                {imagenes.map((img, idx) => (
                  <div key={idx} style={{ position: 'relative', width: 90, height: 90 }}>
                    <img
                      src={img}
                      alt={`Imagen ${idx + 1}`}
                      style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb' }}
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      style={{
                        position: 'absolute', top: -6, right: -6,
                        background: '#ef4444', color: 'white', border: 'none',
                        borderRadius: '50%', width: 22, height: 22,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      <XMarkIcon style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded disabled:bg-gray-400"
            >
              {loading ? <BrandLoader variant="button" label="Creando..." /> : 'Crear Orden'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-bold py-3 rounded"
            >
              Cancelar
            </button>
          </div>
        </form>
          </div>
        </div>
  );
};

export default CreateOrder;
