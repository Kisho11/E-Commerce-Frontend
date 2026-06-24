import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useProducts } from '../context/ProductContext';
import { categoryPath } from '../utils/categoryRoutes';

function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileNavHidden, setIsMobileNavHidden] = useState(false);
  const [searchScope, setSearchScope] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const lastScrollYRef = useRef(0);
  const { categories, products } = useProducts();
  const { getTotalItems } = useCart();
  const { isAuthenticated, user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const cartItemCount = getTotalItems();

  const desktopActionClass =
    'inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold transition';

  const navLinks = useMemo(() => {
    const base = [];

    if (isAuthenticated && (user?.role === 'customer' || user?.role === 'user')) {
      return [...base, { to: '/categories', label: t('categories.categories') }];
    }

    return base;
  }, [isAuthenticated, t, user]);

  const searchScopes = useMemo(
    () => [
      { value: 'all', label: 'All Categories' },
      ...categories.map((category) => ({
        value: category.name,
        label: category.name,
      })),
    ],
    [categories]
  );

  const productSuggestions = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    if (!query) return [];

    return products
      .filter((product) => {
        const nameMatches = String(product.name || '').toLocaleLowerCase().startsWith(query);
        const inSelectedCategory = searchScope === 'all' || (product.categories || []).includes(searchScope);
        return nameMatches && inSelectedCategory;
      })
      .slice(0, 8);
  }, [products, searchQuery, searchScope]);

  const handleNavigate = () => {
    setIsMobileMenuOpen(false);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const trimmedQuery = searchQuery.trim();
    setShowSearchSuggestions(false);

    if (searchScope === 'all') {
      if (trimmedQuery) {
        navigate(`/categories?search=${encodeURIComponent(trimmedQuery)}`);
      } else {
        navigate('/categories');
      }
      handleNavigate();
      return;
    }

    const params = new URLSearchParams();
    if (trimmedQuery) {
      params.set('search', trimmedQuery);
    }
    navigate(`${categoryPath(searchScope)}${params.toString() ? `?${params.toString()}` : ''}`);
    handleNavigate();
  };

  const handleScopeChange = (event) => {
    const value = event.target.value;
    setSearchScope(value);
    setShowSearchSuggestions(Boolean(searchQuery.trim()));
    if (value === 'all') {
      navigate('/categories');
    } else {
      navigate(categoryPath(value));
    }
  };

  const handleSearchQueryChange = (event) => {
    setSearchQuery(event.target.value);
    setShowSearchSuggestions(Boolean(event.target.value.trim()));
  };

  const handleSuggestionSelect = (product) => {
    setSearchQuery(product.name || '');
    setShowSearchSuggestions(false);
    handleNavigate();
    navigate(`/product/${product.id}`);
  };

  const handleLogout = () => {
    if (!window.confirm('Are you sure you want to logout?')) return;
    logout();
    handleNavigate();
    navigate('/');
  };

  const handleLogoClick = (event) => {
    event.preventDefault();
    handleNavigate();
    navigate('/');
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handleScroll = () => {
      if (typeof window === 'undefined') return;

      const currentScrollY = window.scrollY;
      const isMobileViewport = window.innerWidth < 768;
      const usesCollapsedNavigation = window.innerWidth < 1280;

      if (usesCollapsedNavigation && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
        setIsMobileNavHidden(isMobileViewport && currentScrollY > 32);
        lastScrollYRef.current = currentScrollY;
        return;
      }

      if (!isMobileViewport || isMobileMenuOpen) {
        setIsMobileNavHidden(false);
        lastScrollYRef.current = currentScrollY;
        return;
      }

      if (currentScrollY <= 32) {
        setIsMobileNavHidden(false);
        lastScrollYRef.current = currentScrollY;
        return;
      }

      const scrollingDown = currentScrollY > lastScrollYRef.current;
      const scrollDelta = Math.abs(currentScrollY - lastScrollYRef.current);

      if (!scrollingDown) {
        setIsMobileNavHidden(false);
        lastScrollYRef.current = currentScrollY;
        return;
      }

      if (scrollDelta < 8) return;

      setIsMobileNavHidden(scrollingDown);
      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isMobileMenuOpen]);

  return (
    <header
      className={`sticky top-0 z-50 border-b border-slate-800 bg-black transition-transform duration-300 ease-out ${
        isMobileNavHidden ? '-translate-y-full md:translate-y-0' : 'translate-y-0'
      }`}
    >
      <div className="bg-[#c41e3a] text-white">
        <div className="shell relative px-3 py-1.5 pr-20 text-[10px] font-bold uppercase tracking-[0.06em] sm:py-2 sm:pr-3 sm:text-sm sm:tracking-[0.08em]">
          <p className="blink-banner-text text-left sm:text-center">
            <span>SAME DAY PICK UP</span>
            <span className="px-1.5 text-black sm:px-2">|</span>
            <span>DELIVERY WITHIN 1 - 2 WORKING DAYS</span>
            <span className="px-1.5 text-black sm:px-2">|</span>
            <span>GET A QUOTE</span>
          </p>
          <div className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full border border-white/35 bg-[#a81831] p-0.5 sm:inline-flex">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] transition sm:text-xs ${
                language === 'en' ? 'bg-white text-red-700 shadow-sm' : 'text-white hover:bg-white/15'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage('ta')}
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] transition sm:text-xs ${
                language === 'ta' ? 'bg-white text-red-700 shadow-sm' : 'text-white hover:bg-white/15'
              }`}
            >
              TA
            </button>
          </div>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 sm:hidden">
            <div className="inline-flex rounded-full border border-white/35 bg-[#a81831] p-0.5">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] transition ${
                  language === 'en' ? 'bg-white text-red-700 shadow-sm' : 'text-white hover:bg-white/15'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage('ta')}
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] transition ${
                  language === 'ta' ? 'bg-white text-red-700 shadow-sm' : 'text-white hover:bg-white/15'
                }`}
              >
                TA
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="shell">
        <div className="flex h-[72px] items-center justify-between gap-4">
          <Link to="/" aria-label="Go to home" className="block shrink-0 cursor-pointer" onClick={handleLogoClick}>
            <img src="/elms.png" alt="Elamshelf logo" className="h-12 w-auto max-w-[160px] object-contain sm:h-14 sm:max-w-[200px] lg:h-16 lg:max-w-[250px]" />
          </Link>

          <div className="hidden flex-1 items-center justify-center md:flex">
            <form
              onSubmit={handleSearchSubmit}
              className="relative flex w-full max-w-[640px] items-stretch rounded-[16px] bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-1.5"
            >
              <div className="flex w-full items-stretch overflow-hidden rounded-[12px] bg-white">
                <div className="relative w-[142px] shrink-0 border-r border-slate-200 bg-slate-100">
                  <label className="sr-only" htmlFor="header-search-scope">Search department</label>
                  <select
                    id="header-search-scope"
                    value={searchScope}
                    onChange={handleScopeChange}
                    className="h-[34px] w-full appearance-none bg-transparent px-3.5 pr-9 text-sm font-semibold text-slate-700 outline-none"
                  >
                    {searchScopes.map((scope) => (
                      <option key={scope.value} value={scope.value}>
                        {scope.label}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-slate-500">
                    <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current" aria-hidden="true">
                      <path d="M5.2 7.2a.75.75 0 0 1 1.06 0L10 10.94l3.74-3.74a.75.75 0 1 1 1.06 1.06l-4.27 4.27a.75.75 0 0 1-1.06 0L5.2 8.26a.75.75 0 0 1 0-1.06Z" />
                    </svg>
                  </span>
                </div>

                <div className="relative min-w-0 flex-1">
                  <label className="sr-only" htmlFor="header-search-query">Search products</label>
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <circle cx="11" cy="11" r="7" />
                      <path strokeLinecap="round" d="m20 20-3.5-3.5" />
                    </svg>
                  </span>
                  <input
                    id="header-search-query"
                    type="search"
                    value={searchQuery}
                    onChange={handleSearchQueryChange}
                    onFocus={() => setShowSearchSuggestions(Boolean(searchQuery.trim()))}
                    placeholder="Search shelving, counters, gondolas, fittings..."
                    className="h-[34px] min-w-0 w-full px-11 pr-4 text-[14px] text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex min-w-[78px] items-center justify-center gap-1.5 bg-[#f3a847] px-3 text-sm font-bold text-slate-950 transition hover:bg-[#ef8f2f]"
                  aria-label="Search products"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" />
                    <path strokeLinecap="round" d="m20 20-3.5-3.5" />
                  </svg>
                  Go
                </button>
              </div>
              {showSearchSuggestions && (
                <div className="absolute left-[150px] right-[80px] top-full z-50 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                  {productSuggestions.length > 0 ? productSuggestions.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSuggestionSelect(product)}
                      className="flex w-full flex-col px-4 py-2.5 text-left transition hover:bg-slate-50"
                    >
                      <span className="text-sm font-semibold text-slate-900">{product.name}</span>
                      {product.categories?.length > 0 && (
                        <span className="text-xs text-slate-500">{product.categories.join(' · ')}</span>
                      )}
                    </button>
                  )) : (
                    <p className="px-4 py-3 text-sm text-slate-500">No products start with “{searchQuery.trim()}”.</p>
                  )}
                </div>
              )}
            </form>
          </div>

          <div className="hidden w-[360px] items-center justify-end gap-3 xl:flex">
              {/* Removed search form */}
            {!isAuthenticated ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Link
                    to="/login?mode=customer-signin"
                    className={`${desktopActionClass} border border-slate-500 text-slate-100 hover:border-red-300 hover:text-primary`}
                  >
                    {t('nav.signIn')}
                  </Link>
                  <Link
                    to="/signup"
                    className={`${desktopActionClass} bg-primary text-white hover:bg-red-700`}
                  >
                    {t('nav.signUp')}
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {user?.role === 'customer' || user?.role === 'user' ? (
                  <Link
                    to="/customer-portal"
                    className={`${desktopActionClass} bg-primary text-white hover:bg-red-700`}
                  >
                    {user?.name?.split(' ')[0] || t('nav.myAccount')}
                  </Link>
                ) : (
                  <Link
                    to={user?.role === 'admin' ? '/admin/dashboard' : '/manager/dashboard'}
                    className={`${desktopActionClass} border border-slate-500 text-slate-100 hover:border-red-300 hover:text-primary`}
                  >
                    {user?.role === 'admin' ? t('nav.adminPortal') : t('nav.managerPortal')}
                  </Link>
                )}

                <button
                  onClick={handleLogout}
                  className={`${desktopActionClass} border border-slate-500 text-slate-100 hover:bg-slate-800`}
                >
                  {t('nav.logout')}
                </button>
              </>
            )}

            <Link
              to="/cart"
              className="relative inline-flex h-10 items-center gap-2 rounded-full bg-slate-800 px-4 text-sm font-bold text-white transition hover:bg-slate-700"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="9" cy="20" r="1.5" />
                <circle cx="17" cy="20" r="1.5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h2l2.2 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H7" />
              </svg>
              {t('nav.cart')}
              {cartItemCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
                  {cartItemCount}
                </span>
              )}
            </Link>
          </div>

          <div className="hidden items-center gap-2 md:flex xl:hidden">
            <Link
              to="/cart"
              className="relative inline-flex items-center justify-center rounded-lg p-2 text-white outline-none ring-0 focus:outline-none focus:ring-0"
              onClick={handleNavigate}
              aria-label="Open cart"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="9" cy="20" r="1.5" />
                <circle cx="17" cy="20" r="1.5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h2l2.2 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H7" />
              </svg>
              {cartItemCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                  {cartItemCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => {
                setIsMobileMenuOpen((prev) => !prev);
              }}
              className="rounded-lg p-2 text-white outline-none ring-0 focus:outline-none focus:ring-0"
              aria-label="Toggle menu"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <Link
              to="/cart"
              className="relative inline-flex items-center justify-center rounded-lg p-2 text-white outline-none ring-0 focus:outline-none focus:ring-0"
              onClick={handleNavigate}
              aria-label="Open cart"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="9" cy="20" r="1.5" />
                <circle cx="17" cy="20" r="1.5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h2l2.2 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H7" />
              </svg>
              {cartItemCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                  {cartItemCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => {
                setIsMobileMenuOpen((prev) => !prev);
              }}
              className="rounded-lg p-2 text-white outline-none ring-0 focus:outline-none focus:ring-0"
              aria-label="Toggle menu"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        <div className="border-t border-slate-800 py-3 lg:hidden">
          <form
            onSubmit={handleSearchSubmit}
            className="relative rounded-[16px] bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-1.5"
          >
            <div className="flex overflow-hidden rounded-[12px] bg-white">
              <div className="relative w-[122px] shrink-0 border-r border-slate-200 bg-slate-100">
                <select
                  value={searchScope}
                  onChange={handleScopeChange}
                  className="h-[32px] w-full appearance-none bg-transparent px-2.5 pr-7 text-[11px] font-semibold text-slate-700 outline-none"
                >
                  {searchScopes.map((scope) => (
                    <option key={scope.value} value={scope.value}>
                      {scope.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center text-slate-500">
                  <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
                    <path d="M5.2 7.2a.75.75 0 0 1 1.06 0L10 10.94l3.74-3.74a.75.75 0 1 1 1.06 1.06l-4.27 4.27a.75.75 0 0 1-1.06 0L5.2 8.26a.75.75 0 0 1 0-1.06Z" />
                  </svg>
                </span>
              </div>
              <div className="relative min-w-0 flex-1">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" />
                    <path strokeLinecap="round" d="m20 20-3.5-3.5" />
                  </svg>
                </span>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={handleSearchQueryChange}
                  onFocus={() => setShowSearchSuggestions(Boolean(searchQuery.trim()))}
                  placeholder="Search products"
                  className="h-[32px] min-w-0 w-full bg-white px-9 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
              <button
                type="submit"
                className="inline-flex min-w-[50px] items-center justify-center bg-[#f3a847] px-3 text-slate-950"
                aria-label="Search products"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path strokeLinecap="round" d="m20 20-3.5-3.5" />
                </svg>
              </button>
            </div>
            {showSearchSuggestions && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                {productSuggestions.length > 0 ? productSuggestions.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSuggestionSelect(product)}
                    className="flex w-full flex-col px-4 py-2.5 text-left transition hover:bg-slate-50"
                  >
                    <span className="text-sm font-semibold text-slate-900">{product.name}</span>
                    {product.categories?.length > 0 && (
                      <span className="text-xs text-slate-500">{product.categories.join(' · ')}</span>
                    )}
                  </button>
                )) : (
                  <p className="px-4 py-3 text-sm text-slate-500">No products start with “{searchQuery.trim()}”.</p>
                )}
              </div>
            )}
          </form>
        </div>

        {isMobileMenuOpen && (
          <div className="xl:hidden">
            <button
              type="button"
              aria-label="Close menu overlay"
              className="fixed inset-0 z-40 bg-black/45"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="absolute inset-x-0 top-full z-50">
              <div className="fade-up space-y-3 border-t border-slate-700 bg-black py-4 shadow-2xl">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="block rounded-lg px-3 py-2 font-semibold text-slate-100 transition hover:bg-slate-800"
                    onClick={handleNavigate}
                  >
                    {link.label}
                  </Link>
                ))}

                {!isAuthenticated ? (
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-2 gap-3">
                      <Link
                        to="/login?mode=customer-signin"
                        className="rounded-lg border border-slate-300 px-3 py-2 text-center text-sm font-semibold text-slate-700"
                        onClick={handleNavigate}
                      >
                        {t('nav.signIn')}
                      </Link>
                      <Link
                        to="/signup"
                        className="rounded-lg bg-primary px-3 py-2 text-center text-sm font-semibold text-white"
                        onClick={handleNavigate}
                      >
                        {t('nav.signUp')}
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 pt-2">
                    {user?.role === 'customer' || user?.role === 'user' ? (
                      <Link
                        to="/customer-portal"
                        className="block rounded-lg bg-primary px-3 py-2 text-center text-sm font-semibold text-white"
                        onClick={handleNavigate}
                      >
                        {user?.name?.split(' ')[0] || t('nav.myAccount')}
                      </Link>
                    ) : (
                      <Link
                        to={user?.role === 'admin' ? '/admin/dashboard' : '/manager/dashboard'}
                        className="block rounded-lg border border-slate-300 px-3 py-2 text-center text-sm font-semibold text-slate-700"
                        onClick={handleNavigate}
                      >
                        {user?.role === 'admin' ? t('nav.adminPortal') : t('nav.managerPortal')}
                      </Link>
                    )}

                    <button
                      onClick={handleLogout}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-center text-sm font-semibold text-slate-700"
                    >
                      {t('nav.logout')}
                    </button>
                  </div>
                )}

                <div className="pt-1">
                  <Link
                    to="/cart"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-center text-sm font-semibold text-slate-700"
                    onClick={handleNavigate}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <circle cx="9" cy="20" r="1.5" />
                      <circle cx="17" cy="20" r="1.5" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h2l2.2 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H7" />
                    </svg>
                    {t('nav.cart')} ({cartItemCount})
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default Navbar;
