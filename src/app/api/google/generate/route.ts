import { NextRequest, NextResponse } from 'next/server';
import { googleClient } from '@/lib/google';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, aspectRatio } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const imageDataUrl = await googleClient.generateImage(
      prompt.trim(),
      aspectRatio || '1:1'
    );

    return NextResponse.json({ imageDataUrl });
  } catch (error) {
    console.error('Google Imagen generation error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
