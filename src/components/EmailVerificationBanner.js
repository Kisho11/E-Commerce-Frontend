import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function EmailVerificationBanner() {
  const { user, resendVerificationEmail } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  if (!user || user.isEmailVerified || user.role !== 'user') return null;

  const handleResend = async () => {
    setSending(true);
    setError('');
    try {
      const result = await resendVerificationEmail();
      if (result.success) {
        setSent(true);
      } else {
        setError(result.error || 'Failed to resend. Please try again.');
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
      <div className="mx-auto max-w-7xl flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-amber-800">
        <svg className="h-4 w-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="flex-1">
          Please verify your email address to place orders. Check your inbox for a verification link.
        </span>
        {sent ? (
          <span className="font-semibold text-emerald-700">Sent! Check your inbox.</span>
        ) : (
          <button
            onClick={handleResend}
            disabled={sending}
            className="shrink-0 font-semibold underline hover:no-underline disabled:opacity-50 transition"
          >
            {sending ? 'Sending…' : 'Resend email'}
          </button>
        )}
        {error && <span className="text-red-600 text-xs">{error}</span>}
      </div>
    </div>
  );
}

export default EmailVerificationBanner;
