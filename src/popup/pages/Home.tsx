/**
 * Home Page
 *
 * Main wallet dashboard
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent } from '@sudobility/components';
import { Layout } from '../components';
import { useWalletStore } from '../store/walletStore';
import { getService, SERVICE_TOKENS } from '@/shared/di';
import type { IKeyringService } from '@/shared/di';

export function Home() {
  const navigate = useNavigate();
  const { currentAddress, lockWallet } = useWalletStore();

  // Load account on mount if not already loaded
  useEffect(() => {
    async function loadAccount() {
      if (!currentAddress) {
        try {
          const keyringService = getService<IKeyringService>(SERVICE_TOKENS.KEYRING);
          const accounts = await keyringService.getAccounts();
          if (accounts.length > 0) {
            useWalletStore.setState({ currentAddress: accounts[0].address, accounts });
          }
        } catch (error) {
          console.error('Failed to load account:', error);
        }
      }
    }
    loadAccount();
  }, [currentAddress]);

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
      topBarRight={
        <button
          onClick={() => navigate('/settings')}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          title="Settings"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      }
      actions={
        <Button
          onClick={handleLock}
          variant="outline"
          className="w-full"
        >
          Lock Wallet
        </Button>
      }
    >
      <div className="space-y-4">
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
