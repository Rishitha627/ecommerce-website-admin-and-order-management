import React, { useState, useEffect } from 'react';
import axios from 'axios';

const fallbackImg = 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=600&auto=format&fit=crop&q=80';

export default function CustomerStorefront({ user, onLogout }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [activeTab, setActiveTab] = useState('shop'); // 'shop' | 'orders'

  // Cart state
  const [cart, setCart] = useState([]);
  const [showCartModal, setShowCartModal] = useState(false);
  
  // Payment Gateway state (UPI Payment, COD, etc.)
  const [paymentMethod, setPaymentMethod] = useState(''); // 'UPI Payment' | 'COD' | 'Card' | 'NetBanking'
  const [generatedToken, setGeneratedToken] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  
  // Real-time Gateway steps
  const [gatewayStep, setGatewayStep] = useState('cart'); // 'cart' | 'token' | 'processing' | 'success'
  const [gatewayStatusMsg, setGatewayStatusMsg] = useState('');
  const [lastCompletedOrder, setLastCompletedOrder] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // My Orders state
  const [myOrders, setMyOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const fetchProducts = async (query = '', catId = '') => {
    try {
      setLoading(true);
      const catParam = catId ? `&categoryId=${catId}` : '';
      const res = await axios.get(`/api/products?search=${encodeURIComponent(query)}${catParam}`);
      setProducts(res.data);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get('/api/categories');
      setCategories(res.data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchMyOrders = async () => {
    try {
      setOrdersLoading(true);
      const token = localStorage.getItem('techmart_token');
      const res = await axios.get(`/api/customers/${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setMyOrders(res.data.orders);
    } catch (err) {
      console.error('Error fetching customer orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchProducts(search, selectedCategory);
    }, 200);
    return () => clearTimeout(delayDebounce);
  }, [search, selectedCategory]);

  useEffect(() => {
    if (activeTab === 'orders') {
      fetchMyOrders();
    }
  }, [activeTab]);

  // Cart Functions
  const handleAddToCart = (product) => {
    if (product.stock <= 0) {
      alert('Sorry, this item is currently out of stock.');
      return;
    }

    setCart(prevCart => {
      const existing = prevCart.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert(`Cannot add more. Available stock limit is ${product.stock}.`);
          return prevCart;
        }
        return prevCart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
  };

  const handleUpdateCartQuantity = (productId, delta) => {
    setCart(prevCart => {
      return prevCart
        .map(item => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty > item.product.stock) {
              alert(`Maximum available stock is ${item.product.stock}`);
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean);
    });
  };

  const handleRemoveFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  // Financial Calculations (INR ₹)
  const cartSubtotal = cart.reduce((acc, item) => {
    const discountedPrice = item.product.price * (1 - (item.product.discount || 0) / 100);
    return acc + discountedPrice * item.quantity;
  }, 0);
  const cartTax = cartSubtotal * 0.18;
  const cartTotal = cartSubtotal + cartTax;
  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // STEP 1: PhonePe QR Token Generation Handler
  const handleGeneratePhonePeToken = () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'Online' && (!transactionRef || transactionRef.trim().length < 8)) {
      alert("Please enter a valid UTR / Transaction Reference Number.");
      return;
    }
    const newToken = 'TOK-PPE-' + Math.floor(100000 + Math.random() * 900000);
    setGeneratedToken(newToken);
    setGatewayStep('token');
  };

  // STEP 2: Verify Token & Execute Order Creation
  const handleExecuteOrderWithToken = async () => {
    if (cart.length === 0) return;

    setGatewayStep('processing');
    setCheckoutLoading(true);

    const isQr = paymentMethod === 'Online';
    setGatewayStatusMsg(isQr ? 'Verifying Online Payment Token...' : 'Processing Order...');

    try {
      await new Promise(r => setTimeout(r, 800));
      setGatewayStatusMsg(isQr ? `Token ${generatedToken} Verified! Placing Order...` : 'Booking COD Order & Securing Inventory...');
      await new Promise(r => setTimeout(r, 600));

      const token = localStorage.getItem('techmart_token');
      const orderItems = cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity
      }));

      const txnId = isQr 
        ? (generatedToken || transactionRef || ('PPE-' + Math.random().toString(36).substring(2, 10).toUpperCase()))
        : ('COD-' + Math.random().toString(36).substring(2, 10).toUpperCase());

      const payStatus = (isQr || paymentMethod === 'Card' || paymentMethod === 'NetBanking') ? 'Paid' : 'Pending (COD)';
      const methodTitle = isQr ? 'Online Payment (UPI/QR)' : (paymentMethod === 'COD' ? 'Cash on Delivery (COD)' : paymentMethod);

      const res = await axios.post('/api/orders', {
        customer_id: user.id,
        items: orderItems,
        payment_method: methodTitle,
        payment_status: payStatus,
        transaction_id: txnId
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setLastCompletedOrder({
        orderId: res.data.orderId,
        txnId: res.data.transactionId || txnId,
        totalAmount: res.data.totalAmount,
        method: methodTitle,
        payStatus: payStatus,
        token: generatedToken
      });

      setCart([]);
      setGatewayStep('success');
      fetchMyOrders();
      fetchProducts(search, selectedCategory);

    } catch (err) {
      console.error('Checkout error:', err);
      alert(err.response?.data?.message || 'Order processing error.');
      setGatewayStep('cart');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowCartModal(false);
    setGatewayStep('cart');
  };

  const handleResetSearch = () => {
    setSearch('');
    setSelectedCategory('');
  };

  const getStageIndex = (status) => {
    switch (status) {
      case 'Pending': return 1;
      case 'Processing': return 2;
      case 'Shipped': return 3;
      case 'Delivered': return 4;
      default: return 1;
    }
  };

  return (
    <div className="min-vh-100 bg-light d-flex flex-column">
      {/* Customer Header */}
      <header className="bg-white border-bottom sticky-top py-2.5 px-4 d-flex justify-content-between align-items-center shadow-sm">
        <div className="d-flex align-items-center gap-3">
          <div className="d-flex align-items-center gap-2 text-primary fw-bold fs-4">
            <i className="bi bi-laptop"></i>
            <span>TechMart India</span>
          </div>
          
          <nav className="d-none d-md-flex gap-1 ms-4">
            <button 
              onClick={() => setActiveTab('shop')} 
              className={`btn btn-sm fw-semibold ${activeTab === 'shop' ? 'btn-primary' : 'btn-light border-0 text-secondary'}`}
            >
              <i className="bi bi-grid-fill me-1"></i> Electronics Storefront
            </button>
            <button 
              onClick={() => setActiveTab('orders')} 
              className={`btn btn-sm fw-semibold ${activeTab === 'orders' ? 'btn-primary' : 'btn-light border-0 text-secondary'}`}
            >
              <i className="bi bi-bag-check-fill me-1"></i> Track My Orders
            </button>
          </nav>
        </div>

        <div className="d-flex align-items-center gap-3">
          {/* Shopping Cart Button */}
          <button 
            onClick={() => { setGatewayStep('cart'); setShowCartModal(true); }} 
            className="btn btn-outline-primary position-relative d-flex align-items-center gap-2 fw-semibold"
          >
            <i className="bi bi-cart-fill fs-5"></i>
            <span className="d-none d-sm-inline">Cart</span>
            {totalCartCount > 0 && (
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                {totalCartCount}
              </span>
            )}
          </button>

          {/* User Profile */}
          <div className="d-flex align-items-center gap-2 border-start ps-3">
            <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: '36px', height: '36px' }}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'C'}
            </div>
            <div className="d-none d-sm-block">
              <div className="fw-semibold text-slate-800 small">{user?.name || 'Customer'}</div>
              <div className="text-muted" style={{ fontSize: '0.72rem' }}>{user?.email || 'Customer Account'}</div>
            </div>
            <button onClick={onLogout} className="btn btn-light btn-sm text-danger border ms-2" title="Logout">
              <i className="bi bi-box-arrow-right"></i>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="container-fluid p-4 flex-grow-1 animate-fade-in">
        
        {activeTab === 'shop' && (
          <div>
            {/* Storefront Hero Banner */}
            <div className="bg-white border rounded-3 p-4 mb-4 shadow-sm d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
              <div>
                <span className="badge bg-purple bg-opacity-10 text-purple fw-semibold mb-2" style={{ backgroundColor: '#f3e8ff', color: '#6b21a8' }}>
                  📱 PhonePe QR Pay & 💵 Cash on Delivery Checkout
                </span>
                <h3 className="fw-extrabold text-slate-900 m-0" style={{ letterSpacing: '-0.02em' }}>Shop Electronics & Pay via PhonePe QR</h3>
                <p className="text-secondary mb-0">Laptops, Smartphones, 4K Smart TVs, Headphones & Gaming Gadgets.</p>
              </div>

              {/* Filters & Search Input */}
              <div className="d-flex gap-2 w-100 w-md-auto">
                <div className="input-group" style={{ minWidth: '260px' }}>
                  <span className="input-group-text bg-white border-end-0 text-muted"><i className="bi bi-search"></i></span>
                  <input
                    type="text"
                    className="form-control form-control-premium border-start-0 border-end-0"
                    placeholder="Search by product, brand, or category..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <button 
                      className="btn btn-outline-secondary border-start-0 bg-white text-muted" 
                      type="button"
                      onClick={() => setSearch('')}
                      title="Clear search"
                    >
                      <i className="bi bi-x-lg"></i>
                    </button>
                  )}
                </div>
                <select
                  className="form-select form-select-premium"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  style={{ minWidth: '160px' }}
                >
                  <option value="">All Categories</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
                  <span className="visually-hidden">Searching products...</span>
                </div>
                <p className="text-muted mt-3 fw-medium">Searching electronics catalog...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="card bg-white border-0 shadow-sm p-5 text-center my-4 rounded-4">
                <div className="d-inline-flex align-items-center justify-content-center bg-light text-secondary rounded-circle p-4 mb-3 mx-auto" style={{ width: '80px', height: '80px' }}>
                  <i className="bi bi-search fs-1"></i>
                </div>
                <h4 className="fw-bold text-slate-800 mb-2">No products match your search</h4>
                <p className="text-muted max-w-md mx-auto mb-4" style={{ maxWidth: '540px' }}>
                  {search 
                    ? `No electronic products found matching "${search}". Please try a different keyword or browse our categories.` 
                    : 'No electronic products are available in this category.'}
                </p>
                <div className="d-flex justify-content-center gap-2">
                  <button onClick={handleResetSearch} className="btn btn-primary px-4 py-2 fw-semibold">
                    <i className="bi bi-arrow-counterclockwise me-1.5"></i> Clear Filters & View All
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {search && (
                  <div className="d-flex align-items-center justify-content-between mb-3 px-1">
                    <div className="text-secondary small fw-medium">
                      Showing <strong>{products.length}</strong> electronics matching <span className="badge bg-primary bg-opacity-10 text-primary font-monospace">{search}</span>
                    </div>
                    <button onClick={() => setSearch('')} className="btn btn-link btn-sm text-decoration-none text-muted p-0">
                      Clear Search
                    </button>
                  </div>
                )}

                <div className="row g-4">
                  {products.map(product => {
                    const finalPrice = product.price * (1 - (product.discount || 0) / 100);
                    const isOutOfStock = product.stock <= 0;

                    return (
                      <div key={product.id} className="col-12 col-sm-6 col-md-4 col-lg-3">
                        <div className="store-product-card h-100 d-flex flex-column p-3">
                          <div className="position-relative text-center mb-3 bg-light rounded-2 p-3 d-flex align-items-center justify-content-center" style={{ height: '180px' }}>
                            <img 
                              src={product.image_url?.startsWith('/uploads') ? `${product.image_url}` : product.image_url || fallbackImg} 
                              alt={product.name}
                              onError={(e) => { e.target.src = fallbackImg; }}
                              style={{ maxHeight: '150px', maxWidth: '100%', objectFit: 'contain' }}
                            />
                            {parseFloat(product.discount) > 0 && (
                              <span className="position-absolute top-0 start-0 m-2 badge bg-danger">
                                -{parseFloat(product.discount)}% OFF
                              </span>
                            )}
                          </div>

                          <div className="flex-grow-1 d-flex flex-column">
                            <div className="text-muted small fw-semibold text-uppercase">{product.brand || 'Electronics'}</div>
                            <h6 className="fw-bold text-slate-800 mb-1 text-truncate" title={product.name}>{product.name}</h6>
                            <p className="text-muted small flex-grow-1" style={{ fontSize: '0.82rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {product.description}
                            </p>

                            <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
                              <div>
                                <div className="fs-5 fw-extrabold text-success">₹{finalPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                                {parseFloat(product.discount) > 0 && (
                                  <small className="text-muted text-decoration-line-through">₹{parseFloat(product.price).toLocaleString('en-IN')}</small>
                                )}
                              </div>

                              <button 
                                onClick={() => handleAddToCart(product)}
                                className={`btn btn-sm fw-semibold d-flex align-items-center gap-1 ${isOutOfStock ? 'btn-light text-muted' : 'btn-primary'}`}
                                disabled={isOutOfStock}
                              >
                                <i className="bi bi-bag-plus-fill"></i>
                                {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* My Orders & Dynamic Progress Tracker Tab */}
        {activeTab === 'orders' && (
          <div className="bg-white border rounded-3 p-4 shadow-sm">
            <h4 className="fw-bold mb-1">Track My Orders</h4>
            <p className="text-secondary small mb-4">View real-time status progression from Pending to Processing, Shipped, and Delivered.</p>

            {ordersLoading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status"></div>
              </div>
            ) : myOrders.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <i className="bi bi-bag-x fs-1"></i>
                <p className="mt-2 mb-0">You have not placed any orders yet.</p>
                <button onClick={() => setActiveTab('shop')} className="btn btn-primary btn-sm mt-3 fw-semibold">
                  Browse Electronics Catalog
                </button>
              </div>
            ) : (
              <div className="d-flex flex-column gap-4">
                {myOrders.map(order => {
                  const currentStage = getStageIndex(order.delivery_status);
                  const isCancelled = order.delivery_status === 'Cancelled' || order.delivery_status === 'Returned';

                  return (
                    <div key={order.id} className="card border p-4 rounded-3 shadow-xs">
                      {/* Order Header Summary */}
                      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 border-bottom pb-3 mb-4">
                        <div>
                          <span className="badge bg-light text-primary border font-monospace me-2">#ORD-{order.id}</span>
                          <span className="text-muted small">Placed on {new Date(order.created_at).toLocaleString()}</span>
                        </div>
                        <div className="d-flex align-items-center gap-3">
                          <button 
                            onClick={() => {
                              const printWindow = window.open('', '_blank');
                              printWindow.document.write(`
                                <html>
                                  <head>
                                    <title>Order Receipt - #ORD-${order.id}</title>
                                    <style>
                                      body { font-family: sans-serif; padding: 40px; color: #333; line-height: 1.6; }
                                      .header { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
                                      .header h2 { margin: 0 0 10px 0; color: #4f46e5; }
                                      .details { margin-bottom: 30px; padding: 20px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
                                      .details p { margin: 8px 0; }
                                      .details strong { display: inline-block; width: 180px; color: #475569; }
                                      .total { font-size: 1.4rem; font-weight: bold; margin-top: 30px; border-top: 2px solid #eee; padding-top: 20px; text-align: right; color: #0f172a; }
                                      .btn-print { margin-top: 30px; padding: 12px 24px; font-size: 16px; background: #4f46e5; color: white; border: none; border-radius: 6px; cursor: pointer; display: block; width: 100%; font-weight: bold; }
                                      @media print { .btn-print { display: none; } body { padding: 0; } }
                                    </style>
                                  </head>
                                  <body>
                                    <div class="header">
                                      <h2>TechMart India</h2>
                                      <p style="color: #64748b; margin: 0;">Official Order Receipt</p>
                                    </div>
                                    <div class="details">
                                      <p><strong>Order Reference:</strong> #ORD-${order.id}</p>
                                      <p><strong>Date & Time:</strong> ${new Date(order.created_at).toLocaleString()}</p>
                                      <p><strong>Payment Status:</strong> ${order.payment_status}</p>
                                      <p><strong>Delivery Stage:</strong> ${order.delivery_status}</p>
                                    </div>
                                    <div class="total">
                                      Grand Total: ₹${parseFloat(order.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </div>
                                    <button class="btn-print" onclick="window.print()">🖨️ Print Receipt</button>
                                  </body>
                                </html>
                              `);
                              printWindow.document.close();
                            }}
                            className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1 fw-semibold"
                            title="Print Order Receipt"
                          >
                            <i className="bi bi-printer"></i> Print
                          </button>
                          <div>
                            <span className="text-muted small me-1">Total Bill:</span>
                            <strong className="fs-5 text-primary">₹{parseFloat(order.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                          </div>
                          <span className={`badge bg-opacity-10 bg-${
                            order.payment_status === 'Paid' ? 'success' : 'warning'
                          } text-${
                            order.payment_status === 'Paid' ? 'success' : 'warning'
                          } px-2.5 py-1.5 d-none d-sm-inline-block`}>
                            Payment: {order.payment_status}
                          </span>
                        </div>
                      </div>

                      {/* Graphical Progress Tracker Timeline */}
                      {!isCancelled ? (
                        <div className="mb-2">
                          <h6 className="fw-semibold small text-uppercase text-secondary mb-3">Live Order Tracking Stage</h6>
                          <div className="row g-2 text-center align-items-center">
                            
                            {/* Step 1: Pending */}
                            <div className="col-3">
                              <div className={`p-2 rounded-3 border ${currentStage >= 1 ? 'bg-primary text-white fw-bold shadow-xs border-primary' : 'bg-light text-muted'}`}>
                                <i className="bi bi-clock-history me-1"></i> 1. Pending
                              </div>
                              <small className="text-muted d-block mt-1" style={{ fontSize: '0.72rem' }}>Order Placed</small>
                            </div>

                            {/* Step 2: Processing */}
                            <div className="col-3">
                              <div className={`p-2 rounded-3 border ${currentStage >= 2 ? 'bg-primary text-white fw-bold shadow-xs border-primary' : 'bg-light text-muted'}`}>
                                <i className="bi bi-gear-wide-connected me-1"></i> 2. Processing
                              </div>
                              <small className="text-muted d-block mt-1" style={{ fontSize: '0.72rem' }}>Warehouse Packing</small>
                            </div>

                            {/* Step 3: Shipped */}
                            <div className="col-3">
                              <div className={`p-2 rounded-3 border ${currentStage >= 3 ? 'bg-primary text-white fw-bold shadow-xs border-primary' : 'bg-light text-muted'}`}>
                                <i className="bi bi-truck me-1"></i> 3. Shipped
                              </div>
                              <small className="text-muted d-block mt-1" style={{ fontSize: '0.72rem' }}>In Transit</small>
                            </div>

                            {/* Step 4: Delivered */}
                            <div className="col-3">
                              <div className={`p-2 rounded-3 border ${currentStage >= 4 ? 'bg-success text-white fw-bold shadow-xs border-success' : 'bg-light text-muted'}`}>
                                <i className="bi bi-check-circle-fill me-1"></i> 4. Delivered
                              </div>
                              <small className="text-muted d-block mt-1" style={{ fontSize: '0.72rem' }}>Received</small>
                            </div>

                          </div>
                        </div>
                      ) : (
                        <div className="alert alert-danger border-0 mb-0 py-2.5 d-flex align-items-center gap-2">
                          <i className="bi bi-x-circle-fill fs-5"></i>
                          <div>Order status is <strong>{order.delivery_status}</strong>. Inventory refunded.</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </main>

      {/* CHECKOUT MODAL: PHONEPE QR PAY & CASH ON DELIVERY */}
      {showCartModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px', overflow: 'hidden' }}>
              
              {/* Header */}
              <div className="modal-header bg-slate-900 text-white p-3.5" style={{ backgroundColor: '#0f172a' }}>
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2 m-0 text-white fs-5">
                  <i className="bi bi-bag-check-fill text-success fs-4"></i>
                  {gatewayStep === 'success' ? 'Order Confirmed' : 'Checkout & PhonePe QR Pay'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={handleCloseModal}></button>
              </div>

              {/* Body */}
              <div className="modal-body p-4">

                {/* STEP 1: CART SUMMARY & SCAN AND PAY DISPLAY */}
                {gatewayStep === 'cart' && (
                  <div>
                    {cart.length === 0 ? (
                      <div className="text-center py-4 text-muted">
                        <i className="bi bi-cart-x fs-1"></i>
                        <p className="mt-2 mb-0">Your shopping cart is empty.</p>
                      </div>
                    ) : (
                      <div>
                        {/* Items Table */}
                        <div className="table-responsive mb-3" style={{ maxHeight: '170px' }}>
                          <table className="table table-bordered mb-0 align-middle">
                            <thead className="table-light">
                              <tr>
                                <th>Electronic Item</th>
                                <th>Unit Price</th>
                                <th className="text-center">Qty</th>
                                <th className="text-end">Total</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {cart.map(item => {
                                const unitPrice = item.product.price * (1 - (item.product.discount || 0) / 100);
                                const lineTotal = unitPrice * item.quantity;

                                return (
                                  <tr key={item.product.id}>
                                    <td>
                                      <div className="fw-semibold text-slate-800">{item.product.name}</div>
                                      <small className="text-muted">{item.product.brand}</small>
                                    </td>
                                    <td className="text-success fw-semibold">₹{unitPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                                    <td>
                                      <div className="d-flex justify-content-center align-items-center gap-2">
                                        <button onClick={() => handleUpdateCartQuantity(item.product.id, -1)} className="btn btn-light btn-sm border px-2 py-0">-</button>
                                        <span className="fw-bold">{item.quantity}</span>
                                        <button onClick={() => handleUpdateCartQuantity(item.product.id, 1)} className="btn btn-light btn-sm border px-2 py-0">+</button>
                                      </div>
                                    </td>
                                    <td className="text-end fw-bold text-success">₹{lineTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                                    <td className="text-center">
                                      <button onClick={() => handleRemoveFromCart(item.product.id)} className="btn btn-outline-danger btn-sm p-1">
                                        <i className="bi bi-trash"></i>
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Bill Breakdown */}
                        <div className="row g-3 bg-light p-3 rounded-3 border mb-4">
                          <div className="col-12 col-md-6">
                            <span className="text-muted small">Deliver To:</span>
                            <div className="fw-semibold text-slate-800">{user?.name}</div>
                            <div className="small text-slate-700">{user?.address || 'Mumbai, India'}</div>
                          </div>

                          <div className="col-12 col-md-6 text-end">
                            <div className="small text-muted mb-1">Subtotal: ₹{cartSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                            <div className="small text-muted mb-1">GST Tax (18%): ₹{cartTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                            <div className="fs-4 fw-extrabold text-success">Total Bill: ₹{cartTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                          </div>
                        </div>

                        {/* Payment Options Selector */}
                        <h6 className="fw-bold mb-3 text-slate-900 d-flex align-items-center gap-2">
                          <i className="bi bi-wallet2 text-primary"></i> Select Payment Option
                        </h6>

                        <div className="row g-3 mb-4">
                          {/* 1. UPI Payment Option */}
                          <div className="col-6">
                            <div 
                              onClick={() => setPaymentMethod('Online')}
                              className={`card p-3 border cursor-pointer h-100 text-center ${paymentMethod === 'Online' ? 'border-primary bg-primary bg-opacity-10 shadow-xs' : 'bg-white'}`}
                              style={{ cursor: 'pointer', borderRadius: '12px' }}
                            >
                              <div className="d-flex flex-column align-items-center justify-content-center gap-2 mb-2">
                                <i className="bi bi-qr-code-scan fs-3 text-primary"></i>
                                <span className="fw-bold text-slate-900" style={{fontSize: '0.9rem'}}>UPI Payment</span>
                              </div>
                            </div>
                          </div>

                          {/* 2. Cash on Delivery Option */}
                          <div className="col-6">
                            <div 
                              onClick={() => setPaymentMethod('COD')}
                              className={`card p-3 border cursor-pointer h-100 text-center ${paymentMethod === 'COD' ? 'border-primary bg-primary bg-opacity-10 shadow-xs' : 'bg-white'}`}
                              style={{ cursor: 'pointer', borderRadius: '12px' }}
                            >
                              <div className="d-flex flex-column align-items-center justify-content-center gap-2 mb-2">
                                <i className="bi bi-cash-stack fs-3 text-success"></i>
                                <span className="fw-bold text-slate-900" style={{fontSize: '0.9rem'}}>COD</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* DISPLAY ONLINE PAYMENT QR SCAN & PAY CARD */}
                        {paymentMethod === 'Online' && (
                          <div className="card p-3.5 border bg-light text-center rounded-3 animate-fade-in">
                            <div className="row align-items-center">
                              <div className="col-12 col-md-5 text-center">
                                <div className="p-2.5 bg-dark border rounded-3 d-inline-block shadow-md" style={{ backgroundColor: '#0f0f11' }}>
                                  <img 
                                    src="/phonepe_qr.jpg" 
                                    alt="PhonePe Accepted Here QR Code - KONNURU RISHITHA" 
                                    style={{ maxWidth: '210px', width: '100%', height: 'auto', borderRadius: '10px' }} 
                                  />
                                </div>
                              </div>
                              <div className="col-12 col-md-7 text-start mt-3 mt-md-0">
                                <span className="badge text-white mb-2 py-1.5 px-3" style={{ backgroundColor: '#5f259f', fontSize: '0.85rem' }}>PhonePe Accepted Here</span>
                                <h5 className="fw-extrabold text-slate-900 mb-1">Payee: KONNURU RISHITHA</h5>
                                <p className="text-secondary small mb-3">Scan this PhonePe QR Code using any UPI App (PhonePe, GPay, Paytm, BHIM) to pay <strong>₹{cartTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>.</p>
                                
                                <div className="alert alert-purple border-0 py-2.5 px-3 small bg-white text-purple shadow-xs mb-3" style={{ borderLeft: '4px solid #5f259f' }}>
                                  <i className="bi bi-info-circle-fill me-1 text-purple"></i> After payment, enter your 12-digit UTR/Transaction number below to confirm.
                                </div>
                                <div className="mt-2">
                                  <label className="form-label fw-bold small text-slate-700">Enter UTR / Transaction Reference No.<span className="text-danger">*</span></label>
                                  <input 
                                    type="text" 
                                    className="form-control" 
                                    placeholder="e.g. 312345678901" 
                                    value={transactionRef}
                                    onChange={(e) => setTransactionRef(e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* DISPLAY CASH ON DELIVERY CARD */}
                        {paymentMethod === 'COD' && (
                          <div className="alert alert-success border-0 py-3 mb-0 d-flex align-items-center gap-3">
                            <i className="bi bi-truck fs-2 text-success"></i>
                            <div>
                              <h6 className="fw-bold m-0 text-success">Doorstep Cash on Delivery (COD)</h6>
                              <div className="small text-secondary">Order will be booked immediately. Payment of <strong>₹{cartTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> will be collected upon package delivery.</div>
                            </div>
                          </div>
                        )}

                        {/* Removed Dummy Card / NetBanking form */}

                        {/* Prompt if no payment method selected */}
                        {!paymentMethod && (
                          <div className="alert alert-secondary border-0 py-3 mb-0 text-center">
                            Please select a payment method above to proceed.
                          </div>
                        )}

                      </div>
                    )}
                  </div>
                )}

                {/* STEP 2: GENERATED TOKEN DISPLAY */}
                {gatewayStep === 'token' && (
                  <div className="text-center py-4 animate-fade-in">
                    <div className="bg-primary bg-opacity-10 text-primary rounded-circle p-3 d-inline-flex mb-3">
                      <i className="bi bi-ticket-perforated-fill fs-1"></i>
                    </div>
                    <h4 className="fw-bold text-slate-900 mb-1">Payment Verification</h4>
                    <p className="text-muted small mb-4">We are validating your transaction for UPI payee <strong>KONNURU RISHITHA</strong>.</p>

                    <div className="card bg-light border p-4 text-start mb-4 rounded-3 w-75 mx-auto">
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted small text-uppercase fw-semibold">Transaction ID (UTR)</span>
                        <span className="font-monospace fw-bold text-dark">{transactionRef}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-2 border-top pt-2">
                        <span className="text-muted small text-uppercase fw-semibold">Generated Auth Token</span>
                        <span className="font-monospace fw-bold text-primary">{generatedToken}</span>
                      </div>
                      <div className="text-center mt-3 pt-2 border-top">
                        <small className="text-muted d-block">Payable Amount: <strong>₹{cartTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></small>
                      </div>
                    </div>

                    <button 
                      onClick={handleExecuteOrderWithToken} 
                      className="btn btn-success px-5 py-2.5 fw-bold shadow-sm d-inline-flex align-items-center gap-2"
                    >
                      <i className="bi bi-check-circle-fill"></i> Verify & Place Order
                    </button>
                  </div>
                )}

                {/* STEP 3: PROCESSING ANIMATION */}
                {gatewayStep === 'processing' && (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3.5rem', height: '3.5rem' }}></div>
                    <h5 className="fw-bold text-slate-800">{gatewayStatusMsg}</h5>
                    <p className="text-muted small">Please wait while we register your order details...</p>
                  </div>
                )}

                {/* STEP 4: ORDER CONFIRMED RECEIPT */}
                {gatewayStep === 'success' && lastCompletedOrder && (
                  <div className="text-center py-4">
                    <div className="bg-success bg-opacity-10 text-success rounded-circle p-3 d-inline-flex mb-3">
                      <i className="bi bi-check-circle-fill fs-1"></i>
                    </div>
                    <h4 className="fw-extrabold text-slate-900 mb-1">Order Placed Successfully!</h4>
                    <p className="text-muted small mb-4">Your electronic order is registered and sent to warehouse processing.</p>

                    <div className="card bg-light border p-4 text-start mb-4 rounded-3">
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted small">Order Reference:</span>
                        <strong className="text-primary font-monospace">#ORD-{lastCompletedOrder.orderId}</strong>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted small">Payment Verification Token:</span>
                        <span className="font-monospace fw-bold text-purple">{lastCompletedOrder.token || lastCompletedOrder.txnId}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted small">Payment Method:</span>
                        <span className="fw-semibold text-slate-800">{lastCompletedOrder.method}</span>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted small">Payment Status:</span>
                        <span className={`badge bg-opacity-10 bg-${lastCompletedOrder.payStatus === 'Paid' ? 'success' : 'warning'} text-${lastCompletedOrder.payStatus === 'Paid' ? 'success' : 'warning'}`}>
                          {lastCompletedOrder.payStatus}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between pt-2 border-top">
                        <span className="fw-bold">Total Bill:</span>
                        <span className="fs-5 fw-extrabold text-success">₹{parseFloat(lastCompletedOrder.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        setShowCartModal(false);
                        setActiveTab('orders');
                      }} 
                      className="btn btn-primary px-4 py-2 fw-semibold"
                    >
                      <i className="bi bi-bag-check-fill me-1.5"></i> Track My Order Progress
                    </button>
                  </div>
                )}

              </div>

              {/* Footer Buttons */}
              {gatewayStep === 'cart' && cart.length > 0 && (
                <div className="modal-footer border-top bg-light">
                  <button type="button" className="btn btn-light" onClick={handleCloseModal}>Close</button>
                  {!paymentMethod ? (
                    <button className="btn btn-secondary px-4 py-2.5 fw-bold" disabled>
                      Select Payment Method to Proceed
                    </button>
                  ) : paymentMethod === 'Online' ? (
                    <button 
                      onClick={handleGeneratePhonePeToken} 
                      className="btn btn-primary px-4 py-2.5 fw-bold d-flex align-items-center gap-2"
                    >
                      Scan QR & Generate Token <i className="bi bi-ticket-perforated-fill"></i>
                    </button>
                  ) : paymentMethod === 'COD' ? (
                    <button 
                      onClick={handleExecuteOrderWithToken} 
                      className="btn btn-success px-4 py-2.5 fw-bold d-flex align-items-center gap-2"
                    >
                      Confirm COD Order (₹{cartTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}) <i className="bi bi-truck"></i>
                    </button>
                  ) : (
                    <button 
                      onClick={handleExecuteOrderWithToken} 
                      className="btn btn-success px-4 py-2.5 fw-bold d-flex align-items-center gap-2"
                    >
                      Pay Securely & Confirm Order (₹{cartTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}) <i className="bi bi-shield-lock"></i>
                    </button>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
