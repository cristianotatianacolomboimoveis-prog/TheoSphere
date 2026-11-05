import { Logger } from '@nestjs/common';
import { BibleIngestionService } from './bible-ingestion.service';
import { safeFetch } from './common/http/safe-fetch';

jest.mock('./common/http/safe-fetch', () => ({ safeFetch: jest.fn() }));

/**
 * Regressão achada na revisão da Fase 1 (T1.1): com o Supabase em read-only, a
 * gravação do capítulo baixado lançava erro e o `catch` geral devolvia [],
 * descartando o texto já obtido. O NT em SBLGNT (padrão do modo grego, ainda
 * não ingerido) chegava vazio ao leitor.
 */
describe('BibleIngestionService.ingestChapter — gravação é cache, não requisito', () => {
  const upstream = [
    { verse: 1, text: 'Ἐν ἀρχῇ ἦν ὁ λόγος' },
    { verse: 2, text: 'οὗτος ἦν ἐν ἀρχῇ πρὸς τὸν θεόν.' },
  ];

  let prisma: any;
  let embedding: any;
  let events: any;
  let service: BibleIngestionService;

  beforeEach(() => {
    delete process.env.YOUVERSION_APP_KEY;
    prisma = {
      bibleVerse: { findMany: jest.fn().mockResolvedValue([]) },
      $executeRawUnsafe: jest.fn(),
      $executeRaw: jest.fn(),
    };
    embedding = { createEmbedding: jest.fn() };
    events = { publishIngestion: jest.fn() };
    service = new BibleIngestionService(prisma, embedding, events);
    (safeFetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(upstream),
    });
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('serve o capítulo baixado mesmo quando o banco recusa a escrita (read-only)', async () => {
    const readOnly = Object.assign(
      new Error('cannot execute INSERT in a read-only transaction'),
      { code: '25006' },
    );
    jest.spyOn(service as any, 'bulkUpsertVerses').mockRejectedValue(readOnly);
    const warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const triggerEmbeddings = jest
      .spyOn(service as any, 'triggerBatchEmbeddings')
      .mockResolvedValue(undefined);

    const verses = await service.ingestChapter('SBLGNT', 43, 1, true);

    expect(verses).toEqual([
      { verse: 1, text: upstream[0].text },
      { verse: 2, text: upstream[1].text },
    ]);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('servido sem persistir'),
    );
    // Não dispara embeddings de versículos que não foram gravados.
    expect(triggerEmbeddings).not.toHaveBeenCalled();
  });

  it('caminho normal: grava e devolve os versículos', async () => {
    const upsert = jest
      .spyOn(service as any, 'bulkUpsertVerses')
      .mockResolvedValue(undefined);

    const verses = await service.ingestChapter('SBLGNT', 43, 1);

    expect(upsert).toHaveBeenCalledTimes(1);
    expect(verses).toHaveLength(2);
  });

  it('falha da fonte externa continua devolvendo [] (sem inventar texto)', async () => {
    (safeFetch as jest.Mock).mockRejectedValue(new Error('ETIMEDOUT'));
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    await expect(service.ingestChapter('SBLGNT', 43, 1)).resolves.toEqual([]);
  });
});
