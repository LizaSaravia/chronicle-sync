import Database from 'better-sqlite3';
import { describe, it, expect, beforeAll } from 'vitest';

import { SCHEMA, DEVICES_SCHEMA } from '../../../src/backend/schema.js';

describe('Database Schema', () => {
  let db;

  beforeAll(() => {
    // Create an in-memory SQLite database
    db = new Database(':memory:');
  });

  it('should create sync_groups table without errors', () => {
    expect(() => {
      db.exec(SCHEMA);
    }).not.toThrow();

    // Verify table structure
    const tableInfo = db.prepare('PRAGMA table_info(sync_groups)').all();
    expect(tableInfo).toEqual([
      {
        cid: 0,
        name: 'id',
        type: 'TEXT',
        notnull: 0,
        dflt_value: null,
        pk: 1
      },
      {
        cid: 1,
        name: 'created_at',
        type: 'INTEGER',
        notnull: 1,
        dflt_value: null,
        pk: 0
      },
      {
        cid: 2,
        name: 'last_updated',
        type: 'INTEGER',
        notnull: 1,
        dflt_value: null,
        pk: 0
      }
    ]);
  });

  it('should create devices table without errors', () => {
    expect(() => {
      db.exec(DEVICES_SCHEMA);
    }).not.toThrow();

    // Verify table structure
    const tableInfo = db.prepare('PRAGMA table_info(devices)').all();
    expect(tableInfo).toEqual([
      {
        cid: 0,
        name: 'id',
        type: 'TEXT',
        notnull: 0,
        dflt_value: null,
        pk: 1
      },
      {
        cid: 1,
        name: 'sync_group_id',
        type: 'TEXT',
        notnull: 1,
        dflt_value: null,
        pk: 0
      },
      {
        cid: 2,
        name: 'last_sync',
        type: 'INTEGER',
        notnull: 1,
        dflt_value: null,
        pk: 0
      }
    ]);

    // Verify foreign key
    const foreignKeys = db.prepare('PRAGMA foreign_key_list(devices)').all();
    expect(foreignKeys).toEqual([
      {
        id: 0,
        seq: 0,
        table: 'sync_groups',
        from: 'sync_group_id',
        to: 'id',
        on_update: 'NO ACTION',
        on_delete: 'NO ACTION',
        match: 'NONE'
      }
    ]);
  });

  it('should allow inserting and querying data', () => {
    // Insert test data
    const timestamp = Date.now();
    db.prepare('INSERT INTO sync_groups (id, created_at, last_updated) VALUES (?, ?, ?)')
      .run('test-group', timestamp, timestamp);

    db.prepare('INSERT INTO devices (id, sync_group_id, last_sync) VALUES (?, ?, ?)')
      .run('test-device', 'test-group', timestamp);

    // Query data
    const group = db.prepare('SELECT * FROM sync_groups WHERE id = ?').get('test-group');
    expect(group).toEqual({
      id: 'test-group',
      created_at: timestamp,
      last_updated: timestamp
    });

    const device = db.prepare('SELECT * FROM devices WHERE id = ?').get('test-device');
    expect(device).toEqual({
      id: 'test-device',
      sync_group_id: 'test-group',
      last_sync: timestamp
    });
  });
});