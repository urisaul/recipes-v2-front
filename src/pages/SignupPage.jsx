import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import { getApiClient } from '../lib/portalApi';

export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const score = useMemo(() => {
    const val = form.password;
    let s = 0;
    if (val.length >= 8) s += 1;
    if (/[A-Z]/.test(val)) s += 1;
    if (/[0-9]/.test(val)) s += 1;
    if (/[^A-Za-z0-9]/.test(val)) s += 1;
    return s;
  }, [form.password]);

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
    setError('');

    const valid = form.firstName.trim() && form.username.trim().length >= 3 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) && form.password.length >= 8 && form.password === form.confirmPassword;
    if (!valid) {
      return;
    }

    try {
      const api = await getApiClient();
      await api.auth.registerIndependent({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      navigate('/my-account');
    } catch (err) {
      setError(err?.data?.message || 'Registration failed. Please try again.');
    }
  }

  const strengthColors = ['#ef4444', '#f97316', '#eab308', '#22c55e'];
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'];

  return (
    <div className="auth-page">
      <Navbar compact />
      <main className="auth-body">
        <div className="auth-card" style={{ maxWidth: '460px' }}>
          <div className="auth-logo">
            <span className="auth-logo-text">🍴 RecipeBook</span>
          </div>

          <h1 className="auth-title">Create your account</h1>
          <p className="auth-subtitle">Start sharing your favorite recipes today</p>

          {error ? <div className="alert alert--error" style={{ display: 'block' }}>{error}</div> : null}

          <form className="auth-form" onSubmit={onSubmit} noValidate>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="firstName">First Name</label>
                <input id="firstName" type="text" className="form-input" placeholder="Jane" value={form.firstName} onChange={(e) => setForm((v) => ({ ...v, firstName: e.target.value }))} required />
                <span className="form-error" style={{ display: submitted && !form.firstName.trim() ? 'block' : 'none' }}>Required.</span>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="lastName">Last Name</label>
                <input id="lastName" type="text" className="form-input" placeholder="Doe" value={form.lastName} onChange={(e) => setForm((v) => ({ ...v, lastName: e.target.value }))} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="username">Username</label>
              <input id="username" type="text" className="form-input" placeholder="janedoe" value={form.username} onChange={(e) => setForm((v) => ({ ...v, username: e.target.value }))} required />
              <span className="form-hint">This will be your public profile URL.</span>
              <span className="form-error" style={{ display: submitted && form.username.trim().length < 3 ? 'block' : 'none' }}>Username is required and must be at least 3 characters.</span>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="email">Email</label>
              <input id="email" type="email" className="form-input" placeholder="you@example.com" value={form.email} onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))} required />
              <span className="form-error" style={{ display: submitted && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) ? 'block' : 'none' }}>Please enter a valid email address.</span>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div className="password-field-wrap">
                <input id="password" type={showPassword ? 'text' : 'password'} className="form-input" placeholder="At least 8 characters" value={form.password} onChange={(e) => setForm((v) => ({ ...v, password: e.target.value }))} required />
                <button type="button" className="password-toggle" onClick={() => setShowPassword((v) => !v)}>{showPassword ? 'Hide' : 'Show'}</button>
              </div>
              <div className="strength-bar-wrap">
                <div className="strength-bar" style={{ width: form.password ? `${(score / 4) * 100}%` : '0', backgroundColor: strengthColors[score - 1] || strengthColors[0] }} />
              </div>
              <span className="strength-label">{form.password ? strengthLabels[score - 1] || 'Weak' : ''}</span>
              <span className="form-error" style={{ display: submitted && form.password.length < 8 ? 'block' : 'none' }}>Password must be at least 8 characters.</span>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">Confirm Password</label>
              <div className="password-field-wrap">
                <input id="confirmPassword" type={showConfirm ? 'text' : 'password'} className="form-input" placeholder="Repeat your password" value={form.confirmPassword} onChange={(e) => setForm((v) => ({ ...v, confirmPassword: e.target.value }))} required />
                <button type="button" className="password-toggle" onClick={() => setShowConfirm((v) => !v)}>{showConfirm ? 'Hide' : 'Show'}</button>
              </div>
              <span className="form-error" style={{ display: submitted && form.password !== form.confirmPassword ? 'block' : 'none' }}>Passwords do not match.</span>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px' }}>Create Account</button>

            <p className="terms-note">
              By signing up you agree to our <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>.
            </p>
          </form>

          <p className="auth-footer-text">
            Already have an account? <Link to="/login" className="auth-link">Log in</Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
