const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

// Metrics storage
let metrics = {
  apiCalls: {
    sync: 0,
    createGroup: 0,
    getUpdates: 0,
    health: 0,
    metrics: 0
  },
  errors: {
    sync: 0,
    createGroup: 0,
    getUpdates: 0,
    health: 0,
    metrics: 0
  }
};

async function handleHealthCheck(env) {
  try {
    metrics.apiCalls.health++;
    
    // Test D1
    const dbTest = await env.DB.prepare("SELECT 1").first();
    if (!dbTest) throw new Error("D1 test failed");

    // Test KV
    const testKey = "health-check-key";
    await env.SYNC_KV.put(testKey, "test");
    const kvValue = await env.SYNC_KV.get(testKey);
    if (kvValue !== "test") throw new Error("KV test failed");
    await env.SYNC_KV.delete(testKey);

    // Test R2
    const testFile = "health-check.txt";
    await env.SYNC_BUCKET.put(testFile, "test");
    const r2Object = await env.SYNC_BUCKET.get(testFile);
    const r2Value = await r2Object.text();
    if (r2Value !== "test") throw new Error("R2 test failed");
    await env.SYNC_BUCKET.delete(testFile);

    return new Response(JSON.stringify({
      status: "healthy",
      services: {
        d1: "ok",
        kv: "ok",
        r2: "ok"
      }
    }), {
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    metrics.errors.health++;
    return new Response(JSON.stringify({
      status: "unhealthy",
      error: error.message
    }), {
      status: 500,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json'
      }
    });
  }
}

async function handleMetrics() {
  metrics.apiCalls.metrics++;
  return new Response(JSON.stringify(metrics), {
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json'
    }
  });
}

async function handleSync(request, env) {
  try {
    metrics.apiCalls.sync++;
    const { groupId, deviceId, data, timestamp } = await request.json();

    const group = await env.DB.prepare("SELECT * FROM sync_groups WHERE id = ?")
      .bind(groupId)
      .first();

    if (!group) {
      metrics.errors.sync++;
      return new Response(JSON.stringify({ error: "Group not found" }), {
        status: 404,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    const key = `${groupId}/${timestamp}.json`;
    await env.SYNC_BUCKET.put(key, JSON.stringify(data));
    await env.SYNC_KV.put(`${groupId}:latest`, timestamp.toString());

    await env.DB.prepare(
      "INSERT OR REPLACE INTO devices (id, sync_group_id, last_sync) VALUES (?, ?, ?)"
    ).bind(deviceId, groupId, timestamp).run();

    await env.DB.prepare(
      "UPDATE sync_groups SET last_updated = ? WHERE id = ?"
    ).bind(timestamp, groupId).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    metrics.errors.sync++;
    throw error;
  }
}

async function handleCreateGroup(request, env) {
  try {
    metrics.apiCalls.createGroup++;
    const { deviceId } = await request.json();
    const groupId = crypto.randomUUID();
    const timestamp = Date.now();

    await env.DB.prepare(
      "INSERT INTO sync_groups (id, created_at, last_updated) VALUES (?, ?, ?)"
    ).bind(groupId, timestamp, timestamp).run();

    await env.DB.prepare(
      "INSERT INTO devices (id, sync_group_id, last_sync) VALUES (?, ?, ?)"
    ).bind(deviceId, groupId, timestamp).run();

    return new Response(JSON.stringify({ groupId }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    metrics.errors.createGroup++;
    throw error;
  }
}

async function handleGetUpdates(request, env) {
  try {
    metrics.apiCalls.getUpdates++;
    const url = new URL(request.url);
    const groupId = url.searchParams.get('groupId');
    const deviceId = url.searchParams.get('deviceId');
    const since = parseInt(url.searchParams.get('since') || '0');

    const device = await env.DB.prepare(
      "SELECT * FROM devices WHERE id = ? AND sync_group_id = ?"
    ).bind(deviceId, groupId).first();

    if (!device) {
      metrics.errors.getUpdates++;
      return new Response(JSON.stringify({ error: "Device not found in group" }), {
        status: 404,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    const latestTimestamp = await env.SYNC_KV.get(`${groupId}:latest`);
    if (!latestTimestamp || parseInt(latestTimestamp) <= since) {
      return new Response(JSON.stringify({ updates: [] }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }

    const objects = await env.SYNC_BUCKET.list({
      prefix: `${groupId}/`,
      cursor: `${groupId}/${since}`
    });

    const updates = [];
    for (const obj of objects.objects) {
      try {
        // Skip objects that are older than the requested timestamp
        const timestamp = parseInt(obj.key.split('/')[1]);
        if (isNaN(timestamp) || timestamp <= since) continue;

        const response = await env.SYNC_BUCKET.get(obj.key);
        if (!response) {
          console.error(`Failed to get object ${obj.key}: Response was null`);
          continue;
        }

        const text = await response.text();
        if (!text) {
          console.error(`Failed to get text from object ${obj.key}: Text was empty`);
          continue;
        }

        try {
          const data = JSON.parse(text);
          updates.push(data);
        } catch (parseError) {
          console.error(`Failed to parse JSON from object ${obj.key}:`, parseError);
          continue;
        }
      } catch (error) {
        console.error(`Failed to process object ${obj.key}:`, error);
        continue;
      }
    }

    return new Response(JSON.stringify({ updates }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    metrics.errors.getUpdates++;
    throw error;
  }
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      await env.DB.exec(`
        CREATE TABLE IF NOT EXISTS sync_groups (
          id TEXT PRIMARY KEY,
          created_at INTEGER NOT NULL,
          last_updated INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS devices (
          id TEXT PRIMARY KEY,
          sync_group_id TEXT NOT NULL,
          last_sync INTEGER NOT NULL,
          FOREIGN KEY(sync_group_id) REFERENCES sync_groups(id)
        );
      `);

      const url = new URL(request.url);
      const path = url.pathname;

      if (path === '/health') {
        return await handleHealthCheck(env);
      }

      if (path === '/metrics') {
        return await handleMetrics();
      }

      if (request.method === 'POST') {
        if (path === '/api/sync') {
          return await handleSync(request, env);
        }
        if (path === '/api/create-group') {
          return await handleCreateGroup(request, env);
        }
      }

      if (request.method === 'GET' && path === '/api/get-updates') {
        return await handleGetUpdates(request, env);
      }

      return new Response('Not Found', {
        status: 404,
        headers: CORS_HEADERS
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
      });
    }
  }
};