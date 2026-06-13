import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Seo from '../components/Seo';
import { useAuth } from '../context/AuthContext';

const MIN_PASSWORD_LENGTH = 8;

function ManagerActivate() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { activateManagerAccount, setManagerPassword } = useAuth();

  const [stage, setStage] = useState('activating'); // activating | set-password | error
  const [activateError, setActivateError] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setActivateError('No activation token found in this link.');
      setStage('error');
      return;
    }

    activateManagerAccount(token).then((result) => {
      if (result.success) {
        setStage('set-password');
      } else {
        setActivateError(result.error || 'Activation failed. The link may be expired or invalid.');
        setStage('error');
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      const result = await setManagerPassword(newPassword);
      if (result.success) {
        navigate('/manager/dashboard', { replace: true });
      } else {
        setPasswordError(result.error || 'Failed to set password. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Seo title="Activate Manager Account" noindex />

      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">

        {stage === 'activating' && (
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
            <p className="text-slate-600">Activating your account…</p>
          </div>
        )}

        {stage === 'error' && (
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <svg className="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Activation Failed</h1>
            <p className="text-slate-500 text-sm mb-6">
              {activateError || 'The link may have expired. Contact your admin for a new invite.'}
            </p>
            <a
              href="/login"
              className="inline-block rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition"
            >
              Back to Sign In
            </a>
          </div>
        )}

        {stage === 'set-password' && (
          <>
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Account Activated</h1>
              <p className="mt-1.5 text-sm text-slate-500">
                Set a new password to access your manager workspace.
              </p>
            </div>

            <form onSubmit={handleSetPassword} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-900">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-xl bg-white px-3 py-2.5 text-sm text-slate-900 outline outline-1 -outline-offset-1 outline-slate-300 transition focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
                  minLength={MIN_PASSWORD_LENGTH}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-900">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full rounded-xl bg-white px-3 py-2.5 text-sm text-slate-900 outline outline-1 -outline-offset-1 outline-slate-300 transition focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
                  minLength={MIN_PASSWORD_LENGTH}
                  required
                />
              </div>

              {passwordError && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {passwordError}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Set Password & Continue'}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}

export default ManagerActivate;
