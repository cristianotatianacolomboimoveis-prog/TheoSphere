/**
 * migrate-user-embeddings-to-resources.ts (T1.4)
 *
 * Script idempotente de migração para desacoplar as obras de teologia histórica de
 * UserEmbedding para as tabelas relacionais dedicadas:
 *   - Resource
 *   - ResourceChunk (com startRef, endRef e cópia direta do vetor 768d já pago)
 *   - ResourceReference (com canonicalRef, startRef, endRef, kind: 'heading' | 'inline')
 *
 * Uso:
 *   npx tsx scripts/migrate-user-embeddings-to-resources.ts [--dry-run] [--limit=5]
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { CLASSIC_THEOLOGICAL_CATALOG } from '../src/bible/classic-catalog';
import {
  extractStructuredReferences,
  HeadingContext,
  inferBookIdFromWorkTitle,
} from '../src/resources/reference-extractor';

const isDryRun = process.argv.includes('--dry-run');
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const maxWorks = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;

function buildWorkSlug(
  work: (typeof CLASSIC_THEOLOGICAL_CATALOG)[number],
  seenSlugs: Set<string>,
): string {
  if (work.gid === '90001' && work.title === 'Commentary on the Whole Bible') {
    const indexSlug = 'classic-90001-index';
    seenSlugs.add(indexSlug);
    return indexSlug;
  }
  const baseSlug = `classic-${work.gid || work.id}`;
  if (!seenSlugs.has(baseSlug)) {
    seenSlugs.add(baseSlug);
    return baseSlug;
  }
  const suffix = work.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
  const uniqueSlug = `${baseSlug}-${suffix}`;
  seenSlugs.add(uniqueSlug);
  return uniqueSlug;
}

async function main() {
  const connectionString =
    process.env.DIRECT_URL ||
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/theosphere';

  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log(`[T1.4 Migração] Iniciando migração de recursos teológicos...`);
  console.log(
    `Modo: ${isDryRun ? 'DRY-RUN (somente leitura)' : 'ESCRITA EFETIVA'}`,
  );

  const works = maxWorks
    ? CLASSIC_THEOLOGICAL_CATALOG.slice(0, maxWorks)
    : CLASSIC_THEOLOGICAL_CATALOG;

  console.log(
    `Processando ${works.length} entradas cadastradas no catálogo canônico.`,
  );

  let totalMigratedWorks = 0;
  let totalMigratedChunks = 0;
  let totalWithEmbeddings = 0;
  let totalExtractedRefs = 0;
  let totalHeadingRefs = 0;
  let totalInlineRefs = 0;

  const seenSlugs = new Set<string>();

  try {
    for (const work of works) {
      const slug = buildWorkSlug(work, seenSlugs);

      const rows = (await (prisma as any).$queryRawUnsafe(
        `SELECT id, content, (embedding IS NOT NULL) AS "hasEmbedding"
         FROM "UserEmbedding"
         WHERE type = 'book_chunk'
           AND metadata->>'gutenbergId' = $1
           AND metadata->>'title' = $2
         ORDER BY (metadata->>'chunkIndex')::int NULLS LAST, "createdAt" ASC, id ASC;`,
        work.gid,
        work.title,
      )) as Array<{ id: string; content: string; hasEmbedding: boolean }>;

      if (!Array.isArray(rows) || rows.length === 0) {
        continue;
      }

      totalMigratedWorks++;
      const isCommentary = work.category === 'comentarios';
      let runningContext: HeadingContext = isCommentary
        ? { bookId: inferBookIdFromWorkTitle(work.title) }
        : {};

      const processedChunks = rows.map((r, idx) => {
        const text = r.content || '';
        const chunkInputContext = isCommentary ? runningContext : {};
        const { references, updatedContext } = extractStructuredReferences(
          text,
          chunkInputContext,
        );
        if (isCommentary) {
          runningContext = updatedContext;
        }

        const allRefs = [...references];
        // Se a obra é um comentário bíblico e o chunk está sob um cabeçalho de seção de versículos
        // (ex.: "ver. 1-21" ou "John 3:13-18") de amplitude <= 176 versículos, propaga esse intervalo como kind='heading'
        if (
          isCommentary &&
          runningContext.startRef &&
          runningContext.endRef &&
          runningContext.endRef - runningContext.startRef <= 176 &&
          !allRefs.some(
            (ref) =>
              ref.startRef === runningContext.startRef &&
              ref.endRef === runningContext.endRef,
          )
        ) {
          allRefs.unshift({
            canonicalRef: runningContext.startRef,
            startRef: runningContext.startRef,
            endRef: runningContext.endRef,
            kind: 'heading',
            confidence: 0.9,
            raw: 'section-heading-context',
          });
        }

        return {
          ueId: r.id,
          chunkIndex: idx,
          text,
          hasEmbedding: r.hasEmbedding,
          startRef: isCommentary ? (runningContext.startRef ?? null) : null,
          endRef: isCommentary ? (runningContext.endRef ?? null) : null,
          references: allRefs,
        };
      });

      const workRefs = processedChunks.reduce(
        (sum, c) => sum + c.references.length,
        0,
      );
      const workHeadings = processedChunks.reduce(
        (sum, c) =>
          sum + c.references.filter((x) => x.kind === 'heading').length,
        0,
      );
      const workInlines = workRefs - workHeadings;
      const withEmb = processedChunks.filter((c) => c.hasEmbedding).length;

      totalMigratedChunks += processedChunks.length;
      totalWithEmbeddings += withEmb;
      totalExtractedRefs += workRefs;
      totalHeadingRefs += workHeadings;
      totalInlineRefs += workInlines;

      if (isDryRun) {
        console.log(
          `   [dry-run] "${work.title}" (GID ${work.gid}, slug ${slug}): ${processedChunks.length} chunks (${withEmb} c/ emb), ${workRefs} refs (${workHeadings} heading, ${workInlines} inline)`,
        );
        continue;
      }

      console.log(
        `→ Migrando "${work.title}" (GID ${work.gid}, slug ${slug}): ${processedChunks.length} chunks, ${workRefs} refs...`,
      );

      const yearInt = parseInt(work.year, 10);
      const resource = await prisma.resource.upsert({
        where: { slug },
        create: {
          slug,
          title: work.title,
          author: work.author,
          year: isNaN(yearInt) ? null : yearInt,
          language: work.language,
          license: 'Domínio Público',
          isPublicDomain: true,
          metadata: {
            tradition: work.tradition,
            category: work.category,
            readUrl: work.readUrl,
            gid: work.gid,
          },
        },
        update: {
          title: work.title,
          author: work.author,
          metadata: {
            tradition: work.tradition,
            category: work.category,
            readUrl: work.readUrl,
            gid: work.gid,
          },
        },
      });

      // Upsert ResourceChunk em lotes de 200 linhas e copia o vetor diretamente de UserEmbedding
      const CHUNK_BATCH = 200;
      const chunkIdByIndex = new Map<number, string>();

      for (let b = 0; b < processedChunks.length; b += CHUNK_BATCH) {
        const slice = processedChunks.slice(b, b + CHUNK_BATCH);
        const valuesSql: string[] = [];
        const params: any[] = [];
        let pIdx = 1;

        for (const item of slice) {
          valuesSql.push(
            `(gen_random_uuid()::text, $${pIdx++}, $${pIdx++}::int, $${pIdx++}, $${pIdx++}::int, $${pIdx++}::int, NOW())`,
          );
          params.push(
            resource.id,
            item.chunkIndex,
            item.text,
            item.startRef,
            item.endRef,
          );
        }

        const inserted = (await (prisma as any).$queryRawUnsafe(
          `INSERT INTO "ResourceChunk" ("id", "resourceId", "chunkIndex", "text", "startRef", "endRef", "createdAt")
           VALUES ${valuesSql.join(', ')}
           ON CONFLICT ("resourceId", "chunkIndex") DO UPDATE
             SET "text" = EXCLUDED."text",
                 "startRef" = EXCLUDED."startRef",
                 "endRef" = EXCLUDED."endRef"
           RETURNING "id", "chunkIndex";`,
          ...params,
        )) as Array<{ id: string; chunkIndex: number }>;

        for (const row of inserted) {
          chunkIdByIndex.set(Number(row.chunkIndex), row.id);
        }

        // Copia os vetores de UserEmbedding em uma única query por lote (0 custo de API)
        const mapValues: string[] = [];
        const mapParams: any[] = [];
        let mpIdx = 1;
        for (const item of slice) {
          const rcId = chunkIdByIndex.get(item.chunkIndex);
          if (rcId) {
            mapValues.push(`($${mpIdx++}::text, $${mpIdx++}::text)`);
            mapParams.push(rcId, item.ueId);
          }
        }

        if (mapValues.length > 0) {
          await (prisma as any).$executeRawUnsafe(
            `UPDATE "ResourceChunk" AS rc
                SET embedding = ue.embedding
               FROM (VALUES ${mapValues.join(', ')}) AS m(rc_id, ue_id)
               JOIN "UserEmbedding" AS ue ON ue.id = m.ue_id
              WHERE rc.id = m.rc_id AND ue.embedding IS NOT NULL;`,
            ...mapParams,
          );
        }
      }

      // Substitui as referências da obra de forma idempotente em lotes
      await (prisma as any).$executeRawUnsafe(
        `DELETE FROM "ResourceReference"
          WHERE "chunkId" IN (SELECT id FROM "ResourceChunk" WHERE "resourceId" = $1);`,
        resource.id,
      );

      const allRefRows: Array<{
        chunkId: string;
        canonicalRef: number;
        startRef: number;
        endRef: number;
        kind: string;
        confidence: number;
      }> = [];

      for (const item of processedChunks) {
        const chunkId = chunkIdByIndex.get(item.chunkIndex);
        if (!chunkId) continue;
        for (const ref of item.references) {
          allRefRows.push({
            chunkId,
            canonicalRef: ref.canonicalRef,
            startRef: ref.startRef,
            endRef: ref.endRef,
            kind: ref.kind,
            confidence: ref.confidence,
          });
        }
      }

      const REF_BATCH = 1000;
      for (let r = 0; r < allRefRows.length; r += REF_BATCH) {
        await prisma.resourceReference.createMany({
          data: allRefRows.slice(r, r + REF_BATCH),
        });
      }
    }

    console.log(`\n✅ Processamento concluído com sucesso!`);
    console.log(`Obras com trechos processadas: ${totalMigratedWorks}`);
    console.log(
      `Total de chunks processados: ${totalMigratedChunks} (${totalWithEmbeddings} com embedding)`,
    );
    console.log(
      `Total de referências extraídas: ${totalExtractedRefs} (heading: ${totalHeadingRefs}, inline: ${totalInlineRefs})`,
    );
  } catch (err: any) {
    console.error(`Erro durante migração:`, err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

if (require.main === module) {
  main();
}
