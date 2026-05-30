/* Reusable shared UI components — Design System v2 */

/* ── Spinner ── */
export const Spinner = ({ size = 22 }) => (
  <div className="spinner" style={{ width: size, height: size }} />
);

/* ── Page loader ── */
export const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
    <div style={{ textAlign: 'center' }}>
      <Spinner size={36} />
      <p style={{ color: 'var(--tx-3)', fontSize: 13, marginTop: 12 }}>Loading…</p>
    </div>
  </div>
);

/* ── Status Badge ── */
export const Badge = ({ status, label }) => {
  const map = {
    active: 'badge-success', present: 'badge-success', approved: 'badge-success',
    paid: 'badge-success', processed: 'badge-success',
    inactive: 'badge-gray', absent: 'badge-danger', rejected: 'badge-danger',
    terminated: 'badge-danger',
    pending: 'badge-warning', on_leave: 'badge-warning', draft: 'badge-warning',
    half_day: 'badge-warning',
    full_time: 'badge-cyan', part_time: 'badge-info',
    contract: 'badge-info', intern: 'badge-gray',
  };
  const cls = map[status] || 'badge-gray';
  return <span className={`badge ${cls}`}>{label || status?.replace(/_/g, ' ')}</span>;
};

/* ── Avatar ── */
export const Avatar = ({ name = '', src, size = 36 }) => {
  const initials = name.trim().split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  const colors = ['#622B14','#995F2F','#7A4020','#5A5638','#8B3E1C','#6B4C22'];
  const idx = name.charCodeAt(0) % colors.length;
  if (src) {
    return (
      <img src={src} alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover',
          boxShadow: `0 0 0 2px var(--surface-2), 0 0 0 3px var(--bd-md)` }} />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${colors[idx]}, ${colors[(idx+1)%colors.length]})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.36, flexShrink: 0,
      boxShadow: `0 0 0 2px #F9F2E3, 0 0 0 3px rgba(98,43,20,.2)`,
    }}>
      {initials}
    </div>
  );
};

/* ── Stat Card ── */
export const StatCard = ({ title, value, icon: Icon, color, subtitle, trend }) => (
  <div className="stat-card">
    <div className="stat-card-shine" style={{ background: color }} />
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
      <div className="stat-icon" style={{ background: color + '22' }}>
        <Icon size={20} color={color} />
      </div>
      {trend !== undefined && (
        <span className="stat-trend" style={{
          background: trend >= 0 ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.12)',
          color: trend >= 0 ? '#34D399' : '#FCA5A5',
        }}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div className="stat-label">{title}</div>
    <div className="stat-value">{value ?? <span className="skeleton" style={{ display:'inline-block', width:60, height:32, borderRadius:8 }} />}</div>
    {subtitle && <div style={{ fontSize: 12, color: 'var(--tx-3)', marginTop: 6 }}>{subtitle}</div>}
  </div>
);

/* ── Modal ── */
export const Modal = ({ open, onClose, title, children, maxWidth = 560 }) => {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <h3 className="modal-title" style={{ margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{
            background: 'var(--surface-3)', border: '1px solid var(--bd-md)',
            borderRadius: 8, width: 32, height: 32, cursor: 'pointer',
            color: 'var(--tx-2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all .15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--tx-1)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--tx-2)'; }}
          >✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

/* ── Confirm Dialog ── */
export const ConfirmDialog = ({ open, onClose, onConfirm, title, message }) => (
  <Modal open={open} onClose={onClose} title={title} maxWidth={420}>
    <p style={{ color: 'var(--tx-2)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>{message}</p>
    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
      <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button className="btn btn-danger" onClick={() => { onConfirm(); onClose(); }}>
        Delete
      </button>
    </div>
  </Modal>
);

/* ── Empty State ── */
export const EmptyState = ({ icon: Icon, title, subtitle }) => (
  <div style={{ textAlign: 'center', padding: '64px 20px' }}>
    {Icon && (
      <div style={{
        width: 64, height: 64, borderRadius: 18,
        background: 'var(--surface-3)', border: '1px solid var(--bd-md)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px',
      }}>
        <Icon size={28} style={{ color: 'var(--tx-3)' }} />
      </div>
    )}
    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx-1)', marginBottom: 6 }}>{title}</p>
    {subtitle && <p style={{ fontSize: 13, color: 'var(--tx-3)' }}>{subtitle}</p>}
  </div>
);

/* ── Form Input ── */
export const FormInput = ({ label, error, ...props }) => (
  <div className="form-group">
    {label && <label className="form-label">{label}</label>}
    <input className="form-input" {...props} />
    {error && <p style={{ color: 'var(--danger)', fontSize: 11, marginTop: 5 }}>{error}</p>}
  </div>
);

/* ── Form Select ── */
export const FormSelect = ({ label, children, error, ...props }) => (
  <div className="form-group">
    {label && <label className="form-label">{label}</label>}
    <select className="form-input" {...props}>{children}</select>
    {error && <p style={{ color: 'var(--danger)', fontSize: 11, marginTop: 5 }}>{error}</p>}
  </div>
);

/* ── Pagination ── */
export const Pagination = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1);
  return (
    <div className="pagination">
      <button className="page-btn" onClick={() => onPageChange(page - 1)} disabled={page === 1}>‹</button>
      {pages.map(p => (
        <button key={p} className={`page-btn${p === page ? ' active' : ''}`} onClick={() => onPageChange(p)}>{p}</button>
      ))}
      <button className="page-btn" onClick={() => onPageChange(page + 1)} disabled={page === totalPages}>›</button>
    </div>
  );
};
