/**
 * Home Page
 *
 * Main wallet dashboard
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent } from '@sudobility/components';
import { Layout } from '../components';
import { useWalletStore } from '../store/walletStore';

export function Home() {
  const navigate = useNavigate();
  const { currentAddress, lockWallet } = useWalletStore();

  const handleLock = async () => {
    await lockWallet();
    navigate('/unlock');
  };

  const handleCopyAddress = async () => {
    if (currentAddress) {
      await navigator.clipboard.writeText(currentAddress);
    }
  };

  return (
    <Layout
      title="Identity Wallet"
      subtitle="Your secure signing wallet"
    >
      <div className="max-w-2xl mx-auto">
        {/* Wallet Address Card */}
        <Card className="mb-6">
          <CardContent>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Wallet Address</h3>
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className="font-mono text-sm text-gray-900 truncate mr-3">
                {currentAddress || 'Loading...'}
              </p>
              <Button
                variant="ghost"
                onClick={handleCopyAddress}
              >
                Copy
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="py-4">
              <div className="text-center">
                <div className="text-3xl mb-2">✍️</div>
                <p className="text-sm font-medium text-gray-900">Sign Messages</p>
                <p className="text-xs text-gray-600 mt-1">Available via dApps</p>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="py-4">
              <div className="text-center">
                <div className="text-3xl mb-2">🔌</div>
                <p className="text-sm font-medium text-gray-900">Connected Sites</p>
                <p className="text-xs text-gray-600 mt-1">No sites connected</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent>
            <div className="flex items-start">
              <span className="text-2xl mr-3">ℹ️</span>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Signing-Only Wallet</h3>
                <p className="text-sm text-gray-700">
                  This wallet is designed for signing messages and authentication.
                  Transaction signing is not supported. Use a transaction wallet like MetaMask
                  for sending tokens.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings & Actions */}
        <div className="space-y-3">
          <Button
            className="w-full"
            variant="secondary"
            onClick={() => navigate('/settings')}
          >
            ⚙️ Settings
          </Button>

          <Button
            className="w-full"
            variant="ghost"
            onClick={handleLock}
          >
            🔒 Lock Wallet
          </Button>

          <Button
            className="w-full"
            variant="ghost"
            onClick={() => navigate('/debug')}
          >
            🐛 Debug Panel
          </Button>
        </div>
      </div>
    </Layout>
  );
}
