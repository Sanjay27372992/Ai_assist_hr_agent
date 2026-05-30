import { useState, useEffect } from 'react';
import { Users, CheckCircle, Building2, Calendar, TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { authService, attendanceService, leaveService } from '../services';
import { StatCard, Badge, Avatar, Spinner } from '../components/UI';
import { useAuth } from '../context/AuthContext';

const PIE_COLORS = ['#10B981', '#EF4444', '#F59E0B'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--surface-2)', border: '1px solid var(--bd-md)',
      borderRadius: 10, padding: '10px 14px', fontSize: 13,
    }}>
      <p style={{ color: 'var(--tx-2)', marginBottom: 4 }}>{label}</p>
      <p style={{ color: 'var(--tx-1)', fontWeight: 700 }}>{payload[0].value} employees</p>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [todayAtt, setTodayAtt] = useState(null);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      authService.getDashboardStats(),
      attendanceService.getToday(),
      leaveService.getAll({ status: 'pending' }),
    ]).then(([s, a, l]) => {
      setStats(s.data);
      setTodayAtt(a.data);
      setPendingLeaves(l.data?.results || []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const deptData = stats?.department_stats?.map(d => ({
    name: d.name.length > 10 ? d.name.slice(0, 10) + '…' : d.name,
    employees: d.employee_count,
  })) || [];

  const pieData = [
    { name: 'Present', value: todayAtt?.present || 0 },
    { name: 'Absent',  value: todayAtt?.absent  || 0 },
    { name: 'Late',    value: todayAtt?.late     || 0 },
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
            <span className="gradient-text">{user?.first_name}</span> 👋
          </h1>
          <p className="page-subtitle">Here's what's happening across your organisation today.</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <StatCard title="Total Employees"  value={stats?.total_employees}  icon={Users}        color="#995F2F" trend={5} subtitle="Active staff" />
        <StatCard title="Present Today"    value={todayAtt?.present}       icon={CheckCircle}  color="#6B9E5E" subtitle={`${stats?.attendance_rate ?? 0}% rate`} />
        <StatCard title="Departments"      value={stats?.total_departments} icon={Building2}    color="#C8922A" subtitle="Active depts" />
        <StatCard title="Pending Leaves"   value={stats?.pending_leaves}    icon={Calendar}     color="#B84B3A" subtitle="Need review" />
      </div>

      {/* Charts */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Bar */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx-1)' }}>Employees by Department</p>
              <p style={{ fontSize: 12, color: 'var(--tx-3)', marginTop: 2 }}>Headcount per department</p>
            </div>
            <TrendingUp size={18} style={{ color: 'var(--tx-3)' }} />
          </div>
          {deptData.length === 0 ? (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Spinner size={28} />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deptData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bd)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'var(--tx-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--tx-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(124,58,237,.08)' }} />
                <Bar dataKey="employees" radius={[6, 6, 0, 0]}>
                  {deptData.map((_, i) => (
                    <Cell key={i} fill={`url(#bar${i})`} />
                  ))}
                </Bar>
                <defs>
                  {deptData.map((_, i) => (
                    <linearGradient key={i} id={`bar${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#995F2F" />
                      <stop offset="100%" stopColor="#622B14" />
                    </linearGradient>
                  ))}
                </defs>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx-1)' }}>Today's Attendance</p>
              <p style={{ fontSize: 12, color: 'var(--tx-3)', marginTop: 2 }}>Real-time overview</p>
            </div>
            <Clock size={18} style={{ color: 'var(--tx-3)' }} />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--bd-md)', borderRadius: 10, color: 'var(--tx-1)' }}
              />
              <Legend formatter={v => <span style={{ color: 'var(--tx-2)', fontSize: 12 }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pending Leave Requests — only HR / Manager */}
      {(user?.role === 'hr_admin' || user?.role === 'manager') && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx-1)' }}>Pending Leave Requests</p>
              <p style={{ fontSize: 12, color: 'var(--tx-3)', marginTop: 2 }}>Awaiting your approval</p>
            </div>
            <span className="badge badge-warning">{pendingLeaves.length} pending</span>
          </div>

          {pendingLeaves.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <CheckCircle size={36} style={{ color: 'var(--success)', margin: '0 auto 10px' }} />
              <p style={{ color: 'var(--tx-2)', fontWeight: 600 }}>All caught up!</p>
              <p style={{ color: 'var(--tx-3)', fontSize: 13, marginTop: 4 }}>No pending leave requests</p>
            </div>
          ) : (
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Employee</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingLeaves.slice(0, 6).map(l => (
                    <tr key={l.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar name={l.employee_name} size={30} />
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--tx-1)', fontSize: 13 }}>{l.employee_name}</div>
                            <div style={{ fontSize: 11, color: 'var(--tx-3)' }}>{l.department}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: 'var(--tx-2)', fontSize: 13 }}>{l.leave_type_name}</td>
                      <td style={{ color: 'var(--tx-3)', fontSize: 13 }}>{l.start_date}</td>
                      <td style={{ color: 'var(--tx-3)', fontSize: 13 }}>{l.end_date}</td>
                      <td><span style={{ fontWeight: 700, color: 'var(--brand-2)' }}>{l.total_days}d</span></td>
                      <td><Badge status={l.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
