/**
 * Create Wallet Page
 *
 * Generate a new seed phrase and display it to the user
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent } from '@sudobility/components';
import { Layout } from '../../components';
import { useWalletStore } from '../../store/walletStore';
import { getService, SERVICE_TOKENS } from '@/shared/di';
import type { IWalletService } from '@/shared/di';

export function CreateWallet() {
  const navigate = useNavigate();
  const { setTempSeedPhrase, setOnboardingStep } = useWalletStore();
  const [seedPhrase, setSeedPhrase] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    generateSeedPhrase();
  }, []);

  const generateSeedPhrase = async () => {
    try {
      setLoading(true);
      const walletService = getService<IWalletService>(SERVICE_TOKENS.WALLET);
      const mnemonic = await walletService.generateSeedPhrase();
      setSeedPhrase(mnemonic);
    } catch (error) {
      console.error('Failed to generate seed phrase:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(seedPhrase);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleContinue = () => {
    setTempSeedPhrase(seedPhrase);
    setOnboardingStep('password');
    navigate('/onboarding/password');
  };

  const words = seedPhrase.split(' ');

  return (
    <Layout
      title="Your Recovery Phrase"
      subtitle="Write down these 12 words in order and store them safely"
      showBack
      onBack={() => navigate('/onboarding/welcome')}
    >
      <div className="max-w-2xl mx-auto">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-primary-600"></div>
            <p className="mt-4 text-gray-600">Generating recovery phrase...</p>
          </div>
        ) : (
          <>
            {/* Warning Card */}
            <Card className="mb-6 bg-yellow-50 border-yellow-200">
              <div className="flex items-start">
                <span className="text-2xl mr-3">⚠️</span>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Important!</h3>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Never share your recovery phrase with anyone</li>
                    <li>• Store it in a safe place offline</li>
                    <li>• You'll need it to restore your wallet</li>
                    <li>• Anyone with this phrase can access your wallet</li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Seed Phrase Display */}
            <Card>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {words.map((word, index) => (
                    <div
                      key={index}
                      className="flex items-center bg-gray-50 rounded-lg p-3 border border-gray-200"
                    >
                      <span className="text-xs text-gray-500 mr-2 w-5">{index + 1}.</span>
                      <span className="font-mono text-sm font-medium text-gray-900">{word}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={handleCopy}
                  >
                    {copied ? '✓ Copied!' : 'Copy to Clipboard'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={generateSeedPhrase}
                    className="flex-shrink-0"
                  >
                    🔄 Generate New
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Confirmation Checkbox */}
            <div className="mt-6">
              <label className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 mr-3 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  id="saved-checkbox"
                />
                <span className="text-sm text-gray-700">
                  I have written down my recovery phrase and stored it in a safe place
                </span>
              </label>
            </div>

            {/* Continue Button */}
            <div className="mt-6">
              <Button
                className="w-full"
                onClick={handleContinue}
                disabled={!(document.getElementById('saved-checkbox') as HTMLInputElement)?.checked}
              >
                Continue
              </Button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
