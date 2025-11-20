/**
 * Settings Page
 *
 * Manage wallet settings, accounts, security, and networks
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, CardHeader, Input, Label } from '@sudobility/components';
import { Layout } from '../components';
import { useWalletStore } from '../store/walletStore';
import { getService, SERVICE_TOKENS } from '@/shared/di';
import type { IKeyringService, ISessionService } from '@/shared/di';

type SettingsTab = 'accounts' | 'security' | 'networks' | 'advanced';

export function Settings() {
  const navigate = useNavigate();
  const { currentAddress, switchAccount } = useWalletStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('accounts');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [autoLockTimeout, setAutoLockTimeout] = useState<number>(5);

  // Load accounts and settings on mount
  useEffect(() => {
    async function loadData() {
      try {
        const keyringService = getService<IKeyringService>(SERVICE_TOKENS.KEYRING);
        const sessionService = getService<ISessionService>(SERVICE_TOKENS.SESSION);

        const loadedAccounts = await keyringService.getAccounts();
        setAccounts(loadedAccounts);

        const timeout = await sessionService.getAutoLockTimeout();
        setAutoLockTimeout(timeout);
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    }
    loadData();
  }, []);

  const tabs = [
    { id: 'accounts' as SettingsTab, label: 'Accounts', icon: '👤' },
    { id: 'security' as SettingsTab, label: 'Security', icon: '🔒' },
    { id: 'networks' as SettingsTab, label: 'Networks', icon: '🌐' },
    { id: 'advanced' as SettingsTab, label: 'Advanced', icon: '⚙️' },
  ];

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/home')}
            className="text-gray-600 hover:text-gray-900 mb-2 flex items-center text-sm"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-600 mt-1">Manage your wallet configuration</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                  ${activeTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }
                `}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-4">
          {activeTab === 'accounts' && (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Accounts</h3>
                    <Button onClick={() => navigate('/settings/create-account')} variant="ghost">
                      + Add Account
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {accounts.length === 0 ? (
                    <p className="text-sm text-gray-600">No accounts found</p>
                  ) : (
                    <div className="space-y-3">
                      {accounts.map((account) => {
                        const isActive = account.address.toLowerCase() === currentAddress?.toLowerCase();
                        return (
                          <div
                            key={account.address}
                            className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all cursor-pointer ${
                              isActive
                                ? 'bg-primary-50 border-primary-500'
                                : 'bg-gray-50 border-transparent hover:bg-gray-100'
                            }`}
                            onClick={() => switchAccount(account.address)}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">{account.name}</span>
                                {isActive && (
                                  <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded">
                                    Active
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 font-mono mt-1">
                                {account.address.slice(0, 6)}...{account.address.slice(-4)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                onClick={() => navigate(`/settings/account/${account.address}`)}
                              >
                                Manage
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Import Account</h3>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-3">
                    Import an account using a private key
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate('/settings/import-account')}
                  >
                    Import from Private Key
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === 'security' && (
            <>
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Auto-Lock Timer</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="autolock">Lock wallet after (minutes)</Label>
                    <div className="flex items-center gap-3 mt-2">
                      <Input
                        id="autolock"
                        type="number"
                        min="0"
                        value={autoLockTimeout}
                        onChange={(e) => setAutoLockTimeout(parseInt(e.target.value) || 0)}
                        className="flex-1"
                      />
                      <Button
                        onClick={async () => {
                          const sessionService = getService<ISessionService>(SERVICE_TOKENS.SESSION);
                          await sessionService.setAutoLockTimeout(autoLockTimeout);
                        }}
                      >
                        Save
                      </Button>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Set to 0 to disable auto-lock</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Backup Seed Phrase</h3>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-3">
                    View and backup your secret recovery phrase
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate('/settings/backup-seed')}
                  >
                    View Seed Phrase
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Change Password</h3>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-3">
                    Update your wallet password
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate('/settings/change-password')}
                  >
                    Change Password
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === 'networks' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Networks</h3>
                  <Button variant="ghost" onClick={() => navigate('/settings/add-network')}>
                    + Add Network
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">Network management coming soon...</p>
              </CardContent>
            </Card>
          )}

          {activeTab === 'advanced' && (
            <>
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <h3 className="text-lg font-semibold text-red-900">Reset Wallet</h3>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-red-800 mb-3">
                    This will remove all accounts and settings. Make sure you have backed up your seed phrase!
                  </p>
                  <Button
                    variant="outline"
                    className="w-full border-red-300 text-red-700 hover:bg-red-100"
                    onClick={() => navigate('/settings/reset-wallet')}
                  >
                    Reset Wallet
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">About</h3>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Version</span>
                    <span className="font-mono">0.1.0</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Type</span>
                    <span>Identity Wallet (Signing Only)</span>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
