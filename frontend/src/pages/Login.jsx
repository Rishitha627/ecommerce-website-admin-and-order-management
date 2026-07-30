import React, { useState } from 'react';
import axios from 'axios';

export default function Login({ onLoginSuccess }) {
  const [authMode, setAuthMode] = useState('admin'); // 'admin' | 'customer' | 'register'

  // Admin state
  const [adminUsername, setAdminUsername] = useState('rishi');
  const [adminPassword, setAdminPassword] = useState('rishi627');

  // Customer state
  const [custEmail, setCustEmail] = useState('rishi.kumar@gmail.com');
  const [custPassword, setCustPassword] = useState('user123');

  // Customer Register state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!adminUsername || !adminPassword) {
      setError('Please fill in all admin fields.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await axios.post('/api/login', {
        username: adminUsername,
        password: adminPassword
      });

      if (res.data && res.data.token) {
        localStorage.setItem('techmart_token', res.data.token);
        localStorage.setItem('techmart_user', JSON.stringify(res.data.user || res.data.admin));
        localStorage.setItem('techmart_role', 'admin');
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
        onLoginSuccess(res.data.token, res.data.user || res.data.admin, 'admin');
      }
    } catch (err) {
      console.error('Admin Login error:', err);
      setError(err.response?.data?.message || 'Could not connect to backend server.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerLogin = async (e) => {
    e.preventDefault();
    if (!custEmail || !custPassword) {
      setError('Please enter your email and password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await axios.post('/api/customer/login', {
        email: custEmail,
        password: custPassword
      });

      if (res.data && res.data.token) {
        localStorage.setItem('techmart_token', res.data.token);
        localStorage.setItem('techmart_user', JSON.stringify(res.data.user));
        localStorage.setItem('techmart_role', 'customer');
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
        onLoginSuccess(res.data.token, res.data.user, 'customer');
      }
    } catch (err) {
      console.error('Customer Login error:', err);
      setError(err.response?.data?.message || 'Invalid customer credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerRegister = async (e) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPassword) {
      setError('Please fill in your name, email, and password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await axios.post('/api/customer/register', {
        name: regName,
        email: regEmail,
        password: regPassword,
        phone: regPhone,
        address: regAddress
      });

      if (res.data && res.data.token) {
        localStorage.setItem('techmart_token', res.data.token);
        localStorage.setItem('techmart_user', JSON.stringify(res.data.user));
        localStorage.setItem('techmart_role', 'customer');
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
        onLoginSuccess(res.data.token, res.data.user, 'customer');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.message || 'Customer registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center py-5" 
         style={{ backgroundColor: '#f8fafc', backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      
      <div className="card border shadow-sm p-4 animate-fade-in" 
           style={{ width: '100%', maxWidth: '440px', borderRadius: '16px', backgroundColor: '#ffffff' }}>
        
        {/* Header Logo */}
        <div className="text-center mb-4">
          <div className="d-inline-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary rounded-circle p-3 mb-2" style={{ width: '56px', height: '56px' }}>
            <i className="bi bi-cart4 fs-2"></i>
          </div>
          <h3 className="fw-extrabold text-slate-900 mb-0" style={{ letterSpacing: '-0.03em' }}>TechMart India</h3>
          <p className="text-muted small">Electronics Storefront & Admin Portal</p>
        </div>

        {/* Tab Toggle */}
        <div className="d-flex bg-light rounded-3 p-1 mb-4 border">
          <button 
            type="button"
            className={`btn btn-sm flex-fill fw-semibold py-2 rounded-2 ${authMode === 'admin' ? 'btn-primary text-white shadow-sm' : 'text-secondary btn-light border-0'}`}
            onClick={() => { setAuthMode('admin'); setError(''); }}
          >
            <i className="bi bi-shield-lock me-1.5"></i> Admin Portal
          </button>
          <button 
            type="button"
            className={`btn btn-sm flex-fill fw-semibold py-2 rounded-2 ${authMode === 'customer' || authMode === 'register' ? 'btn-primary text-white shadow-sm' : 'text-secondary btn-light border-0'}`}
            onClick={() => { setAuthMode('customer'); setError(''); }}
          >
            <i className="bi bi-person me-1.5"></i> Customer Store
          </button>
        </div>

        {error && (
          <div className="alert alert-danger border-0 small py-2.5 px-3 mb-3 d-flex align-items-center gap-2" role="alert">
            <i className="bi bi-exclamation-circle-fill"></i>
            <div>{error}</div>
          </div>
        )}

        {/* Admin Login Form */}
        {authMode === 'admin' && (
          <form onSubmit={handleAdminLogin}>
            <div className="mb-3">
              <label className="form-label small fw-semibold text-secondary">Admin Username</label>
              <div className="input-group">
                <span className="input-group-text bg-light text-muted border-end-0"><i className="bi bi-person"></i></span>
                <input
                  type="text"
                  className="form-control form-control-premium border-start-0"
                  placeholder="Enter admin username"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label small fw-semibold text-secondary">Password</label>
              <div className="input-group">
                <span className="input-group-text bg-light text-muted border-end-0"><i className="bi bi-lock"></i></span>
                <input
                  type="password"
                  className="form-control form-control-premium border-start-0"
                  placeholder="Enter password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary w-100 py-2.5 fw-semibold d-flex align-items-center justify-content-center gap-2"
              disabled={loading}
              style={{ borderRadius: '8px' }}
            >
              {loading ? <span className="spinner-border spinner-border-sm" role="status"></span> : <>Admin Login <i className="bi bi-arrow-right"></i></>}
            </button>

            <div className="mt-3 text-center bg-light p-2 rounded border">
              <small className="text-muted">Default Admin: <strong>rishi</strong> / <strong>rishi627</strong></small>
            </div>
          </form>
        )}

        {/* Customer Login Form */}
        {authMode === 'customer' && (
          <form onSubmit={handleCustomerLogin}>
            <div className="mb-3">
              <label className="form-label small fw-semibold text-secondary">Customer Email</label>
              <div className="input-group">
                <span className="input-group-text bg-light text-muted border-end-0"><i className="bi bi-envelope"></i></span>
                <input
                  type="email"
                  className="form-control form-control-premium border-start-0"
                  placeholder="rishi.kumar@gmail.com"
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label small fw-semibold text-secondary">Password</label>
              <div className="input-group">
                <span className="input-group-text bg-light text-muted border-end-0"><i className="bi bi-key"></i></span>
                <input
                  type="password"
                  className="form-control form-control-premium border-start-0"
                  placeholder="Enter password"
                  value={custPassword}
                  onChange={(e) => setCustPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-success w-100 py-2.5 fw-semibold d-flex align-items-center justify-content-center gap-2"
              disabled={loading}
              style={{ borderRadius: '8px' }}
            >
              {loading ? <span className="spinner-border spinner-border-sm" role="status"></span> : <>Customer Login <i className="bi bi-arrow-right"></i></>}
            </button>

            <div className="mt-3 text-center">
              <span className="text-muted small">New customer? </span>
              <button 
                type="button" 
                className="btn btn-link btn-sm p-0 text-decoration-none text-primary fw-semibold"
                onClick={() => { setAuthMode('register'); setError(''); }}
              >
                Create an Account
              </button>
            </div>

            <div className="mt-2 text-center bg-light p-2 rounded border">
              <small className="text-muted">Default Customer: <strong>rishi.kumar@gmail.com</strong> / <strong>user123</strong></small>
            </div>
          </form>
        )}

        {/* Customer Registration Form */}
        {authMode === 'register' && (
          <form onSubmit={handleCustomerRegister}>
            <div className="mb-2">
              <label className="form-label small fw-semibold text-secondary">Full Name *</label>
              <input
                type="text"
                className="form-control form-control-premium"
                placeholder="Rishi Kumar"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                required
              />
            </div>

            <div className="mb-2">
              <label className="form-label small fw-semibold text-secondary">Email Address *</label>
              <input
                type="email"
                className="form-control form-control-premium"
                placeholder="rishi.kumar@gmail.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                required
              />
            </div>

            <div className="mb-2">
              <label className="form-label small fw-semibold text-secondary">Password *</label>
              <input
                type="password"
                className="form-control form-control-premium"
                placeholder="Create password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
              />
            </div>

            <div className="row g-2 mb-3">
              <div className="col-6">
                <label className="form-label small fw-semibold text-secondary">Phone</label>
                <input
                  type="text"
                  className="form-control form-control-premium"
                  placeholder="+91 98765..."
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                />
              </div>
              <div className="col-6">
                <label className="form-label small fw-semibold text-secondary">Address</label>
                <input
                  type="text"
                  className="form-control form-control-premium"
                  placeholder="Mumbai, India"
                  value={regAddress}
                  onChange={(e) => setRegAddress(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary w-100 py-2.5 fw-semibold d-flex align-items-center justify-content-center gap-2"
              disabled={loading}
              style={{ borderRadius: '8px' }}
            >
              {loading ? <span className="spinner-border spinner-border-sm" role="status"></span> : <>Register Account <i className="bi bi-check-circle"></i></>}
            </button>

            <div className="mt-3 text-center">
              <span className="text-muted small">Already registered? </span>
              <button 
                type="button" 
                className="btn btn-link btn-sm p-0 text-decoration-none text-primary fw-semibold"
                onClick={() => { setAuthMode('customer'); setError(''); }}
              >
                Customer Login
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
