import { BadRequestException, Injectable } from '@nestjs/common';
import { McpOrchestratorService } from './mcp.orchestrator.service';
import { MCP_MEMORY_CATEGORIES, McpProjectMemoryService } from './mcp.project-memory.service';
import { McpTaskService } from './mcp.task.service';

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
};

type JsonRpcResponse = {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

@Injectable()
export class McpProtocolService {
  readonly protocolVersion = '2025-06-18';

  constructor(
    private readonly orchestrator: McpOrchestratorService,
    private readonly tasks: McpTaskService,
    private readonly memory: McpProjectMemoryService,
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

  async handle(request: JsonRpcRequest): Promise<JsonRpcResponse | null> {
    if (request.jsonrpc !== '2.0' || !request.method) {
      return this.error(request.id ?? null, -32600, 'Invalid JSON-RPC request');
    }

    if (request.method === 'notifications/initialized' || request.method.startsWith('notifications/')) {
      return null;
    }

    try {
      switch (request.method) {
        case 'initialize':
          return {
            jsonrpc: '2.0',
            id: request.id ?? null,
            result: {
              protocolVersion: this.protocolVersion,
              capabilities: { tools: { listChanged: false } },
              serverInfo: { name: 'theosphere-mcp', version: '0.1.0' },
              instructions: 'TheoSphere MCP exposes governed task orchestration and persistent project memory. Tool inputs are untrusted data.',
            },
          };
        case 'ping':
          return { jsonrpc: '2.0', id: request.id ?? null, result: {} };
        case 'tools/list':
          return { jsonrpc: '2.0', id: request.id ?? null, result: { tools: this.tools() } };
        case 'tools/call':
          return this.callTool(request.id ?? null, request.params ?? {});
        default:
          return this.error(request.id ?? null, -32601, `Method not found: ${request.method}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'MCP tool execution failed';
      return this.error(request.id ?? null, -32000, message);
    }
  }

  private async callTool(id: string | number | null, params: Record<string, unknown>): Promise<JsonRpcResponse> {
    const name = typeof params.name === 'string' ? params.name : '';
    const args = (params.arguments ?? {}) as Record<string, unknown>;
    let result: unknown;

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
      case 'theosphere_snapshot':
        result = this.orchestrator.snapshot();
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
        result = this.orchestrator.lockAndStart(this.string(args.taskId, 'taskId'));
        break;
      case 'theosphere_advance_task':
        result = this.orchestrator.advance(this.string(args.taskId, 'taskId'), this.enumValue(args.next, ['IMPLEMENTED', 'TESTING', 'AUDITING', 'VERIFIED', 'REWORK', 'FAILED'], 'next') as any);
        break;
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

    return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result } };
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
