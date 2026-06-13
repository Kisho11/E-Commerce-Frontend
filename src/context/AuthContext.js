import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext();

const CUSTOMER_USERS_KEY = 'customerUsers';
const AUTH_SESSION_KEY = 'authSession';
const AUTH_EXPIRED_EVENT = 'app:auth-expired';
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'X-CSRF-Token';
const API_BASE_URL = process.env.REACT_APP_API_URL;
const REQUEST_TIMEOUT_MS = 8000;

const normalizeRole = (role) => {
  if (role === 'customer') return 'user';
  return role || 'user';
};

const readStorage = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
};

const writeStorage = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const clearAuthStorage = () => {
  localStorage.removeItem(AUTH_SESSION_KEY);
};

const getCookieValue = (name) => {
  if (typeof document === 'undefined') return '';

  const prefix = `${name}=`;
  const cookies = document.cookie ? document.cookie.split('; ') : [];
  const match = cookies.find((cookie) => cookie.startsWith(prefix));
  if (!match) return '';

  return decodeURIComponent(match.slice(prefix.length));
};

const attachCsrfHeader = (headers, method = 'GET') => {
  const normalizedMethod = String(method || 'GET').toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(normalizedMethod)) {
    return headers;
  }

  const csrfToken = getCookieValue(CSRF_COOKIE_NAME);
  if (csrfToken) {
    headers.set(CSRF_HEADER_NAME, csrfToken);
  }

  return headers;
};

const fetchWithTimeout = async (url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      credentials: 'include',
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const decodeGoogleCredential = (credential) => {
  try {
    const [, payload] = credential.split('.');
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(window.atob(base64));
  } catch (error) {
    return null;
  }
};

const mapManager = (manager) => ({
  id: manager.id,
  email: manager.email,
  name: manager.full_name,
  phone: manager.phone || '',
  status: manager.is_active ? 'Active' : 'Inactive',
  joinDate: manager.created_at,
  temporaryPassword: manager.temporary_password || '',
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readStorage(AUTH_SESSION_KEY, null));
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(readStorage(AUTH_SESSION_KEY, null)));
  const [customerUsers, setCustomerUsers] = useState(() => readStorage(CUSTOMER_USERS_KEY, []));
  const [managers, setManagers] = useState([]);

  useEffect(() => {
    if (user) {
      writeStorage(AUTH_SESSION_KEY, user);
    } else {
      clearAuthStorage();
    }
  }, [user]);

  useEffect(() => {
    // Never persist passwords — strip them before writing to localStorage.
    // Offline sign-in only works within the same page session.
    writeStorage(CUSTOMER_USERS_KEY, customerUsers.map(({ password: _omit, ...rest }) => rest));
  }, [customerUsers]);

  const logout = useCallback(() => {
    if (API_BASE_URL) {
      const headers = attachCsrfHeader(new Headers(), 'POST');
      fetchWithTimeout(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers,
      }).catch(() => {});
    }
    setUser(null);
    setIsAuthenticated(false);
    setManagers([]);
    clearAuthStorage();
  }, []);

  useEffect(() => {
    const handleForcedLogout = () => {
      logout();
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleForcedLogout);
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleForcedLogout);
    };
  }, [logout]);

  const setSession = useCallback((sessionUser) => {
    setUser(sessionUser);
    setIsAuthenticated(true);
  }, []);

  const refreshSession = useCallback(async () => {
    if (!API_BASE_URL) {
      throw new Error('Backend authentication is not configured.');
    }

    const response = await fetchWithTimeout(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: attachCsrfHeader(new Headers({
        'Content-Type': 'application/json',
      }), 'POST'),
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error('Session refresh failed.');
    }

    const current = readStorage(AUTH_SESSION_KEY, null);
    if (current) {
      setSession(current);
      return current;
    }
    return null;
  }, [setSession]);

  const authFetch = useCallback(async (path, options = {}, allowRefresh = true) => {
    if (!API_BASE_URL) {
      throw new Error('Backend authentication is not configured.');
    }

    const headers = new Headers(options.headers || {});
    attachCsrfHeader(headers, options.method);

    const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });

    if ((response.status === 401 || response.status === 403) && allowRefresh) {
      try {
        await refreshSession();
        const retryHeaders = new Headers(options.headers || {});
        attachCsrfHeader(retryHeaders, options.method);
        return await fetchWithTimeout(`${API_BASE_URL}${path}`, {
          ...options,
          headers: retryHeaders,
        });
      } catch (error) {
        window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
        throw new Error('Your session expired. Please sign in again.');
      }
    }

    if (response.status === 401 || response.status === 403) {
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
      throw new Error('Your session expired. Please sign in again.');
    }

    return response;
  }, [refreshSession]);

  const login = useCallback(async (email, password, recaptchaToken = '') => {
    if (!API_BASE_URL) {
      return { success: false, error: 'Backend authentication is not configured.' };
    }

    try {
      const formData = new URLSearchParams();
      formData.append('username', email.trim().toLowerCase());
      formData.append('password', password);
      formData.append('recaptcha_token', recaptchaToken);

      const loginResponse = await fetchWithTimeout(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (!loginResponse.ok) {
        const errorData = await loginResponse.json().catch(() => null);
        return {
          success: false,
          error: errorData?.detail || 'Incorrect email or password',
        };
      }

      const tokens = await loginResponse.json();
      let profile = tokens.user || null;

      if (!profile) {
        const profileResponse = await fetchWithTimeout(`${API_BASE_URL}/users/me`);

        if (!profileResponse.ok) {
          const errorData = await profileResponse.json().catch(() => null);
          return {
            success: false,
            error: errorData?.detail || 'Signed in, but failed to load your profile',
          };
        }

        profile = await profileResponse.json();
      }

      const sessionUser = {
        id: profile.id,
        email: profile.email,
        name: profile.full_name,
        phone: profile.phone || '',
        role: normalizeRole(profile.role),
        isActive: profile.is_active,
        loginTime: new Date().toISOString(),
      };

      setSession(sessionUser);
      return { success: true, user: sessionUser };
    } catch (error) {
      if (error?.name === 'AbortError') {
        return {
          success: false,
          error: 'Login timed out. Please make sure the backend is running and try again.',
        };
      }
      return {
        success: false,
        error: 'Unable to reach the backend login service',
      };
    }
  }, [setSession]);

  useEffect(() => {
    const isFrontendOnlyGoogleSession = user?.provider === 'google';

    if (!API_BASE_URL || !user || isFrontendOnlyGoogleSession) {
      return undefined;
    }

    let cancelled = false;

    const validateSession = async () => {
      try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/users/me`);
        if (!response.ok) {
          if (!cancelled) logout();
          return;
        }
        const profile = await response.json();
        if (!cancelled) {
          const nextSession = {
            id: profile.id,
            email: profile.email,
            name: profile.full_name,
            phone: profile.phone || '',
            role: normalizeRole(profile.role),
            isActive: profile.is_active,
            loginTime: user.loginTime || new Date().toISOString(),
          };
          const hasChanged = ['id', 'email', 'name', 'phone', 'role', 'isActive'].some(
            (key) => user?.[key] !== nextSession[key]
          );
          if (hasChanged) {
            setSession(nextSession);
          }
        }
      } catch (error) {
        if (!cancelled) {
          // Keep the session during transient connectivity issues.
        }
      }
    };

    validateSession();

    return () => {
      cancelled = true;
    };
  }, [logout, setSession, user]);

  const signUpCustomer = useCallback(async ({ name, email, password, recaptchaToken }) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (API_BASE_URL) {
      try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            full_name: name.trim(),
            email: normalizedEmail,
            phone: null,
            password,
            recaptcha_token: recaptchaToken,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          return {
            success: false,
            error: errorData?.detail || 'Unable to create your account',
          };
        }

        return await login(normalizedEmail, password, recaptchaToken);
      } catch (error) {
        return {
          success: false,
          error: 'Unable to reach the backend sign-up service',
        };
      }
    }

    if (customerUsers.some((item) => item.email.toLowerCase() === normalizedEmail)) {
      return { success: false, error: 'An account with this email already exists' };
    }

    const newCustomer = {
      id: Date.now(),
      name: name.trim(),
      email: normalizedEmail,
      password,
      provider: 'password',
      createdAt: new Date().toISOString(),
    };

    setCustomerUsers((prev) => [...prev, newCustomer]);

    const customerSession = {
      id: newCustomer.id,
      name: newCustomer.name,
      email: newCustomer.email,
      role: 'user',
      provider: newCustomer.provider,
      loginTime: new Date().toISOString(),
    };

    setSession(customerSession);
    return { success: true, user: customerSession };
  }, [customerUsers, login, setSession]);

  const signInCustomer = useCallback(async (email, password, recaptchaToken = '') => {
    if (API_BASE_URL) {
      const result = await login(email, password, recaptchaToken);
      if (!result.success) {
        return result;
      }
      return result;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = customerUsers.find(
      (item) => item.email.toLowerCase() === normalizedEmail && item.password === password
    );

    if (!existing) {
      return { success: false, error: 'Invalid customer email or password' };
    }

    const customerSession = {
      id: existing.id,
      name: existing.name,
      email: existing.email,
      role: 'user',
      provider: existing.provider || 'password',
      loginTime: new Date().toISOString(),
    };

    setSession(customerSession);
    return { success: true, user: customerSession };
  }, [customerUsers, login, setSession]);

  const requestPasswordReset = useCallback(async (email, recaptchaToken = '') => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!API_BASE_URL) {
      const existing = customerUsers.find((item) => item.email.toLowerCase() === normalizedEmail);
      if (!existing) {
        return { success: false, error: 'No customer account found with that email' };
      }
      return {
        success: true,
        message: 'Backend password reset is not configured in this environment.',
      };
    }

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: normalizedEmail, recaptcha_token: recaptchaToken }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        return {
          success: false,
          error: data?.detail || 'Unable to start the password reset flow',
        };
      }

      return {
        success: true,
        message: data?.message || 'Password reset started successfully.',
        resetToken: data?.reset_token || '',
      };
    } catch (error) {
      return {
        success: false,
        error: 'Unable to reach the backend password reset service',
      };
    }
  }, [customerUsers]);

  const resetPassword = useCallback(async (resetToken, newPassword, recaptchaToken = '') => {
    if (!API_BASE_URL) {
      return { success: false, error: 'Backend password reset is not configured.' };
    }

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reset_token: resetToken.trim(),
          new_password: newPassword,
          recaptcha_token: recaptchaToken,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        return {
          success: false,
          error: data?.detail || 'Unable to update the password',
        };
      }

      return {
        success: true,
        message: data?.message || 'Password updated successfully.',
      };
    } catch (error) {
      return {
        success: false,
        error: 'Unable to reach the backend password reset service',
      };
    }
  }, []);

  const loadManagers = useCallback(async () => {
    if (!API_BASE_URL) {
      return [];
    }

    const response = await authFetch('/admin/managers');
    const data = await response.json().catch(() => []);
    const mappedManagers = Array.isArray(data) ? data.map(mapManager) : [];
    setManagers(mappedManagers);
    return mappedManagers;
  }, [authFetch]);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadManagers().catch(() => {
        setManagers([]);
      });
      return;
    }

    setManagers([]);
  }, [loadManagers, user]);

  const addManager = useCallback(async (managerData) => {
    const response = await authFetch('/admin/managers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: managerData.email.trim().toLowerCase(),
        full_name: managerData.name.trim(),
        phone: managerData.phone.trim() || null,
        password: managerData.password?.trim() || null,
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.detail || 'Unable to add manager');
    }

    const nextManager = mapManager(data);
    setManagers((prev) => [nextManager, ...prev]);
    return nextManager;
  }, [authFetch]);

  const updateManager = useCallback(async (managerId, updatedData) => {
    const response = await authFetch(`/admin/managers/${managerId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: updatedData.email.trim().toLowerCase(),
        full_name: updatedData.name.trim(),
        phone: updatedData.phone.trim() || null,
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.detail || 'Unable to update manager');
    }

    const nextManager = mapManager(data);
    setManagers((prev) => prev.map((manager) => (manager.id === managerId ? nextManager : manager)));
    return nextManager;
  }, [authFetch]);

  const deleteManager = useCallback(async (managerId) => {
    const response = await authFetch(`/admin/managers/${managerId}`, {
      method: 'DELETE',
    });

    if (!response.ok && response.status !== 204) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.detail || 'Unable to delete manager');
    }

    setManagers((prev) => prev.filter((manager) => manager.id !== managerId));
  }, [authFetch]);

  const getManagerById = useCallback((managerId) => managers.find((manager) => manager.id === managerId), [managers]);

  const authWithGoogle = useCallback((credential, mode = 'signin') => {
    const profile = decodeGoogleCredential(credential);

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reset_token: resetToken.trim(),
          new_password: newPassword,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        return {
          success: false,
          error: data?.detail || 'Unable to update the password',
        };
      }

      return {
        success: true,
        message: data?.message || 'Password updated successfully.',
      };
    } catch (error) {
      return {
        success: false,
        error: 'Unable to reach the backend password reset service',
      };
    }
  }, []);

  const loadManagers = useCallback(async () => {
    if (!API_BASE_URL) {
      return [];
    }

    const response = await authFetch('/admin/managers');
    const data = await response.json().catch(() => []);
    const mappedManagers = Array.isArray(data) ? data.map(mapManager) : [];
    setManagers(mappedManagers);
    return mappedManagers;
  }, [authFetch]);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadManagers().catch(() => {
        setManagers([]);
      });
      return;
    }

    setManagers([]);
  }, [loadManagers, user]);

  const addManager = useCallback(async (managerData) => {
    const response = await authFetch('/admin/managers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: managerData.email.trim().toLowerCase(),
        full_name: managerData.name.trim(),
        phone: managerData.phone.trim() || null,
        password: managerData.password?.trim() || null,
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.detail || 'Unable to add manager');
    }

    const nextManager = mapManager(data);
    setManagers((prev) => [nextManager, ...prev]);
    return nextManager;
  }, [authFetch]);

  const updateManager = useCallback(async (managerId, updatedData) => {
    const response = await authFetch(`/admin/managers/${managerId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: updatedData.email.trim().toLowerCase(),
        full_name: updatedData.name.trim(),
        phone: updatedData.phone.trim() || null,
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.detail || 'Unable to update manager');
    }

    const nextManager = mapManager(data);
    setManagers((prev) => prev.map((manager) => (manager.id === managerId ? nextManager : manager)));
    return nextManager;
  }, [authFetch]);

  const deleteManager = useCallback(async (managerId) => {
    const response = await authFetch(`/admin/managers/${managerId}`, {
      method: 'DELETE',
    });

    if (!response.ok && response.status !== 204) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.detail || 'Unable to delete manager');
    }

    setManagers((prev) => prev.filter((manager) => manager.id !== managerId));
  }, [authFetch]);

  const getManagerById = useCallback((managerId) => managers.find((manager) => manager.id === managerId), [managers]);

  const authWithGoogle = useCallback(async (credential, mode = 'signin') => {
    if (API_BASE_URL) {
      try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_token: credential, mode }),
        });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
          return { success: false, error: data?.detail || 'Google authentication failed' };
        }

        const profile = data?.user || null;
        if (!profile) {
          return { success: false, error: 'Google authentication failed — no profile returned' };
        }

        const sessionUser = {
          id: profile.id,
          email: profile.email,
          name: profile.full_name,
          phone: profile.phone || '',
          role: normalizeRole(profile.role),
          isActive: profile.is_active,
          loginTime: new Date().toISOString(),
        };
        setSession(sessionUser);
        return { success: true, user: sessionUser };
      } catch (error) {
        return { success: false, error: 'Unable to reach the backend Google auth service' };
      }
    }

    // Fallback: local-only Google simulation (no backend)
    const profile = decodeGoogleCredential(credential);
    if (!profile?.email) {
      return { success: false, error: 'Google authentication failed' };
    }
    const email = profile.email.trim().toLowerCase();
    const name = profile.name || 'Google User';
    let account = customerUsers.find((item) => item.email.toLowerCase() === email);
    if (!account) {
      account = { id: Date.now(), name, email, password: null, provider: 'google', createdAt: new Date().toISOString() };
      setCustomerUsers((prev) => [...prev, account]);
    }

    const customerSession = {
      id: account.id,
      name: account.name,
      email: account.email,
      role: 'user',
      provider: 'google',
      loginTime: new Date().toISOString(),
    };

    setSession(customerSession);
    return { success: true, user: customerSession };
  }, [customerUsers, setSession]);

  const isAdmin = useCallback(() => user?.role === 'admin', [user]);
  const isManager = useCallback(() => user?.role === 'manager', [user]);
  const isCustomer = useCallback(() => normalizeRole(user?.role) === 'user', [user]);
  const isAdminOrManager = useCallback(() => user?.role === 'admin' || user?.role === 'manager', [user]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      login,
      signUpCustomer,
      signInCustomer,
      requestPasswordReset,
      resetPassword,
      authWithGoogle,
      verifyEmail,
      resendVerification,
      logout,
      isAdmin,
      isManager,
      isCustomer,
      isAdminOrManager,
      managers,
      loadManagers,
      addManager,
      updateManager,
      deleteManager,
      getManagerById,
      authFetch,
    }),
    [
      user,
      isAuthenticated,
      login,
      signUpCustomer,
      signInCustomer,
      requestPasswordReset,
      resetPassword,
      authWithGoogle,
      verifyEmail,
      resendVerification,
      logout,
      isAdmin,
      isManager,
      isCustomer,
      isAdminOrManager,
      managers,
      loadManagers,
      addManager,
      updateManager,
      deleteManager,
      getManagerById,
      authFetch,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
