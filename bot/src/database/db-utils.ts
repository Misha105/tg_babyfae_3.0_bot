import { dbAsync } from '../database/db-helper';

/**
 * Generic upsert helper for user-owned records.
 * Ensures that a user can only update their own records (based on ID conflict check).
 * 
 * @param tableName The name of the table to insert/update into
 * @param columns The columns to insert (excluding telegram_id/user_id which is handled automatically if passed as ownerId)
 * @param values The values corresponding to columns
 * @param conflictTarget The column to check for conflicts (usually 'id')
 * @param updateColumns The columns to update on conflict
 * @param ownerId The ID of the user owning the record (telegram_id or user_id)
 * @param ownerColumn The name of the owner column in the table (default: 'telegram_id')
 */
export const upsertRecord = async (
  tableName: string,
  columns: string[],
  values: unknown[],
  conflictTarget: string,
  updateColumns: string[],
  ownerId: number,
  ownerColumn: string = 'telegram_id'
): Promise<{ success: boolean; error?: string }> => {
  
  // Construct the SET clause for UPDATE
  const updateSet = updateColumns
    .map(col => `${col} = excluded.${col}`)
    .join(', ');

  // Construct the WHERE clause to prevent ID hijacking
  // This ensures that if an ID conflict occurs, the update only happens if the existing record belongs to the same user
  const whereClause = `WHERE ${tableName}.${ownerColumn} = excluded.${ownerColumn}`;

  const allColumns = [...columns, ownerColumn];
  const allValues = [...values, ownerId];
  const placeholders = allColumns.map(() => '?').join(', ');

  const sql = `
    INSERT INTO ${tableName} (${allColumns.join(', ')})
    VALUES (${placeholders})
    ON CONFLICT(${conflictTarget}) DO UPDATE SET
      ${updateSet}
    ${whereClause}
  `;

  try {
    const result = await dbAsync.run(sql, allValues);
    
    if (result.changes === 0) {
      // If changes is 0, it means the ID exists but belongs to another user (update skipped due to WHERE clause)
      // Or it could mean the update didn't change anything, but in our case with JSON data it usually means conflict
      // However, sqlite returns changes=0 for ON CONFLICT IGNORE, but here we have DO UPDATE.
      // If the WHERE clause filters out the update, changes will be 0.
      
      // We need to verify if the record exists and belongs to someone else
      const check = await dbAsync.get<{ [key: string]: number }>(
        `SELECT ${ownerColumn} FROM ${tableName} WHERE ${conflictTarget} = ?`, 
        [values[columns.indexOf(conflictTarget)]]
      );
      
      if (check && check[ownerColumn] !== ownerId) {
        return { success: false, error: 'Operation failed: ID conflict with another user' };
      }
    }
    
    return { success: true };
  } catch (err) {
    throw err;
  }
};
