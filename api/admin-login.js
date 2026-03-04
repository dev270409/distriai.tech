import { getBody, setCors } from './_lib/request.js';
import { assertAdminPassword, createAdminSessionCookie } from './_lib/admin-auth.js';

export default async function handler(req, res) {
  setCors(res, ['POST', 'OPTIONS']);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = getBody(req);
    const password = typeof body.password === 'string' ? body.password : '';

    if (!assertAdminPassword(password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.setHeader('Set-Cookie', createAdminSessionCookie());
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('admin-login handler error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
