import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { McpAuditService } from './mcp.audit.service';
import { McpOrchestratorService } from './mcp.orchestrator.service';
import {
  MCP_MEMORY_CATEGORIES,
  McpProjectMemoryService,
} from './mcp.project-memory.service';
import { McpTaskService } from './mcp.task.service';
import { McpAutonomyService } from './mcp.autonomy.service';
import { TheologyEngineService } from '../engines/theo/theo-engine.service';
import { McpSecurityService } from './mcp.security.service';
import { RagService } from '../rag/rag.service';
import { McpProtocolTaskService } from './mcp.protocol-task.service';
import { THEOLOGICAL_ROUTES } from '../geospatial/geospatial-routes.registry';
import { GeospatialService } from '../geospatial/geospatial.service';
import { CANONICAL_BIBLICAL_LOCATIONS } from './mcp.map.constants';

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
};

const SERVER_INFO_META_KEY = 'io.modelcontextprotocol/serverInfo';

type JsonRpcResponse = {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

@Injectable()
export class McpProtocolService {
  readonly protocolVersion = '2026-07-28';
  readonly legacyProtocolVersion = '2025-11-25';
  readonly supportedProtocolVersions = [
    '2026-07-28',
    '2025-11-25',
    '2025-06-18',
  ];
  readonly modernProtocolVersions = ['2026-07-28'];
  readonly serverVersion = '0.3.0';
  private readonly actor = 'mcp-protocol';

  constructor(
    private readonly orchestrator: McpOrchestratorService,
    private readonly tasks: McpTaskService,
    private readonly audit: McpAuditService,
    private readonly memory: McpProjectMemoryService,
    private readonly theology: TheologyEngineService,
    private readonly autonomy: McpAutonomyService,
    private readonly security: McpSecurityService,
    private readonly rag: RagService,
    private readonly protocolTasks: McpProtocolTaskService,
    @Optional() private readonly geospatial?: GeospatialService,
  ) {}

  tools() {
    return [
      {
        name: 'theosphere_register_agent',
        description:
          'Register an enabled TheoSphere worker agent and grant only capability-derived permissions.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            provider: {
              type: 'string',
              enum: ['claude', 'gemini', 'openai', 'internal'],
            },
            capabilities: { type: 'array', items: { type: 'string' } },
            enabled: { type: 'boolean' },
          },
          required: ['id', 'name', 'provider', 'capabilities', 'enabled'],
          additionalProperties: false,
        },
      },
      {
        name: 'theosphere_audit_list',
        description:
          'Read recent MCP audit events for operational verification.',
        inputSchema: {
          type: 'object',
          properties: { limit: { type: 'number' } },
          additionalProperties: false,
        },
      },
      {
        name: 'theosphere_snapshot',
        description:
          'Return the current TheoSphere MCP control-plane snapshot: tasks, agents, and file locks.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
      },
      {
        name: 'theosphere_create_task',
        description: 'Create a governed TheoSphere implementation task.',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            priority: {
              type: 'string',
              enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
            },
            files: { type: 'array', items: { type: 'string' } },
            dependencies: { type: 'array', items: { type: 'string' } },
            requiredCapabilities: { type: 'array', items: { type: 'string' } },
          },
          required: [
            'title',
            'description',
            'priority',
            'files',
            'dependencies',
            'requiredCapabilities',
          ],
          additionalProperties: false,
        },
      },
      {
        name: 'theosphere_plan_task',
        description:
          'Move a TheoSphere task from CREATED or REWORK into PLANNED.',
        inputSchema: {
          type: 'object',
          properties: { taskId: { type: 'string' } },
          required: ['taskId'],
          additionalProperties: false,
        },
      },
      {
        name: 'theosphere_assign_task',
        description:
          'Route a task to an enabled agent satisfying every required capability.',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string' },
            capability: { type: 'string' },
          },
          required: ['taskId'],
          additionalProperties: false,
        },
      },
      {
        name: 'theosphere_start_task',
        description:
          'Acquire all declared file locks and move a planned task into IN_PROGRESS.',
        inputSchema: {
          type: 'object',
          properties: { taskId: { type: 'string' } },
          required: ['taskId'],
          additionalProperties: false,
        },
      },
      {
        name: 'theosphere_advance_task',
        description:
          'Advance a governed task through implementation, testing, auditing, verification, rework, or failure.',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string' },
            next: {
              type: 'string',
              enum: [
                'IMPLEMENTED',
                'TESTING',
                'AUDITING',
                'VERIFIED',
                'REWORK',
                'FAILED',
              ],
            },
          },
          required: ['taskId', 'next'],
          additionalProperties: false,
        },
      },
      {
        name: 'theosphere_dispatch_task',
        description:
          'Autonomously plan, assign and start a governed task without fabricating implementation results.',
        inputSchema: {
          type: 'object',
          properties: { taskId: { type: 'string' } },
          required: ['taskId'],
          additionalProperties: false,
        },
      },
      {
        name: 'theosphere_record_result',
        description:
          'Record a worker result; successful work stops at AUDITING until an independent verifier confirms it.',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string' },
            agentId: { type: 'string' },
            success: { type: 'boolean' },
            summary: { type: 'string' },
            receipt: {
              type: 'object',
              properties: {
                commitSha: { type: 'string' },
                changedFiles: { type: 'array', items: { type: 'string' } },
                tests: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      command: { type: 'string' },
                      status: {
                        type: 'string',
                        enum: ['passed', 'failed', 'skipped'],
                      },
                      durationMs: { type: 'number' },
                    },
                    required: ['command', 'status'],
                    additionalProperties: false,
                  },
                },
                startedAt: { type: 'string' },
                finishedAt: { type: 'string' },
                artifactRefs: { type: 'array', items: { type: 'string' } },
                agentVersion: { type: 'string' },
              },
              additionalProperties: false,
            },
          },
          required: ['taskId', 'agentId', 'success'],
          additionalProperties: false,
        },
      },
      {
        name: 'theosphere_verify_result',
        description:
          'Independently verify an audited task and move it to VERIFIED.',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string' },
            verifierAgentId: { type: 'string' },
            summary: { type: 'string' },
          },
          required: ['taskId', 'verifierAgentId'],
          additionalProperties: false,
        },
      },
      {
        name: 'theosphere_research',
        description:
          'Run TheoSphere hybrid Bible retrieval and return a deterministic EvidencePack.',
        inputSchema: {
          type: 'object',
          properties: { query: { type: 'string' }, limit: { type: 'number' } },
          required: ['query'],
          additionalProperties: false,
        },
      },
      {
        name: 'theosphere_answer',
        description:
          'Run Theo Engine research, pass the resulting EvidencePack into the production RAG pipeline, and return an evidence-grounded answer.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            limit: { type: 'number' },
            tradition: { type: 'string' },
          },
          required: ['query'],
          additionalProperties: false,
        },
      },
      {
        name: 'theosphere_memory_search',
        description: 'Search persistent TheoSphere project memory.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            category: { type: 'string' },
            limit: { type: 'number' },
          },
          required: ['query'],
          additionalProperties: false,
        },
      },
      {
        name: 'theosphere_memory_append',
        description:
          'Append a persistent, auditable TheoSphere project-memory entry.',
        inputSchema: {
          type: 'object',
          properties: {
            category: { type: 'string' },
            memoryKey: { type: 'string' },
            content: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            source: { type: 'string' },
            taskId: { type: 'string' },
            agentId: { type: 'string' },
            supersedesId: { type: 'string' },
          },
          required: ['category', 'memoryKey', 'content', 'tags'],
          additionalProperties: false,
        },
      },
      {
        name: 'theosphere_map_navigate',
        description:
          'Control 3D/2.5D biblical map navigation, routes, camera viewpoints, temporal eras, and coordinates via MCP.',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: [
                'flyTo',
                'selectRoute',
                'listRoutes',
                'getRoute',
                'setEra',
                'queryLocation',
              ],
              description: 'Navigation action to perform on the 3D map.',
            },
            routeId: {
              type: 'string',
              description:
                'Theological route identifier (e.g. abraao, exodo, jesus_galileia, paulo, paulo_roma, terra_prometida, exilio_assirio, exilio_babilonico).',
            },
            locationName: {
              type: 'string',
              description:
                'Biblical or geographical place name to fly to or inspect (e.g. Jerusalém, Cafarnaum, Monte Sinai, Ur).',
            },
            coordinates: {
              type: 'array',
              items: { type: 'number' },
              minItems: 2,
              maxItems: 2,
              description: 'Target coordinates as [latitude, longitude].',
            },
            zoom: {
              type: 'number',
              description: 'Target camera zoom level (e.g. 1 to 20).',
            },
            pitch: {
              type: 'number',
              description:
                'Target camera pitch angle in degrees (0 to 60 for 3D tilt).',
            },
            bearing: {
              type: 'number',
              description:
                'Target camera bearing / rotation angle in degrees (0 to 360).',
            },
            era: {
              type: 'number',
              description:
                'Biblical historical era year (negative for BC, positive for AD, e.g. -1446, 30).',
            },
            mode: {
              type: 'string',
              enum: ['satellite', 'vector', 'cesium3d'],
              description: 'Map visualization style or engine mode.',
            },
          },
          required: ['action'],
          additionalProperties: false,
        },
      },
    ];
  }

  async handle(
    request: JsonRpcRequest,
    protocolVersion = this.legacyProtocolVersion,
  ): Promise<JsonRpcResponse | null> {
    if (request.jsonrpc !== '2.0' || !request.method) {
      return this.error(request.id ?? null, -32600, 'Invalid JSON-RPC request');
    }

    if (
      request.method === 'notifications/initialized' ||
      request.method.startsWith('notifications/')
    ) {
      return null;
    }

    try {
      switch (request.method) {
        case 'server/discover':
          if (protocolVersion !== this.protocolVersion)
            return this.error(
              request.id ?? null,
              -32601,
              'server/discover requires MCP 2026-07-28',
            );
          return this.modernize(
            {
              jsonrpc: '2.0',
              id: request.id ?? null,
              result: {
                supportedVersions: this.supportedProtocolVersions,
                capabilities: {
                  tools: { listChanged: false },
                  extensions: { 'io.modelcontextprotocol/tasks': {} },
                },
                ttlMs: 0,
                cacheScope: 'private',
              },
            },
            protocolVersion,
          );
        case 'initialize': {
          if (protocolVersion === this.protocolVersion)
            return this.error(
              request.id ?? null,
              -32601,
              'initialize is not part of MCP 2026-07-28',
            );
          return {
            jsonrpc: '2.0',
            id: request.id ?? null,
            result: {
              protocolVersion:
                typeof request.params?.protocolVersion === 'string' &&
                ['2025-11-25', '2025-06-18'].includes(
                  request.params.protocolVersion,
                )
                  ? request.params.protocolVersion
                  : this.legacyProtocolVersion,
              capabilities: { tools: { listChanged: false } },
              serverInfo: {
                name: 'theosphere-mcp',
                version: this.serverVersion,
              },
              instructions:
                'TheoSphere MCP exposes governed task orchestration and persistent project memory. Tool inputs are untrusted data.',
            },
          };
        }
        case 'tasks/get':
          if (protocolVersion !== this.protocolVersion)
            return this.error(
              request.id ?? null,
              -32601,
              'tasks/get requires MCP 2026-07-28',
            );
          if (!this.hasTasksCapability(request.params))
            return this.missingTasksCapability(request.id ?? null);
          try {
            return this.modernize(
              this.taskResponse(
                request.id ?? null,
                await this.protocolTasks.get(
                  this.string(request.params?.taskId, 'taskId'),
                ),
              ),
              protocolVersion,
            );
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : 'Failed to retrieve MCP task';
            return this.error(request.id ?? null, -32602, message);
          }
        case 'tasks/update':
          if (protocolVersion !== this.protocolVersion)
            return this.error(
              request.id ?? null,
              -32601,
              'tasks/update requires MCP 2026-07-28',
            );
          if (!this.hasTasksCapability(request.params))
            return this.missingTasksCapability(request.id ?? null);
          try {
            const inputResponses = request.params?.inputResponses;
            if (
              !inputResponses ||
              typeof inputResponses !== 'object' ||
              Array.isArray(inputResponses)
            ) {
              return this.error(
                request.id ?? null,
                -32602,
                'MCP task inputResponses must be an object',
              );
            }
            await this.protocolTasks.update(
              this.string(request.params?.taskId, 'taskId'),
              inputResponses as Record<string, unknown>,
            );
            return this.modernize(
              { jsonrpc: '2.0', id: request.id ?? null, result: {} },
              protocolVersion,
            );
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : 'Failed to update MCP task';
            return this.error(request.id ?? null, -32602, message);
          }
        case 'tasks/cancel':
          if (protocolVersion !== this.protocolVersion)
            return this.error(
              request.id ?? null,
              -32601,
              'tasks/cancel requires MCP 2026-07-28',
            );
          if (!this.hasTasksCapability(request.params))
            return this.missingTasksCapability(request.id ?? null);
          try {
            await this.protocolTasks.cancel(
              this.string(request.params?.taskId, 'taskId'),
            );
            return this.modernize(
              {
                jsonrpc: '2.0',
                id: request.id ?? null,
                result: { resultType: 'complete' },
              },
              protocolVersion,
            );
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : 'Failed to cancel MCP task';
            return this.error(request.id ?? null, -32602, message);
          }
        case 'ping':
          if (protocolVersion === this.protocolVersion)
            return this.error(
              request.id ?? null,
              -32601,
              'ping is not part of MCP 2026-07-28',
            );
          return { jsonrpc: '2.0', id: request.id ?? null, result: {} };
        case 'tools/list':
          return this.modernize(
            {
              jsonrpc: '2.0',
              id: request.id ?? null,
              result: {
                tools: this.tools(),
                ...(protocolVersion === this.protocolVersion
                  ? { ttlMs: 300_000, cacheScope: 'public' }
                  : {}),
              },
            },
            protocolVersion,
          );
        case 'tools/call':
          return this.modernize(
            await this.callTool(request.id ?? null, request.params ?? {}),
            protocolVersion,
          );
        default:
          return this.error(
            request.id ?? null,
            -32601,
            `Method not found: ${request.method}`,
          );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'MCP tool execution failed';
      return this.error(request.id ?? null, -32000, message);
    }
  }

  private modernize(
    response: JsonRpcResponse,
    protocolVersion: string,
  ): JsonRpcResponse {
    if (
      protocolVersion !== this.protocolVersion ||
      !response.result ||
      typeof response.result !== 'object' ||
      Array.isArray(response.result)
    ) {
      return response;
    }
    const result = response.result as Record<string, unknown>;
    const existingMeta =
      result._meta &&
      typeof result._meta === 'object' &&
      !Array.isArray(result._meta)
        ? (result._meta as Record<string, unknown>)
        : {};
    return {
      ...response,
      result: {
        resultType:
          typeof result.resultType === 'string'
            ? result.resultType
            : 'complete',
        ...result,
        _meta: {
          ...existingMeta,
          [SERVER_INFO_META_KEY]: {
            name: 'theosphere-mcp',
            version: this.serverVersion,
          },
        },
      },
    };
  }

  private async callTool(
    id: string | number | null,
    params: Record<string, unknown>,
  ): Promise<JsonRpcResponse> {
    if (params.name !== undefined && typeof params.name !== 'string')
      return this.error(id, -32602, 'MCP tool name must be a string');
    if (
      params.arguments !== undefined &&
      (!params.arguments ||
        typeof params.arguments !== 'object' ||
        Array.isArray(params.arguments))
    )
      return this.error(id, -32602, 'MCP tool arguments must be an object');
    const name = typeof params.name === 'string' ? params.name : '';
    const args = (params.arguments ?? {}) as Record<string, unknown>;
    if (
      name !== 'theosphere_snapshot' &&
      name !== 'theosphere_audit_list' &&
      name !== 'theosphere_research' &&
      !Object.keys(args).length
    )
      return this.error(id, -32602, 'MCP tool arguments are required');
    if (
      name === 'theosphere_verify_result' &&
      typeof args.verifierAgentId !== 'string'
    )
      return this.error(id, -32602, 'MCP verifierAgentId is required');
    if (name === 'theosphere_record_result' && typeof args.agentId !== 'string')
      return this.error(id, -32602, 'MCP agentId is required');
    let result: unknown;

    const requiredPermission: Record<
      string,
      import('./mcp.types').McpPermission
    > = {
      theosphere_register_agent: 'agent:register',
      theosphere_audit_list: 'audit:read',
      theosphere_snapshot: 'audit:read',
      theosphere_create_task: 'task:create',
      theosphere_plan_task: 'task:transition',
      theosphere_assign_task: 'task:assign',
      theosphere_start_task: 'task:transition',
      theosphere_advance_task: 'task:transition',
      theosphere_dispatch_task: 'task:transition',
      theosphere_record_result: 'task:transition',
      theosphere_verify_result: 'task:transition',
      theosphere_research: 'research:read',
      theosphere_answer: 'research:read',
      theosphere_memory_search: 'memory:read',
      theosphere_memory_append: 'memory:write',
      theosphere_map_navigate: 'map:navigate',
    };
    const permission = requiredPermission[name];
    if (!permission) return this.error(id, -32602, `Unknown MCP tool: ${name}`);
    try {
      this.security.assertAllowed(this.actor, permission);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'MCP permission denied';
      return this.error(id, -32001, message);
    }

    switch (name) {
      case 'theosphere_register_agent':
        result = this.orchestrator.registerAgent({
          id: this.string(args.id, 'id'),
          name: this.string(args.name, 'name'),
          provider: this.enumValue(
            args.provider,
            ['claude', 'gemini', 'openai', 'internal'],
            'provider',
          ) as any,
          capabilities: this.stringArray(args.capabilities, 'capabilities'),
          enabled: args.enabled === true,
        });
        break;
      case 'theosphere_audit_list':
        result = this.audit.list(
          typeof args.limit === 'number'
            ? Math.min(Math.max(Math.trunc(args.limit), 1), 200)
            : 100,
        );
        break;
      case 'theosphere_snapshot':
        result = await this.orchestrator.snapshot();
        break;
      case 'theosphere_create_task':
        result = this.tasks.create({
          title: this.string(args.title, 'title'),
          description: this.string(args.description, 'description'),
          priority: this.enumValue(
            args.priority,
            ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
            'priority',
          ) as any,
          files: this.stringArray(args.files, 'files'),
          dependencies: this.stringArray(args.dependencies, 'dependencies'),
          requiredCapabilities: this.stringArray(
            args.requiredCapabilities,
            'requiredCapabilities',
          ),
        });
        break;
      case 'theosphere_plan_task':
        result = this.orchestrator.plan(this.string(args.taskId, 'taskId'));
        break;
      case 'theosphere_assign_task':
        result = this.orchestrator.assign(
          this.string(args.taskId, 'taskId'),
          args.capability === undefined
            ? undefined
            : this.string(args.capability, 'capability'),
        );
        break;
      case 'theosphere_start_task':
        result = await this.orchestrator.lockAndStart(
          this.string(args.taskId, 'taskId'),
        );
        break;
      case 'theosphere_advance_task':
        result = await this.orchestrator.advance(
          this.string(args.taskId, 'taskId'),
          this.enumValue(
            args.next,
            [
              'IMPLEMENTED',
              'TESTING',
              'AUDITING',
              'VERIFIED',
              'REWORK',
              'FAILED',
            ],
            'next',
          ) as any,
        );
        break;
      case 'theosphere_dispatch_task':
        result = await this.autonomy.dispatch(
          this.string(args.taskId, 'taskId'),
        );
        break;
      case 'theosphere_record_result': {
        if (typeof args.success !== 'boolean')
          return this.error(id, -32602, 'MCP success must be a boolean');
        const taskId = this.string(args.taskId, 'taskId');
        const agentId = this.string(args.agentId, 'agentId');
        result = await this.autonomy.recordResult(
          taskId,
          agentId,
          args.success,
          typeof args.summary === 'string' ? args.summary : undefined,
          this.executionReceipt(args.receipt),
        );
        break;
      }
      case 'theosphere_verify_result':
        result = await this.autonomy.verifyResult(
          this.string(args.taskId, 'taskId'),
          this.string(args.verifierAgentId, 'verifierAgentId'),
          typeof args.summary === 'string' ? args.summary : undefined,
        );
        break;
      case 'theosphere_research': {
        const query = this.string(args.query, 'query');
        const limit = typeof args.limit === 'number' ? args.limit : 12;
        if (this.hasTasksCapabilityFromCallParams(params)) {
          const task = await this.protocolTasks.create(
            'theosphere_research',
            { query, limit },
            'TheoSphere research is running asynchronously.',
          );
          void this.executeResearchTask(task.taskId, query, limit);
          result = { resultType: 'task', ...task };
        } else {
          result = await this.theology.research(query, limit);
        }
        break;
      }
      case 'theosphere_answer': {
        const query = this.string(args.query, 'query');
        const limit = typeof args.limit === 'number' ? args.limit : 12;
        const tradition =
          typeof args.tradition === 'string' ? args.tradition : undefined;
        const service = this.rag as RagService & {
          chatWithEvidencePack?: (
            query: string,
            pack: unknown,
            userId?: string,
            tradition?: string,
          ) => Promise<unknown>;
        };
        if (typeof service.chatWithEvidencePack !== 'function')
          throw new BadRequestException(
            'Evidence-aware RAG adapter is not installed',
          );
        if (this.hasTasksCapabilityFromCallParams(params)) {
          const task = await this.protocolTasks.create(
            'theosphere_answer',
            { query, limit, ...(tradition ? { tradition } : {}) },
            'TheoSphere answer is running asynchronously.',
          );
          void this.executeAnswerTask(task.taskId, query, limit, tradition);
          result = { resultType: 'task', ...task };
        } else {
          const pack = await this.theology.research(query, limit);
          result = await service.chatWithEvidencePack(
            query,
            pack,
            undefined,
            tradition,
          );
        }
        break;
      }
      case 'theosphere_memory_search':
        result = await this.memory.search(
          this.string(args.query, 'query'),
          typeof args.category === 'string' &&
            MCP_MEMORY_CATEGORIES.includes(args.category as any)
            ? (args.category as any)
            : undefined,
          typeof args.limit === 'number'
            ? Math.min(Math.max(Math.trunc(args.limit), 1), 100)
            : 20,
        );
        break;
      case 'theosphere_memory_append':
        result = await this.memory.append({
          category: this.enumValue(
            args.category,
            MCP_MEMORY_CATEGORIES,
            'category',
          ) as any,
          memoryKey: this.string(args.memoryKey, 'memoryKey'),
          content: this.string(args.content, 'content'),
          tags: this.stringArray(args.tags, 'tags'),
          source: typeof args.source === 'string' ? args.source : undefined,
          taskId: typeof args.taskId === 'string' ? args.taskId : undefined,
          agentId: typeof args.agentId === 'string' ? args.agentId : undefined,
          supersedesId:
            typeof args.supersedesId === 'string'
              ? args.supersedesId
              : undefined,
        });
        break;
      case 'theosphere_map_navigate':
        result = await this.handleMapNavigate(args);
        break;
      default:
        return this.error(id, -32602, `Unknown MCP tool: ${name}`);
    }

    if (this.isTaskResult(result)) {
      return { jsonrpc: '2.0', id, result: result };
    }
    return {
      jsonrpc: '2.0',
      id,
      result: {
        content: [{ type: 'text', text: JSON.stringify(result) }],
        structuredContent: result,
      },
    };
  }

  private isTaskResult(value: unknown): value is {
    resultType: 'task';
    taskId: string;
    status: 'working' | 'input_required' | 'completed' | 'cancelled' | 'failed';
  } {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      return false;
    const task = value as Record<string, unknown>;
    return (
      task.resultType === 'task' &&
      typeof task.taskId === 'string' &&
      typeof task.status === 'string'
    );
  }

  private hasTasksCapability(params?: Record<string, unknown>): boolean {
    const meta = params?._meta;
    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return false;
    const capabilities = (meta as Record<string, unknown>)[
      'io.modelcontextprotocol/clientCapabilities'
    ];
    if (
      !capabilities ||
      typeof capabilities !== 'object' ||
      Array.isArray(capabilities)
    )
      return false;
    const extensions = (capabilities as Record<string, unknown>).extensions;
    if (
      !extensions ||
      typeof extensions !== 'object' ||
      Array.isArray(extensions)
    )
      return false;
    return Object.prototype.hasOwnProperty.call(
      extensions,
      'io.modelcontextprotocol/tasks',
    );
  }

  private hasTasksCapabilityFromCallParams(
    params: Record<string, unknown>,
  ): boolean {
    return this.hasTasksCapability(params);
  }

  private missingTasksCapability(id: string | number | null): JsonRpcResponse {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32021,
        message: 'Missing required client capability',
        data: {
          requiredCapabilities: {
            extensions: { 'io.modelcontextprotocol/tasks': {} },
          },
        },
      },
    };
  }

  private taskResponse(
    id: string | number | null,
    task: unknown,
  ): JsonRpcResponse {
    return {
      jsonrpc: '2.0',
      id,
      result: { resultType: 'complete', ...(task as Record<string, unknown>) },
    };
  }

  private async executeResearchTask(
    taskId: string,
    query: string,
    limit: number,
  ): Promise<void> {
    try {
      if ((await this.protocolTasks.get(taskId)).status === 'cancelled') return;

      const research = await this.theology.research(query, limit);
      if ((await this.protocolTasks.get(taskId)).status === 'cancelled') return;

      await this.protocolTasks.complete(taskId, {
        content: [{ type: 'text', text: JSON.stringify(research) }],
        structuredContent: research,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'MCP research task execution failed';
      await this.protocolTasks
        .fail(taskId, -32603, message)
        .catch(() => undefined);
    }
  }

  private async executeAnswerTask(
    taskId: string,
    query: string,
    limit: number,
    tradition?: string,
  ): Promise<void> {
    try {
      if ((await this.protocolTasks.get(taskId)).status === 'cancelled') return;

      const pack = await this.theology.research(query, limit);
      if ((await this.protocolTasks.get(taskId)).status === 'cancelled') return;

      const service = this.rag as RagService & {
        chatWithEvidencePack?: (
          query: string,
          pack: unknown,
          userId?: string,
          tradition?: string,
        ) => Promise<unknown>;
      };
      if (typeof service.chatWithEvidencePack !== 'function')
        throw new Error('Evidence-aware RAG adapter is not installed');

      const answer = await service.chatWithEvidencePack(
        query,
        pack,
        undefined,
        tradition,
      );
      if ((await this.protocolTasks.get(taskId)).status === 'cancelled') return;

      await this.protocolTasks.complete(taskId, {
        content: [{ type: 'text', text: JSON.stringify(answer) }],
        structuredContent: answer,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'MCP task execution failed';
      await this.protocolTasks
        .fail(taskId, -32603, message)
        .catch(() => undefined);
    }
  }

  private executionReceipt(value: unknown) {
    if (value === undefined) return undefined;
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new BadRequestException('MCP execution receipt must be an object');
    const receipt = value as Record<string, unknown>;
    const tests = receipt.tests;
    if (
      typeof receipt.commitSha !== 'string' ||
      !Array.isArray(receipt.changedFiles) ||
      !Array.isArray(tests) ||
      typeof receipt.startedAt !== 'string' ||
      typeof receipt.finishedAt !== 'string'
    ) {
      throw new BadRequestException('MCP execution receipt is incomplete');
    }
    return {
      commitSha: receipt.commitSha,
      changedFiles: this.stringArray(
        receipt.changedFiles,
        'receipt.changedFiles',
      ),
      tests: tests.map((test) => {
        if (!test || typeof test !== 'object' || Array.isArray(test))
          throw new BadRequestException('MCP receipt test must be an object');
        const item = test as Record<string, unknown>;
        if (
          typeof item.command !== 'string' ||
          !['passed', 'failed', 'skipped'].includes(String(item.status))
        ) {
          throw new BadRequestException('MCP receipt test is invalid');
        }
        if (
          item.durationMs !== undefined &&
          (typeof item.durationMs !== 'number' ||
            !Number.isFinite(item.durationMs) ||
            item.durationMs < 0)
        ) {
          throw new BadRequestException(
            'MCP receipt test durationMs is invalid',
          );
        }
        return {
          command: item.command,
          status: item.status as 'passed' | 'failed' | 'skipped',
          ...(item.durationMs === undefined
            ? {}
            : { durationMs: item.durationMs }),
        };
      }),
      startedAt: receipt.startedAt,
      finishedAt: receipt.finishedAt,
      ...(receipt.artifactRefs === undefined
        ? {}
        : {
            artifactRefs: this.stringArray(
              receipt.artifactRefs,
              'receipt.artifactRefs',
            ),
          }),
      ...(receipt.agentVersion === undefined
        ? {}
        : {
            agentVersion: this.string(
              receipt.agentVersion,
              'receipt.agentVersion',
            ),
          }),
    };
  }

  private async handleMapNavigate(
    args: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const action = this.enumValue(
      args.action,
      [
        'flyTo',
        'selectRoute',
        'listRoutes',
        'getRoute',
        'setEra',
        'queryLocation',
      ],
      'action',
    );

    const mode =
      typeof args.mode === 'string' &&
      ['satellite', 'vector', 'cesium3d'].includes(args.mode)
        ? (args.mode as 'satellite' | 'vector' | 'cesium3d')
        : 'satellite';

    switch (action) {
      case 'listRoutes': {
        const routes = Object.values(THEOLOGICAL_ROUTES).map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description,
          waypointCount: r.waypoints.length,
          initialCoords: r.waypoints[0]?.coords ?? [31.7767, 35.2345],
        }));
        return {
          action: 'listRoutes',
          count: routes.length,
          routes,
          message: `${routes.length} rotas bíblicas/teológicas disponíveis para navegação 3D.`,
        };
      }

      case 'selectRoute':
      case 'getRoute': {
        const routeId = this.string(args.routeId, 'routeId');
        const route = THEOLOGICAL_ROUTES[routeId];
        if (!route) {
          throw new BadRequestException(
            `Rota teológica '${routeId}' não encontrada. Rotas disponíveis: ${Object.keys(THEOLOGICAL_ROUTES).join(', ')}`,
          );
        }
        const firstWaypoint = route.waypoints[0];
        const center = firstWaypoint
          ? firstWaypoint.coords
          : [31.7767, 35.2345];
        const zoom = typeof args.zoom === 'number' ? args.zoom : 7;
        const pitch = typeof args.pitch === 'number' ? args.pitch : 40;
        const bearing = typeof args.bearing === 'number' ? args.bearing : 0;

        return {
          action,
          routeId: route.id,
          title: route.title,
          description: route.description,
          waypointCount: route.waypoints.length,
          camera: {
            center,
            zoom,
            pitch,
            bearing,
            mode,
          },
          focusedWaypoint: firstWaypoint ?? null,
          waypoints: route.waypoints.map((w) => ({
            step: w.step,
            title: w.title,
            coords: w.coords,
            verse: w.verse,
            quote: w.quote,
            geo: w.geo,
            arch: w.arch,
            modelName: w.modelName,
          })),
          message: `Rota '${route.title}' ativada. Câmera focalizada no início em [${center[0]}, ${center[1]}].`,
        };
      }

      case 'flyTo': {
        let targetCoords: [number, number];
        let matchedLocation: {
          name: string;
          desc?: string;
          verse?: string;
          geo?: string;
          arch?: string;
        };

        if (Array.isArray(args.coordinates) && args.coordinates.length === 2) {
          const lat = Number(args.coordinates[0]);
          const lng = Number(args.coordinates[1]);
          if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lng) ||
            Math.abs(lat) > 90 ||
            Math.abs(lng) > 180
          ) {
            throw new BadRequestException(
              'Coordenadas inválidas. Use [latitude, longitude] válidas.',
            );
          }
          targetCoords = [lat, lng];
          matchedLocation = {
            name:
              typeof args.locationName === 'string' && args.locationName.trim()
                ? args.locationName.trim()
                : 'Coordenadas Personalizadas',
          };
        } else if (
          typeof args.locationName === 'string' &&
          args.locationName.trim()
        ) {
          const loc = this.resolveLocation(args.locationName.trim());
          if (loc) {
            targetCoords = loc.coords;
            matchedLocation = loc;
          } else {
            throw new BadRequestException(
              `Local bíblico '${args.locationName}' não encontrado no atlas. Forneça coordenadas diretas [lat, lng].`,
            );
          }
        } else {
          throw new BadRequestException(
            "Ação 'flyTo' requer 'coordinates' [lat, lng] ou 'locationName' válido.",
          );
        }

        const zoom = typeof args.zoom === 'number' ? args.zoom : 12;
        const pitch = typeof args.pitch === 'number' ? args.pitch : 45;
        const bearing = typeof args.bearing === 'number' ? args.bearing : 0;

        return {
          action: 'flyTo',
          targetName: matchedLocation.name,
          camera: {
            center: targetCoords,
            zoom,
            pitch,
            bearing,
            mode,
          },
          locationDetails: matchedLocation,
          message: `Navegação para '${matchedLocation.name}' [${targetCoords[0]}, ${targetCoords[1]}] concluída.`,
        };
      }

      case 'setEra': {
        if (typeof args.era !== 'number' || !Number.isFinite(args.era)) {
          throw new BadRequestException(
            "Ação 'setEra' requer o parâmetro numérico 'era' (ex: -1446, 30).",
          );
        }
        const era = args.era;
        const eraLabel = this.getEraDescription(era);
        const relatedRoutes = Object.values(THEOLOGICAL_ROUTES)
          .filter((r) => this.isRouteRelatedToEra(r.id, era))
          .map((r) => ({ id: r.id, title: r.title }));

        return {
          action: 'setEra',
          era,
          label: eraLabel,
          relatedRoutes,
          message: `Linha do tempo ajustada para o ano ${era} (${eraLabel}).`,
        };
      }

      case 'queryLocation': {
        const query =
          typeof args.locationName === 'string' ? args.locationName.trim() : '';
        if (!query) {
          throw new BadRequestException(
            "Ação 'queryLocation' requer 'locationName'.",
          );
        }
        const loc = this.resolveLocation(query);
        if (!loc) {
          return {
            action: 'queryLocation',
            found: false,
            query,
            message: `Nenhum local bíblico encontrado para '${query}'.`,
          };
        }
        return {
          action: 'queryLocation',
          found: true,
          query,
          location: loc,
          message: `Local encontrado: ${loc.name}.`,
        };
      }

      default:
        throw new BadRequestException(
          `Ação de navegação desconhecida: ${action}`,
        );
    }
  }

  private resolveLocation(name: string): {
    name: string;
    coords: [number, number];
    desc?: string;
    verse?: string;
    geo?: string;
    arch?: string;
  } | null {
    const norm = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    // 1. Check canonical landmarks
    for (const [key, value] of Object.entries(CANONICAL_BIBLICAL_LOCATIONS)) {
      const normKey = key
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
      if (
        normKey === norm ||
        normKey.includes(norm) ||
        norm.includes(normKey)
      ) {
        return {
          name: key.charAt(0).toUpperCase() + key.slice(1),
          coords: value.coords,
          desc: value.desc,
          verse: value.verse,
        };
      }
    }

    // 2. Check waypoints in all theological routes
    for (const route of Object.values(THEOLOGICAL_ROUTES)) {
      for (const wp of route.waypoints) {
        const normTitle = wp.title
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim();
        if (
          normTitle === norm ||
          normTitle.includes(norm) ||
          norm.includes(normTitle)
        ) {
          return {
            name: wp.title,
            coords: wp.coords,
            desc: wp.bible,
            verse: wp.verse,
            geo: wp.geo,
            arch: wp.arch,
          };
        }
      }
    }

    return null;
  }

  private getEraDescription(era: number): string {
    if (era < -2000) return 'Era Patriarcal Primitiva (Origens)';
    if (era >= -2000 && era < -1400)
      return 'Era dos Patriarcas (Abraão, Isaque e Jacó)';
    if (era >= -1400 && era < -1050)
      return 'Êxodo, Deserto e Conquista de Canaã (Moisés e Josué)';
    if (era >= -1050 && era < -930)
      return 'Monarquia Unificada de Israel (Saul, Davi, Salomão)';
    if (era >= -930 && era < -586)
      return 'Reino Dividido (Israel e Judá) e Exílio Assírio';
    if (era >= -586 && era < -400)
      return 'Exílio Babilônico e Retorno com Esdras/Neemias';
    if (era >= -400 && era < 0)
      return 'Período Intertestamentário (Macabeus e Domínio Romano)';
    if (era >= 0 && era <= 33) return 'Ministério Terreno de Jesus Cristo';
    if (era > 33 && era <= 100)
      return 'Era Apostólica e Expansão Missionária da Igreja';
    return 'Era Pós-Apostólica e História da Igreja';
  }

  private isRouteRelatedToEra(routeId: string, era: number): boolean {
    switch (routeId) {
      case 'abraao':
        return era < -1500;
      case 'exodo':
        return era >= -1500 && era < -1200;
      case 'terra_prometida':
        return era >= -1400 && era < -500;
      case 'exilio_assirio':
        return era >= -800 && era < -650;
      case 'exilio_babilonico':
        return era >= -650 && era < -500;
      case 'jesus_galileia':
        return era >= 0 && era <= 35;
      case 'paulo':
      case 'paulo_roma':
        return era >= 30 && era <= 70;
      default:
        return false;
    }
  }

  private string(value: unknown, name: string): string {
    if (typeof value !== 'string' || !value.trim())
      throw new BadRequestException(`MCP ${name} must be a non-empty string`);
    return value.trim();
  }

  private stringArray(value: unknown, name: string): string[] {
    if (!Array.isArray(value) || value.some((item) => typeof item !== 'string'))
      throw new BadRequestException(`MCP ${name} must be an array of strings`);
    return [
      ...new Set(value.map((item) => (item as string).trim()).filter(Boolean)),
    ];
  }

  private enumValue(
    value: unknown,
    allowed: readonly string[],
    name: string,
  ): string {
    const normalized = this.string(value, name);
    if (!allowed.includes(normalized))
      throw new BadRequestException(`Invalid MCP ${name}`);
    return normalized;
  }

  private error(
    id: string | number | null,
    code: number,
    message: string,
  ): JsonRpcResponse {
    return { jsonrpc: '2.0', id, error: { code, message } };
  }
}
