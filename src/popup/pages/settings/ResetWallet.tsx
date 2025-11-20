/**
 * Reset Wallet Page
 *
 * Allow users to completely reset their wallet and remove all data
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, Input, Label } from '@sudobility/components';
import { Layout } from '../../components';
import { useWalletStore } from '../../store/walletStore';
import { getService, SERVICE_TOKENS } from '@/shared/di';
import type { IVaultService, IStorageService } from '@/shared/di';

export function ResetWallet() {
  const navigate = useNavigate();
  const { reset } = useWalletStore();
  const [step, setStep] = useState<'warning' | 'password' | 'confirm'>('warning');
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePasswordVerification = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      setError('Please enter your password');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Verify password
      const vaultService = getService<IVaultService>(SERVICE_TOKENS.VAULT);
      await vaultService.unlock(password);

      // Password is correct, move to confirmation step
      setStep('confirm');
      setPassword('');
    } catch (err) {
      console.error('Failed to verify password:', err);
      setError('Incorrect password');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (confirmText !== 'RESET') {
      setError('Please type RESET to confirm');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Clear all storage
      const storageService = getService<IStorageService>(SERVICE_TOKENS.STORAGE);
      await storageService.clear();

      // Reset wallet store
      reset();

      // Navigate to welcome page
      navigate('/onboarding/welcome', { replace: true });
    } catch (err) {
      console.error('Failed to reset wallet:', err);
      setError(err instanceof Error ? err.message : 'Failed to reset wallet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto mt-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/settings')}
            className="text-gray-600 hover:text-gray-900 mb-2 flex items-center text-sm"
            disabled={loading}
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Settings
          </button>
          <h1 className="text-2xl font-bold text-red-900">Reset Wallet</h1>
          <p className="text-sm text-red-700 mt-1">
            Permanently delete all wallet data
          </p>
        </div>

        {/* Warning Step */}
        {step === 'warning' && (
          <>
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <span className="text-3xl mr-3">⚠️</span>
                <div>
                  <h3 className="text-lg font-bold text-red-900 mb-2">Critical Warning</h3>
                  <ul className="text-sm text-red-800 space-y-2 list-disc ml-4">
                    <li className="font-semibold">This action CANNOT be undone</li>
                    <li>All your accounts will be permanently deleted</li>
                    <li>All wallet settings will be erased</li>
                    <li>You will need your seed phrase to recover your accounts</li>
                    <li>Imported accounts can only be recovered with their private keys</li>
                  </ul>
                </div>
              </div>
            </div>

            <Card className="border-red-200">
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                    <h4 className="font-semibold text-yellow-900 mb-2">Before you proceed:</h4>
                    <ul className="text-sm text-yellow-800 space-y-1 list-decimal ml-4">
                      <li>Make sure you have backed up your seed phrase</li>
                      <li>Export private keys for any imported accounts</li>
                      <li>Write down any important account addresses</li>
                      <li>Save any custom network settings you need</li>
                    </ul>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => navigate('/settings')}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => setStep('password')}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    >
                      I Understand, Continue
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Password Verification Step */}
        {step === 'password' && (
          <Card className="border-red-200">
            <CardContent>
              <form onSubmit={handlePasswordVerification} className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Verify Your Identity</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Enter your wallet password to continue
                  </p>

                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    placeholder="Enter your wallet password"
                    className="w-full"
                    autoFocus
                    disabled={loading}
                  />
                  {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setStep('warning');
                      setPassword('');
                      setError('');
                    }}
                    className="flex-1"
                    disabled={loading}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    disabled={!password || loading}
                  >
                    {loading ? 'Verifying...' : 'Continue'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Final Confirmation Step */}
        {step === 'confirm' && (
          <>
            <div className="bg-red-100 border-2 border-red-400 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-bold text-red-900 mb-2 text-center">
                Final Confirmation
              </h3>
              <p className="text-sm text-red-800 text-center">
                This is your last chance to back out. Once you reset, there is no way to recover
                your wallet without your seed phrase and private keys.
              </p>
            </div>

            <Card className="border-red-200">
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="confirmText" className="text-gray-900 font-semibold">
                      Type <span className="font-mono bg-red-100 px-2 py-1 rounded">RESET</span> to confirm
                    </Label>
                    <Input
                      id="confirmText"
                      type="text"
                      value={confirmText}
                      onChange={(e) => {
                        setConfirmText(e.target.value);
                        setError('');
                      }}
                      placeholder="Type RESET in all caps"
                      className="w-full mt-2"
                      autoFocus
                      disabled={loading}
                    />
                    {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
                  </div>

                  <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                    <p className="text-sm text-gray-700">
                      <strong>What will happen:</strong>
                    </p>
                    <ul className="text-sm text-gray-600 mt-2 space-y-1 list-disc ml-4">
                      <li>All accounts will be deleted</li>
                      <li>Your encrypted vault will be removed</li>
                      <li>All settings will be reset to defaults</li>
                      <li>You will be redirected to the welcome screen</li>
                    </ul>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setStep('warning');
                        setConfirmText('');
                        setError('');
                      }}
                      className="flex-1"
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleReset}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold"
                      disabled={confirmText !== 'RESET' || loading}
                    >
                      {loading ? 'Resetting...' : 'Reset Wallet Now'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}
