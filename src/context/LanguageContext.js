import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const LANGUAGE_STORAGE_KEY = 'app_language_v1';

const translations = {
  en: {
    nav: {
      limitedOffer: 'Limited Offer: Up to 25% off',
      viewDeals: 'View Deals',
      getQuote: 'Get Quote',
      banner: 'SAME DAY PICK UP | DELIVERY WITHIN 1 - 3 WORKING DAYS | GET A QUOTE',
      home: 'Home',
      about: 'About',
      showroom: 'Showroom',
      clients: 'Clients',
      reviews: 'Reviews',
      catalogue: 'Catalogue',
      myAccount: 'My Acc',
      industries: 'Industries',
      signIn: 'Sign In',
      signUp: 'Sign Up',
      staffLogin: 'Staff Login',
      adminPortal: 'Admin Portal',
      managerPortal: 'Manager Portal',
      logout: 'Logout',
      cart: 'Cart',
      retailSystems: 'Retail Systems',
      industry: {
        techShops: 'Tech shops',
        diy: 'DIY',
        greengrocer: 'Greengrocer',
        poundShop: 'Pound shop',
        petShop: 'Pet shop',
        vapeShop: 'Vape shop',
        groceryStore: 'Grocery store',
        butcher: 'Butcher',
        organicShops: 'Organic shops',
        pharmacyStore: 'Pharmacy store',
        restaurants: 'Restaurants',
        bakery: 'Bakery',
      },
    },
    lang: {
      english: 'English',
      tamil: 'Tamil',
    },
    slider: {
      eyebrow: 'Trusted quality',
      line1: 'Better Quality.',
      line2: 'Better Display.',
      line3: 'Better Business.',
      subtitle: 'Maximise every inch of your shop space with strong, practical, and high-quality shelving designed for everyday retail use.',
      call: 'Call: +44 7584682048',
      searchPlaceholder: 'Search products, categories, or industries...',
      search: 'Search',
      visitShowroom: 'Visit Showroom',
      viewCatalogue: 'View Catalogue',
    },
    home: {
      feature1Title: 'Layout-first planning',
      feature1Desc: 'Plan aisle spacing, flow, and product visibility before installation.',
      feature2Title: 'Built for high traffic',
      feature2Desc: 'Premium steel and durable components designed for daily retail use.',
      feature3Title: 'Fast deployment',
      feature3Desc: 'Modular pieces simplify rollout across single or multi-location stores.',
      feature4Title: 'Dedicated support',
      feature4Desc: 'Our team helps with category fit, sizing, and restock-ready structure.',
      nextStep: 'Next step',
      ctaTitle: 'Ready to upgrade your retail space?',
      ctaDesc: 'Share your store type and dimensions. We will recommend shelving and fixtures that maximize product visibility.',
      requestConsultation: 'Request Consultation',
      downloadCatalogue: 'Download Catalogue',
    },
    categories: {
      shopByCategory: 'Shop by category',
      chooseCategory: 'Choose category from side navigation',
      categoryHelp: 'Use the large left category panel to instantly filter products by type.',
      categories: 'Categories',
      allProducts: 'All Products',
      items: 'items',
      showing: 'Showing',
      products: 'products.',
      noCategoryImage: 'No category image',
      downloadTitle: 'Download technical catalogues',
      downloadDesc: 'Get dimensions and specifications for planning and procurement.',
      downloadPdf: 'Download PDF',
    },
    footer: {
      brandName: 'Elmshelf',
      title: 'Modern retail fixtures',
      desc: 'We help stores deploy durable shelving and display systems with practical layouts that scale.',
      explore: 'Explore',
      support: 'Support',
      stayUpdated: 'Stay updated',
      receiveUpdates: 'Receive product launches and planning guides.',
      workEmail: 'Work email',
      join: 'Join',
      rights: 'All rights reserved.',
      cookieSettings: 'Cookie settings',
    },
    productsPage: {
      industryCatalog: 'Industry catalog',
      title: 'Products by Industry',
      back: 'Back',
      showingFor: 'Showing products for {industry}.',
      searchResults: 'Search results for "{query}".',
      help: 'Select an industry from navigation or use search to narrow products.',
      noProducts: 'No products found for the selected filters.',
    },
    product: {
      addToCart: 'Add to cart',
      onSale: 'On Sale',
    },
    cookie: {
      notice: 'Cookie notice',
      title: 'We use cookies under GDPR rules',
      desc: 'Necessary cookies are always on for core site features. You can accept or reject optional cookies and update your choice anytime.',
      rejectOptional: 'Reject optional',
      acceptAll: 'Accept all',
      customize: 'Customize',
      hideSettings: 'Hide settings',
      necessary: 'Necessary',
      necessaryDesc: 'Required for cart, login, and security.',
      functional: 'Functional',
      functionalDesc: 'Saves preferences and convenience settings.',
      analytics: 'Analytics',
      analyticsDesc: 'Measures usage to improve pages and products.',
      marketing: 'Marketing',
      marketingDesc: 'Supports ad and campaign personalization.',
      savePreferences: 'Save preferences',
      cancel: 'Cancel',
    },
    advert: {
      badge: 'Special offer',
      titleAccent: "Don't miss out",
      title: 'on our discounted products.',
      desc: 'Save on selected shelving and retail fixtures while the offer lasts.',
      primaryCta: 'Check out the products',
      secondaryCta: 'No thanks',
      close: 'Close advert popup',
    },
  },
  ta: {
    nav: {
      limitedOffer: 'சிறப்பு சலுகை: தேர்ந்தெடுக்கப்பட்ட ஷெல்விங் மற்றும் ஆஃப்-லைசன்ஸ் பொருட்களுக்கு 25% வரை தள்ளுபடி.',
      viewDeals: 'சலுகைகள்',
      getQuote: 'விலை கேள்',
      banner: 'அதே நாளில் பிக் அப் | 1 - 3 வேலை நாட்களில் டெலிவரி | விலை கேள்',
      home: 'முகப்பு',
      about: 'எங்களை பற்றி',
      showroom: 'காட்சி அறை',
      clients: 'வாடிக்கையாளர்கள்',
      reviews: 'விமர்சனங்கள்',
      catalogue: 'கேட்டலாக்',
      myAccount: 'என் கணக்கு',
      industries: 'துறைகள்',
      signIn: 'உள்நுழை',
      signUp: 'பதிவு செய்',
      staffLogin: 'பணியாளர் உள்நுழைவு',
      adminPortal: 'நிர்வாகி பகுதி',
      managerPortal: 'மேலாளர் பகுதி',
      logout: 'வெளியேறு',
      cart: 'கார்ட்',
      retailSystems: 'ரீட்டெயில் சிஸ்டம்ஸ்',
      industry: {
        techShops: 'டெக் கடைகள்',
        diy: 'DIY',
        greengrocer: 'காய்கறி கடை',
        poundShop: 'பவுண்ட் ஷாப்',
        petShop: 'பெட் ஷாப்',
        vapeShop: 'வேப் ஷாப்',
        groceryStore: 'மளிகை கடை',
        butcher: 'மாமிச கடை',
        organicShops: 'ஆர்கானிக் கடைகள்',
        pharmacyStore: 'மருந்தகம்',
        restaurants: 'உணவகங்கள்',
        bakery: 'பேக்கரி',
      },
    },
    lang: {
      english: 'ஆங்கிலம்',
      tamil: 'தமிழ்',
    },
    slider: {
      eyebrow: 'நம்பகமான தரம்',
      line1: 'சிறந்த தரம்.',
      line2: 'சிறந்த காட்சி.',
      line3: 'சிறந்த வணிகம்.',
      subtitle: 'லேஅவுட் மாற்றங்களுக்கும் வளர்ந்து வரும் ஸ்டாக்குக்கும் ஏற்ப மாடுலர் அமைப்புகளைப் பயன்படுத்துங்கள்.',
      call: 'அழைப்பு: +44 7584682048',
      searchPlaceholder: 'பொருட்கள், வகைகள் அல்லது துறைகள் தேடவும்...',
      search: 'தேடு',
      visitShowroom: 'காட்சி அறை',
      viewCatalogue: 'கேட்டலாக்',
    },
    home: {
      feature1Title: 'லேஅவுட் முதலில் திட்டமிடல்',
      feature1Desc: 'இன்ஸ்டாலேஷன் முன் aisle இடைவெளி, ஓட்டம் மற்றும் காட்சி திறனை திட்டமிடுங்கள்.',
      feature2Title: 'அதிக போக்குவரத்திற்கான அமைப்பு',
      feature2Desc: 'தினசரி பயன்பாட்டுக்கான தரமான எஃகு மற்றும் நீடித்த கூறுகள்.',
      feature3Title: 'வேகமான அமலாக்கம்',
      feature3Desc: 'மாடுலர் கூறுகள் ஒற்றை/பல கிளை அமைப்புகளை எளிதாக்கும்.',
      feature4Title: 'தனிப்பட்ட ஆதரவு',
      feature4Desc: 'வகை பொருத்தம், அளவுகள் மற்றும் ரீஸ்டாக் தயார்நிலையில் எங்கள் குழு உதவும்.',
      nextStep: 'அடுத்த படி',
      ctaTitle: 'உங்கள் கடையை மேம்படுத்த தயாரா?',
      ctaDesc: 'உங்கள் கடை வகை மற்றும் அளவுகளை பகிருங்கள். பொருட்களின் காட்சித் திறனை அதிகரிக்கும் தீர்வுகளை பரிந்துரைப்போம்.',
      requestConsultation: 'ஆலோசனை கோரிக்கை',
      downloadCatalogue: 'கேட்டலாக் பதிவிறக்கம்',
    },
    categories: {
      shopByCategory: 'வகைபடி வாங்க',
      chooseCategory: 'பக்க வழிசெலுத்தலில் இருந்து வகையைத் தேர்ந்தெடுக்கவும்',
      categoryHelp: 'பெரிய இடப்புற வகை பேனலை பயன்படுத்தி உடனே பொருட்களை வடிகட்டுங்கள்.',
      categories: 'வகைகள்',
      allProducts: 'அனைத்து பொருட்கள்',
      items: 'பொருட்கள்',
      showing: 'காண்பிப்பு',
      products: 'பொருட்கள்.',
      noCategoryImage: 'வகை படம் இல்லை',
      downloadTitle: 'தொழில்நுட்ப கேட்டலாக் பதிவிறக்கம்',
      downloadDesc: 'திட்டமிடல் மற்றும் கொள்முதல் விவரங்களைப் பெறுங்கள்.',
      downloadPdf: 'PDF பதிவிறக்கம்',
    },
    footer: {
      brandName: 'எலாம்ஷெல்ஃப்',
      title: 'நவீன ரீட்டெயில் ஃபிக்சர்கள்',
      desc: 'அளவுக்கு ஏற்ற வகையில் வளரக்கூடிய ஷெல்விங் மற்றும் டிஸ்ப்ளே அமைப்புகளை கடைகளுக்கு வழங்குகிறோம்.',
      explore: 'ஆராய்க',
      support: 'ஆதரம்',
      stayUpdated: 'புதிய தகவல்கள்',
      receiveUpdates: 'புதிய தயாரிப்புகள் மற்றும் திட்டமிடல் வழிகாட்டிகளைப் பெறுங்கள்.',
      workEmail: 'வேலை மின்னஞ்சல்',
      join: 'சேரவும்',
      rights: 'அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.',
      cookieSettings: 'குக்கீ அமைப்புகள்',
    },
    productsPage: {
      industryCatalog: 'துறை கேட்டலாக்',
      title: 'துறையின்படி பொருட்கள்',
      back: 'முந்தைய பக்கம்',
      showingFor: '{industry} துறைக்கான பொருட்கள் காட்டப்படுகிறது.',
      searchResults: '"{query}" க்கான தேடல் முடிவுகள்.',
      help: 'நெவிகேஷனில் துறையைத் தேர்ந்தெடுக்கவும் அல்லது தேடலைப் பயன்படுத்தவும்.',
      noProducts: 'தேர்ந்தெடுக்கப்பட்ட வடிகளுக்கான பொருட்கள் இல்லை.',
    },
    product: {
      addToCart: 'கார்டில் சேர்',
      onSale: 'சலுகை',
    },
    cookie: {
      notice: 'குக்கீ அறிவிப்பு',
      title: 'GDPR விதிகளின்படி குக்கீகளை பயன்படுத்துகிறோம்',
      desc: 'முக்கிய செயல்பாடுகளுக்கான அவசியமான குக்கீகள் எப்போதும் செயலிலிருக்கும். விருப்ப குக்கீகளை ஏற்க/நிராகரிக்கலாம்.',
      rejectOptional: 'விருப்ப குக்கீகளை நிராகரி',
      acceptAll: 'அனைத்தையும் ஏற்று',
      customize: 'தனிப்பயன்',
      hideSettings: 'அமைப்பை மறை',
      necessary: 'அவசியம்',
      necessaryDesc: 'கார்ட், உள்நுழைவு, பாதுகாப்புக்கு தேவை.',
      functional: 'செயல்பாட்டு',
      functionalDesc: 'விருப்பங்கள் மற்றும் வசதி அமைப்புகளை சேமிக்கும்.',
      analytics: 'பகுப்பாய்வு',
      analyticsDesc: 'பயன்பாட்டை அளந்து மேம்படுத்த உதவும்.',
      marketing: 'மார்க்கெட்டிங்',
      marketingDesc: 'விளம்பர தனிப்பயனாக்கத்திற்கு உதவும்.',
      savePreferences: 'அமைப்பை சேமி',
      cancel: 'ரத்து செய்',
    },
    advert: {
      badge: 'சிறப்பு சலுகை',
      titleAccent: 'தவறவிடாதீர்கள்',
      title: 'எங்கள் தள்ளுபடி செய்யப்பட்ட பொருட்களை.',
      desc: 'அற்புதமான தள்ளுபடிகளை தவறவிடாதீர்கள். அவை முடிவதற்கு முன் இப்போது வாங்குங்கள்!',
      primaryCta: 'பொருட்களை பார்க்க',
      secondaryCta: 'வேண்டாம், எனக்கு தள்ளுபடி தேவையில்லை.',
      close: 'விளம்பர சாளரத்தை மூடு',
    },
  },
};

const LanguageContext = createContext(null);

const getByPath = (obj, path) => path.split('.').reduce((acc, part) => (acc ? acc[part] : undefined), obj);

const interpolate = (template, params) => {
  if (!params) return template;
  return Object.entries(params).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  );
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem(LANGUAGE_STORAGE_KEY) || 'en');

  useEffect(() => {
    document.documentElement.lang = language === 'ta' ? 'ta' : 'en';
  }, [language]);

  const changeLanguage = useCallback((nextLanguage) => {
    setLanguage(nextLanguage);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    document.documentElement.lang = nextLanguage === 'ta' ? 'ta' : 'en';
  }, []);

  const t = useCallback(
    (key, fallback = key, params) => {
      const value = getByPath(translations[language], key) ?? getByPath(translations.en, key) ?? fallback;
      return typeof value === 'string' ? interpolate(value, params) : fallback;
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage: changeLanguage,
      t,
    }),
    [changeLanguage, language, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
