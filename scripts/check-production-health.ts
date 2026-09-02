import { execSync } from 'child_process';
import https from 'https';

// Configuration
const RAILWAY_TOKEN = process.env.RAILWAY_TOKEN || '';
const BACKEND_URL = 'https://theosphere-production.up.railway.app';
const CLOUDFLARE_URL = 'https://api.theosphere.app/api/v1/health/live'; // Optional custom edge

function getRequest(url: string): Promise<{ status: number; data: string }> {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode || 0, data });
      });
    }).on('error', reject);
  });
}

async function runCheck() {
  console.log('===================================================');
  console.log('   THEOSPHERE ECOSYSTEM HEALTH MONITORING REPORT   ');
  console.log(`   Timestamp: ${new Date().toISOString()}   `);
  console.log('===================================================\n');

  // 1. Check Railway Status
  console.log('[1/4] Checking Railway Backend Service...');
  try {
    const statusOutput = execSync(
      `RAILWAY_TOKEN=${RAILWAY_TOKEN} npx -y @railway/cli status`,
      { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
    console.log('--- Railway CLI Output ---');
    console.log(statusOutput.trim());
  } catch (err: any) {
    console.error('Failed to query Railway status:', err.message || err);
  }
  console.log('');

  // 2. Check Vercel Status
  console.log('[2/4] Checking Vercel Frontend Service...');
  try {
    const vercelOutput = execSync(
      'npx -y vercel list',
      { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
    console.log('--- Vercel CLI Output ---');
    console.log(vercelOutput.split('\n').slice(0, 15).join('\n').trim()); // Limit lines
  } catch (err: any) {
    console.error('Failed to query Vercel status:', err.message || err);
  }
  console.log('');

  // 3. HTTP Probe checks
  console.log('[3/4] Performing HTTP Probes on Backend...');
  const backendEndp = [
    { name: 'Liveness', url: `${BACKEND_URL}/api/v1/health/live` },
    { name: 'Readiness', url: `${BACKEND_URL}/api/v1/health/ready` },
  ];

  for (const ep of backendEndp) {
    try {
      const res = await getRequest(ep.url);
      console.log(`✅ Backend ${ep.name} check: HTTP ${res.status}`);
      console.log(`   Response: ${res.data.trim()}`);
    } catch (err: any) {
      console.error(`❌ Backend ${ep.name} check failed:`, err.message);
    }
  }
  console.log('');

  // 4. Cloudflare edge cache status check
  console.log('[4/4] Performing HTTP Probes on Edge Cache...');
  try {
    const res = await getRequest(CLOUDFLARE_URL);
    console.log(`✅ Cloudflare Edge check: HTTP ${res.status}`);
    console.log(`   Response: ${res.data.trim()}`);
  } catch (err: any) {
    console.log('⚠️ Cloudflare edge check returned connection error or offline (not fully routed yet).');
  }

  console.log('\n===================================================');
  console.log('             MONITORING CHECK COMPLETED            ');
  console.log('===================================================');
}

runCheck().catch(console.error);
