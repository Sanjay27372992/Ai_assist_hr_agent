import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Clock, Calendar, DollarSign,
  Building2, Award, Shield, LogOut, Bell, ChevronRight,
  Briefcase,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/UI';
import AIChatBot from '../components/AIChatBot';
import toast from 'react-hot-toast';

const NAV_GROUPS = [
  {
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    group: 'HR Management',
    items: [
      { path: '/employees',    label: 'Employees',    icon: Users,     roles: ['hr_admin','manager'] },
      { path: '/departments',  label: 'Departments',  icon: Building2, roles: ['hr_admin'] },
      { path: '/designations', label: 'Designations', icon: Award,     roles: ['hr_admin'] },
      { path: '/jarvis', label: 'AI Voice Agent',     icon: Award,     roles: ['hr_admin'] },

    ],
  },
  {
    group: 'Workforce',
    items: [
      { path: '/attendance', label: 'Attendance',       icon: Clock },
      { path: '/leaves',     label: 'Leave Management', icon: Calendar },
    ],
  },
  {
    group: 'Finance',
    items: [
      { path: '/payroll', label: 'Payroll', icon: DollarSign, roles: ['hr_admin','employee'] },
    ],
  },
];

const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const hasAccess = (roles) => !roles || roles.includes(user?.role);

  const handleLogout = async () => {
    try { await logout(); navigate('/login'); }
    catch { toast.error('Logout failed'); }
  };

  const roleLabel = { hr_admin: 'HR Admin', manager: 'Manager', employee: 'Employee' };

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Shield size={18} color="#fff" />
          </div>
          <div>
            <div className="sidebar-logo-text">HRMS Pro</div>
            <div className="sidebar-logo-sub">Management</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi}>
              {group.group && (
                <div className="nav-group-label">{group.group}</div>
              )}
              {group.items.filter(item => hasAccess(item.roles)).map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                >
                  <item.icon className="nav-item-icon" size={18} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="sidebar-user">
          <Avatar name={`${user?.first_name} ${user?.last_name}`} size={34} />
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.first_name} {user?.last_name}</div>
            <div className="sidebar-user-role">{roleLabel[user?.role] || user?.role}</div>
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--tx-3)', padding: 6, borderRadius: 8,
              transition: 'color .2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--tx-3)'}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* ── Topbar ── */}
      <header className="topbar">
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: 'var(--tx-3)', fontWeight: 500 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        <div className="topbar-actions">
          <button className="topbar-btn" title="Notifications">
            <Bell size={16} />
          </button>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '6px 12px 6px 6px',
            background: 'var(--surface-2)',
            border: '1px solid var(--bd-md)',
            borderRadius: 10,
            cursor: 'default',
          }}>
            <Avatar name={`${user?.first_name} ${user?.last_name}`} size={28} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx-1)', lineHeight: 1 }}>
                {user?.first_name}
              </div>
              <div style={{ fontSize: 10, color: 'var(--tx-3)', marginTop: 2, textTransform: 'capitalize' }}>
                {roleLabel[user?.role]}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Page content ── */}
      <main className="main-content" style={{ animation: 'slideUp .3s ease both' }}>
        {children}
      </main>

      {/* ── AI Assistant ── */}
      <AIChatBot />
    </div>
  );
};

export default DashboardLayout;
