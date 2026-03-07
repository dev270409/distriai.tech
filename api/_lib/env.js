function normalizeEnvValue(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

export function getEnv(name, { required = false } = {}) {
  const value = normalizeEnvValue(process.env[name]);

  if (required && !value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getFirstEnv(names, { required = false } = {}) {
  for (const name of names) {
    const value = normalizeEnvValue(process.env[name]);
    if (value) {
      return value;
    }
  }

  if (required) {
    throw new Error(`Missing required environment variable. Tried: ${names.join(', ')}`);
  }

  return '';
}

export function getPublicRuntimeConfig() {
  return {
    gaMeasurementId: getEnv('GA_MEASUREMENT_ID'),
    calendlyUrl: getFirstEnv(['CALENDLY_URL', 'CALENDLY_LINK', 'NEXT_PUBLIC_CALENDLY_URL']),
    supabaseUrl: getFirstEnv(['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL']),
    supabaseAnonKey: getFirstEnv(['SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'])
  };
}
