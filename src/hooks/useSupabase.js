import { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';

export function useSupabase(key, initialValue) {
  const [value, setValue] = useState(initialValue);
  const [isReady, setIsReady] = useState(false);
  
  const latestValue = useRef(value);
  latestValue.current = value;

  useEffect(() => {
    let didFinish = false;

    // Fallback: always unblock the UI after 8 seconds even if Supabase hangs
    const timeout = setTimeout(() => {
      if (!didFinish) {
        console.warn(`[useSupabase] Timeout waiting for key="${key}". Using initial/cached value.`);
        setIsReady(true);
      }
    }, 8000);

    const fetchInitialData = async () => {
      try {
        const { data, error } = await supabase
          .from('app_state')
          .select('data')
          .eq('id', key)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching initial data from Supabase:', error);
        }

        if (data && data.data) {
          setValue(data.data);
        } else {
          await supabase.from('app_state').upsert({ id: key, data: initialValue });
        }
      } catch (err) {
        console.error(`[useSupabase] Failed to fetch key="${key}":`, err);
      } finally {
        didFinish = true;
        clearTimeout(timeout);
        setIsReady(true);
      }
    };

    fetchInitialData();

    return () => {
      didFinish = true;
      clearTimeout(timeout);
    };
  }, [key]);

  useEffect(() => {
    if (!isReady) return;

    const channel = supabase
      .channel(`public:app_state:id=eq.${key}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'app_state',
          filter: `id=eq.${key}`,
        },
        (payload) => {
          const incomingData = payload.new.data;
          if (JSON.stringify(incomingData) !== JSON.stringify(latestValue.current)) {
            setValue(incomingData);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [key, isReady]);

  const setSupabaseValue = (newValueOrUpdater) => {
    const nextValue = typeof newValueOrUpdater === 'function' ? newValueOrUpdater(latestValue.current) : newValueOrUpdater;
    latestValue.current = nextValue;
    setValue(nextValue);

    if (isReady && nextValue !== undefined) {
      supabase.from('app_state').upsert({ id: key, data: nextValue }).catch(err => {
        console.error('Error updating Supabase:', err);
      });
    }
  };

  return [value, setSupabaseValue, isReady];
}
