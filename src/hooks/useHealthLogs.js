import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';

/**
 * useHealthLogs
 *
 * Fetches all rows from `health_logs`, ordered newest-first.
 * Opens a Supabase Realtime channel so both caregivers' screens
 * update instantly on any INSERT / UPDATE / DELETE without a manual refresh.
 *
 * @returns {{ logs: Array, insertLog: Function, isReady: boolean }}
 */
export function useHealthLogs() {
  const [logs, setLogs] = useState([]);
  const [isReady, setIsReady] = useState(false);

  // ---------- fetch helpers ----------
  const fetchLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('health_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) {
        console.error('[useHealthLogs] fetch error:', error);
      } else {
        setLogs(data || []);
      }
    } catch (err) {
      console.error('[useHealthLogs] unexpected fetch error:', err);
    }
  }, []);

  // ---------- initial load ----------
  useEffect(() => {
    let didCancel = false;

    // Safety timeout — unblock UI even if Supabase hangs
    const timeout = setTimeout(() => {
      if (!didCancel) setIsReady(true);
    }, 8000);

    (async () => {
      await fetchLogs();
      if (!didCancel) {
        clearTimeout(timeout);
        setIsReady(true);
      }
    })();

    return () => {
      didCancel = true;
      clearTimeout(timeout);
    };
  }, [fetchLogs]);

  // ---------- Realtime subscription ----------
  useEffect(() => {
    if (!isReady) return;

    const channel = supabase
      .channel('health_logs:all')
      .on(
        'postgres_changes',
        {
          event: '*',           // INSERT | UPDATE | DELETE
          schema: 'public',
          table: 'health_logs',
        },
        () => {
          // Clean state refetch — both caregivers get the same view
          fetchLogs();
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[useHealthLogs] Realtime channel error — will retry on next mount.');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isReady, fetchLogs]);

  // ---------- write helper ----------
  /**
   * insertLog — write one structured event row to health_logs.
   *
   * @param {{
   *   category: 'medicine'|'vitals'|'diaper'|'water'|'note',
   *   value?: number,
   *   unit?: string,
   *   type?: string,
   *   details?: string,
   *   logged_by?: string,
   *   created_at?: string   // ISO string — lets you back-date entries
   * }} payload
   */
  const insertLog = useCallback(async (payload) => {
    const row = {
      category: payload.category,
      value:     payload.value     ?? null,
      unit:      payload.unit      ?? null,
      type:      payload.type      ?? null,
      details:   payload.details   ?? null,
      logged_by: payload.logged_by ?? null,
      // Only include created_at if caller supplies it (back-dating custom logs)
      ...(payload.created_at ? { created_at: payload.created_at } : {}),
    };

    const { error } = await supabase.from('health_logs').insert(row);

    if (error) {
      console.error('[useHealthLogs] insertLog error:', error);
    }
    // Realtime will trigger fetchLogs() automatically — no manual refetch needed
  }, []);

  return { logs, insertLog, isReady };
}
