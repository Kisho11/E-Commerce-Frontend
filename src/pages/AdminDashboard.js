import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import TipTapEditor from '../components/TipTapEditor';
import UiIcon from '../components/UiIcon';

const ORDER_STATUS_OPTIONS = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];
const ADMIN_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const ADMIN_EMAIL_CAMPAIGNS_ENABLED = false;
const CAMPAIGN_IMAGE_MAX_COUNT = 5;
const CAMPAIGN_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
const API_BASE_URL = process.env.REACT_APP_API_URL;
const API_ORIGIN = API_BASE_URL ? new URL(API_BASE_URL).origin : '';
const emptyCustomerEditForm = {
  fullName: '',
  email: '',
  phone: '',
  isActive: true,
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'US',
};

const resolveDashboardMediaUrl = (value) => {
  if (!value) return '';
  if (/^(data:|blob:|https?:)/i.test(value)) return value;
  if (!API_ORIGIN) return value;
  if (value.startsWith('/')) return `${API_ORIGIN}${value}`;
  return `${API_ORIGIN}/${value}`;
};

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

const formatSubscriberBusinessType = (value) => (
  value === 'shopfitter' ? 'Shopfitter' : 'Shop owner'
);

const formatSubscriberStatus = (subscriber) => (
  subscriber?.is_active ? 'Active' : 'Unsubscribed'
);

const escapeSpreadsheetCell = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const sanitizeSpreadsheetValue = (value) => {
  const text = String(value ?? '');
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
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
  const [orderSortBy, setOrderSortBy] = useState('date');
  const [orderSortDir, setOrderSortDir] = useState('desc');
  const [orderActionMessage, setOrderActionMessage] = useState('');
  const [orderActionError, setOrderActionError] = useState('');
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerEditForm, setCustomerEditForm] = useState(emptyCustomerEditForm);
  const [customerActionMessage, setCustomerActionMessage] = useState('');
  const [customerActionError, setCustomerActionError] = useState('');
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [deletingCustomerId, setDeletingCustomerId] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerMinOrders, setCustomerMinOrders] = useState(0);
  const [customerSortBy, setCustomerSortBy] = useState('name');
  const [customerSortDir, setCustomerSortDir] = useState('asc');
  const [dashboardStats, setDashboardStats] = useState(null);
  const [salesReportPeriod, setSalesReportPeriod] = useState('month');
  const [salesReport, setSalesReport] = useState(null);
  const [topCategoriesReport, setTopCategoriesReport] = useState([]);
  const [mostViewedProductsReport, setMostViewedProductsReport] = useState([]);
  const [bestSellingProductsReport, setBestSellingProductsReport] = useState([]);
  const [visitorReport, setVisitorReport] = useState(null);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState('');
  const [marketingBanner, setMarketingBanner] = useState(null);
  const [marketingBannerFile, setMarketingBannerFile] = useState(null);
  const [marketingBannerEnabled, setMarketingBannerEnabled] = useState(false);
  const [marketingBannerCtaUrl, setMarketingBannerCtaUrl] = useState('/catalogue');
  const [globalDiscountPercentage, setGlobalDiscountPercentage] = useState('0');
  const [marketingLoading, setMarketingLoading] = useState(false);
  const [marketingSaving, setMarketingSaving] = useState(false);
  const [marketingDiscountSaving, setMarketingDiscountSaving] = useState(false);
  const [marketingMessage, setMarketingMessage] = useState('');
  const [marketingError, setMarketingError] = useState('');
  const [newsletterSubscribers, setNewsletterSubscribers] = useState([]);
  const [subscriberLoading, setSubscriberLoading] = useState(false);
  const [subscriberError, setSubscriberError] = useState('');
  const [subscriberBusinessTypeFilter, setSubscriberBusinessTypeFilter] = useState('all');
  const [marketingCampaigns, setMarketingCampaigns] = useState([]);
  const [campaignSubject, setCampaignSubject] = useState('');
  const [campaignMessageHtml, setCampaignMessageHtml] = useState('');
  const [campaignSending, setCampaignSending] = useState(false);

  const customerLookup = useMemo(
    () => new Map(registeredCustomers.map((customer) => [Number(customer.id), customer])),
    [registeredCustomers]
  );

  const getOrderCustomerName = useCallback((order) => (
    customerLookup.get(Number(order.customerId || order.userId || 0))?.name ||
    order.customer ||
    'Unknown Customer'
  ), [customerLookup]);

  const sortedOrders = useMemo(() => {
    const getDateValue = (order) => {
      const parsed = new Date(order.createdAt || order.date);
      return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
    };

    return [...orders].sort((left, right) => {
      let result = 0;
      if (orderSortBy === 'id') {
        result = (Number(left.id) || 0) - (Number(right.id) || 0);
      } else if (orderSortBy === 'customer') {
        result = getOrderCustomerName(left).localeCompare(getOrderCustomerName(right));
      } else if (orderSortBy === 'amount') {
        result = (Number(left.amount) || 0) - (Number(right.amount) || 0);
      } else if (orderSortBy === 'status') {
        result = String(left.status || '').localeCompare(String(right.status || ''));
      } else {
        result = getDateValue(left) - getDateValue(right);
      }

      return orderSortDir === 'asc' ? result : -result;
    });
  }, [getOrderCustomerName, orderSortBy, orderSortDir, orders]);
  const recentOrders = useMemo(
    () => [...orders].sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)).slice(0, 5),
    [orders]
  );
  const totalRevenue = orders.reduce((sum, order) => sum + (Number(order.amount) || 0), 0);
  const pendingOrders = orders.filter((order) => order.status === 'Pending').length;
  const selectedOrderForAction = orders.find((order) => Number(order.id) === Number(selectedOrderId));
  const selectedOrderForActionId = selectedOrderForAction?.id;
  const selectedOrderForActionStatus = selectedOrderForAction?.status || '';
  const marketingPreviewUrl = useMemo(() => {
    if (marketingBannerFile) return URL.createObjectURL(marketingBannerFile);
    return resolveDashboardMediaUrl(marketingBanner?.image_url || '');
  }, [marketingBanner, marketingBannerFile]);
  const activeNewsletterSubscriberCount = newsletterSubscribers.filter((subscriber) => subscriber.is_active).length;
  const shopOwnerSubscriberCount = newsletterSubscribers.filter((subscriber) => subscriber.business_type !== 'shopfitter').length;
  const shopfitterSubscriberCount = newsletterSubscribers.filter((subscriber) => subscriber.business_type === 'shopfitter').length;
  const filteredNewsletterSubscribers = useMemo(() => (
    subscriberBusinessTypeFilter === 'all'
      ? newsletterSubscribers
      : newsletterSubscribers.filter((subscriber) => subscriber.business_type === subscriberBusinessTypeFilter)
  ), [newsletterSubscribers, subscriberBusinessTypeFilter]);

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
        addressDetails: customer.addressDetails || null,
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

  const handleOrderSort = (column) => {
    if (orderSortBy === column) {
      setOrderSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setOrderSortBy(column);
    setOrderSortDir('asc');
  };

  const renderOrderSortArrow = (column) => {
    if (orderSortBy !== column) {
      return <span className="text-base font-black leading-none text-gray-400">↕</span>;
    }

    return (
      <span className="text-lg font-black leading-none text-primary">
        {orderSortDir === 'asc' ? '↑' : '↓'}
      </span>
    );
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
        const [
          salesResponse,
          categoriesResponse,
          mostViewedResponse,
          bestSellingResponse,
          visitorsResponse,
        ] = await Promise.all([
          authFetch(`/admin/reports/sales?period=${encodeURIComponent(salesReportPeriod)}`),
          authFetch('/admin/reports/top-categories?limit=5'),
          authFetch('/admin/reports/most-viewed-products?limit=10'),
          authFetch('/admin/reports/best-selling-products?limit=10'),
          authFetch('/admin/reports/visitors'),
        ]);
        const salesData = await salesResponse.json().catch(() => null);
        const categoriesData = await categoriesResponse.json().catch(() => []);
        const mostViewedData = await mostViewedResponse.json().catch(() => []);
        const bestSellingData = await bestSellingResponse.json().catch(() => []);
        const visitorsData = await visitorsResponse.json().catch(() => null);

        if (!salesResponse.ok) {
          throw new Error(salesData?.detail || 'Unable to load sales report.');
        }
        if (!categoriesResponse.ok) {
          throw new Error(categoriesData?.detail || 'Unable to load category report.');
        }
        if (!mostViewedResponse.ok) {
          throw new Error(mostViewedData?.detail || 'Unable to load most viewed products.');
        }
        if (!bestSellingResponse.ok) {
          throw new Error(bestSellingData?.detail || 'Unable to load best selling products.');
        }
        if (!visitorsResponse.ok) {
          throw new Error(visitorsData?.detail || 'Unable to load visitor statistics.');
        }

        if (!cancelled) {
          setSalesReport(salesData || null);
          setTopCategoriesReport(Array.isArray(categoriesData) ? categoriesData : []);
          setMostViewedProductsReport(Array.isArray(mostViewedData) ? mostViewedData : []);
          setBestSellingProductsReport(Array.isArray(bestSellingData) ? bestSellingData : []);
          setVisitorReport(visitorsData || null);
        }
      } catch (error) {
        if (!cancelled) {
          setSalesReport(null);
          setTopCategoriesReport([]);
          setMostViewedProductsReport([]);
          setBestSellingProductsReport([]);
          setVisitorReport(null);
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
    if (!marketingBannerFile || !marketingPreviewUrl.startsWith('blob:')) return undefined;
    return () => URL.revokeObjectURL(marketingPreviewUrl);
  }, [marketingBannerFile, marketingPreviewUrl]);

  useEffect(() => {
    if (user?.role !== 'admin' || activeTab !== 'marketing') return undefined;

    let cancelled = false;
    const loadMarketingData = async () => {
      setMarketingLoading(true);
      setMarketingError('');
      setMarketingMessage('');

      try {
        const campaignRequests = ADMIN_EMAIL_CAMPAIGNS_ENABLED
          ? [
              authFetch('/marketing/admin/subscribers'),
              authFetch('/marketing/admin/campaigns'),
            ]
          : [];
        const [bannerResponse, subscribersResponse, campaignsResponse] = await Promise.all([
          authFetch('/marketing/admin/banner'),
          ...campaignRequests,
        ]);
        const bannerData = await bannerResponse.json().catch(() => null);
        const subscribersData = subscribersResponse ? await subscribersResponse.json().catch(() => []) : [];
        const campaignsData = campaignsResponse ? await campaignsResponse.json().catch(() => []) : [];

        if (!bannerResponse.ok) {
          throw new Error(bannerData?.detail || 'Unable to load marketing banner.');
        }
        if (subscribersResponse && !subscribersResponse.ok) {
          throw new Error(subscribersData?.detail || 'Unable to load newsletter subscribers.');
        }
        if (campaignsResponse && !campaignsResponse.ok) {
          throw new Error(campaignsData?.detail || 'Unable to load marketing campaigns.');
        }

        if (!cancelled) {
          setMarketingBanner(bannerData || null);
          setMarketingBannerEnabled(Boolean(bannerData?.is_active));
          setMarketingBannerCtaUrl(bannerData?.cta_url || '/catalogue');
          setGlobalDiscountPercentage(String(Number(bannerData?.global_discount_percentage || 0)));
          setNewsletterSubscribers(Array.isArray(subscribersData) ? subscribersData : []);
          setMarketingCampaigns(Array.isArray(campaignsData) ? campaignsData : []);
          setMarketingBannerFile(null);
        }
      } catch (error) {
        if (!cancelled) {
          setMarketingBanner(null);
          setMarketingBannerEnabled(false);
          setMarketingBannerCtaUrl('/catalogue');
          setGlobalDiscountPercentage('0');
          setNewsletterSubscribers([]);
          setMarketingCampaigns([]);
          setMarketingError(error.message || 'Unable to load marketing data.');
        }
      } finally {
        if (!cancelled) {
          setMarketingLoading(false);
        }
      }
    };

    loadMarketingData();

    return () => {
      cancelled = true;
    };
  }, [activeTab, authFetch, user]);

  useEffect(() => {
    if (user?.role !== 'admin' || activeTab !== 'subscribers') return undefined;

    let cancelled = false;
    const loadSubscribers = async () => {
      setSubscriberLoading(true);
      setSubscriberError('');

      try {
        const response = await authFetch('/marketing/admin/subscribers');
        const data = await response.json().catch(() => []);

        if (!response.ok) {
          throw new Error(data?.detail || 'Unable to load newsletter subscribers.');
        }

        if (!cancelled) {
          setNewsletterSubscribers(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (!cancelled) {
          setNewsletterSubscribers([]);
          setSubscriberError(error.message || 'Unable to load newsletter subscribers.');
        }
      } finally {
        if (!cancelled) {
          setSubscriberLoading(false);
        }
      }
    };

    loadSubscribers();

    return () => {
      cancelled = true;
    };
  }, [activeTab, authFetch, user]);

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
  const maxProductViews = Math.max(...mostViewedProductsReport.map((product) => Number(product.total_views || 0)), 1);
  const maxProductUnitsSold = Math.max(...bestSellingProductsReport.map((product) => Number(product.units_sold || 0)), 1);

  const handleMarketingFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setMarketingMessage('');

    if (!file) {
      setMarketingBannerFile(null);
      return;
    }

    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setMarketingBannerFile(null);
      setMarketingError('Please upload a PNG or JPEG banner image.');
      event.target.value = '';
      return;
    }

    setMarketingError('');
    setMarketingBannerFile(file);
  };

  const saveMarketingBanner = async (event) => {
    event.preventDefault();
    if (marketingSaving) return;

    setMarketingSaving(true);
    setMarketingError('');
    setMarketingMessage('');

    try {
      const formData = new FormData();
      formData.append('is_active', marketingBannerEnabled ? 'true' : 'false');
      formData.append('cta_url', marketingBannerCtaUrl.trim() || '/catalogue');
      if (marketingBannerFile) {
        formData.append('file', marketingBannerFile);
      }

      const response = await authFetch('/marketing/admin/banner', {
        method: 'PUT',
        body: formData,
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail || 'Unable to save marketing banner.');
      }

      setMarketingBanner(data || null);
      setMarketingBannerEnabled(Boolean(data?.is_active));
      setMarketingBannerCtaUrl(data?.cta_url || '/catalogue');
      setGlobalDiscountPercentage(String(Number(data?.global_discount_percentage ?? globalDiscountPercentage ?? 0)));
      setMarketingBannerFile(null);
      setMarketingMessage(data?.is_active ? 'Banner saved and live.' : 'Banner saved and disabled.');
    } catch (error) {
      setMarketingError(error.message || 'Unable to save marketing banner.');
    } finally {
      setMarketingSaving(false);
    }
  };

  const saveMarketingDiscount = async (event) => {
    event.preventDefault();
    if (marketingDiscountSaving) return;

    const discountValue = Number(globalDiscountPercentage || 0);
    if (!Number.isFinite(discountValue) || discountValue < 0 || discountValue > 100) {
      setMarketingError('Global product discount must be between 0 and 100.');
      return;
    }

    setMarketingDiscountSaving(true);
    setMarketingError('');
    setMarketingMessage('');

    try {
      const response = await authFetch('/marketing/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ global_discount_percentage: discountValue }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail || 'Unable to save global discount.');
      }

      setGlobalDiscountPercentage(String(Number(data?.global_discount_percentage || 0)));
      setMarketingMessage('Global product discount saved.');
    } catch (error) {
      setMarketingError(error.message || 'Unable to save global discount.');
    } finally {
      setMarketingDiscountSaving(false);
    }
  };

  const uploadCampaignBodyImages = async (files) => {
    setMarketingMessage('');

    const existingImageCount = (campaignMessageHtml.match(/<img\b/gi) || []).length;
    if (existingImageCount + files.length > CAMPAIGN_IMAGE_MAX_COUNT) {
      setMarketingError('You can include a maximum of 5 images in one campaign email.');
      return [];
    }

    if (files.length > CAMPAIGN_IMAGE_MAX_COUNT) {
      setMarketingError('You can upload a maximum of 5 campaign images.');
      return [];
    }

    const invalidFile = files.find((file) => !['image/png', 'image/jpeg'].includes(file.type));
    if (invalidFile) {
      setMarketingError('Campaign images must be PNG or JPEG files.');
      return [];
    }

    const oversizedFile = files.find((file) => file.size > CAMPAIGN_IMAGE_MAX_BYTES);
    if (oversizedFile) {
      setMarketingError('Each campaign image must be 2 MB or smaller.');
      return [];
    }

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('images', file));

      const response = await authFetch('/marketing/admin/campaign-images', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail || 'Unable to upload campaign image.');
      }

      setMarketingError('');
      return Array.isArray(data?.image_urls) ? data.image_urls : [];
    } catch (error) {
      setMarketingError(error.message || 'Unable to upload campaign image.');
      return [];
    }
  };

  const sendMarketingCampaign = async (event) => {
    event.preventDefault();
    if (campaignSending) return;

    const subject = campaignSubject.trim();
    const plainMessage = campaignMessageHtml.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (subject.length < 3) {
      setMarketingError('Campaign subject must be at least 3 characters.');
      return;
    }
    if (!plainMessage) {
      setMarketingError('Campaign email message is required.');
      return;
    }

    setCampaignSending(true);
    setMarketingError('');
    setMarketingMessage('');

    try {
      const formData = new FormData();
      formData.append('subject', subject);
      formData.append('message_html', campaignMessageHtml);

      const response = await authFetch('/marketing/admin/campaigns/send', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail || 'Unable to send campaign.');
      }

      const campaign = data?.campaign;
      setMarketingCampaigns((prev) => (campaign ? [campaign, ...prev].slice(0, 20) : prev));
      setCampaignSubject('');
      setCampaignMessageHtml('');
      setMarketingMessage(
        `Campaign sent to ${Number(campaign?.sent_count || 0)} subscriber${Number(campaign?.sent_count || 0) === 1 ? '' : 's'}.`
      );
      event.target.reset();
    } catch (error) {
      setMarketingError(error.message || 'Unable to send campaign.');
    } finally {
      setCampaignSending(false);
    }
  };

  const downloadSubscribersExcel = () => {
    if (!filteredNewsletterSubscribers.length) {
      setSubscriberError('No subscribers available to download.');
      return;
    }

    const headers = ['Name', 'Email', 'Business Type', 'Status', 'Subscribed'];
    const rows = filteredNewsletterSubscribers.map((subscriber) => [
      subscriber.full_name,
      subscriber.email,
      formatSubscriberBusinessType(subscriber.business_type),
      formatSubscriberStatus(subscriber),
      formatDisplayDate(subscriber.subscribed_at || subscriber.created_at),
    ]);
    const renderCell = (value, tag = 'td') => (
      `<${tag}>${escapeSpreadsheetCell(sanitizeSpreadsheetValue(value))}</${tag}>`
    );
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    table { border-collapse: collapse; }
    th, td { border: 1px solid #d1d5db; padding: 8px; mso-number-format: "\\@"; }
    th { background: #f3f4f6; font-weight: 700; }
  </style>
</head>
<body>
  <table>
    <thead><tr>${headers.map((header) => renderCell(header, 'th')).join('')}</tr></thead>
    <tbody>${rows.map((row) => `<tr>${row.map((cell) => renderCell(cell)).join('')}</tr>`).join('')}</tbody>
  </table>
</body>
</html>`;
    const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `newsletter-subscribers-${date}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleLogout = () => {
    if (!window.confirm('Are you sure you want to logout?')) return;
    logout();
    navigate('/');
  };

  const startEditCustomer = (customer) => {
    const address = customer.addressDetails || {};
    setEditingCustomer(customer);
    setCustomerEditForm({
      fullName: customer.name || '',
      email: customer.email || '',
      phone: customer.phone === 'N/A' ? '' : customer.phone || '',
      isActive: customer.isActive !== false,
      addressLine1: address.address_line1 || '',
      addressLine2: address.address_line2 || '',
      city: address.city || '',
      state: address.state || '',
      postalCode: address.postal_code || '',
      country: address.country || 'US',
    });
    setCustomerActionMessage('');
    setCustomerActionError('');
  };

  const handleCustomerEditChange = (event) => {
    const { name, value, type, checked } = event.target;
    setCustomerEditForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const saveCustomerEdit = async (event) => {
    event.preventDefault();
    if (!editingCustomer || isSavingCustomer) return;

    const fullName = customerEditForm.fullName.trim();
    const email = customerEditForm.email.trim().toLowerCase();
    if (!fullName || !email) {
      setCustomerActionError('Customer name and email are required.');
      return;
    }

    const addressValues = [
      customerEditForm.addressLine1,
      customerEditForm.addressLine2,
      customerEditForm.city,
      customerEditForm.state,
      customerEditForm.postalCode,
    ].map((value) => value.trim());
    const hasAddress = addressValues.some(Boolean);

    setIsSavingCustomer(true);
    setCustomerActionError('');
    setCustomerActionMessage('');
    try {
      const response = await authFetch(`/admin/customers/${editingCustomer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          email,
          phone: customerEditForm.phone.trim() || null,
          is_active: customerEditForm.isActive,
          address: hasAddress
            ? {
                full_name: fullName,
                phone: customerEditForm.phone.trim() || 'N/A',
                address_line1: customerEditForm.addressLine1.trim(),
                address_line2: customerEditForm.addressLine2.trim() || null,
                city: customerEditForm.city.trim(),
                state: customerEditForm.state.trim(),
                postal_code: customerEditForm.postalCode.trim(),
                country: customerEditForm.country.trim() || 'US',
              }
            : undefined,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.detail || 'Unable to update customer.');
      }

      await loadCustomers();
      setEditingCustomer(null);
      setCustomerActionMessage(`Updated ${fullName}.`);
    } catch (error) {
      setCustomerActionError(error.message || 'Unable to update customer.');
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const deleteCustomer = async (customer) => {
    if (!customer || deletingCustomerId) return;
    const confirmed = window.confirm(
      `Delete ${customer.name}? This will deactivate and anonymize the customer while preserving order history.`
    );
    if (!confirmed) return;

    setDeletingCustomerId(customer.id);
    setCustomerActionError('');
    setCustomerActionMessage('');
    try {
      const response = await authFetch(`/admin/customers/${customer.id}`, { method: 'DELETE' });
      if (!response.ok && response.status !== 204) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.detail || 'Unable to delete customer.');
      }
      await loadCustomers();
      if (selectedCustomer?.id === customer.id) setSelectedCustomer(null);
      if (editingCustomer?.id === customer.id) setEditingCustomer(null);
      setCustomerActionMessage(`Deleted ${customer.name}.`);
    } catch (error) {
      setCustomerActionError(error.message || 'Unable to delete customer.');
    } finally {
      setDeletingCustomerId(null);
    }
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
            <img src="/elmshelf-logo.png" alt="Elmshelf logo" className="h-auto w-44 object-contain sm:w-52" />
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
          {['overview', 'products', 'inventory', 'categories', 'industries', 'marketing', 'subscribers', 'managers', 'orders', 'customers', 'reports'].map((tab) => (
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
                        <td className="px-6 py-4">{getOrderCustomerName(order)}</td>
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

        {/* Marketing Tab */}
        {activeTab === 'marketing' && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="flex items-center gap-2 text-2xl font-bold text-primary">
                <UiIcon name="image" className="h-6 w-6" />
                Marketing
              </h3>
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${
                marketingBannerEnabled && marketingBanner?.image_url
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {marketingBannerEnabled && marketingBanner?.image_url ? 'Live offer' : 'Default offer'}
              </span>
            </div>

            {marketingError ? (
              <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {marketingError}
              </div>
            ) : null}
            {marketingMessage ? (
              <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
                {marketingMessage}
              </div>
            ) : null}

            <form onSubmit={saveMarketingBanner} className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
              <div className="space-y-5">
                <div>
                  <h4 className="text-lg font-bold text-gray-800">Promotional Banner</h4>
                  <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                    <p className="font-semibold">Upload requirements</p>
                    <p>Recommended size: 1200 x 600 px</p>
                    <p>Aspect ratio: 2:1</p>
                    <p>Accepted formats: PNG or JPEG</p>
                  </div>
                </div>

                <label className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <span>
                    <span className="block font-semibold text-gray-800">Enable banner</span>
                    <span className="block text-sm text-gray-500">Customers see this uploaded image when active.</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={marketingBannerEnabled}
                    onChange={(event) => setMarketingBannerEnabled(event.target.checked)}
                    className="h-5 w-5 accent-primary"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-gray-700">Banner image</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                    onChange={handleMarketingFileChange}
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:font-semibold file:text-white"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-gray-700">Click-through URL</span>
                  <input
                    type="text"
                    value={marketingBannerCtaUrl}
                    onChange={(event) => setMarketingBannerCtaUrl(event.target.value)}
                    placeholder="/catalogue"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                <button
                  type="submit"
                  disabled={marketingSaving || marketingLoading}
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {marketingSaving ? 'Saving...' : 'Save Banner'}
                </button>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="font-bold text-gray-800">Preview</h4>
                  {marketingLoading ? <span className="text-sm text-gray-500">Loading...</span> : null}
                </div>

                {marketingPreviewUrl ? (
                  <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                    <img
                      src={marketingPreviewUrl}
                      alt="Marketing banner preview"
                      className="h-auto max-h-[420px] w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-6 text-center text-sm font-semibold text-gray-500">
                    No uploaded banner. Customers will not see an offer popup until a banner is enabled.
                  </div>
                )}
              </div>
            </form>

            <form onSubmit={saveMarketingDiscount} className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-5">
              <div className="mb-4">
                <h4 className="text-lg font-bold text-gray-800">Global Product Discount</h4>
                <p className="mt-1 text-sm text-gray-500">
                  Apply a promotional percentage to product subtotal only. Shipping and VAT are not discounted.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-[minmax(0,260px)_auto] sm:items-end">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-gray-700">Discount (%)</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={globalDiscountPercentage}
                    onChange={(event) => setGlobalDiscountPercentage(event.target.value)}
                    placeholder="0"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <button
                  type="submit"
                  disabled={marketingDiscountSaving || marketingLoading}
                  className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-2.5 font-semibold text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {marketingDiscountSaving ? 'Saving...' : 'Save Discount'}
                </button>
              </div>
            </form>

            {ADMIN_EMAIL_CAMPAIGNS_ENABLED && (
              <div className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
                <form onSubmit={sendMarketingCampaign} className="rounded-xl border border-gray-200 bg-white p-5">
                  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h4 className="text-lg font-bold text-gray-800">Email Campaign</h4>
                      <p className="mt-1 text-sm text-gray-500">
                        Send promotions, offers, and event updates to active subscribers.
                      </p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">
                      {activeNewsletterSubscriberCount} active subscriber{activeNewsletterSubscriberCount === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="grid gap-4">
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold text-gray-700">Subject</span>
                      <input
                        type="text"
                        value={campaignSubject}
                        onChange={(event) => setCampaignSubject(event.target.value)}
                        maxLength={180}
                        placeholder="Summer shelving offers now available"
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </label>
                  </div>

                  <div className="mt-5">
                    <span className="mb-2 block text-sm font-semibold text-gray-700">Email message</span>
                    <TipTapEditor
                      value={campaignMessageHtml}
                      onChange={setCampaignMessageHtml}
                      placeholder="Write the campaign email..."
                      disabled={campaignSending}
                      onImageUpload={uploadCampaignBodyImages}
                    />
                  </div>

                  <p className="mt-2 text-sm font-medium text-gray-500">
                    Images: PNG/JPEG, max 5 per email, 2 MB each.
                  </p>

                  <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h5 className="font-bold text-gray-800">Email Preview</h5>
                    </div>
                    <h6 className="text-lg font-bold text-gray-900">{campaignSubject.trim() || 'Campaign subject'}</h6>
                    <div
                      className="tiptap-render mt-3 min-h-[80px] rounded-lg bg-white p-3 text-sm text-gray-700"
                      dangerouslySetInnerHTML={{ __html: campaignMessageHtml || '<p>Email message preview will appear here.</p>' }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={campaignSending || marketingLoading}
                    className="mt-5 inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {campaignSending ? 'Sending...' : 'Send Campaign'}
                  </button>
                </form>

                <div className="space-y-6">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                    <h4 className="text-lg font-bold text-gray-800">Subscribers</h4>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-white p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.1em] text-gray-500">Active</p>
                        <p className="mt-1 text-2xl font-bold text-primary">{activeNewsletterSubscriberCount}</p>
                      </div>
                      <div className="rounded-lg bg-white p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.1em] text-gray-500">Total</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900">{newsletterSubscribers.length}</p>
                      </div>
                    </div>
                    <div className="mt-4 max-h-56 space-y-2 overflow-y-auto pr-1">
                      {newsletterSubscribers.length > 0 ? (
                        newsletterSubscribers.slice(0, 8).map((subscriber) => (
                          <div key={subscriber.id} className="rounded-lg bg-white px-3 py-2">
                            <p className="truncate text-sm font-bold text-gray-800">{subscriber.full_name}</p>
                            <p className="truncate text-xs text-gray-500">{subscriber.email}</p>
                            <p className="truncate text-xs font-semibold text-gray-500">
                              {subscriber.business_type === 'shopfitter' ? 'Shopfitter' : 'Shop owner'}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="rounded-lg bg-white px-3 py-4 text-sm text-gray-500">No newsletter subscribers yet.</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                    <h4 className="text-lg font-bold text-gray-800">Recent Campaigns</h4>
                    <div className="mt-4 space-y-3">
                      {marketingCampaigns.length > 0 ? (
                        marketingCampaigns.slice(0, 5).map((campaign) => (
                          <div key={campaign.id} className="rounded-lg bg-white px-3 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-gray-800">{campaign.subject}</p>
                                <p className="text-xs text-gray-500">{campaign.campaign_type}</p>
                              </div>
                              <span className="shrink-0 rounded-full bg-green-50 px-2 py-1 text-xs font-bold text-green-700">
                                {campaign.status}
                              </span>
                            </div>
                            <p className="mt-2 text-xs text-gray-500">
                              Sent: {campaign.sent_count} | Failed: {campaign.failed_count}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="rounded-lg bg-white px-3 py-4 text-sm text-gray-500">No campaigns sent yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Subscribers Tab */}
        {activeTab === 'subscribers' && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-2xl font-bold text-primary">
                  <UiIcon name="users" className="h-6 w-6" />
                  Newsletter Subscribers
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  View customers who joined the promotion and event update list.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="block text-sm font-semibold text-gray-700">
                  Business type
                  <select
                    value={subscriberBusinessTypeFilter}
                    onChange={(event) => {
                      setSubscriberBusinessTypeFilter(event.target.value);
                      setSubscriberError('');
                    }}
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:w-44"
                  >
                    <option value="all">All</option>
                    <option value="shopowner">Shop owner</option>
                    <option value="shopfitter">Shopfitter</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={downloadSubscribersExcel}
                  disabled={subscriberLoading || filteredNewsletterSubscribers.length === 0}
                  className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-2.5 font-semibold text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <UiIcon name="download" className="mr-2 h-4 w-4" />
                  Download Excel
                </button>
              </div>
            </div>

            <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-gray-500">Total</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{newsletterSubscribers.length}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-gray-500">Shop owners</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{shopOwnerSubscriberCount}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-gray-500">Shopfitters</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{shopfitterSubscriberCount}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-gray-500">Active</p>
                <p className="mt-1 text-2xl font-bold text-primary">{activeNewsletterSubscriberCount}</p>
              </div>
            </div>

            {subscriberError ? (
              <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {subscriberError}
              </div>
            ) : null}

            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full min-w-[760px]">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-5 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                    <th className="px-5 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                    <th className="px-5 py-3 text-left text-sm font-semibold text-gray-700">Business Type</th>
                    <th className="px-5 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-5 py-3 text-left text-sm font-semibold text-gray-700">Subscribed</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriberLoading ? (
                    <tr>
                      <td colSpan="5" className="px-5 py-8 text-center text-sm font-semibold text-gray-500">
                        Loading subscribers...
                      </td>
                    </tr>
                  ) : filteredNewsletterSubscribers.length > 0 ? (
                    filteredNewsletterSubscribers.map((subscriber) => (
                      <tr key={subscriber.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-5 py-4 text-sm font-semibold text-gray-900">{subscriber.full_name}</td>
                        <td className="px-5 py-4 text-sm text-gray-700">{subscriber.email}</td>
                        <td className="px-5 py-4 text-sm text-gray-700">
                          {formatSubscriberBusinessType(subscriber.business_type)}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                            subscriber.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {formatSubscriberStatus(subscriber)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-700">
                          {formatDisplayDate(subscriber.subscribed_at || subscriber.created_at)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-5 py-8 text-center text-sm font-semibold text-gray-500">
                        No subscribers match this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
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
                    <th className="px-6 py-3 text-left font-semibold text-gray-700" aria-sort={orderSortBy === 'id' ? (orderSortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                      <button type="button" onClick={() => handleOrderSort('id')} className="inline-flex items-center gap-2 hover:text-primary">
                        Order ID {renderOrderSortArrow('id')}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700" aria-sort={orderSortBy === 'customer' ? (orderSortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                      <button type="button" onClick={() => handleOrderSort('customer')} className="inline-flex items-center gap-2 hover:text-primary">
                        Customer {renderOrderSortArrow('customer')}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700" aria-sort={orderSortBy === 'amount' ? (orderSortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                      <button type="button" onClick={() => handleOrderSort('amount')} className="inline-flex items-center gap-2 hover:text-primary">
                        Amount {renderOrderSortArrow('amount')}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700" aria-sort={orderSortBy === 'status' ? (orderSortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                      <button type="button" onClick={() => handleOrderSort('status')} className="inline-flex items-center gap-2 hover:text-primary">
                        Status {renderOrderSortArrow('status')}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700" aria-sort={orderSortBy === 'date' ? (orderSortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                      <button type="button" onClick={() => handleOrderSort('date')} className="inline-flex items-center gap-2 hover:text-primary">
                        Date {renderOrderSortArrow('date')}
                      </button>
                    </th>
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
                      <td className="px-6 py-4">{getOrderCustomerName(order)}</td>
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
            {customerActionMessage && (
              <p className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
                {customerActionMessage}
              </p>
            )}
            {customerActionError && (
              <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {customerActionError}
              </p>
            )}
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
                        <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedCustomer(customer)}
                          className="text-blue-600 hover:text-blue-800 font-semibold"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => startEditCustomer(customer)}
                          className="font-semibold text-green-700 hover:text-green-900"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCustomer(customer)}
                          disabled={deletingCustomerId === customer.id}
                          className="font-semibold text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:text-red-300"
                        >
                          {deletingCustomerId === customer.id ? 'Deleting...' : 'Delete'}
                        </button>
                        </div>
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
                  Sales {salesReportPeriod === 'week' ? 'This Week' : 'This Month'}
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

            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="border-2 border-gray-200 rounded-lg p-6">
                <h4 className="font-bold text-lg text-gray-800 mb-4">Top 10 Most Viewed Products</h4>
                <div className="space-y-3">
                  {reportsLoading ? (
                    <p className="text-sm text-gray-500">Loading product views...</p>
                  ) : mostViewedProductsReport.length > 0 ? (
                    mostViewedProductsReport.map((product, index) => {
                      const totalViews = Number(product.total_views || 0);
                      const width = Math.max(8, Math.round((totalViews / maxProductViews) * 100));

                      return (
                        <div key={product.product_id} className="space-y-1">
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-gray-600">
                              <span className="mr-2 font-bold text-primary">#{index + 1}</span>
                              {product.product_name}
                            </span>
                            <span className="shrink-0 text-xs font-semibold text-gray-500">
                              {totalViews.toLocaleString()} views
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-gray-200">
                            <div className="h-2 rounded-full bg-blue-600" style={{ width: `${width}%` }} />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-gray-500">No product views have been recorded yet.</p>
                  )}
                </div>
              </div>

              <div className="border-2 border-gray-200 rounded-lg p-6">
                <h4 className="font-bold text-lg text-gray-800 mb-4">Top 10 Best Selling Products</h4>
                <div className="space-y-3">
                  {reportsLoading ? (
                    <p className="text-sm text-gray-500">Loading best sellers...</p>
                  ) : bestSellingProductsReport.length > 0 ? (
                    bestSellingProductsReport.map((product, index) => {
                      const unitsSold = Number(product.units_sold || 0);
                      const width = Math.max(8, Math.round((unitsSold / maxProductUnitsSold) * 100));

                      return (
                        <div key={product.product_id} className="space-y-1">
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-gray-600">
                              <span className="mr-2 font-bold text-primary">#{index + 1}</span>
                              {product.product_name}
                            </span>
                            <span className="shrink-0 text-xs font-semibold text-gray-500">
                              {unitsSold.toLocaleString()} units | £{Number(product.revenue || 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-gray-200">
                            <div className="h-2 rounded-full bg-green-600" style={{ width: `${width}%` }} />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-gray-500">No paid product sales have been recorded yet.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 border-2 border-gray-200 rounded-lg p-6">
              <h4 className="font-bold text-lg text-gray-800 mb-4">Website Visitors</h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {['last_7_days', 'last_30_days'].map((periodKey) => {
                  const statsForPeriod = visitorReport?.[periodKey] || {};
                  const label = periodKey === 'last_7_days' ? 'Last 7 Days' : 'Last 30 Days';

                  return (
                    <div key={periodKey} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <h5 className="mb-3 font-bold text-gray-800">{label}</h5>
                      {reportsLoading ? (
                        <p className="text-sm text-gray-500">Loading visitors...</p>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Unique Visitors</span>
                            <span className="font-bold text-primary">
                              {Number(statsForPeriod.unique_visitors || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Sessions</span>
                            <span className="font-bold text-primary">
                              {Number(statsForPeriod.unique_sessions || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Visits</span>
                            <span className="font-bold text-accent">
                              {Number(statsForPeriod.total_visits || 0).toLocaleString()}
                            </span>
                          </div>
                          {statsForPeriod.start_date ? (
                            <p className="pt-2 text-xs text-gray-500">
                              From {formatDisplayDate(statsForPeriod.start_date)}
                            </p>
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} accentClass="text-primary" />
        {editingCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4" onClick={() => setEditingCustomer(null)}>
            <form
              className="flex max-h-[86svh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
              onClick={(event) => event.stopPropagation()}
              onSubmit={saveCustomerEdit}
            >
              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 px-4 py-3 sm:px-5">
                <div>
                  <h3 className="text-xl font-bold text-primary">Edit Customer</h3>
                  <p className="text-sm text-gray-600">{editingCustomer.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="rounded border border-gray-300 px-3 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>

              <div className="space-y-5 overflow-y-auto px-4 py-4 sm:px-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Full name
                    <input
                      name="fullName"
                      value={customerEditForm.fullName}
                      onChange={handleCustomerEditChange}
                      required
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal focus:border-primary focus:outline-none"
                    />
                  </label>
                  <label className="block text-sm font-semibold text-gray-700">
                    Email
                    <input
                      type="email"
                      name="email"
                      value={customerEditForm.email}
                      onChange={handleCustomerEditChange}
                      required
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal focus:border-primary focus:outline-none"
                    />
                  </label>
                  <label className="block text-sm font-semibold text-gray-700">
                    Phone
                    <input
                      name="phone"
                      value={customerEditForm.phone}
                      onChange={handleCustomerEditChange}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal focus:border-primary focus:outline-none"
                    />
                  </label>
                  <label className="mt-7 flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={customerEditForm.isActive}
                      onChange={handleCustomerEditChange}
                      className="h-4 w-4"
                    />
                    Active account
                  </label>
                </div>

                <div>
                  <h4 className="mb-3 text-sm font-bold uppercase tracking-[0.08em] text-gray-500">Default address</h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-semibold text-gray-700 sm:col-span-2">
                      Address line 1
                      <input
                        name="addressLine1"
                        value={customerEditForm.addressLine1}
                        onChange={handleCustomerEditChange}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal focus:border-primary focus:outline-none"
                      />
                    </label>
                    <label className="block text-sm font-semibold text-gray-700 sm:col-span-2">
                      Address line 2
                      <input
                        name="addressLine2"
                        value={customerEditForm.addressLine2}
                        onChange={handleCustomerEditChange}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal focus:border-primary focus:outline-none"
                      />
                    </label>
                    <label className="block text-sm font-semibold text-gray-700">
                      City
                      <input
                        name="city"
                        value={customerEditForm.city}
                        onChange={handleCustomerEditChange}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal focus:border-primary focus:outline-none"
                      />
                    </label>
                    <label className="block text-sm font-semibold text-gray-700">
                      State / county
                      <input
                        name="state"
                        value={customerEditForm.state}
                        onChange={handleCustomerEditChange}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal focus:border-primary focus:outline-none"
                      />
                    </label>
                    <label className="block text-sm font-semibold text-gray-700">
                      Postal code
                      <input
                        name="postalCode"
                        value={customerEditForm.postalCode}
                        onChange={handleCustomerEditChange}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal focus:border-primary focus:outline-none"
                      />
                    </label>
                    <label className="block text-sm font-semibold text-gray-700">
                      Country
                      <input
                        name="country"
                        value={customerEditForm.country}
                        onChange={handleCustomerEditChange}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal focus:border-primary focus:outline-none"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 justify-end gap-3 border-t border-gray-200 px-4 py-3 sm:px-5">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCustomer}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  {isSavingCustomer ? 'Saving...' : 'Save customer'}
                </button>
              </div>
            </form>
          </div>
        )}
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
                            <td className="px-4 py-2 text-sm font-semibold text-gray-800">£{Number(order.amount || 0).toFixed(2)}</td>
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
