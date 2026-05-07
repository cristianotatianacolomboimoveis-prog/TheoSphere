import { NextResponse } from 'next/server';

const CHUNK_SIZE = 4000; // Limits to avoid 413 from Google API

async function translateChunk(text: string, targetLang: string = 'pt'): Promise<string> {
  if (!text.trim()) return '';
  
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Translation API error: ${response.status}`);
      return text; // fallback to original
    }
    
    const data = await response.json();
    // Google returns an array where data[0] contains the translated segments
    let translated = '';
    if (data && data[0]) {
      for (const segment of data[0]) {
        if (segment[0]) translated += segment[0];
      }
    }
    return translated || text;
  } catch (err) {
    console.error('Translation failed:', err);
    return text;
  }
}

export async function POST(req: Request) {
  try {
    const { text, targetLang = 'pt' } = await req.json();
    
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // Split text into chunks to prevent URL too long / payload too large errors
    const chunks = [];
    for (let i = 0; i < text.length; i += CHUNK_SIZE) {
      chunks.push(text.slice(i, i + CHUNK_SIZE));
    }

    const translatedChunks = await Promise.all(
      chunks.map(chunk => translateChunk(chunk, targetLang))
    );

    const fullTranslation = translatedChunks.join('');

    return NextResponse.json({ translated: fullTranslation });
  } catch (error) {
    console.error('API Translation error:', error);
    return NextResponse.json({ error: 'Failed to translate' }, { status: 500 });
  }
}
