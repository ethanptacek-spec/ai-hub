import { NextRequest, NextResponse } from 'next/server';
import { klingClient } from '@/lib/kling';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, prompt, duration, mode } = body;

    if (!image) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 });
    }

    const result = await klingClient.imageToVideo({
      image,
      prompt: prompt || undefined,
      duration: duration || '5',
      mode: mode || 'std',
    });

    return NextResponse.json({
      task_id: result.task_id,
    });
  } catch (error) {
    console.error('Kling image-to-video error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
