/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useAuthStore } from './lib/store';
import Layout from './components/layout/Layout';
import DashboardLayout from './components/layout/DashboardLayout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Overview from './pages/dashboard/Overview';
import WhatsApp from './pages/dashboard/WhatsApp';
import ExportContacts from './pages/dashboard/ExportContacts';
import WebsiteBuilder from './pages/dashboard/WebsiteBuilder';
import PaymentBuilder from './pages/dashboard/PaymentBuilder';
import TestimonialBuilder from './pages/dashboard/TestimonialBuilder';
import LinktreeBuilder from './pages/dashboard/LinktreeBuilder';
import WebInspector from './pages/dashboard/WebInspector';
import ImgToUrl from './pages/dashboard/ImgToUrl';
import Upgrade from './pages/Upgrade';
import Lock from './pages/Lock';
import UserManagement from './pages/dashboard/UserManagement';
import PublicView from './pages/testi/PublicView';
import AdminView from './pages/testi/AdminView';
import ProtectedRoute from './components/auth/ProtectedRoute';
import VIPFeatureGuard from './components/VIPFeatureGuard';
import { Toaster } from 'sonner';

import PaymentPublicView from './pages/payment/PublicView';
import PaymentAdminView from './pages/payment/AdminView';
import LinktreePublicView from './pages/linktree/PublicView';
import LinktreeAdminView from './pages/linktree/AdminView';
import WebsitePublicView from './pages/website/PublicView';
import WebsiteAdminView from './pages/website/AdminView';

export default function App() {
  const { setUser, setRole, setHighestRole, setStatusActive, setLoading } = useAuthStore();

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    let unsubDoc: (() => void) | undefined;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user && db) {
        unsubDoc = onSnapshot(doc(db, 'users', user.uid), async (userDoc) => {
          if (userDoc.exists()) {
            const userData = userDoc.data();
            let userRole = userData.role || 'free';
            if (userRole === 'resseler') userRole = 'reseller';
            
            let highestRole = userData.highest_role || userRole;
            let statusActive = userData.status_active !== undefined ? userData.status_active : true;

            // Update highest_role if current role is higher
            const roleWeights = { free: 0, vip: 1, reseller: 2, dev: 3, owner: 4 };
            if (roleWeights[userRole as keyof typeof roleWeights] > roleWeights[highestRole as keyof typeof roleWeights]) {
              highestRole = userRole;
              try {
                await updateDoc(doc(db, 'users', user.uid), { highest_role: highestRole });
              } catch (e) {}
            }

            // Check old expiry logic (keep it just in case, but new logic is status_active)
            if (userData.expiryDate && userRole !== 'free' && userRole !== 'owner' && userRole !== 'dev') {
              const expiry = new Date(userData.expiryDate);
              if (new Date() > expiry) {
                userRole = 'free';
                try {
                  await updateDoc(doc(db, 'users', user.uid), { role: 'free' });
                } catch (e) {}
              }
            }
            
            setRole(userRole);
            setHighestRole(highestRole);
            setStatusActive(statusActive);
          } else {
            setRole('free');
            setHighestRole('free');
            setStatusActive(true);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching user role:", error);
          setRole('free');
          setHighestRole('free');
          setStatusActive(true);
          setLoading(false);
        });
      } else {
        if (unsubDoc) {
          unsubDoc();
          unsubDoc = undefined;
        }
        setRole(user ? 'free' : null);
        setHighestRole(user ? 'free' : null);
        setStatusActive(true);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubDoc) unsubDoc();
    };
  }, [setUser, setRole, setLoading]);

  return (
    <BrowserRouter>
      <Toaster position="top-right" theme="dark" />
      <Routes>
        {/* Custom Website Routes (Standalone) */}
        <Route path="/w/:slug" element={<WebsitePublicView />} />
        <Route path="/w/:slug/admin" element={<WebsiteAdminView />} />

        {/* Testimonial Site Routes (Standalone) */}
        <Route path="/t/:slug" element={<PublicView />} />
        <Route path="/t/:slug/admin" element={<AdminView />} />

        {/* Payment Site Routes (Standalone) */}
        <Route path="/p/:slug" element={<PaymentPublicView />} />
        <Route path="/p/:slug/admin" element={<PaymentAdminView />} />

        {/* Linktree Site Routes (Standalone) */}
        <Route path="/l/:slug" element={<LinktreePublicView />} />
        <Route path="/l/:slug/admin.html" element={<LinktreeAdminView />} />

        <Route path="/" element={<Layout />}>
          <Route index element={<Landing />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="lock" element={<Lock />} />
          
          <Route 
            path="dashboard" 
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Outlet />
                </DashboardLayout>
              </ProtectedRoute>
            }
          >
            <Route index element={<Overview />} />
            <Route path="whatsapp" element={<VIPFeatureGuard featureName="WhatsApp Automation"><WhatsApp /></VIPFeatureGuard>} />
            <Route path="export" element={<VIPFeatureGuard featureName="Export Kontak"><ExportContacts /></VIPFeatureGuard>} />
            <Route path="website" element={<VIPFeatureGuard featureName="Website Builder"><WebsiteBuilder /></VIPFeatureGuard>} />
            <Route path="payment" element={<VIPFeatureGuard featureName="Payment Builder"><PaymentBuilder /></VIPFeatureGuard>} />
            <Route path="testimonials" element={<VIPFeatureGuard featureName="Testimonial Builder"><TestimonialBuilder /></VIPFeatureGuard>} />
            <Route path="linktree" element={<VIPFeatureGuard featureName="Linktree Builder"><LinktreeBuilder /></VIPFeatureGuard>} />
            <Route path="inspector" element={<VIPFeatureGuard featureName="Web Inspector"><WebInspector /></VIPFeatureGuard>} />
            <Route path="img2url" element={<ImgToUrl />} />
            <Route path="upgrade" element={<Upgrade />} />
            <Route path="users" element={<UserManagement />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
