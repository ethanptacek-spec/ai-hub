import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.GOOGLE_AI_API_KEY!;

function getClient() {
  return new GoogleGenerativeAI(API_KEY);
}

async function enhancePrompt(prompt: string, targetProvider: string = 'general'): Promise<string> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const systemInstruction = targetProvider === 'kling'
    ? `You are an expert at writing prompts for AI video generation with Kling.
       Rewrite the user's prompt to be more detailed, cinematic, and effective for video generation.
       Include details about camera movement, lighting, atmosphere, and visual style.
       Keep it under 300 characters. Return ONLY the enhanced prompt, nothing else.`
    : `You are an expert at writing prompts for AI image generation.
       Rewrite the user's prompt to be more detailed, vivid, and effective.
       Include details about style, lighting, composition, and artistic technique.
       Keep it under 200 characters. Return ONLY the enhanced prompt, nothing else.`;

  const result = await model.generateContent([
    systemInstruction,
    `Original prompt: ${prompt}`,
  ]);

  const response = await result.response;
  return response.text().trim();
}

async function analyzeImage(imageUrl: string, instruction: string = 'Describe this image in detail'): Promise<string> {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  // Fetch the image and convert to base64
  const imageResponse = await fetch(imageUrl);
  const imageBuffer = await imageResponse.arrayBuffer();
  const base64Image = Buffer.from(imageBuffer).toString('base64');
  const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

  const result = await model.generateContent([
    {
      inlineData: {
        data: base64Image,
        mimeType: mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
      },
    },
    instruction,
  ]);

  const response = await result.response;
  return response.text().trim();
}

async function generateImage(
  prompt: string,
  aspectRatio: string = '1:1'
): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': API_KEY,
      },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Imagen API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const prediction = data.predictions?.[0];

  if (!prediction?.bytesBase64Encoded) {
    throw new Error('No image data returned from Imagen API');
  }

  const mimeType = prediction.mimeType || 'image/png';
  return `data:${mimeType};base64,${prediction.bytesBase64Encoded}`;
}

export const googleClient = {
  enhancePrompt,
  analyzeImage,
  generateImage,
};
