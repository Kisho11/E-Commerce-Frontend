import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../context/OrderContext';
import { useProducts } from '../context/ProductContext';
import OrderDetailsModal from '../components/OrderDetailsModal';
import UiIcon from '../components/UiIcon';

function ManagerDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    if (user?.mustResetPassword) {
      navigate('/manager-activate', { replace: true });
    }
  }, [user, navigate]);
  const { orders } = useOrders();
  const { products, adjustStock, getInventorySummary } = useProducts();

  const [activeTab, setActiveTab] = useState('orders');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [inventorySearch, setInventorySearch] = useState('');
  const [stockFilter, setStockFilter] = useState('all');

  const recentOrders = [...orders].sort(
    (a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)
  );

  const inventorySummary = getInventorySummary();

  const filteredInventory = useMemo(() => {
    return products
      .filter((product) => {
        const term = inventorySearch.trim().toLowerCase();
        if (!term) return true;
        return (
          product.name.toLowerCase().includes(term) ||
          (product.inventory?.sku || '').toLowerCase().includes(term) ||
          product.categories.join(' ').toLowerCase().includes(term)
        );
      })
      .filter((product) => {
        if (stockFilter === 'all') return true;
        const onHand = Number(product.inventory?.onHand || 0);
        const reserved = Number(product.inventory?.reserved || 0);
        const available = Math.max(onHand - reserved, 0);
        const reorderLevel = Number(product.inventory?.reorderLevel || 0);
        if (stockFilter === 'out') return available <= 0;
        if (stockFilter === 'low') return available > 0 && available <= reorderLevel;
        return available > reorderLevel;
      });
  }, [products, inventorySearch, stockFilter]);

  const recentMovements = useMemo(() => {
    return products
      .flatMap((product) =>
        (product.inventory?.movements || []).map((movement) => ({
          ...movement,
          productId: product.id,
          productName: product.name,
          sku: product.inventory?.sku || '-',
        }))
      )
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 12);
  }, [products]);

  const pendingOrders = orders.filter((order) => order.status === 'Pending').length;
  const lowStockProducts = products.filter((product) => {
    const onHand = Number(product.inventory?.onHand || 0);
    const reserved = Number(product.inventory?.reserved || 0);
    const reorderLevel = Number(product.inventory?.reorderLevel || 0);
    return Math.max(onHand - reserved, 0) <= reorderLevel;
  }).length;

  const stats = {
    totalOrders: orders.length,
    pendingOrders,
    lowStockProducts,
    pendingReviews: 12,
  };

  const handleLogout = () => {
    logout();
    navigate('/login?mode=staff-signin');
  };

  const getStockState = (product) => {
    const onHand = Number(product.inventory?.onHand || 0);
    const reserved = Number(product.inventory?.reserved || 0);
    const available = Math.max(onHand - reserved, 0);
    const reorderLevel = Number(product.inventory?.reorderLevel || 0);

    if (available <= 0) return { label: 'Out of Stock', classes: 'bg-red-100 text-red-700' };
    if (available <= reorderLevel) return { label: 'Low Stock', classes: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Healthy', classes: 'bg-green-100 text-green-700' };
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="flex items-center gap-2 text-3xl font-bold text-yellow-300">
            <UiIcon name="userCog" className="h-8 w-8" />
            Manager Dashboard
          </h1>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-sm text-blue-100">Logged in as</p>
              <p className="font-bold">{user?.name}</p>
            </div>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl shadow-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm">Total Orders</p>
                <p className="text-4xl font-bold text-blue-700 mt-2">{stats.totalOrders}</p>
              </div>
              <UiIcon name="list" className="h-10 w-10 text-blue-700" />
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

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl shadow-md">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-600 text-sm">Pending Reviews</p>
                <p className="text-4xl font-bold text-purple-700 mt-2">{stats.pendingReviews}</p>
              </div>
              <UiIcon name="star" className="h-10 w-10 text-purple-700" />
            </div>
          </div>
        </div>

        <div className="flex gap-4 mb-8 overflow-x-auto border-b border-gray-300 pb-4">
          {['orders', 'inventory', 'tasks'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-lg font-semibold transition whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'orders' && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="flex items-center gap-2 text-2xl font-bold text-blue-700">
                <UiIcon name="list" className="h-6 w-6" />
                Order Management
              </h3>
              <div className="flex gap-2">
                <button className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition">
                  <UiIcon name="check" className="h-4 w-4" />
                  Mark Complete
                </button>
                <button className="inline-flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-orange-700 transition">
                  <UiIcon name="truck" className="h-4 w-4" />
                  Update Shipping
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Order ID</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Customer</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Amount</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Date</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4 font-bold text-blue-700">#{order.id}</td>
                      <td className="px-6 py-4">{order.customer}</td>
                      <td className="px-6 py-4 font-semibold">£{order.amount.toFixed(2)}</td>
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
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-white p-5 shadow-md">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">On Hand</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{inventorySummary.totalOnHand}</p>
              </div>
              <div className="rounded-xl bg-white p-5 shadow-md">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Reserved</p>
                <p className="mt-2 text-3xl font-bold text-orange-700">{inventorySummary.totalReserved}</p>
              </div>
              <div className="rounded-xl bg-white p-5 shadow-md">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Available</p>
                <p className="mt-2 text-3xl font-bold text-green-700">{inventorySummary.totalAvailable}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <h3 className="flex items-center gap-2 text-2xl font-bold text-blue-700">
                  <UiIcon name="box" className="h-6 w-6" />
                  Advanced Inventory Tracking
                </h3>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                    placeholder="Search product / SKU / category"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                  <select
                    value={stockFilter}
                    onChange={(e) => setStockFilter(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  >
                    <option value="all">All Stock Levels</option>
                    <option value="low">Low Stock</option>
                    <option value="out">Out of Stock</option>
                    <option value="healthy">Healthy</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px]">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Product</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">SKU</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">On Hand</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Reserved</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Available</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Reorder</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Coverage</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Location</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Adjust</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map((product) => {
                      const onHand = Number(product.inventory?.onHand || 0);
                      const reserved = Number(product.inventory?.reserved || 0);
                      const available = Math.max(onHand - reserved, 0);
                      const reorderLevel = Number(product.inventory?.reorderLevel || 0);
                      const usage = Math.max(Number(product.inventory?.averageDailyUsage || 1), 0.1);
                      const coverageDays = Math.floor(available / usage);
                      const stockState = getStockState(product);

                      return (
                        <tr key={product.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900">{product.name}</p>
                            <p className="text-xs text-gray-500">{product.categories.join(' • ')}</p>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-700">{product.inventory?.sku || '-'}</td>
                          <td className="px-4 py-3 text-sm font-bold text-gray-900">{onHand}</td>
                          <td className="px-4 py-3 text-sm text-orange-700">{reserved}</td>
                          <td className="px-4 py-3 text-sm font-bold text-green-700">{available}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{reorderLevel}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {coverageDays} days
                            <p className="text-xs text-gray-500">Usage: {usage.toFixed(1)}/day</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{product.inventory?.location || '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-1 text-xs font-bold ${stockState.classes}`}>
                              {stockState.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() =>
                                  adjustStock(product.id, {
                                    change: -1,
                                    reason: 'Manual issue',
                                    actor: user?.name || 'Manager',
                                  })
                                }
                                className="rounded-md border border-gray-300 px-2 py-1 text-xs font-bold text-gray-700 hover:bg-gray-100"
                              >
                                -1
                              </button>
                              <button
                                onClick={() =>
                                  adjustStock(product.id, {
                                    change: 1,
                                    reason: 'Manual receipt',
                                    actor: user?.name || 'Manager',
                                  })
                                }
                                className="rounded-md bg-green-600 px-2 py-1 text-xs font-bold text-white hover:bg-green-700"
                              >
                                +1
                              </button>
                              <button
                                onClick={() =>
                                  adjustStock(product.id, {
                                    change: 10,
                                    reason: 'Bulk restock',
                                    actor: user?.name || 'Manager',
                                  })
                                }
                                className="rounded-md bg-primary px-2 py-1 text-xs font-bold text-white hover:bg-red-800"
                              >
                                +10
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h4 className="mb-4 text-xl font-bold text-blue-700">Recent Stock Movements</h4>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px]">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Time</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Product</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">SKU</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Qty Change</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Before -> After</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Reason</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentMovements.map((movement) => (
                      <tr key={movement.id} className="border-b border-gray-200">
                        <td className="px-4 py-3 text-sm text-gray-600">{new Date(movement.at).toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-800">{movement.productName}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{movement.sku}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{movement.type}</td>
                        <td className={`px-4 py-3 text-sm font-bold ${movement.quantity >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {movement.quantity >= 0 ? '+' : ''}
                          {movement.quantity}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {movement.previousOnHand} -> {movement.newOnHand}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{movement.reason || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{movement.actor || '-'}</td>
                      </tr>
                    ))}
                    {recentMovements.length === 0 && (
                      <tr>
                        <td colSpan="8" className="px-4 py-6 text-center text-sm text-gray-500">
                          No stock movement records yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="flex items-center gap-2 text-2xl font-bold text-blue-700">
                <UiIcon name="tasks" className="h-6 w-6" />
                My Tasks
              </h3>
              <button className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-800 transition">
                + New Task
              </button>
            </div>
            <div className="space-y-4">
              {[
                { title: 'Process pending orders', priority: 'High', due: '2026-02-22', status: 'In Progress' },
                { title: 'Update inventory levels', priority: 'Medium', due: '2026-02-23', status: 'Not Started' },
                { title: 'Handle customer complaints', priority: 'High', due: '2026-02-22', status: 'In Progress' },
                { title: 'Review low stock items', priority: 'Medium', due: '2026-02-24', status: 'Not Started' },
                { title: 'Prepare shipping labels', priority: 'Low', due: '2026-02-25', status: 'Completed' },
              ].map((task, idx) => (
                <div key={idx} className="border-2 border-gray-200 p-4 rounded-lg hover:shadow-md transition flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-gray-800">{task.title}</h4>
                    <div className="flex gap-4 mt-2">
                      <span className={`text-sm px-2 py-1 rounded ${
                        task.priority === 'High' ? 'bg-blue-100 text-blue-800' :
                        task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {task.priority}
                      </span>
                      <span className="text-sm text-gray-600">Due: {task.due}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      task.status === 'Completed' ? 'bg-green-100 text-green-800' :
                      task.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {task.status}
                    </span>
                    <button className="text-blue-600 hover:text-blue-800" aria-label="Task actions">
                      <UiIcon name="ellipsis" className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} accentClass="text-blue-700" />
      </div>
    </div>
  );
}

export default ManagerDashboard;
