import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import { getApiClient } from '../lib/portalApi';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [emailErr, setEmailErr] = useState(false);
  const [passwordErr, setPasswordErr] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();

    const invalidEmail = !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const invalidPassword = !password;
    setEmailErr(invalidEmail);
    setPasswordErr(invalidPassword);
    if (invalidEmail || invalidPassword) {
      return;
    }

    try {
      const api = await getApiClient();
      await api.auth.login({ email: email.trim(), password });
      navigate('/my-account');
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err?.message || 'Incorrect email or password. Please try again.';
      setError(errorMessage);
    }
  }

  return (
    <div className="auth-page">
      <Navbar compact />
      <main className="auth-body">
        <div className="auth-card">
          <div className="auth-logo">
            <span className="auth-logo-text">🍴 RecipeBook</span>
          </div>

          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Log in to access your recipes</p>

          {error ? <div className="alert alert--error" style={{ display: 'block' }}>{error}</div> : null}

          <form className="auth-form" onSubmit={onSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email</label>
              <input type="email" className="form-input" id="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <span className="form-error" style={{ display: emailErr ? 'block' : 'none' }}>Please enter a valid email.</span>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div className="password-field-wrap">
                <input type={showPassword ? 'text' : 'password'} className="form-input" id="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" className="password-toggle" onClick={() => setShowPassword((v) => !v)}>{showPassword ? 'Hide' : 'Show'}</button>
              </div>
              <span className="form-error" style={{ display: passwordErr ? 'block' : 'none' }}>Please enter your password.</span>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px' }}>Log In</button>
          </form>

          <p className="auth-footer-text">
            Don't have an account? <Link to="/signup" className="auth-link">Sign up free</Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
