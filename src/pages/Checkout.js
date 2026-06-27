import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useCart } from '../context/CartContext';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import UiIcon from '../components/UiIcon';
import Seo from '../components/Seo';

const stripePromise = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY)
  : null;

const PROFILE_KEY = 'customerProfile';
const DELIVERY_MODE_LABELS = {
  ship: 'Ship to address',
  pickup: 'Pickup from store',
};
const getUserStorageKey = (key, userId) => `${key}:${userId || 'guest'}`;

function readLocalStorage(key, fallback) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function splitFullName(fullName = '') {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

const emptyShippingErrors = {
  firstName: '', lastName: '', email: '', phone: '',
  address: '', city: '', state: '', zipCode: '',
};

function validateCheckoutShippingField(name, value) {
  const trimmedValue = (value || '').trim();
  switch (name) {
    case 'firstName':
    case 'lastName':
      if (!trimmedValue) return `${name === 'firstName' ? 'First' : 'Last'} name is required.`;
      if (trimmedValue.length < 2 || !/^[a-zA-Z\s'-]+$/.test(trimmedValue)) return 'Enter a valid name.';
      return '';
    case 'email':
      if (!trimmedValue) return 'Email is required.';
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue) ? '' : 'Enter a valid email address.';
    case 'phone': {
      if (!trimmedValue) return 'Phone number is required.';
      const digits = trimmedValue.replace(/\D/g, '');
      return digits.length >= 7 && digits.length <= 15 ? '' : 'Enter a valid phone number (7–15 digits).';
    }
    case 'address':
      if (!trimmedValue) return 'Street address is required.';
      return trimmedValue.length >= 5 && trimmedValue.length <= 120
        ? '' : 'Enter a street address between 5 and 120 characters.';
    case 'city':
      if (!trimmedValue) return 'City is required.';
      return trimmedValue.length >= 2 && /^[a-zA-Z\s.'-]+$/.test(trimmedValue) ? '' : 'Enter a valid city.';
    case 'state':
      if (!trimmedValue) return '';
      return trimmedValue.length <= 60 && /^[a-zA-Z\s.'-]+$/.test(trimmedValue)
        ? '' : 'Enter a valid state or county.';
    case 'zipCode':
      if (!trimmedValue) return 'ZIP / postal code is required.';
      return /^[a-zA-Z0-9][a-zA-Z0-9\s-]{1,9}$/.test(trimmedValue)
        ? '' : 'Enter a valid ZIP / postal code.';
    default:
      return '';
  }
}

function validateCheckoutShipping(shipping) {
  const addressFields = ['address', 'city', 'state', 'zipCode'];
  const isPickup = shipping.deliveryMode === 'pickup';
  const errors = Object.fromEntries(
    Object.keys(emptyShippingErrors).map((field) => [
      field,
      isPickup && addressFields.includes(field)
        ? ''
        : validateCheckoutShippingField(field, shipping[field]),
    ])
  );
  return { errors, valid: Object.values(errors).every((e) => !e) };
}

function buildOrderNotes(deliveryMode, deliveryNote) {
  const note = deliveryNote.trim();
  return [
    `Delivery mode: ${DELIVERY_MODE_LABELS[deliveryMode] || DELIVERY_MODE_LABELS.ship}`,
    note ? `Delivery note: ${note}` : '',
  ].filter(Boolean).join('\n');
}

function inputClass(hasError) {
  return `w-full rounded-lg border-2 px-4 py-3 focus:outline-none ${
    hasError
      ? 'border-red-400 bg-red-50 focus:border-red-500'
      : 'border-gray-300 focus:border-primary'
  }`;
}

function FieldError({ message }) {
  return message
    ? <p className="mt-1 text-sm font-medium text-red-600" role="alert">{message}</p>
    : null;
}

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#374151',
      fontFamily: 'inherit',
      '::placeholder': { color: '#9ca3af' },
    },
    invalid: { color: '#ef4444', iconColor: '#ef4444' },
  },
};

function CheckoutForm() {
  const navigate = useNavigate();
  const { getSelectedCartItems, getSelectedTotalPrice, removeFromCart, loadCart } = useCart();
  const { placeOrder, loadOrders } = useOrders();
  const { user, authFetch } = useAuth();
  const stripe = useStripe();
  const elements = useElements();

  const profileStorageKey = getUserStorageKey(PROFILE_KEY, user?.id);

  const [formData, setFormData] = useState(() => {
    const savedProfile = readLocalStorage(profileStorageKey, {});
    const savedName = splitFullName(savedProfile.fullName || user?.name || '');
    return {
      firstName: savedName.firstName,
      lastName: savedName.lastName,
      email: savedProfile.email || user?.email || '',
      phone: savedProfile.phone || user?.phone || '',
      address: savedProfile.address || '',
      city: savedProfile.city || '',
      state: savedProfile.state || '',
      zipCode: savedProfile.zipCode || '',
      deliveryMode: 'ship',
      deliveryNote: '',
    };
  });

  const [orderPlaced, setOrderPlaced] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [shippingErrors, setShippingErrors] = useState(emptyShippingErrors);

  const checkoutItems = getSelectedCartItems();
  const subtotal = getSelectedTotalPrice();
  const taxRate = 0.1;
  const taxAmount = subtotal * taxRate;
  const shippingFee = 0;
  const totalWithTax = subtotal + taxAmount + shippingFee;
  const requiresBackendCheckout = Boolean(process.env.REACT_APP_API_URL);

  useEffect(() => {
    if (requiresBackendCheckout && !user && checkoutItems.length > 0) {
      navigate('/login?mode=customer-signin&redirect=%2Fcheckout', { replace: true });
    }
  }, [checkoutItems.length, navigate, requiresBackendCheckout, user]);

  useEffect(() => {
    if (!requiresBackendCheckout || !user) return;
    let cancelled = false;
    const loadSavedAddress = async () => {
      try {
        const response = await authFetch('/users/me/addresses');
        const addresses = await response.json().catch(() => []);
        if (!response.ok || !Array.isArray(addresses) || addresses.length === 0 || cancelled) return;
        const savedAddress = addresses.find((a) => a.is_default) || addresses[addresses.length - 1];
        setFormData((prev) => ({
          ...prev,
          address: prev.address || savedAddress.address_line1 || '',
          city: prev.city || savedAddress.city || '',
          state: prev.state || savedAddress.state || '',
          zipCode: prev.zipCode || savedAddress.postal_code || '',
          phone: prev.phone || savedAddress.phone || '',
        }));
      } catch {
        // Checkout can still continue with manually entered address details.
      }
    };
    loadSavedAddress();
    return () => { cancelled = true; };
  }, [authFetch, requiresBackendCheckout, user]);

  if (requiresBackendCheckout && !user && checkoutItems.length > 0) return null;

  if (checkoutItems.length === 0 && !orderPlaced) {
    return (
      <div className="container mx-auto px-4 py-16 text-center sm:px-8">
        <Seo title="Checkout" description="Complete your Elmshelf checkout securely." noindex />
        <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-4">Checkout</h1>
        <p className="text-lg text-gray-600 mb-6">Select at least one cart item before checkout.</p>
        <button
          onClick={() => navigate('/')}
          className="bg-primary text-white px-8 py-3 rounded-lg hover:bg-red-700 transition font-semibold"
        >
          Back to Home
        </button>
      </div>
    );
  }

  if (user && !user.isEmailVerified) {
    return (
      <div className="container mx-auto px-4 py-16 text-center sm:px-8">
        <Seo title="Checkout" description="Complete your Elmshelf checkout securely." noindex />
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">Verify Your Email</h1>
        <p className="text-lg text-gray-600 mb-2">
          You need to verify your email address before placing an order.
        </p>
        <p className="text-sm text-gray-500 mb-8">
          Check your inbox for the verification link, or go to your account to resend it.
        </p>
        <Link
          to="/customer-portal"
          className="inline-block bg-primary text-white px-8 py-3 rounded-lg hover:bg-red-700 transition font-semibold"
        >
          Go to My Account
        </Link>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSubmitError('');
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (Object.hasOwn(emptyShippingErrors, name)) {
      setShippingErrors((prev) => ({ ...prev, [name]: validateCheckoutShippingField(name, value) }));
    }
    if (name === 'deliveryMode') {
      setShippingErrors(validateCheckoutShipping({ ...formData, deliveryMode: value }).errors);
    }
  };

  const buildOrderPayload = () => {
    const fullName = `${formData.firstName} ${formData.lastName}`.trim();
    return {
      customerId: user?.id ?? null,
      customerFirstName: formData.firstName,
      customerLastName: formData.lastName,
      customer: fullName || formData.firstName,
      customerEmail: formData.email,
      customerPhone: formData.phone,
      shippingAddress: {
        address: formData.deliveryMode === 'pickup' ? 'Pickup from store' : formData.address,
        city: formData.deliveryMode === 'pickup' ? '' : formData.city,
        state: formData.deliveryMode === 'pickup' ? '' : formData.state,
        zipCode: formData.deliveryMode === 'pickup' ? '' : formData.zipCode,
      },
      deliveryMode: formData.deliveryMode,
      deliveryNote: formData.deliveryNote.trim(),
      notes: buildOrderNotes(formData.deliveryMode, formData.deliveryNote),
      amount: totalWithTax,
      pricing: { subtotal, taxRate, taxAmount, shippingFee, total: totalWithTax },
      payment: { method: 'Stripe' },
      items: checkoutItems.map((item) => ({
        lineId: item.lineId,
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.salePrice || item.price,
        selectedAttributes: item.selectedAttributes || null,
        selectedColor: item.selectedColor || null,
        selectedSize: item.selectedSize || null,
      })),
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    const shippingValidation = validateCheckoutShipping(formData);
    setShippingErrors(shippingValidation.errors);
    if (!shippingValidation.valid) {
      const firstError = Object.values(shippingValidation.errors).find(Boolean);
      window.alert(firstError || 'Please complete all required checkout fields.');
      return;
    }

    if (requiresBackendCheckout && (!user || user.role !== 'user')) {
      setSubmitError('Please sign in with a customer account before checking out.');
      navigate('/login?mode=customer-signin');
      return;
    }

    if (requiresBackendCheckout) {
      setSubmitting(true);
      try {
        const orderPayload = buildOrderPayload();

        // 1. Save shipping address
        const addressResponse = await authFetch('/users/me/addresses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: orderPayload.customer,
            phone: orderPayload.customerPhone || 'N/A',
            address_line1: orderPayload.deliveryMode === 'pickup'
              ? 'Pickup from store'
              : orderPayload.shippingAddress.address,
            address_line2: null,
            city: orderPayload.deliveryMode === 'pickup'
              ? 'Store pickup'
              : (orderPayload.shippingAddress.city || '-'),
            state: orderPayload.deliveryMode === 'pickup'
              ? '-'
              : (orderPayload.shippingAddress.state || '-'),
            postal_code: orderPayload.deliveryMode === 'pickup'
              ? '-'
              : (orderPayload.shippingAddress.zipCode || '-'),
            country: 'GB',
            is_default: false,
          }),
        });
        const addressData = await addressResponse.json().catch(() => null);
        if (!addressResponse.ok) {
          throw new Error(addressData?.detail || 'Unable to save your shipping address');
        }

        // 2. Create order
        const orderResponse = await authFetch('/orders/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address_id: addressData.id,
            delivery_mode: orderPayload.deliveryMode,
            delivery_note: orderPayload.deliveryNote || null,
            notes: orderPayload.notes,
            cart_item_ids: checkoutItems.map((item) => item.cartItemId),
          }),
        });
        const orderData = await orderResponse.json().catch(() => null);
        if (!orderResponse.ok) {
          throw new Error(orderData?.detail || 'Unable to place your order');
        }

        // 3. Create Stripe PaymentIntent
        const intentResponse = await authFetch(`/payments/create-payment-intent/${orderData.id}`, {
          method: 'POST',
        });
        const intentData = await intentResponse.json().catch(() => null);
        if (!intentResponse.ok) {
          throw new Error(intentData?.detail || 'Unable to initialize payment');
        }

        // 4. Confirm card payment with Stripe
        const cardElement = elements.getElement(CardElement);
        const { error: stripeError } = await stripe.confirmCardPayment(intentData.client_secret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: orderPayload.customer,
              email: orderPayload.customerEmail,
              phone: orderPayload.customerPhone,
            },
          },
        });

        if (stripeError) {
          throw new Error(stripeError.message);
        }

        // 5. Payment succeeded — update local state and redirect
        const createdOrder = placeOrder({ ...orderPayload, id: orderData?.id });

        const savedProfile = readLocalStorage(profileStorageKey, {});
        localStorage.setItem(profileStorageKey, JSON.stringify({
          ...savedProfile,
          fullName: orderPayload.customer,
          email: orderPayload.customerEmail,
          phone: orderPayload.customerPhone,
          ...(orderPayload.deliveryMode === 'ship'
            ? {
                address: orderPayload.shippingAddress.address,
                city: orderPayload.shippingAddress.city,
                state: orderPayload.shippingAddress.state,
                zipCode: orderPayload.shippingAddress.zipCode,
              }
            : {}),
          updatedAt: new Date().toISOString(),
        }));

        await loadCart().catch(() => {});
        await loadOrders().catch(() => {});
        setPlacedOrder(createdOrder);
        setOrderPlaced(true);
      } catch (error) {
        const message = error.message || 'Unable to place your order';
        setSubmitError(message);
        if (message === 'Cart is empty') {
          window.alert('Your cart is empty. Please add at least one item before placing an order.');
        }
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Non-backend demo mode — no real payment
    const orderPayload = buildOrderPayload();
    const createdOrder = placeOrder(orderPayload);
    const savedProfile = readLocalStorage(profileStorageKey, {});
    localStorage.setItem(profileStorageKey, JSON.stringify({
      ...savedProfile,
      fullName: orderPayload.customer,
      email: orderPayload.customerEmail,
      phone: orderPayload.customerPhone,
      ...(orderPayload.deliveryMode === 'ship'
        ? {
            address: orderPayload.shippingAddress.address,
            city: orderPayload.shippingAddress.city,
            state: orderPayload.shippingAddress.state,
            zipCode: orderPayload.shippingAddress.zipCode,
          }
        : {}),
      updatedAt: new Date().toISOString(),
    }));
    setPlacedOrder(createdOrder);
    setOrderPlaced(true);
    for (const item of checkoutItems) {
      await removeFromCart(item.lineId);
    }
  };

  if (orderPlaced) {
    return (
      <div className="container mx-auto px-4 py-16 text-center sm:px-8">
        <Seo title="Order Confirmed" description="Your Elmshelf order has been confirmed." noindex />
        <div className="max-w-md mx-auto bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-500 rounded-xl p-12 shadow-xl">
          <div className="mb-6 flex justify-center animate-bounce">
            <UiIcon name="check" className="h-14 w-14 text-green-700" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-green-700 mb-4">Order Confirmed!</h1>
          <p className="text-gray-700 mb-4 text-lg">
            Thank you for your purchase. Your order has been successfully placed.
          </p>
          <div className="bg-white p-4 rounded-lg mb-6 text-sm text-gray-600">
            <p className="mb-2"><strong>Order ID:</strong> #{placedOrder?.id}</p>
            {placedOrder?.orderTime && (
              <p className="mb-2"><strong>Placed at:</strong> {placedOrder.orderTime}</p>
            )}
            <p className="mb-2"><strong>Confirmation email:</strong> {formData.email}</p>
            <p>
              <strong>Delivery:</strong>{' '}
              {DELIVERY_MODE_LABELS[placedOrder?.deliveryMode] || DELIVERY_MODE_LABELS.ship}
            </p>
            {placedOrder?.deliveryNote && (
              <p className="mt-2"><strong>Note:</strong> {placedOrder.deliveryNote}</p>
            )}
          </div>
          <p className="text-gray-600 mb-8">
            Check your email for order details and tracking information.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition font-semibold"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  const isSubmitDisabled = submitting || (requiresBackendCheckout && !stripe);

  return (
    <div className="container mx-auto px-4 py-8 sm:px-8">
      <Seo title="Checkout" description="Complete your Elmshelf checkout securely." noindex />
      <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Checkout Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6" noValidate>
          {submitError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          {/* Delivery Options */}
          <div className="bg-white p-8 rounded-xl shadow-md">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-primary">
              <UiIcon name="truck" className="h-6 w-6" />
              Delivery Options
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <label
                className={`cursor-pointer rounded-xl border-2 p-4 transition ${
                  formData.deliveryMode === 'ship'
                    ? 'border-primary bg-red-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="deliveryMode"
                  value="ship"
                  checked={formData.deliveryMode === 'ship'}
                  onChange={handleChange}
                  className="sr-only"
                />
                <span className="block text-base font-bold text-gray-900">Ship to address</span>
                <span className="mt-1 block text-sm text-gray-600">
                  We will deliver the order to your address.
                </span>
              </label>

              <label
                className={`cursor-pointer rounded-xl border-2 p-4 transition ${
                  formData.deliveryMode === 'pickup'
                    ? 'border-primary bg-red-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="deliveryMode"
                  value="pickup"
                  checked={formData.deliveryMode === 'pickup'}
                  onChange={handleChange}
                  className="sr-only"
                />
                <span className="block text-base font-bold text-gray-900">Pickup from store</span>
                <span className="mt-1 block text-sm text-gray-600">
                  We will prepare the order for collection.
                </span>
              </label>
            </div>

            <div className="mt-5">
              <label className="block text-gray-700 font-semibold mb-2">
                Delivery Note (optional)
              </label>
              <textarea
                name="deliveryNote"
                value={formData.deliveryNote}
                onChange={handleChange}
                rows={4}
                maxLength={500}
                placeholder="Add any delivery or pickup instructions"
                className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 focus:border-primary focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-500">{formData.deliveryNote.length}/500 characters</p>
            </div>
          </div>

          {/* Shipping / Contact Information */}
          <div className="bg-white p-8 rounded-xl shadow-md">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-primary">
              <UiIcon name="users" className="h-6 w-6" />
              {formData.deliveryMode === 'pickup' ? 'Contact Information' : 'Shipping Information'}
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={inputClass(shippingErrors.firstName)}
                  aria-invalid={Boolean(shippingErrors.firstName)}
                  required
                />
                <FieldError message={shippingErrors.firstName} />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={inputClass(shippingErrors.lastName)}
                  aria-invalid={Boolean(shippingErrors.lastName)}
                  required
                />
                <FieldError message={shippingErrors.lastName} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={inputClass(shippingErrors.email)}
                  aria-invalid={Boolean(shippingErrors.email)}
                  required
                />
                <FieldError message={shippingErrors.email} />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Phone *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={inputClass(shippingErrors.phone)}
                  inputMode="tel"
                  aria-invalid={Boolean(shippingErrors.phone)}
                  required
                />
                <FieldError message={shippingErrors.phone} />
              </div>
            </div>

            {formData.deliveryMode === 'ship' && (
              <>
                <div className="mt-4">
                  <label className="block text-gray-700 font-semibold mb-2">Address *</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className={inputClass(shippingErrors.address)}
                    aria-invalid={Boolean(shippingErrors.address)}
                    required
                  />
                  <FieldError message={shippingErrors.address} />
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">City *</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className={inputClass(shippingErrors.city)}
                      aria-invalid={Boolean(shippingErrors.city)}
                      required
                    />
                    <FieldError message={shippingErrors.city} />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">
                      State / County (optional)
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className={inputClass(shippingErrors.state)}
                      aria-invalid={Boolean(shippingErrors.state)}
                    />
                    <FieldError message={shippingErrors.state} />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">ZIP Code *</label>
                    <input
                      type="text"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleChange}
                      className={inputClass(shippingErrors.zipCode)}
                      aria-invalid={Boolean(shippingErrors.zipCode)}
                      required
                    />
                    <FieldError message={shippingErrors.zipCode} />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Payment Information — Stripe Elements */}
          <div className="bg-white p-8 rounded-xl shadow-md">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-primary">
              <UiIcon name="payment" className="h-6 w-6" />
              Payment Information
            </h2>

            {requiresBackendCheckout ? (
              <>
                <label className="block text-gray-700 font-semibold mb-2">Card Details *</label>
                <div className="rounded-lg border-2 border-gray-300 px-4 py-4 focus-within:border-primary transition-colors">
                  <CardElement options={CARD_ELEMENT_OPTIONS} />
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
                  <svg className="h-4 w-4 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Secured by Stripe. Your card details are never stored on our servers.
                </p>
              </>
            ) : (
              <div className="rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                Demo mode — no payment is processed.
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/cart')}
              className="flex-1 border-2 border-primary text-primary py-3 rounded-lg font-bold hover:bg-primary hover:text-white transition"
            >
              Back to Cart
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="flex-1 bg-accent text-primary py-3 rounded-lg font-bold hover:bg-yellow-600 transition shadow-md hover:shadow-lg disabled:opacity-60"
            >
              {submitting ? 'Processing Payment...' : 'Place Order & Pay'}
            </button>
          </div>
        </form>

        {/* Order Summary */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-8 rounded-xl shadow-lg h-fit sticky top-24">
          <h2 className="text-2xl font-bold text-primary mb-6">Order Summary</h2>

          <div className="space-y-3 mb-6 pb-6 border-b border-gray-300 max-h-64 overflow-y-auto">
            {checkoutItems.map((item) => {
              const selectedAttributeLabels =
                item.selectedAttributes && Object.keys(item.selectedAttributes).length > 0
                  ? Object.entries(item.selectedAttributes).map(([k, v]) => `${k}: ${v}`)
                  : [
                      item.selectedColor ? `Color: ${item.selectedColor}` : null,
                      item.selectedSize ? `Size: ${item.selectedSize}` : null,
                    ].filter(Boolean);

              return (
                <div
                  key={item.lineId || `${item.id}-${item.selectedColor || ''}-${item.selectedSize || ''}`}
                  className="flex justify-between text-sm bg-white p-3 rounded-lg"
                >
                  <span className="text-gray-700">
                    <strong>{item.name}</strong> × {item.quantity}
                    {selectedAttributeLabels.length > 0 && (
                      <span className="block text-xs text-gray-500 mt-1">
                        {selectedAttributeLabels.join(' | ')}
                      </span>
                    )}
                  </span>
                  <span className="font-bold text-primary">
                    £{((item.salePrice || item.price) * item.quantity).toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="space-y-3 mb-6 pb-6 border-b border-gray-300">
            <div className="flex justify-between gap-4 text-gray-700">
              <span>Delivery:</span>
              <span className="text-right font-semibold">
                {DELIVERY_MODE_LABELS[formData.deliveryMode]}
              </span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Subtotal:</span>
              <span className="font-semibold">£{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Shipping:</span>
              <span className="font-semibold text-green-600">Free</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Tax (10%):</span>
              <span className="font-semibold">£{taxAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-between text-xl font-bold text-primary bg-white p-4 rounded-lg">
            <span>Total:</span>
            <span>£{totalWithTax.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Checkout() {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm />
    </Elements>
  );
}

export default Checkout;
