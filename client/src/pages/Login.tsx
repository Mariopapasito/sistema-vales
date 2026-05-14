import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { login } from '../store/slices/authSlice';
import { AppDispatch } from '../store';
import '../styles/Login.css';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await dispatch(login({ email, password }));
      if (login.fulfilled.match(result)) {
        navigate('/dashboard');
      } else {
        setError('Correo o contraseña incorrectos');
      }
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* LEFT — Brand panel */}
      <div className="login-brand-panel">
        <div className="login-brand-overlay" />
        <img src="/la-villita-logo.png" alt="La Villita" className="login-brand-img" />
        <div className="login-brand-footer">
          <p>Sistema de Gestión de Órdenes de Trabajo</p>
        </div>
      </div>

      {/* RIGHT — Form panel */}
      <div className="login-form-panel">
        <div className="login-form-card">
          <div className="login-form-header">
            <img src="/logo.png" alt="La Villita" className="login-logo-top" />
            <h1>Bienvenido</h1>
            <p>Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form-body">
            {error && (
              <div className="login-error">
                {error}
              </div>
            )}

            <div className="login-field">
              <label htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@lavillita.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="login-field">
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (
                <span className="login-spinner" />
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          <p className="login-footer-text">© 2026 La Villita · Todos los derechos reservados</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
