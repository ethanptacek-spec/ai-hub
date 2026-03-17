import { NextRequest, NextResponse } from 'next/server';
import { googleClient } from '@/lib/google';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, imageUrl, targetProvider } = body;

    if (!prompt && !imageUrl) {
      return NextResponse.json(
        { error: 'Either prompt or imageUrl is required' },
        { status: 400 }
      );
    }

    let result: string;

    if (imageUrl) {
      // Analyze the image using Gemini vision
      const instruction = prompt || 'Describe this image in detail, including style, composition, colors, and mood.';
      result = await googleClient.analyzeImage(imageUrl, instruction);
    } else {
      // Enhance the prompt for a specific provider
      result = await googleClient.enhancePrompt(prompt, targetProvider || 'general');
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error('Google Gemini analyze error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
