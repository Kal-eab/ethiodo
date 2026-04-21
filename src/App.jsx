import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import MobileTabBar from '@/components/store/MobileTabBar';

import Home from '@/pages/Home';
import ProductDetail from '@/pages/ProductDetail';
import DirectPayment from '@/pages/DirectPayment';
import Orders from '@/pages/Orders';
import Favorites from '@/pages/Favorites';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminDashboard from '@/pages/admin/Dashboard';
import AdminProducts from '@/pages/admin/Products';
import AdminOrders from '@/pages/admin/Orders';
import AdminRequests from '@/pages/admin/Requests';
import AdminMessages from '@/pages/admin/Messages';
import AdminReviews from '@/pages/admin/Reviews';
import ReviewInsights from '@/pages/admin/ReviewInsights';
import Messages from '@/pages/Messages';
import About from '@/pages/About';
import ContactPage from '@/pages/ContactPage';
import PrivacyPolicy from '@/pages/legal/PrivacyPolicy';
import RefundPolicy from '@/pages/legal/RefundPolicy';
import Terms from '@/pages/legal/Terms';
import Profile from '@/pages/Profile';

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.18, ease: 'easeOut' }}
        style={{ minHeight: '100vh' }}
      >
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/payment" element={<DirectPayment />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/profile" element={<Profile />} />
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
          </Route>
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    // auth_required: allow browsing — only block on actual purchase actions
    // so we intentionally fall through and render the app for all other errors
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
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App