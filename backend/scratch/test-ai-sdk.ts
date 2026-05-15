import { streamText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import 'dotenv/config';

async function main() {
  console.log('API Key configurada:', process.env.GEMINI_API_KEY ? 'Sim (mascarada: ' + process.env.GEMINI_API_KEY.slice(0, 5) + '...)' : 'Não');

  const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  try {
    // Usando gemini-flash-latest para garantir compatibilidade
    const result = streamText({
      model: google('gemini-flash-latest'),
      prompt: 'Invent a new holiday and describe its traditions.',
    });

    console.log('--- Iniciando Stream (Gemini 1.5 Flash) ---\n');

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
