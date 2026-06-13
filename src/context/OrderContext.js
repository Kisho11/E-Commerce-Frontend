import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

const OrderContext = createContext();
const ORDERS_STORAGE_KEY = 'orders';
const API_BASE_URL = process.env.REACT_APP_API_URL;

const initialOrders = [
  { id: 1001, customer: 'John Smith', amount: 450.0, status: 'Shipped', date: '2026-02-22', items: [] },
  { id: 1002, customer: 'Emma Wilson', amount: 320.5, status: 'Processing', date: '2026-02-22', items: [] },
  { id: 1003, customer: 'Mike Johnson', amount: 890.0, status: 'Delivered', date: '2026-02-21', items: [] },
  { id: 1004, customer: 'Sarah Davis', amount: 220.75, status: 'Pending', date: '2026-02-21', items: [] },
  { id: 1005, customer: 'Tom Brown', amount: 1500.0, status: 'Shipped', date: '2026-02-20', items: [] },
];

const readStorage = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
};

const formatDate = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatTime = (date) => {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
};

const normalizeOrder = (order) => {
  const amount = Number(order.amount || order.pricing?.total || 0);
  const subtotal = Number(order.pricing?.subtotal ?? amount / 1.1);
  const taxRate = Number(order.pricing?.taxRate ?? 0.1);
  const taxAmount = Number(order.pricing?.taxAmount ?? subtotal * taxRate);
  const shippingFee = Number(order.pricing?.shippingFee ?? 0);
  const createdAt = order.createdAt || new Date(`${order.date || formatDate(new Date())}T12:00:00`).toISOString();
  const createdDate = new Date(createdAt);

  return {
    ...order,
    customerId: order.customerId ?? null,
    customerFirstName: order.customerFirstName || '',
    customerLastName: order.customerLastName || '',
    customer: order.customer || 'Unknown Customer',
    customerEmail: order.customerEmail || '',
    customerPhone: order.customerPhone || '',
    shippingAddress: {
      address: order.shippingAddress?.address || '',
      city: order.shippingAddress?.city || '',
      state: order.shippingAddress?.state || '',
      zipCode: order.shippingAddress?.zipCode || '',
    },
    items: Array.isArray(order.items) ? order.items : [],
    amount,
    pricing: {
      subtotal,
      taxRate,
      taxAmount,
      shippingFee,
      total: amount,
    },
    payment: {
      method: order.payment?.method || 'Card',
      cardLast4: order.payment?.cardLast4 || '',
      expiryDate: order.payment?.expiryDate || '',
    },
    status: order.status || 'Pending',
    date: order.date || formatDate(createdDate),
    orderTime: order.orderTime || formatTime(createdDate),
    createdAt,
    source: order.source || 'web_checkout',
  };
};

const mapOrderFromApi = (order = {}) => {
  const createdAt = order.created_at || new Date().toISOString();
  const createdDate = new Date(createdAt);
  const fullName = order.address?.full_name || order.customer || '';
  const [firstName = '', ...lastNameParts] = fullName.trim().split(/\s+/).filter(Boolean);
  const lastName = lastNameParts.join(' ');

  return normalizeOrder({
    id: order.id,
    customerId: order.user_id ?? null,
    customerFirstName: firstName,
    customerLastName: lastName,
    customer: fullName,
    customerEmail: order.customer_email || '',
    customerPhone: order.address?.phone || order.customer_phone || '',
    shippingAddress: {
      address: order.address?.address_line1 || '',
      city: order.address?.city || '',
      state: order.address?.state || '',
      zipCode: order.address?.postal_code || '',
    },
    amount: Number(order.total_amount || 0),
    pricing: {
      subtotal: Number(order.total_amount || 0),
      taxRate: 0,
      taxAmount: 0,
      shippingFee: 0,
      total: Number(order.total_amount || 0),
    },
    payment: {
      method: order.payment_status || '',
      cardLast4: '',
      expiryDate: '',
    },
    items: Array.isArray(order.items)
      ? order.items.map((item) => ({
          id: item.id,
          productId: item.product_id,
          quantity: item.quantity,
          price: Number(item.unit_price || 0),
          total: Number(item.total_price || 0),
          name: item.product?.name || '',
        }))
      : [],
    status: typeof order.status === 'string' ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'Pending',
    date: formatDate(createdDate),
    orderTime: formatTime(createdDate),
    createdAt,
    source: 'backend',
  });
};

const getLocalFallbackOrders = () => readStorage(ORDERS_STORAGE_KEY, initialOrders).map((order) => normalizeOrder(order));

export function OrderProvider({ children }) {
  const { user, authFetch } = useAuth();
  const [orders, setOrders] = useState(() => (API_BASE_URL ? [] : getLocalFallbackOrders()));

  useEffect(() => {
    if (!API_BASE_URL) {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    }
  }, [orders]);

  const loadOrders = useCallback(async () => {
    if (!API_BASE_URL) {
      const localOrders = getLocalFallbackOrders();
      setOrders(localOrders);
      return localOrders;
    }

    if (!user) {
      setOrders([]);
      return [];
    }

    if (user.role === 'user') {
      const response = await authFetch('/orders/');
      const data = await response.json().catch(() => []);
      const nextOrders = Array.isArray(data) ? data.map(mapOrderFromApi) : [];
      setOrders(nextOrders);
      return nextOrders;
    }

    if (user.role === 'manager') {
      const response = await authFetch('/manager/orders?per_page=100');
      const data = await response.json().catch(() => []);
      const nextOrders = Array.isArray(data) ? data.map(mapOrderFromApi) : [];
      setOrders(nextOrders);
      return nextOrders;
    }

    if (user.role !== 'admin') {
      setOrders([]);
      return [];
    }

    const response = await authFetch('/orders/admin/all?per_page=100');
    const data = await response.json().catch(() => []);
    const nextOrders = Array.isArray(data) ? data.map(mapOrderFromApi) : [];
    setOrders(nextOrders);
    return nextOrders;
  }, [authFetch, user]);

  useEffect(() => {
    let cancelled = false;

    const syncOrders = async () => {
      try {
        const nextOrders = await loadOrders();
        if (cancelled) return;
        setOrders(nextOrders);
      } catch (error) {
        if (!cancelled) {
          setOrders([]);
        }
      }
    };

    syncOrders();

    return () => {
      cancelled = true;
    };
  }, [loadOrders]);

  const placeOrder = useCallback((payload) => {
    const now = new Date();
    const maxId = orders.reduce((max, order) => Math.max(max, Number(order.id) || 0), 1000);
    const newOrder = normalizeOrder({
      id: maxId + 1,
      customerId: user?.id ?? null,
      customerFirstName: payload.customerFirstName || '',
      customerLastName: payload.customerLastName || '',
      customer: payload.customer,
      customerEmail: payload.customerEmail || '',
      customerPhone: payload.customerPhone || '',
      shippingAddress: payload.shippingAddress || {},
      items: payload.items || [],
      amount: Number(payload.amount) || 0,
      pricing: payload.pricing || {},
      payment: payload.payment || {},
      status: 'Pending',
      date: formatDate(now),
      orderTime: formatTime(now),
      createdAt: now.toISOString(),
      source: 'web_checkout',
    });

    if (!API_BASE_URL) {
      setOrders((prev) => [newOrder, ...prev]);
    }

    return newOrder;
  }, [orders, user]);

  const value = useMemo(
    () => ({
      orders,
      placeOrder,
      loadOrders,
    }),
    [orders, placeOrder, loadOrders]
  );

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within OrderProvider');
  }
  return context;
}
