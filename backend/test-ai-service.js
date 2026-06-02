"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./src/app.module");
const ai_service_1 = require("./src/common/ai/ai.service");
require("dotenv/config");
async function bootstrap() {
    console.log('--- STARTING NESTJS INTEGRATION TEST WITH FASTAPI ---');
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    try {
        const aiService = app.get(ai_service_1.AiService);
        console.log('Testing centroid calculation...');
        const coords = [
            [35.2137, 31.7683],
            [34.7818, 32.0853],
            [34.9896, 32.7940],
        ];
        const centroid = await aiService.getCentroid(coords);
        console.log('✅ Centroid computed successfully by Python service:', centroid);
        console.log('Testing RAG Query...');
        const query = 'Qual a importância teológica do Monte das Oliveiras?';
        const answer = await aiService.queryRAG(query, ['doc1.txt', 'doc2.txt']);
        console.log('✅ RAG Response from Python service:', answer);
        console.log('--- ALL INTEGRATION TESTS PASSED SUCCESSFULLY! ---');
    }
    catch (error) {
        console.error('❌ Integration test failed:', error);
    }
    finally {
        await app.close();
    }
}
bootstrap();
//# sourceMappingURL=test-ai-service.js.map