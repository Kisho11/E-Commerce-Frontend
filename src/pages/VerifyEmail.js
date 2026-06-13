import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UiIcon from '../components/UiIcon';
import Seo from '../components/Seo';

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const { verifyEmail } = useAuth();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('No verification token found in the link. Please check your email.');
      return;
    }

    verifyEmail(token).then((result) => {
      if (result.success) {
        setStatus('success');
        setMessage(result.message || 'Email verified! You can now sign in.');
      } else {
        setStatus('error');
        setMessage(result.error || 'The verification link is invalid or has expired.');
      }
    });
  }, [searchParams, verifyEmail]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary to-black px-4">
      <Seo title="Verify Email" noindex />
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl text-center">
        <div className="mb-4 flex justify-center text-primary">
          <UiIcon name="box" className="h-12 w-12" />
        </div>
        <h1 className="mb-6 text-2xl font-bold text-primary">Email Verification</h1>

        {status === 'verifying' && (
          <div className="space-y-3">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-slate-600">Verifying your email address…</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-semibold text-emerald-700">{message}</p>
            <Link
              to="/login?mode=customer-signin"
              className="inline-block rounded-lg bg-primary px-6 py-2.5 font-bold text-white hover:bg-red-700 transition"
            >
              Sign In
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <svg className="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="font-semibold text-red-700">{message}</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link
                to="/login?mode=customer-signup"
                className="rounded-lg border border-primary px-5 py-2 font-semibold text-primary hover:bg-red-50 transition"
              >
                Back to Sign Up
              </Link>
              <Link
                to="/login?resend=1"
                className="rounded-lg bg-primary px-5 py-2 font-bold text-white hover:bg-red-700 transition"
              >
                Resend Link
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VerifyEmail;
