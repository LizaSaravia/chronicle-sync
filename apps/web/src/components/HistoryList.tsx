import { useState, useEffect } from 'react';
import { getDatabase } from '@chronicle-sync/core';
import type { HistoryEntry } from '@chronicle-sync/core';

export function HistoryList() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEntries() {
      try {
        const db = await getDatabase();
        if (!db) {
          throw new Error('Failed to initialize database');
        }
        const result = await db.history.find().exec();
        setEntries(result);
      } catch (error) {
        console.error('Failed to load history:', error);
      } finally {
        setLoading(false);
      }
    }

    loadEntries();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <ul>
      {entries.map((entry) => (
        <li key={entry.id}>
          <a href={entry.url} target="_blank" rel="noopener noreferrer">
            {entry.title || entry.url}
          </a>
          <time dateTime={new Date(entry.timestamp).toISOString()}>
            {new Date(entry.timestamp).toLocaleString()}
          </time>
        </li>
      ))}
    </ul>
  );
}