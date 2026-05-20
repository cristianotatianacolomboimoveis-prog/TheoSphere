import { streamText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import 'dotenv/config';

import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, 'backend/.env') });

async function main() {
  const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  try {
    const result = streamText({
      model: google('gemini-flash-latest'),
      prompt: 'Invent a new holiday and describe its traditions.',
    });

    console.log('--- Iniciando Stream (Gemini) ---\n');

    for await (const textPart of result.textStream) {
      process.stdout.write(textPart);
    }

    console.log('\n\n--- Stream Finalizado ---');
    console.log('Token usage:', await result.usage);
  } catch (error) {
    console.error('\nErro durante a geração:', error);
  }
}

main().catch(console.error);
