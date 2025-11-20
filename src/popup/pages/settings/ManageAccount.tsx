/**
 * Manage Account Page
 *
 * Rename, delete, or export individual accounts
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, CardContent, CardHeader, Input, Label } from '@sudobility/components';
import { Layout } from '../../components';
import { useWalletStore } from '../../store/walletStore';
import { getService, SERVICE_TOKENS } from '@/shared/di';
import type { IKeyringService } from '@/shared/di';

export function ManageAccount() {
  const navigate = useNavigate();
  const { address } = useParams<{ address: string }>();
  const { currentAddress, switchAccount } = useWalletStore();
  const [account, setAccount] = useState<any>(null);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [privateKey, setPrivateKey] = useState('');
  const [copiedName, setCopiedName] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    loadAccount();
  }, [address]);

  const loadAccount = async () => {
    if (!address) {
      navigate('/settings');
      return;
    }

    try {
      const keyringService = getService<IKeyringService>(SERVICE_TOKENS.KEYRING);
      const loadedAccount = await keyringService.getAccount(address);

      if (!loadedAccount) {
        setError('Account not found');
        return;
      }

      setAccount(loadedAccount);
      setNewName(loadedAccount.name);
    } catch (err) {
      console.error('Failed to load account:', err);
      setError('Failed to load account');
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async () => {
    if (!newName.trim() || !address) return;

    try {
      setLoading(true);
      setError('');

      const keyringService = getService<IKeyringService>(SERVICE_TOKENS.KEYRING);
      await keyringService.updateAccountName(address, newName.trim());

      // Update local state
      setAccount({ ...account, name: newName.trim() });

      // Show success feedback
      setCopiedName(false);
      alert('Account name updated successfully');
    } catch (err) {
      console.error('Failed to rename account:', err);
      setError(err instanceof Error ? err.message : 'Failed to rename account');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!address) return;

    try {
      setLoading(true);
      setError('');

      const keyringService = getService<IKeyringService>(SERVICE_TOKENS.KEYRING);
      await keyringService.removeAccount(address);

      // If this was the active account, switch to another one
      if (address.toLowerCase() === currentAddress?.toLowerCase()) {
        const accounts = await keyringService.getAccounts();
        if (accounts.length > 0) {
          switchAccount(accounts[0].address);
        }
      }

      navigate('/settings');
    } catch (err) {
      console.error('Failed to delete account:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete account');
      setShowDeleteConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPrivateKey = async () => {
    if (!address) return;

    try {
      setLoading(true);
      setError('');

      const keyringService = getService<IKeyringService>(SERVICE_TOKENS.KEYRING);
      const key = await keyringService.getPrivateKey(address);

      setPrivateKey(key);
      setShowPrivateKey(true);
    } catch (err) {
      console.error('Failed to export private key:', err);
      setError(err instanceof Error ? err.message : 'Failed to export private key');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPrivateKey = async () => {
    await navigator.clipboard.writeText(`0x${privateKey}`);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopiedName(true);
      setTimeout(() => setCopiedName(false), 2000);
    }
  };

  if (loading && !account) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-primary-600 mb-2"></div>
            <p className="text-gray-600">Loading account...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error && !account) {
    return (
      <Layout>
        <div className="max-w-md mx-auto mt-8">
          <Card className="border-red-200 bg-red-50">
            <CardContent>
              <p className="text-red-800">{error}</p>
              <Button
                onClick={() => navigate('/settings')}
                className="mt-4"
                variant="outline"
              >
                Back to Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const isImported = account?.index === -1;
  const isActive = address?.toLowerCase() === currentAddress?.toLowerCase();

  return (
    <Layout>
      <div className="max-w-md mx-auto mt-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/settings')}
            className="text-gray-600 hover:text-gray-900 mb-2 flex items-center text-sm"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Settings
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Manage Account</h1>
          <p className="text-sm text-gray-600 mt-1">
            {account?.name}
          </p>
        </div>

        {/* Account Details */}
        <Card className="mb-4">
          <CardHeader>
            <h3 className="text-lg font-semibold">Account Details</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Address</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 p-2 bg-gray-50 rounded border border-gray-200 text-sm font-mono break-all">
                  {address}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyAddress}
                >
                  {copiedName ? '✓' : 'Copy'}
                </Button>
              </div>
            </div>

            <div>
              <Label>Type</Label>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-1 rounded text-sm ${
                  isImported
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {isImported ? 'Imported Account' : 'Derived Account'}
                </span>
                {isActive && (
                  <span className="px-2 py-1 bg-primary-100 text-primary-700 text-sm rounded">
                    Active
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rename Account */}
        <Card className="mb-4">
          <CardHeader>
            <h3 className="text-lg font-semibold">Rename Account</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <Label htmlFor="newName">Account Name</Label>
                <Input
                  id="newName"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full"
                />
              </div>
              <Button
                onClick={handleRename}
                disabled={!newName.trim() || newName === account?.name || loading}
                className="w-full"
              >
                Update Name
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Export Private Key (Imported Accounts Only) */}
        {isImported && (
          <Card className="mb-4 border-yellow-200 bg-yellow-50">
            <CardHeader>
              <h3 className="text-lg font-semibold text-yellow-900">Export Private Key</h3>
            </CardHeader>
            <CardContent>
              {!showPrivateKey ? (
                <>
                  <p className="text-sm text-yellow-800 mb-3">
                    <strong>Warning:</strong> Never share your private key with anyone. Anyone with your
                    private key can access your account.
                  </p>
                  <Button
                    onClick={handleExportPrivateKey}
                    variant="outline"
                    className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                    disabled={loading}
                  >
                    Reveal Private Key
                  </Button>
                </>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label className="text-yellow-900">Private Key</Label>
                    <div className="mt-1 p-3 bg-white rounded border border-yellow-300">
                      <code className="text-sm font-mono break-all">
                        0x{privateKey}
                      </code>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCopyPrivateKey}
                      variant="outline"
                      className="flex-1"
                    >
                      {copiedKey ? '✓ Copied!' : 'Copy'}
                    </Button>
                    <Button
                      onClick={() => {
                        setShowPrivateKey(false);
                        setPrivateKey('');
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Hide
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Delete Account (Imported Accounts Only) */}
        {isImported && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <h3 className="text-lg font-semibold text-red-900">Delete Account</h3>
            </CardHeader>
            <CardContent>
              {!showDeleteConfirm ? (
                <>
                  <p className="text-sm text-red-800 mb-3">
                    This will permanently remove this imported account from your wallet.
                    Make sure you have backed up the private key if you want to import it again later.
                  </p>
                  <Button
                    onClick={() => setShowDeleteConfirm(true)}
                    variant="outline"
                    className="w-full border-red-300 text-red-700 hover:bg-red-100"
                  >
                    Delete Account
                  </Button>
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-red-900 font-semibold">
                    Are you sure you want to delete this account? This action cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowDeleteConfirm(false)}
                      variant="outline"
                      className="flex-1"
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleDelete}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                      disabled={loading}
                    >
                      {loading ? 'Deleting...' : 'Confirm Delete'}
                    </Button>
                  </div>
                </div>
              )}
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </CardContent>
          </Card>
        )}

        {!isImported && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent>
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> Derived accounts cannot be deleted as they are generated
                from your seed phrase. They will always be recoverable.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
