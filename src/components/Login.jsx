import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';

export function Login({ onAuthSuccess, showToast, initialMode = 'login', onResetComplete }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'forgot' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [hasActiveSession, setHasActiveSession] = useState(false);

  // Sync mode if initialMode changes or if URL hash contains reset
  useEffect(() => {
    if (initialMode) setMode(initialMode);
    if (typeof window !== 'undefined') {
      if (window.location.hash.includes('reset') || window.location.hash.includes('recovery')) {
        setMode('reset');
      }
    }
  }, [initialMode]);

  // Check if there is an active Supabase user session (e.g. from recovery link)
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setHasActiveSession(true);
        if (session.user.email) setEmail(session.user.email);
      }
    });
  }, [mode]);

  // Resend countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(c => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Read .env fallback credentials if configured
  const envAdminId = (import.meta.env.VITE_ADMIN_ID || '').trim();
  const envAdminEmail = (import.meta.env.VITE_ADMIN_EMAIL || '').trim();
  const envAdminPassword = (import.meta.env.VITE_ADMIN_PASSWORD || '').trim();

  // ── Handle Sign In ────────────────────────────────────────────────────────
  async function handleSignIn(e) {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password.trim()) {
      showToast('⚠️ Email and password are required!', 'error');
      return;
    }

    setLoading(true);

    try {
      // 1. Check against hardcoded .env admin fallback if available
      const isHardcodedMatch =
        envAdminPassword &&
        password === envAdminPassword &&
        ((envAdminId && cleanEmail.toLowerCase() === envAdminId.toLowerCase()) ||
         (envAdminEmail && cleanEmail.toLowerCase() === envAdminEmail.toLowerCase()));

      if (isHardcodedMatch) {
        const hardcodedUser = {
          id: '00000000-0000-4000-8000-000000000001',
          email: envAdminEmail || cleanEmail,
          user_metadata: { role: 'admin', name: 'Wheelzy Admin' },
          isHardcoded: true,
        };
        localStorage.setItem('wheelzy_auth_user', JSON.stringify(hardcodedUser));
        showToast('🔓 Logged in successfully as Admin!', 'success');
        onAuthSuccess(hardcodedUser);
        return;
      }

      // 2. Authenticate with Supabase
      if (!supabase) {
        throw new Error('Supabase is not configured.');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) throw error;

      showToast('🔓 Welcome back to Wheelzy!', 'success');
      if (data.user) {
        onAuthSuccess(data.user);
      }
    } catch (error) {
      showToast(`❌ Auth Error: ${error.message || 'Invalid login credentials'}`, 'error');
    } finally {
      setLoading(false);
    }
  }

  // ── Handle Forgot Password (Send Reset Link) ──────────────────────────────
  async function handleForgotPassword(e) {
    if (e && e.preventDefault) e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      showToast('⚠️ Please enter your registered email address!', 'error');
      return;
    }

    setLoading(true);

    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized.');
      }

      // Include #reset-password in the redirect so the client always lands in reset mode
      const redirectUrl = `${window.location.origin}/#reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      setResetSent(true);
      setResendCooldown(60);
      showToast(`📬 Fresh reset link sent to ${cleanEmail}!`, 'success');
    } catch (error) {
      showToast(`❌ Failed to send reset email: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }

  // ── Handle Password Reset (Save New Password) ─────────────────────────────
  async function handleResetPassword(e) {
    e.preventDefault();
    if (!newPassword.trim()) {
      showToast('⚠️ Please enter a new password!', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('⚠️ Password must be at least 6 characters long!', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('⚠️ Passwords do not match! Please check again.', 'error');
      return;
    }

    setLoading(true);

    try {
      if (!supabase) {
        throw new Error('Supabase client is not initialized.');
      }

      // If OTP code is entered and no active session
      if (otpCode.trim() && !hasActiveSession) {
        const { error: otpError } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: otpCode.trim(),
          type: 'recovery',
        });
        if (otpError) throw otpError;
      }

      // Update password
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      showToast('🎉 Password reset successfully! You are now logged in.', 'success');

      // Clean the recovery fragment from browser address bar
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname);
      }

      if (data.user) {
        onAuthSuccess(data.user);
      }
      if (onResetComplete) {
        onResetComplete();
      }
    } catch (error) {
      showToast(`❌ Reset Failed: ${error.message}. Try requesting a fresh reset link below.`, 'error');
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
      <div className="form-card" style={{ maxWidth: '440px', width: '100%', animation: 'fadeUp 0.35s ease' }}>
        
        {/* Card Header */}
        <div className="form-card-header" style={{ textAlign: 'center' }}>
          <img
            src="/logo.png"
            alt="Wheelzy Logo"
            style={{
              height: '56px',
              borderRadius: '12px',
              marginBottom: '12px',
              border: '1px solid rgba(59,130,246,0.3)',
              boxShadow: '0 4px 14px rgba(0,0,0,0.35)'
            }}
          />
          <h2 className="form-card-title" style={{ fontSize: '24px' }}>
            {mode === 'login' && 'Wheelzy Sign In'}
            {mode === 'forgot' && 'Reset Password Link'}
            {mode === 'reset' && 'Set New Password'}
          </h2>
          <p className="form-card-sub">
            {mode === 'login' && 'Authorized admin access only'}
            {mode === 'forgot' && 'Enter your registered email to receive a recovery link'}
            {mode === 'reset' && 'Create your new password to regain account access'}
          </p>
        </div>

        {/* ── Mode Navigation Tabs ─────────────────────────────────────── */}
        <div style={{
          display: 'flex',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '10px',
          padding: '4px',
          marginBottom: '20px',
          border: '1px solid var(--border-default)',
          gap: '4px'
        }}>
          <button
            type="button"
            onClick={() => setMode('login')}
            style={{
              flex: 1,
              padding: '8px 6px',
              borderRadius: '7px',
              border: 'none',
              background: mode === 'login' ? 'var(--accent-blue)' : 'transparent',
              color: mode === 'login' ? '#fff' : 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            🔐 Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('forgot')}
            style={{
              flex: 1,
              padding: '8px 6px',
              borderRadius: '7px',
              border: 'none',
              background: mode === 'forgot' ? 'var(--accent-blue)' : 'transparent',
              color: mode === 'forgot' ? '#fff' : 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            📨 Send Link
          </button>
          <button
            type="button"
            onClick={() => setMode('reset')}
            style={{
              flex: 1,
              padding: '8px 6px',
              borderRadius: '7px',
              border: 'none',
              background: mode === 'reset' ? 'var(--accent-blue)' : 'transparent',
              color: mode === 'reset' ? '#fff' : 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            🔑 Set Password
          </button>
        </div>

        {/* ── Mode 1: Login Form ────────────────────────────────────────── */}
        {mode === 'login' && (
          <form className="form-body" onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="field-label" style={{ margin: 0 }}>Password</label>
                <button
                  type="button"
                  onClick={() => { setResetSent(false); setMode('forgot'); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-blue)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <div className="input-wrap">
                <span className="input-icon">🔒</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0 10px',
                    color: 'var(--text-muted)',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ justifyContent: 'center', width: '100%', marginTop: '6px' }}
            >
              {loading ? <span className="spinner" /> : '🔐'}
              {loading ? 'Signing In...' : 'Sign In'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setMode('reset')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: '4px'
                }}
              >
                Already have a reset link? Set New Password →
              </button>
            </div>
          </form>
        )}

        {/* ── Mode 2: Forgot Password Form ─────────────────────────────── */}
        {mode === 'forgot' && (
          <div className="form-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {resetSent ? (
              <div style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '12px',
                padding: '20px 16px',
                textAlign: 'center',
                animation: 'fadeUp 0.3s ease'
              }}>
                <div style={{ fontSize: '36px', marginBottom: '10px' }}>📬</div>
                <h3 style={{ fontSize: '17px', color: '#34d399', margin: '0 0 8px 0', fontWeight: 700 }}>
                  Reset Link Dispatched!
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                  A fresh recovery link was sent to:
                  <br />
                  <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                  Check your inbox and spam folder. Click the link in that email to create your new password.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => setMode('reset')}
                    style={{ justifyContent: 'center', width: '100%', fontSize: '13px' }}
                  >
                    🔑 Clicked the email link? Set New Password
                  </button>

                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={loading || resendCooldown > 0}
                    onClick={handleForgotPassword}
                    style={{ justifyContent: 'center', width: '100%', fontSize: '12px' }}
                  >
                    {resendCooldown > 0 ? `Resend email in ${resendCooldown}s` : 'Resend Link'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="field">
                  <label className="field-label">Registered Email Address</label>
                  <div className="input-wrap">
                    <span className="input-icon">✉️</span>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="admin@wheelzy.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                  style={{ justifyContent: 'center', width: '100%', marginTop: '6px' }}
                >
                  {loading ? <span className="spinner" /> : '📨'}
                  {loading ? 'Sending Recovery Link...' : 'Send Reset Link'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ── Mode 3: Set New Password Form ────────────────────────────── */}
        {mode === 'reset' && (
          <form className="form-body" onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {hasActiveSession ? (
              <div style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '12px',
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>✅</span>
                <span>Verified recovery session detected for <strong>{email || 'your account'}</strong>.</span>
              </div>
            ) : (
              <div style={{
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                lineHeight: 1.4
              }}>
                <span>💡 Clicked the email link or have a code? Type your new password below. If the link expired, click <strong>Send Link</strong> above.</span>
              </div>
            )}

            <div className="field">
              <label className="field-label">Registered Email</label>
              <div className="input-wrap">
                <span className="input-icon">✉️</span>
                <input
                  type="email"
                  className="form-input"
                  placeholder="admin@wheelzy.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="field">
              <label className="field-label">New Password</label>
              <div className="input-wrap">
                <span className="input-icon">🔒</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  minLength={6}
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0 10px',
                    color: 'var(--text-muted)',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <div className="field">
              <label className="field-label">Confirm New Password</label>
              <div className="input-wrap">
                <span className="input-icon">🔒</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Re-type new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
            </div>

            {!hasActiveSession && (
              <div className="field">
                <label className="field-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Reset Code / OTP (optional)</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>If received in email</span>
                </label>
                <div className="input-wrap">
                  <span className="input-icon">🔢</span>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 123456 (leave blank if clicked link)"
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value)}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ justifyContent: 'center', width: '100%', marginTop: '6px' }}
            >
              {loading ? <span className="spinner" /> : '💾'}
              {loading ? 'Saving...' : 'Save New Password & Sign In'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setMode('forgot')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-blue)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0
                }}
              >
                ← Request fresh link
              </button>
              <button
                type="button"
                onClick={() => setMode('login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
