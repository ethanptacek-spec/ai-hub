'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { AssetCard } from '@/components/AssetCard';

export default function Dashboard() {
  const router = useRouter();
  const { assets, projects } = useStore();
  const [quickPrompt, setQuickPrompt] = useState('');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    useStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  const stats = hydrated
    ? {
        total: assets.length,
        videos: assets.filter((a) => a.type === 'video').length,
        images: assets.filter((a) => a.type === 'image').length,
        completed: assets.filter((a) => a.status === 'complete').length,
      }
    : { total: 0, videos: 0, images: 0, completed: 0 };

  const recentAssets = hydrated ? assets.slice(0, 6) : [];

  const handleQuickGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickPrompt.trim()) {
      router.push(`/generate?prompt=${encodeURIComponent(quickPrompt.trim())}`);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome to AI Hub
        </h1>
        <p className="text-gray-400">
          Your unified AI creative studio. Generate images and videos with Kling and Google AI.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Assets', value: stats.total, icon: '🎨', color: 'from-purple-600 to-indigo-600' },
          { label: 'Videos', value: stats.videos, icon: '🎬', color: 'from-blue-600 to-cyan-600' },
          { label: 'Images', value: stats.images, icon: '🖼️', color: 'from-pink-600 to-rose-600' },
          { label: 'Completed', value: stats.completed, icon: '✅', color: 'from-green-600 to-emerald-600' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center gap-4"
          >
            <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center text-xl`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Quick Generate */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Quick Generate
            </h2>
            <form onSubmit={handleQuickGenerate} className="flex gap-3">
              <input
                type="text"
                value={quickPrompt}
                onChange={(e) => setQuickPrompt(e.target.value)}
                placeholder="Describe what you want to create..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
              />
              <button
                type="submit"
                disabled={!quickPrompt.trim()}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-colors"
              >
                Generate
              </button>
            </form>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                'A cyberpunk city at night with neon lights',
                'Abstract fluid art in purple and gold',
                'Majestic dragon flying over mountains',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setQuickPrompt(suggestion)}
                  className="text-xs text-gray-500 hover:text-purple-400 bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-purple-600/50 rounded-full px-3 py-1 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Recent Assets */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Recent Assets</h2>
              <Link
                href="/history"
                className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                View all →
              </Link>
            </div>
            {recentAssets.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm mb-4">No assets yet.</p>
                <Link
                  href="/generate"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Start Generating
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentAssets.map((asset) => (
                  <AssetCard key={asset.id} asset={asset} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link
                href="/generate"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-purple-600/10 hover:bg-purple-600/20 border border-purple-600/20 text-purple-400 text-sm transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate with Kling
              </Link>
              <Link
                href="/generate?provider=google"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 border border-blue-600/20 text-blue-400 text-sm transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Generate with Imagen
              </Link>
              <Link
                href="/compare"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-sm transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
                </svg>
                Compare Providers
              </Link>
            </div>
          </div>

          {/* Projects */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Projects</h3>
            {!hydrated || projects.length === 0 ? (
              <p className="text-xs text-gray-500">No projects yet. Assets are stored in your history.</p>
            ) : (
              <div className="space-y-2">
                {projects.slice(0, 5).map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-750 cursor-pointer"
                  >
                    <div>
                      <p className="text-sm text-white">{project.name}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* API Status */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">API Status</h3>
            <div className="space-y-3">
              {[
                { name: 'Kling API', status: true, color: 'bg-purple-500' },
                { name: 'Google Imagen', status: true, color: 'bg-blue-500' },
                { name: 'Gemini Flash', status: true, color: 'bg-cyan-500' },
              ].map((api) => (
                <div key={api.name} className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">{api.name}</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${api.status ? api.color : 'bg-red-500'} ${api.status ? 'animate-pulse' : ''}`} />
                    <span className="text-xs text-gray-500">{api.status ? 'Active' : 'Error'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
