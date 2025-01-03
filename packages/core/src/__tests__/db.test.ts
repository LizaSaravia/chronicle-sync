import { addHistoryEntry, getDatabase, Database } from '../db';

describe('Database', () => {
  let db: Database;

  beforeEach(async () => {
    // Clear database between tests
    const database = await getDatabase();
    if (!database) {
      throw new Error('Failed to initialize database');
    }
    db = database;
    await db.remove();
  });

  it('should create a history entry', async () => {
    const entry = {
      url: 'https://example.com',
      title: 'Example',
      timestamp: Date.now(),
      deviceId: 'test-device',
    };

    await addHistoryEntry(entry);
    const entries = await db.history.find().exec();
    
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      ...entry,
      id: expect.stringContaining(entry.deviceId),
    });
  });

  it('should sync with remote server', async () => {
    const syncUrl = 'http://localhost:4000/graphql';
    
    if (!db.setupSync) {
      throw new Error('Database does not support sync');
    }
    
    const replication = await db.setupSync(syncUrl);
    expect(replication).toBeDefined();
    expect(typeof replication.start).toBe('function');
    expect(typeof replication.stop).toBe('function');
  });
});
