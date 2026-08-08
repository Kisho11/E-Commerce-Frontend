import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const API_BASE_URL = process.env.REACT_APP_API_URL;
const API_ORIGIN = API_BASE_URL ? new URL(API_BASE_URL).origin : '';

const resolveMediaUrl = (value) => {
  if (!value) return '';
  if (/^(data:|blob:|https?:)/i.test(value)) return value;
  if (!API_ORIGIN) return value;
  if (value.startsWith('/')) return `${API_ORIGIN}${value}`;
  return `${API_ORIGIN}/${value}`;
};

function AdvertPopup() {
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadBanner = async () => {
      if (!API_BASE_URL) {
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/marketing/banner`, {
          credentials: 'include',
        });
        const data = await response.json().catch(() => null);
        if (!cancelled && response.ok && data?.image_url) {
          setBanner(data);
          setIsVisible(true);
        }
      } catch (error) {
        if (!cancelled) {
          setBanner(null);
        }
      }
    };

    loadBanner();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleClose = () => setIsVisible(false);

  if (!isVisible || !banner?.image_url) return null;

  const bannerUrl = resolveMediaUrl(banner.image_url);
  const ctaUrl = banner.cta_url || '/catalogue';
  const isExternalCta = /^https?:\/\//i.test(ctaUrl);
  const internalCta = ctaUrl.startsWith('/') ? ctaUrl : `/${ctaUrl}`;
  const image = (
    <img
      src={bannerUrl}
      alt="Elmshelf promotional offer"
      className="max-h-[82vh] w-full object-contain"
    />
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 shadow transition hover:bg-white"
          aria-label={t('advert.close')}
        >
          <svg width="13" height="13" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M13 2 2 13M2 2l11 11"
              stroke="#1F2937"
              strokeOpacity=".7"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {isExternalCta ? (
          <a href={ctaUrl} target="_blank" rel="noreferrer" onClick={handleClose}>
            {image}
          </a>
        ) : (
          <Link to={internalCta} onClick={handleClose}>
            {image}
          </Link>
        )}
      </div>
    </div>
  );
}

export default AdvertPopup;
