import { useRef, useState } from 'react';
import { getFileIcon, formatFileSize } from '../utils/helpers';

// Single Document Upload Card
export function DocUploadCard({
  docType,        // 'aadharCard' | 'drivingLicense'
  label,          // "Aadhar Card" | "Driving License"
  icon,           // emoji
  required,
  file,           // current File object or null
  onFile,         // (File | null) => void
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const MAX = 10 * 1024 * 1024; // 10MB

  function handleSelect(e) {
    const f = e.target.files?.[0];
    if (f) {
      if (f.size > MAX) { alert(`File too large. Max 10MB.`); return; }
      onFile(f);
    }
    e.target.value = '';
  }

  function handleDrop(e) {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) {
      if (f.size > MAX) { alert(`File too large. Max 10MB.`); return; }
      onFile(f);
    }
  }

  const zoneClass = [
    'upload-zone',
    dragging ? 'dragover' : '',
    file ? 'has-file' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="doc-upload-card">
      {/* Label strip */}
      <div className="doc-card-label">
        <span className="doc-card-label-icon">{icon}</span>
        {label}
        {required && <span className="doc-card-required">*</span>}
      </div>

      {/* Drop Zone */}
      <div
        className={zoneClass}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
      >
        <span className="upload-zone-icon">
          {file ? (file.type.startsWith('image/') ? '🖼️' : '📄') : '📤'}
        </span>
        <div className="upload-text">
          {file ? file.name.length > 28 ? file.name.slice(0, 25) + '…' : file.name : 'Click or drag & drop'}
        </div>
        <div className="upload-hint">
          {file
            ? `✔ ${formatFileSize(file.size)}`
            : 'JPG, PNG, PDF — Max 10MB'}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx"
          style={{ display: 'none' }}
          onChange={handleSelect}
        />
      </div>

      {/* File chip if uploaded */}
      {file && (
        <div className="file-preview">
          <span className="file-preview-icon">{getFileIcon(file.name)}</span>
          <span className="file-preview-name" title={file.name}>{file.name}</span>
          <span className="file-preview-size">{formatFileSize(file.size)}</span>
          <button
            type="button"
            className="file-preview-remove"
            onClick={(e) => { e.stopPropagation(); onFile(null); }}
            title="Remove"
          >✕</button>
        </div>
      )}
    </div>
  );
}
