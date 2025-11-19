/**
 * Layout Component
 *
 * Provides consistent layout for all pages
 */

import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
}

export function Layout({ children, title, subtitle, showBack, onBack }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      {(title || showBack) && (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          {showBack && (
            <button
              onClick={onBack}
              className="text-gray-600 hover:text-gray-900 mb-2 flex items-center text-sm"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          )}
          {title && <h1 className="text-2xl font-bold text-gray-900">{title}</h1>}
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 px-6 py-6">
        {children}
      </div>
    </div>
  );
}
