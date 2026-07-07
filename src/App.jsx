import React from 'react';
import { trackPageView, trackLogin } from '@/lib/analytics';
import { Toaster } from "@/components/ui/toaster"
import { base44 } from '@/api/base44Client';
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import MobileTabBar from '@/components/store/MobileTabBar';

// Hot storefront paths stay eagerly bundled — everything else is code-split so
// anonymous shoppers don't download the admin dashboard, checkout flow, and
// legal pages just to view the product grid.
import Home from '@/pages/Home';
import ProductDetail from '@/pages/ProductDetail';

const DirectPayment = React.lazy(() => import('@/pages/DirectPayment'));
const Orders = React.lazy(() => import('@/pages/Orders'));
const Favorites = React.lazy(() => import('@/pages/Favorites'));
const AdminLayout = React.lazy(() => import('@/components/admin/AdminLayout'));
const AdminDashboard = React.lazy(() => import('@/pages/admin/Dashboard'));
const AdminProducts = React.lazy(() => import('@/pages/admin/Products'));
const AdminOrders = React.lazy(() => import('@/pages/admin/Orders.jsx'));
const AdminRequests = React.lazy(() => import('@/pages/admin/Requests'));
const AdminMessages = React.lazy(() => import('@/pages/admin/Messages'));
const AdminReviews = React.lazy(() => import('@/pages/admin/Reviews'));
const ReviewInsights = React.lazy(() => import('@/pages/admin/ReviewInsights'));
const Revenue = React.lazy(() => import('@/pages/admin/Revenue'));
const ConversionRates = React.lazy(() => import('@/pages/admin/ConversionRates'));
const AdminCustomers = React.lazy(() => import('@/pages/admin/Customers'));
const AdminCategories = React.lazy(() => import('@/pages/admin/Categories'));
const AdminCreators = React.lazy(() => import('@/pages/admin/Creators'));
const AdminDeliveries = React.lazy(() => import('@/pages/admin/Deliveries'));
const Deliveries = React.lazy(() => import('@/pages/Deliveries'));
const Messages = React.lazy(() => import('@/pages/Messages'));
const About = React.lazy(() => import('@/pages/About'));
const ContactPage = React.lazy(() => import('@/pages/ContactPage'));
const PrivacyPolicy = React.lazy(() => import('@/pages/legal/PrivacyPolicy'));
const RefundPolicy = React.lazy(() => import('@/pages/legal/RefundPolicy'));
const Terms = React.lazy(() => import('@/pages/legal/Terms'));
const Profile = React.lazy(() => import('@/pages/Profile'));
const Dashboard = React.lazy(() => import('@/pages/Dashboard'));
const Register = React.lazy(() => import('@/pages/Register'));
const Login = React.lazy(() => import('@/pages/Login'));

const RouteFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
  </div>
);

const AnimatedRoutes = () => {
  const location = useLocation();

  React.useEffect(() => {
    trackPageView(location.pathname, document.title);
  }, [location.pathname]);

  return (
    <React.Suspense fallback={<RouteFallback />}>
    <Routes location={location}>
      <Route path="/" element={<Home />} />
      <Route path="/product/:id" element={<ProductDetail />} />
      <Route path="/payment" element={<DirectPayment />} />
      <Route path="/orders" element={<Orders />} />
      <Route path="/deliveries" element={<Deliveries />} />
      <Route path="/favorites" element={<Favorites />} />
      <Route path="/messages" element={<Messages />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/legal/privacy" element={<PrivacyPolicy />} />
      <Route path="/legal/refund" element={<RefundPolicy />} />
      <Route path="/legal/terms" element={<Terms />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="requests" element={<AdminRequests />} />
        <Route path="messages" element={<AdminMessages />} />
        <Route path="reviews" element={<AdminReviews />} />
        <Route path="review-insights" element={<ReviewInsights />} />
        <Route path="revenue" element={<Revenue />} />
        <Route path="conversion-rates" element={<ConversionRates />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="creators" element={<AdminCreators />} />
        <Route path="deliveries" element={<AdminDeliveries />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </React.Suspense>
  );
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();
  const [user, setUser] = React.useState(null);
  const location = useLocation();

  React.useEffect(() => {
    if (!isLoadingAuth) {
      base44.auth.me().then(u => {
        setUser(u);
        const skipPaths = ['/register', '/admin', '/legal'];
        const shouldSkip = skipPaths.some(p => location.pathname.startsWith(p));
        if (u && !u.profile_complete && !shouldSkip) {
          window.location.href = '/register';
        }
        if (u) {
          trackLogin();
          base44.auth.updateMe({
            last_login_at: new Date().toISOString(),
            login_count: (u.login_count || 0) + 1,
          }).catch(() => {});
        }
      }).catch(() => {});
    }
  }, [isLoadingAuth, location.pathname]);

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="min-h-screen bg-background">
        {/* Navbar skeleton */}
        <div className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-border/30" style={{ background: '#0a0a0a' }}>
          <div className="max-w-[140rem] mx-auto px-3 sm:px-5 h-full flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-secondary animate-pulse" />
            <div className="w-24 h-4 rounded bg-secondary animate-pulse hidden sm:block" />
            <div className="hidden md:flex gap-2 mx-2">
              {[60,52,64,72,80,48].map((w,i) => <div key={i} className="h-6 rounded-full bg-secondary animate-pulse" style={{width:w}} />)}
            </div>
            <div className="flex-1 hidden md:block mx-2">
              <div className="h-9 rounded-full bg-secondary animate-pulse" />
            </div>
            <div className="flex-1 md:hidden" />
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-secondary animate-pulse" />
              <div className="w-20 h-8 rounded-full bg-secondary animate-pulse hidden md:block" />
            </div>
          </div>
        </div>
        {/* Category bar skeleton */}
        <div className="fixed top-14 left-0 right-0 z-40 border-b border-border/30 px-4 py-2" style={{ background: '#0a0a0a' }}>
          <div className="flex gap-2 overflow-hidden">
            {[40,90,72,52,60,92].map((w,i) => <div key={i} className="h-7 rounded-full bg-secondary animate-pulse flex-shrink-0" style={{width:w}} />)}
          </div>
        </div>
        {/* Product grid skeleton */}
        <div className="pt-[96px] px-3 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 pt-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl animate-pulse overflow-hidden">
                <div className="aspect-[4/3] bg-secondary" />
                <div className="p-2.5 space-y-1.5">
                  <div className="h-3 bg-secondary rounded w-3/4" />
                  <div className="h-4 bg-secondary rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
  }

  return (
    <>
      <AnimatedRoutes />
      <MobileTabBar />
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster position="top-center" toastOptions={{ style: { zIndex: 99999 } }} />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
