import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mglwvvkrycswodxzwofg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nbHd2dmtyeWNzd29keHp3b2ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwMjU5NzIsImV4cCI6MjA5OTYwMTk3Mn0.NHhUU1i_RSqE_I0_C_cKkDXcjhClwOUK-vI1LwbQ118'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
