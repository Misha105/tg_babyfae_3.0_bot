import { db } from './init';

// Simple Mutex to ensure transactions are atomic at the application level
class Mutex {
  private _queue: Promise<void> = Promise.resolve();

  run<T>(task: () => Promise<T>): Promise<T> {
    const result = this._queue.then(() => task());
    this._queue = result.then(() => {}, () => {}); // Catch errors to keep queue moving
    return result;
  }
}

const dbMutex = new Mutex();

export const dbAsync = {
  run: (sql: string, params: any[] = []): Promise<{ id?: number; changes?: number }> => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  },

  get: <T>(sql: string, params: any[] = []): Promise<T | undefined> => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T);
      });
    });
  },

  all: <T>(sql: string, params: any[] = []): Promise<T[]> => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  },

  // Transaction support with Mutex
  transaction: async <T>(callback: () => Promise<T>): Promise<T> => {
    return dbMutex.run(async () => {
      try {
        await new Promise<void>((res, rej) => db.run('BEGIN TRANSACTION', (err) => err ? rej(err) : res()));
        const result = await callback();
        await new Promise<void>((res, rej) => db.run('COMMIT', (err) => err ? rej(err) : res()));
        return result;
      } catch (err) {
        await new Promise<void>((res) => db.run('ROLLBACK', () => res()));
        throw err;
      }
    });
  }
};
