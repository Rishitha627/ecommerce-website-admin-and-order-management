import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import axios from 'axios';

// Import Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Inventory from './pages/Inventory';
import Orders from './pages/Orders';
import Customers from './pages/Customers';
import Reports from './pages/Reports';
import CustomerStorefront from './pages/CustomerStorefront';

function AdminAppContent({ token, user, onLogout, notifications, setNotifications }) {
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [dbStats, setDbStats] = useState(null);

  // Setup Axios Authorization defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Fetch metrics periodically for Notifications
  useEffect(() => {
    if (!token) return;

    const fetchAlerts = async () => {
      try {
        const statsRes = await axios.get('/api/reports/stats');
        const stats = statsRes.data;

        if (dbStats) {
          const newAlerts = [];
          if (stats.kpis.lowStockProducts > dbStats.kpis.lowStockProducts) {
            newAlerts.push({
              id: Date.now() + 1,
              type: 'warning',
              message: 'Low stock warning! Items fell below inventory thresholds.',
              time: new Date().toLocaleTimeString()
            });
          }
          if (stats.kpis.totalOrders > dbStats.kpis.totalOrders) {
            newAlerts.push({
              id: Date.now() + 2,
              type: 'success',
              message: 'New Customer Order placed!',
              time: new Date().toLocaleTimeString()
            });
          }
          if (newAlerts.length > 0) {
            setNotifications(prev => [...newAlerts, ...prev]);
          }
        } else {
          const startAlerts = [];
          if (stats.kpis.lowStockProducts > 0) {
            startAlerts.push({
              id: Date.now(),
              type: 'warning',
              message: `${stats.kpis.lowStockProducts} electronic products running low on stock.`,
              time: new Date().toLocaleTimeString()
            });
          }
          startAlerts.push({
            id: Date.now() - 1,
            type: 'info',
            message: `Welcome back, Admin ${user?.username || ''}. System online.`,
            time: new Date().toLocaleTimeString()
          });
          setNotifications(startAlerts);
        }
        
        setDbStats(stats);
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 12000);
    return () => clearInterval(interval);
  }, [token, dbStats]);

  const clearNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <div className="d-flex min-vh-100">
      {/* Light White Sidebar */}
      <aside className="sidebar-premium no-print">
        <div className="sidebar-logo">
          <i className="bi bi-cart4 fs-3 text-primary"></i>
          <span>TechMart Admin</span>
        </div>
        
        <ul className="sidebar-menu">
          <li>
            <Link to="/" className={`sidebar-link ${isActive('/')}`}>
              <i className="bi bi-speedometer2"></i> Dashboard
            </Link>
          </li>
          <li>
            <Link to="/products" className={`sidebar-link ${isActive('/products')}`}>
              <i className="bi bi-laptop"></i> Products
            </Link>
          </li>
          <li>
            <Link to="/categories" className={`sidebar-link ${isActive('/categories')}`}>
              <i className="bi bi-tags"></i> Categories
            </Link>
          </li>
          <li>
            <Link to="/inventory" className={`sidebar-link ${isActive('/inventory')}`}>
              <i className="bi bi-boxes"></i> Inventory
            </Link>
          </li>
          <li>
            <Link to="/orders" className={`sidebar-link ${isActive('/orders')}`}>
              <i className="bi bi-receipt"></i> Orders
            </Link>
          </li>
          <li>
            <Link to="/customers" className={`sidebar-link ${isActive('/customers')}`}>
              <i className="bi bi-people"></i> Customers
            </Link>
          </li>
          <li>
            <Link to="/reports" className={`sidebar-link ${isActive('/reports')}`}>
              <i className="bi bi-graph-up-arrow"></i> Reports
            </Link>
          </li>
        </ul>

        <div className="sidebar-footer">
          <div className="d-flex align-items-center gap-2 mb-3 px-2">
            <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: '36px', height: '36px' }}>
              <i className="bi bi-shield-lock-fill"></i>
            </div>
            <div>
              <div className="fw-semibold text-slate-800 small">{user?.username || 'Admin'}</div>
              <div className="text-muted" style={{ fontSize: '0.72rem' }}>System Administrator</div>
            </div>
          </div>
          <button onClick={onLogout} className="btn btn-outline-danger btn-sm w-100 py-2">
            <i className="bi bi-box-arrow-left me-1"></i> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="main-wrapper flex-grow-1">
        <header className="header-premium no-print">
          <h4 className="fw-bold text-slate-800 m-0" style={{ letterSpacing: '-0.02em' }}>
            {location.pathname === '/' && 'System Overview'}
            {location.pathname === '/products' && 'Electronics Catalog'}
            {location.pathname === '/categories' && 'Categories Directory'}
            {location.pathname === '/inventory' && 'Inventory Stock Monitor'}
            {location.pathname === '/orders' && 'Order Processing'}
            {location.pathname === '/customers' && 'Customer Profiles'}
            {location.pathname === '/reports' && 'Analytical Summaries'}
          </h4>

          <div className="d-flex align-items-center gap-3">
            <div className="position-relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)} 
                className="btn btn-light rounded-circle border d-flex align-items-center justify-content-center" 
                style={{ width: '40px', height: '40px' }}
              >
                <i className="bi bi-bell text-secondary fs-5"></i>
                {notifications.length > 0 && <span className="pulse-badge"></span>}
              </button>

              {showNotifications && (
                <div className="position-absolute bg-white rounded-3 shadow-lg p-3 border" 
                     style={{ right: 0, top: '50px', width: '320px', zIndex: 1050 }}>
                  <div className="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                    <h6 className="fw-bold m-0"><i className="bi bi-bell-fill text-primary"></i> Notifications</h6>
                    <button 
                      onClick={() => setNotifications([])} 
                      className="btn btn-link btn-sm text-decoration-none text-muted p-0"
                      disabled={notifications.length === 0}
                    >
                      Clear
                    </button>
                  </div>

                  <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div className="text-center text-muted py-4">
                        <i className="bi bi-check2-circle fs-3 text-success"></i>
                        <p className="small mt-2 mb-0">No active notifications</p>
                      </div>
                    ) : (
                      notifications.map(item => (
                        <div key={item.id} className={`alert alert-dismissible fade show p-2.5 mb-2 d-flex align-items-start gap-2 border-0 bg-opacity-10 bg-${item.type === 'danger' ? 'danger' : item.type === 'warning' ? 'warning' : item.type === 'success' ? 'success' : 'info'} text-${item.type === 'danger' ? 'danger' : item.type === 'warning' ? 'warning' : item.type === 'success' ? 'success' : 'info'}`} style={{ fontSize: '0.82rem', borderRadius: '8px' }}>
                          <div className="pe-3">
                            <div>{item.message}</div>
                            <small className="text-muted block mt-1" style={{ fontSize: '0.7rem' }}>{item.time}</small>
                          </div>
                          <button 
                            type="button" 
                            className="btn-close p-2" 
                            style={{ fontSize: '0.65rem' }} 
                            onClick={() => clearNotification(item.id)}
                          ></button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-light text-secondary rounded-pill py-1 px-3 small border d-none d-md-flex align-items-center gap-1.5 fw-medium">
              <i className="bi bi-clock text-primary"></i>
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
          </div>
        </header>

        <main className="content-premium flex-grow-1 animate-fade-in">
          <Routes>
            <Route path="/" element={<Dashboard notifications={notifications} setNotifications={setNotifications} />} />
            <Route path="/products" element={<Products notifications={notifications} setNotifications={setNotifications} />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/inventory" element={<Inventory notifications={notifications} setNotifications={setNotifications} />} />
            <Route path="/orders" element={<Orders notifications={notifications} setNotifications={setNotifications} />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('techmart_token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('techmart_user') || 'null'));
  const [role, setRole] = useState(localStorage.getItem('techmart_role') || 'admin');
  const [notifications, setNotifications] = useState([]);

  const handleLogin = (newToken, userInfo, userRole) => {
    setToken(newToken);
    setUser(userInfo);
    setRole(userRole || userInfo?.role || 'admin');
  };

  const handleLogout = () => {
    localStorage.removeItem('techmart_token');
    localStorage.removeItem('techmart_user');
    localStorage.removeItem('techmart_role');
    setToken(null);
    setUser(null);
    setRole('admin');
    setNotifications([]);
  };

  return (
    <HashRouter>
      <Routes>
        <Route 
          path="/login" 
          element={token ? <Navigate to="/" replace /> : <Login onLoginSuccess={handleLogin} />} 
        />
        <Route 
          path="/*" 
          element={
            token ? (
              role === 'customer' ? (
                <CustomerStorefront user={user} onLogout={handleLogout} />
              ) : (
                <AdminAppContent 
                  token={token} 
                  user={user} 
                  onLogout={handleLogout} 
                  notifications={notifications}
                  setNotifications={setNotifications}
                />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
      </Routes>
    </HashRouter>
  );
}
