import { createClient } from '@supabase/supabase-js';
import { getEnv, getFirstEnv } from './env.js';

let serviceClient;

export function getServiceSupabase() {
  if (serviceClient) {
    return serviceClient;
  }

  const supabaseUrl = getFirstEnv(['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'], { required: true });
  const supabaseServiceKey = getFirstEnv(['SUPABASE_SERVICE_KEY', 'SUPABASE_SERVICE_ROLE_KEY'], {
    required: true
  });

  serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  return serviceClient;
}
