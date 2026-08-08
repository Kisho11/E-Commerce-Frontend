import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const socialLinks = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/elmshelf?utm_source=qr&igsh=MXB0bnZiNmpycXl5Yw==',
    icon: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="5" />
        <circle cx="12" cy="12" r="3.5" />
        <circle cx="16.8" cy="7.2" r="0.8" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    label: 'TikTok',
    href: 'https://www.tiktok.com/@elm.shelf3?_r=1&_t=ZG-98HMUamVZR2',
    icon: (
      <>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 4v10.2a4 4 0 1 1-4-4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 4c.8 3.1 2.5 4.8 5 5" />
      </>
    ),
  },
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/share/1E6mzNzJBC/',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 8h2V4h-2.6C10.8 4 9 5.8 9 8.4V11H7v4h2v5h4v-5h2.6l.4-4h-3V8.8c0-.5.4-.8 1-.8Z" />
    ),
  },
];

function Footer() {
  const { t } = useLanguage();
  const mapUrl = 'https://www.google.com/maps/search/?api=1&query=Elmshelf%2C%203%20Langley%20Cl%2C%20Romford%20RM3%208XB';

  const openCookieSettings = () => {
    window.dispatchEvent(new Event('open-cookie-settings'));
  };

  return (
    <footer className="mt-16 border-t border-slate-200 bg-slate-950 text-slate-200">
      <div className="shell py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-300">{t('footer.brandName')}</p>
            <h3 className="mt-2 text-2xl font-bold text-white">{t('footer.title')}</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              {t('footer.desc')}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-[0.1em] text-slate-300">{t('footer.explore')}</h4>
            <div className="mt-4 space-y-2 text-sm">
              <Link to="/" className="block text-slate-400 transition hover:text-white">{t('nav.home')}</Link>
              <Link to="/showroom" className="block text-slate-400 transition hover:text-white">{t('nav.showroom')}</Link>
              <Link to="/products-by-industry" className="block text-slate-400 transition hover:text-white">{t('productsPage.title')}</Link>
              <Link to="/catalogue" className="block text-slate-400 transition hover:text-white">{t('nav.catalogue')}</Link>
              <Link to="/customer-portal" className="block text-slate-400 transition hover:text-white">{t('nav.myAccount')}</Link>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold uppercase tracking-[0.1em] text-slate-300">{t('footer.support')}</h4>
            <div className="mt-4 space-y-2 text-sm">
              <span className="block cursor-not-allowed text-slate-600" aria-disabled="true">{t('nav.clients')}</span>
              <span className="block cursor-not-allowed text-slate-600" aria-disabled="true">{t('nav.reviews')}</span>
              <span className="block cursor-not-allowed text-slate-600" aria-disabled="true">Partners</span>
            </div>
          </div>

          <div>
            <div className="mt-4 space-y-4">
              <div className="flex w-full items-start gap-3">
                <span className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-red-300">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-5.8 7-11a7 7 0 1 0-14 0c0 5.2 7 11 7 11Z" />
                    <circle cx="12" cy="10" r="2.2" />
                  </svg>
                </span>
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open Elmshelf location in Google Maps"
                  className="flex-1 text-left text-lg font-bold leading-relaxed text-white no-underline transition hover:text-red-300 hover:no-underline sm:text-xl"
                >
                  Elmshelf, 3 Langley Cl, Romford RM3 8XB
                </a>
              </div>

              <div className="flex w-full items-start gap-3">
                <span className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-red-300">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
                  </svg>
                </span>
                <div className="flex-1 text-left">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Opening Hours</p>
                  <p className="mt-1 text-sm font-semibold leading-relaxed text-white">
                    Monday-Saturday: 8:00 AM - 7:00 PM
                  </p>
                  <p className="text-sm font-semibold leading-relaxed text-slate-300">
                    Sunday: 9:00 AM - 5:00 PM
                  </p>
                </div>
              </div>

              <div className="flex w-full items-center gap-3">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-red-300">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                    <path d="M6.62 10.79a15.06 15.06 0 0 0 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.56 0 1 .45 1 1V20a1 1 0 0 1-1 1C10.85 21 3 13.15 3 3a1 1 0 0 1 1-1h3.5c.55 0 1 .44 1 1 0 1.24.2 2.45.57 3.57.11.35.03.75-.25 1.02l-2.2 2.2Z" />
                  </svg>
                </span>
                <a href="tel:+447584682048" className="flex-1 text-left text-2xl font-extrabold text-primary no-underline transition hover:text-red-400 hover:no-underline sm:text-3xl">
                  +44 7584682048
                </a>
              </div>

              <div className="flex w-full items-center gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">Follow us</p>
                <div className="flex items-center gap-2">
                  {socialLinks.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Follow Elmshelf on ${item.label}`}
                      title={item.label}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-red-300 transition hover:bg-red-600 hover:text-white"
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        {item.icon}
                      </svg>
                    </a>
                  ))}
                </div>
              </div>

              <div className="flex justify-center pt-2 lg:justify-end">
                <img
                  src="/elms-logo.svg"
                  alt="Elmshelf logo"
                  className="h-16 w-auto max-w-[260px] object-contain sm:h-20 sm:max-w-[320px]"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-800 pt-6 text-sm text-slate-400">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>
              &copy; 2026 Elmshelf. All rights reserved.
              <span className="ml-2">
                Powered by{' '}
                <a
                  href="https://hexvels.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary transition hover:text-red-400"
                >
                  Hexvels
                </a>
              </span>
            </p>
            <button
              type="button"
              onClick={openCookieSettings}
              className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              {t('footer.cookieSettings')}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
