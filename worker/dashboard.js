const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

async function handleHistory(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Create history table if it doesn't exist
    await env.DB.exec(`
      CREATE TABLE IF NOT EXISTS history (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        visit_time INTEGER NOT NULL,
        host_name TEXT NOT NULL,
        os TEXT NOT NULL,
        sync_group_id TEXT NOT NULL,
        FOREIGN KEY(sync_group_id) REFERENCES sync_groups(id)
      );
    `);

    if (path === "/api/history") {
      if (method === "GET") {
        const entries = await env.DB.prepare(
          `
          SELECT * FROM history 
          ORDER BY visit_time DESC
        `,
        ).all();

        return new Response(JSON.stringify(entries.results), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (method === "POST") {
        const { url, title, visitTime, hostName, os, syncGroupId } =
          await request.json();
        const id = crypto.randomUUID();

        await env.DB.prepare(
          `
          INSERT INTO history (id, url, title, visit_time, host_name, os, sync_group_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        )
          .bind(id, url, title, visitTime, hostName, os, syncGroupId)
          .run();

        return new Response(JSON.stringify({ id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (path.startsWith("/api/history/") && method === "PUT") {
      const id = path.split("/").pop();
      const { url, title, visitTime, hostName, os } = await request.json();

      await env.DB.prepare(
        `
        UPDATE history 
        SET url = ?, title = ?, visit_time = ?, host_name = ?, os = ?
        WHERE id = ?
      `,
      )
        .bind(url, title, visitTime, hostName, os, id)
        .run();

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Not Found", {
      status: 404,
      headers: corsHeaders,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

export default {
  async fetch(request, env) {
    return handleHistory(request, env);
  },
};
