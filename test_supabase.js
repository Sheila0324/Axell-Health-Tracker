import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mglwvvkrycswodxzwofg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nbHd2dmtyeWNzd29keHp3b2ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwMjU5NzIsImV4cCI6MjA5OTYwMTk3Mn0.NHhUU1i_RSqE_I0_C_cKkDXcjhClwOUK-vI1LwbQ118'
);

async function test() {
  const { data, error } = await supabase.from('app_state').select('*');
  console.log('Error:', error);
  console.log('Data:', JSON.stringify(data, null, 2));

  // Try to insert a dummy row
  const { data: iData, error: iError } = await supabase.from('app_state').upsert({ id: 'test', data: { hello: 'world' } }).select();
  console.log('Insert Error:', iError);
  console.log('Insert Data:', iData);
}

test();
