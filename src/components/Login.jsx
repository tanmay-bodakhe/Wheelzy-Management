import { useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export function Login({ onAuthSuccess, showToast }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      showToast('⚠️ Email and password are required!', 'error');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      showToast('🔓 Welcome back to Wheelzy!', 'success');
      if (data.user) {
        onAuthSuccess(data.user);
      }
    } catch (error) {
      showToast(`❌ Auth Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      padding: '20px',
      position: 'relative',
      zIndex: 10
    }}>
      <div className="form-card" style={{ maxWidth: '400px', width: '100%', animation: 'fadeUp 0.4s ease' }}>
        <div className="form-card-header" style={{ textAlign: 'center' }}>
          <img src="/logo.png" alt="Wheelzy Logo" style={{ height: '60px', borderRadius: '12px', marginBottom: '14px', border: '1px solid rgba(59,130,246,0.3)' }} />
          <h2 className="form-card-title" style={{ fontSize: '24px' }}>
            Wheelzy Sign In
          </h2>
          <p className="form-card-sub">
            Authorized admin access only
          </p>
        </div>

        <form className="form-body" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="field">
            <label className="field-label">Email Address</label>
            <div className="input-wrap">
              <span className="input-icon">✉️</span>
              <input
                type="email"
                className="form-input"
                placeholder="admin@wheelzy.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="field">
            <label className="field-label">Password</label>
            <div className="input-wrap">
              <span className="input-icon">🔒</span>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ justifyContent: 'center', width: '100%', marginTop: '10px' }}>
            {loading ? <span className="spinner" /> : '🔐'}
            {loading ? 'Processing...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
