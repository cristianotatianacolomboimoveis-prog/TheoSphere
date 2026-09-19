import { EventEmitter } from 'node:events';
import {
  BadRequestException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { McpAnswerController } from './mcp.answer.controller';

const KEY = 'k'.repeat(32);

class FakeResponse extends EventEmitter {
  writableEnded = false;
  written: string[] = [];
  status = jest.fn().mockReturnThis();
  setHeader = jest.fn();
  flushHeaders = jest.fn();
  write = jest.fn((chunk: string) => {
    this.written.push(chunk);
    return true;
  });
  end = jest.fn(() => {
    this.writableEnded = true;
  });
}

describe('McpAnswerController', () => {
  const pack = { items: [] };
  const setup = (
    stream?: (
      ...args: unknown[]
    ) => AsyncGenerator<{ type: string; data: unknown }>,
  ) => {
    const theology = { research: jest.fn().mockResolvedValue(pack) };
    const rag = stream ? { chatStreamWithEvidencePack: jest.fn(stream) } : {};
    const config = {
      get: (name: string) => (name === 'MCP_API_KEY' ? KEY : undefined),
    };
    const controller = new McpAnswerController(
      config as never,
      theology as never,
      rag as never,
    );
    return { controller, theology, rag };
  };
  const auth = `Bearer ${KEY}`;
  const res = () => new FakeResponse();

  it('rejects requests without the API key before doing any work', async () => {
    const { controller, theology } = setup(async function* () {
      /* unused */
    });
    await expect(
      controller.stream({ query: 'grace' }, 'Bearer wrong', res() as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(theology.research).not.toHaveBeenCalled();
  });

  it('rejects an empty query', async () => {
    const { controller } = setup(async function* () {
      /* unused */
    });
    await expect(
      controller.stream({ query: '  ' }, auth, res() as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('answers 503 (not 401) and skips retrieval when the evidence-aware adapter is missing', async () => {
    const { controller, theology } = setup();
    await expect(
      controller.stream({ query: 'grace' }, auth, res() as never),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(theology.research).not.toHaveBeenCalled();
  });

  it('streams events as SSE with the researched pack and ends the response', async () => {
    const { controller, rag } = setup(async function* () {
      yield { type: 'chunk', data: { text: 'Pela graça' } };
      yield { type: 'done', data: { tokens: 3 } };
    });
    const response = res();

    await controller.stream(
      { query: ' grace ', tradition: 'reformed' },
      auth,
      response as never,
    );

    expect(rag.chatStreamWithEvidencePack).toHaveBeenCalledWith(
      'grace',
      pack,
      undefined,
      'reformed',
    );
    expect(response.written).toEqual([
      'event: chunk\ndata: {"text":"Pela graça"}\n\n',
      'event: done\ndata: {"tokens":3}\n\n',
    ]);
    expect(response.end).toHaveBeenCalledTimes(1);
  });

  it('reports a failure that happens after headers were sent as an in-band error event and still ends', async () => {
    const { controller } = setup(async function* () {
      yield { type: 'chunk', data: { text: 'partial' } };
      throw new Error('provider exploded: secret-detail');
    });
    const response = res();

    await expect(
      controller.stream({ query: 'grace' }, auth, response as never),
    ).resolves.toBeUndefined();

    expect(response.written.at(-1)).toBe(
      'event: error\ndata: {"message":"Answer stream failed"}\n\n',
    );
    expect(response.written.join('')).not.toContain('secret-detail');
    expect(response.end).toHaveBeenCalledTimes(1);
  });

  it('stops consuming the generator once the client disconnects', async () => {
    let produced = 0;
    const { controller } = setup(async function* () {
      // Finite so a regression fails the assertion instead of hanging the run.
      while (produced < 50) {
        produced += 1;
        yield { type: 'chunk', data: { n: produced } };
      }
    });
    const response = res();
    response.write.mockImplementation((chunk: string) => {
      response.written.push(chunk);
      if (response.written.length === 2) response.emit('close');
      return true;
    });

    await controller.stream({ query: 'grace' }, auth, response as never);

    expect(produced).toBeLessThanOrEqual(3);
    expect(response.end).toHaveBeenCalledTimes(1);
  });
});
