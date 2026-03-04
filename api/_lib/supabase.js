import { createClient } from '@supabase/supabase-js';
import { getEnv } from './env.js';

let serviceClient;

export function getServiceSupabase() {
  if (serviceClient) {
    return serviceClient;
  }

  const supabaseUrl = getEnv('SUPABASE_URL', { required: true });
  const supabaseServiceKey = getEnv('SUPABASE_SERVICE_KEY', { required: true });

  serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  return serviceClient;
}
