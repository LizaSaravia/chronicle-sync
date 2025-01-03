import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createClient } from 'redis';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Redis client for storing sync data
const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redis.connect().catch(console.error);

interface SyncMessage {
  type: 'sync' | 'get';
  groupId: string; // Hash of the sync password
  data?: string; // Encrypted data
  timestamp: number;
}

// Store sync groups and their connected clients
const syncGroups = new Map<string, Set<WebSocket>>();

wss.on('connection', (ws) => {
  let currentGroup: string | null = null;

  ws.on('message', async (message) => {
    try {
      const msg = JSON.parse(message.toString()) as SyncMessage;
      
      if (!msg.groupId) {
        ws.send(JSON.stringify({ error: 'No groupId provided' }));
        return;
      }

      // If client changes group, remove from old group
      if (currentGroup && currentGroup !== msg.groupId) {
        const group = syncGroups.get(currentGroup);
        if (group) {
          group.delete(ws);
          if (group.size === 0) {
            syncGroups.delete(currentGroup);
          }
        }
      }

      // Add to new group
      if (!syncGroups.has(msg.groupId)) {
        syncGroups.set(msg.groupId, new Set());
      }
      syncGroups.get(msg.groupId)?.add(ws);
      currentGroup = msg.groupId;

      if (msg.type === 'sync' && msg.data) {
        // Store in Redis with TTL of 30 days
        const key = `sync:${msg.groupId}:${msg.timestamp}`;
        await redis.set(key, msg.data, {
          EX: 30 * 24 * 60 * 60 // 30 days
        });

        // Broadcast to all clients in the same group
        const group = syncGroups.get(msg.groupId);
        if (group) {
          for (const client of group) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'sync',
                data: msg.data,
                timestamp: msg.timestamp
              }));
            }
          }
        }
      }

      if (msg.type === 'get') {
        // Get all sync data for the group from the last 30 days
        const keys = await redis.keys(`sync:${msg.groupId}:*`);
        const data = await Promise.all(
          keys.map(async (key) => {
            const value = await redis.get(key);
            const timestamp = parseInt(key.split(':')[2]);
            return { data: value, timestamp };
          })
        );
        ws.send(JSON.stringify({
          type: 'history',
          items: data
        }));
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({ error: 'Invalid message format' }));
    }
  });

  ws.on('close', () => {
    if (currentGroup) {
      const group = syncGroups.get(currentGroup);
      if (group) {
        group.delete(ws);
        if (group.size === 0) {
          syncGroups.delete(currentGroup);
        }
      }
    }
  });
});

// REST API for clients that don't support WebSocket
app.use(express.json());

app.post('/api/sync', async (req, res) => {
  try {
    const { groupId, data, timestamp } = req.body;
    if (!groupId || !data) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const key = `sync:${groupId}:${timestamp}`;
    await redis.set(key, data, {
      EX: 30 * 24 * 60 * 60 // 30 days
    });

    // Notify WebSocket clients
    const group = syncGroups.get(groupId);
    if (group) {
      for (const client of group) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'sync',
            data,
            timestamp
          }));
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error processing sync:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/sync/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const keys = await redis.keys(`sync:${groupId}:*`);
    const data = await Promise.all(
      keys.map(async (key) => {
        const value = await redis.get(key);
        const timestamp = parseInt(key.split(':')[2]);
        return { data: value, timestamp };
      })
    );
    res.json({ items: data });
  } catch (error) {
    console.error('Error getting sync data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const port = process.env.PORT || 3001;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});