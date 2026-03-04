import { getPublicRuntimeConfig } from './_lib/env.js';
import { setCors } from './_lib/request.js';

export default async function handler(req, res) {
  setCors(res, ['GET', 'OPTIONS']);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const config = getPublicRuntimeConfig();

  return res.status(200).json({
    gaMeasurementId: config.gaMeasurementId || '',
    calendlyUrl: config.calendlyUrl || '',
    supabaseUrl: config.supabaseUrl || '',
    supabaseAnonKey: config.supabaseAnonKey || ''
  });
}
