import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import api from '../services/api';
import BrandLoader from '../components/BrandLoader';
import toast from 'react-hot-toast';
import {
  XCircleIcon, UserPlusIcon, PencilSquareIcon, TrashIcon, XMarkIcon,
} from '@heroicons/react/24/outline';
import '../styles/Users.css';
import '../styles/Dashboard.css';

export default function Users() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'estacion',
    estacion: '',
  });

  useEffect(() => {
    if (user?.rol === 'jefe' || user?.rol === 'sistemas') {
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingUser(null);
    setFormData({
      nombre: '',
      email: '',
      password: '',
      rol: 'estacion',
      estacion: '',
    });
    setShowModal(true);
  };

  const handleEdit = (u: any) => {
    setEditingUser(u);
    setFormData({
      nombre: u.nombre,
      email: u.email,
      password: '',
      rol: u.rol,
      estacion: u.estacion,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, {
          nombre: formData.nombre,
          estacion: formData.estacion,
        });
        toast.success('Usuario actualizado');
      } else {
        await api.post('/users', formData);
        toast.success('Usuario creado exitosamente');
      }

      setShowModal(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.response?.data?.message || 'No se pudo guardar el usuario');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;

    try {
      await api.delete(`/users/${id}`);
      toast.success('Usuario eliminado');
      fetchUsers();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Error al eliminar usuario');
    }
  };

  if (user?.rol !== 'jefe' && user?.rol !== 'sistemas') {
    return (
      <div className="access-denied">
        <h2><XCircleIcon style={{ width: 24, height: 24 }} /> Acceso Denegado</h2>
        <p>Solo Jefe y Sistemas pueden gestionar usuarios</p>
      </div>
    );
  }

  const rolColors: Record<string, string> = {
    admin: '#0066cc',
    sistemas: '#0052a3',
    estacion: '#27ae60',
    almacen: '#16a085',
    constructora: '#2980b9',
    marketing: '#e74c3c',
    compras: '#f39c12',
    jefe: '#9b59b6',
  };

  return (
    <div className="users-container">
      <div className="users-header">
        <div>
          <h1>Gestión de Usuarios</h1>
          <p className="subtitle">Crear y administrar usuarios del sistema</p>
        </div>
        <button className="btn-create-user" onClick={handleCreate}>
          <UserPlusIcon style={{ width: 18, height: 18 }} /> Crear Usuario
        </button>
      </div>

      {loading ? (
        <BrandLoader variant="page" label="Cargando usuarios..." />
      ) : users.length === 0 ? (
        <div className="empty-state">
          <p>No hay usuarios registrados</p>
        </div>
      ) : (
        <div className="users-grid">
          {users.map((u: any) => (
            <div key={u.id} className="user-card">
              <div className="user-avatar-large">
                {u.foto ? (
                  <img src={u.foto} alt={u.nombre} />
                ) : (
                  u.nombre[0].toUpperCase()
                )}
              </div>

              <div className="user-card-content">
                <h3>{u.nombre}</h3>
                <p className="user-email">{u.email}</p>

                <div className="user-info">
                  <div className="info-item">
                    <span className="label">Rol:</span>
                    <span
                      className="role-badge"
                      style={{ backgroundColor: rolColors[u.rol] || '#666' }}
                    >
                      {u.rol.toUpperCase()}
                    </span>
                  </div>
                  {u.estacion && (
                    <div className="info-item">
                      <span className="label">Estación:</span>
                      <span className="value">{u.estacion}</span>
                    </div>
                  )}
                </div>

                <div className="user-card-actions">
                  <button
                    className="btn-edit"
                    onClick={() => handleEdit(u)}
                  >
                    <PencilSquareIcon style={{ width: 16, height: 16 }} /> Editar
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => handleDelete(u.id)}
                  >
                    <TrashIcon style={{ width: 16, height: 16 }} /> Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de crear/editar usuario */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setShowModal(false)}
            >
              <XMarkIcon style={{ width: 18, height: 18 }} />
            </button>

            <h2>{editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</h2>

            <form onSubmit={handleSubmit} className="user-form">
              <div className="form-group">
                <label>Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                  placeholder="Ej: Juan Pérez"
                />
              </div>

              {!editingUser && (
                <>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="usuario@example.com"
                    />
                  </div>

                  <div className="form-group">
                    <label>Contraseña</label>
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="form-group">
                    <label>Rol</label>
                    <select
                      value={formData.rol}
                      onChange={(e) =>
                        setFormData({ ...formData, rol: e.target.value })
                      }
                    >
                      <option value="estacion">Estación</option>
                      <option value="almacen">Almacén</option>
                      <option value="constructora">Constructora</option>
                      <option value="marketing">Marketing</option>
                      <option value="sistemas">Sistemas</option>
                      <option value="jefe">Jefe</option>
                      <option value="compras">Compras</option>
                    </select>
                  </div>
                </>
              )}

              <div className="form-group">
                <label>Departamento / Estación</label>
                <input
                  type="text"
                  value={formData.estacion}
                  onChange={(e) =>
                    setFormData({ ...formData, estacion: e.target.value })
                  }
                  placeholder="Ej: Estación 3, Almacén Norte..."
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-save">
                  {editingUser ? 'Actualizar' : 'Crear'} Usuario
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
