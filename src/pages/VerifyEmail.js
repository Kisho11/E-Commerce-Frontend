import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Seo from '../components/Seo';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = process.env.REACT_APP_API_URL;

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [statusState, setStatusState] = useState('loading');
  const [message, setMessage] = useState('');
  const { user, markEmailVerified } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatusState('error');
      setMessage('No verification token found in this link.');
      return;
    }

    fetch(`${API_BASE_URL}/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.already_verified) {
          setStatusState('already');
          markEmailVerified();
        } else if (data.message && !data.detail) {
          setStatusState('success');
          markEmailVerified();
        } else {
          setStatusState('error');
          setMessage(data.detail || 'Verification failed. The link may be expired or invalid.');
        }
      })
      .catch(() => {
        setStatusState('error');
        setMessage('Could not reach the server. Please try again.');
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const isLoggedIn = Boolean(user);

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-4">
      <Seo title="Verify Email" noindex />
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg text-center">
        {statusState === 'loading' && (
          <p className="text-slate-600">Verifying your email address…</p>
        )}

        {statusState === 'success' && (
          <>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Email Verified</h1>
            <p className="text-slate-600 mb-6">
              Your email address has been verified. You can now place orders.
            </p>
            {isLoggedIn ? (
              <Link
                to="/customer-portal"
                className="inline-block rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition"
              >
                Go to My Account
              </Link>
            ) : (
              <Link
                to="/login"
                className="inline-block rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition"
              >
                Sign In
              </Link>
            )}
          </>
        )}

        {statusState === 'already' && (
          <>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <svg className="h-7 w-7 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Already Verified</h1>
            <p className="text-slate-600 mb-6">Your email address was already verified.</p>
            <Link
              to={isLoggedIn ? '/customer-portal' : '/'}
              className="inline-block rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition"
            >
              {isLoggedIn ? 'Go to My Account' : 'Back to Store'}
            </Link>
          </>
        )}

        {statusState === 'error' && (
          <>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <svg className="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Verification Failed</h1>
            <p className="text-slate-600 mb-6">
              {message || 'The link may have expired. Sign in and request a new verification email.'}
            </p>
            <Link
              to="/login"
              className="inline-block rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition"
            >
              Sign In
            </Link>
          </>
        )}
      </div>
    </main>
  );
}

export default VerifyEmail;
