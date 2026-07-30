import React, { useState, useEffect } from 'react';
import axios from 'axios';

const fallbackImg = 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=600&auto=format&fit=crop&q=80';

export default function Products({ notifications, setNotifications }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);

  // Form State
  const [editMode, setEditMode] = useState(false);
  const [currentProductId, setCurrentProductId] = useState(null);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('');
  const [price, setPrice] = useState('');
  const [discount, setDiscount] = useState('0');
  const [stock, setStock] = useState('0');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imageUrlText, setImageUrlText] = useState('');
  
  const [showModal, setShowModal] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const categoryParam = selectedCategory ? `&categoryId=${selectedCategory}` : '';
      const brandParam = selectedBrand ? `&brand=${selectedBrand}` : '';
      const lowStockParam = lowStockFilter ? `&lowStock=true` : '';
      
      const res = await axios.get(
        `/api/products?search=${search}${categoryParam}${brandParam}${lowStockParam}`
      );
      setProducts(res.data);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Could not fetch products.');
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

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchProducts();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search, selectedCategory, selectedBrand, lowStockFilter]);

  const handleImport = async () => {
    if (window.confirm('Import electronic products from FakeStoreAPI?')) {
      try {
        setImporting(true);
        const token = localStorage.getItem('techmart_token');
        const res = await axios.post('/api/products/import', {}, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const importAlert = {
          id: Date.now(),
          type: 'success',
          message: res.data.message,
          time: new Date().toLocaleTimeString()
        };
        setNotifications(prev => [importAlert, ...prev]);

        alert(res.data.message);
        fetchProducts();
      } catch (err) {
        console.error('Import error:', err);
        alert('Product import failed: ' + (err.response?.data?.message || err.message));
      } finally {
        setImporting(false);
      }
    }
  };

  const handleOpenAddModal = () => {
    setEditMode(false);
    setCurrentProductId(null);
    setName('');
    setCategoryId('');
    setBrand('');
    setPrice('');
    setDiscount('0');
    setStock('0');
    setDescription('');
    setImageFile(null);
    setImageUrlText('');
    setShowModal(true);
  };

  const handleOpenEditModal = (p) => {
    setEditMode(true);
    setCurrentProductId(p.id);
    setName(p.name);
    setCategoryId(p.category_id || '');
    setBrand(p.brand || '');
    setPrice(p.price);
    setDiscount(p.discount || '0');
    setStock(p.stock || '0');
    setDescription(p.description || '');
    setImageFile(null);
    setImageUrlText(p.image_url || '');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !price) {
      alert('Product name and price are required');
      return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('category_id', categoryId);
    formData.append('brand', brand);
    formData.append('price', price);
    formData.append('discount', discount);
    formData.append('stock', stock);
    formData.append('description', description);
    
    if (imageFile) {
      formData.append('image', imageFile);
    } else {
      formData.append('image_url', imageUrlText || fallbackImg);
    }

    try {
      const token = localStorage.getItem('techmart_token');
      if (editMode) {
        await axios.put(`/api/products/${currentProductId}`, formData, {
          headers: { 
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        });
      } else {
        await axios.post('/api/products', formData, {
          headers: { 
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`
          }
        });
      }

      setShowModal(false);
      fetchProducts();
    } catch (err) {
      console.error('Error saving product:', err);
      alert('Failed to save product.');
    }
  };

  const handleDelete = async (id, prodName) => {
    if (window.confirm(`Are you sure you want to delete product: "${prodName}"?`)) {
      try {
        const token = localStorage.getItem('techmart_token');
        await axios.delete(`/api/products/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchProducts();
      } catch (err) {
        console.error('Error deleting product:', err);
        alert('Failed to delete product.');
      }
    }
  };

  const uniqueBrands = [...new Set(products.map(p => p.brand).filter(Boolean))];

  return (
    <div className="animate-fade-in">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <h3 className="fw-extrabold m-0 text-slate-900" style={{ letterSpacing: '-0.02em' }}>Electronics Product Catalog</h3>
          <p className="text-secondary mb-0">Manage gadgets, devices, prices in Indian Rupees (₹), and stock levels.</p>
        </div>
        
        <div className="d-flex gap-2 w-100 w-md-auto">
          <button 
            onClick={handleImport} 
            className="btn btn-outline-primary d-flex align-items-center gap-2 fw-semibold"
            disabled={importing}
          >
            {importing ? <span className="spinner-border spinner-border-sm" role="status"></span> : <><i className="bi bi-cloud-arrow-down-fill"></i> Import Electronics</>}
          </button>
          
          <button onClick={handleOpenAddModal} className="btn btn-primary d-flex align-items-center gap-2 fw-semibold">
            <i className="bi bi-plus-lg"></i> Add Product
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card card-premium p-3 mb-4">
        <div className="row g-3">
          <div className="col-12 col-md-4">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0 text-muted"><i className="bi bi-search"></i></span>
              <input
                type="text"
                className="form-control form-control-premium border-start-0"
                placeholder="Search products or brands..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="col-12 col-sm-6 col-md-3">
            <select
              className="form-select form-select-premium"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="col-12 col-sm-6 col-md-3">
            <select
              className="form-select form-select-premium"
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
            >
              <option value="">All Brands</option>
              {uniqueBrands.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-2 d-flex align-items-center">
            <div className="form-check form-switch m-0">
              <input
                className="form-check-input"
                type="checkbox"
                role="switch"
                id="lowStockCheck"
                checked={lowStockFilter}
                onChange={(e) => setLowStockFilter(e.target.checked)}
              />
              <label className="form-check-label small fw-semibold text-muted" htmlFor="lowStockCheck">Low Stock</label>
            </div>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="card card-premium p-4">
        <div className="table-responsive">
          <table className="table table-hover table-premium mb-0">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Image</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Brand</th>
                <th>Price (₹)</th>
                <th>Discount</th>
                <th>Stock</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-5">
                    <div className="spinner-border text-primary" role="status"></div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-4 text-muted">No electronics found.</td>
                </tr>
              ) : (
                products.map((p, index) => (
                  <tr key={p.id}>
                    <td><strong>{index + 1}</strong></td>
                    <td>
                      <img 
                        src={p.image_url?.startsWith('/uploads') ? `${p.image_url}` : p.image_url || fallbackImg} 
                        alt={p.name}
                        onError={(e) => { e.target.src = fallbackImg; }}
                        className="rounded"
                        style={{ width: '40px', height: '40px', objectFit: 'contain', background: '#f8fafc' }}
                      />
                    </td>
                    <td>
                      <div className="fw-semibold text-slate-800" style={{ maxWidth: '280px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={p.name}>
                        {p.name}
                      </div>
                    </td>
                    <td><span className="badge bg-light text-secondary border">{p.category_name || 'Electronics'}</span></td>
                    <td>{p.brand || '—'}</td>
                    <td><strong>₹{parseFloat(p.price).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong></td>
                    <td>
                      {parseFloat(p.discount) > 0 ? (
                        <span className="badge bg-danger bg-opacity-10 text-danger">-{parseFloat(p.discount)}%</span>
                      ) : (
                        <span className="text-muted small">0%</span>
                      )}
                    </td>
                    <td>
                      <span className={`fw-bold text-${p.stock === 0 ? 'danger' : p.stock <= (p.low_stock_threshold || 5) ? 'warning' : 'success'}`}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="text-end">
                      <div className="d-flex justify-content-end gap-1.5">
                        <button onClick={() => handleOpenEditModal(p)} className="btn btn-outline-secondary btn-sm" title="Edit">
                          <i className="bi bi-pencil-fill"></i>
                        </button>
                        <button onClick={() => handleDelete(p.id, p.name)} className="btn btn-outline-danger btn-sm" title="Delete">
                          <i className="bi bi-trash-fill"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(3px)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow" style={{ borderRadius: '14px' }}>
              <div className="modal-header border-bottom-0 pb-0">
                <h5 className="modal-title fw-bold">{editMode ? 'Edit Electronic Product' : 'Add New Product'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="modal-body py-3">
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">Product Name *</label>
                      <input
                        type="text"
                        className="form-control form-control-premium"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">Brand</label>
                      <input
                        type="text"
                        className="form-control form-control-premium"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                      />
                    </div>
                    
                    <div className="col-12 col-sm-6 col-md-4">
                      <label className="form-label small fw-semibold">Category</label>
                      <select
                        className="form-select form-select-premium"
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                      >
                        <option value="">Select Category</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12 col-sm-6 col-md-4">
                      <label className="form-label small fw-semibold">Price (₹) *</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control form-control-premium"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-12 col-sm-6 col-md-2">
                      <label className="form-label small fw-semibold">Discount (%)</label>
                      <input
                        type="number"
                        className="form-control form-control-premium"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                      />
                    </div>
                    <div className="col-12 col-sm-6 col-md-2">
                      <label className="form-label small fw-semibold">Stock Qty</label>
                      <input
                        type="number"
                        className="form-control form-control-premium"
                        value={stock}
                        onChange={(e) => setStock(e.target.value)}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold">Description</label>
                      <textarea
                        rows="3"
                        className="form-control form-control-premium"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      ></textarea>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">Upload Image</label>
                      <input
                        type="file"
                        className="form-control form-control-premium"
                        onChange={(e) => {
                          setImageFile(e.target.files[0]);
                          setImageUrlText('');
                        }}
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label small fw-semibold">Image URL Link</label>
                      <input
                        type="text"
                        className="form-control form-control-premium"
                        placeholder="https://images.unsplash.com/..."
                        value={imageUrlText}
                        onChange={(e) => {
                          setImageUrlText(e.target.value);
                          setImageFile(null);
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top-0 pt-0">
                  <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary px-4 fw-semibold">Save Product</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
