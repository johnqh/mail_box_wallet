/**
 * Main App Component
 *
 * Router setup and app initialization
 */

import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import browser from 'webextension-polyfill';
import { useWalletStore } from './store/walletStore';
import { registerServices } from '@/shared/di';

// Pages
import { Home } from './pages/Home';
import { Unlock } from './pages/Unlock';
import { ConnectApproval } from './pages/ConnectApproval';
import { SigningApproval } from './pages/SigningApproval';
import { Settings } from './pages/Settings';
import { CreateAccount } from './pages/settings/CreateAccount';
import { BackupSeedPhrase } from './pages/settings/BackupSeedPhrase';
import { ImportAccount } from './pages/settings/ImportAccount';
import { ManageAccount } from './pages/settings/ManageAccount';
import { ChangePassword } from './pages/settings/ChangePassword';
import { ResetWallet } from './pages/settings/ResetWallet';
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
  const [pendingRequestType, setPendingRequestType] = useState<string | null>(null);

  useEffect(() => {
    // Initialize DI services
    registerServices();

    // Check for pending requests
    async function checkForPendingRequests() {
      try {
        const response = await browser.runtime.sendMessage({
          type: 'GET_PENDING_REQUEST',
        }) as { request?: { type: string } };
        if (response.request) {
          setPendingRequestType(response.request.type);
        }
      } catch (error) {
        console.error('Failed to check for pending requests:', error);
      }
    }

    // Check wallet initialization status
    Promise.all([
      checkInitialization(),
      checkForPendingRequests(),
    ]).finally(() => {
      setLoading(false);
    });
  }, [checkInitialization]);

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
          <Route path="/connect-approval" element={<ConnectApproval />} />
          <Route path="/sign-approval" element={<SigningApproval />} />
          <Route path="/settings" element={isUnlocked ? <Settings /> : <Navigate to="/unlock" />} />
          <Route path="/settings/create-account" element={isUnlocked ? <CreateAccount /> : <Navigate to="/unlock" />} />
          <Route path="/settings/import-account" element={isUnlocked ? <ImportAccount /> : <Navigate to="/unlock" />} />
          <Route path="/settings/account/:address" element={isUnlocked ? <ManageAccount /> : <Navigate to="/unlock" />} />
          <Route path="/settings/backup-seed" element={isUnlocked ? <BackupSeedPhrase /> : <Navigate to="/unlock" />} />
          <Route path="/settings/change-password" element={isUnlocked ? <ChangePassword /> : <Navigate to="/unlock" />} />
          <Route path="/settings/reset-wallet" element={isUnlocked ? <ResetWallet /> : <Navigate to="/unlock" />} />
          <Route path="/debug" element={<Debug />} />

          {/* Default Route */}
          <Route
            path="/"
            element={
              !isInitialized ? (
                <Navigate to="/onboarding/welcome" />
              ) : pendingRequestType === 'connect' ? (
                <Navigate to="/connect-approval" />
              ) : pendingRequestType === 'sign' || pendingRequestType === 'signTypedData' ? (
                <Navigate to="/sign-approval" />
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
