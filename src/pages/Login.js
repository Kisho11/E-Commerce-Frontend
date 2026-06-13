import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Seo from '../components/Seo';

const MIN_PASSWORD_LENGTH = 8;

function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const googleBtnRef = useRef(null);

  const { login, signUpCustomer, signInCustomer, requestPasswordReset, resetPassword, authWithGoogle } = useAuth();

  const [mode, setMode] = useState('customer-signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newResetPassword, setNewResetPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');

  // email-verification-pending state
  const [pendingEmail, setPendingEmail] = useState('');
  const [showVerificationPending, setShowVerificationPending] = useState(false);

  // resend state
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const [successMessage, setSuccessMessage] = useState('');

  const [error, setError] = useState('');
  const [googleError, setGoogleError] = useState('');
  const [loading, setLoading] = useState(false);

  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
  const isCustomerMode = mode === 'customer-signin' || mode === 'customer-signup';

  useEffect(() => {
    const requestedMode = searchParams.get('mode');
    if (['customer-signup', 'customer-signin', 'staff-signin'].includes(requestedMode)) {
      setMode(requestedMode);
    } else if (window.location.pathname === '/signup') {
      setMode('customer-signup');
    }

    const urlResetToken = searchParams.get('resetToken');
    if (urlResetToken) {
      setResetToken(urlResetToken);
      setShowForgotPassword(true);
      setResetEmail(searchParams.get('email') || '');
    }

    if (searchParams.get('resend') === '1') {
      setShowVerificationPending(true);
    }
  }, [searchParams]);

  useEffect(() => {
    setError('');
    setGoogleError('');
    setSuccessMessage('');
    setShowForgotPassword(false);
  }, [mode]);

  // Lock page scroll
  useEffect(() => {
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);

  // Google identity button
  useEffect(() => {
    if (!isCustomerMode || !googleClientId) return;

    const scriptId = 'google-identity-script';

    const renderGoogleButton = () => {
      if (!window.google || !googleBtnRef.current) return;
      googleBtnRef.current.innerHTML = '';
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          const result = await authWithGoogle(response.credential, mode === 'customer-signup' ? 'signup' : 'signin');
          if (result.success) {
            navigate(result.user?.role === 'admin' ? '/admin/dashboard' : result.user?.role === 'manager' ? '/manager/dashboard' : '/customer-portal');
          } else {
            setGoogleError(result.error || 'Google authentication failed');
          }
        },
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        width: 320,
        text: mode === 'customer-signup' ? 'signup_with' : 'signin_with',
      });
    };

    if (window.google) { renderGoogleButton(); return; }

    const existing = document.getElementById(scriptId);
    if (existing) {
      existing.addEventListener('load', renderGoogleButton);
      return () => existing.removeEventListener('load', renderGoogleButton);
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = renderGoogleButton;
    document.body.appendChild(script);
    return () => { script.onload = null; };
  }, [authWithGoogle, googleClientId, isCustomerMode, mode, navigate]);

  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    const recaptchaToken = await getRecaptchaToken();
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        navigate(result.user.role === 'admin' ? '/admin/dashboard' : result.user.role === 'manager' ? '/manager/dashboard' : '/customer-portal');
      } else {
        setError(result.error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerSignIn = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    const recaptchaToken = await getRecaptchaToken();
    setLoading(true);
    try {
      const result = await signInCustomer(email, password);
      if (result.success) {
        navigate(
          result.user.role === 'admin'
            ? '/admin/dashboard'
            : result.user.role === 'manager'
              ? '/manager/dashboard'
              : '/customer-portal'
        );
      } else {
        setError(result.error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const recaptchaToken = await getRecaptchaToken();
    setLoading(true);
    try {
      const result = await signUpCustomer({ name, email, password });
      if (result.success) {
        navigate('/customer-portal');
      } else {
        setError(result.error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!resetEmail.trim()) {
      setError('Please enter your account email address.');
      return;
    }

    if (!resetToken.trim()) {
      const result = await requestPasswordReset(resetEmail);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setResetToken(result.resetToken || '');
      setSuccessMessage(
        result.resetToken
          ? 'Reset token generated. Paste or confirm the token below and choose a new password.'
          : result.message || 'If the account exists, a reset token has been prepared.'
      );
      return;
    }

    if (newResetPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
      return;
    }

    if (newResetPassword !== resetConfirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    const result = await resetPassword(resetToken, newResetPassword);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setEmail(resetEmail.trim().toLowerCase());
    setPassword('');
    setResetToken('');
    setNewResetPassword('');
    setResetConfirmPassword('');
    setShowForgotPassword(false);
    setSuccessMessage(result.message || 'Password updated. You can now sign in with your new password.');
  };

  const currentSubmitHandler =
    mode === 'staff-signin' ? handleStaffSubmit
    : mode === 'customer-signup' ? handleCustomerSignUp
    : handleCustomerSignIn;

  if (showVerificationPending) {
    return (
      <div className="flex h-[100svh] items-center justify-center bg-gradient-to-br from-primary to-black px-4">
        <Seo title="Verify Your Email" noindex />
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <h2 className="mb-2 text-xl font-bold text-primary">Check your email</h2>
          <p className="mb-1 text-slate-600 text-sm">
            We sent a verification link to
          </p>
          <p className="mb-4 font-semibold text-slate-800">{pendingEmail || email}</p>
          <p className="mb-6 text-slate-500 text-xs">
            Click the link in the email to activate your account. Check your spam folder if you don&apos;t see it.
          </p>
          <button
            onClick={handleResendVerification}
            disabled={resendLoading}
            className="mb-3 w-full rounded-lg border border-primary py-2.5 font-semibold text-primary hover:bg-red-50 transition disabled:opacity-50"
          >
            {resendLoading ? 'Sending…' : 'Resend verification email'}
          </button>
          {resendMessage && (
            <p className="mb-3 text-sm text-emerald-700">{resendMessage}</p>
          )}
          <button
            onClick={() => { setShowVerificationPending(false); setMode('customer-signin'); }}
            className="text-sm text-blue-700 hover:underline font-semibold"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  const title =
    mode === 'customer-signup'
      ? 'Create an account'
      : mode === 'staff-signin'
        ? 'Staff sign in'
        : 'Welcome back';

  const subtitle =
    mode === 'customer-signup'
      ? 'Create your Elamshelf customer account to save carts, request quotes, and order faster.'
      : mode === 'staff-signin'
        ? 'Use your staff credentials to access the admin or manager workspace.'
        : 'Sign in to continue with your account, saved products, and checkout flow.';

  return (
    <main className="min-h-[100svh] bg-white md:h-screen md:overflow-hidden">
      <Seo title="Account Access" description="Sign in or create your Elmshelf account." noindex />
      <div className="grid min-h-[100svh] md:h-screen md:grid-cols-[0.82fr_1.18fr]">
        <section className="relative hidden bg-black md:flex md:flex-col md:justify-between md:p-5 lg:p-6">
          <div className="h-12" />

          <div className="mx-auto flex h-full w-full max-w-md items-center justify-center">
            <div className="w-full">
              <div className={`${mode === 'staff-signin' ? 'mx-auto max-w-xs' : 'mx-auto max-w-sm'}`}>
                <img
                  src="/elms.png"
                  className="aspect-[1.08/1] w-full object-contain"
                  alt="Elmshelf logo"
                />
              </div>

              <div className={`mt-6 ${mode === 'staff-signin' ? 'mx-auto max-w-xs text-center' : 'max-w-sm'}`}>
                {mode !== 'staff-signin' ? (
                  <>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-red-300">Built For Retail</p>
                    <h2 className="mt-3 text-2xl font-black leading-tight text-white lg:text-[2rem]">
                      Shelving, displays, and store equipment in one place.
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      Create an account, save products, request quotes, and move from browsing to ordering with less friction.
                    </p>
                  </>
                ) : null}

                {mode !== 'staff-signin' ? (
                  <div className="mt-5 grid gap-2 text-sm text-slate-200">
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      Fast access to products, quotes, and account activity
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      Designed for convenience, grocery, pharmacy, and specialist retail
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <div className="max-h-[calc(100svh-8.5rem)] overflow-y-auto rounded-2xl bg-white p-3 shadow-2xl sm:max-h-[calc(100svh-10rem)] sm:p-8">
          {mode !== 'staff-signin' ? (
            <>
              <div className="mb-3 grid grid-cols-2 gap-2 sm:mb-6">
                <button
                  onClick={() => setMode('customer-signin')}
                  className={`rounded-lg px-2 py-2 text-[11px] font-bold sm:px-3 sm:text-xs ${mode === 'customer-signin' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700'}`}
                >
                  Customer Sign In
                </button>
                <button
                  onClick={() => setMode('customer-signup')}
                  className={`rounded-lg px-2 py-2 text-[11px] font-bold sm:px-3 sm:text-xs ${mode === 'customer-signup' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700'}`}
                >
                  Customer Sign Up
                </button>
              </div>
            </>
          ) : null}

          <h2 className="mb-3 text-lg font-bold text-primary sm:mb-6 sm:text-2xl">
            {mode === 'customer-signup' && 'Create Customer Account'}
            {mode === 'customer-signin' && 'Customer Sign In'}
            {mode === 'staff-signin' && 'Staff Sign In'}
          </h2>

          {(error || googleError) && (
            <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              {error || googleError}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          )}

          <form onSubmit={currentSubmitHandler} className="space-y-2.5 sm:space-y-4">
            {mode === 'customer-signup' && (
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none sm:py-2.5"
                  required
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none sm:py-2.5"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Password</label>
              <input
                type="password"
                value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none sm:py-2.5"
                  minLength={MIN_PASSWORD_LENGTH}
                  required
                />
              </div>

            {mode !== 'customer-signup' && (
              <div className="-mt-1 text-right">
                <button
                  type="button"
                  onClick={() => { setShowForgotPassword((prev) => !prev); setResetEmail(email); setSuccessMessage(''); setError(''); }}
                  className="text-xs font-semibold text-blue-700 hover:underline"
                >
                  {showForgotPassword ? 'Hide reset form' : 'Forgot password?'}
                </button>
              </div>
            )}

            {mode !== 'customer-signup' && showForgotPassword && (
              <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-bold text-slate-800">
                  {mode === 'staff-signin' ? 'Reset Staff Password' : 'Reset Account Password'}
                </p>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Account email"
                  required
                />
                <input
                  type="text"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Reset token"
                />
                <input
                  type="password"
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="New password"
                  minLength={MIN_PASSWORD_LENGTH}
                  required={Boolean(resetToken.trim())}
                />
                <input
                  type="password"
                  value={resetConfirmPassword}
                  onChange={(e) => setResetConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Confirm new password"
                  minLength={MIN_PASSWORD_LENGTH}
                  required={Boolean(resetToken.trim())}
                />
                {resetToken.trim() && (
                  <>
                    <input
                      type="password"
                      value={newResetPassword}
                      onChange={(e) => setNewResetPassword(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="New password"
                      minLength={MIN_PASSWORD_LENGTH}
                      required
                    />
                    <input
                      type="password"
                      value={resetConfirmPassword}
                      onChange={(e) => setResetConfirmPassword(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="Confirm new password"
                      minLength={MIN_PASSWORD_LENGTH}
                      required
                    />
                  </>
                )}
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="w-full rounded-lg border border-primary bg-white py-2 text-sm font-bold text-primary transition hover:bg-red-50"
                >
                  {resetToken.trim() ? 'Update Password' : 'Generate Reset Token'}
                </button>
                {!resetToken.trim() && (
                  <p className="text-xs text-slate-500">
                    Password reset requests are accepted, but token delivery is not shown in the browser.
                  </p>
                )}
              </div>
            )}

            {mode === 'customer-signup' && (
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none sm:py-2.5"
                  minLength={MIN_PASSWORD_LENGTH}
                  required
                />
              </div>
            )}

            <div className="rounded-lg border border-slate-300 bg-slate-50 p-2.5 sm:p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-700">Security Check</p>
                <button type="button" onClick={resetRecaptcha} className="text-xs font-semibold text-blue-700 hover:underline">
                  Reset
                </button>
              </div>
              {recaptchaSiteKey ? (
                <div className="mt-3 flex justify-center">
                  <div ref={recaptchaRef} />
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  reCAPTCHA requires `REACT_APP_RECAPTCHA_SITE_KEY` in your environment.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary py-2.5 font-bold text-white transition hover:bg-red-700 disabled:opacity-50 sm:py-3"
            >
              {loading ? 'Please wait…' : 'Continue'}
            </button>
          </form>

          {isCustomerMode && (
            <>
              <div className="my-3 flex items-center gap-3 sm:my-5">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs text-slate-500">OR</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
              {googleClientId ? (
                <div className="flex justify-center">
                  <div ref={googleBtnRef} />
                </div>
              ) : (
                <p className="text-center text-xs text-slate-500">
                  Google auth requires <code>REACT_APP_GOOGLE_CLIENT_ID</code> in your environment.
                </p>
              )}
            </>
          )}

          {mode === 'staff-signin' && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 sm:mt-6">
              Staff access now uses the backend JWT login flow for both admin and manager accounts.
            </div>

            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-[0_16px_60px_rgba(15,23,42,0.08)] sm:p-5 md:p-4 lg:p-5">
              {mode !== 'staff-signin' ? (
                <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
                  <button
                    onClick={() => setMode('customer-signin')}
                    className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${mode === 'customer-signin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                  >
                    Sign in
                  </button>
                  <button
                    onClick={() => setMode('customer-signup')}
                    className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${mode === 'customer-signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
                  >
                    Sign up
                  </button>
                </div>
              ) : null}

        <div className="mt-3 text-center sm:mt-6">
          <Link to="/" className="font-semibold text-white transition hover:text-blue-100">
            ← Back to Store
          </Link>
        </div>
      </div>
    </main>
  );
}

export default Login;
