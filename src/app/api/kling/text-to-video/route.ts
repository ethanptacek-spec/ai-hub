import { NextRequest, NextResponse } from 'next/server';
import { klingClient } from '@/lib/kling';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, negative_prompt, cfg_scale, mode, aspect_ratio, duration } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const result = await klingClient.textToVideo({
      prompt: prompt.trim(),
      negative_prompt: negative_prompt || undefined,
      cfg_scale: cfg_scale || undefined,
      mode: mode || 'std',
      aspect_ratio: aspect_ratio || '16:9',
      duration: duration || '5',
    });

    return NextResponse.json({
      task_id: result.task_id,
      task_status: result.task_status,
    });
  } catch (error) {
    console.error('Kling text-to-video error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
