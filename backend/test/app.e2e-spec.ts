import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('serves modern MCP discovery/tools and legacy session initialization over HTTP', async () => {
    const modernMeta = {
      _meta: {
        'io.modelcontextprotocol/protocolVersion': '2026-07-28',
        'io.modelcontextprotocol/clientInfo': { name: 'theosphere-e2e', version: '1.0.0' },
        'io.modelcontextprotocol/clientCapabilities': {},
      },
    };

    const discovery = await request(app.getHttpServer())
      .post('/mcp')
      .set('Accept', 'application/json')
      .set('MCP-Protocol-Version', '2026-07-28')
      .set('Mcp-Method', 'server/discover')
      .send({ jsonrpc: '2.0', id: 1, method: 'server/discover', params: modernMeta })
      .expect(200);

    expect(discovery.body.result.resultType).toBe('complete');
    expect(discovery.body.result.supportedVersions).toContain('2026-07-28');
    expect(discovery.body.result.capabilities.extensions).toEqual({
      'io.modelcontextprotocol/tasks': {},
    });
    expect(discovery.body.result.ttlMs).toBe(0);
    expect(discovery.body.result.cacheScope).toBe('private');
    expect(discovery.body.result._meta['io.modelcontextprotocol/serverInfo']).toEqual(
      expect.objectContaining({ name: 'theosphere-mcp', version: expect.any(String) }),
    );

    const research = await request(app.getHttpServer())
      .post('/mcp')
      .set('Accept', 'application/json')
      .set('MCP-Protocol-Version', '2026-07-28')
      .set('Mcp-Method', 'tools/call')
      .set('Mcp-Name', 'theosphere_research')
      .send({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'theosphere_research',
          arguments: { query: 'John 3:16', limit: 5 },
          ...modernMeta,
        },
      })
      .expect(200);

    expect(research.body.result.resultType).toBe('complete');
    expect(Array.isArray(research.body.result.content)).toBe(true);
    expect(research.body.result.structuredContent).toEqual(expect.objectContaining({
      query: 'John 3:16',
      items: expect.any(Array),
    }));

    const taskMeta = {
      'io.modelcontextprotocol/protocolVersion': '2026-07-28',
      'io.modelcontextprotocol/clientInfo': { name: 'theosphere-e2e', version: '1.0.0' },
      'io.modelcontextprotocol/clientCapabilities': {
        extensions: { 'io.modelcontextprotocol/tasks': {} },
      },
    };

    const taskCreation = await request(app.getHttpServer())
      .post('/mcp')
      .set('Accept', 'application/json')
      .set('MCP-Protocol-Version', '2026-07-28')
      .set('Mcp-Method', 'tools/call')
      .set('Mcp-Name', 'theosphere_research')
      .send({
        jsonrpc: '2.0',
        id: 2.5,
        method: 'tools/call',
        params: {
          name: 'theosphere_research',
          arguments: { query: 'John 3:16', limit: 3 },
          _meta: taskMeta,
        },
      })
      .expect(200);

    expect(taskCreation.body.result.resultType).toBe('task');
    const taskId = taskCreation.body.result.taskId;
    expect(taskId).toEqual(expect.any(String));

    let taskState: any;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      taskState = await request(app.getHttpServer())
        .post('/mcp')
        .set('Accept', 'application/json')
        .set('MCP-Protocol-Version', '2026-07-28')
        .set('Mcp-Method', 'tasks/get')
        .set('Mcp-Name', taskId)
        .send({
          jsonrpc: '2.0',
          id: 2.6 + attempt,
          method: 'tasks/get',
          params: { taskId, _meta: taskMeta },
        })
        .expect(200);

      if (taskState.body.result.status === 'completed') break;
      if (taskState.body.result.status !== 'working') throw new Error('Unexpected task status: ' + taskState.body.result.status);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    expect(taskState.body.result.resultType).toBe('complete');
    expect(taskState.body.result.status).toBe('completed');
    expect(taskState.body.result.result).toEqual(expect.objectContaining({
      structuredContent: expect.objectContaining({ query: 'John 3:16' }),
    }));

    const listed = await request(app.getHttpServer())
      .post('/mcp')
      .set('Accept', 'application/json')
      .set('MCP-Protocol-Version', '2026-07-28')
      .set('Mcp-Method', 'tools/list')
      .send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: modernMeta })
      .expect(200);

    expect(listed.body.result.resultType).toBe('complete');
    expect(listed.body.result.ttlMs).toBe(300_000);
    expect(listed.body.result.cacheScope).toBe('public');
    expect(listed.body.result.tools).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'theosphere_answer' })]),
    );

    const legacy = await request(app.getHttpServer())
      .post('/mcp')
      .set('Accept', 'application/json, text/event-stream')
      .send({
        jsonrpc: '2.0',
        id: 3,
        method: 'initialize',
        params: {
          protocolVersion: '2025-11-25',
          capabilities: {},
          clientInfo: { name: 'theosphere-e2e-legacy', version: '1.0.0' },
        },
      })
      .expect(200);

    expect(legacy.headers['mcp-session-id']).toEqual(expect.any(String));
    expect(legacy.headers['mcp-protocol-version']).toBe('2025-11-25');
  });

  it('cancels a modern task and returns invalid task handles as JSON-RPC errors', async () => {
    const taskMeta = {
      'io.modelcontextprotocol/protocolVersion': '2026-07-28',
      'io.modelcontextprotocol/clientInfo': { name: 'theosphere-e2e', version: '1.0.0' },
      'io.modelcontextprotocol/clientCapabilities': {
        extensions: { 'io.modelcontextprotocol/tasks': {} },
      },
    };

    const created = await request(app.getHttpServer())
      .post('/mcp')
      .set('Accept', 'application/json')
      .set('MCP-Protocol-Version', '2026-07-28')
      .set('Mcp-Method', 'tools/call')
      .set('Mcp-Name', 'theosphere_research')
      .send({
        jsonrpc: '2.0',
        id: 20,
        method: 'tools/call',
        params: {
          name: 'theosphere_research',
          arguments: { query: 'Romans 8:28', limit: 2 },
          _meta: taskMeta,
        },
      })
      .expect(200);

    const taskId = created.body.result.taskId;
    expect(created.body.result.resultType).toBe('task');
    expect(taskId).toEqual(expect.any(String));

    const cancelled = await request(app.getHttpServer())
      .post('/mcp')
      .set('Accept', 'application/json')
      .set('MCP-Protocol-Version', '2026-07-28')
      .set('Mcp-Method', 'tasks/cancel')
      .set('Mcp-Name', taskId)
      .send({
        jsonrpc: '2.0',
        id: 21,
        method: 'tasks/cancel',
        params: { taskId, _meta: taskMeta },
      })
      .expect(200);

    expect(cancelled.body.result).toEqual(expect.objectContaining({ resultType: 'complete' }));

    const state = await request(app.getHttpServer())
      .post('/mcp')
      .set('Accept', 'application/json')
      .set('MCP-Protocol-Version', '2026-07-28')
      .set('Mcp-Method', 'tasks/get')
      .set('Mcp-Name', taskId)
      .send({
        jsonrpc: '2.0',
        id: 22,
        method: 'tasks/get',
        params: { taskId, _meta: taskMeta },
      })
      .expect(200);

    expect(state.body.result.resultType).toBe('complete');
    expect(state.body.result.status).toBe('cancelled');

    const missing = await request(app.getHttpServer())
      .post('/mcp')
      .set('Accept', 'application/json')
      .set('MCP-Protocol-Version', '2026-07-28')
      .set('Mcp-Method', 'tasks/get')
      .set('Mcp-Name', 'does-not-exist')
      .send({
        jsonrpc: '2.0',
        id: 23,
        method: 'tasks/get',
        params: { taskId: 'does-not-exist', _meta: taskMeta },
      })
      .expect(200);

    expect(missing.body.error).toEqual(expect.objectContaining({ code: -32602 }));
  });

  it('/api/v1/ai/locations (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/ai/locations')
      .expect(200)
      .then((response) => {
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
