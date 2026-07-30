import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const fallbackImg = 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=600&auto=format&fit=crop&q=80';

export default function Dashboard({ notifications, setNotifications }) {
  const [stats, setStats] = useState(null);
  const [salesReport, setSalesReport] = useState([]);
  const [inventoryReport, setInventoryReport] = useState(null);
  const [latestOrders, setLatestOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const statsRes = await axios.get('/api/reports/stats');
      setStats(statsRes.data);

      const salesRes = await axios.get('/api/reports/sales');
      setSalesReport(salesRes.data);

      const inventoryRes = await axios.get('/api/reports/inventory');
      setInventoryReport(inventoryRes.data);

      const ordersRes = await axios.get('/api/orders?limit=5');
      setLatestOrders(ordersRes.data.slice(0, 5));

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Could not load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading Dashboard...</span>
        </div>
      </div>
    );
  }

  const months = salesReport.map(s => s.month);
  const revenues = salesReport.map(s => parseFloat(s.revenue));

  const salesChartData = {
    labels: months.length > 0 ? months : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        fill: true,
        label: 'Monthly Revenue (₹)',
        data: revenues.length > 0 ? revenues : [0, 0, 0, 0, 0, 0],
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        tension: 0.35,
        pointBackgroundColor: '#4f46e5',
      }
    ]
  };

  const salesChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { grid: { color: '#f1f5f9' } },
      x: { grid: { display: false } }
    }
  };

  const catNames = inventoryReport?.categoryStock?.map(c => c.category_name) || [];
  const catStocks = inventoryReport?.categoryStock?.map(c => parseInt(c.total_stock)) || [];

  const doughnutData = {
    labels: catNames.length > 0 ? catNames : ['Electronics'],
    datasets: [
      {
        data: catStocks.length > 0 ? catStocks : [1],
        backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#06b6d4', '#ec4899'],
      }
    ]
  };

  const bestProdNames = inventoryReport?.bestSellers?.map(b => b.product_name.substring(0, 14) + '...') || [];
  const bestProdQtys = inventoryReport?.bestSellers?.map(b => parseInt(b.total_qty_sold)) || [];

  const barChartData = {
    labels: bestProdNames.length > 0 ? bestProdNames : ['Product'],
    datasets: [
      {
        label: 'Units Sold',
        data: bestProdQtys.length > 0 ? bestProdQtys : [0],
        backgroundColor: '#10b981',
        borderRadius: 6,
      }
    ]
  };

  return (
    <div className="animate-fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-extrabold m-0 text-slate-900" style={{ letterSpacing: '-0.02em' }}>Electronics Admin Dashboard</h3>
          <p className="text-secondary mb-0">System metrics, real-time sales revenue, and inventory controls in INR (₹).</p>
        </div>
        <button onClick={fetchDashboardData} className="btn btn-light border px-3 py-2 d-flex align-items-center gap-1.5 fw-semibold">
          <i className="bi bi-arrow-clockwise"></i> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card card-premium p-3 kpi-card">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small fw-semibold text-uppercase">Total Sales</span>
                <h4 className="fw-bold mt-1 mb-0">₹{stats?.kpis?.totalSales?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h4>
              </div>
              <div className="bg-primary bg-opacity-10 text-primary rounded-3 p-2.5">
                <i className="bi bi-currency-rupee fs-4"></i>
              </div>
            </div>
            <div className="mt-2 small text-muted">Accumulated paid order revenue</div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card card-premium p-3 kpi-card kpi-success">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small fw-semibold text-uppercase">Total Orders</span>
                <h4 className="fw-bold mt-1 mb-0">{stats?.kpis?.totalOrders}</h4>
              </div>
              <div className="bg-success bg-opacity-10 text-success rounded-3 p-2.5">
                <i className="bi bi-receipt-cutoff fs-4"></i>
              </div>
            </div>
            <div className="mt-2 small text-muted">{stats?.deliveryBreakdown?.Pending || 0} pending processing</div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card card-premium p-3 kpi-card kpi-info">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small fw-semibold text-uppercase">Total Products</span>
                <h4 className="fw-bold mt-1 mb-0">{stats?.kpis?.totalProducts}</h4>
              </div>
              <div className="bg-info bg-opacity-10 text-info rounded-3 p-2.5">
                <i className="bi bi-laptop fs-4"></i>
              </div>
            </div>
            <div className="mt-2 small text-muted">{stats?.kpis?.totalCategories} active categories</div>
          </div>
        </div>

        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card card-premium p-3 kpi-card kpi-danger">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <span className="text-muted small fw-semibold text-uppercase">Low Stock Alert</span>
                <h4 className="fw-bold mt-1 mb-0">{stats?.kpis?.lowStockProducts}</h4>
              </div>
              <div className="bg-danger bg-opacity-10 text-danger rounded-3 p-2.5">
                <i className="bi bi-exclamation-triangle-fill fs-4"></i>
              </div>
            </div>
            <div className="mt-2 small text-muted">Items running below threshold</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="row g-4 mb-4">
        <div className="col-12 col-lg-8">
          <div className="card card-premium p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold m-0">Monthly Revenue Graph (₹)</h5>
              <span className="badge bg-light text-primary border px-2 py-1">Paid Status Orders</span>
            </div>
            <div style={{ height: '280px' }}>
              <Line data={salesChartData} options={salesChartOptions} />
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-4">
          <div className="card card-premium p-4 h-100">
            <h5 className="fw-bold mb-3">Electronics Stock Share</h5>
            <div className="d-flex align-items-center justify-content-center" style={{ height: '220px' }}>
              <Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card card-premium p-4">
        <h5 className="fw-bold mb-3">Recent Customer Orders</h5>
        <div className="table-responsive">
          <table className="table table-hover table-premium mb-0">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Total Amount</th>
                <th>Payment</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {latestOrders.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-4 text-muted">No orders processed yet.</td>
                </tr>
              ) : (
                latestOrders.map(order => (
                  <tr key={order.id}>
                    <td className="fw-bold text-primary">#ORD-{order.id}</td>
                    <td>{order.customer_name}</td>
                    <td className="fw-semibold">₹{parseFloat(order.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
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
                        order.delivery_status === 'Delivered' ? 'success' : 'info'
                      } text-${
                        order.delivery_status === 'Delivered' ? 'success' : 'info'
                      }`}>
                        {order.delivery_status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
