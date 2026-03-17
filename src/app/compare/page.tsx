'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Asset } from '@/types';

type ProviderOption = 'kling' | 'google';

interface CompareResult {
  provider: ProviderOption;
  asset: Asset | null;
  status: 'idle' | 'loading' | 'complete' | 'failed';
  error?: string;
  generationTime?: number;
  taskId?: string;
}

const providerConfig = {
  kling: {
    label: 'Kling Video',
    badge: 'bg-purple-900 text-purple-300 border border-purple-700',
    description: 'Text-to-video generation',
  },
  google: {
    label: 'Google Imagen',
    badge: 'bg-blue-900 text-blue-300 border border-blue-700',
    description: 'AI image generation',
  },
};

export default function ComparePage() {
  const { addAsset, updateAsset } = useStore();
  const [prompt, setPrompt] = useState('');
  const [selectedProviders, setSelectedProviders] = useState<ProviderOption[]>(['kling', 'google']);
  const [results, setResults] = useState<CompareResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const toggleProvider = (provider: ProviderOption) => {
    setSelectedProviders((prev) =>
      prev.includes(provider) ? prev.filter((p) => p !== provider) : [...prev, provider]
    );
  };

  const pollKlingStatus = async (
    taskId: string,
    assetId: string,
    resultIndex: number,
    startTime: number
  ) => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/kling/status/${taskId}?type=text2video`);
        const data = await res.json();

        if (data.task_status === 'succeed' && data.task_result?.videos?.[0]) {
          const videoUrl = data.task_result.videos[0].url;
          const genTime = Math.floor((Date.now() - startTime) / 1000);
          updateAsset(assetId, { status: 'complete', url: videoUrl });
          setResults((prev) =>
            prev.map((r, i) =>
              i === resultIndex
                ? {
                    ...r,
                    status: 'complete',
                    asset: r.asset ? { ...r.asset, status: 'complete', url: videoUrl } : null,
                    generationTime: genTime,
                  }
                : r
            )
          );
        } else if (data.task_status === 'failed') {
          updateAsset(assetId, { status: 'failed' });
          setResults((prev) =>
            prev.map((r, i) =>
              i === resultIndex
                ? { ...r, status: 'failed', error: 'Video generation failed' }
                : r
            )
          );
        } else {
          setTimeout(poll, 3000);
        }
      } catch {
        setTimeout(poll, 3000);
      }
    };
    setTimeout(poll, 3000);
  };

  const handleGenerateAll = async () => {
    if (!prompt.trim() || selectedProviders.length === 0) return;
    setIsRunning(true);

    const initialResults: CompareResult[] = selectedProviders.map((p) => ({
      provider: p,
      asset: null,
      status: 'loading',
    }));
    setResults(initialResults);

    await Promise.all(
      selectedProviders.map(async (provider, index) => {
        const assetId = `compare-${provider}-${Date.now()}`;
        const startTime = Date.now();

        try {
          if (provider === 'kling') {
            const pendingAsset: Asset = {
              id: assetId,
              type: 'video',
              provider: 'kling',
              prompt,
              url: '',
              status: 'processing',
              createdAt: new Date().toISOString(),
            };
            addAsset(pendingAsset);
            setResults((prev) =>
              prev.map((r, i) => (i === index ? { ...r, asset: pendingAsset } : r))
            );

            const res = await fetch('/api/kling/text-to-video', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt, mode: 'std', duration: '5', aspect_ratio: '16:9' }),
            });

            if (!res.ok) throw new Error('Kling request failed');
            const { task_id } = await res.json();
            setResults((prev) =>
              prev.map((r, i) => (i === index ? { ...r, taskId: task_id } : r))
            );
            pollKlingStatus(task_id, assetId, index, startTime);
          } else if (provider === 'google') {
            const res = await fetch('/api/google/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt, aspectRatio: '1:1' }),
            });

            if (!res.ok) throw new Error('Google request failed');
            const { imageDataUrl } = await res.json();
            const genTime = Math.floor((Date.now() - startTime) / 1000);

            const completedAsset: Asset = {
              id: assetId,
              type: 'image',
              provider: 'google',
              prompt,
              url: imageDataUrl,
              status: 'complete',
              createdAt: new Date().toISOString(),
            };
            addAsset(completedAsset);
            setResults((prev) =>
              prev.map((r, i) =>
                i === index
                  ? { ...r, status: 'complete', asset: completedAsset, generationTime: genTime }
                  : r
              )
            );
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Generation failed';
          setResults((prev) =>
            prev.map((r, i) => (i === index ? { ...r, status: 'failed', error: errMsg } : r))
          );
        }
      })
    );

    setIsRunning(false);
  };

  const allComplete = results.length > 0 && results.every((r) => r.status === 'complete' || r.status === 'failed');

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Compare</h1>
        <p className="text-gray-400">Generate the same prompt across multiple providers side-by-side</p>
      </div>

      {/* Config */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <div className="mb-4">
          <label className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3 block">
            Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter a prompt to generate across all providers..."
            rows={3}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none text-sm"
          />
        </div>

        <div className="mb-6">
          <label className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3 block">
            Providers
          </label>
          <div className="flex gap-3">
            {(Object.keys(providerConfig) as ProviderOption[]).map((provider) => (
              <button
                key={provider}
                onClick={() => toggleProvider(provider)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                  selectedProviders.includes(provider)
                    ? provider === 'kling'
                      ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                      : 'bg-blue-600/20 border-blue-500 text-blue-300'
                    : 'bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-600'
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-full ${
                    selectedProviders.includes(provider)
                      ? provider === 'kling'
                        ? 'bg-purple-400'
                        : 'bg-blue-400'
                      : 'bg-gray-600'
                  }`}
                />
                {providerConfig[provider].label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleGenerateAll}
          disabled={!prompt.trim() || selectedProviders.length === 0 || isRunning}
          className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {isRunning ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating across {selectedProviders.length} providers...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate All
            </>
          )}
        </button>
      </div>

      {/* Results Grid */}
      {results.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Results</h2>
            {allComplete && (
              <span className="text-sm text-green-400 flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                All complete
              </span>
            )}
          </div>
          <div className={`grid gap-6 ${results.length === 1 ? 'grid-cols-1 max-w-xl' : results.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {results.map((result, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                  <div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${providerConfig[result.provider].badge}`}>
                      {providerConfig[result.provider].label}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">{providerConfig[result.provider].description}</p>
                  </div>
                  {result.generationTime && (
                    <span className="text-xs text-gray-500">{result.generationTime}s</span>
                  )}
                </div>

                {/* Content */}
                <div className="aspect-video bg-gray-800 relative">
                  {result.status === 'loading' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-gray-400">Generating...</p>
                    </div>
                  )}

                  {result.status === 'complete' && result.asset?.type === 'image' && result.asset.url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={result.asset.url}
                      alt={prompt}
                      className="w-full h-full object-cover"
                    />
                  )}

                  {result.status === 'complete' && result.asset?.type === 'video' && result.asset.url && (
                    <video
                      src={result.asset.url}
                      controls
                      className="w-full h-full object-cover"
                    />
                  )}

                  {result.status === 'failed' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <svg className="w-8 h-8 text-red-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm text-red-400">{result.error || 'Failed'}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-3">
                  <p className="text-xs text-gray-500 truncate">{prompt}</p>
                  {result.status === 'complete' && result.asset?.url && (
                    <a
                      href={result.asset.url}
                      download
                      className="mt-2 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
