import { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCircle, XCircle, Plus, Calendar } from 'lucide-react';
import { attendanceService, employeeService } from '../services';
import { Badge, Modal, PageLoader, StatCard, FormSelect, FormInput } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Attendance = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [todayStats, setTodayStats] = useState(null);
  const [myRecord, setMyRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [modal, setModal] = useState({ open: false, data: null });
  const [employees, setEmployees] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [todayRes, recordsRes] = await Promise.all([
        attendanceService.getToday(),
        attendanceService.getAll({ month, year }),
      ]);
      setTodayStats(todayRes.data);
      setRecords(todayRes.data.records || []);

      // Check if employee has checked in today
      if (user.role === 'employee') {
        const today = new Date().toISOString().slice(0, 10);
        const myRec = (todayRes.data.records || []).find(r => r.employee_name?.includes(user.first_name));
        setMyRecord(myRec || null);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [month, year, user]);

  useEffect(() => {
    fetchData();
    if (user.role !== 'employee') {
      employeeService.getAll({ status: 'active' }).then(r => setEmployees(r.data.results || r.data)).catch(() => {});
    }
  }, [fetchData, user]);

  const handleCheckIn = async () => {
    try {
      const res = await attendanceService.checkIn({});
      setMyRecord(res.data.attendance);
      toast.success('Checked in successfully!');
      fetchData();
    } catch (e) { toast.error(e.response?.data?.error || 'Check-in failed'); }
  };

  const handleCheckOut = async () => {
    try {
      const res = await attendanceService.checkOut({});
      setMyRecord(res.data.attendance);
      toast.success('Checked out successfully!');
      fetchData();
    } catch (e) { toast.error(e.response?.data?.error || 'Check-out failed'); }
  };

  const handleMarkAttendance = async (formData) => {
    try {
      await attendanceService.create(formData);
      toast.success('Attendance marked!');
      setModal({ open: false, data: null });
      fetchData();
    } catch (e) { toast.error('Failed to mark attendance'); }
  };

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="page-subtitle">
            {now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {user.role === 'hr_admin' && (
          <button className="btn btn-primary" onClick={() => setModal({ open: true, data: null })}>
            <Plus size={16} /> Mark Attendance
          </button>
        )}
      </div>

      {/* Employee Check-in Card */}
      {user.role === 'employee' && (
        <div className="card" style={{ marginBottom: 24, border: '1px solid rgba(99,102,241,0.3)' }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Clock size={24} style={{ color: '#6366f1' }} />
                <span className="text-2xl font-bold text-slate-100">{timeStr}</span>
              </div>
              <div className="flex gap-4 text-sm text-slate-400">
                <span>Check-in: <span className="text-slate-200">{myRecord?.check_in || '—'}</span></span>
                <span>Check-out: <span className="text-slate-200">{myRecord?.check_out || '—'}</span></span>
                {myRecord?.work_hours > 0 && <span>Hours: <span className="text-green-400">{myRecord.work_hours}h</span></span>}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                className="btn btn-success"
                onClick={handleCheckIn}
                disabled={!!myRecord?.check_in}
                style={{ opacity: myRecord?.check_in ? 0.5 : 1 }}
              >
                <CheckCircle size={16} /> Check In
              </button>
              <button
                className="btn btn-danger"
                onClick={handleCheckOut}
                disabled={!myRecord?.check_in || !!myRecord?.check_out}
                style={{ opacity: (!myRecord?.check_in || myRecord?.check_out) ? 0.5 : 1 }}
              >
                <XCircle size={16} /> Check Out
              </button>
            </div>
          </div>
          {myRecord?.is_late && (
            <div className="mt-3 text-sm text-yellow-400" style={{ padding: '8px 12px', background: 'rgba(234,179,8,0.1)', borderRadius: 8 }}>
              ⚠ Late by {myRecord.late_minutes} minutes
            </div>
          )}
        </div>
      )}

      {/* Today Stats */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <StatCard title="Total Employees" value={todayStats?.total_employees} icon={Clock} color="#6366f1" />
        <StatCard title="Present" value={todayStats?.present} icon={CheckCircle} color="#10b981" />
        <StatCard title="Absent" value={todayStats?.absent} icon={XCircle} color="#ef4444" />
        <StatCard title="Late Arrivals" value={todayStats?.late} icon={Calendar} color="#f59e0b" />
      </div>

      {/* Month Filter */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="flex gap-3 flex-wrap">
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

      {/* Attendance Table */}
      <div className="table-container">
        {loading ? (
          <div className="flex items-center justify-center" style={{ padding: 60 }}>
            <div className="spinner" style={{ width: 32, height: 32 }} />
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Employee</th><th>ID</th><th>Date</th>
                <th>Check In</th><th>Check Out</th>
                <th>Hours</th><th>Late</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No attendance records found</td></tr>
              ) : records.map(r => (
                <tr key={r.id}>
                  <td className="font-medium text-slate-200">{r.employee_name}</td>
                  <td className="font-mono text-indigo-400">{r.employee_id}</td>
                  <td className="text-slate-400">{r.date}</td>
                  <td className="text-green-400">{r.check_in || '—'}</td>
                  <td className="text-red-400">{r.check_out || '—'}</td>
                  <td><span className="font-semibold text-slate-200">{r.work_hours || 0}h</span></td>
                  <td>
                    {r.is_late ? (
                      <span className="text-yellow-400 text-xs">+{r.late_minutes}m</span>
                    ) : <span className="text-slate-500">—</span>}
                  </td>
                  <td><Badge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Mark Attendance Modal */}
      <Modal open={modal.open} onClose={() => setModal({ open: false, data: null })} title="Mark Attendance">
        <MarkAttendanceForm employees={employees} onSave={handleMarkAttendance} onClose={() => setModal({ open: false, data: null })} />
      </Modal>
    </div>
  );
};

const MarkAttendanceForm = ({ employees, onSave, onClose }) => {
  const [form, setForm] = useState({
    employee: '', date: new Date().toISOString().slice(0, 10),
    check_in: '', check_out: '', status: 'present', notes: '',
  });
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div>
      <FormSelect label="Employee" value={form.employee} onChange={e => update('employee', e.target.value)}>
        <option value="">Select Employee</option>
        {employees.map(e => <option key={e.id} value={e.id}>{e.full_name} ({e.employee_id})</option>)}
      </FormSelect>
      <div className="grid-2">
        <FormInput label="Date" type="date" value={form.date} onChange={e => update('date', e.target.value)} />
        <FormSelect label="Status" value={form.status} onChange={e => update('status', e.target.value)}>
          <option value="present">Present</option>
          <option value="absent">Absent</option>
          <option value="half_day">Half Day</option>
          <option value="on_leave">On Leave</option>
        </FormSelect>
      </div>
      <div className="grid-2">
        <FormInput label="Check In" type="time" value={form.check_in} onChange={e => update('check_in', e.target.value)} />
        <FormInput label="Check Out" type="time" value={form.check_out} onChange={e => update('check_out', e.target.value)} />
      </div>
      <div className="flex gap-3 justify-end mt-4">
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={() => onSave(form)}>Mark Attendance</button>
      </div>
    </div>
  );
};

export default Attendance;
