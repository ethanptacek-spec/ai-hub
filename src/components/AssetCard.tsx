'use client';

import { useState } from 'react';
import { Asset } from '@/types';

interface AssetCardProps {
  asset: Asset;
  onUseInPipeline?: (asset: Asset) => void;
}

const providerBadgeStyles: Record<string, string> = {
  kling: 'bg-purple-900 text-purple-300 border border-purple-700',
  google: 'bg-blue-900 text-blue-300 border border-blue-700',
  openai: 'bg-green-900 text-green-300 border border-green-700',
};

const statusStyles: Record<string, string> = {
  pending: 'bg-yellow-500',
  processing: 'bg-blue-500 animate-pulse',
  complete: 'bg-green-500',
  failed: 'bg-red-500',
};

export function AssetCard({ asset, onUseInPipeline }: AssetCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  const handleDownload = async () => {
    if (!asset.url) return;

    if (asset.url.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = asset.url;
      link.download = `ai-hub-${asset.id}.${asset.type === 'video' ? 'mp4' : 'png'}`;
      link.click();
    } else {
      const response = await fetch(asset.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ai-hub-${asset.id}.${asset.type === 'video' ? 'mp4' : 'png'}`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-lg hover:border-gray-700 transition-all duration-200 group">
      {/* Media Preview */}
      <div className="relative aspect-video bg-gray-800 overflow-hidden">
        {asset.status === 'processing' || asset.status === 'pending' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-400">
              {asset.status === 'pending' ? 'Queued...' : 'Generating...'}
            </span>
          </div>
        ) : asset.status === 'failed' ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <svg className="w-8 h-8 text-red-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-red-400">Generation failed</span>
            </div>
          </div>
        ) : asset.type === 'image' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset.url}
            alt={asset.prompt}
            className="w-full h-full object-cover"
          />
        ) : asset.type === 'video' ? (
          <>
            {showVideo ? (
              <video
                src={asset.url}
                controls
                autoPlay
                className="w-full h-full object-cover"
                onEnded={() => setIsPlaying(false)}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <button
                  onClick={() => setShowVideo(true)}
                  className="w-14 h-14 rounded-full bg-purple-600/80 hover:bg-purple-600 flex items-center justify-center transition-all duration-200 hover:scale-110"
                >
                  <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                  Video
                </div>
              </div>
            )}
          </>
        ) : null}

        {/* Status indicator */}
        <div className="absolute top-2 left-2">
          <div className={`w-2 h-2 rounded-full ${statusStyles[asset.status]}`} />
        </div>
      </div>

      {/* Card Content */}
      <div className="p-3">
        {/* Provider + Type badges */}
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${providerBadgeStyles[asset.provider]}`}>
            {asset.provider.charAt(0).toUpperCase() + asset.provider.slice(1)}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
            {asset.type}
          </span>
        </div>

        {/* Prompt */}
        <p className="text-xs text-gray-400 line-clamp-2 mb-3" title={asset.prompt}>
          {asset.prompt}
        </p>

        {/* Actions */}
        <div className="flex gap-2">
          {asset.status === 'complete' && (
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
          )}
          {onUseInPipeline && asset.status === 'complete' && (
            <button
              onClick={() => onUseInPipeline(asset)}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs bg-purple-600/20 hover:bg-purple-600/30 border border-purple-600/40 rounded-lg text-purple-400 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              Pipeline
            </button>
          )}
        </div>

        {/* Timestamp */}
        <p className="text-xs text-gray-600 mt-2">
          {new Date(asset.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}
