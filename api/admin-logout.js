import { setCors } from './_lib/request.js';
import { clearAdminSessionCookie } from './_lib/admin-auth.js';

export default async function handler(req, res) {
  setCors(res, ['POST', 'OPTIONS']);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Set-Cookie', clearAdminSessionCookie());
  return res.status(200).json({ success: true });
}
