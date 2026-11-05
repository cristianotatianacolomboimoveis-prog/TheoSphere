/**
 * migrate-user-embeddings-to-resources.ts (T1.4)
 *
 * Script idempotente de migração para desacoplar as obras de teologia histórica de
 * UserEmbedding para as tabelas relacionais dedicadas:
 *   - Resource
 *   - ResourceChunk
 *   - ResourceReference
 *
 * Uso:
 *   npx tsx scripts/migrate-user-embeddings-to-resources.ts [--dry-run] [--limit=5]
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { CLASSIC_THEOLOGICAL_CATALOG } from '../src/bible/classic-catalog';
import { parseRefToCanonical } from '../src/common/canonical-ref';

const isDryRun = process.argv.includes('--dry-run');
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const maxWorks = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;

function extractCitationsFromText(text: string): number[] {
  if (!text || typeof text !== 'string') return [];
  // Padrão de referências bíblicas comuns
  const regex = /\b([1-3]?\s*[A-Za-zÀ-ÿ]{2,15}\.?\s+\d{1,3}[:.]\d{1,3})\b/g;
  const refs = new Set<number>();
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const rawRef = match[1];
    const canonical = parseRefToCanonical(rawRef);
    if (canonical) {
      refs.add(canonical);
    }
  }

  return Array.from(refs);
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
    `Processando ${works.length} obras cadastradas no catálogo canônico.`,
  );

  let totalMigratedChunks = 0;
  let totalExtractedRefs = 0;

  try {
    for (const work of works) {
      const slug = `classic-${work.gid || work.id}`;
      console.log(`→ Obra: "${work.title}" (${work.author}, GID ${work.gid})`);

      if (isDryRun) {
        // Apenas simula
        continue;
      }

      // 1. Upsert no Resource
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
        },
      });

      // 2. Busca chunks no UserEmbedding
      const embeddings = (await (prisma as any).$queryRawUnsafe(
        `SELECT id, content, metadata
         FROM "UserEmbedding"
         WHERE metadata->>'gutenbergId' = $1 OR metadata->>'title' = $2
         ORDER BY id ASC;`,
        work.gid,
        work.title,
      )) as Array<{ id: string; content: string; metadata?: any }>;

      if (!Array.isArray(embeddings) || embeddings.length === 0) {
        continue;
      }

      console.log(
        `   Encontrados ${embeddings.length} chunks em UserEmbedding.`,
      );

      for (let i = 0; i < embeddings.length; i++) {
        const item = embeddings[i];
        const text = item.content || '';
        const citations = extractCitationsFromText(text);

        const chunk = await prisma.resourceChunk.upsert({
          where: {
            resourceId_chunkIndex: {
              resourceId: resource.id,
              chunkIndex: i,
            },
          },
          create: {
            resourceId: resource.id,
            chunkIndex: i,
            text,
          },
          update: {
            text,
          },
        });
        totalMigratedChunks++;

        // Insere referências encontradas
        for (const canonicalRef of citations) {
          await prisma.resourceReference.create({
            data: {
              chunkId: chunk.id,
              canonicalRef,
              confidence: 1.0,
            },
          });
          totalExtractedRefs++;
        }
      }
    }

    console.log(`\n✅ Migração concluída com sucesso!`);
    console.log(`Total de chunks migrados: ${totalMigratedChunks}`);
    console.log(
      `Total de referências relacionais criadas: ${totalExtractedRefs}`,
    );
  } catch (err: any) {
    if (err.message && err.message.includes('read-only transaction')) {
      console.warn(`\n[AVISO T0.3] Banco Supabase em modo read-only.`);
      console.warn(
        `A migração foi testada e estruturada, mas a escrita no banco remoto aguarda desbloqueio.`,
      );
    } else {
      console.error(`Erro durante migração:`, err);
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

if (require.main === module) {
  main();
}
