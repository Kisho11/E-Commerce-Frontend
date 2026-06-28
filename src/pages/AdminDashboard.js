import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../context/OrderContext';
import { useProducts } from '../context/ProductContext';
import ProductManagement from './ProductManagement';
import CategoryManagement from './CategoryManagement';
import IndustryManagement from './IndustryManagement';
import InventoryManagement from './InventoryManagement';
import ManagerManagement from './ManagerManagement';
import OrderDetailsModal from '../components/OrderDetailsModal';
import UiIcon from '../components/UiIcon';

const ORDER_STATUS_OPTIONS = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];
const ADMIN_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

const formatDisplayDate = (value) => {
  if (!value || value === 'N/A') return 'N/A';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
};

function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout, registeredCustomers, loadCustomers, authFetch } = useAuth();
  const { orders, loadOrders, updateOrderStatus } = useOrders();
  const { products, loadAllProducts } = useProducts();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedOrderStatus, setSelectedOrderStatus] = useState('');
  const [orderActionMessage, setOrderActionMessage] = useState('');
  const [orderActionError, setOrderActionError] = useState('');
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerMinOrders, setCustomerMinOrders] = useState(0);
  const [customerSortBy, setCustomerSortBy] = useState('name');
  const [customerSortDir, setCustomerSortDir] = useState('asc');
  const [dashboardStats, setDashboardStats] = useState(null);
  const [salesReportPeriod, setSalesReportPeriod] = useState('month');
  const [salesReport, setSalesReport] = useState(null);
  const [topCategoriesReport, setTopCategoriesReport] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState('');

  const sortedOrders = [...orders].sort(
    (a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)
  );
  const recentOrders = sortedOrders.slice(0, 5);
  const totalRevenue = orders.reduce((sum, order) => sum + (Number(order.amount) || 0), 0);
  const pendingOrders = orders.filter((order) => order.status === 'Pending').length;
  const selectedOrderForAction = sortedOrders.find((order) => Number(order.id) === Number(selectedOrderId));
  const selectedOrderForActionId = selectedOrderForAction?.id;
  const selectedOrderForActionStatus = selectedOrderForAction?.status || '';

  const customerLookup = useMemo(
    () => new Map(registeredCustomers.map((customer) => [Number(customer.id), customer])),
    [registeredCustomers]
  );

  const customerOrderStats = useMemo(() => {
    const grouped = new Map();

    orders.forEach((order) => {
      const customerIdKey = Number(order.customerId || order.userId || 0);
      const emailKey = (order.customerEmail || '').trim().toLowerCase();
      const nameKey = (order.customer || [order.customerFirstName, order.customerLastName].filter(Boolean).join(' ') || '').trim().toLowerCase();
      const addressObj = order.shippingAddress || {};
      const address = [addressObj.address, addressObj.city, addressObj.state, addressObj.zipCode].filter(Boolean).join(', ') || 'N/A';

      const targetKey = customerIdKey || emailKey || nameKey;
      if (!targetKey) return;

      if (!grouped.has(targetKey)) {
        grouped.set(targetKey, {
          email: order.customerEmail || 'N/A',
          phone: order.customerPhone || 'N/A',
          address,
          orders: [],
        });
      }

      const row = grouped.get(targetKey);
      if (row.email === 'N/A' && order.customerEmail) row.email = order.customerEmail;
      if (row.phone === 'N/A' && order.customerPhone) row.phone = order.customerPhone;
      if (row.address === 'N/A' && address !== 'N/A') row.address = address;
      row.orders.push(order);
    });

    return grouped;
  }, [orders]);

  const customerRows = useMemo(() => {
    return registeredCustomers.map((customer) => {
      const orderData = customerOrderStats.get(Number(customer.id)) || {
        email: customer.email,
        phone: customer.phone || 'N/A',
        address: customer.address || 'N/A',
        orders: [],
      };
      const computedTotalSpent = orderData.orders.reduce((sum, order) => sum + (Number(order.amount) || 0), 0);
      const totalSpent = customer.totalSpent || computedTotalSpent;
      const sortedCustomerOrders = [...orderData.orders].sort(
        (a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)
      );
      const firstOrder = sortedCustomerOrders[sortedCustomerOrders.length - 1];
      const lastOrder = sortedCustomerOrders[0];
      const orderCount = customer.orderCount || orderData.orders.length;
      const joinDate = customer.createdAt || firstOrder?.date || 'N/A';
      const lastOrderDate = customer.lastOrderDate || lastOrder?.date || 'N/A';

      return {
        key: `customer-${customer.id}`,
        id: customer.id,
        name: customer.name || 'Unknown Customer',
        email: customer.email || orderData.email || 'N/A',
        phone: customer.phone || orderData.phone || 'N/A',
        address: customer.address || orderData.address || 'N/A',
        isActive: customer.isActive,
        totalSpent,
        orderCount,
        joinDate,
        joinDateDisplay: formatDisplayDate(joinDate),
        lastOrderDate,
        lastOrderDateDisplay: formatDisplayDate(lastOrderDate),
        orderHistory: sortedCustomerOrders,
      };
    });
  }, [customerOrderStats, registeredCustomers]);
  const filteredSortedCustomers = useMemo(() => {
    const query = customerSearch.trim().toLowerCase();
    const filtered = customerRows.filter((customer) => {
      const matchesSearch =
        !query ||
        customer.name.toLowerCase().includes(query) ||
        customer.email.toLowerCase().includes(query) ||
        customer.address.toLowerCase().includes(query);
      const matchesOrders = customer.orderCount >= Number(customerMinOrders || 0);
      return matchesSearch && matchesOrders;
    });

    const sorted = [...filtered].sort((a, b) => {
      let result = 0;
      if (customerSortBy === 'orders') result = a.orderCount - b.orderCount;
      else if (customerSortBy === 'spent') result = a.totalSpent - b.totalSpent;
      else if (customerSortBy === 'joinDate') result = new Date(a.joinDate) - new Date(b.joinDate);
      else if (customerSortBy === 'email') result = a.email.localeCompare(b.email);
      else if (customerSortBy === 'address') result = a.address.localeCompare(b.address);
      else result = a.name.localeCompare(b.name);
      return customerSortDir === 'asc' ? result : -result;
    });

    return sorted;
  }, [customerRows, customerSearch, customerMinOrders, customerSortBy, customerSortDir]);

  const handleCustomerSort = (column) => {
    if (customerSortBy === column) {
      setCustomerSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setCustomerSortBy(column);
    setCustomerSortDir('asc');
  };

  const renderSortIcon = (column) => {
    const isActive = customerSortBy === column;
    const isAsc = customerSortDir === 'asc';
    const iconClass = `h-4 w-4 ${isActive ? 'text-primary' : 'text-gray-400'}`;

    return (
      <span className="inline-flex items-center justify-center">
        {!isActive && (
          <svg viewBox="0 0 24 24" className={`${iconClass} opacity-70`} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M4 6h10M4 11h7M4 16h4" strokeLinecap="round" />
            <path d="M18 5v14" strokeLinecap="round" />
            <path d="m15 8 3-3 3 3M15 16l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {isActive && isAsc && (
          <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M4 6h10M4 11h7M4 16h4" strokeLinecap="round" />
            <path d="M18 18V6" strokeLinecap="round" />
            <path d="m15 9 3-3 3 3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {isActive && !isAsc && (
          <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M4 6h10M4 11h7M4 16h4" strokeLinecap="round" />
            <path d="M18 6v12" strokeLinecap="round" />
            <path d="m15 15 3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    );
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      loadAllProducts();
      loadCustomers().catch(() => {});
      loadOrders().catch(() => {});
    }
  }, [loadAllProducts, loadCustomers, loadOrders, user]);

  useEffect(() => {
    let cancelled = false;

    const loadDashboardStats = async () => {
      if (user?.role !== 'admin') {
        setDashboardStats(null);
        return;
      }

      try {
        const response = await authFetch('/admin/dashboard');
        const data = await response.json().catch(() => null);
        if (!cancelled) {
          setDashboardStats(data || null);
        }
      } catch (error) {
        if (!cancelled) {
          setDashboardStats(null);
        }
      }
    };

    loadDashboardStats();

    return () => {
      cancelled = true;
    };
  }, [authFetch, user]);

  useEffect(() => {
    if (user?.role !== 'admin' || activeTab !== 'reports') return undefined;

    let cancelled = false;
    const loadReports = async () => {
      setReportsLoading(true);
      setReportsError('');

      try {
        const [salesResponse, categoriesResponse] = await Promise.all([
          authFetch(`/admin/reports/sales?period=${encodeURIComponent(salesReportPeriod)}`),
          authFetch('/admin/reports/top-categories?limit=5'),
        ]);
        const salesData = await salesResponse.json().catch(() => null);
        const categoriesData = await categoriesResponse.json().catch(() => []);

        if (!salesResponse.ok) {
          throw new Error(salesData?.detail || 'Unable to load sales report.');
        }
        if (!categoriesResponse.ok) {
          throw new Error(categoriesData?.detail || 'Unable to load category report.');
        }

        if (!cancelled) {
          setSalesReport(salesData || null);
          setTopCategoriesReport(Array.isArray(categoriesData) ? categoriesData : []);
        }
      } catch (error) {
        if (!cancelled) {
          setSalesReport(null);
          setTopCategoriesReport([]);
          setReportsError(error.message || 'Unable to load reports.');
        }
      } finally {
        if (!cancelled) {
          setReportsLoading(false);
        }
      }
    };

    loadReports();

    return () => {
      cancelled = true;
    };
  }, [activeTab, authFetch, salesReportPeriod, user]);

  useEffect(() => {
    if (!selectedOrderForActionId) {
      setSelectedOrderStatus('');
      return;
    }

    setSelectedOrderStatus(selectedOrderForActionStatus || 'Pending');
  }, [selectedOrderForActionId, selectedOrderForActionStatus]);

  useEffect(() => {
    if (user?.role !== 'admin') return undefined;

    let idleTimer = null;
    const activityEvents = ['click', 'keydown', 'mousemove', 'mousedown', 'scroll', 'touchstart'];

    const logoutForIdle = () => {
      logout();
      navigate('/login?mode=admin&reason=idle-timeout', { replace: true });
      window.alert('You have been logged out after 30 minutes of inactivity.');
    };

    const resetIdleTimer = () => {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(logoutForIdle, ADMIN_IDLE_TIMEOUT_MS);
    };

    resetIdleTimer();
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, resetIdleTimer, { passive: true });
    });

    return () => {
      window.clearTimeout(idleTimer);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, resetIdleTimer);
      });
    };
  }, [logout, navigate, user?.role]);

  const stats = {
    availableProducts: dashboardStats?.available_products ?? products.filter(
      (product) => Math.max((product.inventory?.onHand ?? 0) - (product.inventory?.reserved ?? 0), 0) > 0
    ).length,
    totalOrders: dashboardStats?.total_orders ?? orders.length,
    totalRevenue: dashboardStats?.total_revenue ?? totalRevenue,
    totalCustomers: dashboardStats?.total_customers ?? registeredCustomers.length,
    pendingOrders: dashboardStats?.pending_orders ?? pendingOrders,
    lowStockProducts: dashboardStats?.low_stock_count ?? 0,
  };
  const maxCategoryUnits = Math.max(...topCategoriesReport.map((category) => Number(category.units_sold || 0)), 1);

  const handleLogout = () => {
    if (!window.confirm('Are you sure you want to logout?')) return;
    logout();
    navigate('/');
  };

  const handleOrderStatusUpdate = async (status) => {
    if (!selectedOrderForAction || isUpdatingOrder) return;
    if (String(selectedOrderForAction.status).toLowerCase() === String(status).toLowerCase()) {
      setOrderActionMessage(`Order #${selectedOrderForAction.id} is already ${selectedOrderForAction.status}.`);
      setOrderActionError('');
      return;
    }

    setOrderActionMessage('');
    setOrderActionError('');
    setIsUpdatingOrder(true);
    try {
      const updatedOrder = await updateOrderStatus(selectedOrderForAction.id, status);
      setSelectedOrder((currentOrder) =>
        Number(currentOrder?.id) === Number(updatedOrder.id) ? updatedOrder : currentOrder
      );
      setOrderActionMessage(`Order #${updatedOrder.id} marked as ${updatedOrder.status}.`);
    } catch (error) {
      setOrderActionError(error.message || 'Unable to update order status.');
    } finally {
      setIsUpdatingOrder(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="bg-red-600 text-white p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/elms.png" alt="Elamshelf logo" className="h-10 w-auto object-contain" />
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-sm text-blue-100">Logged in as</p>
              <p className="font-bold">{user?.name}</p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="bg-white/15 hover:bg-white/25 text-white px-6 py-2 rounded-lg font-semibold transition"
            >
              Shop Home
            </button>
            <button
              onClick={handleLogout}
              className="bg-blue-500 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold transition"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 sm:px-8">
        {/* Tabs */}
        <div className="flex gap-4 mb-8 overflow-x-auto border-b border-gray-300 pb-4">
          {['overview', 'products', 'inventory', 'categories', 'industries', 'managers', 'orders', 'customers', 'reports'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-lg font-semibold transition whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-primary text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl shadow-md">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-600 text-sm">Available Products</p>
                    <p className="text-4xl font-bold text-primary mt-2">{stats.availableProducts}</p>
                  </div>
                  <UiIcon name="box" className="h-10 w-10 text-primary" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl shadow-md">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-600 text-sm">Total Revenue</p>
                    <p className="text-4xl font-bold text-green-700 mt-2">£{stats.totalRevenue.toLocaleString()}</p>
                  </div>
                  <UiIcon name="currency" className="h-10 w-10 text-green-700" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl shadow-md">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-600 text-sm">Total Orders</p>
                    <p className="text-4xl font-bold text-purple-700 mt-2">{stats.totalOrders}</p>
                  </div>
                  <UiIcon name="list" className="h-10 w-10 text-purple-700" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl shadow-md">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-600 text-sm">Total Customers</p>
                    <p className="text-4xl font-bold text-orange-700 mt-2">{stats.totalCustomers}</p>
                  </div>
                  <UiIcon name="users" className="h-10 w-10 text-orange-700" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl shadow-md">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-600 text-sm">Pending Orders</p>
                    <p className="text-4xl font-bold text-blue-700 mt-2">{stats.pendingOrders}</p>
                  </div>
                  <UiIcon name="clock" className="h-10 w-10 text-blue-700" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-xl shadow-md">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-gray-600 text-sm">Low Stock Items</p>
                    <p className="text-4xl font-bold text-yellow-700 mt-2">{stats.lowStockProducts}</p>
                  </div>
                  <UiIcon name="alert" className="h-10 w-10 text-yellow-700" />
                </div>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="mb-6 flex items-center gap-2 text-2xl font-bold text-primary">
                <UiIcon name="list" className="h-6 w-6" />
                Recent Orders
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Order ID</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Customer</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Amount</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Status</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4 font-bold text-primary">#{order.id}</td>
                        <td className="px-6 py-4">{customerLookup.get(Number(order.customerId || order.userId || 0))?.name || order.customer || 'Unknown Customer'}</td>
                        <td className="px-6 py-4 font-semibold">${order.amount.toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            order.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                            order.status === 'Shipped' ? 'bg-blue-100 text-blue-800' :
                            order.status === 'Processing' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{order.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <ProductManagement />
        )}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="mb-6 flex items-center gap-2 text-2xl font-bold text-primary">
              <UiIcon name="warehouse" className="h-6 w-6" />
              Inventory Management
            </h3>
            <InventoryManagement />
          </div>
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <CategoryManagement />
        )}

        {/* Industries Tab */}
        {activeTab === 'industries' && (
          <IndustryManagement />
        )}

        {/* Managers Tab */}
        {activeTab === 'managers' && (
          <ManagerManagement />
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <h3 className="flex items-center gap-2 text-2xl font-bold text-primary">
                <UiIcon name="list" className="h-6 w-6" />
                All Orders
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedOrderStatus}
                  onChange={(event) => setSelectedOrderStatus(event.target.value)}
                  disabled={!selectedOrderForAction || isUpdatingOrder}
                  className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                  aria-label="Choose order status"
                >
                  <option value="" disabled>Choose status</option>
                  {ORDER_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleOrderStatusUpdate(selectedOrderStatus)}
                  disabled={
                    !selectedOrderForAction ||
                    !selectedOrderStatus ||
                    isUpdatingOrder ||
                    selectedOrderStatus === selectedOrderForAction.status
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  <UiIcon name="save" className="h-4 w-4" />
                  Apply Status
                </button>
              </div>
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <p className="text-gray-600">
                {selectedOrderForAction ? `Selected order: #${selectedOrderForAction.id}` : 'Select an order to update its status.'}
              </p>
              {orderActionMessage && <p className="font-medium text-green-700" role="status">{orderActionMessage}</p>}
              {orderActionError && <p className="font-medium text-red-700" role="alert">{orderActionError}</p>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="w-12 px-3 py-3 text-left">
                      <span className="sr-only">Select order</span>
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Order ID</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Customer</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Amount</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Date</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedOrders.map((order) => (
                    <tr key={order.id} className={`border-b border-gray-200 hover:bg-gray-50 ${Number(selectedOrderId) === Number(order.id) ? 'bg-red-50' : ''}`}>
                      <td className="px-3 py-4">
                        <input
                          type="radio"
                          name="admin-selected-order"
                          checked={Number(selectedOrderId) === Number(order.id)}
                          onChange={() => {
                            setSelectedOrderId(order.id);
                            setSelectedOrderStatus(order.status || 'Pending');
                            setOrderActionMessage('');
                            setOrderActionError('');
                          }}
                          aria-label={`Select order ${order.id}`}
                          className="h-4 w-4 cursor-pointer accent-primary"
                        />
                      </td>
                      <td className="px-6 py-4 font-bold text-primary">#{order.id}</td>
                      <td className="px-6 py-4">{customerLookup.get(Number(order.customerId || order.userId || 0))?.name || order.customer || 'Unknown Customer'}</td>
                      <td className="px-6 py-4 font-semibold">${order.amount.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          order.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                          order.status === 'Shipped' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'Processing' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{order.date}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="text-blue-600 hover:text-blue-800 font-semibold"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="mb-6 flex items-center gap-2 text-2xl font-bold text-primary">
              <UiIcon name="users" className="h-6 w-6" />
              Customers
            </h3>
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Filter by name, email, address"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
              <input
                type="number"
                min="0"
                value={customerMinOrders}
                onChange={(e) => setCustomerMinOrders(e.target.value)}
                placeholder="Min orders"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">
                      <button type="button" onClick={() => handleCustomerSort('name')} className="inline-flex items-center gap-1 hover:text-primary">
                        Customer
                        {renderSortIcon('name')}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">
                      <button type="button" onClick={() => handleCustomerSort('email')} className="inline-flex items-center gap-1 hover:text-primary">
                        Email
                        {renderSortIcon('email')}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">
                      <button type="button" onClick={() => handleCustomerSort('address')} className="inline-flex items-center gap-1 hover:text-primary">
                        Address
                        {renderSortIcon('address')}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">
                      <button type="button" onClick={() => handleCustomerSort('orders')} className="inline-flex items-center gap-1 hover:text-primary">
                        Orders
                        {renderSortIcon('orders')}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">
                      <button type="button" onClick={() => handleCustomerSort('spent')} className="inline-flex items-center gap-1 hover:text-primary">
                        Total Spent
                        {renderSortIcon('spent')}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">
                      <button type="button" onClick={() => handleCustomerSort('joinDate')} className="inline-flex items-center gap-1 hover:text-primary">
                        Join Date
                        {renderSortIcon('joinDate')}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSortedCustomers.map((customer) => (
                    <tr key={customer.key} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4 font-bold text-gray-800">
                        <div className="flex items-center gap-2">
                          <span>{customer.name}</span>
                          {!customer.isActive ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Inactive
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{customer.email}</td>
                      <td className="px-6 py-4 text-gray-600">{customer.address}</td>
                      <td className="px-6 py-4 font-semibold text-gray-700">{customer.orderCount}</td>
                      <td className="px-6 py-4 font-semibold text-gray-700">£{customer.totalSpent.toFixed(2)}</td>
                      <td className="px-6 py-4 text-gray-600">{customer.joinDateDisplay}</td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => setSelectedCustomer(customer)}
                          className="text-blue-600 hover:text-blue-800 font-semibold"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredSortedCustomers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        No customers match the current filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="flex items-center gap-2 text-2xl font-bold text-primary">
                <UiIcon name="chart" className="h-6 w-6" />
                Reports & Analytics
              </h3>
              <select
                value={salesReportPeriod}
                onChange={(event) => setSalesReportPeriod(event.target.value)}
                className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-gray-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-red-100"
                aria-label="Sales report period"
              >
                <option value="week">Last 7 days</option>
                <option value="month">Last 30 days</option>
                <option value="year">Last 365 days</option>
              </select>
            </div>

            {reportsError ? (
              <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {reportsError}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="border-2 border-gray-200 rounded-lg p-6">
                <h4 className="font-bold text-lg text-gray-800 mb-4">
                  Sales {salesReportPeriod === 'week' ? 'This Week' : salesReportPeriod === 'year' ? 'This Year' : 'This Month'}
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Sales</span>
                    <span className="font-bold text-primary">
                      {reportsLoading ? 'Loading...' : `£${Number(salesReport?.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Orders</span>
                    <span className="font-bold text-primary">
                      {reportsLoading ? 'Loading...' : Number(salesReport?.total_orders || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Order Value</span>
                    <span className="font-bold text-accent">
                      {reportsLoading ? 'Loading...' : `£${Number(salesReport?.avg_order_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </span>
                  </div>
                  {salesReport?.start_date ? (
                    <p className="pt-2 text-xs text-gray-500">
                      From {formatDisplayDate(salesReport.start_date)}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="border-2 border-gray-200 rounded-lg p-6">
                <h4 className="font-bold text-lg text-gray-800 mb-4">Top Categories</h4>
                <div className="space-y-3">
                  {reportsLoading ? (
                    <p className="text-sm text-gray-500">Loading categories...</p>
                  ) : topCategoriesReport.length > 0 ? (
                    topCategoriesReport.map((category) => {
                      const unitsSold = Number(category.units_sold || 0);
                      const width = Math.max(8, Math.round((unitsSold / maxCategoryUnits) * 100));

                      return (
                        <div key={category.category} className="space-y-1">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-gray-600">{category.category}</span>
                            <span className="text-xs font-semibold text-gray-500">
                              {unitsSold} units | £{Number(category.revenue || 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-gray-200">
                            <div className="h-2 rounded-full bg-accent" style={{ width: `${width}%` }} />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-gray-500">No category sales found for this report.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} accentClass="text-primary" />
        {selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4" onClick={() => setSelectedCustomer(null)}>
            <div
              className="flex h-[82svh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 px-4 py-3 sm:px-5">
                <div>
                  <h3 className="text-xl font-bold text-primary">{selectedCustomer.name}</h3>
                  <p className="text-sm text-gray-600">Registered customer details and order history</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="rounded border border-gray-300 px-3 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>

              <div className="overflow-y-scroll px-4 py-4 sm:px-5">
                <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <p className="text-sm text-gray-700"><span className="font-bold">Email:</span> {selectedCustomer.email}</p>
                  <p className="text-sm text-gray-700"><span className="font-bold">Phone:</span> {selectedCustomer.phone}</p>
                  <p className="text-sm text-gray-700 sm:col-span-2"><span className="font-bold">Address:</span> {selectedCustomer.address}</p>
                  <p className="text-sm text-gray-700"><span className="font-bold">Status:</span> {selectedCustomer.isActive ? 'Active' : 'Inactive'}</p>
                  <p className="text-sm text-gray-700"><span className="font-bold">Orders:</span> {selectedCustomer.orderCount}</p>
                  <p className="text-sm text-gray-700"><span className="font-bold">Total Spent:</span> £{selectedCustomer.totalSpent.toFixed(2)}</p>
                  <p className="text-sm text-gray-700"><span className="font-bold">Join Date:</span> {selectedCustomer.joinDateDisplay}</p>
                  <p className="text-sm text-gray-700"><span className="font-bold">Last Order:</span> {selectedCustomer.lastOrderDateDisplay}</p>
                </div>

                <h4 className="mb-3 text-lg font-bold text-gray-800">Order History</h4>
                <div className="overflow-auto rounded-lg border border-gray-200">
                  {selectedCustomer.orderHistory.length > 0 ? (
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Order ID</th>
                          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Date</th>
                          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Status</th>
                          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedCustomer.orderHistory.map((order) => (
                          <tr key={order.id} className="border-t border-gray-100">
                            <td className="px-4 py-2 text-sm font-semibold text-primary">#{order.id}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">{order.date}</td>
                            <td className="px-4 py-2 text-sm text-gray-700">{order.status}</td>
                            <td className="px-4 py-2 text-sm font-semibold text-gray-800">${Number(order.amount || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="px-4 py-6 text-sm text-gray-500">This customer has not placed any orders yet.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
