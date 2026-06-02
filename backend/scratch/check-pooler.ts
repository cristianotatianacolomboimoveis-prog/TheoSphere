import { Client } from 'pg';

async function check(url: string, label: string) {
  const client = new Client({ connectionString: url });
  try {
    console.log(`Connecting to ${label}...`);
    await client.connect();
    console.log(`[SUCCESS] Connected to ${label}!`);
    const res = await client.query('SELECT version();');
    console.log(`Version: ${res.rows[0].version}`);
  } catch (err: any) {
    console.error(
      `[FAILURE] Failed to connect to ${label}:`,
      err.message || err,
    );
  } finally {
    await client.end().catch(() => {});
  }
}

async function run() {
  // 1. Direct on 5432
  const urlDirect =
    'postgresql://postgres:V7CqxkJ%2F8ZVW%40MV@db.chjywahtwktqqxqlthvc.supabase.co:5432/postgres';
  await check(urlDirect, 'Direct 5432');

  // 2. Pooler on 6543
  const urlPooler =
    'postgresql://postgres:V7CqxkJ%2F8ZVW%40MV@db.chjywahtwktqqxqlthvc.supabase.co:6543/postgres';
  await check(urlPooler, 'Pooler 6543');

  // 3. Pooler on 6543 with transaction mode (postgres.[project-ref])
  const urlPoolerMode =
    'postgresql://postgres.chjywahtwktqqxqlthvc:V7CqxkJ%2F8ZVW%40MV@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';
  await check(urlPoolerMode, 'AWS Pooler 6543 (sa-east-1)');
}
run();
