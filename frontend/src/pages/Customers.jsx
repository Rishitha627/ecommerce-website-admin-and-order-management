import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [purchaseHistory, setPurchaseHistory] = useState([]);

  const fetchCustomers = async (query = '') => {
    try {
      setLoading(true);
      const token = localStorage.getItem('techmart_token');
      const res = await axios.get(`/api/customers?search=${encodeURIComponent(query)}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      setCustomers(res.data);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchCustomers(search);
    }, 200);
    return () => clearTimeout(delayDebounce);
  }, [search]);

  const handleViewHistory = async (customer) => {
    setSelectedCustomer(customer);
    setShowModal(true);
    setHistoryLoading(true);
    try {
      const token = localStorage.getItem('techmart_token');
      const res = await axios.get(`/api/customers/${customer.id}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      setPurchaseHistory(res.data.orders);
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-extrabold m-0 text-slate-900" style={{ letterSpacing: '-0.02em' }}>Customer Profiles</h3>
          <p className="text-secondary mb-0">Registered client accounts, contact details, and purchase history logs.</p>
        </div>
      </div>

      <div className="card card-premium p-3 mb-4">
        <div className="row">
          <div className="col-12 col-md-6">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0 text-muted"><i className="bi bi-search"></i></span>
              <input
                type="text"
                className="form-control form-control-premium border-start-0"
                placeholder="Search customers by name, email, phone, or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button 
                  className="btn btn-outline-secondary border-start-0 bg-white text-muted" 
                  type="button" 
                  onClick={() => setSearch('')}
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card card-premium p-4">
        <div className="table-responsive">
          <table className="table table-hover table-premium mb-0">
            <thead>
              <tr>
                <th>Customer ID</th>
                <th>Name</th>
                <th>Email Address</th>
                <th>Phone Number</th>
                <th>Shipping Address</th>
                <th>Orders Placed</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-5">
                    <div className="spinner-border text-primary" role="status"></div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-muted">
                    No customer profiles found matching "{search}".
                  </td>
                </tr>
              ) : (
                customers.map(c => (
                  <tr key={c.id}>
                    <td><strong>#CUST-{c.id}</strong></td>
                    <td className="fw-bold text-slate-800">{c.name}</td>
                    <td><a href={`mailto:${c.email}`} className="text-decoration-none">{c.email}</a></td>
                    <td>{c.phone || '—'}</td>
                    <td>
                      <div className="text-truncate" style={{ maxWidth: '250px' }} title={c.address}>
                        {c.address || '—'}
                      </div>
                    </td>
                    <td>
                      <span className="badge bg-primary bg-opacity-10 text-primary fw-bold" style={{ fontSize: '0.82rem' }}>
                        {c.total_orders} Orders
                      </span>
                    </td>
                    <td className="text-end">
                      <button 
                        onClick={() => handleViewHistory(c)} 
                        className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1 fw-semibold"
                      >
                        <i className="bi bi-clock-history"></i> Purchase History
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && selectedCustomer && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(3px)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow" style={{ borderRadius: '14px' }}>
              <div className="modal-header border-bottom pb-2">
                <h5 className="modal-title fw-bold">Customer Purchase History</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>

              <div className="modal-body p-4">
                <div className="card bg-light border p-3 mb-4 rounded-3 d-flex flex-row justify-content-between flex-wrap gap-3">
                  <div>
                    <h5 className="fw-bold text-slate-800 mb-1">{selectedCustomer.name}</h5>
                    <p className="text-muted small mb-0">ID: #CUST-{selectedCustomer.id} | Email: {selectedCustomer.email}</p>
                  </div>
                  <div>
                    <div className="small"><strong>Phone:</strong> {selectedCustomer.phone || 'N/A'}</div>
                    <div className="small"><strong>Address:</strong> {selectedCustomer.address || 'N/A'}</div>
                  </div>
                </div>

                <h6 className="fw-bold mb-2">Past Orders (₹)</h6>
                
                {historyLoading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary spinner-border-sm" role="status"></div>
                  </div>
                ) : purchaseHistory.length === 0 ? (
                  <div className="text-center text-muted py-4 small">No past orders placed by this customer.</div>
                ) : (
                  <div className="table-responsive" style={{ maxHeight: '250px' }}>
                    <table className="table table-sm table-premium mb-0">
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Total Amount (₹)</th>
                          <th>Payment</th>
                          <th>Delivery Status</th>
                          <th>Order Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchaseHistory.map(order => (
                          <tr key={order.id}>
                            <td><strong>#ORD-{order.id}</strong></td>
                            <td className="fw-bold text-primary">₹{parseFloat(order.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td>
                              <span className={`badge bg-opacity-10 bg-${
                                order.payment_status === 'Paid' ? 'success' : 'warning'
                              } text-${
                                order.payment_status === 'Paid' ? 'success' : 'warning'
                              }`} style={{ fontSize: '0.75rem' }}>
                                {order.payment_status}
                              </span>
                            </td>
                            <td>
                              <span className={`badge bg-opacity-10 bg-${
                                order.delivery_status === 'Delivered' ? 'success' : 'info'
                              } text-${
                                order.delivery_status === 'Delivered' ? 'success' : 'info'
                              }`} style={{ fontSize: '0.75rem' }}>
                                {order.delivery_status}
                              </span>
                            </td>
                            <td>{new Date(order.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="modal-footer border-top pt-2">
                <button type="button" className="btn btn-secondary px-4 fw-semibold" onClick={() => setShowModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
