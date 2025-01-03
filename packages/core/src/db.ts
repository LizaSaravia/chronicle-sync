// Database interfaces
interface DatabaseCollection<T> {
  insert: (doc: T) => Promise<T>;
  find: () => { exec: () => Promise<T[]> };
}

interface Replication {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  reSync: () => Promise<void>;
}

export interface Database {
  history: DatabaseCollection<HistoryEntry>;
  remove: () => Promise<void>;
  setupSync?: (url: string) => Promise<Replication>;
}

// Mock implementation for testing
class MockDatabase implements Database {
  private entries: HistoryEntry[] = [];

  history: DatabaseCollection<HistoryEntry> = {
    insert: async (doc: HistoryEntry) => {
      this.entries.push(doc);
      return doc;
    },
    find: () => ({
      exec: async () => this.entries
    })
  };

  async remove() {
    this.entries = [];
  }

  async setupSync(_url: string): Promise<Replication> {
    return {
      start: () => Promise.resolve(),
      stop: () => Promise.resolve(),
      reSync: () => Promise.resolve()
    };
  }
}

const isTest = process.env.NODE_ENV === 'test';



export interface HistoryEntry {
  id: string;
  url: string;
  title: string;
  timestamp: number;
  deviceId: string;
}

const historySchema = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100
    },
    url: {
      type: 'string'
    },
    title: {
      type: 'string'
    },
    timestamp: {
      type: 'number'
    },
    deviceId: {
      type: 'string'
    }
  },
  required: ['id', 'url', 'timestamp', 'deviceId']
};

let dbInstance: Database | null = null;

export const getDatabase = async () => {
  if (!dbInstance) {
    if (isTest) {
      dbInstance = new MockDatabase();
    } else {
      // In production, we'll use RxDB
      const { createRxDatabase, addRxPlugin } = await import('rxdb/dist/cjs/index.js');
      const { getRxStorageDexie } = await import('rxdb/dist/cjs/plugins/storage-dexie/index.js');
      const { RxDBDevModePlugin } = await import('rxdb/dist/cjs/plugins/dev-mode/index.js');

      addRxPlugin(RxDBDevModePlugin);

      const rxDatabase = await createRxDatabase<HistoryEntry>({
        name: 'chronicledb',
        storage: getRxStorageDexie(),
      });

      await rxDatabase.addCollections({
        history: {
          schema: historySchema
        }
      });

      dbInstance = {
        history: rxDatabase.history,
        remove: () => rxDatabase.remove(),
        setupSync: async (url: string) => {
          const { replicateGraphQL } = await import('rxdb/dist/cjs/plugins/replication-graphql/index.js');
          const replication = await replicateGraphQL({
            collection: rxDatabase.history,
            url: { http: url },
            push: {
              batchSize: 50,
              queryBuilder: (docs: HistoryEntry[]) => ({
                query: `
                  mutation InsertHistoryEntries($entries: [HistoryEntry!]!) {
                    insertHistoryEntries(entries: $entries)
                  }
                `,
                variables: {
                  entries: docs
                }
              })
            },
            pull: {
              queryBuilder: (lastId: string | null | undefined) => ({
                query: `
                  query GetHistoryEntries($lastId: String) {
                    historyEntries(lastId: $lastId) {
                      id
                      url
                      title
                      timestamp
                      deviceId
                    }
                  }
                `,
                variables: {
                  lastId
                }
              })
            }
          });
          return {
            start: () => replication.start(),
            stop: () => replication.cancel(),
            reSync: () => replication.reSync()
          };
        }
      };
    }
  }
  return dbInstance;
};

export const addHistoryEntry = async (entry: Omit<HistoryEntry, 'id'>) => {
  const db = await getDatabase();
  if (!db) {
    throw new Error('Failed to initialize database');
  }
  const id = `${entry.deviceId}-${entry.timestamp}`;
  await db.history.insert({
    ...entry,
    id
  });
};

export const setupSync = async (syncUrl: string) => {
  const db = await getDatabase();
  if (!db) {
    throw new Error('Failed to initialize database');
  }
  if (!db.setupSync) {
    throw new Error('Database does not support sync');
  }
  return db.setupSync(syncUrl);
};
