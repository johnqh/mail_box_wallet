/**
 * Main App Component
 *
 * Router setup and app initialization
 */

import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useWalletStore } from './store/walletStore';
import { registerServices } from '@/shared/di';

// Pages
import { Home } from './pages/Home';
import { Unlock } from './pages/Unlock';
import Debug from './pages/Debug';
import {
  Welcome,
  CreateWallet,
  ImportWallet,
  SetPassword,
  Complete,
} from './pages/onboarding';

function App() {
  const { isInitialized, isUnlocked, checkInitialization } = useWalletStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize DI services
    registerServices();

    // Check wallet initialization status
    checkInitialization().finally(() => {
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-primary-600 mb-4"></div>
          <p className="text-gray-600">Loading wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[400px] h-[600px] overflow-hidden">
      <BrowserRouter>
        <Routes>
          {/* Onboarding Routes */}
          <Route path="/onboarding/welcome" element={<Welcome />} />
          <Route path="/onboarding/create" element={<CreateWallet />} />
          <Route path="/onboarding/import" element={<ImportWallet />} />
          <Route path="/onboarding/password" element={<SetPassword />} />
          <Route path="/onboarding/complete" element={<Complete />} />

          {/* Main App Routes */}
          <Route path="/home" element={isUnlocked ? <Home /> : <Navigate to="/unlock" />} />
          <Route path="/unlock" element={<Unlock />} />
          <Route path="/debug" element={<Debug />} />

          {/* Default Route */}
          <Route
            path="/"
            element={
              !isInitialized ? (
                <Navigate to="/onboarding/welcome" />
              ) : isUnlocked ? (
                <Navigate to="/home" />
              ) : (
                <Navigate to="/unlock" />
              )
            }
          />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
