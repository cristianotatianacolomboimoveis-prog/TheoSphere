# TheoSphere MCP operations

## Runtime contract

The MCP endpoint is exposed at `/mcp`. Production requires `MCP_API_KEY`; agent worker callbacks under `/mcp/agents/*` and the streaming answer endpoint under `/mcp/answer/stream` use the same secret.

For MCP 2026-07-28, each HTTP POST carries:
- `MCP-Protocol-Version: 2026-07-28`
- `Mcp-Method` matching the JSON-RPC method
- `Mcp-Name` for `tools/call` and for `tasks/get|tasks/update|tasks/cancel`
- `_meta.io.modelcontextprotocol/protocolVersion`
- `_meta.io.modelcontextprotocol/clientCapabilities`

The server is stateless at the MCP transport layer. Server-side task state is explicit and persisted in `ProjectMemory`. File locks use Redis when `REDIS_URL` is configured; the in-memory fallback is suitable for single-process development only.

## Safe smoke test

The smoke test intentionally does **not** call the generative answer path by default, so it does not consume Gemini/OpenAI quota.

Run against a local server:

```bash
cd backend
MCP_BASE_URL=http://localhost:3002/mcp npm run mcp:smoke
```

Run against a protected deployment:

```bash
cd backend
MCP_BASE_URL=https://YOUR-BACKEND/mcp \
MCP_API_KEY='YOUR_KEY' \
npm run mcp:smoke
```

To exercise the asynchronous Tasks path as well:

```bash
MCP_BASE_URL=https://YOUR-BACKEND/mcp \
MCP_API_KEY='YOUR_KEY' \
MCP_RUN_ANSWER=1 \
MCP_QUERY='O que significa justificação pela fé?' \
npm run mcp:smoke
```

The script validates discovery, tool catalog, EvidencePack research, and—when explicitly enabled—the task handle plus polling lifecycle.

## Deployment note

Do not expose the MCP endpoint in production without setting `MCP_API_KEY`. For multiple backend instances, configure Redis so file locks are shared across instances. Keep API keys in Render/Vercel environment settings or the equivalent secret manager, never in Git.
