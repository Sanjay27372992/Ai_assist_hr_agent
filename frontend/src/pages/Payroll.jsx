import { useState, useEffect, useCallback } from 'react';
import { DollarSign, Plus, Play, CheckCircle, TrendingUp } from 'lucide-react';
import { payrollService, employeeService } from '../services';
import { Badge, Modal, PageLoader, StatCard, FormInput, FormSelect } from '../components/UI';
import toast from 'react-hot-toast';

const Payroll = () => {
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [modal, setModal] = useState({ open: false, type: '' });
  const [generating, setGenerating] = useState(false);
  const [departments, setDepartments] = useState([]);

  const fetchPayrolls = useCallback(async () => {
    setLoading(true);
    try {
      const res = await payrollService.getAll({ month, year });
      setPayrolls(res.data.results || res.data);
    } catch { toast.error('Failed to load payroll'); }
    finally { setLoading(false); }
  }, [month, year]);

  useEffect(() => {
    fetchPayrolls();
  }, [fetchPayrolls]);

  const handleGenerate = async (deptId) => {
    setGenerating(true);
    try {
      const res = await payrollService.generate({ month, year, ...(deptId && { department: deptId }) });
      toast.success(res.data.message);
      setModal({ open: false, type: '' });
      fetchPayrolls();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed to generate'); }
    finally { setGenerating(false); }
  };

  const handleMarkPaid = async (id) => {
    try {
      await payrollService.markPaid(id);
      toast.success('Marked as paid!');
      fetchPayrolls();
    } catch { toast.error('Failed to update status'); }
  };

  const totals = payrolls.reduce((acc, p) => ({
    gross: acc.gross + parseFloat(p.gross_salary || 0),
    net: acc.net + parseFloat(p.net_salary || 0),
    deductions: acc.deductions + parseFloat(p.total_deductions || 0),
  }), { gross: 0, net: 0, deductions: 0 });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Payroll</h1>
          <p className="page-subtitle">Monthly payroll processing and management</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ open: true, type: 'generate' })}>
          <Play size={16} /> Generate Payroll
        </button>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        <StatCard title="Gross Payroll" value={`$${totals.gross.toLocaleString()}`} icon={DollarSign} color="#6366f1" />
        <StatCard title="Total Deductions" value={`$${totals.deductions.toLocaleString()}`} icon={TrendingUp} color="#f59e0b" />
        <StatCard title="Net Payroll" value={`$${totals.net.toLocaleString()}`} icon={CheckCircle} color="#10b981" />
      </div>

      {/* Month Filter */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="flex gap-3">
          <select className="form-input" style={{ width: 140 }} value={month} onChange={e => setMonth(+e.target.value)}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2024, i).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
          <select className="form-input" style={{ width: 100 }} value={year} onChange={e => setYear(+e.target.value)}>
            {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="table-container">
        {loading ? (
          <div className="flex items-center justify-center" style={{ padding: 60 }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Employee</th><th>Department</th><th>Gross</th>
                <th>Deductions</th><th>Net Salary</th>
                <th>Days</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payrolls.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                  No payroll records for {new Date(year, month - 1).toLocaleString('default', { month: 'long' })} {year}.
                  Generate payroll to get started.
                </td></tr>
              ) : payrolls.map(p => (
                <tr key={p.id}>
                  <td>
                    <div className="font-medium text-slate-200">{p.employee_name}</div>
                    <div className="text-xs text-slate-500">{p.employee_id}</div>
                  </td>
                  <td className="text-slate-400">{p.department}</td>
                  <td className="text-slate-200">${parseFloat(p.gross_salary).toLocaleString()}</td>
                  <td className="text-red-400">-${parseFloat(p.total_deductions).toLocaleString()}</td>
                  <td className="font-bold text-green-400">${parseFloat(p.net_salary).toLocaleString()}</td>
                  <td className="text-slate-400">{p.present_days}/{p.working_days}</td>
                  <td><Badge status={p.status} /></td>
                  <td>
                    {p.status !== 'paid' && (
                      <button className="btn btn-success btn-sm" onClick={() => handleMarkPaid(p.id)}>
                        Mark Paid
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Generate Modal */}
      <Modal open={modal.open && modal.type === 'generate'} onClose={() => setModal({ open: false, type: '' })} title="Generate Payroll">
        <GenerateForm month={month} year={year} onGenerate={handleGenerate} generating={generating} onClose={() => setModal({ open: false, type: '' })} />
      </Modal>
    </div>
  );
};

const GenerateForm = ({ month, year, onGenerate, generating, onClose }) => {
  const [deptId, setDeptId] = useState('');
  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
  return (
    <div>
      <p className="text-slate-300 text-sm mb-4">
        Generate payroll for <span className="text-indigo-400 font-semibold">{monthName} {year}</span>
      </p>
      <div className="p-4 rounded-xl mb-4" style={{ background: '#0f172a', border: '1px solid #334155' }}>
        <p className="text-xs text-slate-400">This will automatically calculate salaries based on salary structures and attendance records.</p>
      </div>
      <div className="flex gap-3 justify-end">
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={() => onGenerate(deptId)} disabled={generating}>
          {generating ? 'Generating...' : `Generate ${monthName} Payroll`}
        </button>
      </div>
    </div>
  );
};

export default Payroll;
