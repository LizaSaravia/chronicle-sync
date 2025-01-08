import { SCHEMA, DEVICES_SCHEMA } from "./schema.js";

// CORS headers for all responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders,
      });
    }
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // Skip schema initialization for health check
      if (path !== "/health") {
        // Initialize database if needed
        await env.DB.exec(SCHEMA);
        await env.DB.exec(DEVICES_SCHEMA);
      }

      if (request.method === "POST") {
        if (path === "/api/sync") {
          return await handleSync(request, env);
        }
        if (path === "/api/create-group") {
          return await createSyncGroup(request, env);
        }
      }

      if (request.method === "GET") {
        if (path === "/api/get-updates") {
          return await getUpdates(request, env);
        }
        if (path === "/health") {
          return await checkHealth(env);
        }
      }

      if (request.method === "POST") {
        if (path === "/api/report-error") {
          return await reportError(request, env);
        }
      }

      return new Response("Not Found", {
        status: 404,
        headers: corsHeaders,
      });
    } catch (error) {
      console.error("Error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};

async function createSyncGroup(request, env) {
  const { deviceId } = await request.json();
  const groupId = crypto.randomUUID();
  const timestamp = Date.now();

  // Create sync group in D1
  await env.DB.prepare(
    "INSERT INTO sync_groups (id, created_at, last_updated) VALUES (?, ?, ?)",
  )
    .bind(groupId, timestamp, timestamp)
    .run();

  // Add device to group
  await env.DB.prepare(
    "INSERT INTO devices (id, sync_group_id, last_sync) VALUES (?, ?, ?)",
  )
    .bind(deviceId, groupId, timestamp)
    .run();

  return new Response(JSON.stringify({ groupId }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleSync(request, env) {
  const { groupId, deviceId, data, timestamp } = await request.json();

  // Validate group and device
  const group = await env.DB.prepare("SELECT * FROM sync_groups WHERE id = ?")
    .bind(groupId)
    .first();

  if (!group) {
    return new Response(JSON.stringify({ error: "Group not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Store encrypted data in R2
  const key = `${groupId}/${timestamp}.json`;
  await env.SYNC_BUCKET.put(key, JSON.stringify(data));

  // Update KV with latest sync info
  await env.SYNC_KV.put(`${groupId}:latest`, timestamp.toString());

  // Update device sync time in D1
  await env.DB.prepare(
    "INSERT OR REPLACE INTO devices (id, sync_group_id, last_sync) VALUES (?, ?, ?)",
  )
    .bind(deviceId, groupId, timestamp)
    .run();

  // Update group last_updated time
  await env.DB.prepare("UPDATE sync_groups SET last_updated = ? WHERE id = ?")
    .bind(timestamp, groupId)
    .run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getUpdates(request, env) {
  const url = new URL(request.url);
  const groupId = url.searchParams.get("groupId");
  const deviceId = url.searchParams.get("deviceId");
  const since = parseInt(url.searchParams.get("since") || "0");

  // Get device's sync group
  const device = await env.DB.prepare(
    "SELECT * FROM devices WHERE id = ? AND sync_group_id = ?",
  )
    .bind(deviceId, groupId)
    .first();

  if (!device) {
    return new Response(
      JSON.stringify({ error: "Device not found in group" }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  // Get latest sync timestamp from KV
  const latestSync = await env.SYNC_KV.get(`${groupId}:latest`);
  if (!latestSync || parseInt(latestSync) <= since) {
    return new Response(JSON.stringify({ updates: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // List objects from R2 after the 'since' timestamp
  const objects = await env.SYNC_BUCKET.list({
    prefix: `${groupId}/`,
    cursor: `${groupId}/${since}`,
  });

  // Get all updates
  const updates = await Promise.all(
    objects.objects
      .filter((obj) => parseInt(obj.key.split("/")[1]) > since)
      .map(async (obj) => {
        const data = await env.SYNC_BUCKET.get(obj.key);
        return JSON.parse(await data.text());
      }),
  );

  return new Response(JSON.stringify({ updates }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function reportError(request, env) {
  try {
    const errorDetails = await request.json();
    const webhookUrl = env.DISCORD_WEBHOOK_URL;

    if (!webhookUrl) {
      throw new Error("Discord webhook URL not configured");
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: "🐛 Chronicle Sync Error Report",
        embeds: [
          {
            title: "Error Details",
            description: `\`\`\`\n${errorDetails.message}\n\`\`\``,
            fields: [
              {
                name: "Stack Trace",
                value: `\`\`\`\n${errorDetails.stack?.substring(0, 1000) || "No stack trace"}\n\`\`\``,
              },
              {
                name: "Context",
                value: `\`\`\`json\n${JSON.stringify(errorDetails.context, null, 2)}\n\`\`\``,
              },
              {
                name: "Runtime Context",
                value: errorDetails.runtime,
                inline: true,
              },
              {
                name: "Extension Version",
                value: errorDetails.extensionVersion,
                inline: true,
              },
              {
                name: "Timestamp",
                value: errorDetails.timestamp,
                inline: true,
              },
            ],
            color: 0xff0000,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send error to Discord: ${await response.text()}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error reporting failed:", error);
    return new Response(
      JSON.stringify({ error: "Failed to report error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
}

async function checkHealth(env) {
  const services = {};
  const errors = [];

  try {
    // Check D1 Database
    await env.DB.prepare("SELECT 1 AS health_check").first();
    services.db = "ok";
  } catch (error) {
    services.db = "error";
    errors.push(`DB error: ${error.message}`);
  }

  try {
    // Check KV
    const testKey = "health-check";
    await env.SYNC_KV.put(testKey, "test");
    await env.SYNC_KV.delete(testKey);
    services.kv = "ok";
  } catch (error) {
    services.kv = "error";
    errors.push(`KV error: ${error.message}`);
  }

  try {
    // Check R2
    const testKey = "health-check";
    await env.SYNC_BUCKET.put(testKey, "test");
    await env.SYNC_BUCKET.delete(testKey);
    services.r2 = "ok";
  } catch (error) {
    services.r2 = "error";
    errors.push(`R2 error: ${error.message}`);
  }

  const allServicesOk = Object.values(services).every((status) => status === "ok");
  const response = {
    status: allServicesOk ? "healthy" : "unhealthy",
    services,
    environment: env.ENVIRONMENT,
  };

  if (errors.length > 0) {
    response.errors = errors;
  }

  return new Response(JSON.stringify(response, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: allServicesOk ? 200 : 500,
  });
}