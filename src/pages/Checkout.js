import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import UiIcon from '../components/UiIcon';
import Seo from '../components/Seo';

const PROFILE_KEY = 'customerProfile';
const PAYMENT_KEY = 'customerPaymentMethods';
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
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

function getSavedPaymentCardNumber(paymentMethod = null) {
  if (!paymentMethod) return '';
  return paymentMethod.maskedNumber || (paymentMethod.last4 ? `**** **** **** ${paymentMethod.last4}` : '');
}

const emptyPaymentErrors = { cardNumber: '', expiryDate: '', cvv: '' };
const emptyShippingErrors = { firstName: '', lastName: '', email: '', phone: '', address: '', city: '', state: '', zipCode: '' };

function luhnCheck(cardNumber) {
  let sum = 0;
  let shouldDouble = false;

  for (let index = cardNumber.length - 1; index >= 0; index -= 1) {
    let digit = Number(cardNumber[index]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

function isMaskedCardNumber(value = '') {
  return /^(?:\*{4}\s*){3}\d{4}$/.test(value.trim());
}

function validateCheckoutPayment(payment) {
  const cardNumber = payment.cardNumber.trim();
  const cardDigits = cardNumber.replace(/\D/g, '');
  let cardNumberError = '';
  if (!isMaskedCardNumber(cardNumber)) {
    if (cardDigits.length < 13 || cardDigits.length > 19 || /^(\d)\1+$/.test(cardDigits) || !luhnCheck(cardDigits)) {
      cardNumberError = 'Enter a valid card number.';
    }
  }

  const expiry = payment.expiryDate.trim();
  let expiryDateError = '';
  if (!/^\d{2}\/\d{2}$/.test(expiry)) {
    expiryDateError = 'Enter expiry as MM/YY.';
  } else {
    const [month, year] = expiry.split('/').map(Number);
    const expiryEnd = new Date(2000 + year, month);
    if (month < 1 || month > 12) expiryDateError = 'Expiry month must be 01–12.';
    else if (expiryEnd <= new Date()) expiryDateError = 'This card has expired.';
  }

  const cvv = payment.cvv.trim();
  const cvvError = /^\d{3,4}$/.test(cvv) ? '' : 'Enter a valid 3 or 4 digit CVV.';
  const errors = { cardNumber: cardNumberError, expiryDate: expiryDateError, cvv: cvvError };
  return { errors, valid: Object.values(errors).every((error) => !error) };
}

function paymentInputClass(hasError) {
  return `w-full rounded-lg border-2 px-4 py-3 focus:outline-none ${
    hasError ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-gray-300 focus:border-primary'
  }`;
}

function PaymentFieldError({ message }) {
  return message ? <p className="mt-1 text-sm font-medium text-red-600" role="alert">{message}</p> : null;
}

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
      if (!trimmedValue) return '';
      const digits = trimmedValue.replace(/\D/g, '');
      return digits.length >= 7 && digits.length <= 15 ? '' : 'Enter a valid phone number (7–15 digits).';
    }
    case 'address':
      if (!trimmedValue) return 'Street address is required.';
      return trimmedValue.length >= 5 && trimmedValue.length <= 120 ? '' : 'Enter a street address between 5 and 120 characters.';
    case 'city':
      if (!trimmedValue) return 'City is required.';
      return trimmedValue.length >= 2 && /^[a-zA-Z\s.'-]+$/.test(trimmedValue) ? '' : 'Enter a valid city.';
    case 'state':
      if (!trimmedValue) return '';
      return trimmedValue.length <= 60 && /^[a-zA-Z\s.'-]+$/.test(trimmedValue) ? '' : 'Enter a valid state or county.';
    case 'zipCode':
      if (!trimmedValue) return 'ZIP / postal code is required.';
      return /^[a-zA-Z0-9][a-zA-Z0-9\s-]{1,9}$/.test(trimmedValue) ? '' : 'Enter a valid ZIP / postal code.';
    default:
      return '';
  }
}

function validateCheckoutShipping(shipping) {
  const errors = Object.fromEntries(
    Object.keys(emptyShippingErrors).map((field) => [field, validateCheckoutShippingField(field, shipping[field])])
  );
  return { errors, valid: Object.values(errors).every((error) => !error) };
}

function shippingInputClass(hasError) {
  return `w-full rounded-lg border-2 px-4 py-3 focus:outline-none ${
    hasError ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-gray-300 focus:border-primary'
  }`;
}

function Checkout() {
  const navigate = useNavigate();
  const { getSelectedCartItems, getSelectedTotalPrice, removeFromCart, loadCart } = useCart();
  const { placeOrder, loadOrders } = useOrders();
  const { user, authFetch } = useAuth();
  const profileStorageKey = getUserStorageKey(PROFILE_KEY, user?.id);
  const paymentStorageKey = getUserStorageKey(PAYMENT_KEY, user?.id);
  const [formData, setFormData] = useState(() => {
    const savedProfile = readLocalStorage(profileStorageKey, {});
    const savedPayments = readLocalStorage(paymentStorageKey, []);
    const savedPayment = Array.isArray(savedPayments) ? savedPayments[0] : null;
    const savedName = splitFullName(savedProfile.fullName || user?.name || '');

    return {
      firstName: savedName.firstName,
      lastName: savedName.lastName,
      email: savedProfile.email || user?.email || '',
      phone: savedProfile.phone || user?.phone || '',
      address: savedProfile.address || '',
      city: savedProfile.city || '',
      state: savedProfile.state || '',
      zipCode: savedProfile.zipCode || savedPayment?.billingZip || '',
      cardNumber: getSavedPaymentCardNumber(savedPayment),
      expiryDate: savedPayment?.expiry || '',
      cvv: '',
    };
  });

  const [orderPlaced, setOrderPlaced] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [paymentErrors, setPaymentErrors] = useState(emptyPaymentErrors);
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

        const savedAddress = addresses.find((address) => address.is_default) || addresses[addresses.length - 1];
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

    return () => {
      cancelled = true;
    };
  }, [authFetch, requiresBackendCheckout, user]);

  if (requiresBackendCheckout && !user && checkoutItems.length > 0) {
    return null;
  }

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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">Verify Your Email</h1>
        <p className="text-lg text-gray-600 mb-2">You need to verify your email address before placing an order.</p>
        <p className="text-sm text-gray-500 mb-8">Check your inbox for the verification link, or go to your account to resend it.</p>
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
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (Object.hasOwn(emptyShippingErrors, name)) {
      setShippingErrors((prev) => ({ ...prev, [name]: validateCheckoutShippingField(name, value) }));
    }
  };

  const handleCardNumberChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 19);
    const cardNumber = digits.match(/.{1,4}/g)?.join(' ') || '';
    setFormData((prev) => ({ ...prev, cardNumber }));
    setPaymentErrors((prev) => ({
      ...prev,
      cardNumber: validateCheckoutPayment({ ...formData, cardNumber }).errors.cardNumber,
    }));
  };

  const handleExpiryDateChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
    const expiryDate = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
    setFormData((prev) => ({ ...prev, expiryDate }));
    setPaymentErrors((prev) => ({
      ...prev,
      expiryDate: validateCheckoutPayment({ ...formData, expiryDate }).errors.expiryDate,
    }));
  };

  const handleCvvChange = (e) => {
    const cvv = e.target.value.replace(/\D/g, '').slice(0, 4);
    setFormData((prev) => ({ ...prev, cvv }));
    setPaymentErrors((prev) => ({
      ...prev,
      cvv: validateCheckoutPayment({ ...formData, cvv }).errors.cvv,
    }));
  };

  const buildOrderPayload = () => {
    const fullName = `${formData.firstName} ${formData.lastName}`.trim();
    const sanitizedCardDigits = formData.cardNumber.replace(/\D/g, '');
    const cardLast4 = sanitizedCardDigits.slice(-4);

    return {
      customerId: user?.id ?? null,
      customerFirstName: formData.firstName,
      customerLastName: formData.lastName,
      customer: fullName || formData.firstName,
      customerEmail: formData.email,
      customerPhone: formData.phone,
      shippingAddress: {
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
      },
      amount: totalWithTax,
      pricing: {
        subtotal,
        taxRate,
        taxAmount,
        shippingFee,
        total: totalWithTax,
      },
      payment: {
        method: 'Card',
        cardLast4: cardLast4 || '',
        expiryDate: formData.expiryDate || '',
      },
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
    const paymentValidation = validateCheckoutPayment(formData);
    setPaymentErrors(paymentValidation.errors);
    if (!shippingValidation.valid || !paymentValidation.valid) return;

    if (requiresBackendCheckout && (!user || user.role !== 'user')) {
      setSubmitError('Please sign in with a customer account before checking out.');
      navigate('/login?mode=customer-signin');
      return;
    }

    if (requiresBackendCheckout) {
      setSubmitting(true);
      try {
        const orderPayload = buildOrderPayload();
        const addressResponse = await authFetch('/users/me/addresses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            full_name: orderPayload.customer,
            phone: orderPayload.customerPhone || 'N/A',
            address_line1: orderPayload.shippingAddress.address,
            address_line2: null,
            city: orderPayload.shippingAddress.city || '-',
            state: orderPayload.shippingAddress.state || '-',
            postal_code: orderPayload.shippingAddress.zipCode || '-',
            country: 'GB',
            is_default: false,
          }),
        });
        const addressData = await addressResponse.json().catch(() => null);
        if (!addressResponse.ok) {
          throw new Error(addressData?.detail || 'Unable to save your shipping address');
        }

        const orderResponse = await authFetch('/orders/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            address_id: addressData.id,
            notes: '',
            cart_item_ids: checkoutItems.map((item) => item.cartItemId),
          }),
        });
        const orderData = await orderResponse.json().catch(() => null);
        if (!orderResponse.ok) {
          throw new Error(orderData?.detail || 'Unable to place your order');
        }

        const createdOrder = placeOrder({
          ...orderPayload,
          id: orderData?.id,
        });

        const savedProfile = readLocalStorage(profileStorageKey, {});
        localStorage.setItem(profileStorageKey, JSON.stringify({
          ...savedProfile,
          fullName: orderPayload.customer,
          email: orderPayload.customerEmail,
          phone: orderPayload.customerPhone,
          address: orderPayload.shippingAddress.address,
          city: orderPayload.shippingAddress.city,
          state: orderPayload.shippingAddress.state,
          zipCode: orderPayload.shippingAddress.zipCode,
          updatedAt: new Date().toISOString(),
        }));

        await loadCart().catch(() => {});
        await loadOrders().catch(() => {});
        setPlacedOrder(createdOrder);
        setOrderPlaced(true);
        return;
      } catch (error) {
        setSubmitError(error.message || 'Unable to place your order');
        return;
      } finally {
        setSubmitting(false);
      }
    }

    const createdOrder = placeOrder(buildOrderPayload());
    const orderPayload = buildOrderPayload();
    const savedProfile = readLocalStorage(profileStorageKey, {});
    localStorage.setItem(profileStorageKey, JSON.stringify({
      ...savedProfile,
      fullName: orderPayload.customer,
      email: orderPayload.customerEmail,
      phone: orderPayload.customerPhone,
      address: orderPayload.shippingAddress.address,
      city: orderPayload.shippingAddress.city,
      state: orderPayload.shippingAddress.state,
      zipCode: orderPayload.shippingAddress.zipCode,
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
            <p className="mb-2">
              <strong>Order ID:</strong> #{placedOrder?.id}
            </p>
            {placedOrder?.orderTime && (
              <p className="mb-2">
                <strong>Placed at:</strong> {placedOrder.orderTime}
              </p>
            )}
            <p className="mb-2">
              <strong>Confirmation email:</strong> {formData.email}
            </p>
            <p>
              <strong>Delivery:</strong> 2-5 business days
            </p>
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

  return (
    <div className="container mx-auto px-4 py-8 sm:px-8">
      <Seo title="Checkout" description="Complete your Elmshelf checkout securely." noindex />
      <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Checkout Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6" noValidate>
          {submitError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          ) : null}
          {/* Shipping Information */}
          <div className="bg-white p-8 rounded-xl shadow-md">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-primary">
              <UiIcon name="truck" className="h-6 w-6" />
              Shipping Information
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={shippingInputClass(shippingErrors.firstName)}
                  aria-invalid={Boolean(shippingErrors.firstName)}
                  required
                />
                <PaymentFieldError message={shippingErrors.firstName} />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={shippingInputClass(shippingErrors.lastName)}
                  aria-invalid={Boolean(shippingErrors.lastName)}
                  required
                />
                <PaymentFieldError message={shippingErrors.lastName} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={shippingInputClass(shippingErrors.email)}
                  aria-invalid={Boolean(shippingErrors.email)}
                  required
                />
                <PaymentFieldError message={shippingErrors.email} />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={shippingInputClass(shippingErrors.phone)}
                  inputMode="tel"
                  aria-invalid={Boolean(shippingErrors.phone)}
                />
                <PaymentFieldError message={shippingErrors.phone} />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-gray-700 font-semibold mb-2">
                Address *
              </label>
              <input
                type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className={shippingInputClass(shippingErrors.address)}
                  aria-invalid={Boolean(shippingErrors.address)}
                  required
                />
                <PaymentFieldError message={shippingErrors.address} />
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  City *
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className={shippingInputClass(shippingErrors.city)}
                  aria-invalid={Boolean(shippingErrors.city)}
                  required
                />
                <PaymentFieldError message={shippingErrors.city} />
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
                  className={shippingInputClass(shippingErrors.state)}
                  aria-invalid={Boolean(shippingErrors.state)}
                />
                <PaymentFieldError message={shippingErrors.state} />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  ZIP Code *
                </label>
                <input
                  type="text"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleChange}
                  className={shippingInputClass(shippingErrors.zipCode)}
                  aria-invalid={Boolean(shippingErrors.zipCode)}
                  required
                />
                <PaymentFieldError message={shippingErrors.zipCode} />
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="bg-white p-8 rounded-xl shadow-md">
            <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-primary">
              <UiIcon name="payment" className="h-6 w-6" />
              Payment Information
            </h2>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Card Number *
              </label>
              <input
                type="text"
                name="cardNumber"
                placeholder="1234 5678 9012 3456"
                value={formData.cardNumber}
                onChange={handleCardNumberChange}
                maxLength={23}
                inputMode="numeric"
                aria-invalid={Boolean(paymentErrors.cardNumber)}
                className={paymentInputClass(paymentErrors.cardNumber)}
                required
              />
              <PaymentFieldError message={paymentErrors.cardNumber} />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Expiry Date (MM/YY)
                </label>
                <input
                  type="text"
                  name="expiryDate"
                  placeholder="12/25"
                  value={formData.expiryDate}
                  onChange={handleExpiryDateChange}
                  maxLength={5}
                  inputMode="numeric"
                  aria-invalid={Boolean(paymentErrors.expiryDate)}
                  className={paymentInputClass(paymentErrors.expiryDate)}
                  required
                />
                <PaymentFieldError message={paymentErrors.expiryDate} />
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  CVV
                </label>
                <input
                  type="text"
                  name="cvv"
                  placeholder="123"
                  value={formData.cvv}
                  onChange={handleCvvChange}
                  maxLength={4}
                  inputMode="numeric"
                  aria-invalid={Boolean(paymentErrors.cvv)}
                  className={paymentInputClass(paymentErrors.cvv)}
                  required
                />
                <PaymentFieldError message={paymentErrors.cvv} />
              </div>
            </div>
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
              disabled={submitting}
              className="flex-1 bg-accent text-primary py-3 rounded-lg font-bold hover:bg-yellow-600 transition shadow-md hover:shadow-lg disabled:opacity-60"
            >
              {submitting ? 'Placing Order...' : 'Place Order'}
            </button>
          </div>
        </form>

        {/* Order Summary */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-8 rounded-xl shadow-lg h-fit sticky top-24">
          <h2 className="text-2xl font-bold text-primary mb-6">Order Summary</h2>

          <div className="space-y-3 mb-6 pb-6 border-b border-gray-300 max-h-64 overflow-y-auto">
            {checkoutItems.map((item) => (
              <div key={item.lineId || `${item.id}-${item.selectedColor || ''}-${item.selectedSize || ''}`} className="flex justify-between text-sm bg-white p-3 rounded-lg">
                {(() => {
                  const selectedAttributeLabels =
                    item.selectedAttributes && Object.keys(item.selectedAttributes).length > 0
                      ? Object.entries(item.selectedAttributes).map(([key, value]) => `${key}: ${value}`)
                      : [
                          item.selectedColor ? `Color: ${item.selectedColor}` : null,
                          item.selectedSize ? `Size: ${item.selectedSize}` : null,
                        ].filter(Boolean);

                  return (
                    <>
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
                    </>
                  );
                })()}
              </div>
            ))}
          </div>

          <div className="space-y-3 mb-6 pb-6 border-b border-gray-300">
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

export default Checkout;
