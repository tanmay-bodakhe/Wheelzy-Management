import { useState } from 'react';
import { formatDate, getFileIcon, formatFileSize } from '../utils/helpers';

// ── Document View Modal ────────────────────────────────
function DocModal({ record, onClose }) {
  const [activeImage, setActiveImage] = useState(null);

  const docs = [
    record.aadharCard     && { ...record.aadharCard,     label: 'Aadhar Card',      icon: '🪪' },
    record.drivingLicense && { ...record.drivingLicense, label: 'Driving License',  icon: '🚗' },
  ].filter(Boolean);

  const isImage = (doc) => {
    return doc.data && (doc.type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.name));
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: activeImage ? '700px' : '520px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">
          <h3>📎 Documents — {record.customerName}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {activeImage ? (
            <div style={{ textAlign: 'center' }}>
              <button 
                onClick={() => setActiveImage(null)}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-secondary)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  marginBottom: '12px',
                  fontSize: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                ← Back to List
              </button>
              <div style={{ background: '#000', borderRadius: '12px', padding: '10px', overflow: 'hidden' }}>
                <img 
                  src={activeImage.data} 
                  alt={activeImage.name} 
                  style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: '8px' }} 
                />
              </div>
              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <a
                  href={activeImage.data}
                  download={activeImage.name}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    background: 'var(--accent-blue)',
                    color: '#fff',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: 600
                  }}
                >
                  📥 Download Image
                </a>
              </div>
            </div>
          ) : docs.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No documents uploaded</p>
          ) : (
            docs.map((doc, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-input)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-default)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: 22 }}>{doc.icon}</span>
                  <span className="modal-doc-type">{doc.label}</span>
                  <span className="modal-doc-name" title={doc.name} style={{ flex: 1 }}>
                    {getFileIcon(doc.name)} {doc.name}
                  </span>
                  <span className="modal-doc-size">{formatFileSize(doc.size)}</span>
                </div>

                {isImage(doc) ? (
                  <div style={{ marginTop: '6px' }}>
                    <div 
                      onClick={() => setActiveImage(doc)}
                      style={{
                        position: 'relative',
                        cursor: 'pointer',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        maxHeight: '160px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: '#000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <img 
                        src={doc.data} 
                        alt={doc.name} 
                        style={{ width: '100%', maxHeight: '160px', objectFit: 'cover' }} 
                      />
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '13px',
                        gap: '6px',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
                      >
                        🔍 Click to View Full Image
                      </div>
                    </div>
                  </div>
                ) : doc.data ? (
                  <div style={{ marginTop: '4px' }}>
                    <a 
                      href={doc.data} 
                      download={doc.name}
                      style={{ color: 'var(--accent-blue)', fontSize: '12px', textDecoration: 'none', fontWeight: 600 }}
                    >
                      📥 Download File
                    </a>
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    (File metadata only — re-upload to store viewable copy)
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Edit Balance Modal ─────────────────────────────────
function EditBalanceModal({ record, onSave, onClose }) {
  const rent    = parseFloat(record.rentAmount)    || 0;
  const deposit = parseFloat(record.safetyDeposit) || 0;
  const total   = rent + deposit;

  const [advance, setAdvance] = useState(record.advanceAmount || 0);
  const [balance, setBalance] = useState((record.rentAmount + (record.safetyDeposit || 0)) - (record.advanceAmount || 0));

  function handleAdvanceChange(val) {
    const adv = parseFloat(val) || 0;
    setAdvance(val);
    setBalance(total - adv);
  }

  function handleBalanceChange(val) {
    const bal = parseFloat(val) || 0;
    setBalance(val);
    setAdvance(total - bal);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const finalAdv = parseFloat(advance) || 0;
    const finalBal = total - finalAdv;
    onSave(record.id, {
      advanceAmount: finalAdv,
      balanceDue: finalBal,
    });
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: '460px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-hdr">
          <h3>✏️ Update Remaining Amount</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          {/* Readonly info */}
          <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-default)', fontSize: '13px' }}>
            <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>
              👤 {record.customerName}
            </div>
            <div style={{ color: 'var(--text-muted)' }}>
              🏍️ {record.bikeModel} {record.bikeNumber ? `(${record.bikeNumber})` : ''}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed var(--border-default)', fontSize: '12px' }}>
              <span>Rent Amount: <strong>₹{rent.toFixed(2)}</strong></span>
              <span>Safety Deposit: <strong>₹{deposit.toFixed(2)}</strong></span>
            </div>
          </div>

          {/* Editable Field: Remaining / Advance */}
          <div className="field" style={{ marginTop: '14px' }}>
            <label className="field-label">Remaining Amount / Balance Due (₹) <span className="required">*</span></label>
            <div className="input-wrap">
              <span className="input-icon">💵</span>
              <input
                type="number" step="0.01" min="0"
                className="form-input"
                value={balance}
                onChange={e => handleBalanceChange(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              (Rent Total: ₹{total.toFixed(2)})
            </span>
          </div>

          <div className="field" style={{ marginTop: '10px' }}>
            <label className="field-label">Advance Paid (₹)</label>
            <div className="input-wrap">
              <span className="input-icon">💳</span>
              <input
                type="number" step="0.01" min="0"
                className="form-input"
                value={advance}
                onChange={e => handleAdvanceChange(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px', paddingTop: '14px', borderTop: '1px solid var(--border-default)' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" style={{ padding: '10px 20px', fontSize: '13px' }}>
              ✅ Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Records Table ──────────────────────────────────────
export function RecordsTable({ records, onUpdate, onDelete, onClear }) {
  const [search,   setSearch]   = useState('');
  const [viewing,  setViewing]  = useState(null); // record for doc modal
  const [editing,  setEditing]  = useState(null); // record for edit modal

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    return !q
      || r.customerName.toLowerCase().includes(q)
      || r.bikeModel.toLowerCase().includes(q)
      || (r.bikeNumber || '').toLowerCase().includes(q)
      || (r.customerPhone || '').includes(q);
  });

  function docStatus(r) {
    const hasDocs = r.aadharCard || r.drivingLicense;
    if (!hasDocs) return <span className="doc-badge none">None</span>;
    const count = [r.aadharCard, r.drivingLicense].filter(Boolean).length;
    return (
      <span className="doc-badge" onClick={() => setViewing(r)}>
        📎 {count} doc{count > 1 ? 's' : ''}
      </span>
    );
  }

  return (
    <>
      <div className="records-card">
        {/* Header */}
        <div className="records-hdr">
          <div className="records-title">📋 All Rental Records</div>
          <div className="records-controls">
            <input
              className="search-input"
              placeholder="🔍 Search name, bike…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button className="btn-danger" onClick={() => {
              if (records.length === 0) return;
              if (window.confirm(`Delete all ${records.length} records? This cannot be undone.`))
                onClear();
            }}>
              🗑️ Clear All
            </button>
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">{search ? '🔍' : '📭'}</div>
            <div className="empty-text">{search ? 'No matching records' : 'No records yet'}</div>
            <div className="empty-sub">
              {search ? 'Try a different search term' : 'Add your first rental entry using the form above'}
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="rec-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Bike</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Duration</th>
                  <th>Rent (₹)</th>
                  <th>Deposit (₹)</th>
                  <th>Advance (₹)</th>
                  <th>Balance (₹)</th>
                  <th>Docs</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id}>
                    <td>{i + 1}</td>
                    <td>
                      <div className="cell-name">{r.customerName}</div>
                      {r.customerAddress && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          📍 {r.customerAddress}
                        </div>
                      )}
                    </td>
                    <td>{r.customerPhone || '—'}</td>
                    <td>
                      <div>{r.bikeModel}</div>
                      {r.bikeNumber && <div className="bike-plate">🔖 {r.bikeNumber}</div>}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(r.dateFrom)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(r.dateTo)}</td>
                    <td>{r.duration || '—'}</td>
                    <td>₹{(r.rentAmount    || 0).toFixed(2)}</td>
                    <td>₹{(r.safetyDeposit || 0).toFixed(2)}</td>
                    <td>₹{(r.advanceAmount || 0).toFixed(2)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {(r.balanceDue || 0) <= 0 ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          background: 'rgba(16,185,129,0.15)',
                          color: '#34d399',
                          border: '1px solid rgba(16,185,129,0.3)',
                          fontWeight: 700,
                          fontSize: '12px'
                        }}>
                          ✅ Paid
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          background: 'rgba(239,68,68,0.12)',
                          color: '#f87171',
                          border: '1px solid rgba(239,68,68,0.25)',
                          fontWeight: 700,
                          fontSize: '12px'
                        }}>
                          ⏳ ₹{(r.balanceDue || 0).toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td>{docStatus(r)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="action-btn"
                          style={{
                            background: 'rgba(59,130,246,0.1)',
                            border: '1px solid rgba(59,130,246,0.3)',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            color: '#60a5fa',
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontWeight: 600
                          }}
                          onClick={() => setEditing(r)}
                          title="Edit Remaining Amount"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="action-del"
                          onClick={() => {
                            if (window.confirm(`Delete entry for ${r.customerName}?`))
                              onDelete(r.id);
                          }}
                        >
                          🗑️ Del
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Document Modal */}
      {viewing && <DocModal record={viewing} onClose={() => setViewing(null)} />}

      {/* Edit Remaining Balance Modal */}
      {editing && (
        <EditBalanceModal
          record={editing}
          onSave={onUpdate}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
