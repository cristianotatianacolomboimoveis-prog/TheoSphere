import { ConfigService } from '@nestjs/config';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { McpExecutionController } from './mcp.execution.controller';

describe('McpExecutionController', () => {
  const config = { get: jest.fn(() => 'x'.repeat(32)) } as unknown as ConfigService;

  it('rejects invalid agent authorization', async () => {
    const autonomy = { renewLocks: jest.fn() } as any;
    const controller = new McpExecutionController(config, autonomy);
    await expect(controller.heartbeat('agent-1', 'TSK-1', 'Bearer wrong')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('renews task locks through the governed autonomy service', async () => {
    const autonomy = {
      renewLocks: jest.fn(async () => ({ taskId: 'TSK-1', renewed: 2, ttlMs: 7_200_000 })),
    } as any;
    const controller = new McpExecutionController(config, autonomy);
    await expect(
      controller.heartbeat('agent-1', 'TSK-1', 'Bearer ' + 'x'.repeat(32)),
    ).resolves.toEqual({ taskId: 'TSK-1', renewed: 2, ttlMs: 7_200_000 });
    expect(autonomy.renewLocks).toHaveBeenCalledWith('TSK-1', 'agent-1');
  });

  it('passes a structured receipt into the worker result pipeline', async () => {
    const autonomy = {
      recordResult: jest.fn(async () => ({ taskId: 'TSK-1', status: 'AUDITING' })),
    } as any;
    const controller = new McpExecutionController(config, autonomy);
    const receipt = {
      commitSha: 'abc1234',
      changedFiles: ['src/a.ts'],
      tests: [{ command: 'npm test -- mcp', status: 'passed' }],
      startedAt: '2026-09-18T02:00:00.000Z',
      finishedAt: '2026-09-18T02:01:00.000Z',
    };

    await controller.recordResult(
      'agent-1',
      'TSK-1',
      { success: true, receipt },
      'Bearer ' + 'x'.repeat(32),
    );

    expect(autonomy.recordResult).toHaveBeenCalledWith(
      'TSK-1',
      'agent-1',
      true,
      undefined,
      receipt,
    );
  });

  it('rejects a result without a boolean success flag', async () => {
    const autonomy = { recordResult: jest.fn() } as any;
    const controller = new McpExecutionController(config, autonomy);
    await expect(
      controller.recordResult(
        'agent-1',
        'TSK-1',
        { summary: 'done' },
        'Bearer ' + 'x'.repeat(32),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(autonomy.recordResult).not.toHaveBeenCalled();
  });
});
