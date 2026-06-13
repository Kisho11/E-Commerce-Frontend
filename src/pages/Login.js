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
  const [successMessage, setSuccessMessage] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');

  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
  const isCustomerMode = mode === 'customer-signin' || mode === 'customer-signup';

  useEffect(() => {
    const requestedMode = searchParams.get('mode');
    if (requestedMode === 'customer-signup' || requestedMode === 'customer-signin' || requestedMode === 'staff-signin') {
      setMode(requestedMode);
    } else if (window.location.pathname === '/signup') {
      setMode('customer-signup');
    }
  }, [searchParams]);

  useEffect(() => {
    setError('');
    setGoogleError('');
    setSuccessMessage('');
    setShowForgotPassword(false);
  }, [mode]);

  useEffect(() => {
    if (!isCustomerMode || !googleClientId) return;

    const scriptId = 'google-identity-script';

    const renderGoogleButton = () => {
      if (!window.google || !googleBtnRef.current) return;

      googleBtnRef.current.innerHTML = '';

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          const result = await authWithGoogle(response.credential);
          if (result.success) {
            navigate('/customer-portal');
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

    if (window.google) {
      renderGoogleButton();
      return;
    }

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

    return () => {
      script.onload = null;
    };
  }, [authWithGoogle, googleClientId, isCustomerMode, mode, navigate]);

  const handleStaffSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

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
    mode === 'staff-signin'
      ? handleStaffSubmit
      : mode === 'customer-signup'
        ? handleCustomerSignUp
        : handleCustomerSignIn;

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

        <section className="flex min-h-[100svh] items-center px-4 py-5 sm:px-6 md:h-screen md:px-7 md:py-4 lg:px-10">
          <div className="mx-auto w-full max-w-lg">
            <div className="mb-4 md:hidden">
              <div className="mb-3 flex items-center gap-3 text-slate-900">
                <img src="/elms.png" alt="Elamshelf logo" className="h-12 w-auto max-w-[150px] object-contain" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Elamshelf</p>
                  <h1 className="text-lg font-bold text-slate-900">Account access</h1>
                </div>
              </div>
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

              <div className="mb-4">
                <h2 className="text-xl font-bold text-slate-900 md:text-2xl">{title}</h2>
                <p className="mt-1.5 text-sm leading-5 text-slate-600">{subtitle}</p>
              </div>

              {(error || googleError) && (
                <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error || googleError}
                </div>
              )}

              {successMessage && (
                <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {successMessage}
                </div>
              )}

              <form onSubmit={currentSubmitHandler} className="space-y-3">
                {mode === 'customer-signup' && (
                  <div>
                    <label className="mb-1.5 inline-block text-sm font-medium text-slate-900">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl bg-white px-3 py-2.5 text-sm text-slate-900 outline outline-1 -outline-offset-1 outline-slate-300 transition focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
                      required
                    />
                  </div>
                )}

                <div className={mode === 'customer-signup' ? 'grid gap-3 sm:grid-cols-2' : 'space-y-3'}>
                  <div>
                    <label className="mb-1.5 inline-block text-sm font-medium text-slate-900">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john@elamshelf.com"
                      className="w-full rounded-xl bg-white px-3 py-2.5 text-sm text-slate-900 outline outline-1 -outline-offset-1 outline-slate-300 transition focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 inline-block text-sm font-medium text-slate-900">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl bg-white px-3 py-2.5 text-sm text-slate-900 outline outline-1 -outline-offset-1 outline-slate-300 transition focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
                      minLength={MIN_PASSWORD_LENGTH}
                      required
                    />
                  </div>
                </div>

                {mode !== 'customer-signup' && (
                  <div className="-mt-1 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword((prev) => !prev);
                        setResetEmail(email);
                        setSuccessMessage('');
                        setError('');
                      }}
                      className="text-sm font-medium text-blue-700 hover:underline"
                    >
                      {showForgotPassword ? 'Hide password reset' : 'Forgot password?'}
                    </button>
                  </div>
                )}

                {mode !== 'customer-signup' && showForgotPassword && (
                  <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-slate-900">
                      {mode === 'staff-signin' ? 'Reset staff password' : 'Reset account password'}
                    </p>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="w-full rounded-xl bg-white px-3 py-2.5 text-sm text-slate-900 outline outline-1 -outline-offset-1 outline-slate-300 transition focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
                        placeholder="Account email"
                        required
                      />
                      <input
                        type="text"
                        value={resetToken}
                        onChange={(e) => setResetToken(e.target.value)}
                        className="w-full rounded-xl bg-white px-3 py-2.5 text-sm text-slate-900 outline outline-1 -outline-offset-1 outline-slate-300 transition focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
                        placeholder="Reset token"
                      />
                      <input
                        type="password"
                        value={newResetPassword}
                        onChange={(e) => setNewResetPassword(e.target.value)}
                        className="w-full rounded-xl bg-white px-3 py-2.5 text-sm text-slate-900 outline outline-1 -outline-offset-1 outline-slate-300 transition focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
                        placeholder="New password"
                        minLength={MIN_PASSWORD_LENGTH}
                        required={Boolean(resetToken.trim())}
                      />
                      <input
                        type="password"
                        value={resetConfirmPassword}
                        onChange={(e) => setResetConfirmPassword(e.target.value)}
                        className="w-full rounded-xl bg-white px-3 py-2.5 text-sm text-slate-900 outline outline-1 -outline-offset-1 outline-slate-300 transition focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
                        placeholder="Confirm new password"
                        minLength={MIN_PASSWORD_LENGTH}
                        required={Boolean(resetToken.trim())}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="w-full rounded-xl border border-primary bg-white py-2.5 text-sm font-semibold text-primary transition hover:bg-red-50"
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
                    <label className="mb-1.5 inline-block text-sm font-medium text-slate-900">Confirm Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl bg-white px-3 py-2.5 text-sm text-slate-900 outline outline-1 -outline-offset-1 outline-slate-300 transition focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
                      minLength={MIN_PASSWORD_LENGTH}
                      required
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl border border-blue-600 bg-blue-600 px-3.5 py-2.5 text-sm font-semibold tracking-wide text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Please wait...' : mode === 'customer-signup' ? 'Create an account' : 'Continue'}
                </button>
              </form>

              {isCustomerMode && (
                <>
                  <div className="my-4 flex items-center gap-3">
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
                      Google auth requires `REACT_APP_GOOGLE_CLIENT_ID` in your environment.
                    </p>
                  )}
                </>
              )}

              {mode === 'staff-signin' && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                  Staff access uses the backend JWT login flow for both admin and manager accounts.
                </div>
              )}

              {isCustomerMode && (
                <div className="mt-4 text-center text-sm text-slate-600">
                  {mode === 'customer-signin' ? (
                    <p>
                      New customer?{' '}
                      <Link to="/signup" className="font-medium text-blue-700 hover:underline">
                        Create your account
                      </Link>
                    </p>
                  ) : (
                    <p>
                      Already have an account?{' '}
                      <Link to="/login?mode=customer-signin" className="font-medium text-blue-700 hover:underline">
                        Login here
                      </Link>
                    </p>
                  )}
                </div>
              )}

              <div className="mt-4 text-center text-sm text-slate-600">
                <Link to="/" className="font-medium text-slate-700 transition hover:text-blue-700">
                  Back to Store
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default Login;
