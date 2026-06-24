import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../context/OrderContext';
import { useProducts } from '../context/ProductContext';
import OrderDetailsModal from '../components/OrderDetailsModal';
import UiIcon from '../components/UiIcon';
import InventoryManagement from './InventoryManagement';

function ManagerDashboard() {
  const navigate = useNavigate();
  const { user, logout, authFetch } = useAuth();

  useEffect(() => {
    if (user?.mustResetPassword) {
      navigate('/manager-activate', { replace: true });
    }
  }, [user, navigate]);
  const { orders, updateOrderStatus } = useOrders();
  const { products, adjustStock, loadAllProducts } = useProducts();

  useEffect(() => {
    loadAllProducts();
  }, [loadAllProducts]);

  const [activeTab, setActiveTab] = useState('orders');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [orderActionMessage, setOrderActionMessage] = useState('');
  const [orderActionError, setOrderActionError] = useState('');
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);
  const [inventorySearch, setInventorySearch] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState('');
  const [taskView, setTaskView] = useState('active');
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', dueDate: '' });

  const loadTasks = useCallback(async () => {
    if (!user?.id) return;

    setTasksLoading(true);
    setTasksError('');
    try {
      const response = await authFetch(`/tasks/?assigned_to=${user.id}`);
      const data = await response.json().catch(() => []);
      if (!response.ok) {
        throw new Error(data?.detail || 'Unable to load tasks.');
      }
      setTasks(Array.isArray(data) ? data : []);
    } catch (error) {
      setTasksError(error.message || 'Unable to load tasks.');
    } finally {
      setTasksLoading(false);
    }
  }, [authFetch, user?.id]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const recentOrders = [...orders].sort(
    (a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)
  );

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
    if (!window.confirm('Are you sure you want to logout?')) return;
    logout();
    navigate('/');
  };

  const selectedOrderForAction = recentOrders.find((order) => Number(order.id) === Number(selectedOrderId));

  const handleOrderStatusUpdate = async (status) => {
    if (!selectedOrderForAction || isUpdatingOrder) return;

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

  const handleCreateTask = async (event) => {
    event.preventDefault();
    const title = newTask.title.trim();
    if (!title || isCreatingTask) return;

    setIsCreatingTask(true);
    setTasksError('');
    try {
      const response = await authFetch('/tasks/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: newTask.description.trim() || null,
          priority: newTask.priority,
          due_date: newTask.dueDate ? new Date(`${newTask.dueDate}T12:00:00`).toISOString() : null,
          assigned_to: user?.id || null,
        }),
      });
      const createdTask = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(createdTask?.detail || 'Unable to create task.');
      }

      setTasks((previousTasks) => [createdTask, ...previousTasks]);
      setNewTask({ title: '', description: '', priority: 'medium', dueDate: '' });
      setShowTaskForm(false);
    } catch (error) {
      setTasksError(error.message || 'Unable to create task.');
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleTaskStatusUpdate = async (task, status) => {
    if (!task?.id || updatingTaskId) return;

    setUpdatingTaskId(task.id);
    setTasksError('');
    try {
      const response = await authFetch(`/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const updatedTask = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(updatedTask?.detail || 'Unable to update task status.');
      }
      setTasks((currentTasks) => currentTasks.map((currentTask) => (
        currentTask.id === updatedTask.id ? updatedTask : currentTask
      )));
    } catch (error) {
      setTasksError(error.message || 'Unable to update task status.');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const formatTaskLabel = (value = '') =>
    String(value)
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

  const formatTaskDueDate = (value) => {
    if (!value) return 'No due date';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'No due date' : date.toLocaleDateString();
  };

  const activeTasks = tasks.filter((task) => task.status !== 'completed');
  const completedTasks = tasks.filter((task) => task.status === 'completed');
  const visibleTasks = taskView === 'completed' ? completedTasks : activeTasks;

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
                <button
                  type="button"
                  onClick={() => handleOrderStatusUpdate('delivered')}
                  disabled={!selectedOrderForAction || isUpdatingOrder || ['Delivered', 'Cancelled'].includes(selectedOrderForAction.status)}
                  className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  <UiIcon name="check" className="h-4 w-4" />
                  {isUpdatingOrder ? 'Updating…' : 'Mark Complete'}
                </button>
                <button
                  type="button"
                  onClick={() => handleOrderStatusUpdate('shipped')}
                  disabled={!selectedOrderForAction || isUpdatingOrder || ['Shipped', 'Delivered', 'Cancelled'].includes(selectedOrderForAction.status)}
                  className="inline-flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-orange-700 transition disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  <UiIcon name="truck" className="h-4 w-4" />
                  Update Shipping
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
                  {recentOrders.map((order) => (
                    <tr key={order.id} className={`border-b border-gray-200 hover:bg-gray-50 ${Number(selectedOrderId) === Number(order.id) ? 'bg-blue-50' : ''}`}>
                      <td className="px-3 py-4">
                        <input
                          type="radio"
                          name="selected-order"
                          checked={Number(selectedOrderId) === Number(order.id)}
                          onChange={() => {
                            setSelectedOrderId(order.id);
                            setOrderActionMessage('');
                            setOrderActionError('');
                          }}
                          aria-label={`Select order ${order.id}`}
                          className="h-4 w-4 cursor-pointer accent-blue-600"
                        />
                      </td>
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
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="mb-6 flex items-center gap-2 text-2xl font-bold text-primary">
              <UiIcon name="warehouse" className="h-6 w-6" />
              Inventory Management
            </h3>
            <InventoryManagement />
          </div>
        )}

        {false && (
          <div className="space-y-6">
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
              <button
                type="button"
                onClick={() => {
                  setShowTaskForm((visible) => !visible);
                  setTasksError('');
                }}
                className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-800 transition"
              >
                + New Task
              </button>
            </div>
            {showTaskForm && (
              <form onSubmit={handleCreateTask} className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Task title
                    <input
                      required
                      value={newTask.title}
                      onChange={(event) => setNewTask((current) => ({ ...current, title: event.target.value }))}
                      className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-normal focus:border-primary focus:outline-none"
                      placeholder="e.g. Prepare shipping labels"
                    />
                  </label>
                  <label className="block text-sm font-semibold text-gray-700">
                    Priority
                    <select
                      value={newTask.priority}
                      onChange={(event) => setNewTask((current) => ({ ...current, priority: event.target.value }))}
                      className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-normal focus:border-primary focus:outline-none"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </label>
                  <label className="block text-sm font-semibold text-gray-700">
                    Due date
                    <input
                      type="date"
                      value={newTask.dueDate}
                      onChange={(event) => setNewTask((current) => ({ ...current, dueDate: event.target.value }))}
                      className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-normal focus:border-primary focus:outline-none"
                    />
                  </label>
                  <label className="block text-sm font-semibold text-gray-700">
                    Description <span className="font-normal text-gray-500">(optional)</span>
                    <input
                      value={newTask.description}
                      onChange={(event) => setNewTask((current) => ({ ...current, description: event.target.value }))}
                      className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-normal focus:border-primary focus:outline-none"
                      placeholder="Add a short note"
                    />
                  </label>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTaskForm(false)}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newTask.title.trim() || isCreatingTask}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:bg-gray-400"
                  >
                    {isCreatingTask ? 'Creating…' : 'Create Task'}
                  </button>
                </div>
              </form>
            )}
            {tasksError && <p className="mb-4 text-sm font-medium text-red-700" role="alert">{tasksError}</p>}
            <div className="mb-5 flex flex-wrap gap-2 border-b border-gray-200 pb-4">
              <button
                type="button"
                onClick={() => setTaskView('active')}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  taskView === 'active' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Active ({activeTasks.length})
              </button>
              <button
                type="button"
                onClick={() => setTaskView('completed')}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  taskView === 'completed' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Completed ({completedTasks.length})
              </button>
            </div>
            <div className="space-y-4">
              {tasksLoading ? (
                <p className="py-6 text-center text-sm text-gray-500">Loading tasks…</p>
              ) : visibleTasks.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">
                  {taskView === 'completed' ? 'No completed tasks yet.' : 'No active tasks assigned to you yet.'}
                </p>
              ) : visibleTasks.map((task) => (
                <div key={task.id} className="border-2 border-gray-200 p-4 rounded-lg hover:shadow-md transition flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="font-bold text-gray-800">{task.title}</h4>
                    {task.description && <p className="mt-1 text-sm text-gray-600">{task.description}</p>}
                    <div className="flex gap-4 mt-2">
                      <span className={`text-sm px-2 py-1 rounded ${
                        task.priority === 'high' ? 'bg-blue-100 text-blue-800' :
                        task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {formatTaskLabel(task.priority)}
                      </span>
                      <span className="text-sm text-gray-600">Due: {formatTaskDueDate(task.due_date)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      task.status === 'completed' ? 'bg-green-100 text-green-800' :
                      task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {formatTaskLabel(task.status)}
                    </span>
                    {task.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => handleTaskStatusUpdate(task, 'in_progress')}
                        disabled={updatingTaskId === task.id}
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                      >
                        {updatingTaskId === task.id ? 'Updatingâ€¦' : 'Start'}
                      </button>
                    )}
                    {task.status === 'in_progress' && (
                      <button
                        type="button"
                        onClick={() => handleTaskStatusUpdate(task, 'completed')}
                        disabled={updatingTaskId === task.id}
                        className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                      >
                        {updatingTaskId === task.id ? 'Updatingâ€¦' : 'Complete'}
                      </button>
                    )}
                    {task.status === 'completed' && (
                      <button
                        type="button"
                        onClick={() => handleTaskStatusUpdate(task, 'in_progress')}
                        disabled={updatingTaskId === task.id}
                        className="rounded-md border border-blue-300 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-gray-400"
                      >
                        {updatingTaskId === task.id ? 'Updatingâ€¦' : 'Reopen'}
                      </button>
                    )}
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
