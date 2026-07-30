import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function Reports() {
  const [salesReport, setSalesReport] = useState([]);
  const [inventoryReport, setInventoryReport] = useState(null);
  const [orderReport, setOrderReport] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const salesRes = await axios.get('/api/reports/sales');
      setSalesReport(salesRes.data);

      const inventoryRes = await axios.get('/api/reports/inventory');
      setInventoryReport(inventoryRes.data);

      const orderRes = await axios.get('/api/reports/orders');
      setOrderReport(orderRes.data);

      const statsRes = await axios.get('/api/reports/stats');
      setStats(statsRes.data);

    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  const months = salesReport.map(s => s.month);
  const revenues = salesReport.map(s => parseFloat(s.revenue));
  
  const salesChartData = {
    labels: months.length > 0 ? months : ['No Data'],
    datasets: [
      {
        label: 'Monthly Revenue (₹)',
        data: revenues.length > 0 ? revenues : [0],
        backgroundColor: '#4f46e5',
        borderRadius: 6
      }
    ]
  };

  const catNames = inventoryReport?.categoryStock?.map(c => c.category_name) || [];
  const catStocks = inventoryReport?.categoryStock?.map(c => parseInt(c.total_stock)) || [];

  const categoryChartData = {
    labels: catNames.length > 0 ? catNames : ['Electronics'],
    datasets: [
      {
        data: catStocks.length > 0 ? catStocks : [1],
        backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#06b6d4', '#ec4899']
      }
    ]
  };

  const bestNames = inventoryReport?.bestSellers?.map(b => b.product_name.substring(0, 14) + '...') || [];
  const bestRevenues = inventoryReport?.bestSellers?.map(b => parseFloat(b.total_revenue)) || [];

  const bestSellersChartData = {
    labels: bestNames.length > 0 ? bestNames : ['Electronics'],
    datasets: [
      {
        label: 'Revenue Generated (₹)',
        data: bestRevenues.length > 0 ? bestRevenues : [0],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.3,
        fill: true,
      }
    ]
  };

  const exportExcel = () => {
    if (salesReport.length === 0) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Month,Revenue (INR),Total Orders Processed\r\n";
    
    salesReport.forEach(row => {
      csvContent += `${row.month},${parseFloat(row.revenue).toFixed(2)},${row.orders_count}\r\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `TechMart_MonthlySales_INR_${new Date().getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="animate-fade-in print-invoice-area">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4 no-print">
        <div>
          <h3 className="fw-extrabold m-0 text-slate-900" style={{ letterSpacing: '-0.02em' }}>Electronics Analytics & Invoices</h3>
          <p className="text-secondary mb-0">Audited financial sales history and high-velocity item performance in Indian Rupees (₹).</p>
        </div>
        
        <div className="d-flex gap-2">
          <button onClick={exportExcel} className="btn btn-outline-success d-flex align-items-center gap-2 fw-semibold">
            <i className="bi bi-file-earmark-excel-fill"></i> Export CSV (₹)
          </button>
          <button onClick={handlePrintPDF} className="btn btn-primary d-flex align-items-center gap-2 fw-semibold">
            <i className="bi bi-file-earmark-pdf-fill"></i> Print PDF Report
          </button>
        </div>
      </div>

      <div className="d-none d-print-block mb-5 pb-3 border-bottom">
        <div className="text-center">
          <h2 className="fw-bold text-indigo-800 mb-1">TechMart India Electronics Summary</h2>
          <p className="text-muted small">Generated on {new Date().toLocaleDateString()} | All figures in INR (₹)</p>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-12 col-md-4">
          <div className="card card-premium p-4 h-100">
            <h5 className="fw-bold mb-3 border-bottom pb-2">Business KPIs (₹)</h5>
            <div className="d-flex flex-column gap-3">
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted fw-medium">Accumulated Revenue:</span>
                <span className="fw-extrabold fs-5 text-primary">₹{stats?.kpis?.totalSales?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted fw-medium">Avg Order Value:</span>
                <span className="fw-bold">
                  ₹{stats?.kpis?.totalOrders > 0 
                    ? (stats.kpis.totalSales / stats.kpis.totalOrders).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
                    : '0.00'}
                </span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted fw-medium">Catalog SKU Count:</span>
                <span className="fw-bold">{stats?.kpis?.totalProducts}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted fw-medium">Categories:</span>
                <span className="fw-bold">{stats?.kpis?.totalCategories}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card card-premium p-4 h-100">
            <h5 className="fw-bold mb-3 border-bottom pb-2">Order Stage Breakdown</h5>
            <div className="d-flex flex-column gap-2">
              {orderReport?.delivery?.map((item, idx) => (
                <div key={idx} className="d-flex justify-content-between align-items-center small">
                  <span className="fw-semibold text-slate-700">{item.delivery_status}:</span>
                  <span className="badge bg-light text-slate-800 border font-monospace px-2.5 py-1">
                    {item.count} orders (₹{parseFloat(item.total_value).toLocaleString('en-IN')})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="card card-premium p-4 h-100">
            <h5 className="fw-bold mb-3 border-bottom pb-2">Out of Stock Warnings</h5>
            <div className="table-responsive" style={{ maxHeight: '180px' }}>
              <table className="table table-sm table-premium mb-0">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Brand</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryReport?.outOfStock?.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="text-success text-center py-4 small fw-semibold">
                        <i className="bi bi-shield-check"></i> Healthy Electronics Inventory
                      </td>
                    </tr>
                  ) : (
                    inventoryReport?.outOfStock?.map(p => (
                      <tr key={p.id}>
                        <td className="text-truncate" style={{ maxWidth: '120px' }}>{p.name}</td>
                        <td>{p.brand}</td>
                        <td><span className="badge bg-danger">Out of Stock</span></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-12 col-md-6">
          <div className="card card-premium p-4" style={{ minHeight: '340px' }}>
            <h5 className="fw-bold mb-3">Monthly Sales Income (₹)</h5>
            <div style={{ height: '240px' }}>
              <Bar data={salesChartData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </div>
        </div>

        <div className="col-12 col-md-6">
          <div className="card card-premium p-4" style={{ minHeight: '340px' }}>
            <h5 className="fw-bold mb-3">Category Stock Distribution</h5>
            <div className="d-flex align-items-center justify-content-center" style={{ height: '240px' }}>
              <Pie data={categoryChartData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className="card card-premium p-4" style={{ minHeight: '340px' }}>
            <h5 className="fw-bold mb-3">Best Seller Product Revenues (₹)</h5>
            <div style={{ height: '240px' }}>
              <Line data={bestSellersChartData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
