import React, { useMemo, useState } from 'react';
const PROFILE_KEY = 'customerProfile';
const PAYMENT_KEY = 'customerPaymentMethods';
const CONSENT_KEY = 'customerConsents';
const AUDIT_KEY = 'customerDataAuditLog';

const defaultProfile = {
  fullName: '',
  email: '',
  phone: '',
};

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

function readLocalStorage(key, fallback) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch (error) {
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

function CustomerPortal() {
  const [profile, setProfile] = useState(() => readLocalStorage(PROFILE_KEY, defaultProfile));
  const [paymentMethods, setPaymentMethods] = useState(() => readLocalStorage(PAYMENT_KEY, []));
  const [consents, setConsents] = useState(() => readLocalStorage(CONSENT_KEY, defaultConsents));
  const [auditLog, setAuditLog] = useState(() => readLocalStorage(AUDIT_KEY, []));

  const [paymentForm, setPaymentForm] = useState(defaultPayment);
  const [editingId, setEditingId] = useState(null);

  const [profileMessage, setProfileMessage] = useState('');
  const [paymentMessage, setPaymentMessage] = useState('');
  const [consentMessage, setConsentMessage] = useState('');
  const [privacyMessage, setPrivacyMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState('');

  const isEditing = useMemo(() => editingId !== null, [editingId]);

  const addAudit = (action, detail = '') => {
    const entry = { id: Date.now(), action, detail, at: nowIso() };
    const next = [entry, ...auditLog].slice(0, 20);
    setAuditLog(next);
    writeLocalStorage(AUDIT_KEY, next);
  };

  const saveProfile = (e) => {
    e.preventDefault();
    const payload = { ...profile, updatedAt: nowIso() };
    setProfile(payload);
    writeLocalStorage(PROFILE_KEY, payload);
    addAudit('profile_updated', 'Personal details changed');
    setProfileMessage('Personal details updated successfully.');
    setTimeout(() => setProfileMessage(''), 2500);
  };

  const savePaymentMethod = (e) => {
    e.preventDefault();

    const digits = (paymentForm.cardNumber || '').replace(/\D/g, '');
    if (digits.length < 12) {
      setPaymentMessage('Enter a valid card number before saving.');
      setTimeout(() => setPaymentMessage(''), 2500);
      return;
    }

    // GDPR minimization: only last4 and masked number are stored.
    const methodPayload = {
      id: editingId || Date.now(),
      type: paymentForm.type,
      cardHolder: paymentForm.cardHolder,
      last4: digits.slice(-4),
      maskedNumber: maskCard(digits.slice(-4)),
      expiry: paymentForm.expiry,
      billingZip: paymentForm.billingZip,
      updatedAt: nowIso(),
    };

    const nextMethods = isEditing
      ? paymentMethods.map((item) => (item.id === editingId ? methodPayload : item))
      : [...paymentMethods, methodPayload];

    setPaymentMethods(nextMethods);
    writeLocalStorage(PAYMENT_KEY, nextMethods);
    setPaymentForm(defaultPayment);
    setEditingId(null);
    addAudit(isEditing ? 'payment_updated' : 'payment_added', `${methodPayload.type} ending ${methodPayload.last4}`);

    setPaymentMessage(isEditing ? 'Payment method updated and saved.' : 'Payment method saved.');
    setTimeout(() => setPaymentMessage(''), 2500);
  };

  const startEditPaymentMethod = (method) => {
    setEditingId(method.id);
    setPaymentForm({
      type: method.type || 'Card',
      cardHolder: method.cardHolder || '',
      cardNumber: '',
      expiry: method.expiry || '',
      billingZip: method.billingZip || '',
    });
  };

  const deletePaymentMethod = (id) => {
    const nextMethods = paymentMethods.filter((item) => item.id !== id);
    setPaymentMethods(nextMethods);
    writeLocalStorage(PAYMENT_KEY, nextMethods);
    if (editingId === id) {
      setEditingId(null);
      setPaymentForm(defaultPayment);
    }
    addAudit('payment_removed', `Payment id ${id} removed`);
    setPaymentMessage('Payment method removed.');
    setTimeout(() => setPaymentMessage(''), 2500);
  };

  const saveConsents = () => {
    const payload = { ...consents, essentialProcessing: true, updatedAt: nowIso() };
    setConsents(payload);
    writeLocalStorage(CONSENT_KEY, payload);
    addAudit('consent_updated', 'Consent preferences changed');
    setConsentMessage('Consent preferences saved.');
    setTimeout(() => setConsentMessage(''), 2500);
  };

  const exportData = () => {
    const dataPackage = {
      exportedAt: nowIso(),
      profile,
      paymentMethods,
      consents,
      auditLog,
    };

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

  const deleteAllData = () => {
    if (!confirmDelete || deleteText !== 'DELETE') {
      setPrivacyMessage('To proceed, tick confirmation and type DELETE.');
      setTimeout(() => setPrivacyMessage(''), 3000);
      return;
    }

    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(PAYMENT_KEY);
    localStorage.removeItem(CONSENT_KEY);
    localStorage.removeItem(AUDIT_KEY);

    setProfile(defaultProfile);
    setPaymentMethods([]);
    setConsents(defaultConsents);
    setAuditLog([]);
    setPaymentForm(defaultPayment);
    setEditingId(null);
    setConfirmDelete(false);
    setDeleteText('');

    setPrivacyMessage('All stored portal data has been deleted.');
    setTimeout(() => setPrivacyMessage(''), 3500);
  };

  return (
    <section className="shell py-10">
      <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Customer account</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">Customer Portal</h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          Manage your personal data with GDPR-focused controls: update details, control consent, export your data,
          and delete stored data.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-bold text-slate-900">Personal details</h2>
          <p className="mt-2 text-sm text-slate-600">Keep your name and contact details accurate.</p>

          <form className="mt-5 space-y-4" onSubmit={saveProfile}>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Full name</label>
              <input
                type="text"
                value={profile.fullName}
                onChange={(e) => setProfile((prev) => ({ ...prev, fullName: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Email</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="john@example.com"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Phone</label>
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile((prev) => ({ ...prev, phone: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="+1 555 000 1234"
                required
              />
            </div>

            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-600"
            >
              Save personal updates
            </button>

            {profileMessage && (
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{profileMessage}</p>
            )}
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-bold text-slate-900">Payment methods</h2>
          <p className="mt-2 text-sm text-slate-600">Only masked card details are stored (last 4 digits).</p>

          <form className="mt-5 space-y-4" onSubmit={savePaymentMethod}>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Method type</label>
              <select
                value={paymentForm.type}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, type: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              >
                <option>Card</option>
                <option>Debit Card</option>
                <option>Business Card</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Card holder name</label>
              <input
                type="text"
                value={paymentForm.cardHolder}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, cardHolder: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Card number</label>
              <input
                type="text"
                value={paymentForm.cardNumber}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, cardNumber: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                placeholder={isEditing ? 'Re-enter card number' : '4111 1111 1111 1111'}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Expiry</label>
                <input
                  type="text"
                  value={paymentForm.expiry}
                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, expiry: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="MM/YY"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Billing ZIP</label>
                <input
                  type="text"
                  value={paymentForm.billingZip}
                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, billingZip: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  placeholder="10001"
                  required
                />
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
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
                >
                  Cancel
                </button>
              )}
            </div>

            {paymentMessage && (
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{paymentMessage}</p>
            )}
          </form>
        </div>
      </div>

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
          <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{consentMessage}</p>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-bold text-slate-900">Saved methods</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {paymentMethods.length > 0 ? (
            paymentMethods.map((method) => (
              <div key={method.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-900">{method.type}</p>
                <p className="mt-1 text-sm text-slate-600">{method.cardHolder}</p>
                <p className="mt-1 text-sm font-semibold text-slate-700">{method.maskedNumber || maskCard(method.last4)}</p>
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

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-bold text-slate-900">Privacy & data rights</h3>
        <p className="mt-2 text-sm text-slate-600">
          You can export your data (right of access/portability) and delete stored account data (right to erasure).
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <button onClick={exportData} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-red-700">
            Export my data
          </button>
          <a href="mailto:privacy@elamshelf.com" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
            Contact privacy team
          </a>
        </div>

        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-bold text-red-700">Delete all stored customer data</p>
          <p className="mt-1 text-sm text-red-700">
            This removes profile, payment methods, consent settings, and audit history from this browser.
          </p>
          <div className="mt-3 space-y-3">
            <label className="flex items-center gap-2 text-sm text-red-700">
              <input type="checkbox" checked={confirmDelete} onChange={(e) => setConfirmDelete(e.target.checked)} className="h-4 w-4" />
              I understand this action cannot be undone.
            </label>
            <input
              type="text"
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
            />
            <button onClick={deleteAllData} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500">
              Delete all my data
            </button>
          </div>
        </div>

        {privacyMessage && (
          <p className="mt-3 rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">{privacyMessage}</p>
        )}
      </div>

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
