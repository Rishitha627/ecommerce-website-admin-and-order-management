import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Inventory({ notifications, setNotifications }) {
  const [inventoryList, setInventoryList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // 'low_stock' | 'out_of_stock' | 'ok'

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const catParam = selectedCategory ? `&categoryId=${selectedCategory}` : '';
      const statusParam = statusFilter ? `&status=${statusFilter}` : '';
      
      const res = await axios.get(
        `/api/inventory?search=${search}${catParam}${statusParam}`
      );
      setInventoryList(res.data);
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get('/api/categories');
      setCategories(res.data);
    } catch (err) {
      console.error('Error categories:', err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchInventory();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [search, selectedCategory, statusFilter]);

  // Adjust stock via adjustment (+/-) or absolute threshold changes
  const handleUpdateStock = async (invId, data) => {
    try {
      const res = await axios.put(`/api/inventory/${invId}`, data);
      
      // Update local state
      setInventoryList(prev => prev.map(item => item.id === invId ? res.data.inventory : item));

      // Push custom warning notifications if low stock levels triggered
      const updatedInv = res.data.inventory;
      if (updatedInv.stock_level <= updatedInv.low_stock_threshold) {
        const warnAlert = {
          id: Date.now(),
          type: updatedInv.stock_level === 0 ? 'danger' : 'warning',
          message: `Product "${updatedInv.product_name}" is running low or out of stock! Stock level: ${updatedInv.stock_level}`,
          time: new Date().toLocaleTimeString()
        };
        setNotifications(prev => [warnAlert, ...prev]);
      }
    } catch (err) {
      console.error('Error updating inventory stock:', err);
      alert(err.response?.data?.message || 'Error updating stock');
    }
  };

  // Export to Excel (CSV format)
  const exportCSV = () => {
    if (inventoryList.length === 0) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Inventory ID,Product ID,Product Name,Brand,Category,Stock Level,Low Stock Threshold,Last Updated\r\n";
    
    inventoryList.forEach(row => {
      const productNameEscaped = `"${row.product_name.replace(/"/g, '""')}"`;
      const brand = row.product_brand || '—';
      const category = row.category_name || '—';
      const date = new Date(row.last_updated).toLocaleString();
      
      csvContent += `${row.id},${row.product_id},${productNameEscaped},${brand},${category},${row.stock_level},${row.low_stock_threshold},${date}\r\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `TechMart_Inventory_Report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="animate-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold m-0 text-slate-800">Inventory Management</h2>
          <p className="text-secondary mb-0">Monitor live stock levels, adjust warehouses, and set custom warning thresholds.</p>
        </div>
        
        <button 
          onClick={exportCSV} 
          className="btn btn-outline-success d-flex align-items-center gap-2 fw-semibold"
          disabled={inventoryList.length === 0}
        >
          <i className="bi bi-file-earmark-excel-fill"></i> Export CSV
        </button>
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
                placeholder="Search stock product name or brand..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="col-12 col-sm-6 col-md-4">
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
          <div className="col-12 col-sm-6 col-md-4">
            <select
              className="form-select form-select-premium"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Stock Statuses</option>
              <option value="ok">Healthy Stock Only</option>
              <option value="low_stock">Low Stock Alerts Only</option>
              <option value="out_of_stock">Out of Stock Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card card-premium p-4">
        <div className="table-responsive">
          <table className="table table-hover table-premium mb-0">
            <thead>
              <tr>
                <th>ID</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Stock Level</th>
                <th>Low Threshold</th>
                <th>Status</th>
                <th>Quick Adjust</th>
                <th>Threshold Adjust</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : inventoryList.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-4 text-muted">No inventory records matches filter settings.</td>
                </tr>
              ) : (
                inventoryList.map(item => {
                  const isOutOfStock = item.stock_level === 0;
                  const isLowStock = item.stock_level <= item.low_stock_threshold && item.stock_level > 0;
                  
                  return (
                    <tr key={item.id} className={isOutOfStock ? 'table-danger bg-opacity-10' : isLowStock ? 'table-warning bg-opacity-10' : ''}>
                      <td><strong>#{item.id}</strong></td>
                      <td>
                        <div className="fw-semibold text-slate-800">{item.product_name}</div>
                        <small className="text-muted">{item.product_brand || '—'}</small>
                      </td>
                      <td><span className="badge bg-light text-secondary border">{item.category_name || 'N/A'}</span></td>
                      
                      {/* Current Stock */}
                      <td>
                        <span className="fs-6 fw-bold text-slate-800">{item.stock_level}</span>
                      </td>

                      {/* Threshold limit */}
                      <td>
                        <span className="text-muted font-monospace">{item.low_stock_threshold} items</span>
                      </td>

                      {/* Status */}
                      <td>
                        {isOutOfStock ? (
                          <span className="badge bg-danger badge-custom">OUT OF STOCK</span>
                        ) : isLowStock ? (
                          <span className="badge bg-warning text-dark badge-custom">LOW STOCK</span>
                        ) : (
                          <span className="badge bg-success badge-custom">HEALTHY</span>
                        )}
                      </td>

                      {/* Quick Adjust */}
                      <td>
                        <div className="d-inline-flex gap-1">
                          <button 
                            onClick={() => handleUpdateStock(item.id, { adjustment: -1 })} 
                            className="btn btn-outline-danger btn-sm px-2 py-0.5"
                            disabled={item.stock_level === 0}
                          >
                            -1
                          </button>
                          <button 
                            onClick={() => handleUpdateStock(item.id, { adjustment: 5 })} 
                            className="btn btn-outline-success btn-sm px-2 py-0.5"
                          >
                            +5
                          </button>
                          <button 
                            onClick={() => handleUpdateStock(item.id, { adjustment: 10 })} 
                            className="btn btn-outline-success btn-sm px-2 py-0.5"
                          >
                            +10
                          </button>
                        </div>
                      </td>

                      {/* Threshold adjust */}
                      <td>
                        <div className="input-group input-group-sm" style={{ maxWidth: '100px' }}>
                          <input 
                            type="number" 
                            className="form-control"
                            defaultValue={item.low_stock_threshold}
                            onBlur={(e) => {
                              const val = parseInt(e.target.value);
                              if (val !== item.low_stock_threshold && val >= 0) {
                                handleUpdateStock(item.id, { low_stock_threshold: val });
                              }
                            }}
                            min="0"
                          />
                          <span className="input-group-text"><i className="bi bi-gear-fill"></i></span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
