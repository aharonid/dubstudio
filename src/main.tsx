import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './lib/auth.tsx';
import ProtectedRoute from './components/ProtectedRoute.tsx';
import Layout from './components/Layout.tsx';
import App from './App.tsx';
import Login from './components/Login.tsx';
import Signup from './components/Signup.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Contact from './pages/Contact.tsx';
import Terms from './pages/Terms.tsx';
import Privacy from './pages/Privacy.tsx';
import Share from './pages/Share.tsx';
import Pricing from './pages/Pricing.tsx';
import Account from './pages/Account.tsx';
import Quiz from './pages/Quiz.tsx';
import Analytics2 from './pages/Analytics2.tsx';
import Feedback from './pages/Feedback.tsx';
import Admin from './pages/Admin.tsx';
import PurchaseSuccess from './pages/PurchaseSuccess.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/share/:token" element={<Share />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/account" element={<Account />} />
            <Route path="/purchase-success" element={<PurchaseSuccess />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route
              path="/analytics2"
              element={
                <ProtectedRoute>
                  <Analytics2 />
                </ProtectedRoute>
              }
            />
            <Route path="/feedback" element={<Feedback />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <Admin />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
