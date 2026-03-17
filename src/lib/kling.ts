import { SignJWT } from 'jose';

const KLING_BASE_URL = 'https://api.klingai.com';

async function generateKlingToken(): Promise<string> {
  const accessKey = process.env.KLING_ACCESS_KEY!;
  const secretKey = process.env.KLING_SECRET_KEY!;

  const secret = new TextEncoder().encode(secretKey);
  const now = Math.floor(Date.now() / 1000);

  const token = await new SignJWT({
    iss: accessKey,
    exp: now + 1800,
    nbf: now - 5,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .sign(secret);

  return token;
}

export interface TextToVideoParams {
  prompt: string;
  negative_prompt?: string;
  cfg_scale?: number;
  mode?: 'std' | 'pro';
  aspect_ratio?: '16:9' | '9:16' | '1:1';
  duration?: '5' | '10';
}

export interface ImageToVideoParams {
  image: string;
  prompt?: string;
  duration?: '5' | '10';
  mode?: 'std' | 'pro';
}

export interface KlingVideoStatus {
  task_id: string;
  task_status: 'submitted' | 'processing' | 'succeed' | 'failed';
  task_result?: {
    videos: Array<{
      url: string;
      duration: string;
    }>;
  };
}

async function textToVideo(params: TextToVideoParams): Promise<{ task_id: string; task_status: string }> {
  const token = await generateKlingToken();

  const response = await fetch(`${KLING_BASE_URL}/v1/videos/text2video`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model_name: 'kling-v1',
      ...params,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Kling API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.data;
}

async function imageToVideo(params: ImageToVideoParams): Promise<{ task_id: string }> {
  const token = await generateKlingToken();

  const response = await fetch(`${KLING_BASE_URL}/v1/videos/image2video`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model_name: 'kling-v1',
      ...params,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Kling API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.data;
}

async function checkVideoStatus(
  taskId: string,
  type: 'text2video' | 'image2video'
): Promise<KlingVideoStatus> {
  const token = await generateKlingToken();

  const endpoint =
    type === 'text2video'
      ? `${KLING_BASE_URL}/v1/videos/text2video/${taskId}`
      : `${KLING_BASE_URL}/v1/videos/image2video/${taskId}`;

  const response = await fetch(endpoint, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Kling status check error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.data;
}

export const klingClient = {
  generateKlingToken,
  textToVideo,
  imageToVideo,
  checkVideoStatus,
};
