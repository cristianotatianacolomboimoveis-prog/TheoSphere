const axios = require('axios');

async function benchmark() {
  const start = Date.now();
  const requests = 50;
  const queries = ['amor', 'fé', 'Deus', 'mundo', 'vida'];
  
  console.log(`Starting benchmark: ${requests} requests...`);
  
  const promises = Array.from({ length: requests }).map((_, i) => {
    const q = queries[i % queries.length];
    return axios.get(`http://localhost:3002/api/v1/search/verses?q=${q}`).catch(e => ({ error: e.message }));
  });

  const results = await Promise.all(promises);
  const duration = Date.now() - start;
  const errors = results.filter(r => r.error).length;

  console.log(JSON.stringify({
    totalRequests: requests,
    durationMs: duration,
    avgLatencyMs: duration / requests,
    errors: errors,
    rps: (requests / (duration / 1000)).toFixed(2)
  }, null, 2));
}

benchmark();
