import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { ProductProvider } from './context/ProductContext';
import { OrderProvider } from './context/OrderContext';
import { LanguageProvider } from './context/LanguageContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CartToast from './components/CartToast';
import EmailVerificationBanner from './components/EmailVerificationBanner';
import CookieConsentBanner from './components/CookieConsentBanner';
import AdvertPopup from './components/AdvertPopup';
import QuickContactActions from './components/QuickContactActions';
import ScrollToTop from './components/ScrollToTop';

const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const ProductsByIndustry = lazy(() => import('./pages/ProductsByIndustry'));
const Showroom = lazy(() => import('./pages/Showroom'));
const Clients = lazy(() => import('./pages/Clients'));
const Reviews = lazy(() => import('./pages/Reviews'));
const Catalogue = lazy(() => import('./pages/Catalogue'));
const Sponsor = lazy(() => import('./pages/Sponsor'));
const Login = lazy(() => import('./pages/Login'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const ManagerActivate = lazy(() => import('./pages/ManagerActivate'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const ManagerDashboard = lazy(() => import('./pages/ManagerDashboard'));
const CustomerPortal = lazy(() => import('./pages/CustomerPortal'));
const CategoriesPage = lazy(() => import('./pages/CategoriesPage'));

function CustomerLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <EmailVerificationBanner />
      <CartToast />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
      <QuickContactActions />
      <AdvertPopup />
      <CookieConsentBanner />
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <ProductProvider>
        <AuthProvider>
          <OrderProvider>
            <CartProvider>
              <Router>
                <ScrollToTop />
                <Suspense fallback={null}>
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Login />} />
                    <Route path="/verify-email" element={<VerifyEmail />} />
                    <Route path="/manager-activate" element={<ManagerActivate />} />

                    <Route
                      path="/admin/dashboard"
                      element={
                        <ProtectedRoute requiredRole="admin">
                          <AdminDashboard />
                        </ProtectedRoute>
                      }
                    />

                    <Route
                      path="/manager/dashboard"
                      element={
                        <ProtectedRoute requiredRole="manager">
                          <ManagerDashboard />
                        </ProtectedRoute>
                      }
                    />

                    <Route element={<CustomerLayout />}>
                      <Route path="/" element={<Home />} />
                      <Route path="/about" element={<About />} />
                      <Route path="/product/:id" element={<ProductDetail />} />
                      <Route path="/cart" element={<Cart />} />
                      <Route path="/checkout" element={<Checkout />} />
                      <Route path="/products-by-industry" element={<ProductsByIndustry />} />
                      <Route path="/products-by-industry/:industry" element={<ProductsByIndustry />} />
                      <Route path="/showroom" element={<Showroom />} />
                      <Route path="/clients" element={<Clients />} />
                      <Route path="/reviews" element={<Reviews />} />
                      <Route path="/catalogue" element={<Catalogue />} />
                      <Route path="/sponsor" element={<Sponsor />} />
                      <Route path="/categories" element={<CategoriesPage />} />
                      <Route
                        path="/customer-portal"
                        element={
                          <ProtectedRoute requiredRole="user">
                            <CustomerPortal />
                          </ProtectedRoute>
                        }
                      />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Route>
                  </Routes>
                </Suspense>
              </Router>
            </CartProvider>
          </OrderProvider>
        </AuthProvider>
      </ProductProvider>
    </LanguageProvider>
  );
}

export default App;
