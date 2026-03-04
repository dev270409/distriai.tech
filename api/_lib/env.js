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

export function getPublicRuntimeConfig() {
  return {
    gaMeasurementId: getEnv('GA_MEASUREMENT_ID'),
    calendlyUrl: getEnv('CALENDLY_URL'),
    supabaseUrl: getEnv('SUPABASE_URL'),
    supabaseAnonKey: getEnv('SUPABASE_ANON_KEY')
  };
}
