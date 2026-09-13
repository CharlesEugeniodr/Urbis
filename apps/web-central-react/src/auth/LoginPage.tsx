import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { fetchApi } from '../api/client';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await fetchApi('/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      login(data.accessToken, data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Falha ao autenticar');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>URBIS Central</h1>
        {error && <div style={{color: 'red', marginBottom: 15}}>{error}</div>}
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email</label>
            <input className="form-control" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Senha</label>
            <input className="form-control" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn-primary">Entrar</button>
        </form>
      </div>
    </div>
  );
};
