/**
 * Import Wallet Page
 *
 * Import existing wallet using recovery phrase
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent } from '@sudobility/components';
import { Layout } from '../../components';
import { useWalletStore } from '../../store/walletStore';
import { getService, SERVICE_TOKENS } from '@/shared/di';
import type { IWalletService } from '@/shared/di';

export function ImportWallet() {
  const navigate = useNavigate();
  const { setTempSeedPhrase, setOnboardingStep } = useWalletStore();
  const [seedPhrase, setSeedPhrase] = useState('');
  const [error, setError] = useState('');

  const handleContinue = () => {
    try {
      // Validate seed phrase
      const walletService = getService<IWalletService>(SERVICE_TOKENS.WALLET);
      const isValid = walletService.validateMnemonic(seedPhrase.trim());

      if (!isValid) {
        setError('Invalid recovery phrase. Please check and try again.');
        return;
      }

      setTempSeedPhrase(seedPhrase.trim());
      setOnboardingStep('password');
      navigate('/onboarding/password');
    } catch (err) {
      setError('Failed to validate recovery phrase');
    }
  };

  const wordCount = seedPhrase.trim().split(/\s+/).filter(Boolean).length;

  return (
    <Layout
      title="Import Wallet"
      subtitle="Enter your 12 or 24 word recovery phrase"
      showBack
      onBack={() => navigate('/onboarding/welcome')}
    >
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent>
            <textarea
              value={seedPhrase}
              onChange={(e) => {
                setSeedPhrase(e.target.value);
                setError('');
              }}
              placeholder="Enter your recovery phrase..."
              className="w-full h-48 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm resize-none"
            />

            {error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-gray-600">
                Words: {wordCount} / 12 or 24
              </span>
              {wordCount > 0 && wordCount !== 12 && wordCount !== 24 && (
                <span className="text-yellow-600">
                  ⚠️ Must be 12 or 24 words
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="mt-6">
          <Button
            className="w-full"
            onClick={handleContinue}
            disabled={wordCount !== 12 && wordCount !== 24}
          >
            Continue
          </Button>
        </div>

        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardContent className="py-3">
            <div className="flex items-start">
              <span className="text-xl mr-2">💡</span>
              <div>
                <p className="text-sm text-gray-700">
                  <strong>Tip:</strong> Separate each word with a space. Words should be lowercase.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
