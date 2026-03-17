'use client';

import { useEffect, useState, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { Asset, Provider, AssetType } from '@/types';
import { AssetGallery } from '@/components/AssetGallery';

export default function HistoryPage() {
  const { assets } = useStore();
  const [hydrated, setHydrated] = useState(false);
  const [providerFilter, setProviderFilter] = useState<Provider | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<AssetType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  useEffect(() => {
    useStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  const filteredAssets = useMemo(() => {
    if (!hydrated) return [];

    let filtered: Asset[] = [...assets];

    if (providerFilter !== 'all') {
      filtered = filtered.filter((a) => a.provider === providerFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter((a) => a.type === typeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((a) => a.prompt.toLowerCase().includes(q));
    }

    filtered.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });

    return filtered;
  }, [assets, hydrated, providerFilter, typeFilter, searchQuery, sortOrder]);

  const stats = useMemo(() => {
    if (!hydrated) return { total: 0, kling: 0, google: 0 };
    return {
      total: assets.length,
      kling: assets.filter((a) => a.provider === 'kling').length,
      google: assets.filter((a) => a.provider === 'google').length,
    };
  }, [assets, hydrated]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">History</h1>
        <p className="text-gray-400">All your generated assets across every session</p>
      </div>

      {/* Stats Bar */}
      <div className="flex gap-4 mb-6 flex-wrap">
        {[
          { label: 'Total', value: stats.total, color: 'text-white' },
          { label: 'Kling', value: stats.kling, color: 'text-purple-400' },
          { label: 'Google', value: stats.google, color: 'text-blue-400' },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 flex items-center gap-2"
          >
            <span className={`font-bold text-lg ${s.color}`}>{s.value}</span>
            <span className="text-sm text-gray-500">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-center">
        {/* Search */}
        <div className="flex-1 min-w-48">
          <div className="relative">
            <svg className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by prompt..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
            />
          </div>
        </div>

        {/* Provider Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Provider:</span>
          {(['all', 'kling', 'google'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setProviderFilter(p)}
              className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
                providerFilter === p
                  ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Type:</span>
          {(['all', 'image', 'video'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
                typeFilter === t
                  ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Sort:</span>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-purple-500 text-xs"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="mb-4">
        <p className="text-sm text-gray-500">
          {filteredAssets.length} asset{filteredAssets.length !== 1 ? 's' : ''}
          {searchQuery && ` matching "${searchQuery}"`}
        </p>
      </div>

      {/* Gallery */}
      <AssetGallery
        assets={filteredAssets}
        emptyMessage={
          assets.length === 0
            ? 'No assets yet. Head to Generate to create your first!'
            : 'No assets match your filters.'
        }
      />
    </div>
  );
}
