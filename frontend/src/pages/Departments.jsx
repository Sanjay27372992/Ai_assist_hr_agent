import { useState, useEffect, useRef } from 'react';
import { Plus, Edit, Trash2, Users, Mail, Phone, X, Sparkles, ChevronRight } from 'lucide-react';
import { departmentService, employeeService } from '../services';
import { ConfirmDialog, FormInput, Avatar, Badge, Spinner } from '../components/UI';
import toast from 'react-hot-toast';

/* ── Unique bold palettes — completely different from the app's indigo theme ── */
const DEPT_THEMES = [
  {
    name: 'terracotta',
    grad: 'linear-gradient(135deg, #622B14 0%, #995F2F 100%)',
    glow: 'rgba(153,95,47,0.40)',
    soft: 'rgba(153,95,47,0.12)',
    text: '#C07A3F',
    border: 'rgba(153,95,47,0.35)',
  },
  {
    name: 'copper',
    grad: 'linear-gradient(135deg, #7A4020 0%, #C07A3F 100%)',
    glow: 'rgba(192,122,63,0.38)',
    soft: 'rgba(192,122,63,0.10)',
    text: '#D4954E',
    border: 'rgba(192,122,63,0.32)',
  },
  {
    name: 'olive',
    grad: 'linear-gradient(135deg, #5A5638 0%, #978F66 100%)',
    glow: 'rgba(151,143,102,0.35)',
    soft: 'rgba(151,143,102,0.10)',
    text: '#B0A87A',
    border: 'rgba(151,143,102,0.30)',
  },
  {
    name: 'sand',
    grad: 'linear-gradient(135deg, #8C7A4A 0%, #E4D6A9 100%)',
    glow: 'rgba(228,214,169,0.30)',
    soft: 'rgba(228,214,169,0.08)',
    text: '#E4D6A9',
    border: 'rgba(228,214,169,0.28)',
  },
  {
    name: 'sienna',
    grad: 'linear-gradient(135deg, #4A1A0A 0%, #8B3E1C 100%)',
    glow: 'rgba(139,62,28,0.40)',
    soft: 'rgba(139,62,28,0.12)',
    text: '#B85A2E',
    border: 'rgba(139,62,28,0.35)',
  },
  {
    name: 'bronze',
    grad: 'linear-gradient(135deg, #6B4C22 0%, #B8883A 100%)',
    glow: 'rgba(184,136,58,0.38)',
    soft: 'rgba(184,136,58,0.10)',
    text: '#C89A4A',
    border: 'rgba(184,136,58,0.32)',
  },
];

/* ── Animated counter hook ──────────────────────────────────────────── */
const useCount = (target, duration = 900) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) { setVal(0); return; }
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(timer); }
      else setVal(start);
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return val;
};

/* ── Single animated count display ─────────────────────────────────── */
const AnimCount = ({ value, color }) => {
  const n = useCount(value ?? 0);
  return <span style={{ color, fontWeight: 800, fontSize: 32, lineHeight: 1 }}>{n}</span>;
};

/* ── Department Card ─────────────────────────────────────────────────── */
const DeptCard = ({ dept, theme, index, onView, onEdit, onDelete }) => {
  const cardRef = useRef(null);

  // 3-D tilt on mouse move
  const handleMouseMove = (e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `perspective(800px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) translateY(-6px)`;
    card.style.boxShadow = `0 20px 60px ${theme.glow}`;
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg) translateY(0)';
    card.style.boxShadow = 'none';
  };

  return (
    <div
      ref={cardRef}
      onClick={() => onView(dept)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'relative',
        background: '#111827',
        border: `1px solid ${theme.border}`,
        borderRadius: 20,
        padding: 24,
        cursor: 'pointer',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        overflow: 'hidden',
        animation: `slideUpFade 0.5s ease ${index * 0.08}s both`,
      }}
    >
      {/* Animated rotating gradient ring behind icon */}
      <div style={{
        position: 'absolute', top: -48, right: -48,
        width: 160, height: 160, borderRadius: '50%',
        background: theme.soft,
        filter: 'blur(32px)',
        animation: 'pulseSoft 3s ease-in-out infinite alternate',
        animationDelay: `${index * 0.4}s`,
        pointerEvents: 'none',
      }} />

      {/* Animated border shimmer on top edge */}
      <div style={{
        position: 'absolute', top: 0, left: '-100%',
        width: '200%', height: 2,
        background: `linear-gradient(90deg, transparent, ${theme.text}, transparent)`,
        animation: 'shimmerBar 3s linear infinite',
        animationDelay: `${index * 0.6}s`,
        pointerEvents: 'none',
      }} />

      {/* Icon + Actions */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        {/* Icon with spinning gradient ring */}
        <div style={{ position: 'relative' }}>
          <div style={{
            position: 'absolute', inset: -3,
            borderRadius: '50%',
            background: theme.grad,
            animation: 'spinRing 6s linear infinite',
            opacity: 0.6,
          }} />
          <div style={{
            position: 'relative',
            width: 52, height: 52, borderRadius: '50%',
            background: theme.grad,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 800, color: '#0f172a',
            boxShadow: `0 0 20px ${theme.glow}`,
            zIndex: 1,
          }}>
            {dept.name[0]}
          </div>
        </div>

        {/* Edit / Delete — stop propagation so card click doesn't fire */}
        <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
          <button
            onClick={() => onEdit(dept)}
            title="Edit"
            style={{
              width: 32, height: 32, borderRadius: 8, border: '1px solid #334155',
              background: '#1e293b', color: '#94a3b8', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = theme.text; e.currentTarget.style.color = theme.text; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#94a3b8'; }}
          >
            <Edit size={13} />
          </button>
          <button
            onClick={() => onDelete(dept)}
            title="Delete"
            style={{
              width: 32, height: 32, borderRadius: 8, border: '1px solid #334155',
              background: '#1e293b', color: '#94a3b8', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#94a3b8'; }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Name & Description */}
      <h3 style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9', marginBottom: 6 }}>{dept.name}</h3>
      <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, minHeight: 36 }}>
        {dept.description || 'No description provided'}
      </p>

      {/* Footer: animated count + view pill */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: 20, paddingTop: 16,
        borderTop: `1px solid ${theme.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <AnimCount value={dept.employee_count} color={theme.text} />
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>active members</span>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 12, fontWeight: 700, color: theme.text,
          padding: '5px 12px', borderRadius: 20,
          background: theme.soft,
          border: `1px solid ${theme.border}`,
          letterSpacing: '0.5px',
        }}>
          View <ChevronRight size={13} />
        </div>
      </div>
    </div>
  );
};

/* ── Employee Detail Modal ───────────────────────────────────────────── */
const EmployeesModal = ({ dept, theme, onClose }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dept) return;
    setLoading(true);
    employeeService
      .getAll({ department: dept.id, status: 'active' })
      .then(r => setEmployees(r.data.results || r.data))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, [dept]);

  if (!dept || !theme) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        width: '100%', maxWidth: 660,
        background: '#0f172a',
        border: `1px solid ${theme.border}`,
        borderRadius: 24,
        overflow: 'hidden',
        animation: 'modalUp 0.25s ease',
        boxShadow: `0 0 60px ${theme.glow}`,
      }}>
        {/* Modal header with gradient strip */}
        <div style={{
          background: theme.grad,
          padding: '20px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'rgba(0,0,0,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 800, color: 'white',
            }}>
              {dept.name[0]}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{dept.name}</div>
              <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.55)', marginTop: 2 }}>
                {loading ? 'Loading...' : `${employees.length} active employee${employees.length !== 1 ? 's' : ''}`}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(0,0,0,0.2)', border: 'none',
              color: '#0f172a', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24, maxHeight: 460, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
              <Spinner size={36} />
            </div>
          ) : employees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Users size={48} style={{ color: '#334155', margin: '0 auto 12px' }} />
              <p style={{ color: '#94a3b8', fontWeight: 600 }}>No active employees in this department</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {employees.map((emp, i) => (
                <div
                  key={emp.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 16px', borderRadius: 14,
                    background: '#1e293b',
                    border: '1px solid #334155',
                    transition: 'border-color 0.2s, transform 0.2s',
                    animation: `slideUpFade 0.35s ease ${i * 0.05}s both`,
                    cursor: 'default',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = theme.border;
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#334155';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <Avatar name={emp.full_name} src={emp.profile_picture_url} size={46} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14 }}>{emp.full_name}</div>
                    <div style={{ fontSize: 12, color: theme.text, marginTop: 1 }}>
                      {emp.designation_title || 'No designation'}
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Mail size={10} /> {emp.email}
                      </span>
                      {emp.phone && (
                        <span style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Phone size={10} /> {emp.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                    <Badge status={emp.employment_type} />
                    <span style={{
                      fontFamily: 'monospace', fontSize: 12,
                      color: theme.text,
                      background: theme.soft,
                      padding: '2px 8px', borderRadius: 6,
                    }}>
                      {emp.employee_id}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Keyframes injected once ─────────────────────────────────────────── */
const Keyframes = () => (
  <style>{`
    @keyframes slideUpFade {
      from { opacity: 0; transform: translateY(24px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes shimmerBar {
      0%   { left: -100%; }
      100% { left: 100%; }
    }
    @keyframes pulseSoft {
      from { opacity: 0.5; transform: scale(0.95); }
      to   { opacity: 1;   transform: scale(1.1); }
    }
    @keyframes spinRing {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes modalUp {
      from { opacity: 0; transform: scale(0.94) translateY(16px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes floatBadge {
      0%, 100% { transform: translateY(0); }
      50%       { transform: translateY(-4px); }
    }
  `}</style>
);

/* ── Main Page ───────────────────────────────────────────────────────── */
const Departments = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewDept, setViewDept] = useState(null);
  const [viewTheme, setViewTheme] = useState(null);
  const [formModal, setFormModal] = useState({ open: false, data: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, data: null });

  const fetchDepts = async () => {
    setLoading(true);
    try {
      const res = await departmentService.getAll();
      setDepartments(res.data.results || res.data);
    } catch { toast.error('Failed to load departments'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDepts(); }, []);

  const handleSave = async (form) => {
    try {
      if (form.id) { await departmentService.update(form.id, form); toast.success('Department updated!'); }
      else { await departmentService.create(form); toast.success('Department created!'); }
      setFormModal({ open: false, data: null });
      fetchDepts();
    } catch { toast.error('Failed to save department'); }
  };

  const handleDelete = async (id) => {
    try { await departmentService.delete(id); toast.success('Deleted!'); fetchDepts(); }
    catch { toast.error('Failed to delete'); }
  };

  const openView = (dept, theme) => { setViewDept(dept); setViewTheme(theme); };

  return (
    <div>
      <Keyframes />

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Departments</h1>
          <p className="page-subtitle">
            {departments.length} departments&nbsp;·&nbsp;
            <span style={{ color: '#818cf8' }}>Click any card to view active members</span>
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setFormModal({ open: true, data: null })}
          style={{ animation: 'floatBadge 3s ease-in-out infinite' }}
        >
          <Plus size={16} /> Add Department
        </button>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <Spinner size={40} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
          {departments.map((dept, i) => {
            const theme = DEPT_THEMES[i % DEPT_THEMES.length];
            return (
              <DeptCard
                key={dept.id}
                dept={dept}
                theme={theme}
                index={i}
                onView={d => openView(d, theme)}
                onEdit={d => setFormModal({ open: true, data: d })}
                onDelete={d => setDeleteModal({ open: true, data: d })}
              />
            );
          })}
        </div>
      )}

      {/* Employees Modal */}
      <EmployeesModal
        dept={viewDept}
        theme={viewTheme}
        onClose={() => { setViewDept(null); setViewTheme(null); }}
      />

      {/* Add / Edit Form */}
      {formModal.open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          animation: 'fadeIn 0.2s ease',
        }}
          onClick={e => e.target === e.currentTarget && setFormModal({ open: false, data: null })}
        >
          <div style={{
            background: '#1e293b', border: '1px solid #334155',
            borderRadius: 20, padding: 28, width: '100%', maxWidth: 480,
            animation: 'modalUp 0.2s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>
                {formModal.data ? 'Edit Department' : 'Add Department'}
              </h3>
              <button onClick={() => setFormModal({ open: false, data: null })}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <DepartmentForm
              dept={formModal.data}
              onSave={handleSave}
              onClose={() => setFormModal({ open: false, data: null })}
            />
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, data: null })}
        onConfirm={() => handleDelete(deleteModal.data?.id)}
        title="Delete Department"
        message={`Delete "${deleteModal.data?.name}"? Employees will be unassigned.`}
      />
    </div>
  );
};

/* ── Department Form ─────────────────────────────────────────────────── */
const DepartmentForm = ({ dept, onSave, onClose }) => {
  const [form, setForm] = useState({ id: dept?.id, name: dept?.name || '', description: dept?.description || '' });
  return (
    <div>
      <FormInput
        label="Department Name *"
        value={form.name}
        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        placeholder="e.g. Engineering"
      />
      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea
          className="form-input" rows={3}
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="What does this department do?"
        />
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={() => onSave(form)}>Save Department</button>
      </div>
    </div>
  );
};

export default Departments;
