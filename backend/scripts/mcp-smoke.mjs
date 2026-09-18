#!/usr/bin/env node

const base = (process.env.MCP_BASE_URL || 'http://localhost:3002/mcp').replace(/\/$/, '');
const apiKey = process.env.MCP_API_KEY || '';
const query = process.env.MCP_QUERY || 'John 3:16';
const runAnswer = process.env.MCP_RUN_ANSWER === '1';
const runResearch = process.env.MCP_RUN_RESEARCH === '1';
const timeoutMs = Number(process.env.MCP_TIMEOUT_MS || 60000);

const headers = {
  Accept: 'application/json, text/event-stream',
  'Content-Type': 'application/json',
  'MCP-Protocol-Version': '2026-07-28',
};
if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

function meta(withTasks = false) {
  return {
    _meta: {
      'io.modelcontextprotocol/protocolVersion': '2026-07-28',
      'io.modelcontextprotocol/clientInfo': { name: 'theosphere-mcp-smoke', version: '1.0.0' },
      'io.modelcontextprotocol/clientCapabilities': withTasks
        ? { extensions: { 'io.modelcontextprotocol/tasks': {} } }
        : {},
    },
  };
}

async function post(method, params = {}, name) {
  const requestHeaders = {
    ...headers,
    'Mcp-Method': method,
    ...(name ? { 'Mcp-Name': name } : {}),
  };
  const response = await fetch(base, {
    method: 'POST',
    headers: requestHeaders,
    body: JSON.stringify({ jsonrpc: '2.0', id: crypto.randomUUID(), method, params }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`${method} HTTP ${response.status}: ${JSON.stringify(body)}`);
  if (body.error) throw new Error(`${method} JSON-RPC ${body.error.code}: ${body.error.message}`);
  return body.result;
}

const report = { base, query, steps: [] };
const discovery = await post('server/discover', meta());
if (discovery.resultType !== 'complete') throw new Error('server/discover missing resultType=complete');
if (!Array.isArray(discovery.supportedVersions) || discovery.supportedVersions[0] !== '2026-07-28') throw new Error('server/discover must advertise 2026-07-28 as its modern protocol version');
if (discovery.ttlMs !== 0 || discovery.cacheScope !== 'private') throw new Error('server/discover returned an invalid cache policy');
if (!discovery._meta?.['io.modelcontextprotocol/serverInfo']?.name) throw new Error('server/discover missing serverInfo metadata');
report.steps.push({ name: 'server/discover', resultType: discovery.resultType, supportedVersions: discovery.supportedVersions, tasks: Boolean(discovery.capabilities?.extensions?.['io.modelcontextprotocol/tasks']), ttlMs: discovery.ttlMs, cacheScope: discovery.cacheScope });

const tools = await post('tools/list', meta());
report.steps.push({ name: 'tools/list', resultType: tools.resultType, toolCount: Array.isArray(tools.tools) ? tools.tools.length : 0, hasTheoAnswer: Array.isArray(tools.tools) && tools.tools.some((tool) => tool?.name === 'theosphere_answer') });

if (runResearch) {
  const research = await post('tools/call', { name: 'theosphere_research', arguments: { query, limit: 5 }, ...meta() }, 'theosphere_research');
  report.steps.push({ name: 'theosphere_research', resultType: research.resultType || 'complete', itemCount: Array.isArray(research.structuredContent?.items) ? research.structuredContent.items.length : null, sourceCount: research.structuredContent?.sourceCount ?? null });
}

if (runAnswer) {
  const answer = await post('tools/call', { name: 'theosphere_answer', arguments: { query }, ...meta(true) }, 'theosphere_answer');
  report.steps.push({ name: 'theosphere_answer', resultType: answer.resultType || 'complete', taskId: answer.taskId || null });
  if (answer.resultType === 'task') {
    const task = await post('tasks/get', { taskId: answer.taskId, ...meta(true) }, answer.taskId);
    report.steps.push({ name: 'tasks/get', resultType: task.resultType || 'complete', status: task.status, taskId: task.taskId });
  }
}

console.log(JSON.stringify({ ok: true, ...report }, null, 2));
