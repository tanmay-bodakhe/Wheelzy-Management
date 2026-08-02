import { useState, useEffect } from 'react';
import { DocUploadCard } from './DocUploadCard';
import { toDatetimeLocal, calcDuration } from '../utils/helpers';

const INIT = {
  customerName: '', customerPhone: '', customerAddress: '',
  bikeModel: '', bikeNumber: '',
  dateFrom: '', dateTo: '',
  rentAmount: '', safetyDeposit: '', advanceAmount: '', paidAmount: '',
  notes: '',
};

function getDefaults() {
  const now  = new Date();
  const next = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return {
    ...INIT,
    dateFrom: toDatetimeLocal(now),
    dateTo:   toDatetimeLocal(next),
  };
}

export function RentalForm({ onSave, showToast }) {
  const [form,    setForm]    = useState(getDefaults);
  const [docs,    setDocs]    = useState({ aadharCard: null, drivingLicense: null });
  const [errors,  setErrors]  = useState({});
  const [saving,  setSaving]  = useState(false);

  // Derived
  const rent    = parseFloat(form.rentAmount)    || 0;
  const deposit = parseFloat(form.safetyDeposit) || 0;
  const advance = parseFloat(form.advanceAmount) || 0;
  const paid    = form.paidAmount !== '' ? (parseFloat(form.paidAmount) || 0) : advance;
  const totalCost = rent + deposit;
  const balance = totalCost - paid;
  const duration = calcDuration(form.dateFrom, form.dateTo);

  function set(field, val) {
    setForm(p => {
      const nextForm = { ...p, [field]: val };
      // Auto-sync paidAmount when advanceAmount is entered (if paidAmount wasn't manually typed)
      if (field === 'advanceAmount' && (p.paidAmount === '' || p.paidAmount === p.advanceAmount)) {
        nextForm.paidAmount = val;
      }
      return nextForm;
    });
    if (errors[field]) setErrors(p => ({ ...p, [field]: '' }));
  }

  function setDoc(key, file) {
    setDocs(p => ({ ...p, [key]: file }));
  }

  function validate() {
    const e = {};
    if (!form.customerName.trim()) e.customerName = 'Customer name is required';
    if (!form.bikeModel.trim())    e.bikeModel    = 'Bike model is required';
    if (!form.dateFrom)            e.dateFrom     = 'Start date is required';
    if (!form.dateTo)              e.dateTo       = 'End date is required';
    if (form.dateFrom && form.dateTo && new Date(form.dateTo) <= new Date(form.dateFrom))
      e.dateTo = 'End date must be after start date';
    if (!form.rentAmount || rent <= 0) e.rentAmount = 'Rent amount is required';
    return e;
  }

  function fileToDataUrl(file) {
    return new Promise((resolve) => {
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    
    const aadharData = await fileToDataUrl(docs.aadharCard);
    const dlData = await fileToDataUrl(docs.drivingLicense);

    const record = {
      id:              Date.now(),
      entryDate:       new Date().toISOString(),
      customerName:    form.customerName.trim(),
      customerPhone:   form.customerPhone.trim(),
      customerAddress: form.customerAddress.trim(),
      bikeModel:       form.bikeModel.trim(),
      bikeNumber:      form.bikeNumber.trim().toUpperCase(),
      dateFrom:        form.dateFrom,
      dateTo:          form.dateTo,
      duration:        duration || '',
      rentAmount:      rent,
      safetyDeposit:   deposit,
      advanceAmount:   advance,
      paidAmount:      paid,
      balanceDue:      balance,
      notes:           form.notes.trim(),
      aadharCard:      docs.aadharCard
        ? { name: docs.aadharCard.name, size: docs.aadharCard.size, type: docs.aadharCard.type, data: aadharData }
        : null,
      drivingLicense:  docs.drivingLicense
        ? { name: docs.drivingLicense.name, size: docs.drivingLicense.size, type: docs.drivingLicense.type, data: dlData }
        : null,
    };

    try {
      await onSave(record, docs.aadharCard, docs.drivingLicense);
      showToast(`✅ Entry saved for ${record.customerName}!`, 'success');
      resetForm();
    } catch (err) {
      showToast('❌ Failed to save entry!', 'error');
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setForm(getDefaults());
    setDocs({ aadharCard: null, drivingLicense: null });
    setErrors({});
  }

  // Keyboard shortcut: Ctrl/Cmd + S
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        document.getElementById('rentalFormSubmit')?.click();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="form-card">
      {/* Card Header */}
      <div className="form-card-header">
        <div className="form-card-title">🏍️ New Rental Entry</div>
        <div className="form-card-sub">Fill in all details to create a rental record — press <kbd style={{background:'rgba(255,255,255,0.08)',padding:'1px 5px',borderRadius:4,fontSize:11,border:'1px solid rgba(255,255,255,0.12)'}}>⌘S</kbd> to save quickly</div>
      </div>

      <form className="form-body" onSubmit={handleSubmit} noValidate>

        {/* ── Customer Info ── */}
        <div className="section-hdr">
          <div className="section-icon">👤</div>
          <div>
            <div className="section-title">Customer Information</div>
            <div className="section-desc">Personal details of the renter</div>
          </div>
        </div>

        <div className="grid-2">
          <div className={`field col-span-2`}>
            <label className="field-label">Customer Name <span className="required">*</span></label>
            <div className="input-wrap">
              <span className="input-icon">👤</span>
              <input
                className={`form-input${errors.customerName ? ' has-error' : ''}`}
                placeholder="Enter full name"
                value={form.customerName}
                onChange={e => set('customerName', e.target.value)}
              />
            </div>
            {errors.customerName && <span className="error-msg">⚠ {errors.customerName}</span>}
          </div>

          <div className="field">
            <label className="field-label">Phone Number</label>
            <div className="input-wrap">
              <span className="input-icon">📞</span>
              <input
                className="form-input"
                type="tel"
                placeholder="+91 XXXXX XXXXX"
                value={form.customerPhone}
                onChange={e => set('customerPhone', e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label className="field-label">Address / Area</label>
            <div className="input-wrap">
              <span className="input-icon">📍</span>
              <input
                className="form-input"
                placeholder="City / Area"
                value={form.customerAddress}
                onChange={e => set('customerAddress', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="divider" />

        {/* ── Bike Details ── */}
        <div className="section-hdr">
          <div className="section-icon">🏍️</div>
          <div>
            <div className="section-title">Bike Details</div>
            <div className="section-desc">Specify the vehicle being rented</div>
          </div>
        </div>

        <div className="grid-2">
          <div className="field">
            <label className="field-label">Bike Model <span className="required">*</span></label>
            <div className="input-wrap">
              <span className="input-icon">🏍️</span>
              <select
                className={`form-input${errors.bikeModel ? ' has-error' : ''}`}
                value={['Xpulse 4V', 'Xpulse 200', 'Activa', 'FZS V3'].includes(form.bikeModel) ? form.bikeModel : (form.bikeModel ? 'Other' : '')}
                onChange={e => {
                  const val = e.target.value;
                  if (val === 'Other') {
                    set('bikeModel', 'Other');
                  } else {
                    set('bikeModel', val);
                  }
                }}
                style={{ cursor: 'pointer', appearance: 'auto' }}
              >
                <option value="" disabled>-- Select Bike Model --</option>
                <option value="Xpulse 4V">Xpulse 4V</option>
                <option value="Xpulse 200">Xpulse 200</option>
                <option value="Activa">Activa</option>
                <option value="FZS V3">FZS V3</option>
                <option value="Other">Other (Custom)</option>
              </select>
            </div>
            {(!['Xpulse 4V', 'Xpulse 200', 'Activa', 'FZS V3', ''].includes(form.bikeModel) || form.bikeModel === 'Other') && (
              <div className="input-wrap" style={{ marginTop: '8px' }}>
                <span className="input-icon">✏️</span>
                <input
                  className="form-input"
                  placeholder="Type custom bike model..."
                  value={form.bikeModel === 'Other' ? '' : form.bikeModel}
                  onChange={e => set('bikeModel', e.target.value)}
                  autoFocus
                />
              </div>
            )}
            {errors.bikeModel && <span className="error-msg">⚠ {errors.bikeModel}</span>}
          </div>

          <div className="field">
            <label className="field-label">Number Plate</label>
            <div className="input-wrap">
              <span className="input-icon">🔖</span>
              <input
                className="form-input"
                placeholder="e.g. MH12AB1234"
                value={form.bikeNumber}
                onChange={e => set('bikeNumber', e.target.value.toUpperCase())}
                style={{ textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: 1 }}
              />
            </div>
          </div>
        </div>

        <div className="divider" />

        {/* ── Rental Period ── */}
        <div className="section-hdr">
          <div className="section-icon">📅</div>
          <div>
            <div className="section-title">Rental Period</div>
            <div className="section-desc">Select start and end date & time</div>
          </div>
        </div>

        <div className="grid-2">
          <div className="field">
            <label className="field-label">Date From <span className="required">*</span></label>
            <div className="input-wrap">
              <span className="input-icon">📅</span>
              <input
                type="datetime-local"
                className={`form-input${errors.dateFrom ? ' has-error' : ''}`}
                value={form.dateFrom}
                onChange={e => set('dateFrom', e.target.value)}
              />
            </div>
            {errors.dateFrom && <span className="error-msg">⚠ {errors.dateFrom}</span>}
          </div>

          <div className="field">
            <label className="field-label">Date To <span className="required">*</span></label>
            <div className="input-wrap">
              <span className="input-icon">📅</span>
              <input
                type="datetime-local"
                className={`form-input${errors.dateTo ? ' has-error' : ''}`}
                value={form.dateTo}
                onChange={e => set('dateTo', e.target.value)}
              />
            </div>
            {errors.dateTo && <span className="error-msg">⚠ {errors.dateTo}</span>}
          </div>

          {duration && (
            <div className="field col-span-2">
              <div className="duration-badge">
                <span>⏱️</span>
                <span>Duration: <strong>{duration}</strong></span>
              </div>
            </div>
          )}
        </div>

        <div className="divider" />

        {/* ── Financial Details ── */}
        <div className="section-hdr">
          <div className="section-icon">💰</div>
          <div>
            <div className="section-title">Financial Details</div>
            <div className="section-desc">Rent amount, advance paid, total paid &amp; safety deposit</div>
          </div>
        </div>

        <div className="grid-2" style={{ gap: '14px' }}>
          <div className="field">
            <label className="field-label">Rent Amount (₹) <span className="required">*</span></label>
            <div className="input-wrap">
              <span className="input-icon">💵</span>
              <input
                type="number" min="0" step="0.01"
                className={`form-input${errors.rentAmount ? ' has-error' : ''}`}
                placeholder="0.00"
                value={form.rentAmount}
                onChange={e => set('rentAmount', e.target.value)}
              />
            </div>
            {errors.rentAmount && <span className="error-msg">⚠ {errors.rentAmount}</span>}
          </div>

          <div className="field">
            <label className="field-label">Advance Amount (₹)</label>
            <div className="input-wrap">
              <span className="input-icon">💳</span>
              <input
                type="number" min="0" step="0.01"
                className="form-input"
                placeholder="0.00"
                value={form.advanceAmount}
                onChange={e => set('advanceAmount', e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label className="field-label">Paid Amount So Far (₹)</label>
            <div className="input-wrap">
              <span className="input-icon">✅</span>
              <input
                type="number" min="0" step="0.01"
                className="form-input"
                placeholder="Defaults to advance"
                value={form.paidAmount}
                onChange={e => set('paidAmount', e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label className="field-label">Safety Deposit (₹)</label>
            <div className="input-wrap">
              <span className="input-icon">🛡️</span>
              <input
                type="number" min="0" step="0.01"
                className="form-input"
                placeholder="0.00"
                value={form.safetyDeposit}
                onChange={e => set('safetyDeposit', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        {(rent > 0 || deposit > 0 || advance > 0 || paid > 0) && (
          <div className="fin-summary">
            <div className="fin-row">
              <span className="fin-label">Total Charges (Rent + Deposit)</span>
              <span className="fin-val">₹{totalCost.toFixed(2)}</span>
            </div>
            <div className="fin-row">
              <span className="fin-label">Advance Paid</span>
              <span className="fin-val deduct">− ₹{advance.toFixed(2)}</span>
            </div>
            <div className="fin-row">
              <span className="fin-label">Total Amount Paid</span>
              <span className="fin-val deduct" style={{ color: '#34d399' }}>− ₹{paid.toFixed(2)}</span>
            </div>
            <div className="fin-divider" />
            <div className="fin-row">
              <span className="fin-label" style={{ fontWeight: 700 }}>Remaining Balance</span>
              <span className="fin-val balance">
                {balance <= 0 ? (
                  <span style={{ color: '#34d399', fontSize: '16px' }}>✅ Paid</span>
                ) : (
                  `₹${balance.toFixed(2)}`
                )}
              </span>
            </div>
          </div>
        )}

        <div className="divider" />

        {/* ── Documents ── */}
        <div className="section-hdr">
          <div className="section-icon">📄</div>
          <div>
            <div className="section-title">Customer Documents</div>
            <div className="section-desc">Upload ID proof — Aadhar Card &amp; Driving License</div>
          </div>
        </div>

        <div className="doc-uploads-grid">
          <DocUploadCard
            docType="aadharCard"
            label="Aadhar Card"
            icon="🪪"
            required
            file={docs.aadharCard}
            onFile={f => setDoc('aadharCard', f)}
          />
          <DocUploadCard
            docType="drivingLicense"
            label="Driving License"
            icon="🚗"
            required
            file={docs.drivingLicense}
            onFile={f => setDoc('drivingLicense', f)}
          />
        </div>

        <div className="divider" />

        {/* ── Notes ── */}
        <div className="field">
          <label className="field-label">Additional Notes</label>
          <div className="input-wrap">
            <span className="input-icon">📝</span>
            <textarea
              className="form-input"
              placeholder="Any special conditions, remarks or instructions…"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={resetForm}>
            🔄 Clear Form
          </button>
          <button
            type="submit"
            id="rentalFormSubmit"
            className="btn-primary"
            disabled={saving}
          >
            {saving ? <span className="spinner" /> : '✅'}
            {saving ? 'Saving…' : 'Save Entry'}
          </button>
        </div>

      </form>
    </div>
  );
}
