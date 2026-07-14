import { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';

export function useSupabase(key, initialValue) {
  const [value, setValue] = useState(initialValue);
  const [isReady, setIsReady] = useState(false);
  
  // Use a ref to track the latest value so we don't cause infinite loops in subscriptions
  const latestValue = useRef(value);
  latestValue.current = value;

  // 1. Initial Fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      const { data, error } = await supabase
        .from('app_state')
        .select('data')
        .eq('id', key)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 means no rows found, which is fine for the first run
        console.error('Error fetching initial data from Supabase:', error);
      }

      if (data && data.data) {
        setValue(data.data);
      } else {
        // First time initialization in DB
        await supabase.from('app_state').upsert({ id: key, data: initialValue });
      }
      setIsReady(true);
    };

    fetchInitialData();
  }, [key]); // Intentionally omitting initialValue

  // 2. Realtime Subscription
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
          // Simple check to prevent updating if we already have the exact same state locally
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

  // 3. Setter function
  const setSupabaseValue = async (newValueOrUpdater) => {
    // Determine the next value just like standard useState
    const nextValue =
      typeof newValueOrUpdater === 'function'
        ? newValueOrUpdater(latestValue.current)
        : newValueOrUpdater;

    // Update local state immediately for snappy UI
    setValue(nextValue);

    // Push to Supabase asynchronously
    if (isReady) {
      const { error } = await supabase
        .from('app_state')
        .upsert({ id: key, data: nextValue });

      if (error) {
        console.error('Error updating Supabase:', error);
      }
    }
  };

  return [value, setSupabaseValue];
}
