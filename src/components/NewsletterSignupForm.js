import React, { useState } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_URL;
const BUSINESS_TYPE_OPTIONS = [
  { value: 'shopowner', label: 'Shop owner' },
  { value: 'shopfitter', label: 'Shopfitter' },
];

const initialForm = {
  fullName: '',
  email: '',
  businessType: 'shopowner',
  consentAccepted: false,
};

const showSubscriptionNotification = async (message) => {
  if (!('Notification' in window)) return;

  try {
    if (Notification.permission === 'granted') {
      new Notification('Subscription successful', { body: message });
      return;
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification('Subscription successful', { body: message });
      }
    }
  } catch (error) {
    // The inline success message remains the fallback if browser notifications are unavailable.
  }
};

function NewsletterSignupForm({ variant = 'light', compact = false }) {
  const isDark = variant === 'dark';
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setStatus({ type: '', message: '' });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (!API_BASE_URL) {
      setStatus({ type: 'error', message: 'Newsletter signup is not configured.' });
      return;
    }

    const fullName = form.fullName.trim();
    const email = form.email.trim().toLowerCase();
    const businessType = form.businessType || 'shopowner';

    if (fullName.length < 2) {
      setStatus({ type: 'error', message: 'Please enter your name.' });
      return;
    }

    if (!BUSINESS_TYPE_OPTIONS.some((option) => option.value === businessType)) {
      setStatus({ type: 'error', message: 'Please select your business type.' });
      return;
    }

    if (!form.consentAccepted) {
      setStatus({ type: 'error', message: 'Please confirm you want to receive email updates.' });
      return;
    }

    setIsSubmitting(true);
    setStatus({ type: '', message: '' });

    try {
      const response = await fetch(`${API_BASE_URL}/marketing/subscribe`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: fullName,
          email,
          business_type: businessType,
          consent_accepted: form.consentAccepted,
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail || 'Unable to subscribe right now.');
      }

      const successMessage = data?.message || "Thanks, you're subscribed.";
      setForm(initialForm);
      setStatus({ type: 'success', message: successMessage });
      showSubscriptionNotification(successMessage);
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Unable to subscribe right now.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = isDark
    ? 'border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:border-red-400 focus:ring-red-400/20'
    : 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-primary focus:ring-primary/20';
  const labelClass = isDark ? 'text-slate-300' : 'text-slate-700';
  const consentClass = isDark ? 'text-slate-400' : 'text-slate-600';

  return (
    <form onSubmit={handleSubmit} className={compact ? 'space-y-3' : 'space-y-4'}>
      <div className={compact ? 'grid gap-3' : 'grid gap-3 sm:grid-cols-2'}>
        <label className={`block text-sm font-semibold ${labelClass}`}>
          Name
          <input
            type="text"
            name="fullName"
            value={form.fullName}
            onChange={handleChange}
            autoComplete="name"
            required
            className={`mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none transition focus:ring-2 ${inputClass}`}
            placeholder="Your name"
          />
        </label>
        <label className={`block text-sm font-semibold ${labelClass}`}>
          Email
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
            required
            className={`mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none transition focus:ring-2 ${inputClass}`}
            placeholder="you@example.com"
          />
        </label>
        <label className={`block text-sm font-semibold ${labelClass}`}>
          Business type
          <select
            name="businessType"
            value={form.businessType}
            onChange={handleChange}
            required
            className={`mt-1 w-full rounded-md border px-3 py-2 text-sm outline-none transition focus:ring-2 ${inputClass}`}
          >
            {BUSINESS_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className={`flex items-start gap-2 text-sm leading-relaxed ${consentClass}`}>
        <input
          type="checkbox"
          name="consentAccepted"
          checked={form.consentAccepted}
          onChange={handleChange}
          className="mt-1 h-4 w-4 shrink-0 accent-primary"
          required
        />
        <span>I agree to receive promotions, offers, and event updates by email.</span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-500"
        >
          {isSubmitting ? 'Subscribing...' : 'Subscribe'}
        </button>
        {status.message ? (
          <p
            className={`text-sm font-semibold ${status.type === 'success' ? 'text-emerald-500' : 'text-red-500'}`}
            aria-live="polite"
          >
            {status.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

export default NewsletterSignupForm;
