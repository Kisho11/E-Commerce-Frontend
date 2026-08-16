import React from 'react';
import { Link } from 'react-router-dom';
import Slider from '../components/Slider';
import CategoryLanding from '../components/CategoryLanding';
import Seo from '../components/Seo';
import { useLanguage } from '../context/LanguageContext';

const logos = [
  { src: '/clilogs/BudgensLogo.svg.png', alt: 'Budgens logo' },
  { src: '/clilogs/Costcutter.png', alt: 'Costcutter logo' },
  { src: '/clilogs/Londis-logo-m716zgtifbdvpw1dlya58d2y97d3i115ir467iufq0.png', alt: 'Londis logo' },
  { src: '/clilogs/Night Presentation - Cover .png', alt: 'Night Presentation logo' },
  { src: '/clilogs/Nisa_retailer-Logo.wine_.png', alt: 'Nisa logo' },
  { src: '/clilogs/Spar-Logo.jpg', alt: 'SPAR logo' },
  { src: '/clilogs/best-one-blue-logo.png', alt: 'Best-one logo' },
  { src: '/clilogs/go-local-logo.jpg', alt: 'Go Local logo' },
  { src: '/clilogs/premier-logo.png', alt: 'Premier logo' },
];

function Home() {
  const { t } = useLanguage();

  return (
    <div className="pb-6">
      <Seo
        title="Retail Shelving, Displays & Shop Fittings"
        description="Shop retail shelving, display counters, refrigeration units, flooring, and store fixtures from Elmshelf for supermarkets, bakeries, pharmacies, and specialist shops."
      />
      <Slider />

      <section className="mt-10">
        <div className="logo-marquee w-full bg-white py-6 sm:py-8">
          <div className="logo-track">
            {[...logos, ...logos].map((logo, index) => (
              <div key={`${logo.src}-${index}`} className="logo-item">
                <img src={logo.src} alt={logo.alt} className="logo-image" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="shell mt-10">
        <CategoryLanding />
      </section>

      <section className="shell mt-6">
        <div className="rounded-3xl bg-slate-900 p-8 text-white sm:p-12">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-blue-300">{t('home.nextStep')}</p>
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">{t('home.ctaTitle')}</h2>
          <p className="mb-7 max-w-2xl text-slate-200">
            {t('home.ctaDesc')}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/request-quotation"
              className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-white transition hover:bg-red-700"
            >
              {t('home.requestConsultation')}
            </Link>
            <Link to="/catalogue" className="rounded-full border border-slate-500 px-6 py-3 text-sm font-bold text-slate-100">
              {t('home.downloadCatalogue')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
