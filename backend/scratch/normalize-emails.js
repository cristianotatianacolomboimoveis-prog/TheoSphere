/**
 * normalize-emails.js — abaixa (trim + minúsculas) os e-mails já gravados na
 * tabela "User", para casar com a nova normalização de cadastro/login.
 *
 * Só é necessário se algum e-mail existente tiver maiúsculas/espaços. Roda no
 * Mac (o sandbox não tem rede de saída para o banco).
 *
 *   node scratch/normalize-emails.js          # DRY-RUN: só mostra o que mudaria
 *   node scratch/normalize-emails.js --apply  # aplica de fato
 *
 * Segurança: antes de atualizar, detecta COLISÕES (duas contas que só diferem
 * no case, ex.: "A@x.com" e "a@x.com"). O índice único de email não deixaria a
 * atualização passar, então nesse caso o script aborta e lista os conflitos
 * para resolução manual — nunca apaga nem funde contas por conta própria.
 */
const { Pool } = require('pg');
require('dotenv').config({ quiet: true });

const APPLY = process.argv.includes('--apply');

(async () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL ?? process.env.DIRECT_URL ?? '',
  });

  try {
    // 1) Quem precisa mudar?
    const { rows: pending } = await pool.query(
      `SELECT email AS atual, lower(btrim(email)) AS normalizado
       FROM "User"
       WHERE email <> lower(btrim(email))
       ORDER BY email`,
    );

    if (pending.length === 0) {
      console.log('✅ Nada a fazer — todos os e-mails já estão normalizados.');
      return;
    }

    console.log(`${pending.length} e-mail(s) fora do padrão:`);
    for (const r of pending) {
      console.log(`  "${r.atual}"  →  "${r.normalizado}"`);
    }

    // 2) Colisões: dois registros que normalizam para o mesmo valor.
    const { rows: collisions } = await pool.query(
      `SELECT lower(btrim(email)) AS normalizado,
              count(*)::int       AS n,
              array_agg(email)    AS originais
       FROM "User"
       GROUP BY lower(btrim(email))
       HAVING count(*) > 1
       ORDER BY normalizado`,
    );

    if (collisions.length > 0) {
      console.log('\n⛔ COLISÕES — resolva manualmente antes de aplicar:');
      for (const c of collisions) {
        console.log(`  ${c.normalizado}: ${JSON.stringify(c.originais)}`);
      }
      console.log(
        '\nAbortado. Nenhuma alteração feita (duas contas normalizam para o mesmo e-mail).',
      );
      process.exitCode = 1;
      return;
    }

    if (!APPLY) {
      console.log('\n(DRY-RUN) Nenhuma alteração feita. Rode com --apply para aplicar.');
      return;
    }

    // 3) Aplica.
    const res = await pool.query(
      `UPDATE "User"
       SET email = lower(btrim(email))
       WHERE email <> lower(btrim(email))`,
    );
    console.log(`\n✅ ${res.rowCount} e-mail(s) normalizado(s).`);
  } catch (err) {
    console.error('Falhou:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
