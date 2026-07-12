import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import OrderDetailsModal from '../components/OrderDetailsModal';
import Seo from '../components/Seo';

const PROFILE_KEY = 'customerProfile';
const PAYMENT_KEY = 'customerPaymentMethods';
const CONSENT_KEY = 'customerConsents';
const AUDIT_KEY = 'customerDataAuditLog';

const getUserStorageKey = (key, userId) => `${key}:${userId || 'guest'}`;

const defaultProfile = { fullName: '', email: '', phone: '', address: '', city: '', state: '', zipCode: '' };

const defaultPayment = {
  type: 'Card',
  cardHolder: '',
  cardNumber: '',
  expiry: '',
  billingZip: '',
};

const defaultConsents = {
  essentialProcessing: true,
  marketingEmails: false,
  analyticsTracking: false,
  personalizedOffers: false,
  updatedAt: null,
};

const emptyProfileErrors = { fullName: '', email: '', phone: '', address: '', city: '', state: '', zipCode: '' };
const emptyPaymentErrors = { cardHolder: '', cardNumber: '', expiry: '', billingZip: '' };

function readLocalStorage(key, fallback) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocalStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function maskCard(last4) {
  return last4 ? `**** **** **** ${last4}` : 'No card number';
}

function nowIso() {
  return new Date().toISOString();
}

function luhnCheck(num) {
  let sum = 0;
  let isEven = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let digit = parseInt(num[i], 10);
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }
  return sum % 10 === 0;
}

function validateProfileField(name, value) {
  const v = (value || '').trim();
  switch (name) {
    case 'fullName':
      if (!v) return 'Full name is required.';
      if (v.length < 2) return 'Full name must be at least 2 characters.';
      if (!/^[a-zA-Z\s'-]+$/.test(v)) return 'Only letters, spaces, hyphens, or apostrophes allowed.';
      return '';
    case 'email':
      if (!v) return 'Email is required.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address.';
      return '';
    case 'phone': {
      if (!v) return 'Phone number is required.';
      const digits = v.replace(/\D/g, '');
      if (digits.length < 7 || digits.length > 15) return 'Enter a valid phone number (7–15 digits).';
      return '';
    }
    case 'address':
      if (!v) return 'Street address is required.';
      if (v.length < 5 || v.length > 120) return 'Enter a street address between 5 and 120 characters.';
      return '';
    case 'city':
      if (!v) return 'City is required.';
      if (v.length < 2 || v.length > 60) return 'Enter a city between 2 and 60 characters.';
      if (!/^[a-zA-Z\s.'-]+$/.test(v)) return 'City can contain only letters, spaces, hyphens, apostrophes, and periods.';
      return '';
    case 'state':
      if (!v) return 'State / county is required.';
      if (v.length < 2 || v.length > 60) return 'Enter a state or county between 2 and 60 characters.';
      if (!/^[a-zA-Z\s.'-]+$/.test(v)) return 'State / county can contain only letters, spaces, hyphens, apostrophes, and periods.';
      return '';
    case 'zipCode':
      if (!v) return 'ZIP / postal code is required.';
      if (!/^[a-zA-Z0-9][a-zA-Z0-9\s-]{1,9}$/.test(v)) return 'Enter a valid ZIP / postal code.';
      return '';
    default:
      return '';
  }
}

function validatePaymentField(name, value, isEditingCard) {
  const v = (value || '').trim();
  switch (name) {
    case 'cardHolder':
      if (!v) return 'Card holder name is required.';
      if (v.length < 2) return 'Card holder name must be at least 2 characters.';
      if (v.length > 80) return 'Card holder name must be 80 characters or fewer.';
      if (!/^[a-zA-Z\s'-]+$/.test(v)) return 'Use only letters, spaces, hyphens, or apostrophes.';
      return '';
    case 'cardNumber': {
      if (isEditingCard && !v) return '';
      const digits = v.replace(/\D/g, '');
      if (!digits) return 'Card number is required.';
      if (digits.length < 13 || digits.length > 19) return 'Enter a valid card number (13–19 digits).';
      if (/^(\d)\1+$/.test(digits) || !luhnCheck(digits)) return 'Card number is invalid.';
      return '';
    }
    case 'expiry': {
      if (!v) return 'Expiry date is required.';
      if (!/^\d{2}\/\d{2}$/.test(v)) return 'Enter expiry as MM/YY.';
      const [mm, yy] = v.split('/').map(Number);
      if (mm < 1 || mm > 12) return 'Month must be 01–12.';
      const now = new Date();
      const expDate = new Date(2000 + yy, mm);
      if (expDate <= now) return 'This card has expired.';
      return '';
    }
    case 'billingZip':
      if (!v) return 'Billing ZIP / postal code is required.';
      if (!/^(?:\d{5}(?:-\d{4})?|[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})$/i.test(v)) {
        return 'Enter a valid US ZIP code or UK postal code.';
      }
      return '';
    default:
      return '';
  }
}

function validateAllProfile(profile) {
  const errors = {
    fullName: validateProfileField('fullName', profile.fullName),
    email: validateProfileField('email', profile.email),
    phone: validateProfileField('phone', profile.phone),
    address: validateProfileField('address', profile.address),
    city: validateProfileField('city', profile.city),
    state: validateProfileField('state', profile.state),
    zipCode: validateProfileField('zipCode', profile.zipCode),
  };
  const valid = Object.values(errors).every((e) => !e);
  return { errors, valid };
}

function validateAllPayment(form, isEditingCard) {
  const errors = {
    cardHolder: validatePaymentField('cardHolder', form.cardHolder, isEditingCard),
    cardNumber: validatePaymentField('cardNumber', form.cardNumber, isEditingCard),
    expiry: validatePaymentField('expiry', form.expiry, isEditingCard),
    billingZip: validatePaymentField('billingZip', form.billingZip, isEditingCard),
  };
  const valid = Object.values(errors).every((e) => !e);
  return { errors, valid };
}

const STATUS_COLORS = {
  Pending: 'bg-yellow-100 text-yellow-800',
  Confirmed: 'bg-blue-100 text-blue-800',
  Processing: 'bg-purple-100 text-purple-800',
  Shipped: 'bg-indigo-100 text-indigo-800',
  Delivered: 'bg-green-100 text-green-800',
  Cancelled: 'bg-red-100 text-red-800',
};

function FieldError({ msg }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs font-medium text-red-600" role="alert">{msg}</p>;
}

function inputCls(hasError) {
  return `w-full rounded-lg border px-3 py-2 focus:outline-none transition ${
    hasError
      ? 'border-red-400 bg-red-50 focus:border-red-500'
      : 'border-slate-300 focus:border-blue-500'
  }`;
}

function CustomerPortal() {
  const navigate = useNavigate();
  const { user, authFetch, logout } = useAuth();
  const { orders } = useOrders();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const profileStorageKey = getUserStorageKey(PROFILE_KEY, user?.id);
  const paymentStorageKey = getUserStorageKey(PAYMENT_KEY, user?.id);
  const consentStorageKey = getUserStorageKey(CONSENT_KEY, user?.id);
  const auditStorageKey = getUserStorageKey(AUDIT_KEY, user?.id);

  const [profile, setProfile] = useState(() => {
    const stored = readLocalStorage(profileStorageKey, {});
    return {
      ...defaultProfile,
      ...stored,
      fullName: stored.fullName || user?.name || '',
      email: stored.email || user?.email || '',
      phone: stored.phone || user?.phone || '',
    };
  });

  const [paymentMethods, setPaymentMethods] = useState(() => readLocalStorage(paymentStorageKey, []));
  const [consents, setConsents] = useState(() => readLocalStorage(consentStorageKey, defaultConsents));
  const [auditLog, setAuditLog] = useState(() => readLocalStorage(auditStorageKey, []));

  const [paymentForm, setPaymentForm] = useState(defaultPayment);
  const [editingId, setEditingId] = useState(null);

  const [profileErrors, setProfileErrors] = useState(emptyProfileErrors);
  const [paymentErrors, setPaymentErrors] = useState(emptyPaymentErrors);

  const [consentMessage, setConsentMessage] = useState('');
  const [privacyMessage, setPrivacyMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const isEditing = useMemo(() => editingId !== null, [editingId]);

  useEffect(() => {
    const stored = readLocalStorage(profileStorageKey, {});
    setProfile({
      ...defaultProfile,
      ...stored,
      fullName: stored.fullName || user?.name || '',
      email: stored.email || user?.email || '',
      phone: stored.phone || user?.phone || '',
    });
    setPaymentMethods(readLocalStorage(paymentStorageKey, []));
    setConsents(readLocalStorage(consentStorageKey, defaultConsents));
    setAuditLog(readLocalStorage(auditStorageKey, []));
    setPaymentForm(defaultPayment);
    setPaymentErrors(emptyPaymentErrors);
    setProfileErrors(emptyProfileErrors);
    setEditingId(null);
  }, [auditStorageKey, consentStorageKey, paymentStorageKey, profileStorageKey, user?.email, user?.name, user?.phone]);

  useEffect(() => {
    if (!process.env.REACT_APP_API_URL || !user) return undefined;

    let cancelled = false;
    const loadProfileDetails = async () => {
      try {
        const [profileResponse, addressesResponse] = await Promise.all([
          authFetch('/users/me'),
          authFetch('/users/me/addresses'),
        ]);
        const serverProfile = profileResponse.ok ? await profileResponse.json() : null;
        const addresses = addressesResponse.ok ? await addressesResponse.json() : [];
        if (cancelled) return;

        const savedAddress = Array.isArray(addresses)
          ? addresses.find((address) => address.is_default) || addresses[addresses.length - 1]
          : null;

        setProfile((previous) => ({
          ...previous,
          fullName: previous.fullName || serverProfile?.full_name || user.name || '',
          email: previous.email || serverProfile?.email || user.email || '',
          phone: previous.phone || serverProfile?.phone || savedAddress?.phone || user.phone || '',
          address: previous.address || savedAddress?.address_line1 || '',
          city: previous.city || savedAddress?.city || '',
          state: previous.state || savedAddress?.state || '',
          zipCode: previous.zipCode || savedAddress?.postal_code || '',
        }));
      } catch {
        // The existing local profile remains available if the backend cannot be reached.
      }
    };

    loadProfileDetails();

    return () => {
      cancelled = true;
    };
  }, [authFetch, user]);

  const addAudit = (action, detail = '') => {
    const entry = { id: Date.now(), action, detail, at: nowIso() };
    const next = [entry, ...auditLog].slice(0, 20);
    setAuditLog(next);
    writeLocalStorage(auditStorageKey, next);
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
    setProfileErrors((prev) => ({ ...prev, [name]: validateProfileField(name, value) }));
  };

  const saveProfile = (e) => {
    e.preventDefault();
    const { errors, valid } = validateAllProfile(profile);
    setProfileErrors(errors);
    if (!valid) return;

    const payload = { ...profile, updatedAt: nowIso() };
    setProfile(payload);
    writeLocalStorage(profileStorageKey, payload);
    addAudit('profile_updated', 'Personal details changed');
    window.alert('Personal details updated successfully.');
  };

  const handleCardNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 19);
    const formatted = raw.match(/.{1,4}/g)?.join(' ') || '';
    setPaymentForm((prev) => ({ ...prev, cardNumber: formatted }));
    setPaymentErrors((prev) => ({
      ...prev,
      cardNumber: validatePaymentField('cardNumber', formatted, isEditing),
    }));
  };

  const handleExpiryChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    const formatted = raw.length >= 3 ? `${raw.slice(0, 2)}/${raw.slice(2)}` : raw;
    setPaymentForm((prev) => ({ ...prev, expiry: formatted }));
    setPaymentErrors((prev) => ({
      ...prev,
      expiry: validatePaymentField('expiry', formatted, isEditing),
    }));
  };

  const handlePaymentChange = (e) => {
    const { name, value } = e.target;
    setPaymentForm((prev) => ({ ...prev, [name]: value }));
    if (name !== 'type') {
      setPaymentErrors((prev) => ({
        ...prev,
        [name]: validatePaymentField(name, value, isEditing),
      }));
    }
  };

  const savePaymentMethod = (e) => {
    e.preventDefault();
    const { errors, valid } = validateAllPayment(paymentForm, isEditing);
    setPaymentErrors(errors);
    if (!valid) return;

    const digits = (paymentForm.cardNumber || '').replace(/\D/g, '');
    const methodPayload = {
      id: editingId || Date.now(),
      type: paymentForm.type,
      cardHolder: paymentForm.cardHolder.trim(),
      last4: digits.slice(-4),
      maskedNumber: maskCard(digits.slice(-4)),
      expiry: paymentForm.expiry,
      billingZip: paymentForm.billingZip.trim(),
      updatedAt: nowIso(),
    };

    const nextMethods = isEditing
      ? paymentMethods.map((item) => (item.id === editingId ? methodPayload : item))
      : [...paymentMethods, methodPayload];

    setPaymentMethods(nextMethods);
    writeLocalStorage(paymentStorageKey, nextMethods);
    setPaymentForm(defaultPayment);
    setPaymentErrors(emptyPaymentErrors);
    setEditingId(null);
    addAudit(isEditing ? 'payment_updated' : 'payment_added', `${methodPayload.type} ending ${methodPayload.last4}`);

    window.alert(isEditing ? 'Payment method updated and saved.' : 'Payment method saved.');
  };

  const startEditPaymentMethod = (method) => {
    setEditingId(method.id);
    setPaymentErrors(emptyPaymentErrors);
    setPaymentForm({
      type: method.type || 'Card',
      cardHolder: method.cardHolder || '',
      cardNumber: '',
      expiry: method.expiry || '',
      billingZip: method.billingZip || '',
    });
  };

  const deletePaymentMethod = (id) => {
    const confirmed = window.confirm('Are you sure you want to delete these card details?');
    if (!confirmed) return;

    const nextMethods = paymentMethods.filter((item) => item.id !== id);
    setPaymentMethods(nextMethods);
    writeLocalStorage(paymentStorageKey, nextMethods);
    if (editingId === id) {
      setEditingId(null);
      setPaymentForm(defaultPayment);
      setPaymentErrors(emptyPaymentErrors);
    }
    addAudit('payment_removed', `Payment id ${id} removed`);
    window.alert('Payment method removed.');
  };

  const saveConsents = () => {
    const payload = { ...consents, essentialProcessing: true, updatedAt: nowIso() };
    setConsents(payload);
    writeLocalStorage(consentStorageKey, payload);
    addAudit('consent_updated', 'Consent preferences changed');
    setConsentMessage('Consent preferences saved.');
    setTimeout(() => setConsentMessage(''), 2500);
  };

  const exportData = () => {
    const dataPackage = { exportedAt: nowIso(), profile, paymentMethods, consents, auditLog };
    const blob = new Blob([JSON.stringify(dataPackage, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `customer-data-export-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    addAudit('data_exported', 'User exported personal data');
    setPrivacyMessage('Your data export has been downloaded.');
    setTimeout(() => setPrivacyMessage(''), 3000);
  };

  const clearLocalPortalData = () => {
    localStorage.removeItem(profileStorageKey);
    localStorage.removeItem(paymentStorageKey);
    localStorage.removeItem(consentStorageKey);
    localStorage.removeItem(auditStorageKey);

    setProfile(defaultProfile);
    setPaymentMethods([]);
    setConsents(defaultConsents);
    setAuditLog([]);
    setPaymentForm(defaultPayment);
    setPaymentErrors(emptyPaymentErrors);
    setProfileErrors(emptyProfileErrors);
    setEditingId(null);
    setConfirmDelete(false);
    setDeleteText('');
  };

  const deleteAllData = async () => {
    if (!confirmDelete || deleteText !== 'DELETE') {
      setPrivacyMessage('To proceed, tick confirmation and type DELETE.');
      setTimeout(() => setPrivacyMessage(''), 3000);
      return;
    }

    if (!process.env.REACT_APP_API_URL) {
      clearLocalPortalData();
      setPrivacyMessage('Backend account deletion is not configured in this environment. Local portal data was deleted.');
      setTimeout(() => setPrivacyMessage(''), 3500);
      return;
    }

    setIsDeletingAccount(true);
    setPrivacyMessage('');

    try {
      const response = await authFetch('/users/me', { method: 'DELETE' }, false);
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.detail || 'Unable to delete your account. Please try again or contact support.');
      }

      clearLocalPortalData();
      logout();
      navigate('/login?mode=customer-signin&reason=account-deleted', { replace: true });
      window.alert('Your account has been deleted.');
    } catch (error) {
      setPrivacyMessage(error.message || 'Unable to delete your account. Please try again or contact support.');
      setTimeout(() => setPrivacyMessage(''), 5000);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <section className="shell py-10">
      <Seo title="My Account" description="Manage your Elmshelf account, orders, and preferences." noindex />

      {selectedOrder && (
        <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}

      <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Customer account</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">Customer Portal</h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          Manage your personal data with GDPR-focused controls: update details, control consent, export your data,
          and delete stored data.
        </p>
      </div>

      {/* Order History */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-bold text-slate-900">Order History</h2>
        <p className="mt-1 text-sm text-slate-600">Your previous orders, most recent first.</p>

        {orders.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No orders placed yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="pb-3 pr-4">Order</th>
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Items</th>
                  <th className="pb-3 pr-4">Total</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="py-3 pr-4 font-semibold text-slate-900">#{order.id}</td>
                    <td className="py-3 pr-4 text-slate-600">{order.date}</td>
                    <td className="py-3 pr-4 text-slate-600">
                      {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                    </td>
                    <td className="py-3 pr-4 font-semibold text-slate-900">£{Number(order.amount).toFixed(2)}</td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[order.status] || 'bg-slate-100 text-slate-700'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="text-xs font-semibold text-blue-700 hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Personal details */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-bold text-slate-900">Personal details</h2>
          <p className="mt-2 text-sm text-slate-600">Keep your name and contact details accurate.</p>

          <form className="mt-5 space-y-4" onSubmit={saveProfile} noValidate>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Full name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="fullName"
                value={profile.fullName}
                onChange={handleProfileChange}
                className={inputCls(!!profileErrors.fullName)}
                placeholder="John Doe"
                aria-invalid={Boolean(profileErrors.fullName)}
                required
              />
              <FieldError msg={profileErrors.fullName} />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={profile.email}
                onChange={handleProfileChange}
                className={inputCls(!!profileErrors.email)}
                placeholder="john@example.com"
                aria-invalid={Boolean(profileErrors.email)}
                required
              />
              <FieldError msg={profileErrors.email} />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={profile.phone}
                onChange={handleProfileChange}
                className={inputCls(!!profileErrors.phone)}
                placeholder="+1 555 000 1234"
                aria-invalid={Boolean(profileErrors.phone)}
                required
              />
              <FieldError msg={profileErrors.phone} />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="address"
                value={profile.address || ''}
                onChange={handleProfileChange}
                className={inputCls(!!profileErrors.address)}
                placeholder="Street address"
                aria-invalid={Boolean(profileErrors.address)}
                required
              />
              <FieldError msg={profileErrors.address} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="city"
                  value={profile.city || ''}
                  onChange={handleProfileChange}
                  className={inputCls(!!profileErrors.city)}
                  placeholder="City"
                  aria-invalid={Boolean(profileErrors.city)}
                  required
                />
                <FieldError msg={profileErrors.city} />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  State <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="state"
                  value={profile.state || ''}
                  onChange={handleProfileChange}
                  className={inputCls(!!profileErrors.state)}
                  placeholder="State"
                  aria-invalid={Boolean(profileErrors.state)}
                  required
                />
                <FieldError msg={profileErrors.state} />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  ZIP Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="zipCode"
                  value={profile.zipCode || ''}
                  onChange={handleProfileChange}
                  className={inputCls(!!profileErrors.zipCode)}
                  placeholder="ZIP / postal"
                  aria-invalid={Boolean(profileErrors.zipCode)}
                  required
                />
                <FieldError msg={profileErrors.zipCode} />
              </div>
            </div>

            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-600"
            >
              Save personal updates
            </button>

          </form>
        </div>

        {/* Payment methods */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-bold text-slate-900">Payment methods</h2>
          <p className="mt-2 text-sm text-slate-600">Only masked card details are stored (last 4 digits).</p>

          <form className="mt-5 space-y-4" onSubmit={savePaymentMethod} noValidate>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Method type</label>
              <select
                name="type"
                value={paymentForm.type}
                onChange={handlePaymentChange}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              >
                <option>Card</option>
                <option>Debit Card</option>
                <option>Business Card</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Card holder name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="cardHolder"
                value={paymentForm.cardHolder}
                onChange={handlePaymentChange}
                className={inputCls(!!paymentErrors.cardHolder)}
                placeholder="John Doe"
              />
              <FieldError msg={paymentErrors.cardHolder} />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Card number <span className="text-red-500">*</span>
                {isEditing && <span className="ml-1 text-xs font-normal text-slate-500">(re-enter to update)</span>}
              </label>
              <input
                type="text"
                name="cardNumber"
                value={paymentForm.cardNumber}
                onChange={handleCardNumberChange}
                className={inputCls(!!paymentErrors.cardNumber)}
                placeholder={isEditing ? 'Re-enter card number' : '4111 1111 1111 1111'}
                inputMode="numeric"
                maxLength={23}
              />
              <FieldError msg={paymentErrors.cardNumber} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Expiry <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="expiry"
                  value={paymentForm.expiry}
                  onChange={handleExpiryChange}
                  className={inputCls(!!paymentErrors.expiry)}
                  placeholder="MM/YY"
                  inputMode="numeric"
                  maxLength={5}
                />
                <FieldError msg={paymentErrors.expiry} />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Billing ZIP <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="billingZip"
                  value={paymentForm.billingZip}
                  onChange={handlePaymentChange}
                  className={inputCls(!!paymentErrors.billingZip)}
                  placeholder="10001"
                />
                <FieldError msg={paymentErrors.billingZip} />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
              >
                {isEditing ? 'Update payment method' : 'Save payment method'}
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setPaymentForm(defaultPayment);
                    setPaymentErrors(emptyPaymentErrors);
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
                >
                  Cancel
                </button>
              )}
            </div>

          </form>
        </div>
      </div>

      {/* Saved payment methods */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-bold text-slate-900">Saved methods</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {paymentMethods.length > 0 ? (
            paymentMethods.map((method) => (
              <div key={method.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-900">{method.type}</p>
                <p className="mt-1 text-sm text-slate-600">{method.cardHolder}</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {method.maskedNumber || maskCard(method.last4)}
                </p>
                <p className="mt-1 text-xs text-slate-500">Exp: {method.expiry} | ZIP: {method.billingZip}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => startEditPaymentMethod(method)}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-bold text-white"
                  >
                    Update
                  </button>
                  <button
                    onClick={() => deletePaymentMethod(method.id)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-600">No payment methods saved yet.</p>
          )}
        </div>
      </div>

      {/* Consent preferences */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-bold text-slate-900">Consent preferences</h3>
        <p className="mt-1 text-sm text-slate-600">
          Essential processing is required for orders. Optional consent can be changed at any time.
        </p>

        <div className="mt-4 space-y-3 text-sm text-slate-700">
          <label className="flex items-center gap-3">
            <input type="checkbox" checked disabled className="h-4 w-4" />
            Essential account and order processing (required)
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={consents.marketingEmails}
              onChange={(e) => setConsents((prev) => ({ ...prev, marketingEmails: e.target.checked }))}
              className="h-4 w-4"
            />
            Marketing emails and promotions
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={consents.analyticsTracking}
              onChange={(e) => setConsents((prev) => ({ ...prev, analyticsTracking: e.target.checked }))}
              className="h-4 w-4"
            />
            Analytics tracking for service improvement
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={consents.personalizedOffers}
              onChange={(e) => setConsents((prev) => ({ ...prev, personalizedOffers: e.target.checked }))}
              className="h-4 w-4"
            />
            Personalized recommendations and offers
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={saveConsents}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-600"
          >
            Save consent choices
          </button>
          <p className="text-xs text-slate-500">
            Last updated: {consents.updatedAt ? new Date(consents.updatedAt).toLocaleString() : 'Not set'}
          </p>
        </div>

        {consentMessage && (
          <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
            {consentMessage}
          </p>
        )}
      </div>

      {/* Privacy & data rights */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-bold text-slate-900">Privacy &amp; data rights</h3>
        <p className="mt-2 text-sm text-slate-600">
          You can export your data (right of access/portability) and delete your customer account (right to erasure).
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={exportData}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
          >
            Export my data
          </button>
          <a
            href="mailto:privacy@elmshelf.com"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Contact privacy team
          </a>
        </div>

        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-bold text-red-700">Delete customer account</p>
          <p className="mt-1 text-sm text-red-700">
            This deactivates your login, removes local portal data, deletes your cart and reviews, and anonymizes personal details kept with order history.
          </p>
          <div className="mt-3 space-y-3">
            <label className="flex items-center gap-2 text-sm text-red-700">
              <input
                type="checkbox"
                checked={confirmDelete}
                onChange={(e) => setConfirmDelete(e.target.checked)}
                className="h-4 w-4"
              />
              I understand this action cannot be undone.
            </label>
            <input
              type="text"
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
            />
            <button
              onClick={deleteAllData}
              disabled={isDeletingAccount}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-red-300"
            >
              {isDeletingAccount ? 'Deleting account...' : 'Delete my account'}
            </button>
          </div>
        </div>

        {privacyMessage && (
          <p className="mt-3 rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
            {privacyMessage}
          </p>
        )}
      </div>

      {/* Recent privacy activity */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-bold text-slate-900">Recent privacy activity</h3>
        {auditLog.length > 0 ? (
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            {auditLog.slice(0, 8).map((entry) => (
              <li key={entry.id} className="rounded-md bg-slate-50 px-3 py-2">
                <span className="font-semibold text-slate-800">{entry.action}</span>
                {entry.detail ? ` - ${entry.detail}` : ''}
                <span className="ml-2 text-xs text-slate-500">({new Date(entry.at).toLocaleString()})</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-600">No privacy actions recorded yet.</p>
        )}
      </div>
    </section>
  );
}

export default CustomerPortal;
