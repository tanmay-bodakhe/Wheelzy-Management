import { useState } from 'react';
import { exportToExcel } from '../utils/excelExport';

export function AnalyticsModal({ records, onClose, showToast }) {
  const [selectedMonth, setSelectedMonth] = useState('all');

  // Available unique months from records (format: 'YYYY-MM')
  const availableMonths = Array.from(new Set(
    records.map(r => {
      const d = r.dateFrom || r.entryDate;
      return d ? d.slice(0, 7) : null;
    }).filter(Boolean)
  )).sort().reverse();

  // Filter records by selected month
  const filteredRecords = selectedMonth === 'all'
    ? records
    : records.filter(r => {
        const d = r.dateFrom || r.entryDate;
        return d && d.startsWith(selectedMonth);
      });

  // Calculate Bike-wise breakdown
  const bikeAnalytics = {};
  filteredRecords.forEach(r => {
    const bike = r.bikeModel || 'Other';
    if (!bikeAnalytics[bike]) {
      bikeAnalytics[bike] = { count: 0, rent: 0, deposit: 0, balance: 0 };
    }
    bikeAnalytics[bike].count   += 1;
    bikeAnalytics[bike].rent    += parseFloat(r.rentAmount)    || 0;
    bikeAnalytics[bike].deposit += parseFloat(r.safetyDeposit) || 0;
    bikeAnalytics[bike].balance += parseFloat(r.balanceDue)    || 0;
  });

  const totalRent    = filteredRecords.reduce((s, r) => s + (parseFloat(r.rentAmount) || 0), 0);
  const totalDeposit = filteredRecords.reduce((s, r) => s + (parseFloat(r.safetyDeposit) || 0), 0);
  const totalBalance = filteredRecords.reduce((s, r) => s + (parseFloat(r.balanceDue) || 0), 0);

  function handleExport() {
    const file = exportToExcel(records, selectedMonth);
    if (file) {
      showToast(`📥 Exported: ${file}`, 'success');
    } else {
      showToast('⚠️ No records found for selected period!', 'error');
    }
  }

  // Format month label
  function formatMonthLabel(mStr) {
    if (mStr === 'all') return 'All Time';
    const [y, m] = mStr.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1, 1);
    return date.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: '720px' }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="modal-hdr">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/logo.png" alt="Wheelzy Logo" style={{ height: '32px', borderRadius: '6px' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '18px' }}>Wheelzy Revenue &amp; Analytics</h3>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Bike-wise rent report &amp; monthly breakdown</span>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          
          {/* Month Selector Filter Bar */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            background: 'var(--bg-input)',
            padding: '12px 16px',
            borderRadius: '10px',
            border: '1px solid var(--border-default)',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>📅 Select Month:</span>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                style={{
                  padding: '6px 12px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-hover)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Months Overview</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>{formatMonthLabel(m)}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleExport}
              className="btn-hdr btn-hdr-export"
              style={{ padding: '7px 16px', fontSize: '13px' }}
            >
              📊 Export {selectedMonth === 'all' ? 'All Data' : formatMonthLabel(selectedMonth)} Excel
            </button>
          </div>

          {/* Quick Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '12px' }}>
            <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total Rent Earned</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#60a5fa', marginTop: '2px' }}>₹{totalRent.toFixed(2)}</div>
            </div>
            <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Safety Deposits</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#34d399', marginTop: '2px' }}>₹{totalDeposit.toFixed(2)}</div>
            </div>
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Pending Balance</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#f87171', marginTop: '2px' }}>₹{totalBalance.toFixed(2)}</div>
            </div>
          </div>

          {/* Bike Revenue Breakdown Table */}
          <div style={{ marginTop: '16px' }}>
            <h4 style={{ fontSize: '14px', marginBottom: '10px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🏍️ Rent Earned per Bike Model ({formatMonthLabel(selectedMonth)})
            </h4>

            {Object.keys(bikeAnalytics).length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px' }}>No rentals found for this period.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.entries(bikeAnalytics).map(([bike, data]) => {
                  const percent = totalRent > 0 ? ((data.rent / totalRent) * 100).toFixed(1) : 0;
                  return (
                    <div key={bike} style={{ 
                      background: 'var(--bg-input)', 
                      border: '1px solid var(--border-default)', 
                      borderRadius: '10px', 
                      padding: '14px' 
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <div>
                          <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>🏍️ {bike}</strong>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '10px' }}>
                            ({data.count} rental{data.count > 1 ? 's' : ''})
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-blue)' }}>
                            ₹{data.rent.toFixed(2)}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                            ({percent}%)
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${percent}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', borderRadius: '3px' }} />
                      </div>

                      <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span>🛡️ Deposit: ₹{data.deposit.toFixed(2)}</span>
                        <span>{data.balance <= 0 ? <strong style={{ color: '#34d399' }}>✅ All Paid</strong> : <strong style={{ color: '#f87171' }}>⚠️ Pending Balance: ₹{data.balance.toFixed(2)}</strong>}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
