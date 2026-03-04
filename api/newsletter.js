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
  if (isRateLimited({ ip, bucket: 'newsletter', maxRequests: 10 })) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  try {
    const body = getBody(req);
    const email = normalizeText(body.email).toLowerCase();
    const honeypot = normalizeText(body.honeypot);

    if (honeypot) {
      return res.status(200).json({ success: true, message: 'Successfully subscribed to updates!' });
    }

    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }

    const supabase = getServiceSupabase();

    const { data: existing, error: selectError } = await supabase
      .from('newsletter_subscribers')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (selectError) {
      console.error('newsletter_subscribers select error:', selectError);
      return res.status(500).json({ error: 'Failed to subscribe. Please try again.' });
    }

    if (existing) {
      return res.status(200).json({ success: true, message: 'You are already subscribed!' });
    }

    const { error: insertError } = await supabase.from('newsletter_subscribers').insert([{ email }]);

    if (insertError) {
      console.error('newsletter_subscribers insert error:', insertError);
      return res.status(500).json({ error: 'Failed to subscribe. Please try again.' });
    }

    return res.status(200).json({ success: true, message: 'Successfully subscribed to updates!' });
  } catch (error) {
    console.error('newsletter handler error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}
