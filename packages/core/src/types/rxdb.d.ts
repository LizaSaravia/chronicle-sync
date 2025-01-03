interface RxDatabaseCreationOptions {
  name: string;
  storage: unknown;
}

interface RxCollection<T> {
  insert: (doc: T) => Promise<T>;
  find: () => { exec: () => Promise<T[]> };
}

interface RxDatabase<T> {
  history: RxCollection<T>;
  remove: () => Promise<void>;
  addCollections: (collections: Record<string, unknown>) => Promise<void>;
}

interface RxPlugin {
  name: string;
  rxdb: boolean;
}

interface RxReplicationOptions<T> {
  collection: RxCollection<T>;
  url: { http: string };
  push: {
    batchSize: number;
    queryBuilder: (docs: T[]) => {
      query: string;
      variables: { entries: T[] };
    };
  };
  pull: {
    queryBuilder: (lastId: string | null | undefined) => {
      query: string;
      variables: { lastId: string | null | undefined };
    };
  };
}

interface RxReplicationState {
  start: () => Promise<void>;
  cancel: () => Promise<void>;
  reSync: () => Promise<void>;
}

declare module 'rxdb/dist/cjs/index.js' {
  export function createRxDatabase<T>(options: RxDatabaseCreationOptions): Promise<RxDatabase<T>>;
  export function addRxPlugin(plugin: RxPlugin): void;
}

declare module 'rxdb/dist/cjs/plugins/storage-dexie/index.js' {
  export function getRxStorageDexie(): unknown;
}

declare module 'rxdb/dist/cjs/plugins/dev-mode/index.js' {
  export const RxDBDevModePlugin: RxPlugin;
}

declare module 'rxdb/dist/cjs/plugins/replication-graphql/index.js' {
  export function replicateGraphQL<T>(options: RxReplicationOptions<T>): Promise<RxReplicationState>;
}