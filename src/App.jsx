import { useState, useEffect } from 'react';
import './App.css';

import { useRecords }      from './hooks/useRecords';
import { useToast }        from './hooks/useToast';
import { exportToExcel }   from './utils/excelExport';
import { supabase, isSupabaseConfigured } from './utils/supabaseClient';

import { StatsBar }        from './components/StatsBar';
import { RentalForm }      from './components/RentalForm';
import { RecordsTable }    from './components/RecordsTable';
import { AnalyticsModal }  from './components/AnalyticsModal';
import { ToastContainer }  from './components/ToastContainer';
import { Login }           from './components/Login';

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const { records, loading, addRecord, updateRecord, deleteRecord, clearAll, stats } = useRecords(user);
  const { toasts, showToast } = useToast();
  const [showRecords, setShowRecords]     = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Monitor Supabase Auth State
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setAuthChecked(true);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    if (supabase) {
      await supabase.auth.signOut();
      showToast('🔒 Logged out successfully', 'info');
    }
  }

  function handleExport() {
    if (records.length === 0) { showToast('⚠️ No records to export!', 'error'); return; }
    const file = exportToExcel(records);
    if (file) showToast(`📥 Exported: ${file}`, 'success');
  }

  function handleUpdate(id, updatedData) {
    updateRecord(id, updatedData);
    showToast('✅ Remaining balance updated!', 'success');
  }

  function handleDelete(id) {
    deleteRecord(id);
    showToast('🗑️ Record deleted', 'info');
  }

  function handleClear() {
    clearAll();
    showToast('🗑️ All records cleared', 'info');
  }

  if (!authChecked) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <span className="spinner" style={{ width: '40px', height: '40px' }} />
      </div>
    );
  }

  // If Supabase is configured and user is not logged in, force Login screen
  if (isSupabaseConfigured() && !user) {
    return (
      <>
        <div className="bg-orbs" aria-hidden="true">
          <div className="orb orb-1" />
          <div className="orb orb-2" />
        </div>
        <Login onAuthSuccess={setUser} showToast={showToast} />
        <ToastContainer toasts={toasts} />
      </>
    );
  }

  return (
    <>
      {/* Animated background orbs */}
      <div className="bg-orbs" aria-hidden="true">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      {/* ── Header ── */}
      <header className="header">
        <div className="header-inner">
          <div className="logo-wrap" style={{ cursor: 'pointer' }} onClick={() => setShowRecords(false)}>
            <img 
              src="/logo.png" 
              alt="Wheelzy Logo" 
              style={{ 
                height: '42px', 
                borderRadius: '10px', 
                border: '1px solid rgba(59,130,246,0.3)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
                objectFit: 'cover'
              }} 
            />
            <div className="logo-text">
              <span className="brand-name">Wheelzy</span>
              <span className="brand-sub">Management System</span>
            </div>
          </div>

          <div className="header-actions">
            {/* Show setup warning banner if Supabase not configured */}
            {!isSupabaseConfigured() && (
              <span style={{ fontSize: '11px', color: 'var(--accent-amber)', background: 'rgba(245,158,11,0.1)', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(245,158,11,0.2)', marginRight: '10px', fontWeight: 600 }}>
                ⚠️ Local Offline Mode
              </span>
            )}

            <button
              className={`btn-hdr${showAnalytics ? ' active' : ''}`}
              onClick={() => setShowAnalytics(true)}
              aria-label="View Bike Revenue & Monthly Reports"
            >
              <span>📈</span>
              <span className="btn-label">Bike Revenue &amp; Reports</span>
            </button>

            <button
              className={`btn-hdr${showRecords ? ' active' : ''}`}
              onClick={() => setShowRecords(v => !v)}
              aria-label={showRecords ? 'Hide records' : 'View records'}
            >
              <span>{showRecords ? '✏️' : '📋'}</span>
              <span className="btn-label">{showRecords ? 'New Entry' : 'View Records'}</span>
            </button>

            <button
              className="btn-hdr btn-hdr-export"
              onClick={handleExport}
              aria-label="Export to Excel"
            >
              <span>📊</span>
              <span className="btn-label">Export Excel</span>
            </button>

            {user && (
              <button
                className="btn-hdr"
                onClick={handleLogout}
                style={{ borderColor: 'rgba(239,68,68,0.2)', color: 'var(--accent-red)' }}
                aria-label="Logout"
              >
                <span>🔒</span>
                <span className="btn-label">Logout</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="main">
        {/* Loading Overlay */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <span className="spinner" />
          </div>
        )}

        {/* Stats */}
        <StatsBar stats={stats} />

        {/* Form */}
        <RentalForm onSave={addRecord} showToast={showToast} />

        {/* Records */}
        {showRecords && (
          <RecordsTable
            records={records}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onClear={handleClear}
          />
        )}
      </main>

      {/* Analytics & Reports Modal */}
      {showAnalytics && (
        <AnalyticsModal
          records={records}
          onClose={() => setShowAnalytics(false)}
          showToast={showToast}
        />
      )}

      {/* Toasts */}
      <ToastContainer toasts={toasts} />
    </>
  );
}
