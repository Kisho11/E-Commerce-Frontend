import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const industries = [
  { key: 'techShops', slug: 'tech-shops' },
  { key: 'diy', slug: 'diy' },
  { key: 'greengrocer', slug: 'greengrocer' },
  { key: 'poundShop', slug: 'pound-shop' },
  { key: 'petShop', slug: 'pet-shop' },
  { key: 'vapeShop', slug: 'vape-shop' },
  { key: 'groceryStore', slug: 'grocery-store' },
  { key: 'butcher', slug: 'butcher' },
  { key: 'organicShops', slug: 'organic-shops' },
  { key: 'pharmacyStore', slug: 'pharmacy-store' },
  { key: 'restaurants', slug: 'restaurants' },
  { key: 'bakery', slug: 'bakery' },
];

function Navbar() {
  const [isIndustryOpen, setIsIndustryOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileIndustryOpen, setIsMobileIndustryOpen] = useState(false);
  const [searchScope, setSearchScope] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { getTotalItems } = useCart();
  const { isAuthenticated, user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const industryMenuRef = useRef(null);
  const cartItemCount = getTotalItems();

  const desktopActionClass =
    'inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold transition';

  const navLinks = useMemo(() => [
    { to: '/about', label: t('nav.about') },
    { to: '/clients', label: t('nav.clients') },
    { to: '/categories', label: t('categories.categories') },
    { to: '/catalogue', label: t('nav.catalogue') },
  ], [t]);

  const searchScopes = useMemo(
    () => [
      { value: 'all', label: 'All Products' },
      ...industries.map((industry) => ({
        value: industry.slug,
        label: t(`nav.industry.${industry.key}`),
      })),
    ],
    [t]
  );

  const handleNavigate = () => {
    setIsMobileMenuOpen(false);
    setIsIndustryOpen(false);
    setIsMobileIndustryOpen(false);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const trimmedQuery = searchQuery.trim();

    if (searchScope === 'all') {
      if (trimmedQuery) {
        navigate(`/products-by-industry?q=${encodeURIComponent(trimmedQuery)}`);
      } else {
        navigate('/products-by-industry');
      }
      handleNavigate();
      return;
    }

    if (trimmedQuery) {
      navigate(`/products-by-industry/${searchScope}?q=${encodeURIComponent(trimmedQuery)}`);
    } else {
      navigate(`/products-by-industry/${searchScope}`);
    }
    handleNavigate();
  };

  const handleLogout = () => {
    logout();
    handleNavigate();
  };

  const handleLogoClick = (event) => {
    event.preventDefault();
    handleNavigate();
    navigate('/');
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handleDocumentClick = (event) => {
      if (!industryMenuRef.current) return;
      if (!industryMenuRef.current.contains(event.target)) {
        setIsIndustryOpen(false);
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-black">
      <div className="bg-red-600 text-white">
        <div className="shell relative bg-red-700/90 px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] sm:text-sm">
          <p className="blink-banner-text text-center">
            <span>SAME DAY PICK UP</span>
            <span className="px-2 text-black">|</span>
            <span>DELIVERY WITHIN 1 - 2 WORKING DAYS</span>
            <span className="px-2 text-black">|</span>
            <span>GET A QUOTE</span>
          </p>
          <div className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full border border-white/35 bg-red-800/80 p-0.5 backdrop-blur sm:inline-flex">
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
          <div className="mt-2 flex justify-center sm:hidden">
            <div className="inline-flex rounded-full border border-white/35 bg-red-800/80 p-0.5 backdrop-blur">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] transition ${
                  language === 'en' ? 'bg-white text-red-700 shadow-sm' : 'text-white hover:bg-white/15'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage('ta')}
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] transition ${
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

          <nav className="hidden flex-1 items-center justify-center gap-4 md:flex lg:gap-5">
            {navLinks.map((link) => (
              <Link key={link.to} to={link.to} className="text-[20px] font-bold text-slate-100 transition hover:text-primary">
                {link.label}
              </Link>
            ))}

            <div className="relative z-20" ref={industryMenuRef}>
              <button
                onClick={() => setIsIndustryOpen((prev) => !prev)}
                className="text-[20px] font-bold text-slate-100 transition hover:text-primary"
              >
                {t('nav.industries')}
              </button>
              {isIndustryOpen && (
                <div className="absolute right-0 z-30 mt-3 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-2xl">
                  {industries.map((industry) => (
                    <Link
                      key={industry.key}
                      to={`/products-by-industry/${industry.slug}`}
                      className="nav-submenu-item"
                      onClick={handleNavigate}
                    >
                      {t(`nav.industry.${industry.key}`)}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

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
                    {t('nav.myAccount')}
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
              className="inline-flex items-center justify-center rounded-lg border border-slate-500 p-2 text-white"
              onClick={handleNavigate}
              aria-label="Open cart"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="9" cy="20" r="1.5" />
                <circle cx="17" cy="20" r="1.5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h2l2.2 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H7" />
              </svg>
            </Link>
            <button
              onClick={() => {
                setIsMobileMenuOpen((prev) => !prev);
                setIsMobileIndustryOpen(false);
              }}
              className="rounded-lg border border-slate-500 p-2 text-white"
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
              className="inline-flex items-center justify-center rounded-lg border border-slate-500 p-2 text-white"
              onClick={handleNavigate}
              aria-label="Open cart"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="9" cy="20" r="1.5" />
                <circle cx="17" cy="20" r="1.5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h2l2.2 10.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H7" />
              </svg>
            </Link>
            <button
              onClick={() => {
                setIsMobileMenuOpen((prev) => !prev);
                setIsMobileIndustryOpen(false);
              }}
              className="rounded-lg border border-slate-500 p-2 text-white"
              aria-label="Toggle menu"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        <div className="hidden items-center justify-center border-t border-slate-800 py-3 lg:flex">
          <form
            onSubmit={handleSearchSubmit}
            className="flex w-full max-w-[980px] items-stretch overflow-hidden rounded-[22px] border border-slate-700/80 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.35)] ring-1 ring-slate-800/70"
          >
            <div className="flex w-full items-stretch overflow-hidden rounded-[16px] bg-white focus-within:ring-2 focus-within:ring-[#f3a847]">
              <div className="relative w-[180px] shrink-0 border-r border-slate-200 bg-slate-100">
                <label className="sr-only" htmlFor="header-search-scope">Search department</label>
                <select
                  id="header-search-scope"
                  value={searchScope}
                  onChange={(event) => setSearchScope(event.target.value)}
                  className="h-[58px] w-full appearance-none bg-transparent px-4 pr-10 text-sm font-semibold text-slate-700 outline-none"
                >
                  {searchScopes.map((scope) => (
                    <option key={scope.value} value={scope.value}>
                      {scope.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500">
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
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search shelving, counters, gondolas, fittings..."
                  className="h-[58px] min-w-0 w-full px-11 pr-5 text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>

              <button
                type="submit"
                className="inline-flex min-w-[92px] items-center justify-center gap-2 bg-[#f3a847] px-4 text-sm font-bold text-slate-950 transition hover:bg-[#ef8f2f]"
                aria-label="Search products"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path strokeLinecap="round" d="m20 20-3.5-3.5" />
                </svg>
                Go
              </button>
            </div>
          </form>
        </div>

        <div className="border-t border-slate-800 py-3 lg:hidden">
          <form
            onSubmit={handleSearchSubmit}
            className="overflow-hidden rounded-[20px] border border-slate-700/80 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-1.5 shadow-[0_10px_26px_rgba(0,0,0,0.28)]"
          >
            <div className="flex overflow-hidden rounded-[14px] bg-white focus-within:ring-2 focus-within:ring-[#f3a847]">
              <div className="relative max-w-[138px] border-r border-slate-200 bg-slate-100">
                <select
                  value={searchScope}
                  onChange={(event) => setSearchScope(event.target.value)}
                  className="h-[54px] w-full appearance-none bg-transparent px-3 pr-8 text-xs font-semibold text-slate-700 outline-none"
                >
                  {searchScopes.map((scope) => (
                    <option key={scope.value} value={scope.value}>
                      {scope.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-slate-500">
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
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search products"
                  className="h-[54px] min-w-0 w-full bg-white px-9 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
              <button
                type="submit"
                className="inline-flex min-w-[56px] items-center justify-center bg-[#f3a847] px-4 text-slate-950"
                aria-label="Search products"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path strokeLinecap="round" d="m20 20-3.5-3.5" />
                </svg>
              </button>
            </div>
          </form>
        </div>

        {isMobileMenuOpen && (
          <div className="fade-up space-y-3 border-t border-slate-700 bg-black py-4 xl:hidden">
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

            {/* Removed mobile search form */}

            <div className="rounded-xl bg-slate-50 p-3">
              <button
                type="button"
                onClick={() => setIsMobileIndustryOpen((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-left"
                aria-expanded={isMobileIndustryOpen}
                aria-controls="mobile-industries-submenu"
              >
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{t('nav.industries')}</span>
                <span className="text-base font-bold text-slate-600">{isMobileIndustryOpen ? '−' : '+'}</span>
              </button>

              <div
                id="mobile-industries-submenu"
                className={`overflow-hidden transition-all duration-200 ${isMobileIndustryOpen ? 'mt-2 max-h-96' : 'max-h-0'}`}
              >
                <div className="grid grid-cols-2 gap-2">
                  {industries.map((industry) => (
                    <Link
                      key={industry.key}
                      to={`/products-by-industry/${industry.slug}`}
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700"
                      onClick={handleNavigate}
                    >
                      {t(`nav.industry.${industry.key}`)}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

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
                    {t('nav.myAccount')}
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
        )}
      </div>
    </header>
  );
}

export default Navbar;
