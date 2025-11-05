import { supabase } from './supabase';

/**
 * Helper functions to work around Supabase TypeScript strict typing issues
 * These functions provide type-safe wrappers for common operations
 */

export const supabaseHelpers = {
  /**
   * Insert data with proper type casting
   */
  async insert<T = any>(table: string, data: any): Promise<{ data: T | null; error: any }> {
    const { data: result, error } = await (supabase as any)
      .from(table)
      .insert(data)
      .select();
    return { data: result, error };
  },

  /**
   * Update data with proper type casting
   */
  async update<T = any>(table: string, data: any, match: { column: string; value: any }): Promise<{ data: T | null; error: any }> {
    const { data: result, error } = await (supabase as any)
      .from(table)
      .update(data)
      .eq(match.column, match.value)
      .select();
    return { data: result, error };
  },

  /**
   * Select data with proper type casting
   */
  async select<T = any>(table: string, query: string, filters?: any): Promise<{ data: T[] | null; error: any }> {
    let queryBuilder = (supabase as any).from(table).select(query);
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        queryBuilder = queryBuilder.eq(key, value);
      });
    }
    
    const { data, error } = await queryBuilder;
    return { data, error };
  },
};
