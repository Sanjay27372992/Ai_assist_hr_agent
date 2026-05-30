import { useState, useEffect, useCallback } from 'react';
import { Plus, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import { leaveService, employeeService } from '../services';
import { Badge, Modal, PageLoader, StatCard, ConfirmDialog, FormSelect, FormInput } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const LeaveManagement = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState({ open: false, type: '', data: null });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const [leavesRes, typesRes] = await Promise.all([
        leaveService.getAll(params),
        leaveService.getTypes(),
      ]);
      setLeaves(leavesRes.data.results || leavesRes.data);
      setLeaveTypes(typesRes.data.results || typesRes.data);

      if (user.role === 'employee') {
        const balRes = await leaveService.getBalances({ year: new Date().getFullYear() });
        setBalances(balRes.data.results || balRes.data);
      }
    } catch { toast.error('Failed to load leaves'); }
    finally { setLoading(false); }
  }, [statusFilter, user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApply = async (form) => {
    try {
      await leaveService.apply(form);
      toast.success('Leave application submitted!');
      setModal({ open: false, type: '', data: null });
      fetchData();
    } catch (e) {
      // Extract the most meaningful error from the response
      const data = e.response?.data;
      let msg = 'Failed to apply for leave';
      if (typeof data === 'string') msg = data;
      else if (data?.non_field_errors) msg = data.non_field_errors[0];
      else if (data?.detail) msg = data.detail;
      else if (data?.start_date) msg = `Start date: ${data.start_date[0]}`;
      else if (data?.end_date) msg = `End date: ${data.end_date[0]}`;
      else if (typeof data === 'object') msg = Object.values(data).flat().join(' ');
      toast.error(msg);
    }
  };

  const handleReview = async (id, status, comment) => {
    try {
      await leaveService.review(id, { status, review_comment: comment });
      toast.success(`Leave ${status}!`);
      fetchData();
    } catch { toast.error('Failed to update'); }
  };

  const handleCancel = async (id) => {
    try {
      await leaveService.cancel(id);
      toast.success('Leave cancelled');
      fetchData();
    } catch { toast.error('Failed to cancel'); }
  };

  const counts = {
    pending: leaves.filter(l => l.status === 'pending').length,
    approved: leaves.filter(l => l.status === 'approved').length,
    rejected: leaves.filter(l => l.status === 'rejected').length,
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Leave Management</h1>
          <p className="page-subtitle">Manage employee leave requests</p>
        </div>
        {user.role === 'employee' && (
          <button className="btn btn-primary" onClick={() => setModal({ open: true, type: 'apply', data: null })}>
            <Plus size={16} /> Apply Leave
          </button>
        )}
      </div>

      {/* Leave Balance for employees */}
      {user.role === 'employee' && balances.length > 0 && (
        <div className="grid-3" style={{ marginBottom: 24 }}>
          {balances.map(b => (
            <div key={b.id} className="stat-card">
              <div className="text-sm font-medium text-slate-400 mb-1">{b.leave_type_name}</div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-slate-100">{b.remaining_days}</span>
                <span className="text-slate-500 text-sm mb-1">/ {b.total_days} days left</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">Used: {b.used_days}d | Pending: {b.pending_days}d</div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        <StatCard title="Pending" value={counts.pending} icon={Clock} color="#f59e0b" />
        <StatCard title="Approved" value={counts.approved} icon={CheckCircle} color="#10b981" />
        <StatCard title="Rejected" value={counts.rejected} icon={XCircle} color="#ef4444" />
      </div>

      {/* Filter */}
      <div className="card" style={{ marginBottom: 16 }}>
        <select className="form-input" style={{ width: 180 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Requests</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div className="flex items-center justify-center" style={{ padding: 60 }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Employee</th><th>Leave Type</th><th>From</th>
                <th>To</th><th>Days</th><th>Reason</th>
                <th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaves.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No leave requests found</td></tr>
              ) : leaves.map(l => (
                <tr key={l.id}>
                  <td>
                    <div className="font-medium text-slate-200">{l.employee_name}</div>
                    <div className="text-xs text-slate-500">{l.department}</div>
                  </td>
                  <td className="text-slate-400">{l.leave_type_name}</td>
                  <td className="text-slate-400">{l.start_date}</td>
                  <td className="text-slate-400">{l.end_date}</td>
                  <td><span className="font-bold text-indigo-400">{l.total_days}d</span></td>
                  <td className="text-slate-400 text-sm" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.reason}</td>
                  <td><Badge status={l.status} /></td>
                  <td>
                    <div className="flex gap-2">
                      {l.status === 'pending' && (user.role === 'hr_admin' || user.role === 'manager') && (
                        <>
                          <button className="btn btn-success btn-sm" onClick={() => handleReview(l.id, 'approved', '')}>
                            <CheckCircle size={14} />
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleReview(l.id, 'rejected', '')}>
                            <XCircle size={14} />
                          </button>
                        </>
                      )}
                      {l.status === 'pending' && user.role === 'employee' && (
                        <button className="btn btn-secondary btn-sm" onClick={() => handleCancel(l.id)}>Cancel</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Apply Leave Modal */}
      <Modal open={modal.open && modal.type === 'apply'} onClose={() => setModal({ open: false, type: '', data: null })} title="Apply for Leave">
        <ApplyLeaveForm leaveTypes={leaveTypes} onSave={handleApply} onClose={() => setModal({ open: false, type: '', data: null })} />
      </Modal>
    </div>
  );
};

const ApplyLeaveForm = ({ leaveTypes, onSave, onClose }) => {
  const [form, setForm] = useState({ leave_type: '', start_date: '', end_date: '', reason: '' });
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div>
      <FormSelect label="Leave Type *" value={form.leave_type} onChange={e => update('leave_type', e.target.value)}>
        <option value="">Select Leave Type</option>
        {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.name} ({t.max_days_per_year} days/year)</option>)}
      </FormSelect>
      <div className="grid-2">
        <FormInput label="From Date *" type="date" value={form.start_date} onChange={e => update('start_date', e.target.value)} />
        <FormInput label="To Date *" type="date" value={form.end_date} onChange={e => update('end_date', e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Reason *</label>
        <textarea className="form-input" rows={3} value={form.reason} onChange={e => update('reason', e.target.value)} placeholder="Please provide reason for leave..." />
      </div>
      <div className="flex gap-3 justify-end mt-4">
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={() => onSave(form)}>Submit Application</button>
      </div>
    </div>
  );
};

export default LeaveManagement;
