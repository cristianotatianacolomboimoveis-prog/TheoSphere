#!/usr/bin/env node

const base = (process.env.MCP_BASE_URL || 'http://localhost:3002/mcp').replace(/\/$/, '');
const apiKey = process.env.MCP_API_KEY || '';
const query = process.env.MCP_QUERY || 'John 3:16';
const runAnswer = process.env.MCP_RUN_ANSWER === '1';
const timeoutMs = Number(process.env.MCP_TIMEOUT_MS || 60000);

const headers = {
  Accept: 'application/json',
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
report.steps.push({
  name: 'server/discover',
  resultType: discovery.resultType,
  supportedVersions: discovery.supportedVersions,
  tasks: Boolean(discovery.capabilities?.extensions?.['io.modelcontextprotocol/tasks']),
});

const tools = await post('tools/list', meta());
report.steps.push({
  name: 'tools/list',
  resultType: tools.resultType,
  toolCount: Array.isArray(tools.tools) ? tools.tools.length : 0,
  hasTheoAnswer: Array.isArray(tools.tools) && tools.tools.some((tool) => tool?.name === 'theosphere_answer'),
});

const research = await post(
  'tools/call',
  {
    name: 'theosphere_research',
    arguments: { query, limit: 5 },
    ...meta(),
  },
  'theosphere_research',
);
report.steps.push({
  name: 'theosphere_research',
  resultType: research.resultType || 'complete',
  itemCount: Array.isArray(research.structuredContent?.items) ? research.structuredContent.items.length : null,
  sourceCount: research.structuredContent?.sourceCount ?? null,
});

if (runAnswer) {
  const answer = await post(
    'tools/call',
    {
      name: 'theosphere_answer',
      arguments: { query, limit: 5 },
      ...meta(true),
    },
    'theosphere_answer',
  );
  if (answer.resultType === 'task') {
    const deadline = Date.now() + timeoutMs;
    let task = answer;
    while (Date.now() < deadline && task.status === 'working') {
      await new Promise((resolve) => setTimeout(resolve, Math.max(Number(task.pollIntervalMs || 2000), 250)));
      task = await post('tasks/get', { taskId: answer.taskId, ...meta(true) }, answer.taskId);
    }
    if (task.status === 'working') throw new Error('theosphere_answer task timed out');
    report.steps.push({
      name: 'theosphere_answer',
      resultType: 'task',
      taskId: answer.taskId,
      status: task.status,
      hasResult: Boolean(task.result),
      hasError: Boolean(task.error),
    });
  } else {
    report.steps.push({ name: 'theosphere_answer', resultType: answer.resultType || 'complete', completedSynchronously: true });
  }
}

console.log(JSON.stringify({ ok: true, ...report }, null, 2));
