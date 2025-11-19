/**
 * Complete Page
 *
 * Onboarding success screen
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Layout } from '../../components';
import { useWalletStore } from '../../store/walletStore';

export function Complete() {
  const navigate = useNavigate();
  const { currentAddress, setOnboardingStep } = useWalletStore();

  useEffect(() => {
    setOnboardingStep('complete');
  }, []);

  const handleContinue = () => {
    navigate('/home');
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto mt-12">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <span className="text-4xl">✓</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">You're All Set!</h1>
          <p className="text-gray-600">
            Your wallet has been created successfully
          </p>
        </div>

        {/* Wallet Info */}
        <Card className="mb-6">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Your Wallet Address</p>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className="font-mono text-sm text-gray-900 break-all">
                {currentAddress || 'Loading...'}
              </p>
            </div>
          </div>
        </Card>

        {/* Next Steps */}
        <Card className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">What's Next?</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Your wallet is ready to sign messages and authenticate</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Connect to dApps to start using your wallet</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">⚠️</span>
              <span>Remember: This wallet is for signing only, not for transactions</span>
            </li>
          </ul>
        </Card>

        <Button
          fullWidth
          variant="primary"
          onClick={handleContinue}
        >
          Go to Wallet
        </Button>

        {/* Security Reminder */}
        <Card className="mt-6 bg-yellow-50 border-yellow-200" padding="sm">
          <div className="flex items-start">
            <span className="text-xl mr-2">🔒</span>
            <p className="text-xs text-gray-700">
              <strong>Security Tip:</strong> Never share your recovery phrase or password with anyone.
              Identity Wallet will never ask for this information.
            </p>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
