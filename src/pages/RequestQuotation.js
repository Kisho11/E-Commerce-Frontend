import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Seo from '../components/Seo';

const API_BASE_URL = process.env.REACT_APP_API_URL;

const requirementOptions = [
  'Shop Shelves',
  'Fruit & Veg Shelves',
  'Tobacco & Vape Shelves',
  'Bread & Bakery Shelves',
  'Counters',
  'Refrigeration',
  'Flooring',
  'Ceiling',
];

const initialForm = {
  fullName: '',
  email: '',
  phone: '',
  requirements: [],
  message: '',
};

function RequestQuotation() {
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState({ type: '', message: '' });

  const selectedRequirementText = useMemo(() => {
    if (form.requirements.length === 0) return 'No requirements selected yet';
    return form.requirements.join(', ');
  }, [form.requirements]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setNotice({ type: '', message: '' });
  };

  const toggleRequirement = (requirement) => {
    setForm((current) => {
      const exists = current.requirements.includes(requirement);
      return {
        ...current,
        requirements: exists
          ? current.requirements.filter((item) => item !== requirement)
          : [...current.requirements, requirement],
      };
    });
    setNotice({ type: '', message: '' });
  };

  const showBrowserNotification = (message) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      new Notification('Elmshelf', { body: message });
      return;
    }

    if (Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          new Notification('Elmshelf', { body: message });
        }
      });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setNotice({ type: '', message: '' });

    try {
      if (!API_BASE_URL) {
        throw new Error('Quotation service is not configured.');
      }

      const response = await fetch(`${API_BASE_URL}/quotations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: form.fullName.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          requirements: form.requirements,
          message: form.message.trim(),
          wants_catalogue: false,
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail || 'Unable to submit your quotation request.');
      }

      const successMessage = 'Thank you. Your quotation request has been sent to our team.';
      setForm(initialForm);
      setNotice({ type: 'success', message: successMessage });
      showBrowserNotification(successMessage);
    } catch (error) {
      setNotice({
        type: 'error',
        message: error.message || 'Unable to submit your quotation request.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-50 py-10">
      <Seo
        title="Request a Retail Shelving Quotation"
        description="Send Elmshelf your shelving, refrigeration, flooring, counter, and shop fitting requirements for a personalised quotation."
      />

      <div className="shell">
        <div className="mb-6">
          <Link to="/" className="text-sm font-bold text-primary hover:text-red-700">
            Back to home
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
          <aside className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">Personalised quote</p>
            <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">Request Quotation</h1>
            <p className="mt-4 text-gray-600">
              Fill in the form and our experienced team will review your store needs, product categories, and message.
            </p>
            <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-gray-500">Selected requirements</p>
              <p className="mt-2 text-sm font-semibold text-gray-800">{selectedRequirementText}</p>
            </div>
          </aside>

          <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            {notice.message ? (
              <div
                className={`mb-5 rounded-lg border px-4 py-3 text-sm font-semibold ${
                  notice.type === 'success'
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
                role={notice.type === 'success' ? 'status' : 'alert'}
              >
                {notice.message}
              </div>
            ) : null}

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-gray-700">
                Name <span className="text-primary">*</span>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(event) => updateField('fullName', event.target.value)}
                  required
                  placeholder="First name"
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2.5 font-normal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="block text-sm font-semibold text-gray-700">
                Email <span className="text-primary">*</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value)}
                  required
                  placeholder="Email"
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2.5 font-normal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="block text-sm font-semibold text-gray-700 sm:col-span-2">
                Phone <span className="text-primary">*</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) => updateField('phone', event.target.value)}
                  required
                  placeholder="Phone"
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-2.5 font-normal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>
            </div>

            <fieldset className="mt-6">
              <legend className="text-sm font-bold text-gray-800">Select Your Requirements</legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {requirementOptions.map((requirement) => (
                  <label
                    key={requirement}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={form.requirements.includes(requirement)}
                      onChange={() => toggleRequirement(requirement)}
                      className="h-4 w-4 accent-primary"
                    />
                    {requirement}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="mt-6 block text-sm font-semibold text-gray-700">
              Message <span className="text-primary">*</span>
              <textarea
                value={form.message}
                onChange={(event) => updateField('message', event.target.value)}
                required
                rows={6}
                placeholder="Please type your message here"
                className="mt-2 w-full resize-y rounded-lg border border-gray-300 px-4 py-3 font-normal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400 sm:w-auto"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default RequestQuotation;
