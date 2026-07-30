import React, { useState, useEffect } from 'react';
import axios from 'axios';

const fallbackImg = 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=600&auto=format&fit=crop&q=80';

export default function Orders({ notifications, setNotifications }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [delStatus, setDelStatus] = useState('');
  const [payStatus, setPayStatus] = useState('');

  // Details modal state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [orderPayments, setOrderPayments] = useState([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Simulation order modal state
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simCustomer, setSimCustomer] = useState('');
  const [simProducts, setSimProducts] = useState([{ product_id: '', quantity: 1 }]);
  const [simPaymentMethod, setSimPaymentMethod] = useState('Credit Card / Debit Card');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const delParam = delStatus ? `&deliveryStatus=${delStatus}` : '';
      const payParam = payStatus ? `&paymentStatus=${payStatus}` : '';
      const res = await axios.get(`/api/orders?search=${search}${delParam}${payParam}`);
      setOrders(res.data);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSimulatorMetadata = async () => {
    try {
      const custRes = await axios.get('/api/customers');
      setCustomers(custRes.data);
      const prodRes = await axios.get('/api/products');
      setProducts(prodRes.data.filter(p => p.stock > 0));
    } catch (err) {
      console.error('Error metadata:', err);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [search, delStatus, payStatus]);

  useEffect(() => {
    if (showSimulateModal) {
      fetchSimulatorMetadata();
    }
  }, [showSimulateModal]);

  const handleOpenDetails = async (orderId) => {
    try {
      const res = await axios.get(`/api/orders/${orderId}`);
      setSelectedOrder(res.data.order);
      setOrderItems(res.data.items);
      setOrderPayments(res.data.payments);
      setShowDetailsModal(true);
    } catch (err) {
      console.error('Error loading order details:', err);
      alert('Failed to load order details.');
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const res = await axios.put(`/api/orders/${orderId}`, {
        delivery_status: newStatus
      });
      
      const statusAlert = {
        id: Date.now(),
        type: newStatus === 'Cancelled' ? 'danger' : newStatus === 'Delivered' ? 'success' : 'info',
        message: `Order #ORD-${orderId} updated to ${newStatus}.`,
        time: new Date().toLocaleTimeString()
      };
      setNotifications(prev => [statusAlert, ...prev]);

      alert(res.data.message);
      fetchOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        handleOpenDetails(orderId);
      }
    } catch (err) {
      console.error('Error status update:', err);
      alert('Status update failed.');
    }
  };

  const handleSimulatePayment = async (orderId, targetStatus) => {
    try {
      const res = await axios.post(`/api/orders/${orderId}/simulate-payment`, {
        status: targetStatus
      });

      const payAlert = {
        id: Date.now(),
        type: targetStatus === 'Paid' ? 'success' : 'danger',
        message: `Payment status: Order #ORD-${orderId} marked as ${targetStatus}.`,
        time: new Date().toLocaleTimeString()
      };
      setNotifications(prev => [payAlert, ...prev]);

      alert(res.data.message);
      fetchOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        handleOpenDetails(orderId);
      }
    } catch (err) {
      console.error('Payment simulation error:', err);
      alert('Payment simulation failed.');
    }
  };

  const handleAddSimProduct = () => {
    setSimProducts([...simProducts, { product_id: '', quantity: 1 }]);
  };

  const handleRemoveSimProduct = (index) => {
    setSimProducts(simProducts.filter((_, idx) => idx !== index));
  };

  const handleSimProductChange = (index, field, value) => {
    const updated = [...simProducts];
    updated[index][field] = value;
    setSimProducts(updated);
  };

  const handleCreateSimOrder = async (e) => {
    e.preventDefault();
    if (!simCustomer) {
      alert('Please select a customer');
      return;
    }

    const filteredItems = simProducts.filter(item => item.product_id && item.quantity > 0);
    if (filteredItems.length === 0) {
      alert('Please select a valid product');
      return;
    }

    try {
      const res = await axios.post('/api/orders', {
        customer_id: parseInt(simCustomer),
        items: filteredItems.map(item => ({
          product_id: parseInt(item.product_id),
          quantity: parseInt(item.quantity)
        })),
        payment_method: simPaymentMethod
      });

      alert(res.data.message);
      setShowSimulateModal(false);
      handleOpenDetails(res.data.orderId);
      fetchOrders();
    } catch (err) {
      console.error('Error checkout:', err);
      alert('Order checkout failed.');
    }
  };

  const handlePrintInvoice = () => {
    if (!selectedOrder) return;
    
    const printWindow = window.open('', '_blank');
    
    let itemsHtml = orderItems.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">
          <strong>${item.product_name}</strong><br/>
          <small style="color: #666;">${item.product_brand || ''}</small>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${parseFloat(item.price).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;"><strong>₹${(item.quantity * parseFloat(item.price)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - #INV-${selectedOrder.id}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #4f46e5; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { margin: 0; color: #4f46e5; font-size: 28px; }
            .header-right { text-align: right; }
            .header-right h2 { margin: 0; font-size: 24px; color: #333; }
            .info-section { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .billing-info { background: #f8fafc; padding: 20px; border-radius: 8px; width: 45%; }
            .order-info { background: #f8fafc; padding: 20px; border-radius: 8px; width: 45%; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { text-align: left; padding: 12px 10px; background-color: #f1f5f9; color: #475569; border-bottom: 2px solid #cbd5e1; }
            .totals { width: 300px; float: right; }
            .totals-row { display: flex; justify-content: space-between; padding: 8px 0; }
            .totals-row.grand { border-top: 2px solid #cbd5e1; font-weight: bold; font-size: 1.2rem; color: #4f46e5; padding-top: 15px; margin-top: 10px; }
            @media print { .btn-print { display: none; } body { padding: 0; } }
            .btn-print { margin-top: 50px; padding: 12px 24px; font-size: 16px; background: #4f46e5; color: white; border: none; border-radius: 6px; cursor: pointer; display: block; width: 200px; margin-left: auto; margin-right: auto; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>TechMart Electronics India</h1>
              <p style="margin: 5px 0 0 0; color: #666;">TCS Campus, Bandra Kurla Complex<br/>Mumbai, Maharashtra, India</p>
            </div>
            <div class="header-right">
              <h2>TAX INVOICE</h2>
              <p style="margin: 5px 0 0 0; color: #666;">Invoice No: #INV-${selectedOrder.id}<br/>Date: ${new Date(selectedOrder.created_at).toLocaleDateString()}</p>
            </div>
          </div>
          
          <div class="info-section">
            <div class="billing-info">
              <h4 style="margin-top: 0; border-bottom: 1px solid #ddd; padding-bottom: 8px;">Billed To:</h4>
              <strong>${selectedOrder.customer_name}</strong><br/>
              Email: ${selectedOrder.customer_email}<br/>
              Phone: ${selectedOrder.customer_phone || 'N/A'}<br/>
              Address: ${selectedOrder.customer_address || 'N/A'}
            </div>
            <div class="order-info">
              <h4 style="margin-top: 0; border-bottom: 1px solid #ddd; padding-bottom: 8px;">Order & Payment details:</h4>
              Order Ref: <strong>#ORD-${selectedOrder.id}</strong><br/>
              Payment Method: ${selectedOrder.payment_method}<br/>
              Payment Status: <strong>${selectedOrder.payment_status}</strong><br/>
              Transaction ID: ${selectedOrder.transaction_id || 'N/A'}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item Description</th>
                <th style="text-align: center;">Quantity</th>
                <th style="text-align: right;">Unit Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-row">
              <span style="color: #666;">Subtotal:</span>
              <span>₹${(selectedOrder.total_amount - selectedOrder.tax).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="totals-row">
              <span style="color: #666;">GST Tax (18%):</span>
              <span>₹${parseFloat(selectedOrder.tax).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="totals-row grand">
              <span>Grand Total:</span>
              <span>₹${parseFloat(selectedOrder.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          <div style="clear: both;"></div>

          <div style="margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px; color: #666; font-size: 0.9em; text-align: center;">
            This is a computer generated invoice and does not require a physical signature.
          </div>

          <button class="btn-print" onclick="window.print()">🖨️ Print Invoice</button>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="animate-fade-in print-invoice-area">
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4 no-print">
        <div>
          <h3 className="fw-extrabold m-0 text-slate-900" style={{ letterSpacing: '-0.02em' }}>Order Management System</h3>
          <p className="text-secondary mb-0">Track order stages (Pending → Processing → Shipped → Delivered) and generate invoices in INR (₹).</p>
        </div>
        
        <button onClick={() => {
          setSimCustomer('');
          setSimProducts([{ product_id: '', quantity: 1 }]);
          setSimPaymentMethod('Credit Card / Debit Card');
          setShowSimulateModal(true);
        }} className="btn btn-primary d-flex align-items-center gap-2 fw-semibold">
          <i className="bi bi-play-circle-fill"></i> Sandbox Order Simulator
        </button>
      </div>

      {/* Filters Card */}
      <div className="card card-premium p-3 mb-4 no-print">
        <div className="row g-3">
          <div className="col-12 col-md-4">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0 text-muted"><i className="bi bi-search"></i></span>
              <input
                type="text"
                className="form-control form-control-premium border-start-0"
                placeholder="Search by customer or order ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="col-12 col-sm-6 col-md-4">
            <select
              className="form-select form-select-premium"
              value={delStatus}
              onChange={(e) => setDelStatus(e.target.value)}
            >
              <option value="">All Delivery Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Processing">Processing</option>
              <option value="Shipped">Shipped</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Returned">Returned</option>
            </select>
          </div>
          <div className="col-12 col-sm-6 col-md-4">
            <select
              className="form-select form-select-premium"
              value={payStatus}
              onChange={(e) => setPayStatus(e.target.value)}
            >
              <option value="">All Payment Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
              <option value="Failed">Failed</option>
              <option value="Refunded">Refunded</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card card-premium p-4 no-print">
        <div className="table-responsive">
          <table className="table table-hover table-premium mb-0">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer Name</th>
                <th>Total Items</th>
                <th>Total Bill (₹)</th>
                <th>Payment Status</th>
                <th>Delivery Status</th>
                <th>Date</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-5">
                    <div className="spinner-border text-primary" role="status"></div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-4 text-muted">No orders processed yet.</td>
                </tr>
              ) : (
                orders.map(order => (
                  <tr key={order.id}>
                    <td><strong>#ORD-{order.id}</strong></td>
                    <td>
                      <div className="fw-semibold text-slate-800">{order.customer_name}</div>
                      <small className="text-muted">{order.customer_email}</small>
                    </td>
                    <td>{order.total_items} items ({order.total_quantity} qty)</td>
                    <td><strong>₹{parseFloat(order.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
                    <td>
                      <span className={`badge bg-opacity-10 bg-${
                        order.payment_status === 'Paid' ? 'success' : 'warning'
                      } text-${
                        order.payment_status === 'Paid' ? 'success' : 'warning'
                      }`}>
                        {order.payment_status}
                      </span>
                    </td>
                    <td>
                      <span className={`badge bg-opacity-10 bg-${
                        order.delivery_status === 'Delivered' ? 'success' : 
                        order.delivery_status === 'Pending' ? 'warning' : 'info'
                      } text-${
                        order.delivery_status === 'Delivered' ? 'success' : 
                        order.delivery_status === 'Pending' ? 'warning' : 'info'
                      }`}>
                        {order.delivery_status}
                      </span>
                    </td>
                    <td>{new Date(order.created_at).toLocaleDateString()}</td>
                    <td className="text-end">
                      <button onClick={() => handleOpenDetails(order.id)} className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1 fw-semibold">
                        <i className="bi bi-eye"></i> Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details & Invoice Printing Modal */}
      {showDetailsModal && selectedOrder && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(3px)' }}>
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content border-0 shadow" style={{ borderRadius: '14px' }}>
              <div className="modal-header border-bottom pb-3 no-print">
                <h5 className="modal-title fw-bold">Order Details & Invoice Generation</h5>
                <button type="button" className="btn-close" onClick={() => setShowDetailsModal(false)}></button>
              </div>

              <div className="modal-body p-4 print-invoice-area">
                {/* Print Invoice Header */}
                <div className="d-none d-print-block mb-4 border-bottom pb-3">
                  <div className="row">
                    <div className="col-6">
                      <h3 className="fw-bold text-primary m-0">TechMart Electronics India</h3>
                      <p className="text-muted small mb-0">TCS Campus, Bandra Kurla Complex, Mumbai, India</p>
                    </div>
                    <div className="col-6 text-end">
                      <h4 className="fw-bold mb-1">INVOICE</h4>
                      <h6 className="text-secondary mb-0">#INV-{selectedOrder.id}</h6>
                      <small className="text-muted">Date: {new Date(selectedOrder.created_at).toLocaleDateString()}</small>
                    </div>
                  </div>
                </div>

                <div className="row g-4">
                  <div className="col-12 col-lg-8">
                    <div className="card card-premium p-3 mb-3 border bg-light">
                      <div className="row">
                        <div className="col-6">
                          <span className="text-muted small text-uppercase d-block">Order Reference</span>
                          <span className="fs-5 fw-bold">#ORD-{selectedOrder.id}</span>
                        </div>
                        <div className="col-6 text-end">
                          <span className="text-muted small text-uppercase d-block">Placement Date</span>
                          <span className="fw-medium">{new Date(selectedOrder.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <h6 className="fw-bold mb-2">Cart Contents</h6>
                    <div className="table-responsive mb-4">
                      <table className="table table-bordered table-premium mb-0">
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>Description</th>
                            <th className="text-center">Qty</th>
                            <th className="text-end">Unit Price</th>
                            <th className="text-end">Line Total (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orderItems.map((item, idx) => (
                            <tr key={idx}>
                              <td>
                                <img 
                                  src={item.product_image?.startsWith('/uploads') ? `${item.product_image}` : item.product_image || fallbackImg} 
                                  alt={item.product_name}
                                  onError={(e) => { e.target.src = fallbackImg; }}
                                  className="rounded"
                                  style={{ width: '40px', height: '40px', objectFit: 'contain', background: '#f8fafc' }}
                                />
                              </td>
                              <td>
                                <div className="fw-semibold">{item.product_name}</div>
                                <small className="text-muted">{item.product_brand}</small>
                              </td>
                              <td className="text-center">{item.quantity}</td>
                              <td className="text-end">₹{parseFloat(item.price).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                              <td className="text-end"><strong>₹{(item.quantity * parseFloat(item.price)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
                            </tr>
                          ))}
                          <tr>
                            <td colSpan="3" className="border-0"></td>
                            <td className="text-end text-muted fw-semibold">Subtotal:</td>
                            <td className="text-end fw-semibold">₹{(selectedOrder.total_amount - selectedOrder.tax).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          </tr>
                          <tr>
                            <td colSpan="3" className="border-0"></td>
                            <td className="text-end text-muted fw-semibold">GST Tax (18%):</td>
                            <td className="text-end fw-semibold">₹{parseFloat(selectedOrder.tax).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          </tr>
                          <tr className="table-light">
                            <td colSpan="3" className="border-0"></td>
                            <td className="text-end fw-bold">Grand Total:</td>
                            <td className="text-end fw-bold text-primary">₹{parseFloat(selectedOrder.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="col-12 col-lg-4">
                    <div className="card border p-3 mb-4 rounded-3">
                      <h6 className="fw-bold border-bottom pb-2 mb-3">Customer Billing Info</h6>
                      <div className="fw-bold mb-1">{selectedOrder.customer_name}</div>
                      <div className="small mb-2"><strong>Email:</strong> {selectedOrder.customer_email}</div>
                      <div className="small mb-2"><strong>Phone:</strong> {selectedOrder.customer_phone || '—'}</div>
                      <div className="small"><strong>Shipping Address:</strong><br />{selectedOrder.customer_address || '—'}</div>
                    </div>

                    <div className="card border p-3 mb-4 rounded-3">
                      <h6 className="fw-bold border-bottom pb-2 mb-3">Payment Details</h6>
                      <div className="small mb-2"><strong>Method:</strong> {selectedOrder.payment_method}</div>
                      <div className="small mb-2">
                        <strong>Status:</strong> <span className={`badge bg-opacity-10 bg-${selectedOrder.payment_status === 'Paid' ? 'success' : 'warning'} text-${selectedOrder.payment_status === 'Paid' ? 'success' : 'warning'}`}>{selectedOrder.payment_status}</span>
                      </div>
                      <div className="small"><strong>Transaction ID/UTR:</strong> <span className="font-monospace text-purple fw-bold">{selectedOrder.transaction_id || '—'}</span></div>
                    </div>

                    <div className="no-print">
                      <div className="card border p-3 mb-4 rounded-3">
                        <h6 className="fw-bold mb-3">Update Order Status Stage</h6>
                        <div className="mb-3">
                          <select 
                            className="form-select form-select-premium"
                            value={selectedOrder.delivery_status}
                            onChange={(e) => handleUpdateStatus(selectedOrder.id, e.target.value)}
                            disabled={['Cancelled', 'Returned'].includes(selectedOrder.delivery_status)}
                          >
                            <option value="Pending">1. Pending</option>
                            <option value="Processing">2. Processing</option>
                            <option value="Shipped">3. Shipped</option>
                            <option value="Delivered">4. Delivered</option>
                          </select>
                        </div>

                        <div className="d-flex gap-2">
                          <button 
                            onClick={() => handleUpdateStatus(selectedOrder.id, 'Cancelled')}
                            className="btn btn-outline-danger btn-sm w-50 fw-semibold"
                            disabled={['Cancelled', 'Returned', 'Delivered'].includes(selectedOrder.delivery_status)}
                          >
                            Cancel Order
                          </button>
                          
                          <button 
                            onClick={() => handleUpdateStatus(selectedOrder.id, 'Returned')}
                            className="btn btn-outline-warning btn-sm w-50 fw-semibold"
                            disabled={selectedOrder.delivery_status !== 'Delivered'}
                          >
                            Return Order
                          </button>
                        </div>
                      </div>

                      <div className="card border p-3 rounded-3">
                        <h6 className="fw-bold mb-3">Simulate Payment Gateway</h6>
                        <div className="d-grid gap-2">
                          <button 
                            onClick={() => handleSimulatePayment(selectedOrder.id, 'Paid')}
                            className="btn btn-success btn-sm fw-semibold"
                            disabled={['Paid', 'Refunded', 'Cancelled'].includes(selectedOrder.payment_status)}
                          >
                            Mark Paid
                          </button>
                          
                          <button 
                            onClick={() => handleSimulatePayment(selectedOrder.id, 'Failed')}
                            className="btn btn-danger btn-sm fw-semibold"
                            disabled={['Paid', 'Refunded', 'Failed'].includes(selectedOrder.payment_status)}
                          >
                            Mark Failed
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer border-top pt-3 no-print">
                <button type="button" onClick={handlePrintInvoice} className="btn btn-primary d-flex align-items-center gap-2 fw-semibold">
                  <i className="bi bi-printer"></i> Print Invoice (₹)
                </button>
                <button type="button" className="btn btn-secondary px-4 fw-semibold" onClick={() => setShowDetailsModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Simulator Modal */}
      {showSimulateModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(3px)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow" style={{ borderRadius: '14px' }}>
              <div className="modal-header border-bottom pb-2">
                <h5 className="modal-title fw-bold">Place Sandbox Electronic Order</h5>
                <button type="button" className="btn-close" onClick={() => setShowSimulateModal(false)}></button>
              </div>

              <form onSubmit={handleCreateSimOrder}>
                <div className="modal-body py-3">
                  <div className="row g-3 mb-4">
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">Select Customer *</label>
                      <select 
                        className="form-select form-select-premium"
                        value={simCustomer}
                        onChange={(e) => setSimCustomer(e.target.value)}
                        required
                      >
                        <option value="">Choose customer profile...</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">Payment Gateway Method</label>
                      <select 
                        className="form-select form-select-premium"
                        value={simPaymentMethod}
                        onChange={(e) => setSimPaymentMethod(e.target.value)}
                      >
                        <option value="Credit Card / Debit Card">Credit Card / Debit Card</option>
                        <option value="UPI / GPay / PhonePe">UPI / GPay</option>
                        <option value="NetBanking">NetBanking</option>
                        <option value="Cash on Delivery">Cash on Delivery</option>
                      </select>
                    </div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="fw-bold m-0">Select Items</h6>
                    <button type="button" onClick={handleAddSimProduct} className="btn btn-outline-primary btn-sm">
                      <i className="bi bi-plus-lg"></i> Add Item
                    </button>
                  </div>

                  <div className="p-3 bg-light rounded-3 mb-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {simProducts.map((simItem, idx) => (
                      <div key={idx} className="row g-2 align-items-end mb-2">
                        <div className="col-7">
                          <label className="form-label small text-muted mb-1" style={{ fontSize: '0.75rem' }}>Electronic Item</label>
                          <select 
                            className="form-select form-select-premium"
                            value={simItem.product_id}
                            onChange={(e) => handleSimProductChange(idx, 'product_id', e.target.value)}
                            required
                          >
                            <option value="">Choose item...</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>{p.name} - ₹{p.price} ({p.stock} in stock)</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-3">
                          <label className="form-label small text-muted mb-1" style={{ fontSize: '0.75rem' }}>Qty</label>
                          <input 
                            type="number" 
                            className="form-control form-control-premium"
                            min="1"
                            value={simItem.quantity}
                            onChange={(e) => handleSimProductChange(idx, 'quantity', e.target.value)}
                            required
                          />
                        </div>
                        <div className="col-2">
                          <button 
                            type="button" 
                            onClick={() => handleRemoveSimProduct(idx)}
                            className="btn btn-outline-danger w-100 py-2"
                            disabled={simProducts.length === 1}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="modal-footer border-top pt-2">
                  <button type="button" className="btn btn-light" onClick={() => setShowSimulateModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary px-4 fw-semibold">Place Order</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
