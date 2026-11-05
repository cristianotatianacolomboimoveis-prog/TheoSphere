/**
 * medir-tamanho-banco.js — Consulta de Somente Leitura (T0.3)
 * Mede o tamanho exato ocupado por tabelas e índices no Postgres/Supabase.
 */

const { Pool } = require('pg');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL não configurada.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });

  try {
    console.log('=== TAMANHO TOTAL DO BANCO DE DADOS ===');
    const dbSize = await pool.query(`
      SELECT pg_size_pretty(pg_database_size(current_database())) as total_size,
             pg_database_size(current_database()) as total_bytes;
    `);
    console.log(`Tamanho Total: ${dbSize.rows[0].total_size} (${dbSize.rows[0].total_bytes} bytes)`);

    console.log('\n=== TOP 15 RELAÇÕES (TABELAS + ÍNDICES) ===');
    const tableSizes = await pool.query(`
      SELECT 
        c.relname as relation_name,
        CASE c.relkind 
          WHEN 'r' THEN 'Tabela' 
          WHEN 'i' THEN 'Índice' 
          ELSE c.relkind::text 
        END as kind,
        pg_size_pretty(pg_total_relation_size(c.oid)) as total_size,
        pg_total_relation_size(c.oid) as total_bytes,
        pg_size_pretty(pg_relation_size(c.oid)) as table_only_size,
        pg_size_pretty(pg_total_relation_size(c.oid) - pg_relation_size(c.oid)) as index_size
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r')
      ORDER BY pg_total_relation_size(c.oid) DESC
      LIMIT 15;
    `);

    console.table(tableSizes.rows.map(r => ({
      Tabela: r.relation_name,
      'Tam. Total': r.total_size,
      'Apenas Dados': r.table_only_size,
      'Apenas Índices': r.index_size,
      'Bytes': Number(r.total_bytes)
    })));

    console.log('\n=== ÍNDICES VETORIAIS / MAIORES ÍNDICES ===');
    const indexSizes = await pool.query(`
      SELECT 
        c.relname as index_name,
        t.relname as table_name,
        pg_size_pretty(pg_relation_size(c.oid)) as index_size,
        pg_relation_size(c.oid) as bytes
      FROM pg_class c
      JOIN pg_index i ON i.indexrelid = c.oid
      JOIN pg_class t ON t.oid = i.indrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
      ORDER BY pg_relation_size(c.oid) DESC
      LIMIT 15;
    `);

    console.table(indexSizes.rows.map(r => ({
      Índice: r.index_name,
      Tabela: r.table_name,
      Tamanho: r.index_size,
      Bytes: Number(r.bytes)
    })));

    console.log('\n=== VERSÃO DO PGVECTOR ===');
    const pgvectorVersion = await pool.query(`
      SELECT extname, extversion 
      FROM pg_extension 
      WHERE extname = 'vector';
    `);
    console.log('Extensão pgvector:', pgvectorVersion.rows);

  } catch (err) {
    console.error('Erro na medição:', err.message);
  } finally {
    await pool.end();
  }
}

main();
