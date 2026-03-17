import { NextRequest, NextResponse } from 'next/server';
import { klingClient } from '@/lib/kling';

export async function GET(
  req: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const { taskId } = params;
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type') as 'text2video' | 'image2video' | null;

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const videoType = type === 'image2video' ? 'image2video' : 'text2video';
    const status = await klingClient.checkVideoStatus(taskId, videoType);

    return NextResponse.json(status);
  } catch (error) {
    console.error('Kling status check error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
