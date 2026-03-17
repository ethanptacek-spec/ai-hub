'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/store';
import { Asset } from '@/types';
import { AssetCard } from '@/components/AssetCard';

type GenerationMode = 'kling-text2video' | 'kling-image2video' | 'google-imagen' | 'google-gemini';

interface KlingParams {
  mode: 'std' | 'pro';
  duration: '5' | '10';
  aspectRatio: '16:9' | '9:16' | '1:1';
  negativePrompt: string;
}

export default function GeneratePage() {
  const searchParams = useSearchParams();
  const { addAsset, updateAsset } = useStore();

  const [prompt, setPrompt] = useState(searchParams.get('prompt') || '');
  const [mode, setMode] = useState<GenerationMode>(
    searchParams.get('provider') === 'google' ? 'google-imagen' : 'kling-text2video'
  );
  const [klingParams, setKlingParams] = useState<KlingParams>({
    mode: 'std',
    duration: '5',
    aspectRatio: '16:9',
    negativePrompt: '',
  });
  const [imageFile, setImageFile] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAsset, setCurrentAsset] = useState<Asset | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const pollKlingStatus = useCallback(
    (taskId: string, assetId: string, videoType: 'text2video' | 'image2video') => {
      pollingRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/kling/status/${taskId}?type=${videoType}`);
          const data = await res.json();

          if (data.task_status === 'succeed' && data.task_result?.videos?.[0]) {
            stopPolling();
            const videoUrl = data.task_result.videos[0].url;
            updateAsset(assetId, { status: 'complete', url: videoUrl });
            setCurrentAsset((prev) => prev ? { ...prev, status: 'complete', url: videoUrl } : null);
            setIsGenerating(false);
          } else if (data.task_status === 'failed') {
            stopPolling();
            updateAsset(assetId, { status: 'failed' });
            setCurrentAsset((prev) => prev ? { ...prev, status: 'failed' } : null);
            setIsGenerating(false);
            setError('Video generation failed. Please try again.');
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 3000);
    },
    [stopPolling, updateAsset]
  );

  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return;
    setIsEnhancing(true);
    setError(null);

    try {
      const targetProvider = mode.startsWith('kling') ? 'kling' : 'google';
      const res = await fetch('/api/google/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, targetProvider }),
      });

      if (!res.ok) throw new Error('Failed to enhance prompt');
      const data = await res.json();
      setPrompt(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enhance prompt');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (mode === 'kling-image2video' && !imageFile) {
      setError('Please upload an image for image-to-video generation.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setCurrentAsset(null);
    stopPolling();

    const assetId = `asset-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    try {
      if (mode === 'kling-text2video') {
        const pendingAsset: Asset = {
          id: assetId,
          type: 'video',
          provider: 'kling',
          prompt,
          negativePrompt: klingParams.negativePrompt || undefined,
          url: '',
          status: 'processing',
          createdAt: new Date().toISOString(),
          params: {
            mode: klingParams.mode,
            duration: klingParams.duration,
            aspectRatio: klingParams.aspectRatio,
          },
        };
        addAsset(pendingAsset);
        setCurrentAsset(pendingAsset);

        const res = await fetch('/api/kling/text-to-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            negative_prompt: klingParams.negativePrompt || undefined,
            mode: klingParams.mode,
            duration: klingParams.duration,
            aspect_ratio: klingParams.aspectRatio,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to start video generation');
        }

        const { task_id } = await res.json();
        updateAsset(assetId, { jobId: task_id });
        setCurrentAsset((prev) => prev ? { ...prev, jobId: task_id } : null);
        pollKlingStatus(task_id, assetId, 'text2video');
      } else if (mode === 'kling-image2video') {
        const pendingAsset: Asset = {
          id: assetId,
          type: 'video',
          provider: 'kling',
          prompt,
          url: '',
          status: 'processing',
          createdAt: new Date().toISOString(),
          params: { duration: klingParams.duration, mode: klingParams.mode },
        };
        addAsset(pendingAsset);
        setCurrentAsset(pendingAsset);

        const res = await fetch('/api/kling/image-to-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: imageFile,
            prompt,
            duration: klingParams.duration,
            mode: klingParams.mode,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to start video generation');
        }

        const { task_id } = await res.json();
        updateAsset(assetId, { jobId: task_id });
        setCurrentAsset((prev) => prev ? { ...prev, jobId: task_id } : null);
        pollKlingStatus(task_id, assetId, 'image2video');
      } else if (mode === 'google-imagen') {
        const pendingAsset: Asset = {
          id: assetId,
          type: 'image',
          provider: 'google',
          prompt,
          url: '',
          status: 'processing',
          createdAt: new Date().toISOString(),
        };
        addAsset(pendingAsset);
        setCurrentAsset(pendingAsset);

        const res = await fetch('/api/google/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, aspectRatio: '1:1' }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to generate image');
        }

        const { imageDataUrl } = await res.json();
        updateAsset(assetId, { status: 'complete', url: imageDataUrl });
        setCurrentAsset((prev) => prev ? { ...prev, status: 'complete', url: imageDataUrl } : null);
        setIsGenerating(false);
      } else if (mode === 'google-gemini') {
        const res = await fetch('/api/google/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, imageUrl: imageFile || undefined }),
        });

        if (!res.ok) throw new Error('Failed to analyze');
        const data = await res.json();

        const analysisAsset: Asset = {
          id: assetId,
          type: 'image',
          provider: 'google',
          prompt,
          url: '',
          status: 'complete',
          createdAt: new Date().toISOString(),
          params: { geminiResult: data.result },
        };
        addAsset(analysisAsset);
        setCurrentAsset(analysisAsset);
        setIsGenerating(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
      updateAsset(assetId, { status: 'failed' });
      setCurrentAsset((prev) => prev ? { ...prev, status: 'failed' } : null);
      setIsGenerating(false);
      stopPolling();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImageFile(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const modeOptions: Array<{ value: GenerationMode; label: string; description: string; badge: string; badgeStyle: string }> = [
    {
      value: 'kling-text2video',
      label: 'Kling Text→Video',
      description: 'Generate video from text prompt',
      badge: 'Video',
      badgeStyle: 'bg-purple-900 text-purple-300',
    },
    {
      value: 'kling-image2video',
      label: 'Kling Image→Video',
      description: 'Animate a still image',
      badge: 'Video',
      badgeStyle: 'bg-purple-900 text-purple-300',
    },
    {
      value: 'google-imagen',
      label: 'Google Imagen 3',
      description: 'High-quality image generation',
      badge: 'Image',
      badgeStyle: 'bg-blue-900 text-blue-300',
    },
    {
      value: 'google-gemini',
      label: 'Gemini Analysis',
      description: 'Analyze image or answer questions',
      badge: 'AI',
      badgeStyle: 'bg-cyan-900 text-cyan-300',
    },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Generate</h1>
        <p className="text-gray-400">Create images and videos with AI providers</p>
      </div>

      <div className="space-y-6">
        {/* Mode Selector */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">Generation Mode</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {modeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setMode(opt.value)}
                className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                  mode === opt.value
                    ? 'border-purple-500 bg-purple-600/10'
                    : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                }`}
              >
                <span className={`text-xs px-2 py-0.5 rounded-full ${opt.badgeStyle} mb-2 inline-block`}>
                  {opt.badge}
                </span>
                <p className="text-sm font-medium text-white">{opt.label}</p>
                <p className="text-xs text-gray-500 mt-1">{opt.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Prompt */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
              {mode === 'google-gemini' ? 'Question / Instruction' : 'Prompt'}
            </label>
            <button
              onClick={handleEnhancePrompt}
              disabled={!prompt.trim() || isEnhancing}
              className="flex items-center gap-2 px-3 py-1.5 text-xs bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-600/40 text-indigo-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEnhancing ? (
                <div className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              )}
              {isEnhancing ? 'Enhancing...' : 'Enhance with Gemini'}
            </button>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              mode === 'google-gemini'
                ? 'Ask a question or give an instruction...'
                : 'Describe what you want to generate...'
            }
            rows={4}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none text-sm"
          />
          {mode === 'kling-text2video' && (
            <div className="mt-3">
              <label className="text-xs text-gray-500 mb-1 block">Negative Prompt (optional)</label>
              <input
                type="text"
                value={klingParams.negativePrompt}
                onChange={(e) =>
                  setKlingParams((p) => ({ ...p, negativePrompt: e.target.value }))
                }
                placeholder="What to avoid in the video..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 text-sm"
              />
            </div>
          )}
        </div>

        {/* Kling Parameters */}
        {(mode === 'kling-text2video' || mode === 'kling-image2video') && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">Kling Settings</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-2 block">Quality Mode</label>
                <div className="flex gap-2">
                  {(['std', 'pro'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setKlingParams((p) => ({ ...p, mode: m }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        klingParams.mode === m
                          ? 'bg-purple-600 border-purple-500 text-white'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      {m.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-2 block">Duration</label>
                <div className="flex gap-2">
                  {(['5', '10'] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setKlingParams((p) => ({ ...p, duration: d }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        klingParams.duration === d
                          ? 'bg-purple-600 border-purple-500 text-white'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      {d}s
                    </button>
                  ))}
                </div>
              </div>
              {mode === 'kling-text2video' && (
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">Aspect Ratio</label>
                  <select
                    value={klingParams.aspectRatio}
                    onChange={(e) =>
                      setKlingParams((p) => ({ ...p, aspectRatio: e.target.value as '16:9' | '9:16' | '1:1' }))
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 text-sm"
                  >
                    <option value="16:9">16:9 (Landscape)</option>
                    <option value="9:16">9:16 (Portrait)</option>
                    <option value="1:1">1:1 (Square)</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Image Upload */}
        {(mode === 'kling-image2video' || mode === 'google-gemini') && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">
              {mode === 'kling-image2video' ? 'Source Image (Required)' : 'Image (Optional)'}
            </h2>
            {imageFile ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageFile}
                  alt="Uploaded"
                  className="h-48 object-cover rounded-lg border border-gray-700"
                />
                <button
                  onClick={() => setImageFile(null)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-600/80 hover:bg-red-600 flex items-center justify-center text-white text-sm"
                >
                  ✕
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-700 rounded-xl cursor-pointer hover:border-purple-500 transition-colors">
                <svg className="w-8 h-8 text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-gray-500">Click to upload image</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-xl p-4 flex items-center gap-3">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={!prompt.trim() || isGenerating}
          className="w-full py-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-base transition-colors flex items-center justify-center gap-3"
        >
          {isGenerating ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate
            </>
          )}
        </button>

        {/* Result */}
        {currentAsset && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">Result</h2>

            {currentAsset.status === 'processing' && (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="w-12 h-12 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3 }} />
                <div className="text-center">
                  <p className="text-white font-medium">Generating your video...</p>
                  <p className="text-gray-500 text-sm mt-1">This may take 1-3 minutes. Polling every 3 seconds.</p>
                </div>
                <div className="w-full max-w-xs bg-gray-800 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
              </div>
            )}

            {currentAsset.status === 'complete' && (
              <div className="max-w-xl">
                {currentAsset.type === 'video' && currentAsset.url && (
                  <video
                    src={currentAsset.url}
                    controls
                    className="w-full rounded-xl border border-gray-700"
                  />
                )}
                {currentAsset.type === 'image' && currentAsset.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentAsset.url}
                    alt={currentAsset.prompt}
                    className="w-full rounded-xl border border-gray-700"
                  />
                )}
                {currentAsset.params?.geminiResult && (
                  <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">
                      {currentAsset.params.geminiResult as string}
                    </p>
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  {currentAsset.url && (
                    <a
                      href={currentAsset.url}
                      download
                      className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </a>
                  )}
                </div>
              </div>
            )}

            {currentAsset.status === 'failed' && (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-red-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-400">Generation failed. Please try again.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
