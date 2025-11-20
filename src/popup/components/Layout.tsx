/**
 * Layout Component
 *
 * Provides consistent layout for all pages with:
 * - Fixed top bar (navigation)
 * - Scrollable content area
 * - Fixed action buttons at bottom
 */

import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  actions?: React.ReactNode; // Action buttons for bottom
  topBarRight?: React.ReactNode; // Additional content in top bar (e.g., settings icon)
}

export function Layout({
  children,
  title,
  subtitle,
  showBack,
  onBack,
  actions,
  topBarRight
}: LayoutProps) {
  return (
    <div className="w-[400px] h-[600px] flex flex-col bg-gray-50">
      {/* Fixed Top Bar */}
      {(title || showBack || topBarRight) && (
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left side: Back button or title */}
            <div className="flex-1 min-w-0">
              {showBack && (
                <button
                  onClick={onBack}
                  className="text-gray-600 hover:text-gray-900 flex items-center text-sm mb-1"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
              )}
              {title && (
                <h1 className="text-lg font-bold text-gray-900 truncate">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-xs text-gray-600 mt-0.5 truncate">
                  {subtitle}
                </p>
              )}
            </div>

            {/* Right side: Additional actions */}
            {topBarRight && (
              <div className="ml-3 flex-shrink-0">
                {topBarRight}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4">
          {children}
        </div>
      </div>

      {/* Fixed Action Buttons */}
      {actions && (
        <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-3">
          {actions}
        </div>
      )}
    </div>
  );
}
