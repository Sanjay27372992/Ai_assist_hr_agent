import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const DEMOS = [
  { role: 'HR Admin',  email: 'admin@hrms.com',        pass: 'Admin@123' },
  { role: 'Employee',  email: 'john.smith@hrms.com',   pass: 'Employee@123' },
];

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid credentials');
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--base)',
      display: 'flex',
      overflow: 'hidden',
    }}>
      {/* ── Left panel — branding ── */}
      <div style={{
        flex: '0 0 45%',
        background: 'linear-gradient(145deg,#000000 0%,#212529 50%,#000000 100%)',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center',
        padding: 60, position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative blobs */}
        {[
          { top: '10%', left: '20%', size: 320, color: 'rgba(255,255,255,0.05)' },
          { top: '60%', left: '50%', size: 250, color: 'rgba(255,255,255,0.03)' },
          { top: '80%', left: '5%',  size: 180, color: 'rgba(255,255,255,0.02)' },
        ].map((b, i) => (
          <div key={i} style={{
            position: 'absolute', top: b.top, left: b.left,
            width: b.size, height: b.size, borderRadius: '50%',
            background: b.color, filter: 'blur(60px)',
            animation: `pulse ${3 + i}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.8}s`,
          }} />
        ))}

        {/* Content */}
        <div style={{ position: 'relative', textAlign: 'center', maxWidth: 380 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 22,
            background: 'var(--grad)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
            boxShadow: '0 0 60px rgba(124,58,237,0.5)',
          }}>
            <Shield size={36} color="#fff" />
          </div>

          <h1 style={{
            fontSize: 40, fontWeight: 900, color: '#FFFFFF',
            letterSpacing: -1.5, lineHeight: 1.1, marginBottom: 16,
          }}>
            HRMS<span style={{ color: '#868E96' }}>Pro</span>
          </h1>
          <p style={{ fontSize: 16, color: 'var(--tx-2)', lineHeight: 1.7 }}>
            Complete HR management platform for modern teams — employees, payroll, attendance & leaves.
          </p>

          {/* Feature chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 32 }}>
            {['JWT Secured', 'Role-Based Access', 'Real-time', 'Analytics'].map(f => (
              <span key={f} style={{
                padding: '5px 14px', borderRadius: 99,
                background: 'rgba(255,255,255,.05)',
                border: '1px solid rgba(255,255,255,.12)',
                fontSize: 12, color: '#868E96', fontWeight: 500,
              }}>
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div style={{
        flex: 1, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        padding: '48px 32px',
        background: '#FFFFFF',
      }}>
        <div style={{ width: '100%', maxWidth: 420, animation: 'slideUp .4s ease' }}>
          <div style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: '#1E0C04', letterSpacing: -0.5 }}>
              Welcome back
            </h2>
            <p style={{ fontSize: 14, color: 'var(--tx-3)', marginTop: 6 }}>
              Sign in to your HRMS Pro account
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email" className="form-input"
                placeholder="admin@hrms.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
              />
            </div>

            {/* Password */}
            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label">Password</label>
              <input
                type={showPass ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                style={{ paddingRight: 44 }}
                required
              />
              <button
                type="button" onClick={() => setShowPass(p => !p)}
                style={{
                  position: 'absolute', right: 13, top: 35,
                  background: 'none', border: 'none',
                  color: 'var(--tx-3)', cursor: 'pointer',
                }}
              >
                {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>

            <button
              type="submit" className="btn btn-primary w-full"
              style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: 15, marginTop: 4 }}
              disabled={loading}
            >
              {loading
                ? <><div className="spinner" style={{ width: 16, height: 16 }} />Signing in…</>
                : 'Sign In'}
            </button>
          </form>

          {/* Demo credentials */}
          <div style={{
            marginTop: 28, padding: 18,
            background: '#FFFFFF',
            border: '1px solid var(--bd-md)',
            borderRadius: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Zap size={13} style={{ color: 'var(--brand-2)' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx-3)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                Demo Credentials
              </span>
            </div>
            {DEMOS.map(d => (
              <button
                key={d.role} type="button"
                onClick={() => setForm({ email: d.email, password: d.pass })}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  width: '100%', background: 'none', border: 'none',
                  cursor: 'pointer', padding: '8px 10px', borderRadius: 8,
                  transition: 'background .15s', textAlign: 'left',
                  marginBottom: 4,
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <span style={{
                  padding: '2px 9px', borderRadius: 99, fontSize: 10,
                  fontWeight: 700, background: 'var(--brand-dim)', color: 'var(--brand-2)',
                  flexShrink: 0,
                }}>{d.role}</span>
                <span style={{ fontSize: 12, color: 'var(--tx-3)' }}>
                  {d.email} / <span style={{ color: 'var(--tx-2)' }}>{d.pass}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
