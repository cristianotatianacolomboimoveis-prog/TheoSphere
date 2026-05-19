"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ai_1 = require("ai");
const google_1 = require("@ai-sdk/google");
require("dotenv/config");
async function main() {
    console.log('API Key configurada:', process.env.GEMINI_API_KEY ? 'Sim (mascarada: ' + process.env.GEMINI_API_KEY.slice(0, 5) + '...)' : 'Não');
    const google = (0, google_1.createGoogleGenerativeAI)({
        apiKey: process.env.GEMINI_API_KEY,
    });
    try {
        const result = (0, ai_1.streamText)({
            model: google('gemini-flash-latest'),
            prompt: 'Invent a new holiday and describe its traditions.',
        });
        console.log('--- Iniciando Stream (Gemini 1.5 Flash) ---\n');
        for await (const textPart of result.textStream) {
            process.stdout.write(textPart);
        }
        console.log('\n\n--- Stream Finalizado ---');
        console.log('Token usage:', await result.usage);
    }
    catch (error) {
        console.error('\nErro durante a geração:', error);
    }
}
main().catch(console.error);
//# sourceMappingURL=test-ai-sdk.js.map