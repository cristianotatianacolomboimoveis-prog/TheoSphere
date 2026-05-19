"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
async function testApi() {
    try {
        const routes = await axios_1.default.get('http://localhost:3000/api/v1/geo/routes');
        console.log('Routes List:', routes.data);
        const exodo = await axios_1.default.get('http://localhost:3000/api/v1/geo/routes/exodo');
        console.log('Exodo Route:', exodo.data.data.title, 'with', exodo.data.data.waypoints.length, 'waypoints');
        const graph = await axios_1.default.get('http://localhost:3000/api/v1/rag/graph?q=Êxodo');
        console.log('Êxodo Graph:', graph.data.data.nodes.length, 'nodes');
    }
    catch (error) {
        console.error('API Test failed (is the server running?):', error.message);
    }
}
testApi();
//# sourceMappingURL=test_new_endpoints.js.map