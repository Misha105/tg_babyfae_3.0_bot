import { db } from './init';

/**
 * Proper Mutex implementation to ensure transactions are atomic
 * Based on the async-mutex pattern
 */
class Mutex {
  private _queue: Promise<void> = Promise.resolve();
  private _locked = false;

  async acquire(): Promise<() => void> {
    // Wait for the current lock to be released
    while (this._locked) {
      await this._queue;
    }

    // Acquire the lock
    this._locked = true;
    
    let release: () => void;
    this._queue = new Promise<void>(resolve => {
      release = () => {
        this._locked = false;
        resolve();
      };
    });

    return release!;
  }

  async runExclusive<T>(task: () => Promise<T>): Promise<T> {
    const release = await this.acquire();
    try {
      return await task();
    } finally {
      release();
    }
  }
}

const dbMutex = new Mutex();

export const dbAsync = {
  run: (sql: string, params: unknown[] = []): Promise<{ id?: number; changes?: number }> => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  },

  get: <T>(sql: string, params: unknown[] = []): Promise<T | undefined> => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T);
      });
    });
  },

  all: <T>(sql: string, params: unknown[] = []): Promise<T[]> => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  },

  // Transaction support with proper Mutex
  transaction: async <T>(callback: () => Promise<T>): Promise<T> => {
    return dbMutex.runExclusive(async () => {
      try {
        await new Promise<void>((res, rej) => {
          db.run('BEGIN IMMEDIATE TRANSACTION', (err) => err ? rej(err) : res());
        });
        
        const result = await callback();
        
        await new Promise<void>((res, rej) => {
          db.run('COMMIT', (err) => err ? rej(err) : res());
        });
        
        return result;
      } catch (err) {
        // Rollback on error
        await new Promise<void>((res) => {
          db.run('ROLLBACK', () => res());
        });
        throw err;
      }
    });
  }
};
