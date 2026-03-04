import { setCors } from './_lib/request.js';
import { hasValidAdminSession } from './_lib/admin-auth.js';

export default async function handler(req, res) {
  setCors(res, ['GET', 'OPTIONS']);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(200).json({ authenticated: hasValidAdminSession(req) });
}
