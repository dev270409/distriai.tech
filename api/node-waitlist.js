import { getServiceSupabase } from './_lib/supabase.js';
import { getBody, getClientIp, isRateLimited, isValidEmail, normalizeText, setCors } from './_lib/request.js';

export default async function handler(req, res) {
  setCors(res, ['POST', 'OPTIONS']);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  if (isRateLimited({ ip, bucket: 'node_waitlist', maxRequests: 5 })) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  try {
    const body = getBody(req);
    const name = normalizeText(body.name);
    const email = normalizeText(body.email).toLowerCase();
    const gpuType = normalizeText(body.gpu_type);
    const country = normalizeText(body.country);
    const honeypot = normalizeText(body.honeypot);

    if (honeypot) {
      return res.status(200).json({ success: true, message: 'Successfully joined the node operator waitlist!' });
    }

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }

    const supabase = getServiceSupabase();
    const { error } = await supabase.from('node_waitlist').insert([
      {
        name,
        email,
        gpu_type: gpuType || null,
        country: country || null,
        status: 'new'
      }
    ]);

    if (error) {
      console.error('node_waitlist insert error:', error);
      return res.status(500).json({ error: 'Failed to submit request. Please try again.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Successfully joined the node operator waitlist!'
    });
  } catch (error) {
    console.error('node-waitlist handler error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
