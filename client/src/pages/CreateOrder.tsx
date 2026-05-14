import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import { Bars3Icon } from '@heroicons/react/24/outline';
import '../styles/Dashboard.css';

const ESTACIONES = [
  'Valpa', 'Higuera', 'San Ramon', 'Villas de Gpe', 'Calera',
  'Villa de cos', 'Quebradilla', 'Rioja', 'Plaza alessia', 'MC Camino Real', 'Almacen'
];

export const CreateOrder: React.FC = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = useSelector((state: RootState) => state.auth.user);
  const [formData, setFormData] = useState({
    prioridad: 'Baja',
    localizacion: user?.estacion || '',
    descripcion: '',
    observaciones: '',
    tipo: user?.rol === 'sistemas' ? 'compras' : 'sistemas',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.descripcion) {
      setError('La descripción es obligatoria');
      return;
    }

    try {
      setLoading(true);
      await api.post('/orders', formData);
      setError('');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear orden');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="dashboard-main">
        
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="mobile-menu-btn"
            style={{
              padding: '0.6rem 0.8rem',
              background: '#0f172a',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '600',
            }}
          >
            <Bars3Icon style={{ width: '20px', height: '20px' }} />
          </button>
          </div>
<div className="dashboard-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '2rem' }}>
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Nueva Orden de Trabajo</h1>
        
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

          {/* Botones */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded disabled:bg-gray-400"
            >
              {loading ? 'Creando...' : 'Crear Orden'}
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
      </main>
    </div>
  );
};

export default CreateOrder;
