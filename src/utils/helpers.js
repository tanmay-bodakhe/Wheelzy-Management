// ── Formatting Helpers ─────────────────────────────────

export function formatDate(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  if (isNaN(d)) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

export function formatCurrency(amount) {
  const n = parseFloat(amount) || 0;
  return `₹${n.toFixed(2)}`;
}

export function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function getFileIcon(fileName) {
  const ext = (fileName || '').split('.').pop().toUpperCase();
  const map = {
    PDF: '📄', JPG: '🖼️', JPEG: '🖼️',
    PNG: '🖼️', GIF: '🖼️', WEBP: '🖼️',
    DOC: '📝', DOCX: '📝', TXT: '📃',
  };
  return map[ext] || '📎';
}

export function toDatetimeLocal(date) {
  const d = date || new Date();
  return d.toISOString().slice(0, 16);
}

export function calcDuration(from, to) {
  if (!from || !to) return null;
  const f = new Date(from);
  const t = new Date(to);
  if (isNaN(f) || isNaN(t) || t <= f) return null;
  const diff  = t - f;
  const days  = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins  = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  let str = '';
  if (days)  str += `${days}d `;
  if (hours) str += `${hours}h `;
  if (mins)  str += `${mins}m`;
  return str.trim() || '< 1 min';
}
