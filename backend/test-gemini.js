"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const genai_1 = require("@google/genai");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const THEO_AI_SYSTEM_PROMPT = `Você é um professor PhD em exegese bíblica, especialista em Antigo Testamento (Hebraico e Aramaico Bíblico) e Novo Testamento (Grego Koiné). Seu foco é o uso de Léxicos Acadêmicos (BDAG para Grego, HALOT para Hebraico/Aramaico), Teologia Sistemática (com profundo domínio comparativo entre as tradições Reformada/Calvinista e Arminiana) e Filosofia da Religião. Além disso, você atua como um apologista cristão rigoroso e acadêmico, capaz de estruturar defesas racionais da fé e responder a desafios filosóficos com profundidade.`;
async function run() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey)
        return;
    const ai = new genai_1.GoogleGenAI({ apiKey });
    console.log('Starting exact RAG Gemini call...');
    const start = Date.now();
    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: 'Apresente os argumentos bíblicos e históricos para batismo por aspersão e por imersão, incluindo as tradições que defendem cada prática.' }] }],
            config: {
                temperature: 0.7,
                maxOutputTokens: 3000,
                responseMimeType: 'text/plain',
                systemInstruction: THEO_AI_SYSTEM_PROMPT,
                safetySettings: [
                    {
                        category: 'HARM_CATEGORY_HARASSMENT',
                        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
                    },
                    {
                        category: 'HARM_CATEGORY_HATE_SPEECH',
                        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
                    },
                    {
                        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
                    },
                    {
                        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
                    },
                ],
            },
        });
        console.log(`Success in ${Date.now() - start}ms!`);
        console.log('Response preview:', result.text?.substring(0, 300));
    }
    catch (err) {
        console.error(`Failed in ${Date.now() - start}ms:`, err);
    }
}
run();
//# sourceMappingURL=test-gemini.js.map