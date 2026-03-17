export type Provider = 'kling' | 'google' | 'openai';
export type AssetType = 'image' | 'video';
export type JobStatus = 'pending' | 'processing' | 'complete' | 'failed';

export interface Asset {
  id: string;
  type: AssetType;
  provider: Provider;
  prompt: string;
  negativePrompt?: string;
  url: string;
  thumbnailUrl?: string;
  status: JobStatus;
  jobId?: string;
  createdAt: string;
  projectId?: string;
  params?: Record<string, unknown>;
  parentAssetId?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  tags: string[];
}

export interface GenerationJob {
  id: string;
  assetId: string;
  status: JobStatus;
  providerJobId?: string;
  error?: string;
}
