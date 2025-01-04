// Schema for D1 database
const SCHEMA = `
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
`;

export default {
  async fetch(request, env, ctx) {
    // Enable CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders
      });
    }
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      
      // Initialize database if needed
      await env.DB.exec(SCHEMA);

      if (request.method === 'POST') {
        if (path === '/api/sync') {
          return await handleSync(request, env);
        }
        if (path === '/api/create-group') {
          return await createSyncGroup(request, env);
        }
      }

      if (request.method === 'GET') {
        if (path === '/api/get-updates') {
          return await getUpdates(request, env);
        }
      }

      return new Response('Not Found', { 
        status: 404,
        headers: corsHeaders
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

async function createSyncGroup(request, env) {
  const { deviceId } = await request.json();
  const groupId = crypto.randomUUID();
  const timestamp = Date.now();

  // Create sync group in D1
  await env.DB.prepare(
    'INSERT INTO sync_groups (id, created_at, last_updated) VALUES (?, ?, ?)'
  ).bind(groupId, timestamp, timestamp).run();

  // Add device to group
  await env.DB.prepare(
    'INSERT INTO devices (id, sync_group_id, last_sync) VALUES (?, ?, ?)'
  ).bind(deviceId, groupId, timestamp).run();

  return new Response(JSON.stringify({ groupId }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleSync(request, env) {
  const { groupId, deviceId, data, timestamp } = await request.json();

  // Validate group and device
  const group = await env.DB.prepare(
    'SELECT * FROM sync_groups WHERE id = ?'
  ).bind(groupId).first();
  
  if (!group) {
    return new Response(JSON.stringify({ error: 'Group not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Store encrypted data in R2
  const key = `${groupId}/${timestamp}.json`;
  await env.SYNC_BUCKET.put(key, JSON.stringify(data));

  // Update KV with latest sync info
  await env.SYNC_KV.put(`${groupId}:latest`, timestamp.toString());

  // Update device sync time in D1
  await env.DB.prepare(
    'INSERT OR REPLACE INTO devices (id, sync_group_id, last_sync) VALUES (?, ?, ?)'
  ).bind(deviceId, groupId, timestamp).run();

  // Update group last_updated time
  await env.DB.prepare(
    'UPDATE sync_groups SET last_updated = ? WHERE id = ?'
  ).bind(timestamp, groupId).run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function getUpdates(request, env) {
  const url = new URL(request.url);
  const groupId = url.searchParams.get('groupId');
  const deviceId = url.searchParams.get('deviceId');
  const since = parseInt(url.searchParams.get('since') || '0');

  // Get device's sync group
  const device = await env.DB.prepare(
    'SELECT * FROM devices WHERE id = ? AND sync_group_id = ?'
  ).bind(deviceId, groupId).first();

  if (!device) {
    return new Response(JSON.stringify({ error: 'Device not found in group' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Get latest sync timestamp from KV
  const latestSync = await env.SYNC_KV.get(`${groupId}:latest`);
  if (!latestSync || parseInt(latestSync) <= since) {
    return new Response(JSON.stringify({ updates: [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // List objects from R2 after the 'since' timestamp
  const objects = await env.SYNC_BUCKET.list({
    prefix: `${groupId}/`,
    cursor: `${groupId}/${since}`
  });

  // Get all updates
  const updates = await Promise.all(
    objects.objects
      .filter(obj => parseInt(obj.key.split('/')[1]) > since)
      .map(async obj => {
        const data = await env.SYNC_BUCKET.get(obj.key);
        return JSON.parse(await data.text());
      })
  );

  return new Response(JSON.stringify({ updates }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}