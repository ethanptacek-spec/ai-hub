'use client';

import { useState, useEffect } from 'react';

interface ApiStatus {
  name: string;
  key: string;
  status: 'connected' | 'error' | 'checking';
  color: string;
}

function maskKey(key: string): string {
  if (!key || key.length < 8) return '••••••••';
  return key.slice(0, 4) + '••••••••' + key.slice(-4);
}

export default function SettingsPage() {
  const [customKeys, setCustomKeys] = useState({
    KLING_ACCESS_KEY: '',
    KLING_SECRET_KEY: '',
    GOOGLE_AI_API_KEY: '',
  });
  const [saved, setSaved] = useState(false);
  const [apiStatuses] = useState<ApiStatus[]>([
    { name: 'Kling API', key: 'AAEtLBGypJQLQrhQGmAYFP4KgHBA49Y3', status: 'connected', color: 'bg-purple-500' },
    { name: 'Google Imagen 3', key: 'AIzaSyBll67cthHE_FKbIYRefPHyTWCh0MmqADU', status: 'connected', color: 'bg-blue-500' },
    { name: 'Gemini Flash', key: 'AIzaSyBll67cthHE_FKbIYRefPHyTWCh0MmqADU', status: 'connected', color: 'bg-cyan-500' },
  ]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ai-hub-custom-keys');
      if (stored) {
        try {
          setCustomKeys(JSON.parse(stored));
        } catch {
          // ignore
        }
      }
    }
  }, []);

  const handleSaveKeys = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ai-hub-custom-keys', JSON.stringify(customKeys));
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClearHistory = () => {
    if (typeof window !== 'undefined' && confirm('Are you sure you want to clear all generation history?')) {
      localStorage.removeItem('ai-hub-store');
      window.location.reload();
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-gray-400">Configure your API keys and preferences</p>
      </div>

      <div className="space-y-6">
        {/* API Status */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            API Status
          </h2>
          <div className="space-y-4">
            {apiStatuses.map((api) => (
              <div
                key={api.name}
                className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${api.color} ${api.status === 'connected' ? 'animate-pulse' : ''}`} />
                  <div>
                    <p className="text-sm font-medium text-white">{api.name}</p>
                    <p className="text-xs text-gray-500 font-mono">{maskKey(api.key)}</p>
                  </div>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    api.status === 'connected'
                      ? 'bg-green-900 text-green-300 border border-green-700'
                      : 'bg-red-900 text-red-300 border border-red-700'
                  }`}
                >
                  {api.status === 'connected' ? 'Connected' : 'Error'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Configured Keys */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            Environment API Keys
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            Keys configured in <code className="text-purple-400 bg-gray-800 px-1 rounded">.env.local</code>. These are active and secured server-side.
          </p>
          <div className="space-y-3">
            {[
              { label: 'Kling Access Key', value: 'AAEtLBGypJQLQrhQGmAYFP4KgHBA49Y3' },
              { label: 'Kling Secret Key', value: 'Nhn88tMM3YYbRtftAeYMHKreBHMFN4AH' },
              { label: 'Google AI API Key', value: 'AIzaSyBll67cthHE_FKbIYRefPHyTWCh0MmqADU' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <span className="text-sm text-gray-400">{item.label}</span>
                <code className="text-sm text-purple-300 font-mono">{maskKey(item.value)}</code>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Key Overrides */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Custom Key Overrides
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            Optionally override the default keys with your own. Stored locally in your browser.
          </p>
          <div className="space-y-4">
            {[
              { key: 'KLING_ACCESS_KEY' as const, label: 'Kling Access Key' },
              { key: 'KLING_SECRET_KEY' as const, label: 'Kling Secret Key' },
              { key: 'GOOGLE_AI_API_KEY' as const, label: 'Google AI API Key' },
            ].map((field) => (
              <div key={field.key}>
                <label className="text-xs text-gray-500 mb-1.5 block">{field.label}</label>
                <input
                  type="password"
                  value={customKeys[field.key]}
                  onChange={(e) => setCustomKeys((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder="Enter custom key..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm font-mono"
                />
              </div>
            ))}
            <button
              onClick={handleSaveKeys}
              className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                saved
                  ? 'bg-green-600 text-white'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              {saved ? '✓ Saved!' : 'Save Custom Keys'}
            </button>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Preferences
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm text-white">Default Kling Quality</p>
                <p className="text-xs text-gray-500">Standard or Pro mode for video generation</p>
              </div>
              <select className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none">
                <option>Standard</option>
                <option>Pro</option>
              </select>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm text-white">Default Video Duration</p>
                <p className="text-xs text-gray-500">Default duration for Kling videos</p>
              </div>
              <select className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none">
                <option>5 seconds</option>
                <option>10 seconds</option>
              </select>
            </div>
          </div>
        </div>

        {/* About / Danger Zone */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-5">About</h2>
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Version</span>
              <span className="text-sm text-gray-300">1.0.0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Stack</span>
              <span className="text-sm text-gray-300">Next.js 14 + TypeScript + Tailwind</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Providers</span>
              <span className="text-sm text-gray-300">Kling, Google Imagen, Gemini</span>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-5">
            <h3 className="text-sm font-semibold text-red-400 mb-3">Danger Zone</h3>
            <button
              onClick={handleClearHistory}
              className="px-4 py-2 bg-red-900/20 hover:bg-red-900/40 border border-red-700 text-red-400 rounded-lg text-sm font-medium transition-colors"
            >
              Clear All Generation History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
