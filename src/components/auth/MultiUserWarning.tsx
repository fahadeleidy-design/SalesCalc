/**
 * Multi-User Warning Modal
 * Warns users about browser session sharing and provides guidance
 */

import React from 'react';
import { AlertTriangle, X, Chrome, Users, Lock } from 'lucide-react';
import { Button } from '../ui/Button';

interface MultiUserWarningProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: string;
  newUser?: string;
}

export function MultiUserWarning({
  isOpen,
  onClose,
  currentUser,
  newUser
}: MultiUserWarningProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-600 p-6 rounded-t-2xl">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Multiple User Session Warning
                </h2>
                <p className="text-sm text-white/90 mt-1">
                  Important information about browser sessions
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Current Situation */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <h3 className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Session Conflict Detected
            </h3>
            <p className="text-sm text-orange-700">
              You are currently signed in as <strong>{currentUser}</strong>.
              {newUser && ` Attempting to sign in as ${newUser} will sign out all other tabs.`}
            </p>
          </div>

          {/* Why This Happens */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">
              Why does this happen?
            </h3>
            <p className="text-gray-700 text-sm leading-relaxed">
              All browser tabs share the same authentication session. When you sign out from one tab,
              the system automatically signs out all tabs to maintain security and data consistency.
              This prevents data leakage between different user accounts.
            </p>
          </div>

          {/* Solutions */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">
              Solutions for testing multiple users:
            </h3>
            <div className="space-y-3">
              {/* Solution 1 */}
              <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Chrome className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">
                      1. Use Incognito/Private Windows
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Open an incognito or private browsing window for each additional user.
                    </p>
                    <div className="bg-gray-50 rounded p-2 text-xs font-mono text-gray-700">
                      Chrome: Ctrl+Shift+N (Windows) or Cmd+Shift+N (Mac)
                      <br />
                      Firefox: Ctrl+Shift+P (Windows) or Cmd+Shift+P (Mac)
                    </div>
                  </div>
                </div>
              </div>

              {/* Solution 2 */}
              <div className="border border-gray-200 rounded-lg p-4 hover:border-green-300 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Users className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">
                      2. Use Different Browser Profiles
                    </h4>
                    <p className="text-sm text-gray-600">
                      Create separate Chrome/Edge profiles for different users. Each profile maintains
                      its own session independently.
                    </p>
                  </div>
                </div>
              </div>

              {/* Solution 3 */}
              <div className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Chrome className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">
                      3. Use Different Browsers
                    </h4>
                    <p className="text-sm text-gray-600">
                      Use Chrome for one user, Firefox for another, Edge for a third, etc.
                      Each browser maintains separate sessions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Security Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">Security Note</h4>
                <p className="text-sm text-blue-700">
                  This behavior is intentional and protects your data. It ensures that sensitive
                  information from one user account cannot be accessed by another user on the same browser.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-2xl">
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              I Understand
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MultiUserWarning;
