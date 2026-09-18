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
