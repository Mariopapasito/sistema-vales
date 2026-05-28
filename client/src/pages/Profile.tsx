import { useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import api from '../services/api';
import { updateUser } from '../store/slices/authSlice';
import {
  UserCircleIcon, CameraIcon, ArrowPathIcon, CheckIcon, CheckCircleIcon,
} from '@heroicons/react/24/outline';
import '../styles/Profile.css';

export default function Profile() {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [profileData, setProfileData] = useState({
    nombre: user?.nombre || '',
    email: user?.email || '',
    estacion: user?.estacion || '',
  });
  const [foto, setFoto] = useState<string | null>(user?.foto || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Limit file size to 2MB
      if (file.size > 2 * 1024 * 1024) {
        alert('Foto muy grande. Máximo 2MB.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.src = reader.result as string;
        img.onload = () => {
          // Compress image
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Max dimensions
          const maxWidth = 400;
          const maxHeight = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);

          // Convert to JPEG with quality 0.7
          const compressed = canvas.toDataURL('image/jpeg', 0.7);
          setFoto(compressed);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.put(`/users/${user?.id}`, {
        ...profileData,
        foto
      });

      // Update Redux state so photo shows everywhere (Sidebar, etc.)
      dispatch(updateUser({ ...profileData, foto }));

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      console.error('Error:', error);
      alert('❌ Error al actualizar: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '1.75rem 2rem', flex: 1 }}>
        <div className="profile-container">
          <div className="profile-header">
            <h1><UserCircleIcon style={{ width: 28, height: 28 }} /> Mi Perfil</h1>
            <p className="subtitle">Edita tu información personal</p>
          </div>

          {success && (
            <div className="success-message">
              <CheckCircleIcon style={{ width: 18, height: 18 }} /> Perfil actualizado correctamente
            </div>
          )}

          <div className="profile-card">
            <div className="profile-photo-section">
              <div className="photo-container">
                {foto ? (
                  <img src={foto} alt="Perfil" />
                ) : (
                  <div className="photo-placeholder">{user?.nombre?.[0]?.toUpperCase()}</div>
                )}
              </div>
              <button type="button" className="btn-upload" onClick={() => fileInputRef.current?.click()}>
                <CameraIcon style={{ width: 18, height: 18 }} /> Cambiar Foto
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                style={{ display: 'none' }}
              />
            </div>

            <form onSubmit={handleSubmit} className="profile-form">
              <div className="form-group">
                <label>Nombre</label>
                <input
                  type="text"
                  value={profileData.nombre}
                  onChange={(e) => setProfileData({ ...profileData, nombre: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={profileData.email}
                  disabled
                />
              </div>

              <div className="form-group">
                <label>Estación</label>
                <input
                  type="text"
                  value={profileData.estacion}
                  onChange={(e) => setProfileData({ ...profileData, estacion: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Rol</label>
                <input
                  type="text"
                  value={user?.rol || ''}
                  disabled
                />
              </div>

              <button type="submit" disabled={loading} className="btn-save">
                {loading ? <><ArrowPathIcon style={{ width: 16, height: 16 }} /> Guardando...</> : <><CheckIcon style={{ width: 16, height: 16 }} /> Guardar Cambios</>}
              </button>
            </form>
          </div>
        </div>
    </div>
  );
}
