import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Simple data hooks: each one loads a table from the Lovable Cloud database.
export type TableName = "patients" | "doctors" | "appointments" | "medicines" | "bills";

export function useTable<T = any>(table: TableName, select = "*") {
  return useQuery({
    queryKey: [table, select],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table)
        .select(select)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as T[];
    },
  });
}

/** Call after any add/edit/delete so all pages show fresh data */
export function useRefresh() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries();
}

export { supabase };
