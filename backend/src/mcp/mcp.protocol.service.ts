import { BadRequestException, Injectable } from '@nestjs/common';
import { McpAuditService } from './mcp.audit.service';
import { McpOrchestratorService } from './mcp.orchestrator.service';
import { MCP_MEMORY_CATEGORIES, McpProjectMemoryService } from './mcp.project-memory.service';
import { McpTaskService } from './mcp.task.service';
import { McpAutonomyService } from './mcp.autonomy.service';
import { TheologyEngineService } from '../engines/theo/theo-engine.service';
import { McpSecurityService } from './mcp.security.service';
import { RagService } from '../rag/rag.service';
import { McpProtocolTaskService } from './mcp.protocol-task.service';

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
  readonly supportedProtocolVersions = ['2026-07-28', '2025-11-25', '2025-06-18'];
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
  ) {}

  tools() {
    return [
      {
        name: 'theosphere_register_agent',
        description: 'Register an enabled TheoSphere worker agent and grant only capability-derived permissions.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' }, name: { type: 'string' },
            provider: { type: 'string', enum: ['claude', 'gemini', 'openai', 'internal'] },
            capabilities: { type: 'array', items: { type: 'string' } }, enabled: { type: 'boolean' },
          },
          required: ['id', 'name', 'provider', 'capabilities', 'enabled'], additionalProperties: false,
        },
      },
      {
        name: 'theosphere_audit_list',
        description: 'Read recent MCP audit events for operational verification.',
        inputSchema: { type: 'object', properties: { limit: { type: 'number' } }, additionalProperties: false },
      },
      {
        name: 'theosphere_snapshot',
        description: 'Return the current TheoSphere MCP control-plane snapshot: tasks, agents, and file locks.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      },
      {
        name: 'theosphere_create_task',
        description: 'Create a governed TheoSphere implementation task.',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
            files: { type: 'array', items: { type: 'string' } },
            dependencies: { type: 'array', items: { type: 'string' } },
            requiredCapabilities: { type: 'array', items: { type: 'string' } },
          },
          required: ['title', 'description', 'priority', 'files', 'dependencies', 'requiredCapabilities'],
          additionalProperties: false,
        },
      },
      {
        name: 'theosphere_plan_task',
        description: 'Move a TheoSphere task from CREATED or REWORK into PLANNED.',
        inputSchema: { type: 'object', properties: { taskId: { type: 'string' } }, required: ['taskId'], additionalProperties: false },
      },
      {
        name: 'theosphere_assign_task',
        description: 'Route a task to an enabled agent satisfying every required capability.',
        inputSchema: { type: 'object', properties: { taskId: { type: 'string' }, capability: { type: 'string' } }, required: ['taskId'], additionalProperties: false },
      },
      {
        name: 'theosphere_start_task',
        description: 'Acquire all declared file locks and move a planned task into IN_PROGRESS.',
        inputSchema: { type: 'object', properties: { taskId: { type: 'string' } }, required: ['taskId'], additionalProperties: false },
      },
      {
        name: 'theosphere_advance_task',
        description: 'Advance a governed task through implementation, testing, auditing, verification, rework, or failure.',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string' },
            next: { type: 'string', enum: ['IMPLEMENTED', 'TESTING', 'AUDITING', 'VERIFIED', 'REWORK', 'FAILED'] },
          },
          required: ['taskId', 'next'],
          additionalProperties: false,
        },
      },
      {
        name: 'theosphere_dispatch_task',
        description: 'Autonomously plan, assign and start a governed task without fabricating implementation results.',
        inputSchema: { type: 'object', properties: { taskId: { type: 'string' } }, required: ['taskId'], additionalProperties: false },
      },
      {
        name: 'theosphere_record_result',
        description: 'Record a worker result; successful work stops at AUDITING until an independent verifier confirms it.',
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
                      status: { type: 'string', enum: ['passed', 'failed', 'skipped'] },
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
        description: 'Independently verify an audited task and move it to VERIFIED.',
        inputSchema: { type: 'object', properties: { taskId: { type: 'string' }, verifierAgentId: { type: 'string' }, summary: { type: 'string' } }, required: ['taskId', 'verifierAgentId'], additionalProperties: false },
      },
      {
        name: 'theosphere_research',
        description: 'Run TheoSphere hybrid Bible retrieval and return a deterministic EvidencePack.',
        inputSchema: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'number' } }, required: ['query'], additionalProperties: false },
      },
      {
        name: 'theosphere_answer',
        description: 'Run Theo Engine research, pass the resulting EvidencePack into the production RAG pipeline, and return an evidence-grounded answer.',
        inputSchema: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'number' }, tradition: { type: 'string' } }, required: ['query'], additionalProperties: false },
      },
      {
        name: 'theosphere_memory_search',
        description: 'Search persistent TheoSphere project memory.',
        inputSchema: {
          type: 'object',
          properties: { query: { type: 'string' }, category: { type: 'string' }, limit: { type: 'number' } },
          required: ['query'],
          additionalProperties: false,
        },
      },
      {
        name: 'theosphere_memory_append',
        description: 'Append a persistent, auditable TheoSphere project-memory entry.',
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
    ];
  }

  async handle(request: JsonRpcRequest, protocolVersion = this.legacyProtocolVersion): Promise<JsonRpcResponse | null> {
    if (request.jsonrpc !== '2.0' || !request.method) {
      return this.error(request.id ?? null, -32600, 'Invalid JSON-RPC request');
    }

    if (request.method === 'notifications/initialized' || request.method.startsWith('notifications/')) {
      return null;
    }

    try {
      switch (request.method) {
        case 'server/discover':
          if (protocolVersion !== this.protocolVersion) return this.error(request.id ?? null, -32601, 'server/discover requires MCP 2026-07-28');
          return this.modernize({
            jsonrpc: '2.0',
            id: request.id ?? null,
            result: {
              supportedVersions: this.supportedProtocolVersions,
              capabilities: {
                tools: { listChanged: false },
                extensions: { 'io.modelcontextprotocol/tasks': {} },
              },
            },
          }, protocolVersion);
        case 'initialize': {
          if (protocolVersion === this.protocolVersion) return this.error(request.id ?? null, -32601, 'initialize is not part of MCP 2026-07-28');
          return {
            jsonrpc: '2.0',
            id: request.id ?? null,
            result: {
              protocolVersion: typeof request.params?.protocolVersion === 'string' && ['2025-11-25', '2025-06-18'].includes(request.params.protocolVersion)
                ? request.params.protocolVersion
                : this.legacyProtocolVersion,
              capabilities: { tools: { listChanged: false } },
              serverInfo: { name: 'theosphere-mcp', version: this.serverVersion },
              instructions: 'TheoSphere MCP exposes governed task orchestration and persistent project memory. Tool inputs are untrusted data.',
            },
          };
        }
        case 'tasks/get':
          if (protocolVersion !== this.protocolVersion) return this.error(request.id ?? null, -32601, 'tasks/get requires MCP 2026-07-28');
          if (!this.hasTasksCapability(request.params)) return this.missingTasksCapability(request.id ?? null);
          try {
            return this.modernize(
              this.taskResponse(
                request.id ?? null,
                this.protocolTasks.get(this.string(request.params?.taskId, 'taskId')),
              ),
              protocolVersion,
            );
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to retrieve MCP task';
            return this.error(request.id ?? null, -32602, message);
          }
        case 'tasks/update':
          if (protocolVersion !== this.protocolVersion) return this.error(request.id ?? null, -32601, 'tasks/update requires MCP 2026-07-28');
          if (!this.hasTasksCapability(request.params)) return this.missingTasksCapability(request.id ?? null);
          return this.error(request.id ?? null, -32602, 'TheoSphere protocol tasks do not currently expose input_required tasks');
        case 'tasks/cancel':
          if (protocolVersion !== this.protocolVersion) return this.error(request.id ?? null, -32601, 'tasks/cancel requires MCP 2026-07-28');
          if (!this.hasTasksCapability(request.params)) return this.missingTasksCapability(request.id ?? null);
          try {
            await this.protocolTasks.cancel(this.string(request.params?.taskId, 'taskId'));
            return this.modernize(
              { jsonrpc: '2.0', id: request.id ?? null, result: { resultType: 'complete' } },
              protocolVersion,
            );
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to cancel MCP task';
            return this.error(request.id ?? null, -32602, message);
          }
        case 'ping':
          return this.modernize({ jsonrpc: '2.0', id: request.id ?? null, result: {} }, protocolVersion);
        case 'tools/list':
          return this.modernize({
            jsonrpc: '2.0',
            id: request.id ?? null,
            result: {
              tools: this.tools(),
              ...(protocolVersion === this.protocolVersion ? { ttlMs: 300_000, cacheScope: 'public' } : {}),
            },
          }, protocolVersion);
        case 'tools/call':
          return this.modernize(await this.callTool(request.id ?? null, request.params ?? {}), protocolVersion);
        default:
          return this.error(request.id ?? null, -32601, `Method not found: ${request.method}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'MCP tool execution failed';
      return this.error(request.id ?? null, -32000, message);
    }
  }

  private modernize(response: JsonRpcResponse, protocolVersion: string): JsonRpcResponse {
    if (protocolVersion !== this.protocolVersion || !response.result || typeof response.result !== 'object' || Array.isArray(response.result)) {
      return response;
    }
    const result = response.result as Record<string, unknown>;
    const existingMeta = result._meta && typeof result._meta === 'object' && !Array.isArray(result._meta)
      ? result._meta as Record<string, unknown>
      : {};
    return {
      ...response,
      result: {
        resultType: typeof result.resultType === 'string' ? result.resultType : 'complete',
        ...result,
        _meta: {
          ...existingMeta,
          [SERVER_INFO_META_KEY]: { name: 'theosphere-mcp', version: this.serverVersion },
        },
      },
    };
  }

  private async callTool(id: string | number | null, params: Record<string, unknown>): Promise<JsonRpcResponse> {
    if (params.name !== undefined && typeof params.name !== 'string') return this.error(id, -32602, 'MCP tool name must be a string');
    if (params.arguments !== undefined && (!params.arguments || typeof params.arguments !== 'object' || Array.isArray(params.arguments))) return this.error(id, -32602, 'MCP tool arguments must be an object');
    const name = typeof params.name === 'string' ? params.name : '';
    const args = (params.arguments ?? {}) as Record<string, unknown>;
    if (name !== 'theosphere_snapshot' && name !== 'theosphere_audit_list' && name !== 'theosphere_research' && !Object.keys(args).length) return this.error(id, -32602, 'MCP tool arguments are required');
    if (name === 'theosphere_verify_result' && typeof args.verifierAgentId !== 'string') return this.error(id, -32602, 'MCP verifierAgentId is required');
    if (name === 'theosphere_record_result' && typeof args.agentId !== 'string') return this.error(id, -32602, 'MCP agentId is required');
    let result: unknown;

    const requiredPermission: Record<string, import('./mcp.types').McpPermission> = {
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
    };
    const permission = requiredPermission[name];
    if (!permission) return this.error(id, -32602, `Unknown MCP tool: ${name}`);
    try {
      this.security.assertAllowed(this.actor, permission);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'MCP permission denied';
      return this.error(id, -32001, message);
    }

    switch (name) {
      case 'theosphere_register_agent':
        result = this.orchestrator.registerAgent({
          id: this.string(args.id, 'id'),
          name: this.string(args.name, 'name'),
          provider: this.enumValue(args.provider, ['claude', 'gemini', 'openai', 'internal'], 'provider') as any,
          capabilities: this.stringArray(args.capabilities, 'capabilities'),
          enabled: args.enabled === true,
        });
        break;
      case 'theosphere_audit_list':
        result = this.audit.list(typeof args.limit === 'number' ? Math.min(Math.max(Math.trunc(args.limit), 1), 200) : 100);
        break;
      case 'theosphere_snapshot':
        result = await this.orchestrator.snapshot();
        break;
      case 'theosphere_create_task':
        result = this.tasks.create({
          title: this.string(args.title, 'title'),
          description: this.string(args.description, 'description'),
          priority: this.enumValue(args.priority, ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], 'priority') as any,
          files: this.stringArray(args.files, 'files'),
          dependencies: this.stringArray(args.dependencies, 'dependencies'),
          requiredCapabilities: this.stringArray(args.requiredCapabilities, 'requiredCapabilities'),
        });
        break;
      case 'theosphere_plan_task':
        result = this.orchestrator.plan(this.string(args.taskId, 'taskId'));
        break;
      case 'theosphere_assign_task':
        result = this.orchestrator.assign(this.string(args.taskId, 'taskId'), args.capability === undefined ? undefined : this.string(args.capability, 'capability'));
        break;
      case 'theosphere_start_task':
        result = await this.orchestrator.lockAndStart(this.string(args.taskId, 'taskId'));
        break;
      case 'theosphere_advance_task':
        result = await this.orchestrator.advance(this.string(args.taskId, 'taskId'), this.enumValue(args.next, ['IMPLEMENTED', 'TESTING', 'AUDITING', 'VERIFIED', 'REWORK', 'FAILED'], 'next') as any);
        break;
      case 'theosphere_dispatch_task':
        result = await this.autonomy.dispatch(this.string(args.taskId, 'taskId'));
        break;
      case 'theosphere_record_result': {
        if (typeof args.success !== 'boolean') return this.error(id, -32602, 'MCP success must be a boolean');
        const taskId = this.string(args.taskId, 'taskId');
        const agentId = this.string(args.agentId, 'agentId');
        result = await this.autonomy.recordResult(taskId, agentId, args.success, typeof args.summary === 'string' ? args.summary : undefined, this.executionReceipt(args.receipt));
        break;
      }
      case 'theosphere_verify_result':
        result = await this.autonomy.verifyResult(this.string(args.taskId, 'taskId'), this.string(args.verifierAgentId, 'verifierAgentId'), typeof args.summary === 'string' ? args.summary : undefined);
        break;
      case 'theosphere_research':
        result = await this.theology.research(this.string(args.query, 'query'), typeof args.limit === 'number' ? args.limit : 12);
        break;
      case 'theosphere_answer': {
        const query = this.string(args.query, 'query');
        const limit = typeof args.limit === 'number' ? args.limit : 12;
        const tradition = typeof args.tradition === 'string' ? args.tradition : undefined;
        const service = this.rag as RagService & {
          chatWithEvidencePack?: (query: string, pack: unknown, userId?: string, tradition?: string) => Promise<unknown>;
        };
        if (typeof service.chatWithEvidencePack !== 'function') throw new BadRequestException('Evidence-aware RAG adapter is not installed');
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
          result = await service.chatWithEvidencePack(query, pack, undefined, tradition);
        }
        break;
      }
      case 'theosphere_memory_search':
        result = await this.memory.search(
          this.string(args.query, 'query'),
          typeof args.category === 'string' && MCP_MEMORY_CATEGORIES.includes(args.category as any) ? args.category as any : undefined,
          typeof args.limit === 'number' ? Math.min(Math.max(Math.trunc(args.limit), 1), 100) : 20,
        );
        break;
      case 'theosphere_memory_append':
        result = await this.memory.append({
          category: this.enumValue(args.category, MCP_MEMORY_CATEGORIES, 'category') as any,
          memoryKey: this.string(args.memoryKey, 'memoryKey'),
          content: this.string(args.content, 'content'),
          tags: this.stringArray(args.tags, 'tags'),
          source: typeof args.source === 'string' ? args.source : undefined,
          taskId: typeof args.taskId === 'string' ? args.taskId : undefined,
          agentId: typeof args.agentId === 'string' ? args.agentId : undefined,
          supersedesId: typeof args.supersedesId === 'string' ? args.supersedesId : undefined,
        });
        break;
      default:
        return this.error(id, -32602, `Unknown MCP tool: ${name}`);
    }

    if (this.isTaskResult(result)) {
      return { jsonrpc: '2.0', id, result: result as Record<string, unknown> };
    }
    return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result } };
  }

  private isTaskResult(value: unknown): value is { resultType: 'task'; taskId: string; status: 'working' | 'input_required' | 'completed' | 'cancelled' | 'failed' } {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const task = value as Record<string, unknown>;
    return task.resultType === 'task' && typeof task.taskId === 'string' && typeof task.status === 'string';
  }

  private hasTasksCapability(params?: Record<string, unknown>): boolean {
    const meta = params?._meta;
    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return false;
    const capabilities = (meta as Record<string, unknown>)['io.modelcontextprotocol/clientCapabilities'];
    if (!capabilities || typeof capabilities !== 'object' || Array.isArray(capabilities)) return false;
    const extensions = (capabilities as Record<string, unknown>).extensions;
    if (!extensions || typeof extensions !== 'object' || Array.isArray(extensions)) return false;
    return Object.prototype.hasOwnProperty.call(extensions, 'io.modelcontextprotocol/tasks');
  }

  private hasTasksCapabilityFromCallParams(params: Record<string, unknown>): boolean {
    return this.hasTasksCapability(params);
  }

  private missingTasksCapability(id: string | number | null): JsonRpcResponse {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32021,
        message: 'Missing required client capability',
        data: { requiredCapabilities: { extensions: { 'io.modelcontextprotocol/tasks': {} } } },
      },
    };
  }

  private taskResponse(id: string | number | null, task: unknown): JsonRpcResponse {
    return { jsonrpc: '2.0', id, result: { resultType: 'complete', ...(task as Record<string, unknown>) } };
  }

  private async executeAnswerTask(taskId: string, query: string, limit: number, tradition?: string): Promise<void> {
    try {
      const pack = await this.theology.research(query, limit);
      const service = this.rag as RagService & {
        chatWithEvidencePack?: (query: string, pack: unknown, userId?: string, tradition?: string) => Promise<unknown>;
      };
      if (typeof service.chatWithEvidencePack !== 'function') throw new Error('Evidence-aware RAG adapter is not installed');
      const answer = await service.chatWithEvidencePack(query, pack, undefined, tradition);
      await this.protocolTasks.complete(taskId, {
        content: [{ type: 'text', text: JSON.stringify(answer) }],
        structuredContent: answer,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'MCP task execution failed';
      await this.protocolTasks.fail(taskId, -32603, message).catch(() => undefined);
    }
  }

  private executionReceipt(value: unknown) {
    if (value === undefined) return undefined;
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BadRequestException('MCP execution receipt must be an object');
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
      changedFiles: this.stringArray(receipt.changedFiles, 'receipt.changedFiles'),
      tests: tests.map((test) => {
        if (!test || typeof test !== 'object' || Array.isArray(test)) throw new BadRequestException('MCP receipt test must be an object');
        const item = test as Record<string, unknown>;
        if (typeof item.command !== 'string' || !['passed', 'failed', 'skipped'].includes(String(item.status))) {
          throw new BadRequestException('MCP receipt test is invalid');
        }
        if (item.durationMs !== undefined && (typeof item.durationMs !== 'number' || !Number.isFinite(item.durationMs) || item.durationMs < 0)) {
          throw new BadRequestException('MCP receipt test durationMs is invalid');
        }
        return {
          command: item.command,
          status: item.status as 'passed' | 'failed' | 'skipped',
          ...(item.durationMs === undefined ? {} : { durationMs: item.durationMs }),
        };
      }),
      startedAt: receipt.startedAt,
      finishedAt: receipt.finishedAt,
      ...(receipt.artifactRefs === undefined ? {} : { artifactRefs: this.stringArray(receipt.artifactRefs, 'receipt.artifactRefs') }),
      ...(receipt.agentVersion === undefined ? {} : { agentVersion: this.string(receipt.agentVersion, 'receipt.agentVersion') }),
    };
  }

  private string(value: unknown, name: string): string {
    if (typeof value !== 'string' || !value.trim()) throw new BadRequestException(`MCP ${name} must be a non-empty string`);
    return value.trim();
  }

  private stringArray(value: unknown, name: string): string[] {
    if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) throw new BadRequestException(`MCP ${name} must be an array of strings`);
    return [...new Set(value.map((item) => (item as string).trim()).filter(Boolean))];
  }

  private enumValue(value: unknown, allowed: readonly string[], name: string): string {
    const normalized = this.string(value, name);
    if (!allowed.includes(normalized)) throw new BadRequestException(`Invalid MCP ${name}`);
    return normalized;
  }

  private error(id: string | number | null, code: number, message: string): JsonRpcResponse {
    return { jsonrpc: '2.0', id, error: { code, message } };
  }
}
